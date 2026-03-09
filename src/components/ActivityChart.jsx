import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useState } from 'react'

// Tooltip personalizado que solo muestra la serie activa
const CustomTooltip = ({ active, payload, label, activeDataKey }) => {
  if (!active || !payload || payload.length === 0) return null

  // Filtrar solo la serie activa o las que están muy cerca
  const filteredPayload = activeDataKey
    ? payload.filter(p => p.dataKey === activeDataKey)
    : payload

  if (filteredPayload.length === 0) return null

  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '8px 12px'
    }}>
      <p style={{ margin: 0, marginBottom: '4px', fontWeight: '600' }}>{label}</p>
      {filteredPayload.map((entry, index) => (
        <p key={index} style={{ margin: 0, color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

export default function ActivityChart({ data }) {
  const chartData = data || []
  const [activeDataKey, setActiveDataKey] = useState(null)

  return (
    <div className="card">
      <div className="card-header">Resumen de Actividad - Últimos 7 Días</div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="fecha" 
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip content={<CustomTooltip activeDataKey={activeDataKey} />} />
            <Legend 
              wrapperStyle={{ fontSize: '14px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="pesajes"
              stroke="#0ea5e9"
              strokeWidth={activeDataKey === 'pesajes' ? 4 : 2.5}
              dot={false}
              activeDot={false}
              name="Pesajes"
              onMouseEnter={() => setActiveDataKey('pesajes')}
              onMouseLeave={() => setActiveDataKey(null)}
            />
            <Line
              type="monotone"
              dataKey="activas"
              stroke="#10b981"
              strokeWidth={activeDataKey === 'activas' ? 4 : 2.5}
              dot={false}
              activeDot={false}
              name="Básculas Activas"
              onMouseEnter={() => setActiveDataKey('activas')}
              onMouseLeave={() => setActiveDataKey(null)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
