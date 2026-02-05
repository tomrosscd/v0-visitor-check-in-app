'use client'

/**
 * Check-in Page Content Component
 * 
 * Handles URL parameter parsing, host resolution, and employee fetching.
 * Renders the appropriate form based on mode and resolved host.
 */

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Building2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CheckinForm } from '@/components/checkin/checkin-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PublicEmployee, CheckinMode, HostResolutionResult } from '@/lib/validation'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

// Office phone for fallback display (client-side safe)
const OFFICE_PHONE = process.env.NEXT_PUBLIC_OFFICE_PHONE || ''

export function CheckinPageContent() {
  const searchParams = useSearchParams()

  // Parse query params
  const modeParam = searchParams.get('mode') as CheckinMode | null
  const mode: CheckinMode = modeParam && ['calendar', 'personal', 'qr'].includes(modeParam) 
    ? modeParam 
    : 'calendar'
  
  const source = searchParams.get('source') || 'direct'
  const hostParam = searchParams.get('host')
  const visitorParam = searchParams.get('visitor') || ''
  const companyParam = searchParams.get('company') || ''
  const notesParam = searchParams.get('notes') || ''
  const hideParam = searchParams.get('hide') || ''
  const meetingParam = searchParams.get('meeting') || undefined

  const hiddenFields = hideParam.split(',').filter(Boolean)

  const isQrMode = mode === 'qr'

  // Fetch employees list
  const { 
    data: employees, 
    error: employeesError, 
    isLoading: employeesLoading 
  } = useSWR<PublicEmployee[]>('/api/employees', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  })

  // Resolve host if provided
  const { 
    data: hostResolution, 
    error: hostError,
    isLoading: hostLoading 
  } = useSWR<HostResolutionResult>(
    hostParam ? `/api/resolve-host?host=${encodeURIComponent(hostParam)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  // Determine initial host value
  const initialHost = React.useMemo(() => {
    if (!hostResolution) return null
    if (hostResolution.status === 'resolved') {
      return hostResolution.host.employee_id
    }
    return null
  }, [hostResolution])

  // Check if host should be shown (not resolved or multiple matches)
  const shouldShowHostPicker = React.useMemo(() => {
    // Always show in QR mode
    if (isQrMode && !hiddenFields.includes('host')) return true
    
    // If no host param, show picker (unless hidden)
    if (!hostParam) return !hiddenFields.includes('host')
    
    // If host couldn't be resolved, show picker
    if (hostResolution?.status === 'not_found') return true
    if (hostResolution?.status === 'multiple') return true
    
    // If host is hidden and resolved, don't show
    if (hiddenFields.includes('host') && hostResolution?.status === 'resolved') return false
    
    return !hiddenFields.includes('host')
  }, [hostParam, hostResolution, hiddenFields, isQrMode])

  // Adjust hidden fields based on resolution
  const effectiveHiddenFields = React.useMemo(() => {
    const fields = [...hiddenFields]
    
    // If host was requested to be hidden but couldn't be resolved, show it
    if (hiddenFields.includes('host') && hostResolution?.status !== 'resolved') {
      return fields.filter(f => f !== 'host')
    }
    
    // If host is resolved and not in QR mode, can hide it
    if (!shouldShowHostPicker && !fields.includes('host')) {
      fields.push('host')
    }
    
    return fields
  }, [hiddenFields, hostResolution, shouldShowHostPicker])

  const isLoading = employeesLoading || (hostParam && hostLoading)
  const hasError = employeesError || hostError

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        'min-h-screen flex items-center justify-center bg-background',
        isQrMode && 'bg-muted/30'
      )}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={cn('animate-spin text-muted-foreground', isQrMode ? 'h-12 w-12' : 'h-8 w-8')} />
          <p className={cn('text-muted-foreground', isQrMode && 'text-xl')}>Loading...</p>
        </div>
      </div>
    )
  }

  // If employees failed to load, continue with empty array (form will still work, just no host dropdown)
  const employeeList = employees || []
  const showEmployeeWarning = (employeesError || !employees) && !isLoading

  return (
    <main className={cn(
      'min-h-screen bg-background',
      isQrMode ? 'bg-muted/30 flex items-center justify-center p-4' : 'py-8 px-4'
    )}>
      <div className={cn(
        'w-full mx-auto',
        isQrMode ? 'max-w-lg' : 'max-w-md'
      )}>
        {/* Logo placeholder */}
        <div className={cn(
          'flex justify-center mb-6',
          isQrMode && 'mb-8'
        )}>
          <div className={cn(
            'flex items-center gap-2 text-foreground',
            isQrMode && 'text-2xl'
          )}>
            <Building2 className={cn(isQrMode ? 'h-10 w-10' : 'h-6 w-6')} />
            <span className="font-semibold">Office Check-in</span>
          </div>
        </div>

        {/* Employee list warning */}
        {showEmployeeWarning && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load the host list. You can still check in and we&apos;ll notify the front desk.
            </AlertDescription>
          </Alert>
        )}

        {/* Host resolution warning */}
        {hostParam && hostResolution?.status === 'not_found' && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We couldn&apos;t find that host. Please select from the list below.
            </AlertDescription>
          </Alert>
        )}

        {hostParam && hostResolution?.status === 'multiple' && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Multiple people match that name. Please select the correct host below.
            </AlertDescription>
          </Alert>
        )}

        {/* Check-in Form */}
        <CheckinForm
          mode={mode}
          source={source}
          employees={employeeList}
          initialHost={initialHost}
          initialVisitor={visitorParam}
          initialCompany={companyParam}
          initialNotes={notesParam}
          meeting={meetingParam}
          hiddenFields={effectiveHiddenFields}
          officePhone={OFFICE_PHONE}
        />
      </div>
    </main>
  )
}
