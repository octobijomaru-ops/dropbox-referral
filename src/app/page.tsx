'use client'
import { useState } from 'react'
import { useReferralSocket } from '@/hooks/use-referral-socket'
import { StatsPanel } from '@/components/referral/stats-panel'
import { InputPanel } from '@/components/referral/input-panel'
import { JobList } from '@/components/referral/job-list'
import { LogPanel } from '@/components/referral/log-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Cloud, Zap, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
export default function Home() {
  const referral = useReferralSocket()
  const [submitting, setSubmitting] = useState(false)
  const handleSubmit = async (urls: string[]) => { setSubmitting(true); try { await referral.submitUrls(urls) } finally { setSubmitting(false) } }
  const selectedLogs = referral.selectedJobId ? (referral.logs[referral.selectedJobId] ?? []) : []
  const selectedJob = referral.jobs.find((j) => j.id === referral.selectedJobId)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/40">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center text-white shadow-sm"><Cloud className="h-5 w-5" /></div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-800">Dropbox Referral Booster</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Otomatisasi penambahan kapasitas via link referral Dropbox</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={'text-xs ' + (referral.connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>{referral.connected ? (<><Wifi className="h-3 w-3 mr-1" />Worker connected</>) : (<><WifiOff className="h-3 w-3 mr-1" />Disconnected</>)}</Badge>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={referral.kickProcessor}><Zap className="h-3.5 w-3.5 mr-1" />Kick worker</Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6 space-y-5">
        <Card className="border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-emerald-50/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-white border border-sky-100 flex items-center justify-center flex-shrink-0 shadow-sm"><ShieldCheck className="h-5 w-5 text-sky-600" /></div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-800">Cara kerja otomatisasi</h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">Tempelkan link referral Dropbox, lalu worker akan <strong>memvalidasi format URL</strong>, <strong>mengirim HTTP request</strong> ke link tersebut untuk memicu tracking referral, dan <strong>menyimulasikan alur penerimaan referral</strong> dengan retry otomatis bila gagal. Setiap referral sukses menambah <strong>+500 MB</strong> kapasitas.</p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Catatan: penyelesaian referral Dropbox yang sebenarnya tetap memerlukan akun Dropbox baru yang valid. Tool ini melakukan validasi &amp; HTTP request nyata ke URL referral serta menyimulasikan alur completion.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <StatsPanel stats={referral.stats} />
        <InputPanel onSubmit={handleSubmit} onClearAll={referral.clearAll} settings={referral.settings} onUpdateSettings={referral.updateSettings} submitting={submitting} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <JobList jobs={referral.jobs} selectedId={referral.selectedJobId} onSelect={referral.setSelectedJobId} onRetry={referral.retryJob} onCancel={referral.cancelJob} onDelete={referral.deleteJob} />
          <LogPanel jobId={referral.selectedJobId} logs={selectedLogs} jobUrl={selectedJob?.url} />
        </div>
      </main>
      <footer className="mt-auto border-t bg-white"><div className="container mx-auto max-w-7xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2"><p className="text-xs text-slate-500">Dropbox Referral Booster · Next.js + Socket.IO</p><span className="text-xs text-slate-400">v1.0.0</span></div></footer>
    </div>
  )
}
