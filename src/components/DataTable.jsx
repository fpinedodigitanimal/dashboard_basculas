import { Search, Download } from 'lucide-react'
import { useState } from 'react'
import MonitoringToggle from './MonitoringToggle'

export default function DataTable({ data, filter = 'all' }) {
  const [searchTerm, setSearchTerm] = useState('')
  const tableData = data || []

  // Función para filtrar básculas por grupo
  const filterScales = (scales) => {
    if (filter === 'all') return scales
    
    const groupScales = {
      bonarea: ['37', '38', '39', '40', '59', '60', '61', '62'],
      gil: ['19', '20'],
      larriaundi: ['57', '64'],
      villacuenca: ['51'],
      covap: ['54', '56', '65', '66']
    }
    
    const allowedIds = groupScales[filter] || []
    
    return scales.filter(row => {
      const scaleId = (row.scale_id || row.nombre || '').toString()
      return allowedIds.some(id => scaleId.includes(id))
    })
  }

  // Aplicar filtro por grupo primero, luego por búsqueda
  const filteredByGroup = filterScales(tableData)
  const filteredData = filteredByGroup.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const exportToCSV = () => {
    if (!filteredData.length) return
    
    const headers = Object.keys(filteredData[0])
    const csv = [
      headers.join(','),
      ...filteredData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `basculas-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="card flex flex-col h-full">
      <div className="card-header mb-0 py-2">
        <div className="text-xs sm:text-sm font-semibold">Monitorización de Básculas</div>
        <p className="text-[10px] sm:text-xs text-gray-500 dark-mode:text-gray-400 font-normal mt-1">
          Activa monitorización para recibir alertas
        </p>
        <div className="relative mt-2">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-7 sm:pl-9 pr-2 sm:pr-3 py-1.5 w-full text-xs sm:text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200 dark-mode:divide-gray-700">
          <thead className="bg-gray-50 dark-mode:bg-gray-800 sticky top-0 z-10">
            <tr>
              <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark-mode:text-gray-400 uppercase tracking-wider">
                Báscula
              </th>
              <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark-mode:text-gray-400 uppercase tracking-wider">
                Último peso
              </th>
              <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark-mode:text-gray-400 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-2 sm:px-3 py-2 text-center text-[10px] sm:text-xs font-medium text-gray-500 dark-mode:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Monitor
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark-mode:bg-gray-900 divide-y divide-gray-200 dark-mode:divide-gray-700">
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => {
                const scaleId = row.scale_id || row.nombre
                // Manejar diferentes formatos de peso
                const weight = row.weight !== undefined && row.weight !== null 
                  ? `${Number(row.weight).toFixed(1)} kg` 
                  : '-'
                // Manejar diferentes formatos de fecha
                const fecha = row.created_at || row.ultimoPesaje || '-'
                
                return (
                  <tr key={scaleId || idx} className="hover:bg-gray-50 dark-mode:hover:bg-gray-800 transition-colors">
                    <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark-mode:text-gray-100">
                      {scaleId}
                    </td>
                    <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark-mode:text-gray-200">
                      {weight}
                    </td>
                    <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark-mode:text-gray-400">
                      {fecha}
                    </td>
                    <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center">
                      <MonitoringToggle scaleId={scaleId} size="small" />
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-xs sm:text-sm text-gray-500 dark-mode:text-gray-400">
                  {searchTerm ? 'No se encontraron resultados' : 'No hay datos disponibles'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
