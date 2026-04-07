# Visitor Check-in App

Small Next.js app for office visitor check-in. It supports:

- demo mode with built-in employee data
- Google Sheets as the employee directory
- Slack notifications for host alerts
- personal host links at `/c/[hostSlug]`
- a lobby / kiosk flow at `/checkin?mode=qr`

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

You can run the app without Google Sheets or Slack configured.

In demo mode:

- `/api/employees` serves built-in employee data
- check-ins still succeed
- Slack notifications are skipped

Set `OFFICE_PHONE` and `NEXT_PUBLIC_OFFICE_PHONE` if you want the fallback help number shown in the UI.

## Production env vars

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

## Useful routes

- `/checkin`
- `/checkin?mode=qr`
- `/c/tom-ross`
- `/api/health`

## Notes

- The app intentionally degrades in local/demo mode when integrations are missing.
- If you use a restricted network, avoid remote assets that require build-time downloads.
