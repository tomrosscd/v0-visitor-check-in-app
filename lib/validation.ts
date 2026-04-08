/**
 * Visitor Check-in App - Zod Validation Schemas
 * Shared types for client and server validation
 */

import { z } from 'zod'

// =============================================================================
// Employee Schema (from Google Sheets)
// =============================================================================

export const EmployeeSchema = z.object({
  employee_id: z.string().min(1),
  display_name: z.string().min(1),
  slack_user_id: z.string().min(1),
  email: z.string().email().optional().nullable(),
  team: z.string().optional().nullable(),
  host_slug: z.string().min(1),
  is_active: z.boolean(),
})

export type Employee = z.infer<typeof EmployeeSchema>

// Public employee data (safe to expose to client)
export const PublicEmployeeSchema = EmployeeSchema.pick({
  employee_id: true,
  display_name: true,
  team: true,
  email: true,
  host_slug: true,
}).extend({
  phone: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  parking_instructions: z.string().optional().nullable(),
  arrival_instructions: z.string().optional().nullable(),
  calendar_snippet: z.string().optional().nullable(),
  office_name: z.string().optional().nullable(),
})

export type PublicEmployee = z.infer<typeof PublicEmployeeSchema>

// =============================================================================
// Check-in Mode
// =============================================================================

export const CheckinModeSchema = z.enum(['calendar', 'personal', 'qr'])
export type CheckinMode = z.infer<typeof CheckinModeSchema>

// =============================================================================
// Check-in Form Data
// =============================================================================

export const CheckinFormSchema = z.object({
  visitor: z.string().min(1, 'Please enter your name'),
  company: z.string().optional(),
  notes: z.string().optional(),
  host: z.string().optional(), // employee_id, host_slug, or display_name
  mode: CheckinModeSchema.default('calendar'),
  source: z.string().default('direct'),
  meeting: z.string().optional(), // Phase 2: meeting token
  honeypot: z.string().max(0, 'Bot detected'), // Hidden honeypot field
})

export type CheckinFormData = z.infer<typeof CheckinFormSchema>

// API request schema (what the server receives)
export const CheckinRequestSchema = CheckinFormSchema.omit({ honeypot: true })
export type CheckinRequest = z.infer<typeof CheckinRequestSchema>

// =============================================================================
// Check-in Response
// =============================================================================

export const CheckinResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  hostResolved: z.boolean(),
  timestamp: z.string(),
  visitId: z.string().optional(),
  hostName: z.string().nullable().optional(),
  hostMessage: z.string().nullable().optional(),
  status: z.string().optional(),
})

export type CheckinResponse = z.infer<typeof CheckinResponseSchema>

// =============================================================================
// Host Resolution
// =============================================================================

export const ResolvedHostSchema = z.object({
  employee_id: z.string(),
  display_name: z.string(),
  slack_user_id: z.string(),
  host_slug: z.string(),
  team: z.string().nullable(),
  email: z.string().nullable(),
})

export type ResolvedHost = z.infer<typeof ResolvedHostSchema>

export const HostResolutionResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('resolved'),
    host: ResolvedHostSchema,
  }),
  z.object({
    status: z.literal('multiple'),
    matches: z.array(PublicEmployeeSchema),
  }),
  z.object({
    status: z.literal('not_found'),
  }),
])

export type HostResolutionResult = z.infer<typeof HostResolutionResultSchema>

// =============================================================================
// URL Query Params
// =============================================================================

export const CheckinQueryParamsSchema = z.object({
  host: z.string().optional(),
  visitor: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  hide: z.string().optional(), // comma separated: visitor,company,notes,host
  source: z.string().optional(),
  mode: CheckinModeSchema.optional(),
  meeting: z.string().optional(),
})

export type CheckinQueryParams = z.infer<typeof CheckinQueryParamsSchema>

// =============================================================================
// Health Check
// =============================================================================

export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string(),
  checks: z.object({
    google_sheets: z.boolean(),
    slack: z.boolean(),
    office_phone: z.boolean(),
  }),
  missing: z.array(z.string()),
})

export type HealthCheck = z.infer<typeof HealthCheckSchema>
