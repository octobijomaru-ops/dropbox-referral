import { NextResponse } from 'next/server'
export async function GET() { return NextResponse.json({ concurrency: 2, delayBetweenMs: 1500, maxRetries: 3, targetCapacityMb: 16000 }) }
export async function POST() { return NextResponse.json({ ok: true }) }
