import { NextResponse } from 'next/server'

import { createClientForServer, isSupabaseConfigured } from '@/lib/supabase'
import { getHostByEmail, updateHostProfileByEmail } from '@/lib/directory'

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
  }

  const supabase = await createClientForServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const host = await getHostByEmail(user.email)
  return NextResponse.json({ host })
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
  }

  const supabase = await createClientForServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const host = await updateHostProfileByEmail({
    email: user.email,
    phone: body.phone ?? null,
    parking_instructions: body.parking_instructions ?? null,
    arrival_instructions: body.arrival_instructions ?? null,
    calendar_snippet: body.calendar_snippet ?? null,
  })

  return NextResponse.json({ host })
}
