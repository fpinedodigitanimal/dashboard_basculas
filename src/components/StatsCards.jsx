import { Scale, Wifi, TrendingUp, AlertCircle } from 'lucide-react'

export default function StatsCards({ data, remoteStatus }) {
  const stats = [
    {
      name: 'Básculas Activas',
      value: data?.activeScales || 0,
      total: data?.totalScales || 0,
      icon: Scale,
      color: 'primary',
    },
    {
      name: 'Conectadas',
      value: Object.values(remoteStatus).filter(s => s === 'conectado').length,
      total: Object.keys(remoteStatus).length,
      icon: Wifi,
      color: 'green',
    },
    {
      name: 'Pesajes Hoy',
      value: data?.todayWeights || 0,
      change: data?.weightChange || 0,
      icon: TrendingUp,
      color: 'blue',
    },
    {
      name: 'Alertas Activas',
      value: data?.activeAlerts || 0,
      icon: AlertCircle,
      color: data?.activeAlerts > 0 ? 'red' : 'gray',
    },
  ]

  const getColorClasses = (color) => {
    const colors = {
      primary: 'bg-primary-50 text-primary-600',
      green: 'bg-green-50 text-green-600',
      blue: 'bg-blue-50 text-blue-600',
      red: 'bg-red-50 text-red-600',
      gray: 'bg-gray-50 text-gray-600',
    }
    return colors[color] || colors.gray
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.name} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                  {stat.total !== undefined && (
                    <p className="ml-2 text-sm text-gray-500">
                      / {stat.total}
                    </p>
                  )}
                  {stat.change !== undefined && stat.change !== 0 && (
                    <p className={`ml-2 text-sm ${stat.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change > 0 ? '+' : ''}{stat.change}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
