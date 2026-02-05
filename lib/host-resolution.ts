/**
 * Host Resolution Logic
 * 
 * Resolves a host parameter to an employee using multiple strategies:
 * 1. Match employee_id (exact)
 * 2. Match host_slug (exact, case-insensitive)
 * 3. Match display_name (exact, case-insensitive)
 * 4. Match display_name (fuzzy startsWith, only if unique result)
 * 
 * If multiple matches are found, returns them for user selection.
 */

import { getActiveEmployees } from './sheets'
import { Employee, HostResolutionResult, ResolvedHost, PublicEmployee } from './validation'

function employeeToResolvedHost(employee: Employee): ResolvedHost {
  return {
    employee_id: employee.employee_id,
    display_name: employee.display_name,
    slack_user_id: employee.slack_user_id,
    host_slug: employee.host_slug,
    team: employee.team || null,
    email: employee.email || null,
  }
}

function employeeToPublic(employee: Employee): PublicEmployee {
  return {
    employee_id: employee.employee_id,
    display_name: employee.display_name,
    team: employee.team || null,
    email: employee.email || null,
    host_slug: employee.host_slug,
  }
}

/**
 * Resolve a host parameter to an employee
 * 
 * Resolution order:
 * 1. Exact match on employee_id
 * 2. Exact match on host_slug (case-insensitive)
 * 3. Exact match on display_name (case-insensitive)
 * 4. Fuzzy match on display_name (startsWith, case-insensitive) - only if unique
 */
export async function resolveHost(hostParam: string): Promise<HostResolutionResult> {
  if (!hostParam || hostParam.trim() === '') {
    return { status: 'not_found' }
  }

  const query = hostParam.trim()
  const queryLower = query.toLowerCase()
  const employees = await getActiveEmployees()

  // 1. Exact match on employee_id
  const byId = employees.find(e => e.employee_id === query)
  if (byId) {
    return { status: 'resolved', host: employeeToResolvedHost(byId) }
  }

  // 2. Exact match on host_slug (case-insensitive)
  const bySlug = employees.find(e => e.host_slug.toLowerCase() === queryLower)
  if (bySlug) {
    return { status: 'resolved', host: employeeToResolvedHost(bySlug) }
  }

  // 3. Exact match on display_name (case-insensitive)
  const exactNameMatches = employees.filter(
    e => e.display_name.toLowerCase() === queryLower
  )
  
  if (exactNameMatches.length === 1) {
    return { status: 'resolved', host: employeeToResolvedHost(exactNameMatches[0]) }
  }
  
  if (exactNameMatches.length > 1) {
    return { 
      status: 'multiple', 
      matches: exactNameMatches.map(employeeToPublic) 
    }
  }

  // 4. Fuzzy match on display_name (startsWith, case-insensitive)
  const fuzzyMatches = employees.filter(
    e => e.display_name.toLowerCase().startsWith(queryLower)
  )

  if (fuzzyMatches.length === 1) {
    return { status: 'resolved', host: employeeToResolvedHost(fuzzyMatches[0]) }
  }

  if (fuzzyMatches.length > 1) {
    return { 
      status: 'multiple', 
      matches: fuzzyMatches.map(employeeToPublic) 
    }
  }

  // No match found
  return { status: 'not_found' }
}

/**
 * Resolve host by employee_id (used when user selects from combobox)
 */
export async function resolveHostById(employeeId: string): Promise<ResolvedHost | null> {
  const employees = await getActiveEmployees()
  const employee = employees.find(e => e.employee_id === employeeId)
  
  if (!employee) {
    return null
  }

  return employeeToResolvedHost(employee)
}

/**
 * Search employees for combobox
 */
export async function searchEmployees(query: string): Promise<PublicEmployee[]> {
  const employees = await getActiveEmployees()
  
  if (!query || query.trim() === '') {
    return employees.map(employeeToPublic)
  }

  const queryLower = query.toLowerCase().trim()

  return employees
    .filter(e => 
      e.display_name.toLowerCase().includes(queryLower) ||
      e.email?.toLowerCase().includes(queryLower) ||
      e.team?.toLowerCase().includes(queryLower)
    )
    .map(employeeToPublic)
}
