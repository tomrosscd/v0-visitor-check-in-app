'use client'

/**
 * Host Combobox Component
 * 
 * A searchable combobox for selecting an employee host.
 * Features:
 * - Search by name, email, or team
 * - Shows team and email for disambiguation
 * - Accessible with ARIA roles and keyboard navigation
 * - "Not sure" option for QR mode
 */

import * as React from 'react'
import { Check, ChevronsUpDown, HelpCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { PublicEmployee } from '@/lib/validation'

interface HostComboboxProps {
  employees: PublicEmployee[]
  value: string | null
  onChange: (employeeId: string | null) => void
  disabled?: boolean
  showNotSure?: boolean
  placeholder?: string
  className?: string
  isQrMode?: boolean
}

export function HostCombobox({
  employees,
  value,
  onChange,
  disabled = false,
  showNotSure = false,
  placeholder = 'Select your host...',
  className,
  isQrMode = false,
}: HostComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedEmployee = React.useMemo(() => {
    if (!value) return null
    return employees.find(e => e.employee_id === value) || null
  }, [employees, value])

  const displayValue = React.useMemo(() => {
    if (!selectedEmployee) return null
    const teamSuffix = selectedEmployee.team ? ` (${selectedEmployee.team})` : ''
    return `${selectedEmployee.display_name}${teamSuffix}`
  }, [selectedEmployee])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select host"
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            isQrMode && 'h-14 text-lg',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value === 'NOT_SURE' ? (
            <span className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Not sure who I&apos;m meeting
            </span>
          ) : displayValue ? (
            <span className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 shrink-0" />
              {displayValue}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search by name, team, or email..." 
            className={cn(isQrMode && 'h-12 text-base')}
          />
          <CommandList>
            <CommandEmpty>No match found. Try another name.</CommandEmpty>
            <CommandGroup>
              {employees.map((employee) => {
                const teamSuffix = employee.team ? ` (${employee.team})` : ''
                return (
                  <CommandItem
                    key={employee.employee_id}
                    value={`${employee.display_name} ${employee.email || ''} ${employee.team || ''}`}
                    onSelect={() => {
                      onChange(employee.employee_id === value ? null : employee.employee_id)
                      setOpen(false)
                    }}
                    className={cn(isQrMode && 'py-3')}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === employee.employee_id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className={cn(isQrMode && 'text-base')}>
                        {employee.display_name}{teamSuffix}
                      </span>
                      {employee.email && (
                        <span className="text-xs text-muted-foreground">
                          {employee.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            
            {showNotSure && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="not-sure-who-im-meeting"
                    onSelect={() => {
                      onChange('NOT_SURE')
                      setOpen(false)
                    }}
                    className={cn(isQrMode && 'py-3')}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === 'NOT_SURE' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      <span className={cn(isQrMode && 'text-base')}>
                        I&apos;m not sure who I&apos;m meeting
                      </span>
                    </div>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
