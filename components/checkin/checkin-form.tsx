'use client'

/**
 * Check-in Form Component
 * 
 * Handles the visitor check-in form logic for all three modes:
 * - calendar: Default mode from calendar invites
 * - personal: Pre-selected host from personal link
 * - qr: Lobby QR scan with kiosk-friendly UI
 * 
 * Accessibility note: Focus moves to success heading after submit.
 * Focus trap is not needed as the form is a simple linear flow.
 */

import * as React from 'react'
import { Loader2, CheckCircle2, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { HostCombobox } from './host-combobox'
import type { PublicEmployee, CheckinMode, CheckinResponse } from '@/lib/validation'

interface CheckinFormProps {
  mode: CheckinMode
  source: string
  employees: PublicEmployee[]
  initialHost: string | null
  initialVisitor: string
  initialCompany: string
  initialNotes: string
  meeting?: string
  hiddenFields: string[]
  officePhone: string
}

type FormState = 'ready' | 'submitting' | 'success' | 'error'

interface FormErrors {
  visitor?: string
  host?: string
  general?: string
}

export function CheckinForm({
  mode,
  source,
  employees,
  initialHost,
  initialVisitor,
  initialCompany,
  initialNotes,
  meeting,
  hiddenFields,
  officePhone,
}: CheckinFormProps) {
  const [formState, setFormState] = React.useState<FormState>('ready')
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [response, setResponse] = React.useState<CheckinResponse | null>(null)

  // Form values
  const [visitor, setVisitor] = React.useState(initialVisitor)
  const [company, setCompany] = React.useState(initialCompany)
  const [notes, setNotes] = React.useState(initialNotes)
  const [host, setHost] = React.useState<string | null>(initialHost)
  const [honeypot, setHoneypot] = React.useState('')

  const visitorInputRef = React.useRef<HTMLInputElement>(null)
  const successHeadingRef = React.useRef<HTMLHeadingElement>(null)

  const isQrMode = mode === 'qr'
  const isPersonalMode = mode === 'personal'

  // Determine which fields to show
  const showVisitor = !hiddenFields.includes('visitor') || !visitor
  const showCompany = !hiddenFields.includes('company')
  const showNotes = !hiddenFields.includes('notes')
  const showHost = !hiddenFields.includes('host') || !initialHost

  // Auto-focus visitor input in QR mode
  React.useEffect(() => {
    if (isQrMode && visitorInputRef.current) {
      visitorInputRef.current.focus()
    }
  }, [isQrMode])

  // Move focus to success heading after submit
  React.useEffect(() => {
    if (formState === 'success' && successHeadingRef.current) {
      successHeadingRef.current.focus()
    }
  }, [formState])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!visitor.trim()) {
      newErrors.visitor = 'Please enter your name'
    }

    // In calendar mode, host is recommended but not required
    // In personal mode, host should be pre-selected
    // In QR mode, "not sure" is allowed

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Honeypot check (bot detection)
    if (honeypot) {
      // Silently fail for bots
      setFormState('success')
      return
    }

    if (!validateForm()) {
      return
    }

    setFormState('submitting')
    setErrors({})

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitor: visitor.trim(),
          company: company.trim() || undefined,
          notes: notes.trim() || undefined,
          host: host === 'NOT_SURE' ? undefined : host || undefined,
          mode,
          source,
          meeting: meeting || undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Something went wrong')
      }

      const data: CheckinResponse = await res.json()
      setResponse(data)
      setFormState('success')
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      })
      setFormState('error')
    }
  }

  const handleReset = () => {
    setVisitor('')
    setCompany('')
    setNotes('')
    setHost(initialHost)
    setFormState('ready')
    setErrors({})
    setResponse(null)

    // Re-focus visitor input
    setTimeout(() => {
      visitorInputRef.current?.focus()
    }, 100)
  }

  const fieldLabelClassName = 'brand-kicker text-foreground/80'

  // Success state
  if (formState === 'success') {
    return (
      <section className="rounded-[2rem] bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-12">
        <div className={cn('mx-auto max-w-2xl text-center', isQrMode && 'max-w-xl')}>
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary-foreground/15 bg-primary-foreground/8">
              <CheckCircle2 className={cn('text-secondary', isQrMode ? 'h-9 w-9' : 'h-8 w-8')} />
            </div>
          </div>
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className={cn('brand-title text-primary-foreground', isQrMode && 'text-[clamp(2.5rem,8vw,4.75rem)]')}
          >
            You&apos;re all checked in.
          </h2>
          <p className={cn('mx-auto mt-4 max-w-xl text-sm leading-6 text-primary-foreground/75', isQrMode && 'text-base')}>
            {response?.message || 'Your host has been notified and will be down shortly.'}
          </p>
          <p className={cn('mx-auto mt-6 max-w-lg text-sm text-primary-foreground/64', isQrMode && 'text-base')}>
            Please take a seat. Someone will be with you in a few minutes.
          </p>

          {officePhone && (
            <p className={cn('mt-5 flex items-center justify-center gap-2 text-primary-foreground/82', isQrMode && 'text-lg')}>
              <Phone className="h-4 w-4" />
              Need help? Call {officePhone}
            </p>
          )}

          <Button
            onClick={handleReset}
            variant="secondary"
            className={cn('mt-8', isQrMode && 'h-14 px-8 text-sm')}
          >
            Check in another visitor
          </Button>
        </div>
      </section>
    )
  }

  // Mode-specific instructions
  const getInstructions = () => {
    switch (mode) {
      case 'calendar':
        return "Arrived downstairs? Let us know and we'll come get you."
      case 'personal':
        return 'Please enter your details to let your host know you&apos;ve arrived.'
      case 'qr':
        return 'Welcome! Let us know you&apos;re here.'
      default:
        return null
    }
  }

  return (
    <section>
      <div className={cn('mb-8 text-center', isQrMode && 'mb-10')}>
        <h1 className={cn('brand-title text-primary', isQrMode && 'text-[clamp(2.25rem,7vw,4rem)]')}>
          Visitor Check-in
        </h1>
        {getInstructions() && (
          <p className={cn('mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground', isQrMode && 'text-base')}>
            {getInstructions()}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Honeypot field - hidden from users, visible to bots */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="absolute -left-[9999px] opacity-0"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <div className={cn('grid gap-6', showVisitor && showCompany && 'sm:grid-cols-2')}>
          {/* Visitor Name */}
          {showVisitor && (
            <div className="space-y-2">
              <Label
                htmlFor="visitor"
                className={cn(fieldLabelClassName, isQrMode && 'text-[11px]')}
              >
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={visitorInputRef}
                id="visitor"
                type="text"
                value={visitor}
                onChange={(e) => setVisitor(e.target.value)}
                placeholder="Enter your full name"
                disabled={formState === 'submitting'}
                aria-invalid={!!errors.visitor}
                aria-describedby={errors.visitor ? 'visitor-error' : undefined}
                className={cn(
                  isQrMode && 'h-14 text-base',
                  errors.visitor && 'border-destructive'
                )}
              />
              {errors.visitor && (
                <p id="visitor-error" className="text-sm text-destructive">
                  {errors.visitor}
                </p>
              )}
            </div>
          )}

          {/* Company */}
          {showCompany && (
            <div className="space-y-2">
              <Label
                htmlFor="company"
                className={cn(fieldLabelClassName, isQrMode && 'text-[11px]')}
              >
                Company <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name"
                disabled={formState === 'submitting'}
                className={cn(isQrMode && 'h-14 text-base')}
              />
            </div>
          )}
        </div>

        {/* Host Selection */}
        {showHost && (
          <div className="space-y-2">
            <Label className={cn(fieldLabelClassName, isQrMode && 'text-[11px]')}>
              Who are you here to see?
              {!isQrMode && <span className="text-muted-foreground"> (optional)</span>}
            </Label>
            <HostCombobox
              employees={employees}
              value={host}
              onChange={setHost}
              disabled={formState === 'submitting'}
              showNotSure={isQrMode}
              placeholder={isQrMode ? 'Tap to select...' : 'Search for your host...'}
              isQrMode={isQrMode}
            />
            {errors.host && (
              <p className="text-sm text-destructive">
                {errors.host}
              </p>
            )}
          </div>
        )}

        {/* Hidden host display for personal mode */}
        {!showHost && initialHost && isPersonalMode && (
          <div className="rounded-[1.5rem] border border-border/80 bg-muted/40 px-5 py-4">
            <Label className={fieldLabelClassName}>Visiting</Label>
            <p className="mt-2 text-sm">
              {employees.find(e => e.employee_id === initialHost)?.display_name || 'Your host'}
            </p>
          </div>
        )}

        {/* Notes */}
        {showNotes && (
          <div className="space-y-2">
            <Label
              htmlFor="notes"
              className={cn(fieldLabelClassName, isQrMode && 'text-[11px]')}
            >
              Tell us more <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              disabled={formState === 'submitting'}
              className={cn(isQrMode && 'min-h-[120px] text-base')}
            />
          </div>
        )}

          {/* General Error */}
          {errors.general && (
            <div className="rounded-[1.25rem] bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}

          {/* Submit Button */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={formState === 'submitting'}
            className={cn(
              'w-full',
              isQrMode && 'h-16 text-xs'
            )}
          >
            {formState === 'submitting' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking in...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </div>

        {/* Fallback contact in QR mode */}
        {officePhone && (
          <p className="flex items-center justify-center gap-2 text-center text-muted-foreground">
            <Phone className="h-4 w-4" />
            Need help? Call {officePhone}
          </p>
        )}
      </form>
    </section>
  )
}
