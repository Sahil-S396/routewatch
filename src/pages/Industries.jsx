import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const industries = [
  {
    id: 'ecommerce',
    label: 'eCommerce & Retail',
    icon: 'inventory_2',
    accentColor: '#3fff8b',
    accentBg: 'rgba(63,255,139,0.08)',
    accentBorder: 'rgba(63,255,139,0.25)',
    heroStat: { value: '38%', desc: 'Reduction in last-mile delays' },
    tagline: 'Deliver on every promise, every time.',
    overview:
      'In the age of same-day expectations, a single delay can cost you a customer forever. RouteWatch gives eCommerce and retail operators end-to-end kinetic visibility across fulfilment centres, last-mile carriers, and cross-border corridors — so your brand promise never bends under supply chain pressure.',
    challenges: [
      { icon: 'schedule', title: 'Peak Season Volatility', desc: 'Holiday and promotional surges overwhelm carrier networks. RouteWatch predicts capacity crunches days in advance, allowing dynamic load-balancing across alternate carriers before delays cascade.' },
      { icon: 'inventory', title: 'Inventory Position Sync', desc: 'Stock mismatches between warehouse and storefront cost revenue. Real-time shipment ETAs feed directly into inventory forecasting, keeping your stock levels truthful.' },
      { icon: 'local_shipping', title: 'Last-Mile Blind Spots', desc: 'Most visibility tools drop off at the last carrier handoff. Our IoT integrations extend tracking all the way to the doorstep, giving customers accurate live windows.' },
      { icon: 'currency_exchange', title: 'Returns Logistics Costs', desc: 'Reverse logistics is often an afterthought. RouteWatch maps return corridors with the same precision as outbound lanes, cutting average return transit time by 24%.' },
    ],
    capabilities: [
      'Real-time carrier SLA breach alerts with auto-escalation',
      'Predictive ETD recalculation using weather & traffic fusion',
      'Multi-carrier last-mile visibility via unified API',
      'Demand-signal integration for shipment prioritisation',
      'Returns routing optimisation and warehouse slot coordination',
      'Customer notification triggers for proactive delay comms',
    ],
    metrics: [
      { val: '38%', label: 'Drop in last-mile delays' },
      { val: '2.1×', label: 'Faster exception resolution' },
      { val: '91%', label: 'On-time delivery rate' },
      { val: '$4.2M', label: 'Avg annual saving per node' },
    ],
    caseStudy: {
      company: 'A regional multi-brand retailer',
      result: 'reduced customer-facing delay notifications by 61% within 3 months by integrating RouteWatch disruption alerts into their order management system.',
    },
  },
  {
    id: 'automotive',
    label: 'Automotive Manufacturing',
    icon: 'precision_manufacturing',
    accentColor: '#84ecff',
    accentBg: 'rgba(132,236,255,0.08)',
    accentBorder: 'rgba(132,236,255,0.25)',
    heroStat: { value: '99.1%', desc: 'JIT line-feed accuracy' },
    tagline: 'Zero tolerance for production stoppages.',
    overview:
      'Automotive assembly lines operate on just-in-time principles where a single missing component can halt an entire plant. RouteWatch provides tier-1 and tier-2 suppliers with real-time component tracking across global inbound networks, ensuring production schedules remain unbreakable even through port strikes, customs holds, and weather disruptions.',
    challenges: [
      { icon: 'factory', title: 'JIT Component Sequencing', desc: 'Assembly lines demand parts in the exact sequence and at the exact minute. RouteWatch synchronises inbound logistics with production calendars, triggering alerts 8+ hours before any sequence is at risk.' },
      { icon: 'public', title: 'Multi-Tier Supplier Exposure', desc: 'Tier-3 supplier disruptions are invisible until they become tier-1 crises. RouteWatch maps your full upstream graph and monitors risk signals at every node.' },
      { icon: 'gavel', title: 'Customs & Trade Compliance', desc: 'Cross-border automotive shipments face complex tariff and document requirements. Automated compliance checks flag issues before goods arrive at the border.' },
      { icon: 'build', title: 'Tooling & Machinery Transit', desc: 'Specialised equipment moves between plants for maintenance cycles. High-value, time-critical tooling freight gets dedicated monitoring profiles with escalation trees.' },
    ],
    capabilities: [
      'Production-calendar-aware inbound shipment monitoring',
      'Tier-2 and tier-3 supplier risk visibility via partner feeds',
      'Border crossing delay prediction with customs intelligence',
      'Component sequencing alert engine with 8-hour lead window',
      'E-Kanban integration for automated replenishment triggers',
      'Plant shutdown risk scoring updated every 15 minutes',
    ],
    metrics: [
      { val: '99.1%', label: 'JIT line-feed accuracy' },
      { val: '8 hrs', label: 'Avg disruption lead time' },
      { val: '72%', label: 'Reduction in line stoppages' },
      { val: '$18M', label: 'Avg stoppage cost avoided / yr' },
    ],
    caseStudy: {
      company: 'A Tier-1 automotive components supplier',
      result: 'eliminated 94% of unplanned line stoppages at their European assembly partner by deploying RouteWatch JIT monitoring across 6 inbound lanes.',
    },
  },
  {
    id: 'pharma',
    label: 'Pharma & Healthcare',
    icon: 'vaccines',
    accentColor: '#ff7351',
    accentBg: 'rgba(255,115,81,0.08)',
    accentBorder: 'rgba(255,115,81,0.25)',
    heroStat: { value: '100%', desc: 'Cold chain compliance rate' },
    tagline: 'Where every degree and every minute counts.',
    overview:
      'Pharmaceutical and healthcare logistics demand absolute certainty. Temperature excursions, delayed clinical supplies, or broken GDP compliance can cost lives and millions in regulatory penalties. RouteWatch delivers continuous IoT telemetry, automated excursion alerts, and immutable audit trails — transforming your cold chain from a liability into a competitive advantage.',
    challenges: [
      { icon: 'thermostat', title: 'Temperature Excursion Risk', desc: 'A 20-minute breach can render a $500k vaccine batch unusable. RouteWatch streams sensor data every 30 seconds with predictive excursion modelling before thresholds are breached.' },
      { icon: 'assignment', title: 'GDP & GxP Compliance', desc: 'Regulatory bodies demand full chain-of-custody documentation. Every sensor reading, handler event, and route change is cryptographically logged and exportable as a compliance report.' },
      { icon: 'local_hospital', title: 'Clinical Trial Supply Chains', desc: 'Trial depots span continents with varying infrastructure quality. RouteWatch maps depot performance scores and pre-qualifies alternate facilities when primary sites fail.' },
      { icon: 'emergency', title: 'Emergency Medical Supplies', desc: 'Crisis response shipments need instant visibility and fastest-path routing. Priority tracking profiles activate automatically on emergency PO codes.' },
    ],
    capabilities: [
      '30-second IoT temperature & humidity telemetry',
      'Predictive excursion alerting before threshold breach',
      'GDP-compliant immutable audit trail with e-signature support',
      'Lane qualification scoring for new carrier/depot onboarding',
      'Clinical trial site supply status dashboard',
      'Emergency routing override with authority escalation',
    ],
    metrics: [
      { val: '100%', label: 'Cold chain compliance rate' },
      { val: '30s', label: 'Sensor data refresh interval' },
      { val: '0', label: 'Undetected excursions in 2024' },
      { val: '67%', label: 'Faster regulatory audit prep' },
    ],
    caseStudy: {
      company: 'A global vaccine distribution partner',
      result: 'achieved 100% GDP compliance across 42 cold chain lanes and cut regulatory audit preparation time from 3 weeks to 4 days using RouteWatch\'s immutable telemetry logs.',
    },
  },
  {
    id: 'agri',
    label: 'Agri & Food Systems',
    icon: 'agriculture',
    accentColor: '#3fff8b',
    accentBg: 'rgba(63,255,139,0.08)',
    accentBorder: 'rgba(63,255,139,0.25)',
    heroStat: { value: '44%', desc: 'Reduction in food waste en route' },
    tagline: 'Farm to fork without a single missed beat.',
    overview:
      'Agricultural produce is the most time-sensitive cargo on the planet. Harvest windows are fixed, consumers expect freshness guarantees, and spoilage waste is both a financial and sustainability crisis. RouteWatch combines real-time shipment tracking with produce-specific shelf-life modelling to ensure every pallet arrives at peak quality — and if it cannot, rerouting decisions are made in minutes not hours.',
    challenges: [
      { icon: 'eco', title: 'Harvest Seasonality & Peaks', desc: 'Produce moves in short, intense windows. Carrier availability and cold storage slots must be secured weeks ahead of harvest. RouteWatch\'s demand forecasting engine syncs with harvest calendars to pre-position capacity.' },
      { icon: 'water_drop', title: 'Moisture & Atmosphere Control', desc: 'Certain produce requires controlled atmosphere containers. RouteWatch monitors O₂/CO₂ ratios and humidity alongside temperature to maintain optimal ripening conditions.' },
      { icon: 'policy', title: 'Phytosanitary Compliance', desc: 'Cross-border fresh produce faces stringent inspection regimes. Automated document preparation and border intelligence reduce inspection delays that cause spoilage at crossings.' },
      { icon: 'restaurant', title: 'Restaurant & HORECA Demand Spikes', desc: 'Food service demand fluctuates with events and seasons. Dynamic rerouting ensures priority deliveries reach high-value restaurant clients first when supply is constrained.' },
    ],
    capabilities: [
      'Produce shelf-life modelling integrated with transit time data',
      'O₂/CO₂ and humidity monitoring for atmosphere-controlled cargo',
      'Harvest calendar sync for proactive capacity reservation',
      'Phytosanitary document automation and border intelligence',
      'dynamic spoilage risk scoring with reroute recommendations',
      'HORECA priority delivery orchestration engine',
    ],
    metrics: [
      { val: '44%', label: 'Reduction in transit spoilage' },
      { val: '3.2×', label: 'Faster border clearance' },
      { val: '18%', label: 'Improvement in shelf-life on arrival' },
      { val: '$2.8M', label: 'Avg spoilage saving per fleet' },
    ],
    caseStudy: {
      company: 'A large fresh produce exporter',
      result: 'cut cross-border spoilage losses by 44% and improved retailer acceptance rates from 81% to 97% after deploying RouteWatch across their reefer fleet.',
    },
  },
]

export default function Industries() {
  const [activeIndustry, setActiveIndustry] = useState(industries[0].id)

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Scrollspy
  useEffect(() => {
    const observers = []
    industries.forEach(({ id }) => {
      const el = document.getElementById(`industry-${id}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIndustry(id) },
        { threshold: 0.3, rootMargin: '-100px 0px -40% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  const scrollTo = (id) => {
    const el = document.getElementById(`industry-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveIndustry(id)
  }

  return (
    <div className="antialiased overflow-x-hidden bg-[#0e0e0e] text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Sticky Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0e0e0e]/70 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
          <Link to="/" className="text-2xl font-black tracking-tighter text-[#3fff8b]">RouteWatch</Link>
          <div className="hidden md:flex items-center gap-8">
            {industries.map(ind => (
              <button
                key={ind.id}
                onClick={() => scrollTo(ind.id)}
                className="text-xs font-bold uppercase tracking-widest transition-colors duration-200"
                style={{ color: activeIndustry === ind.id ? ind.accentColor : '#6b7280' }}
              >
                {ind.label.split(' ')[0]}
              </button>
            ))}
          </div>
          <Link
            to="/"
            className="bg-gradient-to-r from-[#3fff8b] to-[#13ea79] text-[#005d2c] px-6 py-2 rounded-lg font-bold uppercase tracking-wide text-xs active:scale-90 transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Page Hero ── */}
      <section className="relative pb-20 pt-40 overflow-hidden">
        <div className="absolute top-1/4 -right-1/4 w-[700px] h-[700px] bg-[#3fff8b]/8 blur-[200px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 -left-1/4 w-[400px] h-[400px] bg-[#84ecff]/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="w-full max-w-7xl mx-auto px-8 relative z-10">
          <Link to="/" className="inline-flex items-center text-[#adaaaa] hover:text-white transition-colors mb-8">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#3fff8b]/10 text-[#3fff8b] rounded-full mb-6 border border-[#3fff8b]/20">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
            <span className="text-xs font-bold tracking-widest uppercase">Industry Solutions</span>
          </div>
          <h1 className="font-extrabold text-5xl md:text-7xl tracking-tighter leading-[0.95] mb-6">
            Built for every<br />
            <span className="text-[#3fff8b] italic">supply chain.</span>
          </h1>
          <p className="text-[#adaaaa] text-lg md:text-xl max-w-2xl leading-relaxed">
            RouteWatch delivers precision intelligence tailored to the specific disruption patterns, compliance requirements, and operational rhythms of your industry.
          </p>
        </div>
      </section>

      {/* ── Industry Pills (mobile sticky) ── */}
      <div className="sticky top-[65px] z-40 bg-[#0e0e0e]/80 backdrop-blur-lg border-b border-white/5 overflow-x-auto">
        <div className="flex gap-2 px-8 py-3 w-full max-w-7xl mx-auto">
          {industries.map(ind => (
            <button
              key={ind.id}
              onClick={() => scrollTo(ind.id)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border"
              style={{
                background: activeIndustry === ind.id ? ind.accentBg : 'transparent',
                borderColor: activeIndustry === ind.id ? ind.accentBorder : 'rgba(73,72,71,0.4)',
                color: activeIndustry === ind.id ? ind.accentColor : '#6b7280',
              }}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{ind.icon}</span>
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Industry Sections ── */}
      <main>
        {industries.map((ind, idx) => (
          <section
            key={ind.id}
            id={`industry-${ind.id}`}
            className="py-32 relative overflow-hidden"
            style={{ background: idx % 2 === 0 ? '#0e0e0e' : '#080808' }}
          >
            {/* Decorative glow */}
            <div
              className="absolute pointer-events-none rounded-full blur-[200px]"
              style={{
                width: 600, height: 600,
                background: ind.accentColor + '08',
                top: '20%', right: idx % 2 === 0 ? '-15%' : 'auto', left: idx % 2 !== 0 ? '-15%' : 'auto',
              }}
            />

            <div className="max-w-7xl mx-auto px-8 relative z-10">

              {/* Section header */}
              <div className="grid lg:grid-cols-2 gap-16 items-start mb-20">
                <div>
                  <div
                    className="inline-flex items-center gap-3 px-4 py-2 rounded-full mb-6 border"
                    style={{ background: ind.accentBg, borderColor: ind.accentBorder }}
                  >
                    <span className="material-symbols-outlined text-lg" style={{ color: ind.accentColor, fontVariationSettings: "'FILL' 1" }}>{ind.icon}</span>
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: ind.accentColor }}>{ind.label}</span>
                  </div>
                  <h2 className="font-extrabold text-4xl md:text-5xl tracking-tighter leading-tight mb-6">
                    {ind.tagline}
                  </h2>
                  <p className="text-[#adaaaa] text-lg leading-relaxed">{ind.overview}</p>
                </div>

                {/* Hero stat + metrics */}
                <div className="space-y-4">
                  {/* Big stat */}
                  <div
                    className="rounded-3xl p-10 border text-center"
                    style={{ background: ind.accentBg, borderColor: ind.accentBorder }}
                  >
                    <div className="font-black text-7xl mb-2" style={{ color: ind.accentColor }}>{ind.heroStat.value}</div>
                    <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#adaaaa]">{ind.heroStat.desc}</div>
                  </div>

                  {/* 4 metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    {ind.metrics.map(m => (
                      <div key={m.label} className="bg-[#131313] rounded-2xl p-6 border border-[#494847]/20">
                        <div className="font-extrabold text-2xl mb-1" style={{ color: ind.accentColor }}>{m.val}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Challenges */}
              <div className="mb-20">
                <div className="mb-10">
                  <h3 className="text-2xl font-extrabold tracking-tighter mb-2">Key Challenges We Solve</h3>
                  <div className="w-16 h-1 rounded-full" style={{ background: ind.accentColor }} />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {ind.challenges.map(ch => (
                    <div
                      key={ch.title}
                      className="group bg-[#131313] rounded-2xl p-8 border border-[#494847]/20 hover:border-opacity-60 transition-all duration-300"
                      style={{ '--hover-border': ind.accentBorder }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                        style={{ background: ind.accentBg }}
                      >
                        <span className="material-symbols-outlined text-xl" style={{ color: ind.accentColor, fontVariationSettings: "'FILL' 1" }}>{ch.icon}</span>
                      </div>
                      <h4 className="font-bold text-lg mb-2">{ch.title}</h4>
                      <p className="text-[#adaaaa] text-sm leading-relaxed">{ch.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-20">
                <div className="mb-10">
                  <h3 className="text-2xl font-extrabold tracking-tighter mb-2">RouteWatch Capabilities</h3>
                  <div className="w-16 h-1 rounded-full" style={{ background: ind.accentColor }} />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ind.capabilities.map(cap => (
                    <div
                      key={cap}
                      className="flex items-start gap-4 bg-[#131313] rounded-xl px-6 py-5 border border-[#494847]/20"
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: ind.accentBg }}
                      >
                        <span className="material-symbols-outlined text-[#3fff8b]" style={{ fontSize: '12px', color: ind.accentColor, fontVariationSettings: "'FILL' 1" }}>check</span>
                      </span>
                      <span className="text-sm text-[#adaaaa] leading-snug capitalize">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Case Study */}
              <div
                className="rounded-3xl p-10 border relative overflow-hidden"
                style={{ background: ind.accentBg, borderColor: ind.accentBorder }}
              >
                <div className="absolute top-6 right-8 text-8xl font-black opacity-10 leading-none select-none" style={{ color: ind.accentColor }}>"</div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2 h-2 rounded-full" style={{ background: ind.accentColor }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ind.accentColor }}>Customer Impact</span>
                </div>
                <p className="text-white text-lg leading-relaxed">
                  <span className="font-bold">{ind.caseStudy.company}</span>
                  {' '}{ind.caseStudy.result}
                </p>
              </div>

            </div>
          </section>
        ))}
      </main>

      {/* ── Compare Banner ── */}
      <section className="py-20 bg-[#000000] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-4">One platform. Every industry.</h2>
            <p className="text-[#adaaaa] max-w-xl">RouteWatch's unified intelligence layer adapts to your vertical without needing custom integration work. Go live in days, not months.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {industries.map(ind => (
              <button
                key={ind.id}
                onClick={() => scrollTo(ind.id)}
                className="group bg-[#131313] rounded-2xl p-8 border border-[#494847]/20 hover:border-opacity-60 transition-all duration-300 text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                  style={{ background: ind.accentBg }}
                >
                  <span className="material-symbols-outlined text-xl" style={{ color: ind.accentColor, fontVariationSettings: "'FILL' 1" }}>{ind.icon}</span>
                </div>
                <div className="font-bold text-sm mb-1">{ind.label}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ind.accentColor }}>{ind.heroStat.value} {ind.heroStat.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#000000] w-full py-10 px-8 border-t border-[#3fff8b]/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[#3fff8b] font-black text-xl">RouteWatch</div>
          <div className="text-sm text-gray-500">© 2024 RouteWatch Kinetic Systems. All rights reserved.</div>
          <Link to="/" className="text-sm text-[#adaaaa] hover:text-[#3fff8b] transition-colors font-bold uppercase tracking-widest">Home</Link>
        </div>
      </footer>
    </div>
  )
}
