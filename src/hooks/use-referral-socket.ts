'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Job, LogEntry, ProcessingSettings, Stats } from '@/lib/referral-types'
interface UseReferralSocketResult {
  connected: boolean; jobs: Job[]; logs: Record<string, LogEntry[]>; settings: ProcessingSettings | null; stats: Stats | null
  selectedJobId: string | null; setSelectedJobId: (id: string | null) => void
  submitUrls: (urls: string[]) => Promise<void>; retryJob: (id: string) => void; cancelJob: (id: string) => void; deleteJob: (id: string) => void; clearAll: () => void; updateSettings: (s: Partial<ProcessingSettings>) => void; kickProcessor: () => void
}
export function useReferralSocket(): UseReferralSocketResult {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [logsByJob, setLogsByJob] = useState<Record<string, LogEntry[]>>({})
  const [settings, setSettings] = useState<ProcessingSettings | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  useEffect(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL
    let socketUrl: string; let socketOpts: any = { transports: ['polling'], forceNew: true, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 5000, timeout: 10000 }
    if (workerUrl) { socketUrl = workerUrl; socketOpts.path = '/' }
    else if (typeof window !== 'undefined') {
      const host = window.location.hostname
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') { socketUrl = 'http://' + host + ':3003'; socketOpts.path = '/' }
      else { socketUrl = window.location.origin; socketOpts.path = '/'; socketOpts.query = { XTransformPort: '3003' } }
    } else { socketUrl = '/'; socketOpts.path = '/' }
    const socket = io(socketUrl, socketOpts)
    socketRef.current = socket
    socket.on('connect', () => { setConnected(true); socket.emit('jobs:list'); socket.emit('settings:get'); socket.emit('stats:get') })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', (err: any) => { console.error('[referral] socket connect_error:', err.message) })
    socket.on('jobs:list', (data: { jobs: Job[] }) => { setJobs(data.jobs) })
    socket.on('jobs:created', () => { socket.emit('jobs:list'); socket.emit('stats:get') })
    socket.on('job:update', (job: Job) => { setJobs((prev) => { const idx = prev.findIndex((j) => j.id === job.id); if (idx === -1) return [job, ...prev]; const next = [...prev]; next[idx] = job; return next }) })
    socket.on('job:log', (payload: { jobId: string; log: LogEntry }) => { setLogsByJob((prev) => { const cur = prev[payload.jobId] ?? []; if (cur.find((l) => l.id === payload.log.id)) return prev; return { ...prev, [payload.jobId]: [...cur, payload.log] } }) })
    socket.on('logs:list', (payload: { jobId: string; logs: LogEntry[] }) => { setLogsByJob((prev) => ({ ...prev, [payload.jobId]: payload.logs })) })
    socket.on('job:deleted', (payload: { jobId: string }) => { setJobs((prev) => prev.filter((j) => j.id !== payload.jobId)); setLogsByJob((prev) => { const next = { ...prev }; delete next[payload.jobId]; return next }); setSelectedJobId((cur) => (cur === payload.jobId ? null : cur)) })
    socket.on('jobs:cleared', () => { setJobs([]); setLogsByJob({}); setSelectedJobId(null) })
    socket.on('settings:update', (s: ProcessingSettings) => { setSettings(s) })
    socket.on('stats:update', (s: Stats) => { setStats(s) })
    socket.on('processor:idle', () => { socket.emit('stats:get') })
    socket.on('processor:target_reached', () => { socket.emit('stats:get') })
    return () => { socket.disconnect() }
  }, [])
  const submitUrls = useCallback(async (urls: string[]) => { return new Promise<void>((resolve) => { const socket = socketRef.current; if (!socket || !connected) { resolve(); return }; socket.emit('jobs:create', { urls }); setTimeout(() => resolve(), 300) }) }, [connected])
  const retryJob = useCallback((id: string) => { socketRef.current?.emit('job:retry', { jobId: id }) }, [])
  const cancelJob = useCallback((id: string) => { socketRef.current?.emit('job:cancel', { jobId: id }) }, [])
  const deleteJob = useCallback((id: string) => { socketRef.current?.emit('job:delete', { jobId: id }) }, [])
  const clearAll = useCallback(() => { socketRef.current?.emit('jobs:clear') }, [])
  const updateSettings = useCallback((s: Partial<ProcessingSettings>) => { socketRef.current?.emit('settings:update', s) }, [])
  const kickProcessor = useCallback(() => { socketRef.current?.emit('processor:kick') }, [])
  useEffect(() => { if (!selectedJobId || !connected) return; socketRef.current?.emit('logs:list', { jobId: selectedJobId }) }, [selectedJobId, connected])
  return { connected, jobs, logs: logsByJob, settings, stats, selectedJobId, setSelectedJobId, submitUrls, retryJob, cancelJob, deleteJob, clearAll, updateSettings, kickProcessor }
}
