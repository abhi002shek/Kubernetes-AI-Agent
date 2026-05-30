'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'

interface User { id: string; email: string }
interface AuthCtx {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<User | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  refreshUser: async () => null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async (): Promise<User | null> => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser()
      const next = error ? null : (data?.user as User ?? null)
      setUser(next)
      return next
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshUser()
  }, [])

  const signOut = async () => {
    await insforge.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
