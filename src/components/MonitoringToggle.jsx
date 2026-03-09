/**
 * MonitoringToggle - Toggle para activar/desactivar monitorización de una báscula
 * 
 * Características:
 * - Optimistic UI para respuesta inmediata
 * - Rollback automático en caso de error
 * - Manejo de conflictos de versión
 * - Loading state individual por báscula
 * - Indicadores visuales de error
 */

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import useMonitoringStore from '../stores/monitoringStore'
import { updateScaleMonitoring } from '../services/api'

export default function MonitoringToggle({ scaleId, size = 'default' }) {
  // Obtener estado del store
  const monitoring = useMonitoringStore(state => state.getMonitoring(scaleId))
  const isLoading = useMonitoringStore(state => state.isLoading(scaleId))
  const error = useMonitoringStore(state => state.getError(scaleId))
  
  const setLoading = useMonitoringStore(state => state.setLoading)
  const setError = useMonitoringStore(state => state.setError)
  const clearError = useMonitoringStore(state => state.clearError)
  
  // Estado optimista local (solo durante la transición)
  const [optimisticState, setOptimisticState] = useState(null)
  
  // Estado efectivo: optimistic state o estado real del store
  const enabled = optimisticState !== null ? optimisticState : monitoring.enabled
  
  // Auto-clear error después de 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError(scaleId)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, scaleId, clearError])
  
  /**
   * Maneja el toggle de monitorización
   */
  const handleToggle = async () => {
    const newState = !enabled
    
    // Optimistic UI: actualizar inmediatamente
    setOptimisticState(newState)
    setLoading(scaleId, true)
    clearError(scaleId)
    
    try {
      // Llamada idempotente al backend
      const result = await updateScaleMonitoring(scaleId, {
        enabled: newState,
        updated_by: 'current_user', // TODO: integrar con sistema de auth
        version: monitoring.version > 0 ? monitoring.version : undefined
      })
      
      // Éxito: el SSE actualizará el estado real automáticamente
      // Limpiar estado optimista
      setOptimisticState(null)
      
      console.log(`[MonitoringToggle] Updated ${scaleId}:`, result)
      
    } catch (err) {
      // Error: rollback al estado anterior
      setOptimisticState(null)
      
      if (err.code === 'VERSION_CONFLICT') {
        // Conflicto de versión: otro usuario actualizó primero
        setError(scaleId, 'Actualizado por otro usuario')
        // El SSE traerá el estado correcto automáticamente
        
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        // Timeout: no sabemos si se aplicó
        setError(scaleId, 'Timeout - verificando estado...')
        // El SSE sincronizará el estado correcto
        
      } else if (err.response?.status >= 500) {
        // Error de servidor
        setError(scaleId, 'Error del servidor')
        
      } else {
        // Otros errores
        setError(scaleId, 'Error al actualizar')
      }
      
      console.error(`[MonitoringToggle] Error updating ${scaleId}:`, err)
    } finally {
      setLoading(scaleId, false)
    }
  }
  
  // Estilos basados en tamaño
  const sizeClasses = {
    small: {
      container: 'h-5 w-9',
      toggle: 'h-3 w-3',
      translate: enabled ? 'translate-x-5' : 'translate-x-1'
    },
    default: {
      container: 'h-6 w-11',
      toggle: 'h-4 w-4',
      translate: enabled ? 'translate-x-6' : 'translate-x-1'
    },
    large: {
      container: 'h-7 w-14',
      toggle: 'h-5 w-5',
      translate: enabled ? 'translate-x-7' : 'translate-x-1'
    }
  }
  
  const classes = sizeClasses[size] || sizeClasses.default
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          relative inline-flex items-center rounded-full
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
          ${classes.container}
          ${enabled 
            ? 'bg-green-600 dark-mode:bg-green-500' 
            : 'bg-gray-300 dark-mode:bg-gray-600'
          }
          ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-90'}
          ${error ? 'ring-2 ring-red-500 ring-offset-2' : ''}
        `}
        aria-label={`Monitorización ${enabled ? 'activa' : 'inactiva'}`}
        aria-pressed={enabled}
        title={enabled ? 'Monitorización activa - Click para desactivar' : 'Monitorización inactiva - Click para activar'}
      >
        {/* Toggle circle */}
        <span
          className={`
            inline-block transform rounded-full bg-white
            transition-transform duration-200 ease-in-out
            ${classes.toggle}
            ${classes.translate}
            ${isLoading ? 'opacity-70' : ''}
          `}
        />
        
        {/* Loading spinner overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              border-2 border-white border-t-transparent rounded-full animate-spin
              ${size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-4 h-4' : 'w-3 h-3'}
            `} />
          </div>
        )}
      </button>
      
      {/* Error indicator */}
      {error && (
        <div 
          className="flex items-center gap-1 text-red-600 dark-mode:text-red-400"
          title={error}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">{error}</span>
        </div>
      )}
      
      {/* Debug info (solo en desarrollo) */}
      {import.meta.env.DEV && monitoring.version > 0 && (
        <span className="text-[10px] text-gray-400 hidden lg:inline">
          v{monitoring.version}
        </span>
      )}
    </div>
  )
}
