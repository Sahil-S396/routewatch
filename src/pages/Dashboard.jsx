import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import AppLayout from '../components/AppLayout'

// Colour config for alert cards in the feed
function alertStyle(type) {
  switch (type) {
    case 'Natural Disaster':
      return { border: 'border-[#ff7351]', bg: 'bg-[#ff7351]',    text: 'text-[#450900]', level: 'Critical' }
    case 'Weather':
      return { border: 'border-[#b92902]', bg: 'bg-[#b92902]',    text: 'text-white',     level: 'Critical' }
    case 'Traffic':
      return { border: 'border-[#ff7351]/50', bg: 'bg-orange-500/20', text: 'text-orange-400', level: 'Warning' }
    default:
      return { border: 'border-[#84ecff]/50', bg: 'bg-[#84ecff]/20', text: 'text-[#84ecff]', level: 'Info' }
  }
}

function timeAgo(ts) {
  if (!ts) return '—'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const secs  = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60)  return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

export default function Dashboard() {
  const navigate = useNavigate()

  // Live stats
  const [activeRoutes,    setActiveRoutes]    = useState('—')
  const [disruptionsToday, setDisruptionsToday] = useState('—')
  const [atRisk,           setAtRisk]           = useState('—')

  // Live alert feed (real-time subscription)
  const [liveAlerts, setLiveAlerts] = useState([])

  // ── Fetch one-time stats ──────────────────────────────────────────────────
  useEffect(() => {
    async function fetchStats() {
      try {
        // Active routes count
        const routeSnap = await getDocs(collection(db, 'routes'))
        setActiveRoutes(routeSnap.size)

        // At-risk shipments (routes with risk > 40)
        const atRiskSnap = await getDocs(
          query(collection(db, 'routes'), where('risk', '>', 40))
        )
        setAtRisk(atRiskSnap.size)

        // Disruptions today
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        // Firestore Timestamp comparison needs a Timestamp or Date
        const { Timestamp } = await import('firebase/firestore')
        const todayTs = Timestamp.fromDate(todayStart)
        const todaySnap = await getDocs(
          query(collection(db, 'alerts'), where('createdAt', '>=', todayTs))
        )
        setDisruptionsToday(todaySnap.size)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      }
    }
    fetchStats()
  }, [])

  // ── Real-time alert feed ──────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'alerts'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    const unsub = onSnapshot(q, (snap) => {
      setLiveAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (err) => console.error('Alert feed error:', err))

    return () => unsub()
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="p-8 flex flex-col gap-8 bg-[#0e0e0e]">
        {/* Headline */}
        <section className="flex flex-col gap-1">
          <h2 className="text-4xl font-extrabold tracking-tighter text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Fleet Overview
          </h2>
          <p className="text-[#adaaaa] text-sm">Real-time surveillance of global maritime and land corridors.</p>
        </section>

        {/* Stat Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Routes */}
          <div className="bg-[#131313] p-6 rounded-xl border-l-2 border-[#3fff8b]/30 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#adaaaa] font-bold">Active Routes</p>
                <h3 className="text-3xl font-black text-white mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {activeRoutes}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#3fff8b]/10 flex items-center justify-center text-[#3fff8b]">
                <span className="material-symbols-outlined">route</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#3fff8b] text-xs font-bold flex items-center">
                <span className="material-symbols-outlined text-xs">fiber_manual_record</span>Live
              </span>
              <span className="text-[#adaaaa] text-[10px]">from Firestore</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3fff8b]/20 to-transparent" />
          </div>

          {/* Disruptions Today */}
          <div className="bg-[#131313] p-6 rounded-xl border-l-2 border-[#ff7351]/30 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#adaaaa] font-bold">Disruptions Today</p>
                <h3 className="text-3xl font-black text-white mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {disruptionsToday}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#ff7351]/10 flex items-center justify-center text-[#ff7351]">
                <span className="material-symbols-outlined">warning</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#ff7351] text-xs font-bold flex items-center">
                <span className="material-symbols-outlined text-xs">today</span>Since midnight
              </span>
            </div>
          </div>

          {/* At-Risk Shipments */}
          <div className="bg-[#131313] p-6 rounded-xl border-l-2 border-[#84ecff]/30 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#adaaaa] font-bold">At-Risk Shipments</p>
                <h3 className="text-3xl font-black text-white mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {atRisk}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#84ecff]/10 flex items-center justify-center text-[#84ecff]">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#84ecff] text-xs font-bold">Risk score &gt; 40</span>
            </div>
          </div>
        </section>

        {/* Map + Live Feed */}
        <section className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[500px]">
          {/* Animated map placeholder */}
          <div className="lg:col-span-3 bg-[#000000] rounded-2xl overflow-hidden relative border border-white/5">
            <div className="absolute inset-0 z-0">
              <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                  <path className="drop-shadow-[0_0_8px_rgba(63,255,139,0.8)]" d="M100,200 Q300,50 600,250 T1000,100" fill="none" stroke="#3fff8b" strokeWidth="2"/>
                  <path opacity="0.5" d="M200,400 Q500,300 800,450" fill="none" stroke="#3fff8b" strokeDasharray="8 4" strokeWidth="1.5"/>
                  <path className="drop-shadow-[0_0_8px_rgba(63,255,139,0.8)]" d="M800,100 Q950,300 1100,500" fill="none" stroke="#3fff8b" strokeWidth="2"/>
                </svg>
                <div className="absolute top-[40%] left-[60%] w-3 h-3 bg-[#ff7351] rounded-full border border-white/20 animate-pulse" />
                <div className="absolute top-[25%] left-[20%] w-3 h-3 bg-[#ff7351] rounded-full border border-white/20 animate-pulse" />
                <div className="absolute top-[70%] left-[85%] w-3 h-3 bg-[#ff7351] rounded-full border border-white/20 animate-pulse" />
                <div className="text-[#adaaaa]/20 text-xs uppercase tracking-widest absolute bottom-1/2 left-1/2 -translate-x-1/2">
                  Global Map View
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-10">
              <button className="bg-black/40 backdrop-blur w-10 h-10 rounded-md flex items-center justify-center text-white/80 hover:text-[#3fff8b] border border-white/10">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button className="bg-black/40 backdrop-blur w-10 h-10 rounded-md flex items-center justify-center text-white/80 hover:text-[#3fff8b] border border-white/10">
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>
            <div className="absolute top-6 left-6 bg-black/40 backdrop-blur py-2 px-4 rounded-full border border-white/10 flex items-center gap-3 z-10">
              <span className="w-2 h-2 rounded-full bg-[#3fff8b] animate-pulse" />
              <span className="text-xs font-bold text-white tracking-tight">LIVE MONITORING</span>
              <div className="h-4 w-[1px] bg-white/20" />
              <span className="text-[10px] text-white/50 font-medium">{activeRoutes} ROUTES ONLINE</span>
            </div>
          </div>

          {/* Alert Feed */}
          <div className="lg:col-span-1 bg-[#1a1919] flex flex-col rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h4 className="font-bold text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>Live Alert Feed</h4>
              {liveAlerts.length > 0 && (
                <span className="bg-[#ff7351]/20 text-[#ff7351] text-[10px] font-black px-2 py-0.5 rounded">
                  {liveAlerts.length} NEW
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {liveAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20 py-12">
                  <span className="material-symbols-outlined text-3xl">notifications_off</span>
                  <p className="text-xs text-center">No active alerts.<br/>Create a route to generate live alerts.</p>
                </div>
              ) : (
                liveAlerts.map(a => {
                  const style = alertStyle(a.disruptionType)
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/alerts?id=${a.id}`)}
                      className={`p-4 rounded-xl bg-[#201f1f] border-l-4 ${style.border} hover:bg-[#262626] transition-colors cursor-pointer group`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black tracking-tighter py-0.5 px-2 rounded ${style.bg} ${style.text} uppercase`}>
                          {style.level}
                        </span>
                        <span className="text-[10px] text-white/30">{timeAgo(a.createdAt)}</span>
                      </div>
                      <h5 className="text-sm font-bold text-white mb-1 group-hover:text-[#3fff8b] transition-colors">
                        {a.alertTitle ?? 'Disruption Detected'}
                      </h5>
                      <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
                        {a.explanation ?? `${a.origin} → ${a.destination}`}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
            <div className="p-4 border-t border-white/5">
              <button
                onClick={() => navigate('/alerts')}
                className="w-full py-2 text-xs font-bold text-[#3fff8b] hover:text-white transition-colors bg-[#3fff8b]/5 hover:bg-[#3fff8b]/10 rounded"
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
