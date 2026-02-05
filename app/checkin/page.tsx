/**
 * Main Check-in Page
 * 
 * Single page app with query params controlling mode and prefills.
 * 
 * URL Query Parameters:
 * - mode: 'calendar' | 'personal' | 'qr' (default: 'calendar')
 * - source: string (default: 'direct')
 * - host: string (employee_id, host_slug, or display_name)
 * - visitor: string (prefill visitor name)
 * - company: string (prefill company name)
 * - notes: string (prefill notes)
 * - hide: comma-separated list (visitor,company,notes,host)
 * - meeting: string (Phase 2: meeting reference token)
 * 
 * Example URLs:
 * - /checkin?mode=calendar&source=calendar
 * - /checkin?mode=personal&host=tom-ross&hide=host
 * - /checkin?mode=qr&source=qr
 */

import { Suspense } from 'react'
import { CheckinPageContent } from './checkin-content'

export const metadata = {
  title: 'Visitor Check-in',
  description: 'Check in as a visitor to our office',
}

// Loading fallback
function CheckinLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-muted rounded mb-4" />
        <div className="h-64 w-96 bg-muted rounded" />
      </div>
    </div>
  )
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<CheckinLoading />}>
      <CheckinPageContent />
    </Suspense>
  )
}
