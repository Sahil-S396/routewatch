import { useState, useEffect } from 'react'

/**
 * Lightweight toast notification.
 * Props: message, type ('success' | 'error'), onDismiss
 */
export default function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const colors =
    type === 'success'
      ? { bg: 'bg-[#131313] border-[#3fff8b]/40', icon: 'check_circle', iconColor: 'text-[#3fff8b]' }
      : { bg: 'bg-[#131313] border-[#ff7351]/40', icon: 'error',        iconColor: 'text-[#ff7351]' }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl backdrop-blur-sm ${colors.bg}`}
      style={{ animation: 'slideUp 0.2s ease' }}
    >
      <span
        className={`material-symbols-outlined ${colors.iconColor}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {colors.icon}
      </span>
      <p className="text-sm text-white font-medium">{message}</p>
      <button onClick={onDismiss} className="ml-2 text-white/30 hover:text-white transition-colors">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
