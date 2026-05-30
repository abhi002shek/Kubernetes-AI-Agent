'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/context/AuthContext'

interface Diagnosis {
  root_cause: string
  explanation: string
  fix: string
  kubectl_commands: string[]
  prevention: string
  confidence: number
}

interface Investigation {
  id: string
  root_cause: string
  confidence: number
  status: string
  context: string | null
  namespace: string | null
  diagnosis: Diagnosis | null
  created_at: string
}

interface ProgressStep {
  id: string
  step: string
  status: string
  created_at: string
}

const STEPS_ORDER = [
  'Checking Pods', 'Reading Logs', 'Analyzing Events', 'Inspecting Deployments',
  'Checking Networking', 'Checking Nodes', 'Checking Storage', 'AI Reasoning', 'Root Cause Found',
]

function clusterLabel(name: string) {
  if (!name) return '—'
  return name.includes('arn:aws:eks:')
    ? name.replace(/arn:aws:eks:[^:]+:[^:]+:cluster\//, '')
    : name
}

export default function InvestigationHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [investigation, setInvestigation] = useState<Investigation | null>(null)
  const [steps, setSteps] = useState<ProgressStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/sign-in')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user || !id) return
    void load()
  }, [user, id])

  const load = async () => {
    setLoading(true)
    setError('')
    const { data: inv, error: invErr } = await insforge.database
      .from('investigations')
      .select('id, root_cause, confidence, status, context, namespace, diagnosis, created_at')
      .eq('id', id)
      .maybeSingle()

    if (invErr || !inv) {
      setError('Investigation not found.')
      setLoading(false)
      return
    }

    setInvestigation(inv as Investigation)

    const { data: progress } = await insforge.database
      .from('investigation_progress')
      .select('id, step, status, created_at')
      .eq('investigation_id', id)
      .order('created_at', { ascending: true })

    setSteps((progress as ProgressStep[]) || [])
    setLoading(false)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !investigation) {
    return (
      <div className="min-h-screen bg-[#020817] text-white flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-400">{error || 'Not found'}</p>
        <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">← Back to dashboard</Link>
      </div>
    )
  }

  const d = investigation.diagnosis
  const confidenceColor = investigation.confidence >= 80 ? 'text-green-400' : investigation.confidence >= 60 ? 'text-yellow-400' : 'text-red-400'
  const sortedSteps = [...steps].sort((a, b) => {
    const ai = STEPS_ORDER.indexOf(a.step)
    const bi = STEPS_ORDER.indexOf(b.step)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <header className="border-b border-white/5 px-6 py-3.5 bg-[#020817]/70 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
          <span className={`text-sm font-bold ${confidenceColor}`}>{investigation.confidence}% confidence</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Investigation</p>
          <h1 className="text-xl font-bold text-white leading-snug">{investigation.root_cause}</h1>
          <p className="text-slate-500 text-sm mt-2">
            {new Date(investigation.created_at).toLocaleString()}
            {investigation.context && (
              <> · Cluster <span className="text-slate-400 font-mono">{clusterLabel(investigation.context)}</span></>
            )}
            {investigation.namespace && investigation.namespace !== 'all' && (
              <> · Namespace <span className="text-slate-400 font-mono">{investigation.namespace}</span></>
            )}
          </p>
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border ${
            investigation.status === 'completed'
              ? 'text-green-400 bg-green-500/10 border-green-500/20'
              : investigation.status === 'failed'
                ? 'text-red-400 bg-red-500/10 border-red-500/20'
                : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
          }`}>
            {investigation.status}
          </span>
        </div>

        {sortedSteps.length > 0 && (
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Investigation steps</h2>
            <div className="space-y-1">
              {sortedSteps.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
                  <span className="text-sm">✅</span>
                  <span className="text-sm text-green-400 flex-1">{s.step}</span>
                  <span className="text-[10px] text-slate-600">{new Date(s.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {d ? (
          <div className="space-y-4">
            <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Explanation</p>
              <p className="text-slate-300 text-sm leading-relaxed">{d.explanation}</p>
            </section>

            <section className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
              <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-2">Suggested fix</p>
              <p className="text-slate-300 text-sm leading-relaxed">{d.fix}</p>
            </section>

            {d.kubectl_commands?.length > 0 && (
              <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">kubectl commands</p>
                <div className="space-y-2">
                  {d.kubectl_commands.map((cmd, i) => (
                    <div key={i} className="flex items-start gap-2 bg-[#0d1117] rounded-lg px-3 py-2.5 border border-slate-700/30">
                      <span className="text-green-500 font-mono text-xs shrink-0">$</span>
                      <code className="text-green-400 text-xs font-mono break-all">{cmd}</code>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {d.prevention && (
              <section className="bg-violet-500/5 border border-violet-500/15 rounded-2xl p-5">
                <p className="text-[10px] text-violet-400 uppercase tracking-widest mb-2">Prevention</p>
                <p className="text-slate-400 text-sm leading-relaxed">{d.prevention}</p>
              </section>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No detailed diagnosis stored for this investigation.</p>
        )}
      </main>
    </div>
  )
}
