'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { insforge } from '@/lib/insforge'
import { getAuthHeaders } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const STEPS = [
  { key: 'Checking Pods', icon: '🔍' },
  { key: 'Reading Logs', icon: '📋' },
  { key: 'Analyzing Events', icon: '⚡' },
  { key: 'Inspecting Deployments', icon: '🚀' },
  { key: 'Checking Networking', icon: '🌐' },
  { key: 'Checking Nodes', icon: '🖥️' },
  { key: 'Checking Storage', icon: '💾' },
  { key: 'AI Reasoning', icon: '🤖' },
  { key: 'Root Cause Found', icon: '✅' },
]

interface Cluster { name: string; current: boolean }
interface Diagnosis {
  root_cause: string; explanation: string; fix: string
  kubectl_commands: string[]; prevention: string; confidence: number
}
interface Investigation {
  id: string
  root_cause: string
  confidence: number
  status: string
  created_at: string
  context?: string
  namespace?: string
}

// Kubernetes logo SVG as a watermark component
function K8sWatermark() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Large faded K8s wheel top-right */}
      <svg viewBox="0 0 300 300" className="absolute -top-20 -right-20 w-96 h-96 opacity-[0.04]" fill="white">
        <circle cx="150" cy="150" r="140" stroke="white" strokeWidth="8" fill="none"/>
        <circle cx="150" cy="150" r="30" fill="white"/>
        {[0,45,90,135,180,225,270,315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const x1 = 150 + 35 * Math.cos(rad)
          const y1 = 150 + 35 * Math.sin(rad)
          const x2 = 150 + 120 * Math.cos(rad)
          const y2 = 150 + 120 * Math.sin(rad)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="10" strokeLinecap="round"/>
        })}
      </svg>
      {/* Small faded K8s wheel bottom-left */}
      <svg viewBox="0 0 300 300" className="absolute -bottom-16 -left-16 w-64 h-64 opacity-[0.03]" fill="white">
        <circle cx="150" cy="150" r="140" stroke="white" strokeWidth="8" fill="none"/>
        <circle cx="150" cy="150" r="30" fill="white"/>
        {[0,45,90,135,180,225,270,315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const x1 = 150 + 35 * Math.cos(rad)
          const y1 = 150 + 35 * Math.sin(rad)
          const x2 = 150 + 120 * Math.cos(rad)
          const y2 = 150 + 120 * Math.sin(rad)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="10" strokeLinecap="round"/>
        })}
      </svg>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState('')
  const [clustersLoading, setClustersLoading] = useState(true)
  const [clustersError, setClustersError] = useState('')
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [selectedNamespace, setSelectedNamespace] = useState('all')
  const [investigating, setInvestigating] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState('')
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [history, setHistory] = useState<Investigation[]>([])
  const [error, setError] = useState('')
  const investigationIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/sign-in')
  }, [user, loading, router])

  useEffect(() => {
    if (user) { loadHistory(); loadClusters() }
  }, [user])

  const loadClusters = async () => {
    setClustersLoading(true); setClustersError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/clusters`)
      if (!res.ok) throw new Error(`Failed to fetch clusters (${res.status})`)
      const data = await res.json()
      const list: Cluster[] = data.clusters || []
      setClusters(list)
      const current = list.find(c => c.current) || list[0]
      if (current) {
        setSelectedCluster(current.name)
        loadNamespaces(current.name)
      }
    } catch (e: unknown) {
      setClustersError(e instanceof Error ? e.message : 'Could not load clusters')
    } finally { setClustersLoading(false) }
  }

  const loadNamespaces = async (ctx: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/namespaces?context=${encodeURIComponent(ctx)}`)
      if (!res.ok) return
      const data = await res.json()
      setNamespaces(data.namespaces || [])
    } catch { /* silently ignore */ }
  }

  const loadHistory = async () => {
    const { data } = await insforge.database
      .from('investigations').select('id, root_cause, confidence, status, created_at, context, namespace')
      .order('created_at', { ascending: false }).limit(5)
    if (data) setHistory(data as Investigation[])
  }

  const subscribeRealtime = async (id: string) => {
    try {
      await insforge.realtime.connect()
      await insforge.realtime.subscribe(`investigation:${id}`)
      insforge.realtime.on('progress', (payload: { step: string }) => {
        setCurrentStep(payload.step)
        setCompletedSteps(prev => prev.includes(payload.step) ? prev : [...prev, payload.step])
      })
    } catch {
      // realtime is optional — investigation continues without live updates
    }
  }

  const investigate = async () => {
    if (!selectedCluster) { setError('Please select a cluster first.'); return }
    setInvestigating(true); setCompletedSteps([]); setCurrentStep(''); setDiagnosis(null); setError('')
    const id = crypto.randomUUID()
    investigationIdRef.current = id
    await subscribeRealtime(id)
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 120_000)
      const headers = await getAuthHeaders()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/investigate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          investigation_id: id,
          context: selectedCluster,
          namespace: selectedNamespace === 'all' ? null : selectedNamespace,
        }),
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.status === 401) {
        router.push('/sign-in')
        throw new Error('Session expired. Please sign in again.')
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error: ${res.status}`)
      }
      const data = await res.json()
      setDiagnosis(data.diagnosis)
      // Mark all steps done in case realtime didn't fire
      setCompletedSteps(STEPS.map(s => s.key))
      await loadHistory()
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError')
        setError('Investigation timed out. The cluster may be unreachable.')
      else
        setError(e instanceof Error ? e.message : 'Investigation failed')
    } finally {
      try { insforge.realtime.unsubscribe(`investigation:${investigationIdRef.current!}`) } catch { /* ignore */ }
      setInvestigating(false); setCurrentStep('')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  )

  const confidenceColor = diagnosis
    ? diagnosis.confidence >= 80 ? 'text-green-400' : diagnosis.confidence >= 60 ? 'text-yellow-400' : 'text-red-400'
    : ''

  const clusterLabel = (name: string) =>
    name.includes('arn:aws:eks:') ? name.replace(/arn:aws:eks:[^:]+:[^:]+:cluster\//, '') : name

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <K8sWatermark />

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 right-0 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-white/5 px-6 py-3.5 backdrop-blur-md bg-[#020817]/70 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 300 300" className="w-7 h-7 text-blue-400" fill="currentColor">
              <circle cx="150" cy="150" r="140" stroke="currentColor" strokeWidth="12" fill="none"/>
              <circle cx="150" cy="150" r="28" />
              {[0,45,90,135,180,225,270,315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180
                return <line key={i} x1={150 + 33*Math.cos(rad)} y1={150 + 33*Math.sin(rad)} x2={150 + 118*Math.cos(rad)} y2={150 + 118*Math.sin(rad)} stroke="currentColor" strokeWidth="14" strokeLinecap="round"/>
              })}
            </svg>
            <div>
              <span className="font-bold text-white text-sm">K8s AI Agent</span>
              <span className="text-slate-600 text-xs ml-2">powered by AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/40 rounded-full px-3 py-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-[10px] font-bold">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-slate-300 text-xs hidden sm:block">{user?.email}</span>
            </div>
            <button onClick={signOut} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800/50">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 relative">
        {/* Hero */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-xs text-blue-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
            AI-Powered Kubernetes Diagnostics
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Troubleshoot your <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Kubernetes</span> cluster
          </h1>
          <p className="text-slate-500 text-sm">Select a cluster, click investigate, and let AI find the root cause</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left sidebar */}
          <div className="lg:col-span-2 space-y-4">

            {/* Cluster selector */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                Clusters
              </h3>

              {clustersLoading && (
                <div className="flex items-center gap-2 text-slate-600 text-sm py-3">
                  <div className="w-3 h-3 border border-slate-600 border-t-transparent rounded-full animate-spin" />
                  Fetching from kubeconfig...
                </div>
              )}
              {clustersError && (
                <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 space-y-2">
                  <p className="text-red-400 text-xs">{clustersError}</p>
                  <button onClick={loadClusters} className="text-xs text-blue-400 hover:underline">↺ Retry</button>
                </div>
              )}
              {!clustersLoading && clusters.length === 0 && !clustersError && (
                <p className="text-yellow-500/70 text-xs bg-yellow-500/8 border border-yellow-500/15 rounded-xl p-3">
                  No clusters found in kubeconfig.
                </p>
              )}
              <div className="space-y-1.5">
                {clusters.map(cluster => (
                  <button key={cluster.name} onClick={() => { setSelectedCluster(cluster.name); setSelectedNamespace('all'); loadNamespaces(cluster.name) }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                      selectedCluster === cluster.name
                        ? 'border-blue-500/40 bg-blue-500/10 shadow-sm shadow-blue-500/10'
                        : 'border-white/5 bg-slate-800/30 hover:border-white/10 hover:bg-slate-800/50'
                    }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cluster.current ? 'bg-green-400' : 'bg-slate-600'}`} />
                      <span className={`font-mono text-xs truncate ${selectedCluster === cluster.name ? 'text-white' : 'text-slate-400'}`}>
                        {clusterLabel(cluster.name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {cluster.current && <span className="text-[9px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/20">live</span>}
                      {selectedCluster === cluster.name && <span className="text-blue-400 text-xs">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Namespace selector */}
            {namespaces.length > 0 && (
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Namespace
                </h3>
                <select
                  value={selectedNamespace}
                  onChange={e => setSelectedNamespace(e.target.value)}
                  className="w-full bg-slate-800/60 border border-white/5 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/40 transition-all"
                >
                  <option value="all">All namespaces</option>
                  {namespaces.map(ns => (
                    <option key={ns} value={ns}>{ns}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Investigate button */}
            <button onClick={investigate} disabled={investigating || !selectedCluster}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all ${
                investigating || !selectedCluster
                  ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/20 border border-blue-500/30'
              }`}>
              {investigating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-300/50 border-t-blue-300 rounded-full animate-spin" />
                  Investigating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Investigate Cluster
                </span>
              )}
            </button>

            {/* History */}
            {history.length > 0 && (
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </h3>
                <div className="space-y-2">
                  {history.map(inv => (
                    <Link
                      key={inv.id}
                      href={`/dashboard/history/${inv.id}`}
                      className="flex items-start justify-between gap-2 py-2.5 px-2 -mx-2 rounded-xl border-b border-white/5 last:border-0 hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-300 truncate group-hover:text-white transition-colors">
                          {inv.root_cause || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {new Date(inv.created_at).toLocaleString()}
                          {(inv.context || inv.namespace) && (
                            <span className="text-slate-500">
                              {' · '}
                              {inv.namespace && inv.namespace !== 'all' ? inv.namespace : clusterLabel(inv.context || '')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium ${inv.confidence >= 80 ? 'text-green-400' : inv.confidence >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {inv.confidence}%
                        </span>
                        <span className="text-slate-600 text-xs group-hover:text-blue-400">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right main area */}
          <div className="lg:col-span-3 space-y-4">

            {/* Empty state */}
            {!investigating && completedSteps.length === 0 && !error && (
              <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-12 text-center animate-fade-in relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-5">
                  <svg viewBox="0 0 300 300" className="w-64 h-64" fill="white">
                    <circle cx="150" cy="150" r="140" stroke="white" strokeWidth="8" fill="none"/>
                    <circle cx="150" cy="150" r="30" fill="white"/>
                    {[0,45,90,135,180,225,270,315].map((angle, i) => {
                      const rad = (angle * Math.PI) / 180
                      return <line key={i} x1={150+35*Math.cos(rad)} y1={150+35*Math.sin(rad)} x2={150+120*Math.cos(rad)} y2={150+120*Math.sin(rad)} stroke="white" strokeWidth="10" strokeLinecap="round"/>
                    })}
                  </svg>
                </div>
                <p className="text-slate-400 font-medium relative">Ready to investigate</p>
                <p className="text-slate-600 text-sm mt-1 relative">Select a cluster and click Investigate Cluster</p>
              </div>
            )}

            {/* Progress */}
            {(investigating || completedSteps.length > 0) && (
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {investigating && <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                    {investigating ? 'Investigating...' : 'Complete'}
                  </h3>
                  {!investigating && completedSteps.length > 0 && (
                    <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">✓ Done</span>
                  )}
                </div>
                <div className="space-y-1">
                  {STEPS.map(({ key, icon }) => {
                    const done = completedSteps.includes(key)
                    const active = investigating && currentStep === key
                    return (
                      <div key={key} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        done ? 'bg-green-500/5 border border-green-500/10' :
                        active ? 'bg-blue-500/10 border border-blue-500/20' :
                        'border border-transparent'
                      }`}>
                        <span className="text-sm w-5 text-center">{done ? '✅' : active ? '⟳' : icon}</span>
                        <span className={`text-sm flex-1 ${done ? 'text-green-400' : active ? 'text-blue-300 animate-pulse' : 'text-slate-600'}`}>{key}</span>
                        {done && <span className="text-green-600 text-[10px]">done</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5 animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="text-red-400 font-medium text-sm">Investigation failed</p>
                    <p className="text-red-300/60 text-sm mt-1">{error}</p>
                    {(error.toLowerCase().includes('cluster') || error.toLowerCase().includes('kubectl') || error.toLowerCase().includes('connect')) && (
                      <ul className="text-slate-500 text-xs mt-3 space-y-1">
                        <li>• Verify kubeconfig is configured correctly</li>
                        <li>• Check cluster access and credentials</li>
                        <li>• Ensure kubectl has the required permissions</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Healthy */}
            {!investigating && completedSteps.length > 0 && !diagnosis && !error && (
              <div className="bg-green-500/5 border border-green-500/15 rounded-2xl p-8 text-center animate-fade-in">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-green-400 font-semibold">No critical issues detected</p>
                <p className="text-slate-500 text-sm mt-1">Cluster appears healthy</p>
              </div>
            )}

            {/* Diagnosis */}
            {diagnosis && (
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm animate-fade-in space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                    🔬 Diagnosis
                  </h3>
                  <span className={`text-sm font-bold ${confidenceColor} bg-slate-800/50 px-3 py-1 rounded-full border border-white/5`}>
                    {diagnosis.confidence}% confidence
                  </span>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Root Cause</p>
                  <p className="text-white font-semibold">{diagnosis.root_cause}</p>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Explanation</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{diagnosis.explanation}</p>
                </div>

                <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/15">
                  <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-2">Suggested Fix</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{diagnosis.fix}</p>
                </div>

                {diagnosis.kubectl_commands?.length > 0 && (
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">kubectl Commands</p>
                    <div className="space-y-2">
                      {diagnosis.kubectl_commands.map((cmd, i) => (
                        <div key={i} className="flex items-start gap-2 bg-[#0d1117] rounded-lg px-3 py-2.5 border border-slate-700/30">
                          <span className="text-green-500 font-mono text-xs mt-0.5 shrink-0">$</span>
                          <code className="text-green-400 text-xs font-mono break-all">{cmd}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diagnosis.prevention && (
                  <div className="bg-violet-500/5 rounded-xl p-4 border border-violet-500/15">
                    <p className="text-[10px] text-violet-400 uppercase tracking-widest mb-2">Prevention</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{diagnosis.prevention}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
