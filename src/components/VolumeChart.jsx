import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useEffect, useState } from 'react'

// Tooltip personalizado que solo muestra la serie activa
const CustomTooltip = ({ active, payload, label, activeDataKey, isDarkMode }) => {
  if (!active || !payload || payload.length === 0) return null

  // Filtrar solo la serie activa
  const filteredPayload = activeDataKey
    ? payload.filter(p => p.dataKey === activeDataKey)
    : []

  if (filteredPayload.length === 0) return null

  const tooltipBg = isDarkMode ? '#2A2A2A' : '#fff'
  const tooltipBorder = isDarkMode ? '#444' : '#e5e7eb'
  const tooltipText = isDarkMode ? '#FFFFFF' : '#000000'

  return (
    <div style={{
      backgroundColor: tooltipBg,
      border: `1px solid ${tooltipBorder}`,
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      fontSize: '11px',
      color: tooltipText,
      padding: '8px 12px'
    }}>
      <p style={{ margin: 0, marginBottom: '4px', fontWeight: '600' }}>{label}</p>
      {filteredPayload.map((entry, index) => (
        <p key={index} style={{ margin: 0, color: entry.color }}>
          Báscula {entry.name}: {entry.value} registros
        </p>
      ))}
    </div>
  )
}

export default function VolumeChart({ data, filter = 'all' }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeDataKey, setActiveDataKey] = useState(null)

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
        <div className="card-header">Actividad últimos 30 días por Báscula</div>
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

  // Aplicar filtro a los datos
  const filteredData = filterScales(data)

  // Si no hay datos después del filtro, mostrar mensaje
  if (filteredData.length === 0) {
    return (
      <div className="card">
        <div className="card-header">Actividad últimos 30 días por Báscula</div>
        <div className="h-[450px] flex items-center justify-center text-gray-400">
          No hay básculas en el grupo seleccionado
        </div>
      </div>
    )
  }

  // Ordenar básculas por total de actividad y tomar las top 5
  const sortedScales = [...filteredData].sort((a, b) => b.total - a.total)
  const top5Scales = sortedScales.slice(0, 5).map(s => s.scale_id)
  
  // Transformar datos para Recharts (necesitamos un array con todas las fechas)
  // Usar la báscula con más datos para obtener todas las fechas posibles
  const scaleWithMostData = filteredData.reduce((prev, current) => 
    (current.data?.length || 0) > (prev.data?.length || 0) ? current : prev
  )
  const allDates = scaleWithMostData?.data || []
  
  const chartData = allDates.map((item, idx) => {
    const point = { fecha: item.fecha }
    filteredData.forEach(scale => {
      point[scale.scale_id] = scale.data?.[idx]?.registros || 0
    })
    return point
  })

  // Colores para las líneas - paleta optimizada para modo oscuro
  const colors = isDarkMode ? [
    '#4FC3F7', '#FFB74D', '#81C784', '#BA68C8', '#E57373', 
    '#FFF176', '#64B5F6', '#FFD54F', '#AED581', '#F06292'
  ] : [
    '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ]

  const axisColor = isDarkMode ? '#B3B3B3' : '#9ca3af'
  const gridColor = isDarkMode ? '#2A2A2A' : '#f0f0f0'
  const tooltipBg = isDarkMode ? '#2A2A2A' : '#fff'
  const tooltipBorder = isDarkMode ? '#444' : '#e5e7eb'
  const tooltipText = isDarkMode ? '#FFFFFF' : '#000000'

  return (
    <div className="card">
      <div className="card-header">
        Actividad últimos 30 días por Báscula
        <span className="text-sm font-normal text-gray-500 ml-2">
          (destacadas las 5 más activas)
        </span>
      </div>
      
      <div className="h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="fecha" 
              tick={{ fontSize: 10, fill: axisColor }}
              stroke={axisColor}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10, fill: axisColor }}
              stroke={axisColor}
              width={40}
              label={{ value: 'Registros', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: axisColor } }}
            />
            <Tooltip content={<CustomTooltip activeDataKey={activeDataKey} isDarkMode={isDarkMode} />} />
            <Legend 
              wrapperStyle={{ fontSize: '11px', color: axisColor }}
              iconType="line"
            />
            {filteredData.map((scale, idx) => {
              const isTop = top5Scales.includes(scale.scale_id)
              return (
                <Line
                  key={scale.scale_id}
                  type="monotone"
                  dataKey={scale.scale_id}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={isDarkMode ? (isTop ? 3 : 2) : (isTop ? 2.5 : 1.5)}
                  dot={false}
                  activeDot={{ r: 6 }}
                  name={scale.scale_id}
                  opacity={isTop ? 1 : 0.85}
                  onMouseEnter={() => setActiveDataKey(scale.scale_id)}
                  onMouseLeave={() => setActiveDataKey(null)}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
