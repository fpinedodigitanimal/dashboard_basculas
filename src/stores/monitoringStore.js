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
  isInitialized: false, // Flag para saber si ya se cargó el estado inicial

  // ===================== POLLING STATE =====================
  pollingInterval: null,
  lastUpdate: null,

  // ===================== ACCIONES DE DOMINIO =====================

  /**
   * Establece el estado de monitorización de una báscula
   */
  setMonitoring: (scaleId, state) =>
    set((current) => ({
      monitoring: new Map(current.monitoring).set(scaleId, state),
    })),

  /**
   * Establece múltiples estados de monitorización (bulk)
   */
  setMonitoringBulk: (monitoringList) =>
    set((current) => {
      const newMap = new Map(current.monitoring)
      monitoringList.forEach((m) => {
        newMap.set(m.scale_id, m)
      })
      return { monitoring: newMap }
    }),

  /**
   * Obtiene el estado de una báscula específica
   */
  getMonitoring: (scaleId) => {
    return (
      get().monitoring.get(scaleId) || {
        scale_id: scaleId,
        enabled: false,
        updated_at: null,
        updated_by: null,
        version: 0,
      }
    )
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
      errors: new Map(current.errors).set(scaleId, errorMessage),
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

  // ===================== POLLING METHODS =====================

  /**
   * Inicia el polling periódico
   */
  startPolling: () => {
    const { pollingInterval } = get()

    if (pollingInterval) {
      console.log('[MonitoringStore] Polling already active')
      return
    }

    console.log('[MonitoringStore] Starting polling...')

    const interval = setInterval(() => {
      get().loadInitialState()
    }, POLL_INTERVAL)

    set({ pollingInterval: interval })
  },

  /**
   * Detiene el polling
   */
  stopPolling: () => {
    const { pollingInterval } = get()
    if (pollingInterval) {
      console.log('[MonitoringStore] Stopping polling...')
      clearInterval(pollingInterval)
      set({ pollingInterval: null })
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
      set({
        lastUpdate: new Date().toISOString(),
        isInitialized: true, // Marcar como inicializado después de la primera carga
      })
    } catch (error) {
      console.error('[MonitoringStore] Error loading state:', error)
      // Marcar como inicializado incluso si falla, para evitar bloqueos
      set({ isInitialized: true })
    }
  },

  /**
   * Inicializa el store
   */
  initialize: async () => {
    console.log('[MonitoringStore] Initializing...')
    await get().loadInitialState()
    get().startPolling()
  },

  /**
   * Limpia el store
   */
  cleanup: () => {
    console.log('[MonitoringStore] Cleaning up...')
    get().stopPolling()
    // NO resetear isInitialized para evitar problemas con StrictMode
    set({
      monitoring: new Map(),
      loading: new Set(),
      errors: new Map(),
      lastUpdate: null,
      // isInitialized mantiene su valor
    })
  },
}))

export default useMonitoringStore
