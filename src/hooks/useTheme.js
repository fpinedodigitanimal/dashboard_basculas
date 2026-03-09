import { useState, useEffect } from 'react'

const THEME_KEY = 'dashboard_theme'

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Inicializar desde localStorage antes del primer render
    const saved = localStorage.getItem(THEME_KEY)
    // Si no hay preferencia guardada, usar dark por defecto
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    // Aplicar clase al body
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
    
    // Guardar en localStorage
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  return { isDarkMode, toggleTheme }
}
