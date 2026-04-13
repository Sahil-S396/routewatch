import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, onSnapshot, orderBy, query,
  doc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import AppLayout from '../components/AppLayout'
import NewRouteModal from '../components/NewRouteModal'
import Toast from '../components/Toast'

const PAGE_SIZE = 10

// ── Risk helpers ────────────────────────────────────────────────────────────
function riskStyle(risk) {
  if (risk >= 70) return { statusColor: 'text-[#ff7351]', statusBg: 'bg-[#ff7351]/10', statusBorder: 'border-[#ff7351]/20', dotColor: 'bg-[#ff7351]', riskColor: 'bg-[#ff7351]', status: 'Disrupted' }
  if (risk >= 40) return { statusColor: 'text-yellow-400',  statusBg: 'bg-yellow-400/10', statusBorder: 'border-yellow-400/20', dotColor: 'bg-yellow-400',  riskColor: 'bg-yellow-400',  status: 'At-Risk'   }
  return               { statusColor: 'text-[#3fff8b]',  statusBg: 'bg-[#3fff8b]/10',  statusBorder: 'border-[#3fff8b]/20',  dotColor: 'bg-[#3fff8b]',  riskColor: 'bg-[#3fff8b]',  status: 'On-Time'   }
}

function timeAgo(ts) {
  if (!ts) return 'Just Now'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const secs  = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60)   return 'Just Now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

// ── Three-dot dropdown menu ─────────────────────────────────────────────────
function RowMenu({ route, firestoreId, onDeleted, onResolved, onViewAlert }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-zinc-500 hover:text-white transition-colors"
      >
        <span className="material-symbols-outlined">more_horiz</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1919] border border-[#262626] rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ animation: 'fadeIn 0.1s ease' }}>
          <button
            onClick={() => { setOpen(false); onViewAlert(route) }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-[#262626] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-[#3fff8b]">visibility</span>
            View Alert
          </button>
          <button
            onClick={() => { setOpen(false); onResolved(firestoreId) }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-[#262626] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-[#3fff8b]">check_circle</span>
            Mark Resolved
          </button>
          <div className="border-t border-[#262626]" />
          <button
            onClick={() => { setOpen(false); onDeleted(firestoreId) }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#ff7351] hover:bg-[#ff7351]/10 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Delete Route
          </button>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────

export default function RoutesManagement() {
  const navigate = useNavigate()

  const [allRoutes,  setAllRoutes]  = useState([])
  const [filter,     setFilter]     = useState('all')   // 'all' | 'high_risk' | 'last_24h'
  const [page,       setPage]       = useState(0)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [toast,      setToast]      = useState(null)

  // ── Real-time Firestore subscription ──────────────────────────────────────
  useEffect(() => {
    const q   = query(collection(db, 'routes'), orderBy('createdAt', 'desc'))
    const sub = onSnapshot(q, (snap) => {
      setAllRoutes(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
    }, err => console.error('Routes subscription error:', err))
    return () => sub()
  }, [])

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered = allRoutes.filter(r => {
    if (filter === 'high_risk') return (r.risk ?? 0) > 60
    if (filter === 'last_24h') {
      if (!r.createdAt) return false
      const date = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt)
      return (Date.now() - date.getTime()) < 24 * 3600 * 1000
    }
    return true
  })

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage  = Math.min(page, totalPages - 1)
  const pageRows     = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  // If filter changes, reset to first page
  useEffect(() => { setPage(0) }, [filter])

  // ── Summary stats ─────────────────────────────────────────────────────────
  const disruptions = allRoutes.filter(r => (r.risk ?? 0) >= 70).length
  const avgRisk     = allRoutes.length
    ? Math.round(allRoutes.reduce((sum, r) => sum + (r.risk ?? 0), 0) / allRoutes.length * 10) / 10
    : 0
  const onTimePct   = allRoutes.length
    ? Math.round((allRoutes.filter(r => (r.risk ?? 0) < 40).length / allRoutes.length) * 1000) / 10
    : 94.2

  // ── Row actions ───────────────────────────────────────────────────────────
  const handleViewAlert  = (route) => navigate(`/alerts?routeId=${encodeURIComponent(route.id)}`)
  const handleMarkResolved = async (firestoreId) => {
    try {
      await updateDoc(doc(db, 'routes', firestoreId), { status: 'On-Time', risk: 0 })
      setToast({ message: 'Route marked as resolved.', type: 'success' })
    } catch { setToast({ message: 'Failed to update route.', type: 'error' }) }
  }
  const handleDelete = async (firestoreId) => {
    try {
      await deleteDoc(doc(db, 'routes', firestoreId))
      setToast({ message: 'Route deleted.', type: 'success' })
    } catch { setToast({ message: 'Failed to delete route.', type: 'error' }) }
  }
  const handleRouteCreated = () => { /* table auto-updates via onSnapshot */ }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <AppLayout>
        <div className="px-10 py-12 max-w-7xl mx-auto">

          {/* Header */}
          <section className="mb-12 flex items-end justify-between">
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Active <span className="text-[#3fff8b] italic">Routes</span>
              </h2>
              <p className="text-[#adaaaa] max-w-md">Orchestrate and monitor high-priority cargo movement across the global kinetic network.</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-[#3fff8b] to-[#13ea79] text-[#005d2c] font-bold rounded-lg shadow-[0_8px_30px_rgb(63,255,139,0.2)] hover:shadow-[0_8px_40px_rgb(63,255,139,0.3)] transition-all active:scale-95 group"
            >
              <span className="material-symbols-outlined mr-2 group-hover:rotate-90 transition-transform duration-300">add</span>
              <span className="uppercase tracking-widest text-xs" style={{ fontFamily: 'Manrope, sans-serif' }}>Add New Route</span>
            </button>
          </section>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-[#131313] p-6 rounded-xl border-l-4 border-[#3fff8b]/40 glass-panel">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">On-Time Performance</p>
              <div className="flex items-end space-x-3">
                <span className="text-3xl font-black text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>{onTimePct}%</span>
                <span className="text-[#3fff8b] text-xs font-bold mb-1 flex items-center">
                  <span className="material-symbols-outlined text-sm mr-1">arrow_upward</span>Live
                </span>
              </div>
            </div>
            <div className="bg-[#131313] p-6 rounded-xl border-l-4 border-[#ff7351]/40 glass-panel">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Active Disruptions</p>
              <div className="flex items-end space-x-3">
                <span className="text-3xl font-black text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>{String(disruptions).padStart(2, '0')}</span>
                <span className="text-[#ff7351] text-xs font-bold mb-1">High Priority</span>
              </div>
            </div>
            <div className="bg-[#131313] p-6 rounded-xl border-l-4 border-[#84ecff]/40 glass-panel">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Avg. Risk Index</p>
              <div className="flex items-end space-x-3">
                <span className="text-3xl font-black text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>{avgRisk}</span>
                <span className="text-zinc-500 text-xs font-bold mb-1">
                  {avgRisk < 40 ? 'System Neutral' : avgRisk < 70 ? 'Elevated' : 'Critical'}
                </span>
              </div>
            </div>
          </div>

          {/* Routes Table */}
          <div className="bg-[#131313] rounded-xl overflow-hidden shadow-2xl">
            {/* Table toolbar */}
            <div className="p-6 flex items-center justify-between bg-[#201f1f]/30 border-b border-[#494847]/10">
              <div className="flex items-center space-x-2">
                {[
                  { key: 'all',       label: 'All Sectors', icon: 'filter_list' },
                  { key: 'high_risk', label: 'High Risk' },
                  { key: 'last_24h',  label: 'Last 24h'  },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex items-center space-x-1 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                      filter === f.key
                        ? 'text-[#3fff8b] bg-[#3fff8b]/10 border-[#3fff8b]/20'
                        : 'text-zinc-400 border-[#494847]/20 hover:bg-[#1a1919]'
                    }`}
                  >
                    {f.icon && <span className="material-symbols-outlined text-sm">{f.icon}</span>}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Showing {filtered.length} Route{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#201f1f]/50 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    {['Route ID', 'Origin', 'Destination', 'Status', 'Risk Score', 'Last Updated', 'Actions'].map((h, i) => (
                      <th key={h} className={`px-${i === 0 || i === 6 ? 8 : 6} py-5 border-b border-[#494847]/10 ${i === 6 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#494847]/5">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-8 py-16 text-center text-zinc-500">
                        <span className="material-symbols-outlined text-3xl block mb-2">route</span>
                        {filter !== 'all' ? 'No routes match this filter.' : 'No routes yet. Add your first route!'}
                      </td>
                    </tr>
                  ) : pageRows.map(r => {
                    const style = riskStyle(r.risk ?? 0)
                    return (
                      <tr key={r.firestoreId ?? r.id} className="group hover:bg-[#262626]/30 transition-colors">
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-white tracking-wider" style={{ fontFamily: 'Manrope, sans-serif' }}>{r.id}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center">
                            <span className="material-symbols-outlined text-zinc-500 mr-2 text-lg">location_on</span>
                            <div>
                              <p className="text-sm font-semibold text-white">{r.origin}</p>
                              {r.originSub && <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{r.originSub}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center">
                            <span className="material-symbols-outlined text-zinc-500 mr-2 text-lg">navigation</span>
                            <div>
                              <p className="text-sm font-semibold text-white">{r.dest}</p>
                              {r.destSub && <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{r.destSub}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${style.statusBg} ${style.statusColor} border ${style.statusBorder} uppercase tracking-wide`}>
                            <span className={`h-1 w-1 rounded-full ${style.dotColor} mr-1.5`} />{r.status ?? style.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 h-1.5 w-16 bg-[#201f1f] rounded-full overflow-hidden">
                              <div className={`h-full ${style.riskColor}`} style={{ width: `${Math.min(100, r.risk ?? 0)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-white">{r.risk ?? 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs text-zinc-400">{timeAgo(r.createdAt)}</p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <RowMenu
                            route={r}
                            firestoreId={r.firestoreId}
                            onViewAlert={handleViewAlert}
                            onResolved={handleMarkResolved}
                            onDeleted={handleDelete}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-6 bg-[#201f1f]/30 border-t border-[#494847]/10 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                Page <span className="text-white font-bold">{currentPage + 1}</span> of {totalPages}
                <span className="ml-3 text-zinc-600">({filtered.length} total)</span>
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  className="px-3 py-1 bg-[#1a1919] rounded border border-[#494847]/20 text-zinc-500 hover:bg-[#201f1f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  className="px-3 py-1 bg-[#1a1919] rounded border border-[#494847]/20 text-white hover:bg-[#201f1f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Geospatial + System Pulse */}
          <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Geospatial Intelligence
              </h3>
              <div className="aspect-video w-full rounded-2xl bg-[#201f1f] overflow-hidden relative group">
                <svg className="w-full h-full opacity-40" viewBox="0 0 800 450">
                  <rect width="800" height="450" fill="#0e0e0e"/>
                  <path d="M50,380 Q200,200 400,230 T750,80" fill="none" stroke="#3fff8b" strokeWidth="2" opacity="0.8"/>
                  <path d="M100,350 Q350,280 600,320 T780,150" fill="none" stroke="#3fff8b" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.4"/>
                </svg>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center border border-[#3fff8b]/30">
                    <span className="material-symbols-outlined text-[#3fff8b]">sensors</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Real-Time Telemetry</p>
                    <p className="text-[10px] text-zinc-400">Satellite lock confirmed: 14/14</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter" style={{ fontFamily: 'Manrope, sans-serif' }}>
                System Pulse
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-[#131313] rounded-xl border border-[#494847]/5 flex items-start space-x-4 hover:border-[#3fff8b]/20 transition-all">
                  <div className="h-10 w-10 shrink-0 bg-[#3fff8b]/10 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#3fff8b]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-white">AI Pipeline Active</h4>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Live</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Gemini 2.0 Flash analyzing new routes. OpenWeather + GDACS data feeds connected.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-[#131313] rounded-xl border border-[#494847]/5 flex items-start space-x-4 hover:border-[#ff7351]/20 transition-all">
                  <div className="h-10 w-10 shrink-0 bg-[#ff7351]/10 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#ff7351]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-white">
                        {disruptions > 0 ? `${disruptions} Active Disruption${disruptions > 1 ? 's' : ''}` : 'All Routes Nominal'}
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Now</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {disruptions > 0
                        ? 'High-risk routes detected. Review alerts for recommended reroutes.'
                        : 'No high-risk routes detected. Network operating within normal parameters.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </AppLayout>

      <NewRouteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onRouteCreated={handleRouteCreated}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  )
}
