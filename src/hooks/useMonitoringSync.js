/**
 * Hook para inicializar y gestionar la sincronización de monitorización
 * Debe ser usado una sola vez en el componente raíz de la aplicación
 */

import { useEffect } from 'react'
import useMonitoringStore from '../stores/monitoringStore'

export function useMonitoringSync(authenticated = false) {
  const initialize = useMonitoringStore((state) => state.initialize)
  const cleanup = useMonitoringStore((state) => state.cleanup)
  const connected = useMonitoringStore((state) => state.connected)
  const reconnecting = useMonitoringStore((state) => state.reconnecting)
  const isInitialized = useMonitoringStore((state) => state.isInitialized)

  useEffect(() => {
    // Solo inicializar si el usuario está autenticado
    if (!authenticated) {
      return
    }

    // Inicializar el store (carga estado inicial + conecta SSE)
    initialize()

    // Cleanup al desmontar
    return () => {
      cleanup()
    }
  }, [authenticated, initialize, cleanup]) // Incluir authenticated en dependencias

  return {
    connected,
    reconnecting,
    isInitialized,
  }
}

export default useMonitoringSync
