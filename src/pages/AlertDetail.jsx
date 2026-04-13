import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  collection, query, orderBy, limit,
  getDocs, doc, updateDoc, getDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'

const TYPE_ICON = {
  'Weather':          'rainy',
  'Natural Disaster': 'volcano',
  'Traffic':          'traffic',
  'None':             'check_circle',
}

// ── Reroute Success Modal ────────────────────────────────────────────────────
function RerouteSuccessModal({ alert, onGoToDashboard }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="relative bg-[#0f1a12] border border-[#3fff8b]/30 rounded-2xl p-10 max-w-lg w-full mx-4 shadow-[0_0_80px_rgba(63,255,139,0.15)]"
        style={{ animation: 'modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity:0; transform:scale(0.88) translateY(20px); }
            to   { opacity:1; transform:scale(1)    translateY(0);     }
          }
          @keyframes checkPop {
            0%   { transform:scale(0) rotate(-15deg); opacity:0; }
            70%  { transform:scale(1.15) rotate(4deg); }
            100% { transform:scale(1) rotate(0deg); opacity:1; }
          }
        `}</style>

        {/* Glowing checkmark */}
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full bg-[#3fff8b]/10 border-2 border-[#3fff8b] flex items-center justify-center"
            style={{ animation: 'checkPop 0.5s 0.1s both cubic-bezier(0.34,1.56,0.64,1)' }}
          >
            <span className="material-symbols-outlined text-[#3fff8b] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-center text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Reroute Successfully Applied
        </h2>
        <p className="text-center text-[#adaaaa] text-sm mb-8">
          The shipment has been redirected to the alternative corridor.
        </p>

        <div className="space-y-3 mb-8">
          <div className="bg-[#1a2a1d] rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ff7351] text-sm mt-0.5">remove_road</span>
            <div>
              <p className="text-[10px] text-[#adaaaa] uppercase tracking-widest font-bold mb-0.5">Original Route</p>
              <p className="text-white font-semibold">
                {alert.origin} → {alert.destination}
              </p>
            </div>
          </div>

          <div className="bg-[#1a2a1d] rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#3fff8b] text-sm mt-0.5">alt_route</span>
            <div>
              <p className="text-[10px] text-[#adaaaa] uppercase tracking-widest font-bold mb-0.5">New Route</p>
              <p className="text-white font-semibold">{alert.recommendedRoute ?? 'Alternative route active'}</p>
            </div>
          </div>

          <div className="bg-[#1a2a1d] rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-yellow-400 text-sm mt-0.5">schedule</span>
            <div>
              <p className="text-[10px] text-[#adaaaa] uppercase tracking-widest font-bold mb-0.5">ETA Impact</p>
              <p className="text-yellow-400 font-bold text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {alert.etaDifference ?? 'See updated ETA'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onGoToDashboard}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3fff8b] to-[#13ea79] text-[#005d2c] font-bold text-sm flex items-center justify-center gap-2 hover:shadow-[0_4px_24px_rgba(63,255,139,0.4)] transition-all"
        >
          <span className="material-symbols-outlined text-sm">dashboard</span>
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────

export default function AlertDetail() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const queryId        = searchParams.get('id')
  const routeIdParam   = searchParams.get('routeId') // e.g. RW-XXXX from Route Management

  const [alert,         setAlert]         = useState(null)
  const [alertDocId,    setAlertDocId]    = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [dismissing,    setDismissing]    = useState(false)
  const [rerouting,     setRerouting]     = useState(false)
  const [toast,         setToast]         = useState(null)
  const [rerouteModal,  setRerouteModal]  = useState(false)

  const toastTimerRef = useRef(null)

  function showToast(message, type = 'success') {
    clearTimeout(toastTimerRef.current)
    setToast({ message, type })
  }

  // ── Fetch alert ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAlert() {
      setLoading(true)
      try {
        // 1. Firestore doc ID lookup (?id=<docId>)
        if (queryId) {
          const direct = await getDoc(doc(db, 'alerts', queryId))
          if (direct.exists()) {
            setAlert({ id: direct.id, ...direct.data() })
            setAlertDocId(direct.id)
            setLoading(false)
            return
          }
        }

        // 2. routeId param lookup (?routeId=RW-XXXX) — from RoutesManagement
        const lookupId = routeIdParam ?? queryId
        if (lookupId) {
          const byRoute = await getDocs(
            query(
              collection(db, 'alerts'),
              where('routeId', '==', lookupId),
              orderBy('createdAt', 'desc'),
              limit(1),
            )
          )
          if (!byRoute.empty) {
            const d = byRoute.docs[0]
            setAlert({ id: d.id, ...d.data() })
            setAlertDocId(d.id)
            setLoading(false)
            return
          }
        }

        // 3. Fall back: most recent alert of ANY status
        const snap = await getDocs(
          query(
            collection(db, 'alerts'),
            orderBy('createdAt', 'desc'),
            limit(1),
          )
        )
        if (!snap.empty) {
          const d = snap.docs[0]
          setAlert({ id: d.id, ...d.data() })
          setAlertDocId(d.id)
        } else {
          setAlert(null)
        }
      } catch (err) {
        console.error('Failed to load alert:', err)
        setAlert(null)
      } finally {
        setLoading(false)
      }
    }
    loadAlert()
  }, [queryId, routeIdParam])

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const handleDismiss = async () => {
    if (!alertDocId) return
    setDismissing(true)
    try {
      await updateDoc(doc(db, 'alerts', alertDocId), {
        status:    'dismissed',
        updatedAt: new Date().toISOString(),
      })
      showToast('Alert dismissed', 'info')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      console.error(err)
      showToast('Failed to dismiss alert.', 'error')
    } finally {
      setDismissing(false)
    }
  }

  // ── Apply Reroute ─────────────────────────────────────────────────────────
  const handleReroute = async () => {
    if (!alertDocId) return
    setRerouting(true)
    try {
      // 1. Mark alert as rerouted
      await updateDoc(doc(db, 'alerts', alertDocId), {
        status:    'rerouted',
        updatedAt: new Date().toISOString(),
      })

      // 2. Update the linked route (best-effort)
      if (alert?.routeId) {
        try {
          const routeRef  = doc(db, 'routes', alert.routeId)
          const routeSnap = await getDoc(routeRef)
          if (routeSnap.exists()) {
            await updateDoc(routeRef, {
              status:    'REROUTED',
              riskScore: alert.severityScore ?? 0,
              updatedAt: new Date().toISOString(),
            })
          } else {
            const byField = await getDocs(
              query(collection(db, 'routes'), where('id', '==', alert.routeId), limit(1))
            )
            if (!byField.empty) {
              await updateDoc(byField.docs[0].ref, {
                status:    'REROUTED',
                riskScore: alert.severityScore ?? 0,
                updatedAt: new Date().toISOString(),
              })
            }
          }
        } catch (routeErr) {
          console.warn('Route update skipped:', routeErr.message)
        }
      }

      // 3. Show success modal instead of navigating immediately
      setRerouteModal(true)
    } catch (err) {
      console.error(err)
      showToast('Failed to apply reroute. Please try again.', 'error')
    } finally {
      setRerouting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  const a           = alert ?? {}
  const icon        = TYPE_ICON[a.disruptionType] ?? 'warning'
  const severity    = a.severityScore ?? 85
  const pct         = Math.min(100, Math.max(0, severity))
  const arcRotation = 45 + (pct / 100) * 180

  return (
    <>
      <AppLayout>
        <div className="p-8 lg:p-12 space-y-12 max-w-7xl mx-auto w-full">

          {/* ── Loading skeleton ── */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4 text-white/40">
                <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                <p className="text-sm">Loading alert data…</p>
              </div>
            </div>
          )}

          {/* ── No alert found ── */}
          {!loading && !alert && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-white/40">
              <span className="material-symbols-outlined text-5xl">notifications_off</span>
              <p className="font-bold">No alerts found{routeIdParam ? ` for route ${routeIdParam}` : ''}.</p>
              <button onClick={() => navigate('/dashboard')} className="text-[#3fff8b] text-sm font-bold hover:underline">
                → Back to Dashboard
              </button>
            </div>
          )}

          {/* ── Alert detail ── */}
          {!loading && alert && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b92902]/20 text-[#d53d18] text-xs font-bold tracking-widest uppercase">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    {a.disruptionType ?? 'Active Alert'} · Severity {severity}/100
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Alert: <span className="text-[#ff7351]">{a.alertTitle ?? 'Disruption Detected'}</span>
                  </h1>
                  {a.origin && a.destination && (
                    <p className="text-white/40 text-sm">{a.origin} → {a.destination}</p>
                  )}
                  {a.status && a.status !== 'active' && (
                    <span className={`inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                      a.status === 'rerouted'  ? 'bg-[#3fff8b]/10 text-[#3fff8b]' :
                      a.status === 'dismissed' ? 'bg-gray-800 text-gray-400' : ''
                    }`}>
                      {a.status}
                    </span>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    id="dismiss-alert-btn"
                    onClick={handleDismiss}
                    disabled={dismissing || rerouting || a.status === 'dismissed'}
                    className="px-6 py-3 rounded-lg border border-[#3fff8b]/30 text-[#3fff8b] font-bold hover:bg-[#3fff8b]/5 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {dismissing
                      ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Dismissing…</>
                      : 'DISMISS'}
                  </button>
                  <button
                    id="apply-reroute-btn"
                    onClick={handleReroute}
                    disabled={dismissing || rerouting || a.status === 'rerouted'}
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#3fff8b] to-[#13ea79] text-[#005d2c] font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_4px_20px_rgba(63,255,139,0.3)] transition-all"
                  >
                    {rerouting
                      ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Applying…</>
                      : 'APPLY REROUTE'}
                  </button>
                </div>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left col: disruption type + severity */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-[#131313] p-8 rounded-xl border border-[#262626]/40 flex flex-col items-center text-center space-y-4">
                    <span className="material-symbols-outlined text-6xl text-[#3fff8b]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {icon}
                    </span>
                    <p className="text-[#adaaaa] text-xs uppercase tracking-[0.2em] font-medium">Disruption Type</p>
                    <h3 className="text-3xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {(a.disruptionType ?? 'UNKNOWN').toUpperCase()}
                    </h3>
                  </div>

                  <div className="bg-[#131313] p-8 rounded-xl border border-[#262626]/40 space-y-6">
                    <p className="text-[#adaaaa] text-xs uppercase tracking-[0.2em] font-medium text-center">Severity Score</p>
                    <div className="relative flex items-center justify-center">
                      <div className="w-48 h-24 overflow-hidden relative">
                        <div className="w-48 h-48 rounded-full border-[12px] border-[#262626]" />
                        <div
                          className="absolute top-0 w-48 h-48 rounded-full border-[12px] border-[#3fff8b] border-b-transparent border-r-transparent"
                          style={{ transform: `rotate(${arcRotation}deg)` }}
                        />
                      </div>
                      <div className="absolute bottom-0 text-center">
                        <span className="text-4xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {severity}<span className="text-lg text-[#adaaaa]">/100</span>
                        </span>
                        <p className={`font-bold text-sm ${severity >= 70 ? 'text-[#ff7351]' : severity >= 40 ? 'text-yellow-400' : 'text-[#3fff8b]'}`}>
                          {severity >= 70 ? 'CRITICAL' : severity >= 40 ? 'MODERATE' : 'LOW'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right col */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  <div className="bg-[#131313] p-8 rounded-xl border border-[#262626]/40 relative overflow-hidden flex-1">
                    <div className="absolute top-0 right-0 p-4">
                      <span className="px-3 py-1 bg-[#3fff8b]/10 text-[#3fff8b] text-[10px] font-bold rounded-full border border-[#3fff8b]/20">
                        AI ANALYSIS
                      </span>
                    </div>
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <span className="material-symbols-outlined text-[#3fff8b]">psychology</span>
                      AI Explanation
                    </h4>
                    <p className="text-[#adaaaa] text-lg leading-relaxed">
                      {a.explanation ?? 'No explanation available.'}
                    </p>
                  </div>

                  <div className="bg-[#1a1919] p-6 rounded-xl border-l-4 border-[#3fff8b] flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-1">
                      <p className="text-[#3fff8b] text-xs font-bold uppercase tracking-widest">Recommended Alternative</p>
                      <h3 className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {a.recommendedRoute ?? 'No alternative suggested'}
                      </h3>
                    </div>
                    <div className="flex gap-12">
                      <div>
                        <p className="text-[#adaaaa] text-[10px] uppercase font-bold">ETA Difference</p>
                        <p className="text-[#3fff8b] text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {a.etaDifference ?? '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#adaaaa] text-[10px] uppercase font-bold">Current Delay</p>
                        <p className="text-[#ff7351] text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {a.currentDelay ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map strip */}
                <div className="lg:col-span-12 h-[400px] bg-[#131313] rounded-xl border border-[#262626]/40 overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center p-12">
                    <svg className="w-full h-full" viewBox="0 0 800 400">
                      <path d="M50 350 Q 200 300, 400 200 T 750 50" fill="none" opacity="0.5" stroke="#3fff8b" strokeDasharray="8 4" strokeWidth="4"/>
                      <path d="M50 350 Q 300 380, 550 250 T 750 50" fill="none" stroke="#3fff8b" strokeWidth="4"/>
                      <circle cx="400" cy="200" r="12" fill="#ff7351">
                        <animate attributeName="r" dur="2s" repeatCount="indefinite" values="8;16;8"/>
                      </circle>
                      <text fill="#ff7351" fontFamily="Manrope" fontSize="14" fontWeight="bold" x="420" y="205">
                        {a.disruptionType?.toUpperCase() ?? 'DISRUPTION POINT'}
                      </text>
                    </svg>
                  </div>
                  <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur p-4 rounded-lg border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#3fff8b]/50 border border-[#3fff8b]" />
                        <span className="text-xs text-[#adaaaa]">Proposed Path</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff7351] animate-pulse" />
                        <span className="text-xs text-[#adaaaa]">Disruption Point</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </AppLayout>

      {/* Reroute success modal */}
      {rerouteModal && alert && (
        <RerouteSuccessModal
          alert={alert}
          onGoToDashboard={() => navigate('/dashboard')}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  )
}
