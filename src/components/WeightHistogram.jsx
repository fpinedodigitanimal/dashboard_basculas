import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useEffect, useState } from 'react'

export default function WeightHistogram({ data, filter = 'all' }) {
  const [isDarkMode, setIsDarkMode] = useState(false)

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
      <div className="card">
        <div className="card-header">Distribución de Pesos</div>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
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

  // Calcular rangos de peso (bins) - ignorar valores > 1000kg
  const allWeights = filteredData.flatMap(scale => scale.weights.filter(w => w <= 1000))
  
  if (allWeights.length === 0) {
    return (
      <div className="card">
        <div className="card-header">Distribución de Pesos entre Básculas</div>
        <div className="h-[450px] flex items-center justify-center text-gray-400">
          No hay datos en el rango válido (≤ 1000kg)
        </div>
      </div>
    )
  }
  
  const minWeight = Math.min(...allWeights)
  const maxWeight = Math.max(...allWeights)
  
  // Crear bins de 50kg
  const binSize = 50
  const numBins = Math.ceil((maxWeight - minWeight) / binSize) || 10
  const bins = Array.from({ length: numBins }, (_, i) => ({
    range: `${Math.round(minWeight + i * binSize)}-${Math.round(minWeight + (i + 1) * binSize)}`,
    rangeStart: minWeight + i * binSize,
    rangeEnd: minWeight + (i + 1) * binSize
  }))

  // Contar pesos en cada bin por báscula
  const chartData = bins.map(bin => {
    const point = { range: bin.range }
    filteredData.forEach(scale => {
      const count = scale.weights.filter(w => w >= bin.rangeStart && w < bin.rangeEnd && w <= 1000).length
      point[scale.scale_id] = count
    })
    return point
  })

  // Colores para las áreas - paleta reducida para modo oscuro
  const colors = isDarkMode ? [
    '#4FC3F7', '#FFB74D', '#81C784', '#BA68C8', '#E57373', '#FFF176'
  ] : [
    '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
  ]

  const axisColor = isDarkMode ? '#B3B3B3' : '#9ca3af'
  const gridColor = isDarkMode ? '#2A2A2A' : '#f0f0f0'
  const tooltipBg = isDarkMode ? '#2A2A2A' : '#fff'
  const tooltipBorder = isDarkMode ? '#444' : '#e5e7eb'
  const tooltipText = isDarkMode ? '#FFFFFF' : '#000000'

  return (
    <div className="card">
      <div className="card-header text-sm">Distribución de Pesos</div>
      
      <div className="h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -5, bottom: 5 }}>
            <defs>
              {filteredData.map((scale, idx) => (
                <linearGradient key={`gradient-${scale.scale_id}`} id={`color-${scale.scale_id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="range" 
              tick={{ fontSize: 8, fill: axisColor }}
              stroke={axisColor}
              angle={-90}
              textAnchor="end"
              height={60}
              interval={1}
            />
            <YAxis 
              tick={{ fontSize: 9, fill: axisColor }}
              stroke={axisColor}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '10px',
                color: tooltipText
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '9px', color: axisColor }}
              iconType="line"
              iconSize={8}
            />
            {filteredData.map((scale, idx) => (
              <Area
                key={scale.scale_id}
                type="monotone"
                dataKey={scale.scale_id}
                stroke={colors[idx % colors.length]}
                strokeWidth={1.5}
                fill={`url(#color-${scale.scale_id})`}
                fillOpacity={0.6}
                name={scale.scale_id}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="px-2 pb-2 text-[10px] text-gray-500 text-center">
        Pesos (kg) ≤ 1000kg
      </div>
    </div>
  )
}
