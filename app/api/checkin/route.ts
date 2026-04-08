/**
 * POST /api/checkin
 * 
 * Processes a visitor check-in:
 * 1. Validates input with Zod
 * 2. Resolves host to Slack user ID (if provided)
 * 3. Posts notification to Slack
 * 4. Returns success response
 * 
 * Request Body:
 * - visitor: string (required)
 * - company: string (optional)
 * - notes: string (optional)
 * - host: string (optional - employee_id)
 * - mode: 'calendar' | 'personal' | 'qr'
 * - source: string
 * - meeting: string (optional - Phase 2)
 * 
 * Response:
 * - 200: CheckinResponse
 * - 400: Validation error
 * - 429: Rate limit exceeded
 * - 500: Server error
 */

import { NextResponse } from 'next/server'
import { CheckinRequestSchema, CheckinResponse } from '@/lib/validation'
import { resolveHostById } from '@/lib/host-resolution'
import { postCheckinNotification, isSlackConfigured } from '@/lib/slack'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { createVisit, updateVisitSlackDelivery } from '@/lib/directory'

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please wait a moment before trying again.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = CheckinRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Resolve host if provided
    let resolvedHost = null
    if (data.host) {
      resolvedHost = await resolveHostById(data.host)
      // Don't log PII - just note resolution status
    }

    const visit = await createVisit({
      visitor_name: data.visitor,
      visitor_company: data.company,
      notes: data.notes,
      source: data.source,
      mode: data.mode,
      host_id: resolvedHost?.employee_id,
      host_name: resolvedHost?.display_name || null,
    })

    // Post to Slack (skip in demo mode if not configured)
    if (isSlackConfigured()) {
      const slackResult = await postCheckinNotification({
        visitor: data.visitor,
        company: data.company,
        notes: data.notes,
        host: resolvedHost,
        mode: data.mode,
        source: data.source,
        meeting: data.meeting,
        visitId: visit?.id,
      })

      if (visit?.id && slackResult?.channel && slackResult?.ts) {
        await updateVisitSlackDelivery({
          visitId: visit.id,
          slack_channel_id: slackResult.channel,
          slack_message_ts: slackResult.ts,
        })
      }
    } else {
      console.log('[v0] Slack not configured - skipping notification (demo mode)')
    }

    // Build response (no PII or secrets)

    const response: CheckinResponse = {
      success: true,
      message: resolvedHost 
        ? 'Thanks! Your host has been notified and will be down shortly.'
        : 'Thanks! Someone will be down to help you shortly.',
      hostResolved: !!resolvedHost,
      timestamp: new Date().toISOString(),
      visitId: visit?.id,
      hostName: resolvedHost?.display_name || null,
      hostMessage: visit?.host_message || null,
      status: visit?.status || (resolvedHost ? 'notified' : 'triage'),
    }

    // Optional: Log analytics-safe data (no PII)
    // console.log('[analytics] checkin', {
    //   mode: data.mode,
    //   source: data.source,
    //   hostResolved: !!resolvedHost,
    //   timestamp: response.timestamp,
    // })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing check-in:', error)
    
    return NextResponse.json(
      { error: 'Something went wrong. Please try again or call the front desk.' },
      { status: 500 }
    )
  }
}
