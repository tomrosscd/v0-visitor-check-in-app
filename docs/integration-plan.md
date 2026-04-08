# Integration Plan

## Product model

- Visitors can arrive by QR code or by host-specific personal link.
- Hosts sign in with Google at `/host`.
- Hosts copy a calendar-ready snippet that contains their personal arrival link.
- Check-ins create a `visit` record and notify Slack.
- Slack actions update visit status so the visitor success page can reflect host acknowledgment.

## Core routes

- `/checkin`: generic visitor arrival form
- `/c/[hostSlug]`: host-specific arrival form for calendar invites
- `/host`: Google-authenticated host dashboard
- `/api/checkin`: creates a visit and dispatches Slack notifications
- `/api/visit-status/[visitId]`: visitor success-page polling endpoint
- `/api/slack/actions`: Slack interactive callback endpoint

## Recommended Slack app features

- `chat:write`
- `chat:write.public` if posting to channels the bot is not explicitly invited to
- `im:write` for direct messages to hosts
- `commands` if you want slash commands later
- interactivity enabled
- event subscriptions are optional for phase one

Suggested message actions:

- Down in 2 minutes
- Down in 5 minutes
- Ask office support to collect

## Slack app setup

1. Create a Slack app in your test workspace.
2. Enable a bot user.
3. Add OAuth bot scopes:
   - `chat:write`
   - `im:write`
   - optionally `chat:write.public`
4. Turn on Interactivity.
5. Set the Request URL to:
   - `/api/slack/actions`
6. Install the app to your workspace.
7. Copy these env vars into `.env.local`:
   - `SLACK_BOT_TOKEN`
   - `SLACK_CHANNEL`
   - `SLACK_SIGNING_SECRET`

With that in place, a host mention will be posted into the office channel and,
when possible, the host will also get a direct message from the bot. Their
button response updates the visitor success page through the visit status API.

## Suggested host fields

- `full_name`
- `email`
- `slug`
- `slack_user_id`
- `phone`
- `avatar_url`
- `parking_instructions`
- `arrival_instructions`
- `calendar_snippet`
- `office_id`
- `is_active`

## Visitor success states

- `notified`
- `on_my_way`
- `running_late`
- `needs_backup`
- `triage`

## Rollout

1. Run Supabase migration.
2. Enable Google auth in Supabase.
3. Import hosts.
4. Connect Slack bot.
5. Update check-in message formatting to include visit action buttons.
6. Retire Google Sheets after Supabase host data is stable.
