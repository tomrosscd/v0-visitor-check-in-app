# Visitor Check-in App

Small Next.js app for office visitor check-in. It supports:

- demo mode with built-in employee data
- Supabase-ready host directory and visit logging
- Google Sheets as a fallback employee directory during migration
- Slack notifications for host alerts with action-ready visit status endpoints
- personal host links at `/c/[hostSlug]`
- a lobby / kiosk flow at `/checkin?mode=qr`
- host self-service dashboard at `/host`

## Requirements

- Node.js 22+
- pnpm 10+

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a local env file:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
pnpm dev
```

4. Open [http://localhost:3000/checkin](http://localhost:3000/checkin)

## Demo mode

You can run the app without Supabase, Google Sheets, or Slack configured.

In demo mode:

- `/api/employees` serves built-in employee data
- check-ins still succeed
- Slack notifications are skipped

Set `OFFICE_PHONE` and `NEXT_PUBLIC_OFFICE_PHONE` if you want the fallback help number shown in the UI.

## Production env vars

### Supabase

For the new host dashboard, Google login, and visit logging, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Then:

1. enable Google auth in Supabase Auth
2. run the SQL in [supabase/migrations/0001_host_directory.sql](/Users/tomross/Library/CloudStorage/GoogleDrive-tom@tomross.work/My%20Drive/Side%20Projects/Void/v0-visitor-check-in-app/supabase/migrations/0001_host_directory.sql)
3. add your first office and host records

### Google Sheets

Use either:

- `GOOGLE_SERVICE_ACCOUNT_JSON`

Or:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Always set:

- `GOOGLE_SHEETS_ID`

Expected sheet headers:

```text
employee_id | display_name | slack_user_id | email | team | host_slug | is_active
```

### Slack

Use either:

- `SLACK_WEBHOOK_URL`

Or:

- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL`
- `SLACK_SIGNING_SECRET` for interactive Slack actions

The app now includes:

- `POST /api/slack/actions` for Slack button callbacks
- `GET /api/visit-status/:visitId` for visitor-page polling

Recommended Slack buttons:

- `visit_on_my_way`
- `visit_running_late`
- `visit_need_backup`

## Useful routes

- `/checkin`
- `/checkin?mode=qr`
- `/c/tom-ross`
- `/host`
- `/api/health`

## Migration approach

The app is now structured to prefer Supabase when configured and fall back to
Google Sheets or demo data otherwise.

- host directory reads go through `lib/directory.ts`
- visit creation is stored in Supabase when available
- personal host links still work at `/c/[hostSlug]`
- hosts can sign in with Google and manage their personal calendar snippet

## Next steps

- import your current Sheet users into `host_directory`
- connect your Slack bot token and channel
- wire Slack messages to include visit action buttons
- optionally retire Google Sheets once Supabase is the source of truth

## Notes

- The app intentionally degrades in local/demo mode when integrations are missing.
- If you use a restricted network, avoid remote assets that require build-time downloads.
