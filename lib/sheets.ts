/**
 * Google Sheets Integration
 * 
 * Fetches employee data from Google Sheets with server-side caching.
 * 
 * Required environment variables:
 * - GOOGLE_SHEETS_ID: The ID of your Google Sheet (from the URL)
 * - GOOGLE_SERVICE_ACCOUNT_JSON: Full JSON credentials for service account
 *   OR
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: Private key (with \n for newlines)
 * 
 * Google Sheet format (first row is headers):
 * | employee_id | display_name | slack_user_id | email | team | host_slug | is_active |
 * |-------------|--------------|---------------|-------|------|-----------|-----------|
 * | emp_001     | Tom Ross     | U123ABC       | tom@  | Eng  | tom-ross  | TRUE      |
 * | emp_002     | Jane Smith   | U456DEF       | jane@ | Sales| jane-smith| TRUE      |
 */

import { Employee, EmployeeSchema, PublicEmployee } from './validation'

// =============================================================================
// Types
// =============================================================================

interface ServiceAccountCredentials {
  client_email: string
  private_key: string
}

interface SheetRow {
  employee_id: string
  display_name: string
  slack_user_id: string
  email?: string
  team?: string
  host_slug: string
  is_active: string | boolean
}

// =============================================================================
// Cache
// =============================================================================

interface CacheEntry {
  data: Employee[]
  timestamp: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let employeeCache: CacheEntry | null = null

/**
 * Clear the employee cache (useful for testing or forced refresh)
 */
export function clearEmployeeCache(): void {
  employeeCache = null
}

// =============================================================================
// Google Sheets API
// =============================================================================

function getCredentials(): ServiceAccountCredentials {
  // Try JSON credentials first
  const jsonCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (jsonCreds) {
    try {
      const parsed = JSON.parse(jsonCreds)
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      }
    } catch {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format')
    }
  }

  // Fall back to separate env vars
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!email || !privateKey) {
    throw new Error(
      'Missing Google credentials. Set GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'
    )
  }

  return {
    client_email: email,
    private_key: privateKey.replace(/\\n/g, '\n'),
  }
}

async function getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600 // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  }

  // Create JWT
  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Sign with private key
  const privateKeyPem = credentials.private_key
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwt = `${unsignedToken}.${signatureB64}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function fetchSheetData(sheetId: string, accessToken: string): Promise<SheetRow[]> {
  // Fetch first sheet, all data
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:G`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch sheet data: ${error}`)
  }

  const data = await response.json()
  const rows: string[][] = data.values || []

  if (rows.length < 2) {
    return [] // No data rows
  }

  // First row is headers
  const headers = rows[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'))
  const dataRows = rows.slice(1)

  return dataRows.map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = row[index] || ''
    })
    return obj as unknown as SheetRow
  })
}

function normalizeEmployee(row: SheetRow): Employee | null {
  try {
    // Parse is_active - handle various formats
    let isActive = false
    if (typeof row.is_active === 'boolean') {
      isActive = row.is_active
    } else if (typeof row.is_active === 'string') {
      isActive = row.is_active.toLowerCase() === 'true' || row.is_active === '1'
    }

    const employee = {
      employee_id: row.employee_id?.trim() || '',
      display_name: row.display_name?.trim() || '',
      slack_user_id: row.slack_user_id?.trim() || '',
      email: row.email?.trim() || null,
      team: row.team?.trim() || null,
      host_slug: row.host_slug?.trim() || '',
      is_active: isActive,
    }

    // Validate with Zod
    const result = EmployeeSchema.safeParse(employee)
    if (!result.success) {
      console.warn(`Invalid employee row: ${JSON.stringify(row)}`, result.error)
      return null
    }

    return result.data
  } catch (error) {
    console.warn(`Error normalizing employee row: ${JSON.stringify(row)}`, error)
    return null
  }
}

// =============================================================================
// Demo Data (used when Google Sheets is not configured)
// =============================================================================

const DEMO_EMPLOYEES: Employee[] = [
  {
    employee_id: 'emp_001',
    display_name: 'Tom Ross',
    slack_user_id: 'U123ABC',
    email: 'tom@company.com',
    team: 'Engineering',
    host_slug: 'tom-ross',
    is_active: true,
  },
  {
    employee_id: 'emp_002',
    display_name: 'Jane Smith',
    slack_user_id: 'U456DEF',
    email: 'jane@company.com',
    team: 'Sales',
    host_slug: 'jane-smith',
    is_active: true,
  },
  {
    employee_id: 'emp_003',
    display_name: 'Alex Johnson',
    slack_user_id: 'U789GHI',
    email: 'alex@company.com',
    team: 'Product',
    host_slug: 'alex-johnson',
    is_active: true,
  },
  {
    employee_id: 'emp_004',
    display_name: 'Sarah Chen',
    slack_user_id: 'U012JKL',
    email: 'sarah@company.com',
    team: 'Design',
    host_slug: 'sarah-chen',
    is_active: true,
  },
  {
    employee_id: 'emp_005',
    display_name: 'Michael Davis',
    slack_user_id: 'U345MNO',
    email: 'michael@company.com',
    team: 'Engineering',
    host_slug: 'michael-davis',
    is_active: true,
  },
]

function isGoogleSheetsConfigured(): boolean {
  const sheetId = process.env.GOOGLE_SHEETS_ID
  const jsonCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  
  return !!(sheetId && (jsonCreds || (email && privateKey)))
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetch all employees from Google Sheets (with caching)
 * Falls back to demo data if Google Sheets is not configured or on any error
 */
export async function getEmployees(): Promise<Employee[]> {
  try {
    // Check if Google Sheets is configured
    const sheetId = process.env.GOOGLE_SHEETS_ID
    const jsonCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    
    const hasCredentials = jsonCreds || (email && privateKey)
    
    if (!sheetId || !hasCredentials) {
      return DEMO_EMPLOYEES
    }

    // Check cache
    if (employeeCache && Date.now() - employeeCache.timestamp < CACHE_TTL_MS) {
      return employeeCache.data
    }

    const credentials = getCredentials()
    const accessToken = await getAccessToken(credentials)
    const rows = await fetchSheetData(sheetId, accessToken)
    
    const employees = rows
      .map(normalizeEmployee)
      .filter((e): e is Employee => e !== null)

    // Update cache
    employeeCache = {
      data: employees,
      timestamp: Date.now(),
    }

    return employees
  } catch (error) {
    console.error('Error fetching employees from Google Sheets:', error)
    return DEMO_EMPLOYEES
  }
}

/**
 * Get only active employees
 */
export async function getActiveEmployees(): Promise<Employee[]> {
  const employees = await getEmployees()
  return employees.filter(e => e.is_active)
}

/**
 * Get public employee data (safe for client)
 */
export async function getPublicEmployees(): Promise<PublicEmployee[]> {
  const employees = await getActiveEmployees()
  return employees.map(e => ({
    employee_id: e.employee_id,
    display_name: e.display_name,
    team: e.team,
    email: e.email,
    host_slug: e.host_slug,
  }))
}

/**
 * Find employee by ID
 */
export async function getEmployeeById(id: string): Promise<Employee | null> {
  const employees = await getActiveEmployees()
  return employees.find(e => e.employee_id === id) || null
}

/**
 * Find employee by host slug
 */
export async function getEmployeeBySlug(slug: string): Promise<Employee | null> {
  const employees = await getActiveEmployees()
  return employees.find(e => e.host_slug.toLowerCase() === slug.toLowerCase()) || null
}
