/**
 * Hook para inicializar y gestionar la sincronización de monitorización
 * Debe ser usado una sola vez en el componente raíz de la aplicación
 */

import { useEffect } from 'react'
import useMonitoringStore from '../stores/monitoringStore'

export function useMonitoringSync() {
  const initialize = useMonitoringStore(state => state.initialize)
  const cleanup = useMonitoringStore(state => state.cleanup)
  const connected = useMonitoringStore(state => state.connected)
  const reconnecting = useMonitoringStore(state => state.reconnecting)
  
  useEffect(() => {
    // Inicializar el store (carga estado inicial + conecta SSE)
    initialize()
    
    // Cleanup al desmontar
    return () => {
      cleanup()
    }
  }, []) // Solo ejecutar una vez al montar
  
  return {
    connected,
    reconnecting
  }
}

export default useMonitoringSync
