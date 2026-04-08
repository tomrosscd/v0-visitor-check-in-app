import { cookies } from 'next/headers'
import { createServerClient, createBrowserClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

export function isSupabaseConfigured() {
  return !!(getSupabaseUrl() && getSupabaseAnonKey())
}

export function createClientForBrowser() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }

  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}

export async function createClientForServer() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }

  const cookieStore = await cookies()

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookieValues) {
        try {
          cookieValues.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server components cannot always write cookies. Route handlers can.
        }
      },
    },
  })
}

export function createServiceRoleClient(): SupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!isSupabaseConfigured() || !serviceRoleKey) {
    return null
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
