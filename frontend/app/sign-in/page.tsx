'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/context/AuthContext'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('insforge_status') === 'success' && searchParams.get('insforge_type') === 'verify_email') {
      setSuccess('Email verified. Sign in with your password below.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      if (error.statusCode === 403) {
        setError('Please verify your email first. Check your inbox for the 6-digit code.')
      } else {
        setError(error.message || 'Sign in failed')
      }
      return
    }
    await refreshUser()
    setLoading(false)
    if (data?.user) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError('Signed in but session was not saved. Try again.')
    }
  }

  const handleOAuth = (provider: 'github' | 'google') => {
    insforge.auth.signInWithOAuth({ provider, redirectTo: `${window.location.origin}/dashboard` })
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
          <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="text-slate-400 text-sm mt-1">Sign in to your K8s Agent</p>
      </div>

      <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1.5 block">Email</label>
            <input
              type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required
              className="w-full px-3.5 py-2.5 bg-slate-800/80 text-white rounded-xl border border-slate-600/50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-slate-500 text-sm transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1.5 block">Password</label>
            <input
              type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required
              className="w-full px-3.5 py-2.5 bg-slate-800/80 text-white rounded-xl border border-slate-600/50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-slate-500 text-sm transition-all"
            />
          </div>
          {success && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <p className="text-green-400 text-xs">{success}</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <span className="text-red-400 text-xs">⚠</span>
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/20 mt-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700/50" /></div>
          <div className="relative flex justify-center"><span className="bg-slate-900 px-3 text-xs text-slate-500">or continue with</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => handleOAuth('github')}
            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-600/50 text-sm transition-all">
            GitHub
          </button>
          <button type="button" onClick={() => handleOAuth('google')}
            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-600/50 text-sm transition-all">
            Google
          </button>
        </div>
      </div>

      <p className="text-slate-500 text-sm text-center mt-5">
        No account?{' '}
        <Link href="/sign-up" className="text-blue-400 hover:text-blue-300 transition-colors">Create one</Link>
      </p>
    </>
  )
}

export default function SignIn() {
  return (
    <main className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative animate-fade-in">
        <Suspense fallback={<div className="text-slate-400 text-sm text-center">Loading...</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  )
}
