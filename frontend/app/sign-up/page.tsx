'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/context/AuthContext'

export default function SignUp() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    const saved = sessionStorage.getItem('verify_email')
    if (saved && !email) setEmail(saved)
  }, [email])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await insforge.auth.signUp({
      email: email.trim(),
      password,
      redirectTo: `${origin}/sign-in`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (data?.requireEmailVerification) {
      sessionStorage.setItem('verify_email', email.trim())
      setStep('verify')
      setInfo('Enter the 6-digit code from your email. Codes expire after a few minutes.')
    }
    else if (data?.accessToken) {
      await refreshUser()
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleResend = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    const verifyEmail = email.trim() || sessionStorage.getItem('verify_email') || ''
    const { data, error } = await insforge.auth.resendVerificationEmail({
      email: verifyEmail,
      redirectTo: `${origin}/sign-in`,
    })
    setLoading(false)
    if (error) setError(error.message || 'Could not resend code.')
    else if (data?.success) setInfo('A new code was sent. Use the latest email.')
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const verifyEmail = email.trim() || sessionStorage.getItem('verify_email') || ''
    const code = otp.replace(/\D/g, '').slice(0, 6)
    if (code.length !== 6) {
      setLoading(false)
      setError('Enter the full 6-digit code.')
      return
    }
    const { data, error } = await insforge.auth.verifyEmail({ email: verifyEmail, otp: code })
    if (error) {
      setLoading(false)
      const msg = error.message || 'Invalid or expired code.'
      setError(
        error.statusCode === 400
          ? `${msg} Request a new code below if this one expired.`
          : msg
      )
      return
    }
    sessionStorage.removeItem('verify_email')
    await refreshUser()
    setLoading(false)
    if (data?.user) {
      router.push('/dashboard')
      router.refresh()
    } else {
      router.push('/sign-in')
    }
  }

  if (step === 'verify') return (
    <main className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-600/20 border border-green-500/30 mb-4">
            <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-slate-400 text-sm mt-1">We sent a 6-digit code to <span className="text-white">{email}</span></p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              className="w-full px-4 py-4 bg-slate-800/80 text-white rounded-xl border border-slate-600/50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-center text-3xl tracking-widest font-mono transition-all"
            />
            {info && (
              <p className="text-blue-400/90 text-xs text-center">{info}</p>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading || otp.length !== 6}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/20">
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleResend}
              className="w-full py-2 text-slate-400 hover:text-white text-xs transition-colors"
            >
              Resend verification code
            </button>
          </form>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-slate-400 text-sm mt-1">Start troubleshooting Kubernetes with AI</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl space-y-3">
          <form onSubmit={handleSignUp} className="space-y-3">
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
                type="password" placeholder="Min 6 characters" value={password}
                onChange={e => setPassword(e.target.value)} minLength={6} required
                className="w-full px-3.5 py-2.5 bg-slate-800/80 text-white rounded-xl border border-slate-600/50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-slate-500 text-sm transition-all"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
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
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-slate-500 text-sm text-center mt-5">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 transition-colors">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
