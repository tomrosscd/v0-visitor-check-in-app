import { NextResponse } from 'next/server'

import { createClientForServer, isSupabaseConfigured } from '@/lib/supabase'

export async function GET(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createClientForServer()
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL('/host', request.url))
}
