import { useAuth } from '../hooks/useAuth'
import Login from './Login'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { authenticated, loading, login } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    )
  }

  if (!authenticated) {
    return <Login onLogin={login} />
  }

  return children
}
