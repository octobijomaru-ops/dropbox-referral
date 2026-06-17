export type JobStatus = 'pending' | 'queued' | 'validating' | 'processing' | 'success' | 'failed' | 'retrying' | 'cancelled' | 'created'
export interface Job {
  id: string; url: string; status: JobStatus; attempts: number; maxAttempts: number;
  capacityGained: number; currentStep: string | null; stepProgress: number;
  errorMessage: string | null; httpStatus: number | null;
  createdAt: string; updatedAt: string; completedAt: string | null;
}
export interface LogEntry { id: string; level: 'info'|'success'|'warning'|'error'; message: string; step: string|null; timestamp: string }
export interface ProcessingSettings { concurrency: number; delayBetweenMs: number; maxRetries: number; targetCapacityMb: number }
export interface Stats { byStatus: Array<{status: JobStatus; count: number; capacityGained: number}>; totalGainedMb: number; targetMb?: number; isProcessorRunning?: boolean; runningWorkers?: number }
export const STATUS_META: Record<JobStatus, {label: string; color: string; badge: string}> = {
  pending: { label: 'Pending', color: 'text-slate-500', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  queued: { label: 'Antrian', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  validating: { label: 'Validasi', color: 'text-sky-600', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  processing: { label: 'Proses', color: 'text-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  success: { label: 'Sukses', color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Gagal', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  retrying: { label: 'Retry', color: 'text-orange-600', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  cancelled: { label: 'Batal', color: 'text-zinc-500', badge: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  created: { label: 'Dibuat', color: 'text-slate-600', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
}
export const STEP_LABELS: Record<string, string> = {
  created: 'Dibuat', pending: 'Menunggu', queued: 'Antrian',
  validating: 'Validasi URL', fetching: 'Mengakses URL',
  accepting: 'Penerimaan Referral', verifying: 'Verifikasi Kapasitas',
  retrying: 'Menyiapkan Retry', failed: 'Gagal', cancelled: 'Dibatalkan',
}
export function formatBytes(mb: number): string { if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB'; return mb + ' MB' }
export function formatTime(iso: string): string { try { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return iso } }
