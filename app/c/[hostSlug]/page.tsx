/**
 * Personal Host Link Route
 * 
 * /c/[hostSlug] - Personalized check-in links for hosts
 * 
 * Example: /c/tom-ross -> Check-in form with Tom Ross pre-selected and hidden
 * 
 * This route:
 * 1. Resolves the hostSlug to an employee
 * 2. Redirects to /checkin with appropriate params
 * 3. Falls back gracefully if host can't be resolved
 * 
 * URL generation:
 * - Personal link: /c/tom-ross
 * - Expands to: /checkin?mode=personal&host=tom-ross&hide=host&source=personal
 */

import { redirect } from 'next/navigation'
import { resolveHost } from '@/lib/host-resolution'

interface PageProps {
  params: Promise<{ hostSlug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { hostSlug } = await params
  const result = await resolveHost(hostSlug)
  
  if (result.status === 'resolved') {
    return {
      title: `Check in with ${result.host.display_name}`,
      description: `Visitor check-in for ${result.host.display_name}`,
    }
  }
  
  return {
    title: 'Visitor Check-in',
    description: 'Check in as a visitor',
  }
}

export default async function PersonalHostPage({ params }: PageProps) {
  const { hostSlug } = await params
  
  // Try to resolve the host
  const result = await resolveHost(hostSlug)
  
  // Build redirect URL based on resolution result
  const searchParams = new URLSearchParams({
    mode: 'personal',
    source: 'personal',
  })

  if (result.status === 'resolved') {
    // Host found - pre-select and hide
    searchParams.set('host', result.host.employee_id)
    searchParams.set('hide', 'host')
  } else {
    // Host not found or multiple matches - pass the slug and let the form handle it
    searchParams.set('host', hostSlug)
    // Don't hide host since we couldn't resolve it
  }

  redirect(`/checkin?${searchParams.toString()}`)
}
