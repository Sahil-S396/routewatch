import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, orderBy, limit,
  onSnapshot, getDocs, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import AppLayout from '../components/AppLayout'
import {
  ComposableMap,
  Geographies,
  Geography,
  useMapContext,
} from 'react-simple-maps'

// ── India GeoJSON ────────────────────────────────────────────────────────────
const INDIA_GEO =
  'https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson'

// ── Static route dataset with NH waypoints ───────────────────────────────────
const ROUTE_DATASET = [
  {
    id:          'RW-5127',
    origin:      'Bhubaneswar',
    destination: 'Delhi',
    status:      'DISRUPTED',
    riskScore:   83,
    // NH-16 + NH-30 + NH-19 corridor
    waypoints: [
      [85.82, 20.30], // Bhubaneswar
      [86.92, 21.49], // Sambalpur
      [84.00, 22.80], // Raipur area
      [82.97, 25.32], // Varanasi
      [80.94, 26.85], // Lucknow
      [77.10, 28.70], // Delhi
    ],
    disruption: 2, // index of waypoint where disruption occurs
  },
  {
    id:          'RW-3400',
    origin:      'Delhi',
    destination: 'Mumbai',
    status:      'REROUTED',
    riskScore:   80,
    // NH-48 original path (shown faded)
    waypoints: [
      [77.10, 28.70], // Delhi
      [76.31, 27.99], // Rewari
      [75.78, 26.91], // Jaipur
      [74.64, 25.35], // Ajmer
      [73.02, 22.31], // Vadodara
      [72.83, 21.17], // Surat
      [72.88, 19.08], // Mumbai
    ],
  },
  {
    id:          'RW-ALT-3400',
    origin:      'Delhi',
    destination: 'Mumbai',
    status:      'REROUTE_PATH',
    riskScore:   0,
    // Alternative via Nagpur
    waypoints: [
      [77.10, 28.70], // Delhi
      [78.96, 26.23], // Gwalior
      [79.01, 21.14], // Nagpur
      [76.39, 19.88], // Aurangabad
      [72.88, 19.08], // Mumbai
    ],
  },
]

// ── Visual config per status ─────────────────────────────────────────────────
function routeStyle(status) {
  switch (status) {
    case 'DISRUPTED':
      return { stroke: '#ef4444', strokeWidth: 2,   strokeDasharray: '8,4', opacity: 1,   glow: '#ef444460' }
    case 'REROUTED':
      return { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '8,4', opacity: 0.3, glow: 'none'      }
    case 'REROUTE_PATH':
      return { stroke: '#3fff8b', strokeWidth: 2.5, strokeDasharray: undefined, opacity: 1, glow: '#3fff8b60' }
    default: // ON-TIME
      return { stroke: '#3fff8b', strokeWidth: 2,   strokeDasharray: undefined, opacity: 1, glow: '#3fff8b60' }
  }
}

// ── Inner overlay — must be a child of <ComposableMap> ───────────────────────
function IndiaRouteOverlay({ hoveredId, onHover }) {
  const { projection } = useMapContext()
  if (!projection) return null

  // Collect unique city endpoints for dot rendering
  const cityDots = {}
  ROUTE_DATASET.forEach(r => {
    if (r.status === 'REROUTE_PATH') return // skip alt-path endpoints
    const start = r.waypoints[0]
    const end   = r.waypoints[r.waypoints.length - 1]
    cityDots[r.origin]      = start
    cityDots[r.destination] = end
  })

  return (
    <g>
      {/* ── Route polylines ── */}
      {ROUTE_DATASET.map(route => {
        const pts = route.waypoints
          .map(wp => projection(wp))
          .filter(Boolean)
        if (pts.length < 2) return null

        const points = pts.map(p => `${p[0]},${p[1]}`).join(' ')
        const st      = routeStyle(route.status)
        const isHov   = hoveredId === route.id
        const midPt   = pts[Math.floor(pts.length / 2)]

        // Disruption waypoint (for DISRUPTED routes)
        const disruptPt = route.disruption != null ? pts[route.disruption] ?? null : null

        return (
          <g
            key={route.id}
            style={{ cursor: route.status !== 'REROUTE_PATH' ? 'pointer' : 'default' }}
            onMouseEnter={() => route.status !== 'REROUTE_PATH' && onHover(route)}
            onMouseLeave={() => onHover(null)}
          >
            {/* Invisible wide hit area */}
            <polyline points={points} fill="none" stroke="transparent" strokeWidth={12} />

            {/* Glow halo on hover */}
            {isHov && st.glow !== 'none' && (
              <polyline
                points={points} fill="none"
                stroke={st.stroke} strokeWidth={6} strokeOpacity={0.12}
                strokeLinecap="round" strokeLinejoin="round"
              />
            )}

            {/* Main route line */}
            <polyline
              points={points}
              fill="none"
              stroke={st.stroke}
              strokeWidth={isHov ? st.strokeWidth + 0.6 : st.strokeWidth}
              strokeOpacity={st.opacity}
              strokeDasharray={st.strokeDasharray}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: st.glow !== 'none'
                  ? `drop-shadow(0 0 ${isHov ? 6 : 3}px ${st.glow})`
                  : 'none',
              }}
            />

            {/* ⚠ Disruption marker */}
            {disruptPt && (
              <g>
                <circle
                  cx={disruptPt[0]} cy={disruptPt[1]} r={9}
                  fill="#f97316" fillOpacity={0.15}
                  stroke="#f97316" strokeWidth={1}
                />
                <circle cx={disruptPt[0]} cy={disruptPt[1]} r={4.5} fill="#f97316" />
                <text
                  x={disruptPt[0]} y={disruptPt[1] - 13}
                  textAnchor="middle" fontSize="10" fill="#f97316"
                  style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800 }}
                >
                  ⚠
                </text>
                <text
                  x={disruptPt[0] + 12} y={disruptPt[1] - 2}
                  fontSize="6.5" fill="#f97316"
                  style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700 }}
                >
                  DISRUPTION
                </text>
              </g>
            )}

            {/* "REROUTED PATH" label at midpoint */}
            {route.status === 'REROUTE_PATH' && midPt && (
              <g>
                <rect
                  x={midPt[0] - 28} y={midPt[1] - 16}
                  width={56} height={12}
                  rx={3}
                  fill="#0e0e0e" fillOpacity={0.8}
                />
                <text
                  x={midPt[0]} y={midPt[1] - 7}
                  textAnchor="middle"
                  fontSize="6" fill="#3fff8b"
                  style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, letterSpacing: '0.05em' }}
                >
                  REROUTED PATH
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* ── City endpoint dots ── */}
      {Object.entries(cityDots).map(([city, coords]) => {
        const pt = projection(coords)
        if (!pt) return null
        return (
          <g key={city} style={{ pointerEvents: 'none' }}>
            <circle cx={pt[0]} cy={pt[1]} r={4.5}
                    fill="#1a1a1a" stroke="#ffffff" strokeWidth={1} />
            <circle cx={pt[0]} cy={pt[1]} r={2.2} fill="#ffffff" />
            <text
              x={pt[0]} y={pt[1] + 13}
              textAnchor="middle" fontSize="6.5"
              fill="rgba(255,255,255,0.85)"
              style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600 }}
            >
              {city}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ── Alert feed helpers ───────────────────────────────────────────────────────
function alertStyle(type) {
  switch (type) {
    case 'Natural Disaster':
      return { border: 'border-[#ff7351]',    bg: 'bg-[#ff7351]',     text: 'text-[#450900]',  level: 'Critical' }
    case 'Weather':
      return { border: 'border-[#b92902]',    bg: 'bg-[#b92902]',     text: 'text-white',      level: 'Critical' }
    case 'Traffic':
      return { border: 'border-[#ff7351]/50', bg: 'bg-orange-500/20', text: 'text-orange-400', level: 'Warning'  }
    default:
      return { border: 'border-[#84ecff]/50', bg: 'bg-[#84ecff]/20', text: 'text-[#84ecff]',  level: 'Info'     }
  }
}

function timeAgo(ts) {
  if (!ts) return '—'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const secs  = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

  // ── Data state ─────────────────────────────────────────────────────────────
  const [activeRoutes,     setActiveRoutes]     = useState('—')
  const [disruptionsToday, setDisruptionsToday] = useState('—')
  const [atRisk,           setAtRisk]           = useState('—')
  const [liveAlerts,       setLiveAlerts]       = useState([])
  const [hoveredRoute,     setHoveredRoute]     = useState(null)

  // ── Map zoom state ─────────────────────────────────────────────────────────
  // cssZoom: CSS scale factor, mapScale: projectionConfig.scale
  const BASE_SCALE = 900
  const [cssZoom,  setCssZoom]  = useState(1)  // 1–4
  const mapContainerRef = useRef(null)
  const tooltipRef      = useRef(null)

  // Wheel zoom — non-passive so we can preventDefault
  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return

    let currentZoom = 1

    function onWheel(e) {
      e.preventDefault()
      // Dampen: 0.001 per pixel of deltaY
      const delta   = -e.deltaY * 0.001
      currentZoom   = Math.min(Math.max(currentZoom + delta, 1), 4)
      setCssZoom(currentZoom)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Zoom buttons: 0.5 step
  const handleZoomIn  = useCallback(() => setCssZoom(z => Math.min(+(z + 0.5).toFixed(1), 4)), [])
  const handleZoomOut = useCallback(() => setCssZoom(z => Math.max(+(z - 0.5).toFixed(1), 1)), [])

  // Tooltip position — updated via DOM ref, no re-render
  const handleMouseMove = useCallback((e) => {
    if (!tooltipRef.current || !mapContainerRef.current) return
    const rect = mapContainerRef.current.getBoundingClientRect()
    tooltipRef.current.style.left = `${e.clientX - rect.left + 14}px`
    tooltipRef.current.style.top  = `${e.clientY - rect.top  - 60}px`
  }, [])

  // ── Firestore stats (not used for map rendering) ───────────────────────────
  useEffect(() => {
    async function fetchStats() {
      try {
        const routeSnap = await getDocs(collection(db, 'routes'))
        setActiveRoutes(routeSnap.size)

        const atRiskSnap = await getDocs(
          query(collection(db, 'routes'), where('risk', '>', 40))
        )
        setAtRisk(atRiskSnap.size)

        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const { Timestamp } = await import('firebase/firestore')
        const todaySnap = await getDocs(
          query(collection(db, 'alerts'), where('createdAt', '>=', Timestamp.fromDate(todayStart)))
        )
        setDisruptionsToday(todaySnap.size)
      } catch (err) {
        console.error('Stats fetch error:', err)
      }
    }
    fetchStats()
  }, [])

  // Real-time alert feed
  useEffect(() => {
    const q    = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(6))
    const unsub = onSnapshot(q, snap => {
      setLiveAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="p-8 flex flex-col gap-8 bg-[#0e0e0e]">

        {/* Headline */}
        <section className="flex flex-col gap-1">
          <h2 className="text-4xl font-extrabold tracking-tighter text-white"
              style={{ fontFamily: 'Manrope, sans-serif' }}>
            Fleet Overview
          </h2>
          <p className="text-[#adaaaa] text-sm">
            Real-time surveillance of Indian freight corridors.
          </p>
        </section>

        {/* Stat Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Active Routes',     value: activeRoutes,     color: '#3fff8b', icon: 'route',      sub: 'from Firestore' },
            { label: 'Disruptions Today', value: disruptionsToday, color: '#ff7351', icon: 'warning',    sub: 'Since midnight' },
            { label: 'At-Risk Shipments', value: atRisk,           color: '#84ecff', icon: 'inventory_2', sub: 'Risk score > 40' },
          ].map(({ label, value, color, icon, sub }) => (
            <div key={label}
                 className="bg-[#131313] p-6 rounded-xl relative overflow-hidden"
                 style={{ borderLeft: `2px solid ${color}40` }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#adaaaa] font-bold">{label}</p>
                  <h3 className="text-3xl font-black text-white mt-1"
                      style={{ fontFamily: 'Manrope, sans-serif' }}>{value}</h3>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                     style={{ background: `${color}18`, color }}>
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
              </div>
              <span className="text-xs font-bold" style={{ color }}>{sub}</span>
              <div className="absolute bottom-0 left-0 right-0 h-px"
                   style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
            </div>
          ))}
        </section>

        {/* India Map + Live Feed */}
        <section className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8" style={{ minHeight: 520 }}>

          {/* ── India Map ── */}
          <div
            ref={mapContainerRef}
            className="lg:col-span-3 rounded-2xl overflow-hidden relative border border-white/5"
            style={{ background: '#0e0e0e', minHeight: 480 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredRoute(null)}
          >
            {/* LIVE badge */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur
                            px-3 py-1.5 rounded-full border border-white/10 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fff8b]" />
              <span className="text-[11px] font-bold text-white tracking-tight">LIVE MONITORING</span>
              <div className="h-3 w-px bg-white/20" />
              <span className="text-[10px] text-white/40">{activeRoutes} ROUTES ONLINE</span>
            </div>

            {/* Route hover tooltip */}
            <div
              ref={tooltipRef}
              className="absolute z-20 pointer-events-none"
              style={{ display: hoveredRoute ? 'block' : 'none', left: 0, top: 0 }}
            >
              {hoveredRoute && (
                <div className="bg-[#0d0d0d]/95 border border-white/10 rounded-xl px-3.5 py-2.5
                                backdrop-blur shadow-xl" style={{ minWidth: 210 }}>
                  <p className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest mb-0.5">
                    Route #{hoveredRoute.id}
                  </p>
                  <p className="text-sm font-bold text-white mb-1">
                    {hoveredRoute.origin} → {hoveredRoute.destination}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      hoveredRoute.status === 'DISRUPTED'
                        ? 'bg-red-500/20 text-red-400'
                        : hoveredRoute.status === 'REROUTED'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-[#3fff8b]/10 text-[#3fff8b]'
                    }`}>
                      {hoveredRoute.status}
                    </span>
                    <span className="text-[10px] text-[#adaaaa]">
                      Risk: <strong className="text-white">{hoveredRoute.riskScore}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CSS zoom wrapper */}
            <div
              style={{
                width: '100%',
                height: '100%',
                transform: `scale(${cssZoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.25s ease-out',
              }}
            >
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: BASE_SCALE, center: [82, 22] }}
                style={{ width: '100%', height: '100%', background: '#0e0e0e' }}
              >
                {/* India state borders */}
                <Geographies geography={INDIA_GEO}>
                  {({ geographies }) =>
                    geographies.map(geo => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        style={{
                          default: { fill: '#141414', stroke: '#2a2a2a', strokeWidth: 0.5, outline: 'none' },
                          hover:   { fill: '#1c1c1c', stroke: '#2a2a2a', strokeWidth: 0.5, outline: 'none' },
                          pressed: { fill: '#141414', outline: 'none' },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {/* Static route polylines + markers */}
                <IndiaRouteOverlay
                  hoveredId={hoveredRoute?.id}
                  onHover={setHoveredRoute}
                />
              </ComposableMap>
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 z-10">
              <button
                onClick={handleZoomIn}
                className="w-8 h-8 bg-black/60 backdrop-blur rounded-lg border border-white/10
                           flex items-center justify-center text-white/60 hover:text-[#3fff8b]
                           transition-colors text-sm font-bold"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
              <div className="text-center text-[9px] text-white/30 font-bold">
                {cssZoom.toFixed(1)}×
              </div>
              <button
                onClick={handleZoomOut}
                className="w-8 h-8 bg-black/60 backdrop-blur rounded-lg border border-white/10
                           flex items-center justify-center text-white/60 hover:text-[#3fff8b]
                           transition-colors text-sm font-bold"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-2.5
                            rounded-xl border border-white/10 flex flex-col gap-2 z-10 pointer-events-none">
              {[
                { dash: '8,4', color: '#ef4444', label: 'Disrupted'     },
                { dash: '8,4', color: '#ef4444', label: 'Original path', opacity: 0.3 },
                { dash: undefined, color: '#3fff8b', label: 'Rerouted path' },
              ].map(({ dash, color, label, opacity = 1 }) => (
                <div key={label} className="flex items-center gap-2">
                  <svg width="22" height="4">
                    <line x1="0" y1="2" x2="22" y2="2"
                          stroke={color} strokeWidth="2" opacity={opacity}
                          strokeDasharray={dash} strokeLinecap="round" />
                  </svg>
                  <span className="text-[10px] text-white/55 font-semibold">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f97316]" style={{ minWidth: 12 }} />
                <span className="text-[10px] text-white/55 font-semibold">Disruption point</span>
              </div>
            </div>
          </div>

          {/* Live Alert Feed */}
          <div className="lg:col-span-1 bg-[#1a1919] flex flex-col rounded-2xl
                          border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h4 className="font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Live Alert Feed
              </h4>
              {liveAlerts.length > 0 && (
                <span className="bg-[#ff7351]/20 text-[#ff7351] text-[10px] font-black px-2 py-0.5 rounded">
                  {liveAlerts.length} NEW
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {liveAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20 py-10">
                  <span className="material-symbols-outlined text-3xl">notifications_off</span>
                  <p className="text-xs text-center">
                    No alerts yet.<br />Create a route to generate live alerts.
                  </p>
                </div>
              ) : (
                liveAlerts.map(a => {
                  const s = alertStyle(a.disruptionType)
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/alerts?id=${a.id}`)}
                      className={`p-3.5 rounded-xl bg-[#201f1f] border-l-4 ${s.border}
                                  hover:bg-[#262626] transition-colors cursor-pointer group`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className={`text-[10px] font-black py-0.5 px-2 rounded
                                         ${s.bg} ${s.text} uppercase`}>
                          {s.level}
                        </span>
                        <span className="text-[10px] text-white/30">{timeAgo(a.createdAt)}</span>
                      </div>
                      <h5 className="text-sm font-bold text-white mb-0.5
                                     group-hover:text-[#3fff8b] transition-colors line-clamp-1">
                        {a.alertTitle ?? 'Disruption Detected'}
                      </h5>
                      <p className="text-[11px] text-white/50">
                        {a.origin && a.destination
                          ? `${a.origin} → ${a.destination}`
                          : (a.explanation ?? '')}
                      </p>
                      {a.severityScore != null && (
                        <div className="mt-2 h-1 rounded-full bg-[#262626] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#ff7351]"
                            style={{ width: `${Math.min(100, a.severityScore)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-white/5">
              <button
                onClick={() => navigate('/alerts')}
                className="w-full py-2 text-xs font-bold text-[#3fff8b] hover:text-white
                           bg-[#3fff8b]/5 hover:bg-[#3fff8b]/10 rounded transition-colors"
              >
                VIEW ALL ALERTS
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
