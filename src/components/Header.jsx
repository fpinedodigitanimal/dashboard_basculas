import { Settings, Activity, LogOut } from 'lucide-react'
import GlobalHelp from './GlobalHelp'
import { useAuth } from '../hooks/useAuth'

export default function Header({ onSettingsClick }) {
  const { logout, user } = useAuth()

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      await logout()
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-12 sm:h-14">
          {/* Logo y título */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="p-1 bg-primary-600 rounded-lg">
              <Activity className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900">Dashboard Básculas</h1>
              <p className="text-[9px] sm:text-[10px] text-gray-500 hidden sm:block">Digitanimal</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">En línea</span>
            </div>
            
            {user && (
              <span className="text-[10px] sm:text-xs text-gray-600 hidden md:block">
                {user.username}
              </span>
            )}
            
            <GlobalHelp />
            
            <button
              onClick={onSettingsClick}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Configuración"
            >
              <Settings className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-600" />
            </button>
            
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-red-50 transition-colors group"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
