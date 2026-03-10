import { Activity, Scale, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getKPIs } from '../services/api'

export default function KPICards({ authenticated = false }) {
  const [kpis, setKpis] = useState({
    activeScales: 0,
    totalAnimals: 0,
    recordsPerHour: 0,
    activityTrend: 0,
    scalesWithAlerts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Solo cargar KPIs si está autenticado
    if (!authenticated) {
      return
    }

    const fetchKPIs = async () => {
      try {
        const data = await getKPIs()
        setKpis(data)
      } catch (error) {
        console.error('Error al cargar KPIs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
    const interval = setInterval(fetchKPIs, 60000) // Actualizar cada minuto
    return () => clearInterval(interval)
  }, [authenticated])

  const cards = [
    {
      icon: Scale,
      label: 'Básculas Activas',
      value: kpis.activeScales,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      icon: Users,
      label: 'Animales Monitorizados',
      value: kpis.totalAnimals,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      icon: Activity,
      label: 'Registros/Hora',
      value: kpis.recordsPerHour.toFixed(1),
      suffix: ' reg/h',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      icon: TrendingUp,
      label: 'Tendencia Actividad',
      value:
        kpis.activityTrend >= 0
          ? `+${kpis.activityTrend.toFixed(1)}%`
          : `${kpis.activityTrend.toFixed(1)}%`,
      color:
        kpis.activityTrend >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        kpis.activityTrend >= 0
          ? 'bg-green-100 dark:bg-green-900/20'
          : 'bg-red-100 dark:bg-red-900/20',
      trend: true,
    },
    {
      icon: AlertTriangle,
      label: 'Básculas con Alertas',
      value: kpis.scalesWithAlerts,
      color:
        kpis.scalesWithAlerts > 0
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-gray-600 dark:text-gray-400',
      bgColor:
        kpis.scalesWithAlerts > 0
          ? 'bg-orange-100 dark:bg-orange-900/20'
          : 'bg-gray-100 dark:bg-gray-900/20',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#1E1E1E] rounded-lg p-2 animate-pulse">
            <div className="h-5 sm:h-6 w-5 sm:w-6 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
            <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
            <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={idx}
            className="bg-white dark:bg-[#1E1E1E] rounded-lg p-1.5 sm:p-2 border border-gray-200 dark:border-[#2A2A2A] hover:shadow-lg transition-shadow"
          >
            <div
              className={`w-6 sm:w-7 h-6 sm:h-7 ${card.bgColor} rounded-lg flex items-center justify-center mb-1 sm:mb-1.5`}
            >
              <Icon className={card.color} strokeWidth={2} />
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-600 dark:text-[#B3B3B3] mb-0.5">
              {card.label}
            </div>
            <div className={`text-base sm:text-lg font-bold ${card.color} truncate`}>
              {card.value}
              {card.suffix || ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}
