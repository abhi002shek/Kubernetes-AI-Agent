'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'

interface User { id: string; email: string }
interface AuthCtx { user: User | null; loading: boolean; signOut: () => Promise<void> }

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    insforge.auth.getCurrentUser().then(({ data, error }) => {
      setUser(error ? null : (data?.user as User ?? null))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const signOut = async () => {
    await insforge.auth.signOut()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
