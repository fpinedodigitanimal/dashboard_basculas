import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react'

export default function AlertsPanel({ alerts, onDismiss, hasSelectedScales = true }) {
  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'ERROR':
        return <AlertCircle className="w-4 h-4" />
      case 'warning':
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getAlertClasses = (tipo) => {
    switch (tipo) {
      case 'ERROR':
        return 'bg-red-900 text-white'
      case 'WARNING':
        return 'bg-yellow-800 text-white'
      case 'conexion':
        return 'bg-blue-600 text-white'
      case 'calibracion':
        return 'bg-orange-700 text-white'
      case 'INFO':
        return 'bg-indigo-700 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const getDetalleClasses = (tipo, detalle) => {
    if (tipo === 'conexion') {
      if (detalle === 'online') return 'bg-green-700 text-white'
      if (detalle === 'offline') return 'bg-red-700 text-white'
      if (detalle === 'desconocido') return 'bg-gray-600 text-white'
    }
    return ''
  }

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header text-sm py-2">Tabla de Alertas</div>
      
      <div className="flex-1 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Tipo
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Báscula
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Detalle
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!hasSelectedScales ? (
              <tr>
                <td colSpan="3" className="px-3 py-6 text-center text-sm text-gray-500">
                  <Info className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                  <div>Marca básculas en la tabla "Último peso"</div>
                  <div className="text-xs mt-1">para activar el monitoreo de alertas</div>
                </td>
              </tr>
            ) : alerts && alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <tr key={alert.id || idx} className="hover:bg-gray-50 transition-colors">
                  <td className={`px-3 py-2 whitespace-nowrap text-xs font-bold ${getAlertClasses(alert.tipo || alert.severity)}`}>
                    {alert.tipo || alert.severity}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {alert.scale_id || alert.title}
                  </td>
                  <td className={`px-3 py-2 text-xs ${getDetalleClasses(alert.tipo, alert.detalle)}`}>
                    {alert.detalle || alert.message}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-3 py-6 text-center text-sm text-gray-500">
                  No hay alertas activas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
