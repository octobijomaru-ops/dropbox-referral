'use client'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Settings2, Link2, Sparkles, Trash2, Loader2 } from 'lucide-react'
import type { ProcessingSettings } from '@/lib/referral-types'
const SAMPLE_LINKS = ['https://www.dropbox.com/referrals/AAB123456?src=global9','https://www.dropbox.com/referrals/AAC789012?referer=user1','https://www.dropbox.com/referrals/AAD345678?ref=referral']
export function InputPanel({ onSubmit, onClearAll, settings, onUpdateSettings, submitting }: {
  onSubmit: (urls: string[]) => void; onClearAll: () => void; settings: ProcessingSettings | null; onUpdateSettings: (s: Partial<ProcessingSettings>) => void; submitting: boolean
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ProcessingSettings>(settings ?? { concurrency: 2, delayBetweenMs: 1500, maxRetries: 3, targetCapacityMb: 16000 })
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean)
  const validLines = lines.filter((l) => { try { const u = new URL(l); return u.hostname.endsWith('dropbox.com') } catch { return false } })
  const invalidCount = lines.length - validLines.length
  const handleSubmit = () => { if (validLines.length === 0) return; onSubmit(validLines); setText('') }
  const handleSample = () => setText(SAMPLE_LINKS.join('\n'))
  const openSettings = () => { setDraft(settings ?? { concurrency: 2, delayBetweenMs: 1500, maxRetries: 3, targetCapacityMb: 16000 }); setOpen(true) }
  const saveSettings = () => { onUpdateSettings(draft); setOpen(false) }
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-emerald-600" />Input Link Referral Dropbox</CardTitle>
            <CardDescription className="mt-1">Tempel satu atau lebih link referral Dropbox (satu per baris).</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm" onClick={openSettings}><Settings2 className="h-4 w-4 mr-1" />Pengaturan</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pengaturan Worker</DialogTitle><DialogDescription>Konfigurasi perilaku pemrosesan referral.</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 items-center gap-2"><Label htmlFor="conc">Konkurensi (1-5)</Label><Input id="conc" type="number" min={1} max={5} value={draft.concurrency} onChange={(e) => setDraft({ ...draft, concurrency: Number(e.target.value) })} /></div>
                <div className="grid grid-cols-2 items-center gap-2"><Label htmlFor="delay">Delay antar job (ms)</Label><Input id="delay" type="number" min={500} max={10000} step={100} value={draft.delayBetweenMs} onChange={(e) => setDraft({ ...draft, delayBetweenMs: Number(e.target.value) })} /></div>
                <div className="grid grid-cols-2 items-center gap-2"><Label htmlFor="retry">Maks. retry</Label><Input id="retry" type="number" min={1} max={10} value={draft.maxRetries} onChange={(e) => setDraft({ ...draft, maxRetries: Number(e.target.value) })} /></div>
                <div className="grid grid-cols-2 items-center gap-2"><Label htmlFor="target">Target kapasitas (MB)</Label><Input id="target" type="number" min={500} step={500} value={draft.targetCapacityMb} onChange={(e) => setDraft({ ...draft, targetCapacityMb: Number(e.target.value) })} /></div>
                <p className="text-xs text-slate-500">500 MB = 1 referral sukses. 16 GB = 32 referral sukses.</p>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={saveSettings}>Simpan</Button></div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'https://www.dropbox.com/referrals/AAB123?src=global9\nhttps://www.dropbox.com/referrals/AAC456?referer=user2\n...'} className="min-h-[140px] font-mono text-sm" />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="bg-slate-100">{lines.length} baris</Badge>
          {validLines.length > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{validLines.length} valid</Badge>}
          {invalidCount > 0 && <Badge className="bg-rose-50 text-rose-700 border-rose-200">{invalidCount} tidak valid</Badge>}
          {settings && <Badge variant="outline" className="text-slate-600">{settings.concurrency} worker · {settings.delayBetweenMs}ms delay · max {settings.maxRetries}x retry</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSubmit} disabled={validLines.length === 0 || submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Eksekusi {validLines.length > 0 ? '(' + validLines.length + ')' : ''}
          </Button>
          <Button variant="outline" onClick={handleSample} disabled={submitting}>Isi Contoh</Button>
          <Button variant="ghost" onClick={onClearAll} disabled={submitting} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4 mr-1" />Hapus Semua Job</Button>
        </div>
      </CardContent>
    </Card>
  )
}
