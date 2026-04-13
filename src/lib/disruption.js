/**
 * disruption.js — Smart Mock Disruption Analysis System
 *
 * analyzeRoute(routeId, origin, destination)
 *   Step 1: Classify the route against known geographic risk zones
 *   Step 2: Pick a realistic scenario from the matched zone dataset
 *   Step 3: Add a 2-second "AI processing" delay
 *   Step 4: Save alert to Firestore if a disruption is detected
 *
 * Returns:
 *   { result, alertId }   – normal success
 *
 * Geographic zones (checked against both origin & destination, case-insensitive):
 *   Coastal/Cyclone  – Mumbai, Chennai, Kolkata, Odisha, Bhubaneswar, Bangladesh
 *   North-India Fog  – Delhi, Punjab, Haryana, Rajasthan
 *   Himalayan        – Shimla, Manali, Leh, Darjeeling
 *   International    – London, Paris, New York, Tokyo
 *   Default          – 30 % chance of minor disruption, else clear
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Random integer in [min, max] */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

/** Random float with 1 decimal in [min, max] */
const randFloat = (min, max) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(1))

/** Pick a random element from an array */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ─── Route Classifier ─────────────────────────────────────────────────────────

const COASTAL_ZONE = [
  'mumbai', 'chennai', 'kolkata', 'odisha', 'bhubaneswar', 'bangladesh',
  'visakhapatnam', 'puri', 'paradip', 'surat', 'kochi',
]

const NORTH_INDIA_ZONE = [
  'delhi', 'new delhi', 'punjab', 'haryana', 'rajasthan',
  'amritsar', 'ludhiana', 'chandigarh', 'jaipur', 'jodhpur', 'bikaner',
]

const HIMALAYAN_ZONE = [
  'shimla', 'manali', 'leh', 'darjeeling', 'gangtok', 'srinagar',
  'kullu', 'mussoorie', 'nainital', 'dehradun', 'spiti',
]

const INTERNATIONAL_ZONE = [
  'london', 'paris', 'new york', 'tokyo', 'dubai', 'singapore',
  'frankfurt', 'amsterdam', 'los angeles', 'chicago', 'hong kong',
]

function classifyRoute(origin, destination) {
  const text = `${origin} ${destination}`.toLowerCase()
  const matches = (zone) => zone.some((kw) => text.includes(kw))

  if (matches(COASTAL_ZONE))       return 'coastal'
  if (matches(HIMALAYAN_ZONE))     return 'himalayan'
  if (matches(NORTH_INDIA_ZONE))   return 'north_india'
  if (matches(INTERNATIONAL_ZONE)) return 'international'
  return 'default'
}

// ─── Scenario Datasets ────────────────────────────────────────────────────────

function getCoastalScenario(origin, destination) {
  const scenarios = [
    {
      disruptionType: 'Natural Disaster',
      alertTitle: 'Cyclone Warning: Bay of Bengal',
      explanation:
        `A deep depression in the Bay of Bengal has intensified into a severe cyclonic storm ` +
        `tracking towards the ${origin}–${destination} corridor. Wind speeds of 110–130 km/h ` +
        `are expected at landfall, causing road closures and port shutdowns. Coastal highways ` +
        `NH-16 and NH-66 are at high risk of inundation.`,
      recommendedRoute: `Divert via NH-44 through Nagpur — ETA +4 hours`,
      etaDifference: '+4 hours',
      currentDelay: '8–12 hours',
    },
    {
      disruptionType: 'Weather',
      alertTitle: 'Flood Alert: Heavy Monsoon Rainfall',
      explanation:
        `Extremely heavy rainfall (200+ mm in 24 hrs) has been recorded across the ` +
        `${origin} region due to an active low-pressure system. Multiple underpasses and ` +
        `low-lying stretches on the primary route are waterlogged. ` +
        `Freight movement from major ports is halted until waters recede.`,
      recommendedRoute: `Use NH-48 via Pune avoiding coastal belt — ETA +3.5 hours`,
      etaDifference: '+3.5 hours',
      currentDelay: '6–9 hours',
    },
    {
      disruptionType: 'Natural Disaster',
      alertTitle: 'Storm Surge Warning: Eastern Coastline',
      explanation:
        `Meteorological authorities have issued a storm surge warning of 2–3 m along the ` +
        `eastern coast affecting the ${destination} port area. Cargo loading operations ` +
        `at the terminal have been suspended. Container vessels are anchoring offshore ` +
        `until conditions normalise.`,
      recommendedRoute: `Route via Vizag inland highway NH-16 — ETA +5 hours`,
      etaDifference: '+5 hours',
      currentDelay: '10–14 hours',
    },
  ]

  const base = pick(scenarios)
  return {
    disruptionDetected: true,
    disruptionType:     base.disruptionType,
    severityScore:      randInt(70, 85),
    alertTitle:         base.alertTitle,
    explanation:        base.explanation,
    recommendedRoute:   base.recommendedRoute,
    etaDifference:      base.etaDifference,
    currentDelay:       base.currentDelay,
  }
}

function getNorthIndiaScenario(origin, destination) {
  const isWinter = [11, 0, 1, 2].includes(new Date().getMonth()) // Nov–Feb
  const scenarios = isWinter
    ? [
        {
          disruptionType: 'Weather',
          alertTitle: 'Dense Fog Advisory: Indo-Gangetic Plain',
          explanation:
            `Visibility has dropped to below 50 m on National Highways across ` +
            `${origin} and ${destination} due to dense winter fog. ` +
            `The Indian Meteorological Department has issued a Red alert, ` +
            `and vehicle speed on NH-44 and NH-48 has been restricted to 30 km/h. ` +
            `Expect significant freight delays throughout the day.`,
          recommendedRoute: `Hold until 10:00 AM IST or take NH-19 via Agra — ETA +2.5 hours`,
          etaDifference: '+2.5 hours',
          currentDelay: '4–6 hours',
        },
        {
          disruptionType: 'Weather',
          alertTitle: 'Zero-Visibility Fog: NH-44 / NH-58 Corridor',
          explanation:
            `A thick fog blanket has settled across the ${origin}–${destination} plains ` +
            `with visibility near zero on several expressway stretches. ` +
            `Fourteen vehicles have been involved in pile-up accidents, prompting ` +
            `authorities to divert heavy freight off the expressway.`,
          recommendedRoute: `Divert via NH-9 through Hapur — ETA +3 hours`,
          etaDifference: '+3 hours',
          currentDelay: '5–7 hours',
        },
      ]
    : [
        {
          disruptionType: 'Weather',
          alertTitle: 'Severe Heatwave Alert: North-West India',
          explanation:
            `An intense heat dome is persisting over ${origin} with temperatures ` +
            `exceeding 47 °C, stressing vehicle cooling systems and road surfaces. ` +
            `Tyre blowout incidents have increased 40 % on high-traffic highways, ` +
            `and authorities have imposed a midday freight restriction (12:00–16:00 IST).`,
          recommendedRoute: `Schedule departure before 08:00 AM via NH-48 — ETA +1.5 hours`,
          etaDifference: '+1.5 hours',
          currentDelay: '3–4 hours',
        },
        {
          disruptionType: 'Weather',
          alertTitle: 'Dust Storm Warning: Rajasthan–Haryana Border',
          explanation:
            `A severe dust storm (andhi) swept through ${origin} last night, ` +
            `with wind gusts of 80–90 km/h and near-zero visibility for 3 hours. ` +
            `Debris on NH-48 between Gurugram and Jaipur is being cleared; ` +
            `expect single-lane movement through the noon hours.`,
          recommendedRoute: `Route via NH-21 through Rewari — ETA +2 hours`,
          etaDifference: '+2 hours',
          currentDelay: '3–5 hours',
        },
      ]

  const base = pick(scenarios)
  return {
    disruptionDetected: true,
    disruptionType:     base.disruptionType,
    severityScore:      randInt(55, 70),
    alertTitle:         base.alertTitle,
    explanation:        base.explanation,
    recommendedRoute:   base.recommendedRoute,
    etaDifference:      base.etaDifference,
    currentDelay:       base.currentDelay,
  }
}

function getHimalayanScenario(origin, destination) {
  const scenarios = [
    {
      disruptionType: 'Natural Disaster',
      alertTitle: 'Landslide Alert: Himalayan Mountain Pass',
      explanation:
        `Heavy overnight rainfall triggered a major landslide on the ${origin}–${destination} ` +
        `mountain highway, blocking all vehicular movement near the Rohtang Pass stretch. ` +
        `BRO (Border Roads Organisation) teams are working to clear debris; ` +
        `estimated restoration time is 12–18 hours. Trucks over 3.5 tonnes are barred.`,
      recommendedRoute: `Alternate via Jalori Pass on NH-305 — ETA +5 hours`,
      etaDifference: '+5 hours',
      currentDelay: '12–18 hours',
    },
    {
      disruptionType: 'Weather',
      alertTitle: 'Snowstorm Warning: High Altitude Passes',
      explanation:
        `A western disturbance has brought fresh heavy snowfall (60–80 cm) on mountain ` +
        `passes above 3,500 m on the ${origin}–${destination} corridor. ` +
        `Rohtang, Baralacha La, and Tanglang La passes are currently closed. ` +
        `All commercial vehicle movement has been suspended by district administration.`,
      recommendedRoute: `Wait for pass clearance or arrange air cargo via Kullu-Manali airport`,
      etaDifference: '+8 hours',
      currentDelay: '24–48 hours',
    },
    {
      disruptionType: 'Natural Disaster',
      alertTitle: 'Flash Flood: Himalayan River Catchment',
      explanation:
        `Glacial lake outburst flooding (GLOF) has been reported upstream, causing the ` +
        `Beas / Teesta river near ${destination} to breach its banks. ` +
        `Several bridge structures are under threat; NH-3 is closed between Kullu and Manali. ` +
        `NDRF teams have been deployed for emergency response.`,
      recommendedRoute: `Hold cargo at origin depot; monitor NDRF advisories — No safe alternate currently`,
      etaDifference: '+10 hours',
      currentDelay: '18–36 hours',
    },
  ]

  const base = pick(scenarios)
  return {
    disruptionDetected: true,
    disruptionType:     base.disruptionType,
    severityScore:      randInt(75, 90),
    alertTitle:         base.alertTitle,
    explanation:        base.explanation,
    recommendedRoute:   base.recommendedRoute,
    etaDifference:      base.etaDifference,
    currentDelay:       base.currentDelay,
  }
}

function getInternationalScenario(origin, destination) {
  const scenarios = [
    {
      disruptionType: 'Traffic',
      alertTitle: `Port Congestion: ${destination} Terminal`,
      explanation:
        `Vessel queues at the ${destination} port have grown to 28 ships awaiting berth assignment ` +
        `due to a recent dockworkers' slowdown and post-holiday cargo surge. ` +
        `Average dwell time for containers has risen to 5–7 days. ` +
        `Freight forwarders are advised to arrange pre-clearance documentation in advance.`,
      recommendedRoute: `Reroute via Rotterdam hub with onward feeder service — ETA +2 days`,
      etaDifference: '+48 hours',
      currentDelay: '3–5 days',
    },
    {
      disruptionType: 'Weather',
      alertTitle: `Severe Storm: ${origin}–${destination} Sea Route`,
      explanation:
        `Extratropical cyclone tracking across the North Atlantic/Pacific trade lane is generating ` +
        `wave heights of 8–10 m and 60-knot winds, forcing vessel speed reductions. ` +
        `Several shipping lines have issued operational waivers for the ${origin}–${destination} lane. ` +
        `ETA slippage of 2–3 days is expected across affected sailings.`,
      recommendedRoute: `Southern deviation via Cape route adds ~2,000 nm but avoids storm — ETA +3 days`,
      etaDifference: '+72 hours',
      currentDelay: '2–4 days',
    },
    {
      disruptionType: 'Traffic',
      alertTitle: 'Customs Clearance Backlog: International Hub',
      explanation:
        `A systems outage at ${destination} customs authority has caused a 3-day backlog ` +
        `in import clearances, affecting all air and sea freight entering the country. ` +
        `Perishable cargo is being prioritised; general merchandise faces delays of 4–6 working days. ` +
        `Airlines are offering temporary diversion to adjacent airports.`,
      recommendedRoute: `Air freight via ${destination === 'tokyo' ? 'Seoul (ICN)' : 'Frankfurt (FRA)'} with trucking leg — ETA +1.5 days`,
      etaDifference: '+36 hours',
      currentDelay: '4–6 days',
    },
  ]

  const base = pick(scenarios)
  return {
    disruptionDetected: true,
    disruptionType:     base.disruptionType,
    severityScore:      randInt(40, 60),
    alertTitle:         base.alertTitle,
    explanation:        base.explanation,
    recommendedRoute:   base.recommendedRoute,
    etaDifference:      base.etaDifference,
    currentDelay:       base.currentDelay,
  }
}

function getDefaultScenario(origin, destination) {
  // 30 % chance of a minor disruption
  if (Math.random() > 0.30) {
    return {
      disruptionDetected: false,
      disruptionType:     'None',
      severityScore:      0,
      alertTitle:         'Route Clear',
      explanation:        `No significant disruptions detected on the ${origin}–${destination} corridor at this time.`,
      recommendedRoute:   'Proceed on primary route',
      etaDifference:      'No change',
      currentDelay:       'None',
    }
  }

  const score = randInt(20, 40)
  const delay = randFloat(0.5, 1.5)
  const scenarios = [
    {
      alertTitle: 'Minor Road Work: Primary Highway',
      explanation:
        `Routine road resurfacing is underway on a 12 km stretch of the ${origin}–${destination} ` +
        `highway, reducing lanes from 3 to 1 during work hours (07:00–18:00). ` +
        `Slow-moving queues of up to 4 km have formed; freight vehicles should plan accordingly.`,
      recommendedRoute: `Take state highway SH-32 as a temporary bypass — ETA +${delay} hours`,
    },
    {
      alertTitle: 'Traffic Congestion: Urban Stretch',
      explanation:
        `Unusual congestion has been reported near the ${destination} city limits due to a ` +
        `local event and narrow road width. Average truck speed has dropped to 15 km/h ` +
        `on the final 20 km of the route.`,
      recommendedRoute: `Use ring road bypass to avoid city centre — ETA +${delay} hours`,
    },
    {
      alertTitle: 'Minor Accident: Route Slowdown',
      explanation:
        `A multi-vehicle accident involving two trucks has blocked one lane on ` +
        `the ${origin}–${destination} expressway near the mid-route toll plaza. ` +
        `Traffic police are managing the flow; clearance expected within 2 hours.`,
      recommendedRoute: `Continue on primary route — expect ${delay * 60 | 0}-minute delay at congestion point`,
    },
  ]

  const base = pick(scenarios)
  return {
    disruptionDetected: true,
    disruptionType:     'Traffic',
    severityScore:      score,
    alertTitle:         base.alertTitle,
    explanation:        base.explanation,
    recommendedRoute:   base.recommendedRoute,
    etaDifference:      `+${delay} hours`,
    currentDelay:       `${delay}–${(delay + 0.5).toFixed(1)} hours`,
  }
}

// ─── Core Selector ────────────────────────────────────────────────────────────

function buildMockResult(origin, destination) {
  const zone = classifyRoute(origin, destination)
  switch (zone) {
    case 'coastal':       return getCoastalScenario(origin, destination)
    case 'north_india':   return getNorthIndiaScenario(origin, destination)
    case 'himalayan':     return getHimalayanScenario(origin, destination)
    case 'international': return getInternationalScenario(origin, destination)
    default:              return getDefaultScenario(origin, destination)
  }
}

// ─── Step 4: Save to Firestore ────────────────────────────────────────────────

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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * analyzeRoute — classifies the route, picks a realistic disruption scenario,
 * waits 2 s to simulate AI processing, then optionally saves to Firestore.
 *
 * @param {string} routeId
 * @param {string} origin
 * @param {string} destination
 * @returns {{ result: object, alertId: string|null }}
 */
export async function analyzeRoute(routeId, origin, destination) {
  // Simulate AI "analyzing…" delay
  await sleep(2000)

  const result = buildMockResult(origin, destination)

  let alertId = null
  if (result.disruptionDetected) {
    alertId = await saveAlert(routeId, origin, destination, result)
  }

  return { result, alertId }
}
