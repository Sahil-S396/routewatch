import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

/**
 * Wraps interior app pages (Dashboard, Routes, Alerts, Analytics)
 * with the shared sidebar + navbar shell.
 */
export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0e0e0e] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      {/* Ambient glow decorations */}
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-[#3fff8b]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 -z-10 w-[300px] h-[300px] bg-[#ff7351]/5 blur-[100px] rounded-full pointer-events-none" />
    </div>
  )
}
