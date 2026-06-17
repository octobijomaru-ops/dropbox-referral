import { NextResponse } from 'next/server'
export async function GET() { return NextResponse.json({ jobs: [] }) }
export async function POST() { return NextResponse.json({ ids: [] }) }
export async function DELETE() { return NextResponse.json({ ok: true }) }
