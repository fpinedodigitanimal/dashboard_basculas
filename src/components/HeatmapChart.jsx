import { useEffect, useState } from 'react'

export default function HeatmapChart({ data, filter = 'all', selectedDate }) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Grupos de básculas por cliente/ubicación
  const scaleGroups = [
    {
      label: 'Gil',
      scales: ['B00019', 'B00020']
    },
    {
      label: 'Bonarea',
      scales: ['B00037', 'B00038', 'B00039', 'B00040', 'B00059', 'B00060', 'B00061', 'B00062']
    },
    {
      label: 'Larriaundi',
      scales: ['B00057', 'B00064']
    },
    {
      label: 'Villacuenca',
      scales: ['B00051']
    },
    {
      label: 'COVAP',
      scales: ['B00054', 'B00056', 'B00065', 'B00066']
    }
  ]

  // Etiquetas individuales (sin grupo)
  const individualLabels = {
    'B00012': 'Algortola',
    'B00034': 'Rubén',
    'B00063': 'Ganademad',
    'B00027': 'Sierra San Pedro',
    'B00078': 'Sin Grupo',
    'B00079': 'Sin Grupo'
  }

  // Función para obtener el grupo de una báscula
  const getScaleGroup = (scaleId) => {
    return scaleGroups.find(group => 
      group.scales.some(id => scaleId.includes(id.replace('B', '')))
    )
  }

  useEffect(() => {
    // Detectar modo oscuro
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark-mode'))
    }
    
    checkDarkMode()
    
    // Observer para cambios en la clase
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])
  if (!data || data.length === 0) {
    return (
      <div className="card bg-white">
        <div className="card-header">Heatmap de Registros por Hora</div>
        <div className="h-[250px] sm:h-[350px] lg:h-[450px] flex items-center justify-center text-gray-400">
          Sin datos disponibles
        </div>
      </div>
    )
  }

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
    
    return scales.filter(scale => {
      const scaleId = (scale.scale_id || '').toString()
      return allowedIds.some(id => scaleId.includes(id))
    })
  }

  // Aplicar filtro por grupo
  const filteredData = filterScales(data)

  // Encontrar el valor máximo para normalizar los colores
  const maxValue = Math.max(...filteredData.flatMap(scale => scale.hourly))

  // Calcular fechas dinámicas basadas en selectedDate
  const getDateLabels = () => {
    const today = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const formatDate = (date) => {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      return `${day}/${month}`
    }
    
    return {
      yesterday: formatDate(yesterday),
      today: formatDate(today)
    }
  }
  
  const dateLabels = getDateLabels()

  // Calcular altura dinámica basada en número de básculas
  // Sin límite máximo para mostrar todo el contenido sin scroll
  const baseHeight = 120
  const rowHeight = 24
  const dynamicHeight = baseHeight + (filteredData.length * rowHeight)

  // Función para obtener el color basado en la intensidad
  const getColor = (value) => {
    if (value === 0) return 'transparent' // Invisible
    const intensity = value / maxValue
    
    if (isDarkMode) {
      // Paleta verde oscura profesional para modo oscuro
      if (intensity < 0.2) return '#1B5E20'
      if (intensity < 0.4) return '#2E7D32'
      if (intensity < 0.6) return '#388E3C'
      if (intensity < 0.75) return '#4CAF50'
      if (intensity < 0.85) return '#66BB6A'
      if (intensity < 0.95) return '#81C784'
      return '#A5D6A7'
    } else {
      // Paleta original para modo claro
      if (intensity < 0.2) return '#f7fde8'
      if (intensity < 0.4) return '#edfcc5'
      if (intensity < 0.6) return '#ddf88d'
      if (intensity < 0.75) return '#c9f04b'
      if (intensity < 0.85) return '#9acc15'
      if (intensity < 0.95) return '#81b717'
      return '#5c8410'
    }
  }

  // Generar 48 horas (24 de ayer + 24 de hoy)
  const hours = Array.from({ length: 48 }, (_, i) => {
    const hour = i % 24
    const day = i < 24 ? 'Ayer' : 'Hoy'
    return { label: `${hour.toString().padStart(2, '0')}:00`, day, hour }
  })

  return (
    <div className="card flex flex-col">
      <div className="card-header text-sm">Heatmap de Registros por Hora - Últimas 48h</div>
      
      <div className="flex-1 p-2">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Encabezado de días */}
            <div className="flex mb-1">
              <div className="w-28 flex-shrink-0 mr-1"></div>
              <div className="flex-1 flex">
                <div className="flex-1 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300">
                  {dateLabels.yesterday}
                </div>
                <div className="flex-1 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                  {dateLabels.today}
                </div>
              </div>
            </div>
            {/* Encabezado de horas */}
            <div className="flex mb-0.5">
              <div className="w-28 flex-shrink-0 mr-1"></div>
              <div className="flex-1 flex gap-0.5">
                {hours.map((hourObj, idx) => (
                  <div 
                    key={idx} 
                    className={`flex-1 text-center text-[8px] text-gray-600 dark:text-gray-400 font-mono ${idx === 24 ? 'border-l-2 border-gray-400' : ''}`}
                    style={{ minWidth: '14px' }}
                  >
                    {idx % 3 === 0 ? hourObj.hour : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Filas del heatmap agrupadas */}
            {(() => {
              // Organizar básculas por grupo
              const groupedScales = []
              const ungroupedScales = []

              filteredData.forEach(scale => {
                const group = getScaleGroup(scale.scale_id)
                if (group) {
                  let groupObj = groupedScales.find(g => g.label === group.label)
                  if (!groupObj) {
                    groupObj = { label: group.label, scales: [] }
                    groupedScales.push(groupObj)
                  }
                  groupObj.scales.push(scale)
                } else {
                  ungroupedScales.push(scale)
                }
              })

              return (
                <>
                  {/* Renderizar grupos */}
                  {groupedScales.map((group) => (
                    <div key={group.label} className="mb-2">
                      {group.scales.map((scale, scaleIdx) => (
                        <div key={scale.scale_id} className="flex mb-0.5">
                          {/* Columna de IDs con agrupación (SOLO ESTA PARTE TIENE BORDE) */}
                          <div 
                            className={`w-28 flex-shrink-0 flex items-center justify-between pr-1.5 pl-1 ${
                              scaleIdx === 0 
                                ? 'border-l-2 border-t-2 rounded-tl-md border-r-2' 
                                : 'border-l-2 border-r-2'
                            } ${
                              scaleIdx === group.scales.length - 1 
                                ? 'border-b-2 rounded-bl-md' 
                                : ''
                            } border-blue-300 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/10`}
                          >
                            {/* Etiqueta del grupo (solo primera fila) */}
                            {scaleIdx === 0 && (
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate">
                                {group.label}
                              </span>
                            )}
                            
                            {/* ID de la báscula */}
                            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 ml-auto">
                              {scale.scale_id}
                            </span>
                          </div>
                          
                          {/* Heatmap (SIN BORDES DE GRUPO) */}
                          <div className="flex-1 flex gap-0.5 ml-1">
                            {scale.hourly.map((count, hourIdx) => (
                              <div
                                key={hourIdx}
                                className={`flex-1 h-5 rounded-sm ${count > 0 ? 'transition-all hover:ring-2 hover:ring-primary-600 cursor-pointer group' : ''} ${hourIdx === 24 ? 'border-l-2 border-gray-400' : ''} relative`}
                                style={{ 
                                  backgroundColor: getColor(count),
                                  minWidth: '14px'
                                }}
                                title={count > 0 ? `${scale.scale_id} - ${hours[hourIdx].day} ${hours[hourIdx].label}: ${count} registros` : ''}
                              >
                                {count > 0 && (
                                  <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-10">
                                    <div className="font-semibold">{scale.scale_id}</div>
                                    <div>{hours[hourIdx].day} - {hours[hourIdx].label}: {count} registros</div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Renderizar básculas sin grupo (individuales con etiqueta) */}
                  {ungroupedScales.map((scale) => (
                    <div key={scale.scale_id} className="flex mb-0.5">
                      {/* Columna de IDs sin agrupación */}
                      <div className="w-28 flex-shrink-0 flex items-center justify-between pr-1.5 pl-1 bg-blue-50/20 dark:bg-blue-900/5 rounded">
                        {/* Etiqueta individual (si existe) - AHORA EN AZUL */}
                        {individualLabels[scale.scale_id] && (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                            {individualLabels[scale.scale_id]}
                          </span>
                        )}
                        
                        {/* ID de la báscula */}
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 ml-auto">
                          {scale.scale_id}
                        </span>
                      </div>
                      
                      {/* Heatmap */}
                      <div className="flex-1 flex gap-0.5 ml-1">
                        {scale.hourly.map((count, hourIdx) => (
                          <div
                            key={hourIdx}
                            className={`flex-1 h-5 rounded-sm ${count > 0 ? 'transition-all hover:ring-2 hover:ring-primary-600 cursor-pointer group' : ''} ${hourIdx === 24 ? 'border-l-2 border-gray-400' : ''} relative`}
                            style={{ 
                              backgroundColor: getColor(count),
                              minWidth: '14px'
                            }}
                            title={count > 0 ? `${scale.scale_id} - ${hours[hourIdx].day} ${hours[hourIdx].label}: ${count} registros` : ''}
                          >
                            {count > 0 && (
                              <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-10">
                                <div className="font-semibold">{scale.scale_id}</div>
                                <div>{hours[hourIdx].day} - {hours[hourIdx].label}: {count} registros</div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )
            })()}

            {/* Leyenda de colores */}
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-[10px] text-gray-600">Menos actividad</span>
              <div className="flex gap-0.5">
                {(isDarkMode ? [
                  '#1B5E20', '#2E7D32', '#388E3C', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7'
                ] : [
                  '#f7fde8', '#edfcc5', '#ddf88d', '#c9f04b', '#9acc15', '#81b717', '#5c8410'
                ]).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-5 h-3 rounded border border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-600">Más actividad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
