import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BrandShellProps {
  children: React.ReactNode
  isQrMode?: boolean
}

const OFFICES = [
  {
    city: 'Melbourne',
    lines: ['Level 3, 22-24 Hoddle St', 'Abbotsford VIC 3067', 'Australia'],
  },
  {
    city: 'Sydney',
    lines: ['The Commons', '285A Crown Street', 'Surry Hills NSW 2010'],
  },
  {
    city: 'Brisbane',
    lines: ['154 Melbourne Street', 'South Brisbane QLD 4101', 'Australia'],
  },
]

export function BrandShell({ children, isQrMode = false }: BrandShellProps) {
  return (
    <div className="brand-page">
      <div className="brand-shell">
        <header className="brand-panel mb-6 rounded-[2rem] px-5 py-4 sm:px-7 lg:px-9">
          <div className="flex items-center justify-between gap-4">
            <div className="brand-wordmark">CONVERT</div>
            {!isQrMode && (
              <>
                <nav className="hidden rounded-full border border-border/70 bg-background/80 px-2 py-1 md:flex md:items-center md:gap-1">
                  {['Our Work', 'Services', 'Partners', 'About Us', 'Insights'].map((item) => (
                    <span
                      key={item}
                      className="rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </nav>
                <Button size="sm" className="hidden md:inline-flex">
                  Get In Touch
                </Button>
              </>
            )}
          </div>
        </header>

        {children}

        <footer className="brand-footer mt-8 rounded-[2rem] px-6 py-8 sm:px-9 sm:py-10">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="brand-title max-w-sm text-primary-foreground">
                Let&apos;s build together
              </p>
              {!isQrMode && (
                <Button variant="outline" className="mt-6 border-primary-foreground/35 text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  Get In Touch
                </Button>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {OFFICES.map((office) => (
                <div key={office.city} className="space-y-2 text-sm text-primary-foreground/78">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-primary-foreground/58">
                    {office.city}
                  </p>
                  {office.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-8 flex flex-col gap-4 border-t border-primary-foreground/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-md">
              <p className="text-[10px] uppercase tracking-[0.24em] text-primary-foreground/58">
                Convert Newsletter
              </p>
              <div className="mt-2 flex items-center justify-between rounded-full border border-primary-foreground/18 bg-primary-foreground/7 pl-4 pr-1">
                <span className="py-3 text-sm text-primary-foreground/70">Your email address</span>
                <Button size="sm" variant="secondary">
                  Register
                </Button>
              </div>
            </div>

            <div className={cn('text-primary-foreground/72', isQrMode && 'hidden sm:block')}>
              <p className="text-xs">© 2024 Convert Digital.</p>
            </div>
          </div>

          <div className="relative z-10 mt-8 overflow-hidden">
            <div className="brand-footer-word">CONVERT</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
