import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { analyzeRoute } from '../lib/disruption'

function generateRouteId() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `#RW-${num}`
}

// Loading phase labels shown during the two-step process
const PHASES = [
  { icon: 'cloud',       text: 'Fetching weather & disaster data…' },
  { icon: 'psychology',  text: 'Analyzing route with Gemini AI…'   },
  { icon: 'check_circle',text: 'Route created successfully!'        },
]

export default function NewRouteModal({ open, onClose, onRouteCreated }) {
  const [origin,      setOrigin]      = useState('')
  const [destination, setDestination] = useState('')
  const [routeId,     setRouteId]     = useState('')
  const [phase,       setPhase]       = useState(0)   // 0 = idle, 1 = saving, 2 = analyzing, 3 = done
  const [error,       setError]       = useState('')
  const [deferred,    setDeferred]    = useState(false) // true when Gemini quota hit
  const overlayRef = useRef(null)

  const loading = phase > 0 && phase < 3

  useEffect(() => {
    if (open) {
      setRouteId(generateRouteId())
      setOrigin('')
      setDestination('')
      setError('')
      setPhase(0)
      setDeferred(false)
    }
  }, [open])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose, loading])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current && !loading) onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!origin.trim() || !destination.trim()) {
      setError('Please fill in both Origin and Destination.')
      return
    }
    setError('')

    let firestoreId = null
    let riskScore   = 0

    // ── Phase 1: Save route to Firestore ──
    setPhase(1)
    try {
      const newRoute = {
        id:          routeId,
        origin:      origin.trim(),
        originSub:   '',
        dest:        destination.trim(),
        destSub:     '',
        status:      'On-Time',
        risk:        0,
        createdAt:   serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, 'routes'), newRoute)
      firestoreId  = docRef.id
    } catch (err) {
      console.error(err)
      setError('Failed to save route. Please try again.')
      setPhase(0)
      return
    }

    // ── Phase 2: Run AI disruption analysis ──
    setPhase(2)
    try {
      const { result, needsAnalysis } = await analyzeRoute(routeId, origin.trim(), destination.trim())

      if (needsAnalysis) {
        // Gemini quota exhausted — flag the route for a later retry
        setDeferred(true)
        await updateDoc(doc(db, 'routes', firestoreId), { needsAnalysis: true })
      } else {
        riskScore = result.severityScore ?? 0
        await updateDoc(doc(db, 'routes', firestoreId), {
          risk:   riskScore,
          status: result.disruptionDetected ? 'Disrupted' : 'On-Time',
        })
      }
    } catch (err) {
      // Non-fatal: analysis failed but route was saved
      console.warn('Disruption analysis failed (route still saved):', err)
    }

    // ── Phase 3: Done ──
    setPhase(3)
    onRouteCreated?.({
      id:          routeId,
      firestoreId,
      origin:      origin.trim(),
      dest:        destination.trim(),
      risk:        riskScore,
    })

    // Brief success flash before closing
    setTimeout(() => { onClose(); setPhase(0) }, 1200)
  }

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.15s ease' }}
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-[#131313] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.2s ease' }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#262626]/60 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              New <span className="text-[#3fff8b] italic">Route</span>
            </h2>
            <p className="text-xs text-white/40 mt-1">Define origin, destination, and a unique route ID.</p>
          </div>
          <button
            onClick={() => { if (!loading) onClose() }}
            className="text-white/30 hover:text-white transition-colors mt-1 disabled:opacity-30"
            disabled={loading}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Loading overlay (phases 1 & 2) */}
        {loading && (
          <div className="px-8 py-10 flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[#3fff8b]/20 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-3xl text-[#3fff8b] animate-spin"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  progress_activity
                </span>
              </div>
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border border-[#3fff8b]/10 animate-ping" />
            </div>
            <div>
              <p className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {PHASES[phase - 1]?.text}
              </p>
              <p className="text-white/30 text-xs">This may take a few seconds…</p>
            </div>
            {/* Step progress dots */}
            <div className="flex gap-2">
              {[1, 2].map(p => (
                <div
                  key={p}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    phase >= p ? 'w-6 bg-[#3fff8b]' : 'w-2 bg-[#262626]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Success flash (phase 3) */}
        {phase === 3 && (
          <div className="px-8 py-10 flex flex-col items-center gap-4 text-center">
            <span
              className={`material-symbols-outlined text-5xl ${deferred ? 'text-yellow-400' : 'text-[#3fff8b]'}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {deferred ? 'schedule' : 'check_circle'}
            </span>
            <div>
              <p className="text-white font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Route Created!</p>
              <p className="text-white/40 text-xs mt-1">
                {deferred
                  ? 'Route saved. AI analysis will run shortly.'
                  : 'AI analysis complete. Check the Alerts page.'}
              </p>
            </div>
          </div>
        )}

        {/* Form (phase 0 only) */}
        {phase === 0 && (
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            {/* Route ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Route ID</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={routeId}
                  className="flex-1 bg-[#0e0e0e] border border-[#262626] rounded-lg px-4 py-2.5 text-sm font-black text-[#3fff8b] tracking-wider outline-none cursor-not-allowed"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
                <button
                  type="button"
                  onClick={() => setRouteId(generateRouteId())}
                  title="Regenerate ID"
                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#262626] text-white/30 hover:text-[#3fff8b] hover:border-[#3fff8b]/30 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                </button>
              </div>
            </div>

            {/* Origin */}
            <div className="space-y-1.5">
              <label htmlFor="rw-origin" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Origin</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">location_on</span>
                <input
                  id="rw-origin"
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Singapore"
                  className="w-full bg-[#0e0e0e] border border-[#262626] focus:border-[#3fff8b]/50 focus:ring-1 focus:ring-[#3fff8b]/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <label htmlFor="rw-dest" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Destination</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">navigation</span>
                <input
                  id="rw-dest"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Rotterdam"
                  className="w-full bg-[#0e0e0e] border border-[#262626] focus:border-[#3fff8b]/50 focus:ring-1 focus:ring-[#3fff8b]/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-[#ff7351] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-[#262626] text-white/50 hover:text-white hover:bg-[#1a1919] transition-all text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#3fff8b] to-[#13ea79] text-[#005d2c] font-bold text-sm shadow-[0_4px_20px_rgb(63,255,139,0.2)] hover:shadow-[0_4px_30px_rgb(63,255,139,0.35)] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Create Route
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
