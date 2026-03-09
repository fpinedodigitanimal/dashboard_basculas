import { HelpCircle, X } from 'lucide-react'
import { useState } from 'react'

export default function GlobalHelp() {
  const [showHelp, setShowHelp] = useState(false)

  const sections = [
    {
      title: 'Indicadores Clave (KPIs)',
      description: 'Panel superior con métricas principales: número de básculas activas, animales monitorizados (EPCs únicos), registros por hora promedio en las últimas 24h, tendencia de actividad (comparación hoy vs ayer) y número de básculas con alertas activas.'
    },
    {
      title: 'Actividad últimos 30 días',
      description: 'Muestra el número de pesajes registrados por cada báscula en los últimos 30 días. Cada línea representa una báscula y marca el número de registros guardados cada día.'
    },
    {
      title: 'Heatmap de Registros por Hora',
      description: 'Visualiza la distribución horaria de pesajes de cada báscula en las últimas 48 horas (ayer y hoy). Los colores más intensos indican mayor actividad. Útil para identificar patrones de uso y horas pico.'
    },
    {
      title: 'Distribución de Pesos',
      description: 'Muestra la distribución de los pesos registrados por cada báscula en rangos de 50kg. Permite identificar los rangos de peso más comunes y detectar anomalías o patrones inusuales.'
    },
    {
      title: 'Monitorización de Básculas',
      description: 'Tabla con información en tiempo real de todas las básculas. Activa la monitorización en las básculas que deseas supervisar para recibir alertas automáticas de conexión y actividad.'
    },
    {
      title: 'Tabla de Alertas',
      description: 'Muestra alertas en tiempo real de las básculas monitorizadas. Se generan automáticamente cuando se detectan problemas de conexión, falta de actividad o anomalías en los datos.'
    }
  ]

  return (
    <>
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
        aria-label="Ayuda"
      >
        <HelpCircle size={20} strokeWidth={2} />
        <span className="text-sm font-medium">Ayuda</span>
      </button>

      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div 
            className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2A2A2A]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#EAEAEA]">
                Guía del Dashboard
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="space-y-4">
                {sections.map((section, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-[#EAEAEA] mb-1">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-[#B3B3B3]">
                      {section.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
