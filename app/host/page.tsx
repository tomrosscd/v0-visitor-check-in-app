import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { createClientForServer, isSupabaseConfigured } from '@/lib/supabase'
import { ensureHostProfile, getHostByEmail } from '@/lib/directory'
import { HostDashboardClient } from '@/components/host/host-dashboard-client'

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export default async function HostPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="brand-page px-4 py-10">
        <div className="mx-auto max-w-3xl brand-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <p className="brand-kicker">Host dashboard</p>
          <h1 className="brand-title mt-4 text-primary">Set up Supabase to unlock host self-service.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then configure Google auth in Supabase.
          </p>
        </div>
      </main>
    )
  }

  const supabase = await createClientForServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return (
      <main className="brand-page px-4 py-10">
        <div className="mx-auto max-w-3xl brand-panel rounded-[2rem] px-6 py-8 text-center sm:px-10">
          <p className="brand-kicker">Host dashboard</p>
          <h1 className="brand-title mt-4 text-primary">Sign in with Google to manage your check-in link.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            You will get your personal arrival link, a ready-to-paste calendar snippet, and space for office instructions.
          </p>
          <div className="mt-8">
            <Button asChild>
              <a href="/auth/login">Continue with Google</a>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  await ensureHostProfile({
    email: user.email,
    full_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email.split('@')[0],
    avatar_url: user.user_metadata?.avatar_url || null,
  })

  const host = await getHostByEmail(user.email)

  if (!host) {
    redirect('/auth/logout')
  }

  return <HostDashboardClient host={host} appUrl={getAppUrl()} />
}
