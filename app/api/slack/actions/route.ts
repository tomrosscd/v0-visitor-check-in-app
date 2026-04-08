import { NextResponse } from 'next/server'

import { updateVisitStatus } from '@/lib/directory'
import { verifySlackRequest } from '@/lib/slack'

function mapActionToStatus(actionId: string) {
  switch (actionId) {
    case 'visit_down_in_2':
      return { status: 'down_in_2', host_message: "I'll be down in 2 minutes." }
    case 'visit_down_in_5':
      return { status: 'down_in_5', host_message: "I'll be down in 5 minutes." }
    case 'visit_need_backup':
      return { status: 'needs_backup', host_message: 'Please ask office ops to collect this visitor.' }
    default:
      return null
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const isVerified = await verifySlackRequest(request, rawBody)

  if (!isVerified) {
    return NextResponse.json({ error: 'Invalid Slack signature' }, { status: 401 })
  }

  const formData = new URLSearchParams(rawBody)
  const payloadValue = formData.get('payload')

  if (typeof payloadValue !== 'string') {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }

  const payload = JSON.parse(payloadValue) as {
    actions?: Array<{ action_id?: string; value?: string }>
  }

  const action = payload.actions?.[0]

  if (!action?.action_id || !action.value) {
    return NextResponse.json({ error: 'Invalid action payload' }, { status: 400 })
  }

  const mapped = mapActionToStatus(action.action_id)

  if (!mapped) {
    return NextResponse.json({ ok: true })
  }

  await updateVisitStatus({
    visitId: action.value,
    status: mapped.status,
    host_message: mapped.host_message,
  })

  return NextResponse.json({
    text: mapped.host_message,
    replace_original: false,
  })
}
