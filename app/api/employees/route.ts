/**
 * GET /api/employees
 * 
 * Returns the list of active employees for the check-in form combobox.
 * Data is fetched from Google Sheets and cached server-side for 5 minutes.
 * 
 * Response:
 * - 200: Array of PublicEmployee objects
 * - 500: Error message
 */

import { NextResponse } from 'next/server'
import { getPublicEmployees } from '@/lib/sheets'

export async function GET() {
  try {
    const employees = await getPublicEmployees()
    
    return NextResponse.json(employees, {
      headers: {
        // Allow caching for 1 minute on CDN, stale-while-revalidate for 5 minutes
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch employees. Please try again.' },
      { status: 500 }
    )
  }
}
