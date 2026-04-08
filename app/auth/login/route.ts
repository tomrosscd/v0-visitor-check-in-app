import { NextResponse } from 'next/server'

import { createClientForServer, isSupabaseConfigured } from '@/lib/supabase'

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/host?setup=supabase', request.url))
  }

  const supabase = await createClientForServer()
  const redirectTo = new URL('/auth/callback', request.url)

  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })

  return NextResponse.redirect(data.url)
}
