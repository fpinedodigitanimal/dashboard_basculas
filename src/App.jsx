import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import Header from './components/Header'
import KPICards from './components/KPICards'
import VolumeChart from './components/VolumeChart'
import HeatmapChart from './components/HeatmapChart'
import WeightHistogram from './components/WeightHistogram'
import AlertsPanel from './components/AlertsPanel'
import DataTable from './components/DataTable'
import SettingsPanel from './components/SettingsPanel'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'
import { fetchDashboardData, fetchRemoteIoTStatus } from './services/api'
import { useTheme } from './hooks/useTheme'
import { useAuth } from './hooks/useAuth'
import useMonitoringSync from './hooks/useMonitoringSync'
import useMonitoringStore from './stores/monitoringStore'

function App() {
  const [data, setData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [remoteStatus, setRemoteStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const { isDarkMode, toggleTheme } = useTheme()
  
  // Obtener estado de autenticación
  const { authenticated } = useAuth()

  // Inicializar sistema de monitorización SOLO si está autenticado
  const { connected, reconnecting, isInitialized: isMonitoringInitialized } = useMonitoringSync(authenticated)
  const getEnabledScales = useMonitoringStore((state) => state.getEnabledScales)
  const monitoring = useMonitoringStore((state) => state.monitoring)

  const filterAlertsBySelection = useCallback((allAlerts, enabledScales, isInitialized) => {
    // Si el sistema de monitorización aún no se ha inicializado, mostrar todas las alertas
    if (!isInitialized) {
      return allAlerts
    }

    // Si no hay básculas monitorizadas, no mostrar alertas
    if (!enabledScales || enabledScales.length === 0) {
      return []
    }

    // Filtrar solo alertas de básculas con monitorización activa
    return allAlerts.filter((alert) => {
      // Intentar obtener el ID de la báscula desde diferentes propiedades
      const alertScaleId =
        alert.scale_id || (alert.title && alert.title.match(/Báscula\s+(\S+)/)?.[1])
      return alertScaleId && enabledScales.includes(alertScaleId)
    })
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [dashboardData, statusData] = await Promise.all([
        fetchDashboardData(selectedDate),
        fetchRemoteIoTStatus(),
      ])
      setData(dashboardData)
      setRemoteStatus(statusData)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter((a) => a.id !== alertId))
  }

  const changeDate = (days) => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + days)
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(date)
    selected.setHours(0, 0, 0, 0)

    if (selected.getTime() === today.getTime()) {
      return 'Hoy'
    }

    const options = { day: '2-digit', month: 'short', year: 'numeric' }
    return date.toLocaleDateString('es-ES', options)
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  // Cargar datos cuando cambia la fecha o al montar el componente
  // IMPORTANTE: Solo cargar después de autenticarse Y que el sistema de monitorización esté inicializado
  useEffect(() => {
    if (authenticated && isMonitoringInitialized) {
      loadData()
    }
  }, [loadData, isMonitoringInitialized, authenticated])

  // Auto-refresh cada 60s (solo si estamos en "hoy")
  useEffect(() => {
    if (!isToday) return // Solo auto-refresh para el día actual

    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [isToday, loadData])

  // Refiltrar alertas cuando cambie el estado de monitorización o los datos
  useEffect(() => {
    if (data?.alerts) {
      const enabledScales = getEnabledScales()
      const filteredAlerts = filterAlertsBySelection(
        data.alerts,
        enabledScales,
        isMonitoringInitialized
      )
      setAlerts(filteredAlerts)
    }
  }, [monitoring, data, getEnabledScales, filterAlertsBySelection, isMonitoringInitialized])

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-[#f8faf5]">
        <Header onSettingsClick={() => setShowSettings(!showSettings)} />

        {/* Botones de filtro */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-8 py-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
              {/* Control de fecha */}
              <div className="flex items-center gap-1 sm:gap-1.5 border-r border-gray-300 pr-2 sm:pr-3">
                <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-500" />
                <button
                  onClick={() => changeDate(-1)}
                  className="p-0.5 sm:p-1 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Día anterior"
                >
                  <ChevronLeft className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-600" />
                </button>
                <span className="text-[10px] sm:text-xs font-medium text-gray-700 min-w-[70px] sm:min-w-[90px] text-center">
                  {formatDisplayDate(selectedDate)}
                </span>
                <button
                  onClick={() => changeDate(1)}
                  disabled={isToday}
                  className={`p-0.5 sm:p-1 rounded transition-colors ${
                    isToday ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'
                  }`}
                  aria-label="Día siguiente"
                >
                  <ChevronRight className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-600" />
                </button>
                {!isToday && (
                  <button
                    onClick={goToToday}
                    className="ml-0.5 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  >
                    Hoy
                  </button>
                )}
              </div>

              {/* Filtros de grupo */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span className="text-[9px] sm:text-[10px] text-gray-600 font-medium mr-0.5 hidden sm:inline">
                  Filtro:
                </span>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('bonarea')}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-colors ${
                    filter === 'bonarea'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  Bonarea
                </button>
                <button
                  onClick={() => setFilter('gil')}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-colors ${
                    filter === 'gil'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  Gil
                </button>
                <button
                  onClick={() => setFilter('larriaundi')}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-colors ${
                    filter === 'larriaundi'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                  }`}
                >
                  Larriaundi
                </button>
                <button
                  onClick={() => setFilter('villacuenca')}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-colors ${
                    filter === 'villacuenca'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  Villacuenca
                </button>
                <button
                  onClick={() => setFilter('covap')}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-colors ${
                    filter === 'covap'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  COVAP
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto max-w-full mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-3">
          {/* KPI Cards */}
        <KPICards authenticated={authenticated} />
            <LoadingSpinner size="xl" className="h-64" />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 animate-fade-in">
              {/* Columna izquierda: Grid de gráficos */}
              <div className="xl:col-span-10 flex flex-col gap-2 sm:gap-3 lg:gap-4">
                {/* Gráfico Actividad */}
                <VolumeChart data={data?.volume30dData} filter={filter} />

                {/* Fila inferior: Heatmap + Distribución */}
                <div className="grid grid-cols-1 lg:grid-cols-9 gap-2 sm:gap-3 lg:gap-4">
                  {/* Heatmap */}
                  <div className="lg:col-span-7">
                    <HeatmapChart
                      data={data?.heatmapData}
                      filter={filter}
                      selectedDate={selectedDate}
                    />
                  </div>

                  {/* Distribución de Pesos */}
                  <div className="lg:col-span-2">
                    <WeightHistogram data={data?.histogramData} filter={filter} />
                  </div>
                </div>
              </div>

              {/* Columna derecha: Tablas apiladas */}
              <div className="xl:col-span-2 flex flex-col gap-2 sm:gap-3 lg:gap-4">
                {/* Tabla de Alertas */}
                <AlertsPanel
                  alerts={alerts}
                  onDismiss={dismissAlert}
                  hasSelectedScales={getEnabledScales().length > 0}
                />

                {/* Panel Monitorización */}
                <DataTable data={data?.tableData} filter={filter} />
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <SettingsPanel
                  onClose={() => setShowSettings(false)}
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default App
