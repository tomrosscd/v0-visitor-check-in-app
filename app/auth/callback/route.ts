import { NextResponse } from 'next/server'

import { ensureHostProfile } from '@/lib/directory'
import { createClientForServer, isSupabaseConfigured } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/host`)
  }

  const supabase = await createClientForServer()
  const { data } = await supabase.auth.exchangeCodeForSession(code)

  const user = data.user
  const email = user?.email

  if (email) {
    await ensureHostProfile({
      email,
      full_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || null,
    })
  }

  return NextResponse.redirect(`${origin}/host`)
}
