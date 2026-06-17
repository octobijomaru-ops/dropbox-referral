'use client'
import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Terminal, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { formatTime, type LogEntry } from '@/lib/referral-types'
function LevelIcon({ level }: { level: LogEntry['level'] }) {
  switch (level) { case 'success': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />; case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />; case 'error': return <XCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />; default: return <Info className="h-3.5 w-3.5 text-sky-500 flex-shrink-0 mt-0.5" /> }
}
function levelColor(level: LogEntry['level']): string { switch (level) { case 'success': return 'text-emerald-700'; case 'warning': return 'text-amber-700'; case 'error': return 'text-rose-700'; default: return 'text-slate-700' } }
export function LogPanel({ jobId, logs, jobUrl }: { jobId: string | null; logs: LogEntry[]; jobUrl?: string | null }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between"><span className="flex items-center gap-2"><Terminal className="h-4 w-4 text-slate-600" />Log Real-time</span>{jobId && <Badge variant="outline" className="text-xs text-slate-500">{logs.length} entri</Badge>}</CardTitle>{jobUrl && <p className="text-xs font-mono text-slate-500 truncate" title={jobUrl ?? ''}>{jobUrl}</p>}</CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[520px]">
          <div className="font-mono text-xs p-3 space-y-1.5 bg-slate-950/[0.02] min-h-full">
            {!jobId ? (<div className="flex flex-col items-center justify-center py-12 text-center text-slate-400"><Terminal className="h-8 w-8 mb-2 opacity-50" /><p className="text-sm">Pilih job di panel kiri untuk melihat log</p></div>) : logs.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 text-center text-slate-400"><Info className="h-8 w-8 mb-2 opacity-50" /><p className="text-sm">Belum ada log untuk job ini</p></div>) : (logs.map((log) => (<div key={log.id} className="flex items-start gap-2 px-2 py-1 rounded hover:bg-slate-100/80"><span className="text-slate-400 tabular-nums flex-shrink-0 mt-0.5">{formatTime(log.timestamp)}</span><LevelIcon level={log.level} /><div className="flex-1 min-w-0">{log.step && <span className="text-slate-400 mr-1">[{log.step}]</span>}<span className={levelColor(log.level)}>{log.message}</span></div></div>)))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
