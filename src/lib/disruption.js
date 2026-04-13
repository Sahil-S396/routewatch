/**
 * disruption.js — AI-Powered Route Disruption Analysis (India Only)
 *
 * Flow:
 *   1. Fetch real-time weather from OpenWeather for the origin city
 *   2. Send route + weather context to Gemini 2.0 Flash for analysis
 *   3. Parse structured JSON from Gemini
 *   4. Save alert to Firestore if disruption detected
 *   5. Fall back gracefully to India-specific mock scenarios on API failure
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const WEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

// ─── Helpers ─────────────────────────────────────────────────────────────────

const randInt   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(1))
const pick      = (arr)      => arr[Math.floor(Math.random() * arr.length)]

// ─── Step 1: OpenWeather API ──────────────────────────────────────────────────

async function fetchWeather(city) {
  if (!WEATHER_KEY) return null
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&appid=${WEATHER_KEY}&units=metric`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const d = await res.json()
    return {
      temp:        d.main?.temp,
      feels_like:  d.main?.feels_like,
      humidity:    d.main?.humidity,
      description: d.weather?.[0]?.description ?? 'clear sky',
      wind_speed:  d.wind?.speed,
      visibility:  d.visibility,
    }
  } catch {
    return null
  }
}

// ─── Step 2: Gemini AI Analysis ───────────────────────────────────────────────

async function callGemini(origin, destination, weather) {
  const weatherCtx = weather
    ? `Current weather at ${origin}: ${weather.description}, ${weather.temp}°C, humidity ${weather.humidity}%, ` +
      `wind ${weather.wind_speed} m/s, visibility ${((weather.visibility ?? 10000) / 1000).toFixed(1)} km.`
    : `Real-time weather data unavailable — use seasonal knowledge for ${origin}.`

  const prompt = `You are an AI logistics intelligence system for Indian freight routes. Analyze the route below.

Route: ${origin} → ${destination} (India)
${weatherCtx}
Current month: ${new Date().toLocaleString('en-IN', { month: 'long' })}

Based on current weather, Indian geography, seasonal patterns (monsoon Jun-Sep, fog Nov-Feb, heatwave Mar-May), 
and typical Indian road/freight conditions, provide a disruption risk analysis.

IMPORTANT: Only reference Indian cities, Indian National Highways (NH), and India-specific conditions.

Respond ONLY with valid JSON — no markdown, no code fences, no explanation outside JSON:
{
  "disruptionDetected": true,
  "disruptionType": "Weather",
  "severityScore": 72,
  "alertTitle": "Dense Fog Advisory: NH-44 Corridor",
  "explanation": "2-3 sentence explanation referencing specific Indian highways, weather, or geography relevant to this route.",
  "recommendedRoute": "Take NH-XX via [Indian city] — ETA +X hours",
  "etaDifference": "+2 hours",
  "currentDelay": "3-4 hours"
}

If the route is clear with no disruption, set disruptionDetected to false, severityScore to 0-15, and etaDifference to "No change".`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 600 },
      }),
      signal: AbortSignal.timeout(12000),
    }
  )

  if (!res.ok) throw new Error(`Gemini API ${res.status}`)
  const data = await res.json()
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  // Strip any accidental markdown fences
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

// ─── Fallback: India-Only Mock Scenarios ─────────────────────────────────────

const COASTAL_ZONE = [
  'mumbai', 'chennai', 'kolkata', 'odisha', 'bhubaneswar',
  'visakhapatnam', 'vizag', 'puri', 'paradip', 'surat', 'kochi',
  'mangalore', 'goa', 'thiruvananthapuram', 'kozhikode', 'pondicherry',
  'cuddalore', 'tuticorin', 'karaikal',
]

const NORTH_INDIA_ZONE = [
  'delhi', 'new delhi', 'punjab', 'haryana', 'rajasthan',
  'amritsar', 'ludhiana', 'chandigarh', 'jaipur', 'jodhpur', 'bikaner',
  'agra', 'mathura', 'meerut', 'ghaziabad', 'faridabad', 'gurugram',
  'panipat', 'karnal', 'hisar', 'rohtak', 'ambala', 'sirsa',
]

const HIMALAYAN_ZONE = [
  'shimla', 'manali', 'leh', 'ladakh', 'darjeeling', 'gangtok',
  'srinagar', 'kullu', 'mussoorie', 'nainital', 'dehradun', 'spiti',
  'jammu', 'dharamshala', 'kasol', 'mcleodganj', 'rohtang', 'badrinath',
  'kedarnath', 'uttarkashi', 'pithoragarh',
]

const NORTHEAST_ZONE = [
  'guwahati', 'assam', 'silchar', 'dibrugarh', 'jorhat', 'tezpur',
  'imphal', 'manipur', 'aizawl', 'mizoram', 'kohima', 'nagaland',
  'agartala', 'tripura', 'itanagar', 'arunachal', 'shillong', 'meghalaya',
]

function classifyRoute(origin, destination) {
  const text = `${origin} ${destination}`.toLowerCase()
  const matches = (zone) => zone.some((kw) => text.includes(kw))

  if (matches(HIMALAYAN_ZONE))    return 'himalayan'
  if (matches(NORTHEAST_ZONE))    return 'northeast'
  if (matches(COASTAL_ZONE))      return 'coastal'
  if (matches(NORTH_INDIA_ZONE))  return 'north_india'
  return 'default'
}

function getCoastalFallback(origin, destination) {
  const scenarios = [
    {
      disruptionType: 'Natural Disaster',
      alertTitle:     'Cyclone Warning: Bay of Bengal',
      explanation:
        `A deep depression in the Bay of Bengal has intensified into a severe cyclonic storm ` +
        `tracking towards the ${origin}–${destination} corridor. Wind speeds of 110–130 km/h ` +
        `are expected at landfall, causing road closures and port shutdowns. ` +
        `Coastal highways NH-16 and NH-66 are at high risk of inundation.`,
      recommendedRoute: `Divert via NH-44 through Nagpur — ETA +4 hours`,
      etaDifference:    '+4 hours',
      currentDelay:     '8–12 hours',
    },
    {
      disruptionType: 'Weather',
      alertTitle:     'Flood Alert: Heavy Monsoon Rainfall',
      explanation:
        `Extremely heavy rainfall (200+ mm in 24 hrs) has been recorded across the ` +
        `${origin} region due to an active low-pressure system. Multiple underpasses and ` +
        `low-lying stretches on the primary route are waterlogged. ` +
        `Freight movement from major ports is halted until waters recede.`,
      recommendedRoute: `Use NH-48 via Pune avoiding coastal belt — ETA +3.5 hours`,
      etaDifference:    '+3.5 hours',
      currentDelay:     '6–9 hours',
    },
  ]
  const base = pick(scenarios)
  return { disruptionDetected: true, severityScore: randInt(70, 85), ...base }
}

function getNorthIndiaFallback(origin, destination) {
  const isWinter = [10, 11, 0, 1, 2].includes(new Date().getMonth())
  const scenarios = isWinter
    ? [
        {
          disruptionType: 'Weather',
          alertTitle:     'Dense Fog Advisory: Indo-Gangetic Plain',
          explanation:
            `Visibility has dropped below 50 m on National Highways across ` +
            `${origin} and ${destination} due to dense winter fog. ` +
            `IMD has issued a Red alert; vehicle speed on NH-44 and NH-48 restricted to 30 km/h. ` +
            `Expect significant freight delays throughout the day.`,
          recommendedRoute: `Hold until 10:00 AM IST or take NH-19 via Agra — ETA +2.5 hours`,
          etaDifference:    '+2.5 hours',
          currentDelay:     '4–6 hours',
        },
        {
          disruptionType: 'Weather',
          alertTitle:     'Zero-Visibility Fog: NH-44 / NH-58 Corridor',
          explanation:
            `A thick fog blanket has settled across the ${origin}–${destination} plains ` +
            `with visibility near zero on several expressway stretches. ` +
            `Fourteen vehicles have been involved in pile-up accidents; ` +
            `authorities are diverting heavy freight off the expressway.`,
          recommendedRoute: `Divert via NH-9 through Hapur — ETA +3 hours`,
          etaDifference:    '+3 hours',
          currentDelay:     '5–7 hours',
        },
      ]
    : [
        {
          disruptionType: 'Weather',
          alertTitle:     'Severe Heatwave Alert: North-West India',
          explanation:
            `An intense heat dome is persisting over ${origin} with temperatures exceeding 47°C, ` +
            `stressing vehicle cooling systems and road surfaces. ` +
            `Tyre blowout incidents increased 40% on high-traffic highways; ` +
            `authorities have imposed a midday freight restriction (12:00–16:00 IST).`,
          recommendedRoute: `Schedule departure before 08:00 AM via NH-48 — ETA +1.5 hours`,
          etaDifference:    '+1.5 hours',
          currentDelay:     '3–4 hours',
        },
        {
          disruptionType: 'Weather',
          alertTitle:     'Dust Storm Warning: Rajasthan–Haryana Border',
          explanation:
            `A severe dust storm (andhi) swept through ${origin} last night with ` +
            `wind gusts of 80–90 km/h and near-zero visibility for 3 hours. ` +
            `Debris on NH-48 between Gurugram and Jaipur is being cleared; ` +
            `expect single-lane movement through noon.`,
          recommendedRoute: `Route via NH-21 through Rewari — ETA +2 hours`,
          etaDifference:    '+2 hours',
          currentDelay:     '3–5 hours',
        },
      ]
  const base = pick(scenarios)
  return { disruptionDetected: true, severityScore: randInt(55, 70), ...base }
}

function getHimalayanFallback(origin, destination) {
  const scenarios = [
    {
      disruptionType: 'Natural Disaster',
      alertTitle:     'Landslide Alert: Himalayan Mountain Pass',
      explanation:
        `Heavy overnight rainfall triggered a major landslide on the ${origin}–${destination} ` +
        `mountain highway, blocking all vehicular movement near the Rohtang Pass stretch. ` +
        `BRO teams are working to clear debris; estimated restoration time is 12–18 hours. ` +
        `Trucks over 3.5 tonnes are barred.`,
      recommendedRoute: `Alternate via Jalori Pass on NH-305 — ETA +5 hours`,
      etaDifference:    '+5 hours',
      currentDelay:     '12–18 hours',
    },
    {
      disruptionType: 'Weather',
      alertTitle:     'Snowstorm Warning: High Altitude Passes',
      explanation:
        `A western disturbance has brought fresh heavy snowfall (60–80 cm) on mountain ` +
        `passes above 3,500 m on the ${origin}–${destination} corridor. ` +
        `Rohtang, Baralacha La, and Tanglang La passes are currently closed. ` +
        `All commercial vehicle movement has been suspended by district administration.`,
      recommendedRoute: `Wait for pass clearance or arrange air cargo via Kullu-Manali airport`,
      etaDifference:    '+8 hours',
      currentDelay:     '24–48 hours',
    },
    {
      disruptionType: 'Natural Disaster',
      alertTitle:     'Flash Flood: Himalayan River Catchment',
      explanation:
        `Glacial lake outburst flooding (GLOF) has been reported upstream, causing the ` +
        `Beas / Teesta river near ${destination} to breach its banks. ` +
        `Several bridge structures are under threat; NH-3 is closed between Kullu and Manali. ` +
        `NDRF teams have been deployed for emergency response.`,
      recommendedRoute: `Hold cargo at origin depot; monitor NDRF advisories — No safe alternate currently`,
      etaDifference:    '+10 hours',
      currentDelay:     '18–36 hours',
    },
  ]
  const base = pick(scenarios)
  return { disruptionDetected: true, severityScore: randInt(75, 90), ...base }
}

function getNortheastFallback(origin, destination) {
  const scenarios = [
    {
      disruptionType: 'Natural Disaster',
      alertTitle:     'Landslide: Northeast Hill Corridor',
      explanation:
        `Heavy monsoon rainfall has triggered multiple landslides along the ${origin}–${destination} ` +
        `corridor in the Northeast hill region. NH-27 (Trans-Arunachal Highway) is blocked at ` +
        `several points. NHIDCL teams are working on clearance but progress is slow due to ` +
        `continuous rainfall.`,
      recommendedRoute: `Use alternate NH-37 via Guwahati–Silchar bypass — ETA +6 hours`,
      etaDifference:    '+6 hours',
      currentDelay:     '10–16 hours',
    },
    {
      disruptionType: 'Weather',
      alertTitle:     'Flood Alert: Brahmaputra Basin',
      explanation:
        `The Brahmaputra is flowing above danger level near ${origin} due to sustained monsoon ` +
        `rains across the upper catchment in Arunachal Pradesh. Low-lying road sections of ` +
        `NH-27 and NH-715 are inundated. District administration has suspended all heavy ` +
        `vehicle movement in the flood-affected areas.`,
      recommendedRoute: `Hold until flood levels recede; arrange transhipment at Guwahati hub`,
      etaDifference:    '+8 hours',
      currentDelay:     '12–24 hours',
    },
  ]
  const base = pick(scenarios)
  return { disruptionDetected: true, severityScore: randInt(65, 80), ...base }
}

function getDefaultFallback(origin, destination) {
  if (Math.random() > 0.30) {
    return {
      disruptionDetected: false,
      disruptionType:     'None',
      severityScore:      0,
      alertTitle:         'Route Clear',
      explanation:        `No significant disruptions detected on the ${origin}–${destination} corridor at this time. Road conditions and weather are within normal parameters.`,
      recommendedRoute:   'Proceed on primary route',
      etaDifference:      'No change',
      currentDelay:       'None',
    }
  }

  const delay = randFloat(0.5, 1.5)
  const scenarios = [
    {
      alertTitle:       'Minor Road Work: Primary Highway',
      explanation:
        `Routine road resurfacing is underway on a 12 km stretch of the ${origin}–${destination} ` +
        `highway, reducing lanes from 3 to 1 during work hours (07:00–18:00 IST). ` +
        `Slow-moving queues of up to 4 km have formed; freight vehicles should plan accordingly.`,
      recommendedRoute: `Take state highway SH-32 as a temporary bypass — ETA +${delay} hours`,
    },
    {
      alertTitle:       'Traffic Congestion: Urban Toll Stretch',
      explanation:
        `Unusual congestion near the ${destination} city limits due to a local event and ` +
        `narrow road width. Average truck speed has dropped to 15 km/h on the final 20 km of the route.`,
      recommendedRoute: `Use ring road bypass to avoid city centre — ETA +${delay} hours`,
    },
    {
      alertTitle:       'Minor Accident: Route Slowdown',
      explanation:
        `A multi-vehicle accident involving two trucks has blocked one lane on ` +
        `the ${origin}–${destination} expressway near the mid-route toll plaza. ` +
        `Traffic police are managing flow; clearance expected within 2 hours.`,
      recommendedRoute: `Continue on primary route — expect ${Math.floor(delay * 60)}-minute delay at congestion point`,
    },
  ]
  const base = pick(scenarios)
  return {
    disruptionDetected: true,
    disruptionType:     'Traffic',
    severityScore:      randInt(20, 40),
    etaDifference:      `+${delay} hours`,
    currentDelay:       `${delay}–${(delay + 0.5).toFixed(1)} hours`,
    ...base,
  }
}

function buildFallback(origin, destination) {
  const zone = classifyRoute(origin, destination)
  switch (zone) {
    case 'coastal':    return getCoastalFallback(origin, destination)
    case 'north_india': return getNorthIndiaFallback(origin, destination)
    case 'himalayan':  return getHimalayanFallback(origin, destination)
    case 'northeast':  return getNortheastFallback(origin, destination)
    default:           return getDefaultFallback(origin, destination)
  }
}

// ─── Save Alert to Firestore ──────────────────────────────────────────────────

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
    aiGenerated:      result.aiGenerated ?? false,
    createdAt:        serverTimestamp(),
  })
  return docRef.id
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * analyzeRoute — fetches real-time weather, calls Gemini AI for analysis,
 * falls back to India-specific mock scenarios on failure.
 *
 * @param {string} routeId
 * @param {string} origin      — Indian city name
 * @param {string} destination — Indian city name
 * @returns {{ result: object, alertId: string|null }}
 */
export async function analyzeRoute(routeId, origin, destination) {
  let result = null
  let aiGenerated = false

  try {
    // Step 1: Real-time weather for origin
    const weather = await fetchWeather(origin)

    // Step 2: Gemini AI analysis
    const geminiResult = await callGemini(origin, destination, weather)

    // Validate parsed response has required fields
    if (
      geminiResult &&
      typeof geminiResult.disruptionDetected === 'boolean' &&
      geminiResult.alertTitle &&
      geminiResult.explanation
    ) {
      result = { ...geminiResult, aiGenerated: true }
      aiGenerated = true
    }
  } catch (err) {
    console.warn('[RouteWatch] Gemini AI analysis failed, using fallback:', err.message)
  }

  // Step 3: Use fallback if AI failed
  if (!result) {
    result = buildFallback(origin, destination)
    result.aiGenerated = false
  }

  // Step 4: Save alert to Firestore if disruption detected
  let alertId = null
  if (result.disruptionDetected) {
    try {
      alertId = await saveAlert(routeId, origin, destination, result)
    } catch (err) {
      console.error('[RouteWatch] Failed to save alert:', err)
    }
  }

  return { result, alertId }
}
