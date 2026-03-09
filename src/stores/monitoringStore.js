/**
 * Store de Monitorización de Básculas
 * Gestiona el estado de activación de alertas con sincronización mediante polling
 * (Adaptado para Vercel serverless - sin SSE)
 */

import { create } from 'zustand'

const POLL_INTERVAL = 5000 // 5 segundos

const useMonitoringStore = create((set, get) => ({
  // ===================== DOMAIN STATE =====================
  // Mapa de estado de monitorización: Map<scale_id, MonitoringState>
  monitoring: new Map(),
  
  // ===================== UI STATE =====================
  loading: new Set(),
  errors: new Map(),
  
  // ===================== POLLING STATE =====================
  pollingInterval: null,
  lastUpdate: null,
  
  // ===================== ACCIONES DE DOMINIO =====================
  
  /**
   * Establece el estado de monitorización de una báscula
   */
  setMonitoring: (scaleId, state) => 
    set((current) => ({
      monitoring: new Map(current.monitoring).set(scaleId, state)
    })),
  
  /**
   * Establece múltiples estados de monitorización (bulk)
   */
  setMonitoringBulk: (monitoringList) =>
    set((current) => {
      const newMap = new Map(current.monitoring)
      monitoringList.forEach(m => {
        newMap.set(m.scale_id, m)
      })
      return { monitoring: newMap }
    }),
  
  /**
   * Obtiene el estado de una báscula específica
   */
  getMonitoring: (scaleId) => {
    return get().monitoring.get(scaleId) || {
      scale_id: scaleId,
      enabled: false,
      updated_at: null,
      updated_by: null,
      version: 0
    }
  },
  
  /**
   * Obtiene lista de scale_ids con monitorización activa
   */
  getEnabledScales: () => {
    const enabled = []
    get().monitoring.forEach((state, scaleId) => {
      if (state.enabled) {
        enabled.push(scaleId)
      }
    })
    return enabled
  },
  
  // ===================== ACCIONES DE UI =====================
  
  /**
   * Marca una báscula como loading/not loading
   */
  setLoading: (scaleId, isLoading) =>
    set((current) => {
      const loading = new Set(current.loading)
      if (isLoading) {
        loading.add(scaleId)
      } else {
        loading.delete(scaleId)
      }
      return { loading }
    }),
  
  /**
   * Verifica si una báscula está en estado loading
   */
  isLoading: (scaleId) => {
    return get().loading.has(scaleId)
  },
  
  /**
   * Establece un error para una báscula
   */
  setError: (scaleId, errorMessage) =>
    set((current) => ({
      errors: new Map(current.errors).set(scaleId, errorMessage)
    })),
  
  /**
   * Limpia el error de una báscula
   */
  clearError: (scaleId) =>
    set((current) => {
      const errors = new Map(current.errors)
      errors.delete(scaleId)
      return { errors }
    }),
  
  /**
   * Obtiene el error de una báscula
   */
  getError: (scaleId) => {
    return get().errors.get(scaleId)
  },
  
  // ===================== SSE METHODS =====================
  
  /**
   * Conecta al stream de eventos SSE para sincronización en tiempo real
   */
  connectSSE: () => {
    const currentEventSource = get().eventSource
    
    // No reconectar si ya hay una conexión activa
    if (currentEventSource && currentEventSource.readyState !== EventSource.CLOSED) {
      console.log('[MonitoringStore] SSE already connected')
      return
    }
    
    try {
      console.log('[MonitoringStore] Connecting to SSE...')
      set({ reconnecting: true })
      
      const eventSource = new EventSource('/api/scales/monitoring/events')
      
      // Evento: scale.monitoring.updated
      eventSource.addEventListener('scale.monitoring.updated', (e) => {
        try {
          const data = JSON.parse(e.data)
          console.log('[MonitoringStore] SSE update received:', data.scale_id)
          
          get().setMonitoring(data.scale_id, data)
          
        } catch (error) {
          console.error('[MonitoringStore] Error parsing SSE event:', error)
        }
      })
      
      // Evento: heartbeat
      eventSource.addEventListener('heartbeat', (e) => {
        try {
          const data = JSON.parse(e.data)
          set({ lastHeartbeat: data.timestamp })
          console.log('[MonitoringStore] Heartbeat received')
        } catch (error) {
          console.error('[MonitoringStore] Error parsing heartbeat:', error)
        }
      })
      
      // Evento: sync.required (backend pide resincronización)
      eventSource.addEventListener('sync.required', () => {
        console.log('[MonitoringStore] Sync required by server')
        get().loadInitialState()
      })
      
      // Conexión abierta
      eventSource.onopen = () => {
        console.log('[MonitoringStore] SSE connected')
        set({ 
          connected: true, 
          reconnecting: false,
          eventSource 
        })
      }
      
      // Error de conexión
      eventSource.onerror = (error) => {
        console.error('[MonitoringStore] SSE error:', error)
        set({ 
          connected: false,
          reconnecting: true
        })
        
        // EventSource se reconecta automáticamente
        // No necesitamos hacer nada especial aquí
      }
      
    } catch (error) {
      console.error('[MonitoringStore] Error creating SSE connection:', error)
      set({ 
        connected: false,
        reconnecting: false
      })
    }
  },
  
  /**
   * Desconecta del stream SSE
   */
  disconnectSSE: () => {
    const { eventSource } = get()
    if (eventSource) {
      console.log('[MonitoringStore] Disconnecting SSE...')
      eventSource.close()
      set({ 
        eventSource: null, 
        connected: false,
        reconnecting: false
      })
    }
  },
  
  /**
   * Carga el estado inicial desde el backend
   */
  loadInitialState: async () => {
    try {
      console.log('[MonitoringStore] Loading state...')
      
      const response = await fetch('/api/scales/monitoring')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const monitoring = await response.json()
      
      console.log(`[MonitoringStore] Loaded ${monitoring.length} monitoring states`)
      get().setMonitoringBulk(monitoring)
      set({ lastUpdate: new Date().toISOString() })
      
    } catch (error) {
      console.error('[MonitoringStore] Error loading state:', error)
    }
  },
  
  /**
   * Inicializa el store: carga estado inicial e inicia  polling
   */
  initialize: async () => {
    console.log('[MonitoringStore] Initializing...')
    
    // 1. Cargar estado inicial
    await get().loadInitialState()
    
    // 2. Iniciar polling para updates
    get().startPolling()
  },
  
  /**
   * Limpia el store
   */
  cleanup: () => {
    console.log('[MonitoringStore] Cleaning up...')
    get().stopPolling()
    set({
      monitoring: new Map(),
      loading: new Set(),
      errors: new Map(),
      lastUpdate: null
    })
  }
}))

export default useMonitoringStore
