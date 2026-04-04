/**
 * disruption.js — Core AI disruption analysis pipeline
 *
 * analyzeRoute(routeId, origin, destination)
 *   Step 1: Geocode both cities (OpenWeather Geo API)
 *   Step 2: Fetch current weather at origin
 *   Step 3: Fetch active GDACS disaster feed (via RSS)
 *   Step 4: Send to Gemini 2.0 Flash for structured risk analysis
 *   Step 5: Save alert to Firestore if disruption is detected
 *
 * Returns the Gemini result object regardless of disruption status.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const OW_KEY     = import.meta.env.VITE_OPENWEATHER_API_KEY
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

// ─── Step 1: Geocode (with graceful fallback) ─────────────────────────────────

async function geocodeCity(city) {
  try {
    const url  = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OW_KEY}`
    const res  = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.length) throw new Error('no results')
    return { lat: data[0].lat, lon: data[0].lon }
  } catch (err) {
    console.warn(`Geocode fallback for "${city}":`, err.message)
    // Return null — weather step will use a default object
    return null
  }
}

// ─── Step 2: Weather (with graceful fallback) ─────────────────────────────────

async function fetchWeather(geo) {
  if (!geo) return { description: 'data unavailable', temp: 20, wind_speed: 5, humidity: 60 }
  try {
    const url  = `https://api.openweathermap.org/data/2.5/weather?lat=${geo.lat}&lon=${geo.lon}&units=metric&appid=${OW_KEY}`
    const res  = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      description: data.weather?.[0]?.description ?? 'unknown',
      temp:        Math.round(data.main?.temp ?? 20),
      wind_speed:  data.wind?.speed ?? 5,
      humidity:    data.main?.humidity ?? 60,
    }
  } catch (err) {
    console.warn('Weather fallback:', err.message)
    return { description: 'data unavailable', temp: 20, wind_speed: 5, humidity: 60 }
  }
}

// ─── Step 3: GDACS RSS ───────────────────────────────────────────────────────

async function fetchGDACS() {
  try {
    // Use a CORS proxy since GDACS doesn't set CORS headers
    const proxy = 'https://corsproxy.io/?'
    const url   = `${proxy}${encodeURIComponent('https://www.gdacs.org/xml/rss.xml')}`
    const res   = await fetch(url)
    if (!res.ok) return 'No active GDACS alerts available'
    const text  = await res.text()
    const parser = new DOMParser()
    const xml    = parser.parseFromString(text, 'application/xml')
    const items  = Array.from(xml.querySelectorAll('item')).slice(0, 5)
    if (!items.length) return 'No active GDACS alerts'
    return items.map(item => {
      const title   = item.querySelector('title')?.textContent?.trim()   ?? ''
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? ''
      return `${title} (${pubDate})`
    }).join(' | ')
  } catch {
    return 'GDACS feed unavailable'
  }
}

// ─── Step 4: Gemini ──────────────────────────────────────────────────────────

async function callGemini(origin, destination, weather, gdacs) {
  const prompt = `You are a supply chain risk analyst. Analyze this route and return JSON only.
Route: ${origin} to ${destination}
Weather at origin: ${weather.description}, temp: ${weather.temp}C, wind: ${weather.wind_speed}m/s, humidity: ${weather.humidity}%
Active natural disasters nearby: ${gdacs}
Return this exact JSON with no markdown, no code fences, just the raw JSON object:
{
  "disruptionDetected": boolean,
  "disruptionType": "Weather" | "Traffic" | "Natural Disaster" | "None",
  "severityScore": number between 1 and 100,
  "alertTitle": string,
  "explanation": string (2-3 sentences, detailed),
  "recommendedRoute": string,
  "etaDifference": string (e.g. "+3 hours" or "No change"),
  "currentDelay": string (e.g. "+24 hours" or "None")
}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
  const data  = await res.json()
  const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  // Strip any accidental markdown fences
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ─── Step 5: Save to Firestore ───────────────────────────────────────────────

async function saveAlert(routeId, origin, destination, result) {
  const docRef = await addDoc(collection(db, 'alerts'), {
    routeId,
    origin,
    destination,
    status:           'active',
    disruptionType:   result.disruptionType,
    severityScore:    result.severityScore,
    alertTitle:       result.alertTitle,
    explanation:      result.explanation,
    recommendedRoute: result.recommendedRoute,
    etaDifference:    result.etaDifference,
    currentDelay:     result.currentDelay,
    createdAt:        serverTimestamp(),
  })
  return docRef.id
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * analyzeRoute — runs the full 5-step pipeline.
 * @returns {{ result: object, alertId: string|null }}
 */
export async function analyzeRoute(routeId, origin, destination) {
  // Step 1
  const originGeo = await geocodeCity(origin)

  // Step 2
  const weather = await fetchWeather(originGeo)

  // Step 3
  const gdacs = await fetchGDACS()

  // Step 4
  const result = await callGemini(origin, destination, weather, gdacs)

  // Step 5
  let alertId = null
  if (result.disruptionDetected) {
    alertId = await saveAlert(routeId, origin, destination, result)
  }

  return { result, alertId }
}
