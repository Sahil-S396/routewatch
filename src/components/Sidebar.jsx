import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { auth, signOut } from '../lib/firebase'
import NewRouteModal from './NewRouteModal'

const navItems = [
  { to: '/dashboard', icon: 'dashboard',     label: 'Dashboard' },
  { to: '/routes',    icon: 'alt_route',     label: 'Routes'    },
  { to: '/alerts',    icon: 'notifications', label: 'Alerts'    },
  { to: '/analytics', icon: 'analytics',     label: 'Analytics' },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut(auth)
      navigate('/')
    } catch (err) {
      console.error('Sign out failed:', err)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <aside className="w-64 h-screen border-r border-[#262626]/50 sticky left-0 top-0 bg-[#0e0e0e] flex flex-col py-8 z-50">
        {/* Brand */}
        <div className="px-8 mb-10">
          <NavLink to="/" className="block">
            <h1 className="text-xl font-black text-[#3fff8b]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              RouteWatch
            </h1>
            <p className="text-[10px] text-white/40 tracking-[0.2em] uppercase font-bold mt-1">
              Global Monitoring
            </p>
          </NavLink>
        </div>

        {/* Main nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-3 bg-[#3fff8b]/10 text-[#3fff8b] rounded-r-full py-3 px-6 border-l-4 border-[#3fff8b] transition-all duration-150'
                  : 'flex items-center gap-3 text-white/50 py-3 px-6 hover:bg-[#1a1919] hover:text-white transition-all active:translate-x-1 duration-150'
              }
            >
              <span className="material-symbols-outlined">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* New Route CTA */}
        <div className="px-6 mb-8">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full bg-gradient-to-r from-[#3fff8b] to-[#13ea79] text-[#005d2c] font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 text-sm active:scale-95 transition-all hover:shadow-[0_4px_20px_rgb(63,255,139,0.25)]"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Route
          </button>
        </div>

        {/* Bottom links */}
        <div className="mt-auto space-y-1">
          <a href="#" className="flex items-center gap-3 text-white/50 py-3 px-6 hover:bg-[#1a1919] hover:text-white transition-all duration-150">
            <span className="material-symbols-outlined">help</span>
            <span className="text-sm font-medium">Support</span>
          </a>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 text-white/50 py-3 px-6 hover:bg-[#1a1919] hover:text-[#ff7351] transition-all duration-150 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">
              {signingOut ? 'progress_activity' : 'logout'}
            </span>
            <span className="text-sm font-medium">
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </span>
          </button>
        </div>
      </aside>

      <NewRouteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
