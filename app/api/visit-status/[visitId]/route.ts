import { NextResponse } from 'next/server'

import { getVisitStatus } from '@/lib/directory'

interface RouteProps {
  params: Promise<{ visitId: string }>
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { visitId } = await params
  const visit = await getVisitStatus(visitId)

  if (!visit) {
    return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
  }

  return NextResponse.json(visit)
}
