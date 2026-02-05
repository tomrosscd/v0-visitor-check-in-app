/**
 * GET /api/health
 * 
 * Health check endpoint that verifies required environment variables
 * are configured without revealing their values.
 * 
 * Response:
 * - 200: { status: 'healthy', ... } - All required vars are set
 * - 503: { status: 'unhealthy', ... } - Missing required vars
 */

import { NextResponse } from 'next/server'
import { HealthCheck } from '@/lib/validation'

export async function GET() {
  const checks = {
    google_sheets: !!(
      process.env.GOOGLE_SHEETS_ID && 
      (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || 
       (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY))
    ),
    slack: !!(process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN),
    office_phone: !!process.env.OFFICE_PHONE,
  }

  const missing: string[] = []
  
  if (!checks.google_sheets) {
    missing.push('GOOGLE_SHEETS_ID and credentials')
  }
  if (!checks.slack) {
    missing.push('SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN')
  }
  if (!checks.office_phone) {
    missing.push('OFFICE_PHONE')
  }

  const isHealthy = checks.google_sheets && checks.slack

  const response: HealthCheck = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    missing,
  }

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
  })
}
