/**
 * QR Entry Route
 * 
 * /qr - Lobby QR code entry point
 * 
 * Optimized for lobby signage and kiosk use:
 * - Big touch targets
 * - Large type
 * - High contrast
 * - Auto-focus on first input
 * - "Not sure who I'm meeting" option
 * 
 * This route redirects to /checkin with QR mode enabled.
 * 
 * Example QR code URL: /qr
 * Redirects to: /checkin?mode=qr&source=qr
 */

import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Visitor Check-in',
  description: 'Scan to check in as a visitor',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function QRPage() {
  // Redirect to checkin with QR mode
  redirect('/checkin?mode=qr&source=qr')
}
