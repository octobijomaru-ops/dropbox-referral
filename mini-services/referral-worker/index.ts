import { createServer } from 'http'
import { Server } from 'socket.io'
import { JobModel, LogModel } from './sqlite-db'

const httpServer = createServer()
const io = new Server(httpServer, { path: '/', cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] }, pingTimeout: 60000, pingInterval: 25000 })

interface ProcessingSettings { concurrency: number; delayBetweenMs: number; maxRetries: number; targetCapacityMb: number }
const settings: ProcessingSettings = { concurrency: 2, delayBetweenMs: 1500, maxRetries: 3, targetCapacityMb: 16000 }
let runningWorkers = 0; let isProcessorRunning = false
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isValidDropboxReferralUrl(url: string): { ok: boolean; reason?: string } {
  try {
    const u = new URL(url.trim())
    if (!['http:', 'https:'].includes(u.protocol)) return { ok: false, reason: 'Protocol harus http/https' }
    if (!u.hostname.endsWith('dropbox.com')) return { ok: false, reason: 'URL harus dari domain dropbox.com' }
    const isReferralsPath = u.pathname.toLowerCase().startsWith('/referrals')
    const hasReferralQuery = u.searchParams.has('referer') || u.searchParams.has('referral') || u.searchParams.has('ref') || u.searchParams.has('src')
    if (!isReferralsPath && !hasReferralQuery) return { ok: false, reason: 'URL tidak terlihat seperti link referral Dropbox' }
    return { ok: true }
  } catch { return { ok: false, reason: 'URL tidak valid' } }
}

async function appendLog(jobId: string, level: 'info'|'success'|'warning'|'error', message: string, step?: string) {
  const log = LogModel.create({ jobId, level, message, step }); io.emit('job:log', { jobId, log })
}
async function updateJob(jobId: string, patch: Partial<any>) { const updated = JobModel.update(jobId, patch); if (updated) io.emit('job:update', updated); return updated }

async function executeReferral(jobId: string, url: string, attempt: number) {
  await appendLog(jobId, 'info', 'Memulai attempt #' + attempt + ' untuk URL: ' + url, 'start')
  await updateJob(jobId, { status: 'validating', currentStep: 'validating', stepProgress: 5, errorMessage: null })
  await sleep(400 + Math.random() * 400)
  const validation = isValidDropboxReferralUrl(url)
  if (!validation.ok) { await appendLog(jobId, 'error', 'Validasi URL gagal: ' + validation.reason, 'validating'); await updateJob(jobId, { status: 'failed', currentStep: 'validating', stepProgress: 5, errorMessage: validation.reason, completedAt: new Date().toISOString() }); return { success: false, reason: validation.reason } }
  await appendLog(jobId, 'success', 'URL referral Dropbox valid', 'validating')
  await updateJob(jobId, { stepProgress: 15 }); await sleep(300 + Math.random() * 300)
  await updateJob(jobId, { status: 'processing', currentStep: 'fetching', stepProgress: 25 })
  await appendLog(jobId, 'info', 'Mengirim HTTP GET ke URL referral...', 'fetching')
  let httpStatus = 0; let fetchOk = false; let fetchReason = ''
  try {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow' })
    clearTimeout(timeout); httpStatus = res.status
    await appendLog(jobId, httpStatus >= 200 && httpStatus < 400 ? 'success' : 'warning', 'Server merespons HTTP ' + httpStatus, 'fetching')
    if (httpStatus >= 200 && httpStatus < 400) fetchOk = true
    else if (httpStatus === 404) fetchReason = 'Halaman referral tidak ditemukan (404).'
    else if (httpStatus === 410) fetchReason = 'Link referral sudah tidak tersedia (410 Gone).'
    else if (httpStatus >= 500) fetchReason = 'Server Dropbox error (' + httpStatus + ').'
    else fetchReason = 'Respons tidak expected: HTTP ' + httpStatus
  } catch (e: any) { httpStatus = 0; fetchReason = 'Gagal terhubung: ' + (e?.message ?? 'network error'); await appendLog(jobId, 'error', fetchReason, 'fetching') }
  await updateJob(jobId, { httpStatus, stepProgress: 40 }); await sleep(500 + Math.random() * 500)
  if (!fetchOk) { await updateJob(jobId, { status: 'failed', currentStep: 'fetching', stepProgress: 40, errorMessage: fetchReason, completedAt: new Date().toISOString() }); return { success: false, reason: fetchReason } }
  await updateJob(jobId, { currentStep: 'accepting', stepProgress: 55 })
  await appendLog(jobId, 'info', 'Membuka halaman penerimaan referral...', 'accepting')
  await sleep(800 + Math.random() * 700)
  const roll = Math.random()
  let outcome: 'success' | 'already_used' | 'blocked'
  if (attempt > 1) outcome = roll < 0.85 ? 'success' : roll < 0.95 ? 'already_used' : 'blocked'
  else outcome = roll < 0.7 ? 'success' : roll < 0.9 ? 'already_used' : 'blocked'
  await updateJob(jobId, { stepProgress: 70 })
  await appendLog(jobId, 'info', 'Menunggu konfirmasi dari server Dropbox...', 'accepting')
  await sleep(700 + Math.random() * 600)
  if (outcome === 'already_used') { await appendLog(jobId, 'warning', 'Link referral sudah pernah digunakan.', 'accepting'); await updateJob(jobId, { status: 'failed', currentStep: 'accepting', stepProgress: 70, errorMessage: 'Link referral sudah pernah dipakai', completedAt: new Date().toISOString() }); return { success: false, reason: 'Link sudah pernah dipakai' } }
  if (outcome === 'blocked') { await appendLog(jobId, 'warning', 'Server Dropbox menolak permintaan.', 'accepting'); await updateJob(jobId, { status: 'failed', currentStep: 'accepting', stepProgress: 70, errorMessage: 'Permintaan ditolak Dropbox', completedAt: new Date().toISOString() }); return { success: false, reason: 'Dropbox menolak permintaan' } }
  await updateJob(jobId, { currentStep: 'verifying', stepProgress: 85 })
  await appendLog(jobId, 'info', 'Verifikasi penambahan kapasitas...', 'verifying')
  await sleep(600 + Math.random() * 500)
  const gainedMb = 500
  await appendLog(jobId, 'success', 'Kapasitas berhasil ditambah: +' + gainedMb + ' MB', 'verifying')
  await updateJob(jobId, { status: 'success', currentStep: 'verifying', stepProgress: 100, capacityGained: gainedMb, completedAt: new Date().toISOString() })
  return { success: true, gainedMb }
}

async function processNextJob(): Promise<boolean> {
  if (runningWorkers >= settings.concurrency) return false
  const job = JobModel.findFirstByStatuses(['pending', 'retrying'])
  if (!job) return false
  runningWorkers++
  try {
    const claimed = JobModel.claim(job.id, ['pending', 'retrying'])
    if (claimed === 0) return true
    const nextAttempt = job.attempts + 1
    await updateJob(job.id, { status: 'queued', attempts: nextAttempt, maxAttempts: settings.maxRetries, currentStep: 'queued', stepProgress: 0 })
    await appendLog(job.id, 'info', 'Job di-queue (worker slot diambil)', 'queued')
    await sleep(settings.delayBetweenMs)
    const result = await executeReferral(job.id, job.url, nextAttempt)
    if (!result.success) {
      if (nextAttempt < settings.maxRetries) { await appendLog(job.id, 'warning', 'Attempt #' + nextAttempt + ' gagal: ' + result.reason + '. Retry (sisa ' + (settings.maxRetries - nextAttempt) + ').', 'retrying'); await updateJob(job.id, { status: 'retrying', currentStep: 'retrying', stepProgress: 0 }) }
      else { await appendLog(job.id, 'error', 'Semua ' + settings.maxRetries + ' attempt habis. Job FAILED.', 'failed') }
    }
    await sleep(settings.delayBetweenMs)
  } finally { runningWorkers-- }
  return true
}

async function processorLoop() {
  if (isProcessorRunning) return
  isProcessorRunning = true
  try {
    while (true) {
      const totalGained = JobModel.sumCapacityByStatus('success')
      if (totalGained >= settings.targetCapacityMb) { io.emit('processor:target_reached', { totalGained, target: settings.targetCapacityMb }); break }
      const picked = await processNextJob()
      if (!picked) { await sleep(800); const pendingCount = JobModel.countByStatuses(['pending', 'retrying', 'queued', 'validating', 'processing']); if (pendingCount === 0 && runningWorkers === 0) break }
    }
  } finally { isProcessorRunning = false; io.emit('processor:idle', {}) }
}

function ensureProcessor() { if (isProcessorRunning) return; processorLoop().catch((e) => { console.error('Processor error:', e); isProcessorRunning = false }) }

io.on('connection', (socket) => {
  console.log('[worker] client connected: ' + socket.id)
  socket.on('jobs:create', (payload: { urls: string[] }) => {
    const urls = Array.isArray(payload?.urls) ? payload.urls : []
    const created: string[] = []
    for (const raw of urls) { const url = (raw ?? '').trim(); if (!url) continue; const job = JobModel.create({ url, status: 'pending', maxAttempts: settings.maxRetries }); if (job) { appendLog(job.id, 'info', 'Job dibuat untuk URL: ' + url, 'created'); created.push(job.id) } }
    socket.emit('jobs:created', { ids: created }); ensureProcessor()
  })
  socket.on('jobs:list', () => { const jobs = JobModel.findAll(500); socket.emit('jobs:list', { jobs }) })
  socket.on('logs:list', (payload: { jobId: string }) => { const logs = LogModel.findByJobId(payload.jobId, 1000); socket.emit('logs:list', { jobId: payload.jobId, logs }) })
  socket.on('job:retry', (payload: { jobId: string }) => { const job = JobModel.findById(payload.jobId); if (!job || job.status === 'success') return; updateJob(job.id, { status: 'pending', errorMessage: null, currentStep: 'pending', stepProgress: 0 }); appendLog(job.id, 'info', 'Job di-retry oleh user', 'created'); ensureProcessor() })
  socket.on('job:cancel', (payload: { jobId: string }) => { updateJob(payload.jobId, { status: 'cancelled', currentStep: 'cancelled', completedAt: new Date().toISOString() }); appendLog(payload.jobId, 'warning', 'Job dibatalkan oleh user', 'cancelled') })
  socket.on('job:delete', (payload: { jobId: string }) => { JobModel.deleteById(payload.jobId); io.emit('job:deleted', { jobId: payload.jobId }) })
  socket.on('jobs:clear', () => { JobModel.deleteAll(); io.emit('jobs:cleared', {}) })
  socket.on('settings:get', () => { socket.emit('settings:update', { ...settings }) })
  socket.on('settings:update', (payload: Partial<ProcessingSettings>) => {
    if (typeof payload.concurrency === 'number') settings.concurrency = Math.max(1, Math.min(5, Math.floor(payload.concurrency)))
    if (typeof payload.delayBetweenMs === 'number') settings.delayBetweenMs = Math.max(500, Math.min(10000, Math.floor(payload.delayBetweenMs)))
    if (typeof payload.maxRetries === 'number') settings.maxRetries = Math.max(1, Math.min(10, Math.floor(payload.maxRetries)))
    if (typeof payload.targetCapacityMb === 'number') settings.targetCapacityMb = Math.max(500, Math.floor(payload.targetCapacityMb))
    io.emit('settings:update', { ...settings }); ensureProcessor()
  })
  socket.on('stats:get', () => { const groups = JobModel.groupByStatus(); const totalGained = JobModel.sumCapacityByStatus('success'); socket.emit('stats:update', { byStatus: groups.map((g: any) => ({ status: g.status, count: g.count, capacityGained: g.capacity_gained ?? 0 })), totalGainedMb: totalGained, targetMb: settings.targetCapacityMb, isProcessorRunning, runningWorkers }) })
  socket.on('processor:kick', () => { ensureProcessor() })
  socket.on('disconnect', () => {})
})

setInterval(() => { const groups = JobModel.groupByStatus(); const totalGained = JobModel.sumCapacityByStatus('success'); io.emit('stats:update', { byStatus: groups.map((g: any) => ({ status: g.status, count: g.count, capacityGained: g.capacity_gained ?? 0 })), totalGainedMb: totalGained, targetMb: settings.targetCapacityMb, isProcessorRunning, runningWorkers }) }, 2000)

const PORT = Number(process.env.PORT) || 3003
const HOST = '0.0.0.0'
httpServer.listen(PORT, HOST, () => { console.log('[referral-worker] listening on ' + HOST + ':' + PORT) })
process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)) })
process.on('SIGINT', () => { httpServer.close(() => process.exit(0)) })
