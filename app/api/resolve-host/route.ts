/**
 * GET /api/resolve-host
 * 
 * Resolves a host parameter to an employee.
 * Used by the check-in form to pre-select a host from URL parameters.
 * 
 * Query Parameters:
 * - host: string (employee_id, host_slug, or display_name)
 * 
 * Response:
 * - 200: HostResolutionResult
 *   - { status: 'resolved', host: ResolvedHost }
 *   - { status: 'multiple', matches: PublicEmployee[] }
 *   - { status: 'not_found' }
 * - 400: Missing host parameter
 * - 500: Error message
 */

import { NextResponse } from 'next/server'
import { resolveHost } from '@/lib/host-resolution'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const host = searchParams.get('host')

    if (!host) {
      return NextResponse.json(
        { error: 'Missing host parameter' },
        { status: 400 }
      )
    }

    const result = await resolveHost(host)
    
    return NextResponse.json(result, {
      headers: {
        // Allow caching for 1 minute on CDN
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error resolving host:', error)
    
    return NextResponse.json(
      { error: 'Failed to resolve host. Please try again.' },
      { status: 500 }
    )
  }
}
