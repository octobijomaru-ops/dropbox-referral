import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

const DB_PATH = (process.env.DATABASE_URL?.replace(/^file:/, '') || './db/custom.db')
mkdirSync(dirname(DB_PATH) || '.', { recursive: true })

const isBun = typeof (globalThis as any).Bun !== 'undefined'
let db: any

if (isBun) {
  const { Database } = await import('bun:sqlite')
  db = new Database(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
} else {
  const BetterSqlite3 = (await import('better-sqlite3')).default
  db = new BetterSqlite3(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS referral_job (
    id TEXT PRIMARY KEY, url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 3,
    capacity_gained INTEGER NOT NULL DEFAULT 0, current_step TEXT, step_progress INTEGER NOT NULL DEFAULT 0,
    error_message TEXT, http_status INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_job_status ON referral_job(status);
  CREATE INDEX IF NOT EXISTS idx_job_created_at ON referral_job(created_at);
  CREATE TABLE IF NOT EXISTS referral_log (
    id TEXT PRIMARY KEY, job_id TEXT NOT NULL, level TEXT NOT NULL, message TEXT NOT NULL,
    step TEXT, timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES referral_job(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_log_job_id ON referral_log(job_id);
  CREATE INDEX IF NOT EXISTS idx_log_timestamp ON referral_log(timestamp);
  CREATE TABLE IF NOT EXISTS setting (id TEXT PRIMARY KEY, value TEXT NOT NULL);
`)

const genId = () => randomUUID()
function rowToJob(row: any) { if (!row) return null; return { id: row.id, url: row.url, status: row.status, attempts: row.attempts, maxAttempts: row.max_attempts, capacityGained: row.capacity_gained, currentStep: row.current_step, stepProgress: row.step_progress, errorMessage: row.error_message, httpStatus: row.http_status, createdAt: row.created_at, updatedAt: row.updated_at, completedAt: row.completed_at } }
function rowToLog(row: any) { if (!row) return null; return { id: row.id, jobId: row.job_id, level: row.level, message: row.message, step: row.step, timestamp: row.timestamp } }

export const JobModel = {
  create(data: { url: string; status: string; maxAttempts: number }) { const id = genId(); db.prepare('INSERT INTO referral_job (id, url, status, max_attempts) VALUES (?, ?, ?, ?)').run(id, data.url, data.status, data.maxAttempts); return JobModel.findById(id) },
  findById(id: string) { const row = db.prepare('SELECT * FROM referral_job WHERE id = ?').get(id); return rowToJob(row) },
  findFirstByStatuses(statuses: string[]) { if (statuses.length === 0) return null; const placeholders = statuses.map(() => '?').join(','); const row = db.prepare('SELECT * FROM referral_job WHERE status IN (' + placeholders + ') ORDER BY created_at ASC LIMIT 1').get(...statuses); return rowToJob(row) },
  update(id: string, data: Record<string, any>) {
    const fieldMap: Record<string, string> = { status: 'status', attempts: 'attempts', maxAttempts: 'max_attempts', capacityGained: 'capacity_gained', currentStep: 'current_step', stepProgress: 'step_progress', errorMessage: 'error_message', httpStatus: 'http_status', completedAt: 'completed_at' }
    const sets: string[] = []; const values: any[] = []
    for (const [k, v] of Object.entries(data)) { const col = fieldMap[k]; if (col) { sets.push(col + ' = ?'); values.push(v) } }
    if (sets.length === 0) return JobModel.findById(id)
    sets.push("updated_at = datetime('now')"); values.push(id)
    db.prepare('UPDATE referral_job SET ' + sets.join(', ') + ' WHERE id = ?').run(...values)
    return JobModel.findById(id)
  },
  claim(id: string, fromStatuses: string[]) { if (fromStatuses.length === 0) return 0; const placeholders = fromStatuses.map(() => '?').join(','); const result = db.prepare("UPDATE referral_job SET status = 'queued', updated_at = datetime('now') WHERE id = ? AND status IN (" + placeholders + ')').run(id, ...fromStatuses); return result.changes },
  findAll(limit = 500) { const rows = db.prepare('SELECT * FROM referral_job ORDER BY created_at DESC LIMIT ?').all(limit); return rows.map(rowToJob) },
  deleteById(id: string) { db.prepare('DELETE FROM referral_log WHERE job_id = ?').run(id); db.prepare('DELETE FROM referral_job WHERE id = ?').run(id) },
  deleteAll() { db.prepare('DELETE FROM referral_log').run(); db.prepare('DELETE FROM referral_job').run() },
  sumCapacityByStatus(status: string) { const result = db.prepare('SELECT COALESCE(SUM(capacity_gained), 0) as total FROM referral_job WHERE status = ?').get(status) as any; return result.total },
  countByStatuses(statuses: string[]) { if (statuses.length === 0) return 0; const placeholders = statuses.map(() => '?').join(','); const result = db.prepare('SELECT COUNT(*) as count FROM referral_job WHERE status IN (' + placeholders + ')').get(...statuses) as any; return result.count },
  groupByStatus() { return db.prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(capacity_gained), 0) as capacity_gained FROM referral_job GROUP BY status').all() as any[] },
}

export const LogModel = {
  create(data: { jobId: string; level: string; message: string; step?: string | null }) { const id = genId(); db.prepare('INSERT INTO referral_log (id, job_id, level, message, step) VALUES (?, ?, ?, ?, ?)').run(id, data.jobId, data.level, data.message, data.step ?? null); const row = db.prepare('SELECT * FROM referral_log WHERE id = ?').get(id); return rowToLog(row) },
  findByJobId(jobId: string, limit = 1000) { const rows = db.prepare('SELECT * FROM referral_log WHERE job_id = ? ORDER BY timestamp ASC LIMIT ?').all(jobId, limit); return rows.map(rowToLog) },
  deleteByJobId(jobId: string) { db.prepare('DELETE FROM referral_log WHERE job_id = ?').run(jobId) },
  deleteAll() { db.prepare('DELETE FROM referral_log').run() },
}

export const SettingModel = {
  get(key: string): string | undefined { const result = db.prepare('SELECT value FROM setting WHERE id = ?').get(key) as any; return result?.value },
  upsert(key: string, value: string) { db.prepare('INSERT INTO setting (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value').run(key, value) },
}

export default db
