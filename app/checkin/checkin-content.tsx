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
import { Loader2, AlertCircle } from 'lucide-react'
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

  const initialHostProfile = React.useMemo(() => {
    if (!employees) {
      return null
    }

    if (initialHost) {
      return employees.find((employee) => employee.employee_id === initialHost) || null
    }

    if (hostParam) {
      return employees.find((employee) => employee.host_slug === hostParam) || null
    }

    return null
  }, [employees, hostParam, initialHost])

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
      <div className="brand-page flex min-h-screen items-center justify-center px-4">
        <div className="brand-panel flex max-w-md flex-col items-center gap-4 rounded-[2rem] px-8 py-12 text-center">
          <Loader2 className={cn('animate-spin text-primary', isQrMode ? 'h-12 w-12' : 'h-8 w-8')} />
          <p className="brand-kicker">Preparing your check-in</p>
          <p className="brand-subtitle">
            Loading the latest host list and visitor flow.
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (hasError || !employees) {
    return (
      <div className="brand-page flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load the check-in form. Please try refreshing the page or contact the front desk.
              {OFFICE_PHONE && (
                <span className="block mt-2">
                  Call: {OFFICE_PHONE}
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <main
      className={cn(
        'brand-page',
        isQrMode ? 'flex items-center justify-center p-4' : 'px-4 py-8 sm:px-6 sm:py-12',
      )}
    >
      <div
        className={cn(
          'mx-auto w-full',
          isQrMode ? 'max-w-3xl' : 'max-w-2xl',
        )}
      >
        {hostParam && hostResolution?.status === 'not_found' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We couldn&apos;t find that host. Please select from the list below.
            </AlertDescription>
          </Alert>
        )}

        {hostParam && hostResolution?.status === 'multiple' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Multiple people match that name. Please select the correct host below.
            </AlertDescription>
          </Alert>
        )}

        <section className={cn('brand-panel rounded-[2.25rem] px-6 py-8 sm:px-10 sm:py-12', isQrMode && 'border-2')}>
          <CheckinForm
            mode={mode}
            source={source}
            employees={employees}
            initialHost={initialHost}
            initialHostProfile={initialHostProfile}
            initialVisitor={visitorParam}
            initialCompany={companyParam}
            initialNotes={notesParam}
            meeting={meetingParam}
            hiddenFields={effectiveHiddenFields}
            officePhone={OFFICE_PHONE}
          />
        </section>
      </div>
    </main>
  )
}
