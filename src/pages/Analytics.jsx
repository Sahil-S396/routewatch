import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, where, orderBy, getDocs, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import AppLayout from '../components/AppLayout'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Hardcoded global risk hotspots
const HOTSPOTS = [
  {
    id:     'bay-of-bengal',
    label:  'Bay of Bengal',
    coords: [89, 15],
    risk:   'CRITICAL',
    color:  '#ff7351',
    pulse:  true,
    desc:   'Cyclone season active. High disruption probability.',
  },
  {
    id:     'north-sea',
    label:  'North Sea',
    coords: [3, 56],
    risk:   'MODERATE',
    color:  '#f59e0b',
    pulse:  false,
    desc:   'Severe winter storms. 2–3 day vessel delays.',
  },
  {
    id:     'south-china-sea',
    label:  'South China Sea',
    coords: [115, 14],
    risk:   'LOW RISK',
    color:  '#3fff8b',
    pulse:  false,
    desc:   'Monsoon tail end. Minor congestion at ports.',
  },
]

function timeAgo(ts) {
  if (!ts) return '—'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const secs  = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

const TYPE_META = {
  'Weather':          { icon: 'cyclone',       iconColor: 'text-blue-400'   },
  'Traffic':          { icon: 'conveyor_belt', iconColor: 'text-yellow-500' },
  'Natural Disaster': { icon: 'volcano',       iconColor: 'text-[#ff7351]'  },
  'None':             { icon: 'check_circle',  iconColor: 'text-[#3fff8b]'  },
}

const STATUS_STYLE = {
  active:    'bg-[#1a1919] text-[#3fff8b]',
  rerouted:  'bg-[#3fff8b]/10 text-[#3fff8b]',
  dismissed: 'bg-gray-800 text-gray-400',
}

export default function Analytics() {
  const navigate = useNavigate()

  const [alerts,       setAlerts]       = useState([])
  const [chartCounts,  setChartCounts]  = useState({ Weather: 0, Traffic: 0, 'Natural Disaster': 0 })
  const [loading,      setLoading]      = useState(true)
  const [selectedSpot, setSelectedSpot] = useState(null) // clickable popup
  const [zoom,         setZoom]         = useState(1)
  const [center,       setCenter]       = useState([20, 15])

  const handleZoomIn  = useCallback(() => setZoom(z => Math.min(z * 1.5, 8)), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z / 1.5, 1)), [])

  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true)
      try {
        const since = new Date()
        since.setDate(since.getDate() - 7)
        const sinceTs = Timestamp.fromDate(since)

        const snap = await getDocs(
          query(collection(db, 'alerts'), where('createdAt', '>=', sinceTs), orderBy('createdAt', 'desc'))
        )
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setAlerts(docs)

        const counts = { Weather: 0, Traffic: 0, 'Natural Disaster': 0 }
        docs.forEach(d => { if (d.disruptionType in counts) counts[d.disruptionType]++ })
        setChartCounts(counts)
      } catch (err) {
        console.error('Analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  const totalDisruptions = alerts.length
  const avgRisk = alerts.length
    ? Math.round(alerts.reduce((s, a) => s + (a.severityScore ?? 0), 0) / alerts.length * 10) / 10
    : 0
  const activeAlerts = alerts.filter(a => a.status === 'active').length

  const maxCount = Math.max(1, ...Object.values(chartCounts))
  const barH = (n) => `${Math.round((n / maxCount) * 80)}%`

  const logAlerts = alerts.slice(0, 10)

  return (
    <AppLayout>
      <div className="px-8 pb-12 pt-8 min-h-screen">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Network <span className="gradient-text">Intelligence</span>
          </h1>
          <p className="text-[#adaaaa] max-w-2xl mb-8">Real-time performance analytics from live Firestore data. Monitoring active routes and disruption events.</p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg glass-card signal-glow">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Disruptions (Last 7 Days)</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-extrabold text-[#3fff8b]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {loading ? '—' : totalDisruptions}
                </span>
                {!loading && totalDisruptions > 0 && (
                  <span className="text-[#ff7351] text-sm font-bold flex items-center pb-1">
                    <span className="material-symbols-outlined text-xs">trending_up</span> Live
                  </span>
                )}
              </div>
            </div>
            <div className="p-6 rounded-lg glass-card">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Avg. Severity Score</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-extrabold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {loading ? '—' : avgRisk}
                </span>
                <span className="text-[#3fff8b] text-sm font-bold flex items-center pb-1">
                  <span className="material-symbols-outlined text-xs">trending_down</span> /100
                </span>
              </div>
            </div>
            <div className="p-6 rounded-lg glass-card">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Right Now</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-extrabold text-[#3fff8b]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {loading ? '—' : activeAlerts}
                </span>
                <span className="text-white/40 text-xs font-medium pb-1 tracking-widest ml-1">LIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bar chart */}
          <div className="lg:col-span-5 bg-[#131313] p-8 rounded-lg glass-card min-h-[400px] flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>Weekly Disruptions</h3>
                <p className="text-xs text-[#adaaaa]">Categorized by event origin · last 7 days</p>
              </div>
              <span className="material-symbols-outlined text-[#adaaaa]">more_vert</span>
            </div>
            <div className="flex-grow flex items-end justify-around gap-4 px-2">
              {[
                { label: 'Weather',  key: 'Weather',          color: 'bg-[#3fff8b]', glow: 'shadow-[0_0_15px_rgba(63,255,139,0.3)]' },
                { label: 'Traffic',  key: 'Traffic',          color: 'bg-[#13ea79]', glow: 'shadow-[0_0_15px_rgba(19,234,121,0.3)]' },
                { label: 'Disaster', key: 'Natural Disaster',  color: 'bg-[#ff7351]', glow: 'shadow-[0_0_15px_rgba(255,115,81,0.3)]'  },
              ].map(({ label, key, color, glow }) => (
                <div key={label} className="flex flex-col items-center gap-3 w-full max-w-[80px]">
                  <span className="text-xs font-bold text-white/60">{chartCounts[key] ?? 0}</span>
                  <div className="w-full bg-[#1a1919] rounded-t-sm flex items-end h-48 overflow-hidden">
                    <div
                      className={`w-full ${color} rounded-t-sm ${glow} transition-all duration-700`}
                      style={{ height: loading ? '4px' : (barH(chartCounts[key] ?? 0) || '4px') }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Line chart (static) */}
          <div className="lg:col-span-7 bg-[#131313] p-8 rounded-lg glass-card min-h-[400px] flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>On-Time Delivery Rate</h3>
                <p className="text-xs text-[#adaaaa]">Rolling 30-day performance</p>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] px-2 py-1 bg-[#1a1919] text-[#3fff8b] rounded border border-[#3fff8b]/20">DENSE VIEW</span>
                <span className="text-[10px] px-2 py-1 bg-[#1a1919] text-gray-500 rounded">EXPORT CSV</span>
              </div>
            </div>
            <div className="flex-grow relative overflow-hidden">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                <defs>
                  <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%"   stopColor="#3fff8b" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#3fff8b" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,180 L100,160 L200,170 L300,140 L400,150 L500,120 L600,130 L700,90 L800,110 L900,60 L1000,70 L1000,200 L0,200 Z" fill="url(#lineGradient)"/>
                <path d="M0,180 L100,160 L200,170 L300,140 L400,150 L500,120 L600,130 L700,90 L800,110 L900,60 L1000,70" fill="none" stroke="#3fff8b" strokeWidth="3"/>
                <line stroke="#ffffff" strokeOpacity="0.05" x1="0" x2="1000" y1="50"  y2="50"/>
                <line stroke="#ffffff" strokeOpacity="0.05" x1="0" x2="1000" y1="100" y2="100"/>
                <line stroke="#ffffff" strokeOpacity="0.05" x1="0" x2="1000" y1="150" y2="150"/>
              </svg>
              <div className="absolute top-10 left-[70%] -translate-x-1/2 p-2 bg-[#262626] rounded-lg shadow-xl border border-white/10">
                <p className="text-[10px] text-gray-400">RECENT</p>
                <p className="text-xs font-bold text-[#3fff8b]">{(100 - (avgRisk / 100 * 20)).toFixed(1)}% OTD</p>
              </div>
            </div>
            <div className="flex justify-between mt-4 text-[10px] text-gray-500 font-medium">
              <span>-30 DAYS</span><span>-20 DAYS</span><span>-10 DAYS</span><span>TODAY</span>
            </div>
          </div>

          {/* Global Risk Hotspots — react-simple-maps with zoom */}
          <div className="lg:col-span-12 bg-[#131313] rounded-lg glass-card overflow-hidden relative min-h-[500px]">
            {/* Header */}
            <div className="absolute top-8 left-8 z-10">
              <h3 className="font-bold text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>Global Risk Hotspots</h3>
              <p className="text-xs text-[#adaaaa]">Click a marker for details · scroll or use buttons to zoom</p>
            </div>

            {/* Legend + zoom buttons */}
            <div className="absolute top-8 right-8 z-10 flex items-center gap-4">
              <div className="flex gap-4 text-[10px] font-bold tracking-widest text-white/70">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3fff8b]" /> LOW RISK</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]" /> MODERATE</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ff7351] animate-pulse" /> CRITICAL</div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={handleZoomIn}  className="bg-black/40 w-8 h-8 rounded border border-white/10 text-white/70 hover:text-[#3fff8b] flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
                <button onClick={handleZoomOut} className="bg-black/40 w-8 h-8 rounded border border-white/10 text-white/70 hover:text-[#3fff8b] flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
              </div>
            </div>

            {/* Clickable popup overlay (rendered outside SVG so it can overflow) */}
            {selectedSpot && (() => {
              const spot = HOTSPOTS.find(s => s.id === selectedSpot)
              return spot ? (
                <div
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 w-72 rounded-2xl overflow-hidden"
                  style={{ boxShadow: `0 0 40px ${spot.color}30` }}
                >
                  <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: spot.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: spot.color }}>{spot.risk}</span>
                      </div>
                      <button
                        onClick={() => setSelectedSpot(null)}
                        className="text-white/30 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                    <h4 className="text-white font-bold text-lg mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{spot.label}</h4>
                    <p className="text-[#adaaaa] text-sm leading-relaxed">{spot.desc}</p>
                  </div>
                </div>
              ) : null
            })()}

            {/* Map */}
            <div className="w-full h-[500px]" onClick={() => setSelectedSpot(null)}>
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 130, center }}
                style={{ width: '100%', height: '100%', background: '#0d0d0d' }}
              >
                <ZoomableGroup
                  zoom={zoom}
                  center={center}
                  onMoveEnd={({ zoom: z, coordinates }) => {
                    setZoom(z)
                    setCenter(coordinates)
                  }}
                >
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map(geo => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: { fill: '#1c1c1c', stroke: '#2d2d2d', strokeWidth: 0.5, outline: 'none' },
                            hover:   { fill: '#232323', stroke: '#3fff8b', strokeWidth: 0.5, outline: 'none' },
                            pressed: { fill: '#1c1c1c', outline: 'none' },
                          }}
                        />
                      ))
                    }
                  </Geographies>

                  {HOTSPOTS.map((spot) => (
                    <Marker
                      key={spot.id}
                      coordinates={spot.coords}
                      onClick={(e) => { e.stopPropagation(); setSelectedSpot(s => s === spot.id ? null : spot.id) }}
                    >
                      {/* Outer pulse ring for CRITICAL */}
                      {spot.pulse && (
                        <circle r={18 / zoom} fill={spot.color} fillOpacity={0.15}>
                          <animate attributeName="r" dur="2s" repeatCount="indefinite"
                            values={`${10/zoom};${22/zoom};${10/zoom}`} />
                          <animate attributeName="fill-opacity" dur="2s" repeatCount="indefinite" values="0.2;0;0.2" />
                        </circle>
                      )}
                      {/* Selected ring */}
                      {selectedSpot === spot.id && (
                        <circle r={14 / zoom} fill="none" stroke={spot.color} strokeWidth={1.5 / zoom} strokeOpacity={0.8} />
                      )}
                      {/* Main dot */}
                      <circle
                        r={7 / zoom}
                        fill={spot.color}
                        fillOpacity={0.9}
                        stroke="#fff"
                        strokeWidth={1.5 / zoom}
                        style={{ cursor: 'pointer' }}
                      />
                      {/* Risk label */}
                      <text
                        textAnchor="middle"
                        y={-12 / zoom}
                        style={{ fontFamily: 'Manrope, sans-serif', fontSize: `${9/zoom}px`, fontWeight: 700, fill: spot.color, letterSpacing: '0.05em', pointerEvents: 'none' }}
                      >
                        {spot.risk}
                      </text>
                      <text
                        textAnchor="middle"
                        y={18 / zoom}
                        style={{ fontFamily: 'Manrope, sans-serif', fontSize: `${7/zoom}px`, fill: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}
                      >
                        {spot.label}
                      </text>
                    </Marker>
                  ))}
                </ZoomableGroup>
              </ComposableMap>
            </div>
          </div>
        </div>

        {/* Live Disruption Logs Table */}
        <section className="mt-12 bg-[#131313] rounded-lg glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Active Disruption Logs
              {!loading && <span className="ml-2 text-xs text-zinc-500">({totalDisruptions} this week)</span>}
            </h3>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs text-[#3fff8b] font-bold tracking-widest flex items-center gap-2 hover:underline underline-offset-4 transition-all"
            >
              VIEW ALL LOGS <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  {['Event ID', 'Route', 'Type', 'Impact', 'Status', 'Action'].map((h, i) => (
                    <th key={h} className={`px-8 py-4 ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm border-t border-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-12 text-center text-zinc-500">
                      <span className="material-symbols-outlined animate-spin block mx-auto mb-2">progress_activity</span>
                      Loading live data…
                    </td>
                  </tr>
                ) : logAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-12 text-center text-zinc-500">
                      No disruptions in the last 7 days. Add routes to generate alerts.
                    </td>
                  </tr>
                ) : logAlerts.map(d => {
                  const meta   = TYPE_META[d.disruptionType] ?? TYPE_META['None']
                  const stBg   = STATUS_STYLE[d.status] ?? STATUS_STYLE['active']
                  const impact = d.currentDelay ?? 'Unknown'
                  return (
                    <tr key={d.id} className="hover:bg-white/5 transition-colors border-b border-white/5">
                      <td className="px-8 py-4 font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {d.routeId ?? d.id.slice(0, 10)}
                      </td>
                      <td className="px-8 py-4 text-white/80">
                        {d.origin} → {d.destination}
                      </td>
                      <td className="px-8 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-xs ${meta.iconColor}`}>{meta.icon}</span>
                          {d.disruptionType ?? 'Unknown'}
                        </span>
                      </td>
                      <td className={`px-8 py-4 font-bold ${impact.includes('+') ? 'text-[#ff7351]' : 'text-white/60'}`}>
                        {impact}
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${stBg} uppercase`}>
                          {d.status ?? 'active'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => navigate(`/alerts?id=${d.id}`)}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
