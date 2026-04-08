import { randomUUID } from 'crypto'

import { getPublicEmployees, getActiveEmployees } from './sheets'
import { createServiceRoleClient, isSupabaseConfigured } from './supabase'
import type { Employee, PublicEmployee } from './validation'

export interface HostProfile extends PublicEmployee {
  phone: string | null
  avatar_url: string | null
  parking_instructions: string | null
  arrival_instructions: string | null
  calendar_snippet: string | null
  office_name: string | null
}

export interface VisitRecord {
  id: string
  visitor_name: string
  visitor_company: string | null
  notes: string | null
  source: string
  mode: string
  status: string
  host_id: string | null
  host_name: string | null
  host_message: string | null
  created_at: string
}

function mapHostRow(row: Record<string, unknown>): HostProfile {
  return {
    employee_id: String(row.id ?? ''),
    display_name: String(row.full_name ?? ''),
    team: row.team ? String(row.team) : null,
    email: row.email ? String(row.email) : null,
    host_slug: String(row.slug ?? ''),
    phone: row.phone ? String(row.phone) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    parking_instructions: row.parking_instructions ? String(row.parking_instructions) : null,
    arrival_instructions: row.arrival_instructions ? String(row.arrival_instructions) : null,
    calendar_snippet: row.calendar_snippet ? String(row.calendar_snippet) : null,
    office_name: row.office_name ? String(row.office_name) : null,
  }
}

function mapEmployeeToHostProfile(employee: PublicEmployee): HostProfile {
  return {
    ...employee,
    phone: null,
    avatar_url: null,
    parking_instructions: null,
    arrival_instructions: null,
    calendar_snippet: null,
    office_name: null,
  }
}

export async function getHosts(): Promise<HostProfile[]> {
  const client = createServiceRoleClient()

  if (isSupabaseConfigured() && client) {
    const { data, error } = await client
      .from('host_directory')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (!error && data) {
      return data.map((row) => mapHostRow(row as Record<string, unknown>))
    }
  }

  const employees = await getPublicEmployees()
  return employees.map(mapEmployeeToHostProfile)
}

export async function getHostByEmail(email: string) {
  const client = createServiceRoleClient()

  if (!isSupabaseConfigured() || !client) {
    return null
  }

  const { data, error } = await client
    .from('host_directory')
    .select('*')
    .ilike('email', email)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return mapHostRow(data as Record<string, unknown>)
}

export async function ensureHostProfile(input: {
  email: string
  full_name: string
  avatar_url?: string | null
}) {
  const client = createServiceRoleClient()

  if (!isSupabaseConfigured() || !client) {
    return null
  }

  const slugBase = input.full_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data, error } = await client
    .from('host_directory')
    .upsert({
      email: input.email,
      full_name: input.full_name,
      avatar_url: input.avatar_url || null,
      slug: slugBase || input.email.split('@')[0],
    }, { onConflict: 'email' })
    .select('*')
    .single()

  if (error || !data) {
    return null
  }

  return mapHostRow(data as Record<string, unknown>)
}

export async function getHostBySlug(slug: string) {
  const hosts = await getHosts()
  return hosts.find((host) => host.host_slug.toLowerCase() === slug.toLowerCase()) || null
}

export async function getFullEmployees(): Promise<Employee[]> {
  const client = createServiceRoleClient()

  if (isSupabaseConfigured() && client) {
    const { data, error } = await client
      .from('host_directory')
      .select('id, full_name, slack_user_id, email, team, slug, is_active')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (!error && data) {
      return data.map((row) => ({
        employee_id: String(row.id ?? ''),
        display_name: String(row.full_name ?? ''),
        slack_user_id: String(row.slack_user_id ?? ''),
        email: row.email ? String(row.email) : null,
        team: row.team ? String(row.team) : null,
        host_slug: String(row.slug ?? ''),
        is_active: Boolean(row.is_active),
      }))
    }
  }

  return getActiveEmployees()
}

export async function createVisit(input: {
  visitor_name: string
  visitor_company?: string
  notes?: string
  source: string
  mode: string
  host_id?: string
  host_name?: string | null
}): Promise<VisitRecord | null> {
  const client = createServiceRoleClient()

  if (!isSupabaseConfigured() || !client) {
    return {
      id: randomUUID(),
      visitor_name: input.visitor_name,
      visitor_company: input.visitor_company || null,
      notes: input.notes || null,
      source: input.source,
      mode: input.mode,
      status: input.host_id ? 'notified' : 'triage',
      host_id: input.host_id || null,
      host_name: input.host_name || null,
      host_message: null,
      created_at: new Date().toISOString(),
    }
  }

  const { data, error } = await client
    .from('visits')
    .insert({
      visitor_name: input.visitor_name,
      visitor_company: input.visitor_company || null,
      notes: input.notes || null,
      source: input.source,
      mode: input.mode,
      host_id: input.host_id || null,
      host_name: input.host_name || null,
      status: input.host_id ? 'notified' : 'triage',
    })
    .select('*')
    .single()

  if (error || !data) {
    return null
  }

  return data as VisitRecord
}

export async function getVisitStatus(visitId: string): Promise<VisitRecord | null> {
  const client = createServiceRoleClient()

  if (!isSupabaseConfigured() || !client) {
    return null
  }

  const { data, error } = await client
    .from('visits')
    .select('*')
    .eq('id', visitId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as VisitRecord
}

export async function updateVisitStatus(input: {
  visitId: string
  status: string
  host_message?: string | null
}) {
  const client = createServiceRoleClient()

  if (!isSupabaseConfigured() || !client) {
    return null
  }

  const patch: Record<string, unknown> = {
    status: input.status,
  }

  if (input.host_message !== undefined) {
    patch.host_message = input.host_message
  }

  if (input.status === 'on_my_way') {
    patch.acknowledged_at = new Date().toISOString()
  }

  const { data, error } = await client
    .from('visits')
    .update(patch)
    .eq('id', input.visitId)
    .select('*')
    .single()

  if (error || !data) {
    return null
  }

  return data as VisitRecord
}

export async function updateVisitSlackDelivery(input: {
  visitId: string
  slack_channel_id?: string | null
  slack_message_ts?: string | null
}) {
  const client = createServiceRoleClient()

  if (!isSupabaseConfigured() || !client) {
    return null
  }

  const { data, error } = await client
    .from('visits')
    .update({
      slack_channel_id: input.slack_channel_id || null,
      slack_message_ts: input.slack_message_ts || null,
    })
    .eq('id', input.visitId)
    .select('*')
    .single()

  if (error || !data) {
    return null
  }

  return data as VisitRecord
}

export async function updateHostProfileByEmail(input: {
  email: string
  phone?: string | null
  parking_instructions?: string | null
  arrival_instructions?: string | null
  calendar_snippet?: string | null
}) {
  const client = createServiceRoleClient()

  if (!isSupabaseConfigured() || !client) {
    return null
  }

  const { data, error } = await client
    .from('host_directory')
    .update({
      phone: input.phone,
      parking_instructions: input.parking_instructions,
      arrival_instructions: input.arrival_instructions,
      calendar_snippet: input.calendar_snippet,
      updated_at: new Date().toISOString(),
    })
    .ilike('email', input.email)
    .select('*')
    .single()

  if (error || !data) {
    return null
  }

  return mapHostRow(data as Record<string, unknown>)
}
