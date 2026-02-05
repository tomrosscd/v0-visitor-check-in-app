/**
 * Visitor Check-in App - Homepage
 * 
 * Redirects to the main check-in page.
 * 
 * Setup Instructions:
 * ==================
 * 
 * Required Environment Variables:
 * - GOOGLE_SHEETS_ID: The ID of your Google Sheet containing employee data
 * - GOOGLE_SERVICE_ACCOUNT_JSON: Full JSON credentials for service account
 *   OR
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: Private key (with \n for newlines)
 * - SLACK_WEBHOOK_URL: Slack incoming webhook URL
 *   OR
 * - SLACK_BOT_TOKEN: Slack bot OAuth token (xoxb-...)
 * - SLACK_CHANNEL: Channel to post to (default: #melbourne-office)
 * - OFFICE_PHONE: Fallback phone number for display
 * - NEXT_PUBLIC_OFFICE_PHONE: Same phone number (for client-side display)
 * 
 * Google Sheet Format:
 * | employee_id | display_name | slack_user_id | email | team | host_slug | is_active |
 * |-------------|--------------|---------------|-------|------|-----------|-----------|
 * | emp_001     | Tom Ross     | U123ABC       | tom@  | Eng  | tom-ross  | TRUE      |
 * | emp_002     | Jane Smith   | U456DEF       | jane@ | Sales| jane-smith| TRUE      |
 * 
 * Link Generation:
 * - Calendar invite: /checkin?mode=calendar&source=calendar
 * - Personal link: /c/tom-ross (uses host_slug from sheet)
 * - Lobby QR code: /qr
 * 
 * Health check: /api/health
 */

import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/checkin')
}
