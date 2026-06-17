export type JobStatus =
  | 'pending' | 'queued' | 'validating'
  | 'signup_pending' | 'signup_completed'
  | 'email_verification_pending' | 'email_verification_completed'
  | 'app_install_pending' | 'app_install_completed'
  | 'referral_success' | 'processing' | 'success'
  | 'failed' | 'retrying' | 'cancelled' | 'created'

export interface Job {
  id: string; url: string; email: string | null
  status: JobStatus; attempts: number; maxAttempts: number
  capacityGained: number; currentStep: string | null; stepProgress: number
  errorMessage: string | null; httpStatus: number | null
  createdAt: string; updatedAt: string; completedAt: string | null
}

export interface LogEntry {
  id: string; level: 'info'|'success'|'warning'|'error'
  message: string; step: string | null; timestamp: string
}

export interface ProcessingSettings {
  concurrency: number; delayBetweenMs: number
  maxRetries: number; targetCapacityMb: number
}

export interface Stats {
  byStatus: Array<{ status: JobStatus; count: number; capacityGained: number }>
  totalGainedMb: number; targetMb?: number
  isProcessorRunning?: boolean; runningWorkers?: number
}

export const STATUS_META: Record<JobStatus, { label: string; color: string; badge: string }> = {
  pending: { label: 'Pending', color: 'text-slate-500', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  queued: { label: 'Antrian', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  validating: { label: 'Validasi', color: 'text-sky-600', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  signup_pending: { label: 'Signup', color: 'text-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  signup_completed: { label: 'Signup OK', color: 'text-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  email_verification_pending: { label: 'Verifikasi Email', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  email_verification_completed: { label: 'Email OK', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  app_install_pending: { label: 'Install App', color: 'text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  app_install_completed: { label: 'App OK', color: 'text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  referral_success: { label: 'Sukses', color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  processing: { label: 'Proses', color: 'text-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  success: { label: 'Sukses', color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Gagal', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  retrying: { label: 'Retry', color: 'text-orange-600', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  cancelled: { label: 'Batal', color: 'text-zinc-500', badge: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  created: { label: 'Dibuat', color: 'text-slate-600', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export const STEP_LABELS: Record<string, string> = {
  created: 'Dibuat', pending: 'Menunggu', queued: 'Antrian',
  validating: 'Validasi URL & Email',
  signup_started: 'Memulai Signup', signup_submit: 'Mengirim Form Signup',
  signup_completed: 'Signup Selesai',
  email_verification_pending: 'Menunggu Verifikasi Email',
  email_verification_completed: 'Email Terverifikasi',
  app_install_pending: 'Menunggu Install App',
  app_install_completed: 'App Terinstall',
  referral_verifying: 'Verifikasi Kapasitas',
  referral_success: 'Referral Sukses',
  fetching: 'Mengakses URL', accepting: 'Penerimaan Referral',
  verifying: 'Verifikasi Kapasitas', retrying: 'Menyiapkan Retry',
  failed: 'Gagal', cancelled: 'Dibatalkan',
}

export function formatBytes(mb: number): string {
  if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB'
  return mb + ' MB'
}

export function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return iso }
}

export const MANUAL_STEPS: JobStatus[] = ['email_verification_pending', 'app_install_pending']
export function isManualStep(status: JobStatus): boolean { return MANUAL_STEPS.includes(status) }
