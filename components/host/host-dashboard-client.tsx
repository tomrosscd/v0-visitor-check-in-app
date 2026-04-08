'use client'

import * as React from 'react'
import { Copy, CheckCircle2, LogOut, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { HostProfile } from '@/lib/directory'

interface HostDashboardClientProps {
  host: HostProfile
  appUrl: string
}

export function HostDashboardClient({ host, appUrl }: HostDashboardClientProps) {
  const personalLink = `${appUrl.replace(/\/$/, '')}/c/${host.host_slug}`
  const defaultSnippet = [
    'Looking forward to seeing you.',
    '',
    `When you arrive, check in here: ${personalLink}`,
    host.parking_instructions ? `Parking: ${host.parking_instructions}` : null,
    host.arrival_instructions ? `Arrival notes: ${host.arrival_instructions}` : null,
  ].filter(Boolean).join('\n')

  const [phone, setPhone] = React.useState(host.phone || '')
  const [parkingInstructions, setParkingInstructions] = React.useState(host.parking_instructions || '')
  const [arrivalInstructions, setArrivalInstructions] = React.useState(host.arrival_instructions || '')
  const [calendarSnippet, setCalendarSnippet] = React.useState(host.calendar_snippet || defaultSnippet)
  const [saved, setSaved] = React.useState(false)

  async function handleSave() {
    setSaved(false)

    await fetch('/api/host-profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        parking_instructions: parkingInstructions,
        arrival_instructions: arrivalInstructions,
        calendar_snippet: calendarSnippet,
      }),
    })

    setSaved(true)
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text)
  }

  return (
    <main className="brand-page px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="brand-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {host.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={host.avatar_url} alt={host.display_name} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="h-8 w-8" />
                </div>
              )}

              <div>
                <p className="brand-kicker">Host dashboard</p>
                <h1 className="brand-title mt-3 text-primary">{host.display_name}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{host.email}</p>
              </div>
            </div>

            <Button asChild variant="outline">
              <a href="/auth/logout">
                <LogOut className="h-4 w-4" />
                Sign out
              </a>
            </Button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="brand-panel rounded-[2rem] px-6 py-8 sm:px-8">
            <p className="brand-kicker">Personal arrival link</p>
            <h2 className="mt-4 text-3xl text-primary">Share this in your calendar invite</h2>
            <div className="mt-6 rounded-[1.5rem] border border-border/80 bg-muted/40 p-4">
              <p className="break-all text-sm text-foreground">{personalLink}</p>
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => copyText(personalLink)}>
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button variant="outline" onClick={() => copyText(calendarSnippet)}>
                <Copy className="h-4 w-4" />
                Copy invite snippet
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Visitors who use this link will be checked in directly against you and the success page can show that you were notified.
            </p>
          </section>

          <section className="brand-panel rounded-[2rem] px-6 py-8 sm:px-8">
            <p className="brand-kicker">Profile and instructions</p>
            <div className="mt-6 space-y-5">
              <div>
                <label className="brand-kicker text-foreground/80">Mobile number</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04xx xxx xxx" />
              </div>
              <div>
                <label className="brand-kicker text-foreground/80">Parking instructions</label>
                <Textarea value={parkingInstructions} onChange={(e) => setParkingInstructions(e.target.value)} placeholder="Street parking, nearby garage, or simple arrival tips." />
              </div>
              <div>
                <label className="brand-kicker text-foreground/80">Arrival instructions</label>
                <Textarea value={arrivalInstructions} onChange={(e) => setArrivalInstructions(e.target.value)} placeholder="Tell visitors to wait downstairs while you bring the fob, or any other note." />
              </div>
              <div>
                <label className="brand-kicker text-foreground/80">Calendar invite snippet</label>
                <Textarea value={calendarSnippet} onChange={(e) => setCalendarSnippet(e.target.value)} className="min-h-[220px]" />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleSave}>Save profile</Button>
                {saved && (
                  <span className="inline-flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
