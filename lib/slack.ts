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
}

interface CheckinNotificationData {
  visitor: string
  company?: string
  notes?: string
  host: ResolvedHost | null
  mode: CheckinMode
  source: string
  meeting?: string // Phase 2: meeting token
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

async function postViaBotToken(token: string, channel: string, message: SlackMessage): Promise<void> {
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
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Post a visitor check-in notification to Slack
 */
export async function postCheckinNotification(data: CheckinNotificationData): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  const botToken = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_CHANNEL || '#melbourne-office'

  const message = formatSlackMessage(data)

  if (webhookUrl) {
    await postViaWebhook(webhookUrl, message)
  } else if (botToken) {
    await postViaBotToken(botToken, channel, message)
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
