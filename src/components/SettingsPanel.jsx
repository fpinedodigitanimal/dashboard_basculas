import { X, Save, Moon } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPanel({ onClose, isDarkMode, toggleTheme }) {
  const [settings, setSettings] = useState({
    refreshInterval: 60,
    showAlerts: true,
    autoExport: false,
    theme: 'light',
  })

  const handleSave = () => {
    localStorage.setItem('dashboardSettings', JSON.stringify(settings))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Configuración</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Intervalo de actualización */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intervalo de actualización (segundos)
            </label>
            <input
              type="number"
              value={settings.refreshInterval}
              onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
              className="input"
              min="10"
              max="300"
            />
          </div>

          {/* Mostrar alertas */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Mostrar alertas
            </label>
            <button
              onClick={() => setSettings({ ...settings, showAlerts: !settings.showAlerts })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showAlerts ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto export */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Exportación automática
            </label>
            <button
              onClick={() => setSettings({ ...settings, autoExport: !settings.autoExport })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoExport ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoExport ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Modo oscuro */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Modo oscuro
              </label>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDarkMode ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
