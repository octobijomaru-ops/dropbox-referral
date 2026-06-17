'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { HardDrive, CheckCircle2, XCircle, Clock, Loader2, TrendingUp } from 'lucide-react'
import { formatBytes, type Stats } from '@/lib/referral-types'
export function StatsPanel({ stats }: { stats: Stats | null }) {
  const byStatus = stats?.byStatus ?? []
  const total = byStatus.reduce((s, x) => s + x.count, 0)
  const success = byStatus.find((x) => x.status === 'success')?.count ?? 0
  const failed = byStatus.find((x) => x.status === 'failed')?.count ?? 0
  const pending = (byStatus.find((x) => x.status === 'pending')?.count ?? 0) + (byStatus.find((x) => x.status === 'queued')?.count ?? 0) + (byStatus.find((x) => x.status === 'validating')?.count ?? 0) + (byStatus.find((x) => x.status === 'processing')?.count ?? 0) + (byStatus.find((x) => x.status === 'retrying')?.count ?? 0)
  const totalGained = stats?.totalGainedMb ?? 0
  const target = stats?.targetMb ?? 16000
  const targetPct = Math.min(100, Math.round((totalGained / target) * 100))
  const successRate = total > 0 ? Math.round((success / (success + failed)) * 100) : 0
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-emerald-700/80 flex items-center justify-between">Kapasitas Didapat<HardDrive className="h-4 w-4 text-emerald-600" /></CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums">{formatBytes(totalGained)}</div>
          <p className="text-xs text-emerald-600/70 mt-1">Target: {formatBytes(target)}</p>
          <Progress value={targetPct} className="h-1.5 mt-2 bg-emerald-100" />
        </CardContent>
      </Card>
      <Card className="border-emerald-100">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-600 flex items-center justify-between">Sukses<CheckCircle2 className="h-4 w-4 text-emerald-600" /></CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{success}</div>
          <p className="text-xs text-slate-500 mt-1">dari {total} total job</p>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" />{successRate}% success rate</div>
        </CardContent>
      </Card>
      <Card className="border-rose-100">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-600 flex items-center justify-between">Gagal<XCircle className="h-4 w-4 text-rose-600" /></CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{failed}</div>
          <p className="text-xs text-slate-500 mt-1">{total > 0 ? Math.round((failed / total) * 100) : 0}% dari total</p>
        </CardContent>
      </Card>
      <Card className="border-sky-100">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-600 flex items-center justify-between">Antrian Aktif{pending > 0 ? <Loader2 className="h-4 w-4 text-sky-600 animate-spin" /> : <Clock className="h-4 w-4 text-sky-600" />}</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{pending}</div>
          <p className="text-xs text-slate-500 mt-1">{stats?.isProcessorRunning ? 'Worker aktif (' + (stats.runningWorkers ?? 0) + ' berjalan)' : 'Worker idle'}</p>
        </CardContent>
      </Card>
    </div>
  )
}
