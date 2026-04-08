/**
 * Slack Integration
 * 
 * Posts visitor check-in notifications to Slack.
 * Supports both Incoming Webhooks and Bot Token approaches.
 * 
 * Required environment variables:
 * - SLACK_WEBHOOK_URL: Incoming webhook URL
 *   OR
 * - SLACK_BOT_TOKEN: Bot OAuth token (xoxb-...)
 * - SLACK_CHANNEL: Channel to post to (default: #melbourne-office)
 */

import { createHmac, timingSafeEqual } from 'crypto'

import { CheckinMode, ResolvedHost } from './validation'

// =============================================================================
// Types
// =============================================================================

interface SlackMessage {
  text: string
  blocks?: SlackBlock[]
}

interface SlackBlock {
  type: string
  text?: {
    type: string
    text: string
    emoji?: boolean
  }
  fields?: Array<{
    type: string
    text: string
  }>
  elements?: Array<{
    type: string
    text?: {
      type: string
      text: string
      emoji?: boolean
    }
    action_id?: string
    value?: string
    style?: string
  }>
}

interface CheckinNotificationData {
  visitor: string
  company?: string
  notes?: string
  host: ResolvedHost | null
  mode: CheckinMode
  source: string
  meeting?: string // Phase 2: meeting token
  visitId?: string
}

interface SlackPostResult {
  ok: boolean
  channel?: string
  ts?: string
}

// =============================================================================
// Formatting
// =============================================================================

function getMelbourneTimestamp(): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())
}

function formatSlackMessage(data: CheckinNotificationData): SlackMessage {
  const timestamp = getMelbourneTimestamp()
  
  // Format host mention
  const hostDisplay = data.host 
    ? `<@${data.host.slack_user_id}>` 
    : 'Unknown (needs triage)'

  // Build plain text fallback
  const plainText = [
    `Visitor arrived`,
    `Name: ${data.visitor}`,
    `Company: ${data.company || '—'}`,
    `Notes: ${data.notes || '—'}`,
    `Host: ${data.host?.display_name || 'Unknown (needs triage)'}`,
    `Mode: ${data.mode}`,
    `Source: ${data.source}`,
    `Time: ${timestamp}`,
    // Phase 2: Include meeting token if present
    ...(data.meeting ? [`Meeting: ${data.meeting}`] : []),
  ].join('\n')

  // Build rich blocks
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Visitor arrived',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Name:*\n${data.visitor}`,
        },
        {
          type: 'mrkdwn',
          text: `*Company:*\n${data.company || '—'}`,
        },
      ],
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Host:*\n${hostDisplay}`,
        },
        {
          type: 'mrkdwn',
          text: `*Time:*\n${timestamp}`,
        },
      ],
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Mode:*\n${data.mode}`,
        },
        {
          type: 'mrkdwn',
          text: `*Source:*\n${data.source}`,
        },
      ],
    },
  ]

  // Add notes if present
  if (data.notes) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Notes:*\n${data.notes}`,
      },
    })
  }

  // Phase 2: Add meeting token if present
  // TODO: In Phase 2, use this token to look up meeting details from Google Calendar
  // and auto-resolve the host from the meeting organizer/attendees
  if (data.meeting) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Meeting Reference:*\n${data.meeting}`,
      },
    })
  }

  // Add triage warning if no host
  if (!data.host) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '⚠️ *This visitor needs assistance finding their host.*',
      },
    })
  }

  if (data.visitId) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Down in 2 min',
            emoji: true,
          },
          action_id: 'visit_down_in_2',
          value: data.visitId,
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Down in 5 min',
            emoji: true,
          },
          action_id: 'visit_down_in_5',
          value: data.visitId,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Need backup',
            emoji: true,
          },
          action_id: 'visit_need_backup',
          value: data.visitId,
        },
      ],
    })
  }

  return {
    text: plainText,
    blocks,
  }
}

// =============================================================================
// Slack API
// =============================================================================

async function postViaWebhook(webhookUrl: string, message: SlackMessage): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Slack webhook error: ${error}`)
  }
}

async function postViaBotToken(token: string, channel: string, message: SlackMessage): Promise<SlackPostResult> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel,
      text: message.text,
      blocks: message.blocks,
    }),
  })

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`)
  }

  const data = await response.json()
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`)
  }

  return {
    ok: true,
    channel: data.channel,
    ts: data.ts,
  }
}

async function openDirectMessageChannel(token: string, userId: string): Promise<string | null> {
  const response = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      users: userId,
    }),
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  if (!data.ok) {
    return null
  }

  return data.channel?.id || null
}

export async function verifySlackRequest(request: Request, rawBody: string): Promise<boolean> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET

  if (!signingSecret) {
    return true
  }

  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')

  if (!timestamp || !signature) {
    return false
  }

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
  if (Number(timestamp) < fiveMinutesAgo) {
    return false
  }

  const baseString = `v0:${timestamp}:${rawBody}`
  const digest = createHmac('sha256', signingSecret).update(baseString).digest('hex')
  const computed = `v0=${digest}`

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  } catch {
    return false
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Post a visitor check-in notification to Slack
 */
export async function postCheckinNotification(data: CheckinNotificationData): Promise<SlackPostResult | null> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  const botToken = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_CHANNEL || '#melbourne-office'

  const message = formatSlackMessage(data)

  if (webhookUrl) {
    await postViaWebhook(webhookUrl, message)
    return { ok: true }
  } else if (botToken) {
    const result = await postViaBotToken(botToken, channel, message)

    if (data.host?.slack_user_id) {
      const dmChannel = await openDirectMessageChannel(botToken, data.host.slack_user_id)
      if (dmChannel) {
        await postViaBotToken(botToken, dmChannel, message)
      }
    }

    return result
  } else {
    throw new Error('No Slack configuration found. Set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN')
  }
}

/**
 * Check if Slack is configured
 */
export function isSlackConfigured(): boolean {
  return !!(process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN)
}
