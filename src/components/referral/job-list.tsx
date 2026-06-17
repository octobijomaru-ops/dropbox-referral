'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RotateCcw, XCircle, Trash2, CheckCircle2, Loader2, Clock, AlertTriangle, ExternalLink } from 'lucide-react'
import { STATUS_META, STEP_LABELS, formatBytes, formatTime, type Job } from '@/lib/referral-types'
function StatusBadge({ status }: { status: Job['status'] }) { const meta = STATUS_META[status] ?? STATUS_META.pending; return <Badge variant="outline" className={'text-xs ' + meta.badge}>{meta.label}</Badge> }
function StatusIcon({ status }: { status: Job['status'] }) {
  switch (status) {
    case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'failed': return <XCircle className="h-4 w-4 text-rose-600" />
    case 'cancelled': return <XCircle className="h-4 w-4 text-zinc-400" />
    case 'pending': case 'queued': return <Clock className="h-4 w-4 text-amber-500" />
    case 'validating': case 'processing': case 'retrying': return <Loader2 className="h-4 w-4 text-sky-600 animate-spin" />
    default: return <Clock className="h-4 w-4 text-slate-400" />
  }
}
function truncateUrl(url: string, max = 60): string { return url.length <= max ? url : url.slice(0, max - 3) + '...' }
export function JobList({ jobs, selectedId, onSelect, onRetry, onCancel, onDelete }: {
  jobs: Job[]; selectedId: string | null; onSelect: (id: string) => void; onRetry: (id: string) => void; onCancel: (id: string) => void; onDelete: (id: string) => void
}) {
  if (jobs.length === 0) {
    return (<Card><CardHeader><CardTitle className="text-base">Antrian Pemrosesan</CardTitle></CardHeader><CardContent><div className="flex flex-col items-center justify-center py-12 text-center"><Clock className="h-10 w-10 text-slate-300 mb-3" /><p className="text-sm text-slate-500">Belum ada job referral.</p><p className="text-xs text-slate-400 mt-1">Input link Dropbox di panel atas untuk memulai.</p></div></CardContent></Card>)
  }
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between"><span>Antrian Pemrosesan</span><Badge variant="secondary" className="text-xs">{jobs.length} job</Badge></CardTitle></CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[520px]">
          <div className="divide-y">
            {jobs.map((job) => {
              const isActive = ['validating', 'processing', 'queued', 'retrying'].includes(job.status)
              const isSelected = selectedId === job.id
              return (
                <div key={job.id} className={'p-3 cursor-pointer transition-colors ' + (isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50')} onClick={() => onSelect(job.id)}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5"><StatusIcon status={job.status} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={job.status} />
                        {job.capacityGained > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">+{formatBytes(job.capacityGained)}</Badge>}
                        {job.httpStatus !== null && <Badge variant="outline" className="text-xs text-slate-500">HTTP {job.httpStatus}</Badge>}
                        <span className="text-xs text-slate-400 ml-auto">{formatTime(job.updatedAt)}</span>
                      </div>
                      <a href={job.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block mt-1.5 text-xs font-mono text-slate-700 hover:text-emerald-700 hover:underline truncate" title={job.url}>{truncateUrl(job.url)} <ExternalLink className="inline h-3 w-3" /></a>
                      {job.currentStep && STEP_LABELS[job.currentStep] && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500">{STEP_LABELS[job.currentStep]}</span>
                          {isActive && <Progress value={job.stepProgress} className="h-1.5 flex-1 bg-slate-100" />}
                          {isActive && <span className="text-xs text-slate-400 tabular-nums">{job.stepProgress}%</span>}
                        </div>
                      )}
                      {job.attempts > 0 && <p className="text-xs text-slate-500 mt-1">Attempt {job.attempts}/{job.maxAttempts}{job.status === 'failed' && job.errorMessage && <span className="text-rose-600 ml-1">· {job.errorMessage}</span>}</p>}
                      <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                        {(job.status === 'failed' || job.status === 'cancelled') && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onRetry(job.id)}><RotateCcw className="h-3 w-3 mr-1" />Retry</Button>}
                        {isActive && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700" onClick={() => onCancel(job.id)}><XCircle className="h-3 w-3 mr-1" />Batalkan</Button>}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onDelete(job.id)}><Trash2 className="h-3 w-3 mr-1" />Hapus</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
