export default function Navbar() {
  return (
    <header className="flex justify-between items-center px-8 w-full h-16 border-b border-[#262626]/50 sticky top-0 z-50 bg-[#0e0e0e]/80 backdrop-blur-xl">
      {/* Left: hamburger (mobile) */}
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <span className="material-symbols-outlined text-[#3fff8b]">menu</span>
        </div>
      </div>

      {/* Center: search */}
      <div className="flex-1 max-w-md mx-8 relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">search</span>
        <input
          className="w-full bg-[#131313] border-none focus:ring-1 focus:ring-[#3fff8b] rounded-lg pl-10 pr-4 py-1.5 text-sm text-white/80 placeholder:text-white/20 outline-none"
          placeholder="Search routes, vessels, or alerts..."
          type="text"
        />
      </div>

      {/* Right: settings + user */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-white/60 hover:text-[#3fff8b] transition-colors cursor-pointer">
          <span className="material-symbols-outlined">settings</span>
        </div>
        <div className="flex items-center gap-3 pl-6 border-l border-[#262626]">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Alex Chen</p>
            <p className="text-[10px] text-white/40">Logistics Lead</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#262626] overflow-hidden border border-[#3fff8b]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#3fff8b] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
        </div>
      </div>
    </header>
  )
}
