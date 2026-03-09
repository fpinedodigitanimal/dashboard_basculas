import axios from 'axios'

// En Vercel, todo está en el mismo dominio, usar rutas relativas
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // Enviar cookies de sesión
})

// Mock data para desarrollo sin backend
const mockData = {
  activeScales: 8,
  totalScales: 12,
  todayWeights: 145,
  weightChange: 12,
  activeAlerts: 2,
  alerts: [
    {
      id: 1,
      severity: 'warning',
      title: 'Báscula B-003 sin actividad',
      message: 'No se han registrado pesajes en las últimas 24 horas',
      details: 'Última conexión: 25 Feb 2026 14:30',
    },
    {
      id: 2,
      severity: 'critical',
      title: 'Conexión perdida',
      message: 'Báscula B-007 no responde',
      details: 'Error desde: 26 Feb 2026 08:15',
    },
  ],
  chartData: [
    { fecha: '22 Feb', pesajes: 120, activas: 10 },
    { fecha: '23 Feb', pesajes: 135, activas: 11 },
    { fecha: '24 Feb', pesajes: 128, activas: 10 },
    { fecha: '25 Feb', pesajes: 142, activas: 12 },
    { fecha: '26 Feb', pesajes: 145, activas: 11 },
  ],
  tableData: [
    { scale_id: 'B-001', nombre: 'B-001', weight: 456.3, estado: 'conectado', ultimoPesaje: '10:45', created_at: '2026-03-09 10:45:23', totalHoy: 18, rfid: 'A1B2C3' },
    { scale_id: 'B-002', nombre: 'B-002', weight: 523.7, estado: 'conectado', ultimoPesaje: '10:42', created_at: '2026-03-09 10:42:15', totalHoy: 15, rfid: 'D4E5F6' },
    { scale_id: 'B-003', nombre: 'B-003', weight: 412.1, estado: 'desconectado', ultimoPesaje: '08:20', created_at: '2026-03-09 08:20:45', totalHoy: 0, rfid: '-' },
    { scale_id: 'B-004', nombre: 'B-004', weight: 489.5, estado: 'conectado', ultimoPesaje: '10:40', created_at: '2026-03-09 10:40:32', totalHoy: 22, rfid: 'G7H8I9' },
    { scale_id: 'B-005', nombre: 'B-005', weight: 501.2, estado: 'conectado', ultimoPesaje: '10:38', created_at: '2026-03-09 10:38:54', totalHoy: 19, rfid: 'J1K2L3' },
    { scale_id: 'B-006', nombre: 'B-006', weight: 467.8, estado: 'conectado', ultimoPesaje: '10:35', created_at: '2026-03-09 10:35:21', totalHoy: 16, rfid: 'M4N5O6' },
    { scale_id: 'B-007', nombre: 'B-007', weight: null, estado: 'desconectado', ultimoPesaje: '-', created_at: null, totalHoy: 0, rfid: '-' },
    { scale_id: 'B-008', nombre: 'B-008', weight: 534.9, estado: 'conectado', ultimoPesaje: '10:30', created_at: '2026-03-09 10:30:18', totalHoy: 21, rfid: 'P7Q8R9' },
  ],
}

const mockRemoteStatus = {
  'B-001': 'conectado',
  'B-002': 'conectado',
  'B-003': 'desconectado',
  'B-004': 'conectado',
  'B-005': 'conectado',
  'B-006': 'conectado',
  'B-007': 'desconectado',
  'B-008': 'conectado',
}

export const fetchDashboardData = async (date = null) => {
  try {
    const params = date ? { date } : {}
    const response = await api.get('/dashboard', { params })
    return response.data
  } catch (error) {
    console.warn('API no disponible, usando datos mock:', error.message)
    return mockData
  }
}

export const fetchRemoteIoTStatus = async () => {
  try {
    const response = await api.get('/remoteiot/status')
    return response.data
  } catch (error) {
    console.warn('RemoteIoT no disponible, usando datos mock:', error.message)
    return mockRemoteStatus
  }
}

export const updateSettings = async (settings) => {
  try {
    const response = await api.post('/settings', settings)
    return response.data
  } catch (error) {
    console.error('Error actualizando configuración:', error)
    throw error
  }
}

export const exportData = async (format = 'csv') => {
  try {
    const response = await api.get(`/export?format=${format}`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    console.error('Error exportando datos:', error)
    throw error
  }
}

export const getScalesSelection = async () => {
  try {
    const response = await api.get('/scales/selection')
    return response.data.selected_scales || []
  } catch (error) {
    console.error('Error obteniendo selección de básculas:', error)
    return []
  }
}

export const saveScalesSelection = async (selectedScales) => {
  try {
    const response = await api.post('/scales/selection', {
      selected_scales: selectedScales
    })
    return response.data
  } catch (error) {
    console.error('Error guardando selección de básculas:', error)
    throw error
  }
}

// ==================== MONITORING API (NEW) ====================

/**
 * Obtiene el estado de monitorización de todas las básculas
 * @returns {Promise<{monitoring: Array}>}
 */
export const getScalesMonitoring = async () => {
  try {
    const response = await api.get('/scales/monitoring')
    return response.data
  } catch (error) {
    console.error('Error obteniendo monitorización:', error)
    throw error
  }
}

/**
 * Obtiene el estado de monitorización de una báscula específica
 * @param {string} scaleId - ID de la báscula
 * @returns {Promise<Object>} - Estado de monitorización
 */
export const getScaleMonitoring = async (scaleId) => {
  try {
    const response = await api.get(`/scales/${scaleId}/monitoring`)
    return response.data
  } catch (error) {
    console.error(`Error obteniendo monitorización de ${scaleId}:`, error)
    throw error
  }
}

/**
 * Actualiza el estado de monitorización de una báscula (IDEMPOTENTE)
 * @param {string} scaleId - ID de la báscula
 * @param {Object} update - { enabled: boolean, updated_by: string, version?: number }
 * @returns {Promise<Object>} - Resultado de la actualización
 */
export const updateScaleMonitoring = async (scaleId, update) => {
  try {
    const response = await api.put(`/scales/${scaleId}/monitoring`, update)
    return response.data
  } catch (error) {
    // Re-throw con más contexto para manejar errores de versión
    if (error.response?.status === 409) {
      const conflictError = new Error('Version conflict')
      conflictError.code = 'VERSION_CONFLICT'
      conflictError.response = error.response
      throw conflictError
    }
    throw error
  }
}

/**
 * Actualiza múltiples básculas en una sola operación
 * @param {Array} scales - Array de { scale_id, enabled }
 * @param {string} updatedBy - Usuario que realiza la operación
 * @returns {Promise<Object>} - Resultado con updated count y results
 */
export const bulkUpdateMonitoring = async (scales, updatedBy = 'user') => {
  try {
    const response = await api.put('/scales/monitoring/bulk', {
      scales,
      updated_by: updatedBy
    })
    return response.data
  } catch (error) {
    console.error('Error en actualización masiva:', error)
    throw error
  }
}

/**
 * Obtiene KPIs del dashboard
 * @returns {Promise<Object>} - KPIs calculados
 */
export const getKPIs = async () => {
  try {
    const response = await api.get('/kpis')
    return response.data
  } catch (error) {
    console.error('Error al obtener KPIs:', error)
    throw error
  }
}

export default api
