import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, orderBy, limit,
  onSnapshot, getDocs, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import AppLayout from '../components/AppLayout'
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getCoordinates, getRoutePath } from '../lib/routing'

// ── Leaflet Setup ────────────────────────────────────────────────────────────
// Fix Default Leaflet marker icon issues
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createDotIcon = (color) => L.divIcon({
  className: 'custom-dot',
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 10px ${color}"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
})


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


// ── Live Routes Map overlay ──────────────────────────────────────────────────
function LiveRoutesMap({ routes, hoveredRoute, onHover }) {
  const [routePaths, setRoutePaths] = useState({})

  useEffect(() => {
    let active = true

    async function loadPaths() {
      const newPaths = { ...routePaths }
      let changed = false

      for (const route of routes) {
        if (!newPaths[route.id]) {
          const originCoords = await getCoordinates(route.origin)
          const destName = route.dest || route.destination
          if (!destName) continue
          const destCoords = await getCoordinates(destName)

          if (originCoords && destCoords) {
            const path = await getRoutePath(originCoords, destCoords)
            if (path && active) {
              newPaths[route.id] = { path, originCoords, destCoords }
              changed = true
            }
          }
        }
      }
      if (changed && active) {
        setRoutePaths(newPaths)
      }
    }
    loadPaths()
    
    return () => { active = false }
  }, [routes]) // intentional to just run when routes change

  return (
    <MapContainer 
      center={[22, 82]} 
      zoom={4.5} 
      style={{ width: '100%', height: '100%', background: '#0e0e0e' }}
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; CARTO'
      />
      {routes.map(r => {
        const routeData = routePaths[r.id]
        if (!routeData) return null
        
        const isHovered = hoveredRoute?.id === r.id
        const isDisrupted = r.status === 'Disrupted' || (r.risk ?? 0) >= 40
        const color = isDisrupted ? '#f97316' : '#3fff8b'
        
        return (
          <div key={r.id}>
             <Polyline 
               positions={routeData.path}
               color={color}
               weight={isHovered ? 5 : 3}
               opacity={isHovered ? 1 : 0.6}
               eventHandlers={{
                 mouseover: () => onHover(r),
                 mouseout: () => onHover(null),
               }}
             />
             <Marker position={routeData.originCoords} icon={createDotIcon(color)} />
             <Marker position={routeData.destCoords} icon={createDotIcon(color)} />
          </div>
        )
      })}
    </MapContainer>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

  // ── Data state ─────────────────────────────────────────────────────────────
  const [activeRoutesCount, setActiveRoutesCount] = useState('—')
  const [disruptionsToday,  setDisruptionsToday]  = useState('—')
  const [atRisk,            setAtRisk]            = useState('—')
  
  const [liveAlerts,        setLiveAlerts]        = useState([])
  const [activeRoutes,      setActiveRoutes]      = useState([])
  
  const [hoveredRoute,      setHoveredRoute]      = useState(null)
  const [mousePos,          setMousePos]          = useState({ x: 0, y: 0 })

  // ── Mouse tracking for tooltip ─────────────────────────────────────────────
  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  // ── Firestore stats (not used for map rendering) ───────────────────────────
  useEffect(() => {
    async function fetchStats() {
      try {
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

  // Real-time routes feed for map
  useEffect(() => {
    const q = query(collection(db, 'routes'))
    const unsub = onSnapshot(q, snap => {
      const routes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setActiveRoutes(routes)
      setActiveRoutesCount(routes.length)
      setAtRisk(routes.filter(r => r.risk > 40).length)
    })
    return () => unsub()
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
      <div className="p-8 flex flex-col gap-8 bg-[#0e0e0e] min-h-screen">

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
            { label: 'Active Routes',     value: activeRoutesCount, color: '#3fff8b', icon: 'route',      sub: 'from Firestore' },
            { label: 'Disruptions Today', value: disruptionsToday,  color: '#ff7351', icon: 'warning',    sub: 'Since midnight' },
            { label: 'At-Risk Shipments', value: atRisk,            color: '#84ecff', icon: 'inventory_2', sub: 'Risk score > 40' },
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

        {/* Map + Live Feed */}
        <section className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8" style={{ minHeight: 520 }}>

          {/* ── India Map ── */}
          <div
            className="lg:col-span-3 rounded-2xl overflow-hidden relative border border-white/5"
            style={{ background: '#0e0e0e', minHeight: 480 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredRoute(null)}
          >
            {/* LIVE badge */}
            <div className="absolute top-4 right-4 z-[400] flex items-center gap-2 bg-black/60 backdrop-blur
                            px-3 py-1.5 rounded-full border border-white/10 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fff8b]" />
              <span className="text-[11px] font-bold text-white tracking-tight">LIVE AI TRACKING</span>
              <div className="h-3 w-px bg-white/20" />
              <span className="text-[10px] text-white/40">{activeRoutesCount} ROUTES ONLINE</span>
            </div>

            {/* Route hover tooltip */}
            <div
              className="fixed z-[999] pointer-events-none"
              style={{ 
                display: hoveredRoute ? 'block' : 'none', 
                left: mousePos.x + 15, 
                top: mousePos.y - 65,
                transition: 'top 0.05s, left 0.05s' 
              }}
            >
              {hoveredRoute && (
                <div className="bg-[#0d0d0d]/95 border border-white/10 rounded-xl px-3.5 py-2.5
                                backdrop-blur shadow-xl" style={{ minWidth: 210 }}>
                  <p className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest mb-0.5">
                    Route #{hoveredRoute.id}
                  </p>
                  <p className="text-sm font-bold text-white mb-1">
                    {hoveredRoute.origin} → {hoveredRoute.dest || hoveredRoute.destination}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      hoveredRoute.status === 'Disrupted'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-[#3fff8b]/10 text-[#3fff8b]'
                    }`}>
                      {hoveredRoute.status}
                    </span>
                    <span className="text-[10px] text-[#adaaaa]">
                      Risk: <strong className="text-white">{hoveredRoute.risk ?? 0}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Render the Map */}
            <LiveRoutesMap 
              routes={activeRoutes} 
              hoveredRoute={hoveredRoute} 
              onHover={setHoveredRoute} 
            />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-2.5
                            rounded-xl border border-white/10 flex flex-col gap-2 z-[400] pointer-events-none">
              {[
                { color: '#f97316', label: 'Disrupted Route' },
                { color: '#3fff8b', label: 'On-Time / Effective' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <svg width="22" height="4">
                    <line x1="0" y1="2" x2="22" y2="2"
                          stroke={color} strokeWidth="3" opacity={0.8} />
                  </svg>
                  <span className="text-[10px] text-white/55 font-semibold">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3fff8b]/50 border border-[#fff]" style={{ minWidth: 12 }} />
                <span className="text-[10px] text-white/55 font-semibold">City Node</span>
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
