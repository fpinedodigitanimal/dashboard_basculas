import { HelpCircle } from 'lucide-react'
import { useState } from 'react'

export default function HelpTooltip({ text }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <span className="relative inline-block mr-2">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-help align-middle"
        aria-label="Ayuda"
        type="button"
      >
        <HelpCircle size={18} strokeWidth={2} className="inline-block" />
      </button>
      
      {showTooltip && (
        <div className="absolute left-0 top-7 z-50 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl border border-gray-700">
          {text}
          <div className="absolute -top-2 left-4 w-3 h-3 bg-gray-900 border-l border-t border-gray-700 transform rotate-45"></div>
        </div>
      )}
    </span>
  )
}
