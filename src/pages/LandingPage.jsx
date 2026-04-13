import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth, provider, signInWithPopup, db } from '../lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function LandingPage() {
  const navigate    = useNavigate()
  const [loading,   setLoading]   = useState(false)
  const [authError, setAuthError] = useState('')

  // ── Demo Modal State ──
  const [demoOpen,    setDemoOpen]    = useState(false)
  const [demoForm,    setDemoForm]    = useState({ fullName: '', email: '', company: '', message: '' })
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoSuccess, setDemoSuccess] = useState(false)
  const [demoError,   setDemoError]   = useState('')

  // ── Active Nav Section ──
  const [activeSection, setActiveSection] = useState('')
  const observerRef = useRef(null)

  useEffect(() => {
    const sections = ['features', 'solutions']
    const elements = sections.map(id => document.getElementById(id)).filter(Boolean)

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the entry with the largest intersection ratio that is intersecting
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      { threshold: [0.2, 0.5], rootMargin: '-80px 0px 0px 0px' }
    )

    elements.forEach(el => observerRef.current.observe(el))

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [])

  const scrollToSection = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }

  const navLinkClass = (id) =>
    id === activeSection
      ? 'uppercase tracking-wider text-sm font-bold text-[#3fff8b] border-b-2 border-[#3fff8b] pb-1 transition-all duration-300'
      : 'uppercase tracking-wider text-sm font-bold text-gray-400 hover:text-[#3fff8b] transition-all duration-300 pb-1 border-b-2 border-transparent'

  const openDemo  = () => { setDemoOpen(true); setDemoSuccess(false); setDemoError(''); setDemoForm({ fullName: '', email: '', company: '', message: '' }) }
  const closeDemo = () => { setDemoOpen(false) }

  const handleDemoChange = (e) => {
    setDemoForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleDemoSubmit = async (e) => {
    e.preventDefault()
    setDemoLoading(true)
    setDemoError('')
    try {
      await addDoc(collection(db, 'demo_requests'), {
        fullName:  demoForm.fullName.trim(),
        email:     demoForm.email.trim(),
        company:   demoForm.company.trim(),
        message:   demoForm.message.trim(),
        timestamp: serverTimestamp(),
      })
      setDemoSuccess(true)
    } catch (err) {
      console.error(err)
      setDemoError('Something went wrong. Please try again.')
    } finally {
      setDemoLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setAuthError('')
    try {
      await signInWithPopup(auth, provider)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled. Please try again.')
      } else {
        setAuthError('Sign-in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="antialiased overflow-x-hidden bg-[#0e0e0e] text-white">
      {/* ── Top Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0e0e0e]/60 backdrop-blur-xl bg-gradient-to-b from-[#1a1919] to-transparent shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-black tracking-tighter text-[#3fff8b]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            RouteWatch
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a
              className={navLinkClass('features')}
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Features
            </a>
            <a
              className={navLinkClass('solutions')}
              href="#solutions"
              onClick={(e) => scrollToSection(e, 'solutions')}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Solutions
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="uppercase tracking-wider text-sm font-bold text-gray-400 hover:text-[#3fff8b] transition-colors duration-300 disabled:opacity-50"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Login
            </button>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="bg-gradient-to-r from-[#3fff8b] to-[#13ea79] text-[#005d2c] px-6 py-2 rounded-lg font-bold uppercase tracking-wide text-xs active:scale-90 transition-all disabled:opacity-60"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main>
        {/* ── Hero ── */}
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
          <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-[#3fff8b]/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-0 -left-1/4 w-[400px] h-[400px] bg-[#84ecff]/5 blur-[120px] rounded-full" />
          <div className="max-w-7xl mx-auto px-8 w-full grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#3fff8b]/10 text-[#3fff8b] rounded-full mb-6 border border-[#3fff8b]/20">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>electric_bolt</span>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>Live Signal Active</span>
              </div>
              <h1 className="font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tighter leading-[0.9] mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Know before <br />it <span className="text-[#3fff8b] italic">breaks.</span>
              </h1>
              <p className="text-[#adaaaa] text-lg md:text-xl max-w-xl mb-12 leading-relaxed">
                Eliminate supply chain blind spots with real-time kinetic monitoring. Predict disruptions, reroute shipments instantly, and stay ahead of the global void.
              </p>

              {/* Error message */}
              {authError && (
                <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-[#ff7351]/10 border border-[#ff7351]/30 text-[#ff7351] text-sm">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {authError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="bg-white text-black hover:bg-gray-100 px-8 py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 font-bold disabled:opacity-70 disabled:cursor-not-allowed min-w-[220px]"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      Signing in…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>account_circle</span>
                      Sign-in with Google
                    </>
                  )}
                </button>
                <button
                  id="request-demo-btn"
                  onClick={openDemo}
                  className="border border-[#3fff8b]/30 hover:bg-[#3fff8b]/10 px-8 py-4 rounded-xl font-bold transition-all active:scale-95 text-[#3fff8b]"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Request Demo
                </button>
              </div>
            </div>
            <div className="lg:col-span-5 relative hidden lg:block">
              <div className="relative z-10 glass-panel p-4 rounded-3xl border border-[#494847]/20 shadow-2xl">
                <div className="rounded-2xl w-full h-64 bg-[#131313] flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#3fff8b]/5 to-transparent" />
                  <svg className="w-full h-full opacity-40" viewBox="0 0 400 250">
                    <path d="M20,200 Q120,80 200,120 T380,40" fill="none" stroke="#3fff8b" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(63,255,139,0.8)]"/>
                    <path d="M20,220 Q150,160 280,180 T380,130" fill="none" stroke="#3fff8b" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5"/>
                  </svg>
                </div>
                <div className="absolute -top-6 -left-6 bg-[#262626] p-4 rounded-2xl border border-[#3fff8b]/30 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#3fff8b] rounded-full animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-tighter" style={{ fontFamily: 'Manrope, sans-serif' }}>Live: Optimizing</span>
                  </div>
                </div>
                <div className="absolute -bottom-8 -right-8 bg-[#201f1f] p-6 rounded-2xl border border-[#494847]/20 shadow-2xl max-w-[200px]">
                  <div className="text-[#3fff8b] text-3xl font-black mb-1">98.4%</div>
                  <div className="text-[10px] text-[#adaaaa] uppercase font-bold tracking-widest">Route Efficiency</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-32 relative max-w-7xl mx-auto px-8">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Precision Intelligence</h2>
            <div className="w-20 h-1 bg-[#3fff8b]" />
          </div>
          <div className="grid md:grid-cols-12 gap-6">
            {/* Feature 1 */}
            <div className="md:col-span-8 bg-[#131313] p-10 rounded-3xl group hover:bg-[#1a1919] transition-colors duration-500 overflow-hidden relative">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-[#3fff8b]/10 flex items-center justify-center rounded-2xl mb-8 text-[#3fff8b] group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Live Disruption Alerts</h3>
                  <p className="text-[#adaaaa] text-lg max-w-md">Instant notifications when something goes wrong. Our kinetic sensors detect bottlenecks 4 hours before they manifest in standard telemetry.</p>
                </div>
                <Link to="/alerts" className="mt-12 flex items-center gap-4 text-[#3fff8b] font-bold text-sm uppercase tracking-widest cursor-pointer" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Explore Signal Logic
                  <span className="material-symbols-outlined">arrow_right_alt</span>
                </Link>
              </div>
            </div>
            {/* Feature 2 */}
            <div className="md:col-span-4 bg-[#131313] p-10 rounded-3xl group hover:bg-[#1a1919] transition-all">
              <div className="w-14 h-14 bg-[#84ecff]/10 flex items-center justify-center rounded-2xl mb-8 text-[#84ecff]">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>AI Reroute Suggestions</h3>
              <p className="text-[#adaaaa] text-base leading-relaxed">Intelligent pathing to avoid delays. Our neural network processes millions of route combinations.</p>
            </div>
            {/* Feature 3 */}
            <div className="md:col-span-4 bg-[#131313] p-10 rounded-3xl group hover:bg-[#1a1919] transition-all">
              <div className="w-14 h-14 bg-[#3fff8b]/10 flex items-center justify-center rounded-2xl mb-8 text-[#3fff8b]">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Real-time Route Monitoring</h3>
              <p className="text-[#adaaaa] text-base leading-relaxed">Continuous visibility across all shipments with granular precision tracking.</p>
            </div>
            {/* Decorative */}
            <div className="md:col-span-8 bg-gradient-to-br from-[#201f1f] to-[#000000] p-10 rounded-3xl relative overflow-hidden flex items-center justify-center min-h-[300px]">
              <div className="relative z-10 text-center">
                <div className="text-3xl font-black mb-2 italic" style={{ fontFamily: 'Manrope, sans-serif' }}>99.9% UP-TIME</div>
                <div className="text-[#adaaaa] text-xs uppercase tracking-[0.4em] font-bold">Global Infrastructure Reliability</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Solutions ── */}
        <section id="solutions" className="py-32 bg-[#080808] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#3fff8b]/3 blur-[200px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-8 relative z-10">

            {/* Header */}
            <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#3fff8b]/10 text-[#3fff8b] rounded-full mb-6 border border-[#3fff8b]/20">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>Built for Every Chain</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Solutions for <br /><span className="text-[#3fff8b]">every operation.</span>
                </h2>
              </div>
              <p className="text-[#adaaaa] text-lg max-w-sm leading-relaxed">
                RouteWatch adapts to your industry — delivering precision intelligence where disruptions cost the most.
              </p>
            </div>

            {/* Solution Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">

              {/* Card 1 — Freight & Logistics */}
              <div className="group relative bg-[#131313] rounded-3xl p-8 border border-[#494847]/20 hover:border-[#3fff8b]/30 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#3fff8b]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-[#3fff8b]/10 flex items-center justify-center rounded-2xl mb-8 text-[#3fff8b] group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Freight &amp; Logistics</h3>
                  <p className="text-[#adaaaa] text-sm leading-relaxed mb-8">
                    Track every shipment across road, air, and sea in real time. Automated rerouting eliminates dwell time and slashes fuel costs through dynamic path optimisation.
                  </p>
                  <ul className="space-y-3 mb-10">
                    {['Multi-modal shipment visibility', 'Carrier SLA breach alerts', 'Dynamic ETD recalculation'].map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm text-[#adaaaa]">
                        <span className="w-5 h-5 rounded-full bg-[#3fff8b]/15 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[#3fff8b]" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>check</span>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-[#3fff8b] text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Explore Solution
                    <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                  </div>
                </div>
              </div>

              {/* Card 2 — Port & Terminal Ops (highlighted) */}
              <div className="group relative bg-gradient-to-b from-[#1a2e1e] to-[#131313] rounded-3xl p-8 border border-[#3fff8b]/30 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#3fff8b]/15 blur-[80px] -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute top-5 right-5 bg-[#3fff8b] text-[#003d1d] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Most Popular
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-[#3fff8b]/20 flex items-center justify-center rounded-2xl mb-8 text-[#3fff8b] group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>anchor</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Port &amp; Terminal Ops</h3>
                  <p className="text-[#adaaaa] text-sm leading-relaxed mb-8">
                    Eliminate vessel queue buildup and berth conflicts. Our digital twin engine mirrors your terminal in real time — scheduling gate slots before congestion forms.
                  </p>
                  <ul className="space-y-3 mb-10">
                    {['Berth window forecasting', 'Container dwell minimisation', 'Port congestion heat-maps'].map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm text-[#adaaaa]">
                        <span className="w-5 h-5 rounded-full bg-[#3fff8b]/20 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[#3fff8b]" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>check</span>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-[#3fff8b] text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Explore Solution
                    <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                  </div>
                </div>
              </div>

              {/* Card 3 — Cold Chain */}
              <div className="group relative bg-[#131313] rounded-3xl p-8 border border-[#494847]/20 hover:border-[#84ecff]/30 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#84ecff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-[#84ecff]/10 flex items-center justify-center rounded-2xl mb-8 text-[#84ecff] group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>ac_unit</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Cold Chain Integrity</h3>
                  <p className="text-[#adaaaa] text-sm leading-relaxed mb-8">
                    Pharmaceutical and perishables demand zero compromise. Continuous temperature telemetry with instant excursion alerts keeps your cargo compliant end-to-end.
                  </p>
                  <ul className="space-y-3 mb-10">
                    {['IoT temp & humidity streams', 'GDP compliance reporting', 'Excursion impact scoring'].map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm text-[#adaaaa]">
                        <span className="w-5 h-5 rounded-full bg-[#84ecff]/15 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[#84ecff]" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>check</span>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-[#84ecff] text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Explore Solution
                    <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Banner */}
            <div className="bg-[#131313] rounded-3xl p-10 border border-[#494847]/20 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-wrap gap-10">
                {[
                  { icon: 'inventory_2',   label: 'eCommerce & Retail',    color: '#3fff8b' },
                  { icon: 'precision_manufacturing', label: 'Automotive Manufacturing', color: '#84ecff' },
                  { icon: 'vaccines',      label: 'Pharma & Healthcare',   color: '#ff7351' },
                  { icon: 'agriculture',   label: 'Agri & Food Systems',   color: '#3fff8b' },
                ].map(({ icon, label, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="material-symbols-outlined" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    <span className="text-sm font-bold text-[#adaaaa] uppercase tracking-wider" style={{ fontFamily: 'Manrope, sans-serif' }}>{label}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/industries"
                className="flex-shrink-0 inline-flex items-center gap-2 border border-[#3fff8b]/40 text-[#3fff8b] px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#3fff8b]/10 transition-all"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                View All Industries
                <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
              </Link>
            </div>

          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-24 bg-[#000000]">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { val: '2.4M',  label: 'Shipments Tracked'  },
              { val: '$140M', label: 'Revenue Recovered'  },
              { val: '12ms',  label: 'Alert Latency'      },
              { val: '450+',  label: 'Global Portals'     },
            ].map(({ val, label }) => (
              <div key={label} className="text-center md:text-left">
                <div className="text-[#3fff8b] text-4xl font-extrabold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{val}</div>
                <div className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-32">
          <div className="max-w-5xl mx-auto px-8">
            <div className="bg-[#201f1f] rounded-[3rem] p-12 md:p-20 relative overflow-hidden border border-[#3fff8b]/10 text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3fff8b]/20 blur-[100px] -mr-32 -mt-32" />
              <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-8 max-w-2xl mx-auto" style={{ fontFamily: 'Manrope, sans-serif' }}>Ready to secure the void?</h2>
                <p className="text-[#adaaaa] text-xl mb-12 max-w-xl mx-auto">Join the world's most resilient supply chains and never miss a beat again.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="bg-[#3fff8b] text-[#005d2c] px-10 py-5 rounded-xl font-black uppercase tracking-wide text-sm hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(63,255,139,0.3)] disabled:opacity-60"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    Get Access Now
                  </button>
                  <button className="text-white border border-[#777575] px-10 py-5 rounded-xl font-bold uppercase tracking-wide text-sm hover:bg-white/5 transition-all" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Contact Sales
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#000000] w-full py-12 px-8 border-t border-[#3fff8b]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {[
              { title: 'Company',   links: ['About Us', 'Careers', 'Partners'] },
              { title: 'Product',   links: ['Monitoring', 'AI Alerts', 'Integrations'] },
              { title: 'Resources', links: ['Documentation', 'API Status', 'Knowledge Base'] },
              { title: 'Legal',     links: ['Privacy Policy', 'Terms of Service', 'Security'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div className="text-[#3fff8b] font-bold mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</div>
                <ul className="space-y-4">
                  {links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-sm text-gray-500 hover:text-[#3fff8b] transition-colors duration-200">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-[#494847]/10 pt-8">
            <div className="text-[#3fff8b] font-bold text-xl mb-4 md:mb-0" style={{ fontFamily: 'Manrope, sans-serif' }}>RouteWatch</div>
            <div className="text-sm text-gray-500">© 2024 RouteWatch Kinetic Systems. All rights reserved.</div>
            <div className="flex gap-6 mt-4 md:mt-0 opacity-60 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined cursor-pointer hover:text-[#3fff8b] transition-colors">public</span>
              <span className="material-symbols-outlined cursor-pointer hover:text-[#3fff8b] transition-colors">terminal</span>
              <span className="material-symbols-outlined cursor-pointer hover:text-[#3fff8b] transition-colors">database</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Demo Request Modal ── */}
      {demoOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDemo() }}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-[#3fff8b]/20 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #1a1919 0%, #131313 100%)',
              boxShadow: '0 0 80px rgba(63,255,139,0.08)',
            }}
          >
            {/* Close button */}
            <button
              id="demo-modal-close"
              onClick={closeDemo}
              className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-[#262626] hover:bg-[#333] text-gray-400 hover:text-white transition-all"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="p-8 md:p-10">
              {/* Header */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#3fff8b]/10 text-[#3fff8b] rounded-full mb-4 border border-[#3fff8b]/20">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>schedule_send</span>
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: 'Manrope, sans-serif' }}>Quick Response</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Request a Demo</h2>
                <p className="text-[#adaaaa] text-sm mt-2">Fill in your details and we'll set up a personalized walkthrough.</p>
              </div>

              {demoSuccess ? (
                /* Success state */
                <div className="flex flex-col items-center text-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#3fff8b]/15 flex items-center justify-center border border-[#3fff8b]/30">
                    <span className="material-symbols-outlined text-[#3fff8b] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <p className="text-white text-lg font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Thanks! We'll reach out soon.</p>
                  <p className="text-[#adaaaa] text-sm">Keep an eye on your inbox — our team will be in touch within 24 hours.</p>
                  <button
                    onClick={closeDemo}
                    className="mt-4 px-8 py-3 rounded-xl bg-[#3fff8b] text-[#005d2c] font-bold uppercase tracking-wide text-sm hover:opacity-90 transition-all"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleDemoSubmit} className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#adaaaa] mb-2" htmlFor="demo-fullName">Full Name</label>
                    <input
                      id="demo-fullName"
                      name="fullName"
                      type="text"
                      required
                      value={demoForm.fullName}
                      onChange={handleDemoChange}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-3 rounded-xl bg-[#0e0e0e] border border-[#494847]/40 text-white placeholder-[#555] focus:outline-none focus:border-[#3fff8b]/60 focus:ring-1 focus:ring-[#3fff8b]/30 transition-all text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#adaaaa] mb-2" htmlFor="demo-email">Email</label>
                    <input
                      id="demo-email"
                      name="email"
                      type="email"
                      required
                      value={demoForm.email}
                      onChange={handleDemoChange}
                      placeholder="jane@company.com"
                      className="w-full px-4 py-3 rounded-xl bg-[#0e0e0e] border border-[#494847]/40 text-white placeholder-[#555] focus:outline-none focus:border-[#3fff8b]/60 focus:ring-1 focus:ring-[#3fff8b]/30 transition-all text-sm"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#adaaaa] mb-2" htmlFor="demo-company">Company / Organization</label>
                    <input
                      id="demo-company"
                      name="company"
                      type="text"
                      required
                      value={demoForm.company}
                      onChange={handleDemoChange}
                      placeholder="Acme Logistics Corp"
                      className="w-full px-4 py-3 rounded-xl bg-[#0e0e0e] border border-[#494847]/40 text-white placeholder-[#555] focus:outline-none focus:border-[#3fff8b]/60 focus:ring-1 focus:ring-[#3fff8b]/30 transition-all text-sm"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#adaaaa] mb-2" htmlFor="demo-message">Tell us about your use case</label>
                    <textarea
                      id="demo-message"
                      name="message"
                      rows={4}
                      value={demoForm.message}
                      onChange={handleDemoChange}
                      placeholder="We manage 500+ shipments across Southeast Asia and need real-time disruption alerts..."
                      className="w-full px-4 py-3 rounded-xl bg-[#0e0e0e] border border-[#494847]/40 text-white placeholder-[#555] focus:outline-none focus:border-[#3fff8b]/60 focus:ring-1 focus:ring-[#3fff8b]/30 transition-all text-sm resize-none"
                    />
                  </div>

                  {/* Error */}
                  {demoError && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#ff7351]/10 border border-[#ff7351]/30 text-[#ff7351] text-sm">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {demoError}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    id="demo-submit-btn"
                    type="submit"
                    disabled={demoLoading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#3fff8b] to-[#13ea79] text-[#005d2c] font-black uppercase tracking-wide text-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_0_30px_rgba(63,255,139,0.2)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {demoLoading ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        Sending…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                        Submit Request
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
