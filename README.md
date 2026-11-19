# DueNudge

DueNudge helps service businesses collect booking deposits, remind customers before appointments, follow up after no-shows, and bring opted-in past customers back. The current booking MVP supports service listings, public booking requests, Nigeria/NGN Paystack subaccount settlement, owner time confirmation, appointment reminders, no-show tracking and rebooking, and email win-backs.

## Local development

```bash
npm ci
npm run dev
```

Create a local `.env.local` from the environment variable list below. Never commit secret values.

## Database migration

Before using the booking workspace, apply `supabase/migrations/20261119000000_booking_recovery.sql` to the Supabase project connected to this deployment. This migration creates business settings, services, customers, bookings, and message history with owner-scoped row-level security. Existing freelancer follow-up tables are intentionally left intact.

## Required deployment configuration

Configure these in the Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never use a `NEXT_PUBLIC_` prefix)
- `PAYSTACK_SECRET_KEY` (server-side only; use Paystack test credentials for testing)
- `RESEND_API_KEY`
- `RESEND_FROM` (optional override; use a sender domain verified in Resend before sending customer emails)
- `NEXT_PUBLIC_APP_URL` (for example, `https://getduenudge.com`)
- `CRON_SECRET` (a long random value used to authenticate the scheduled reminder endpoint)

Configure the Paystack webhook URL as `https://getduenudge.com/api/paystack-webhook` and enable the `charge.success` event. Customer booking deposits are initialized with the business’s Paystack subaccount, `percentage_charge: 0`, and `bearer: subaccount`, so DueNudge takes no percentage share and the business bears Paystack transaction fees. A business must explicitly verify its bank-account name and create its settlement subaccount before a deposit-required service can accept payment. DueNudge stores the verified account name, bank label, and subaccount code—not the raw bank account number.

Each business must publish its own cancellation and refund terms before its deposit services can accept online payment. The terms the customer accepts are recorded with that booking. A paid deposit is routed to the business and is not automatically refunded by DueNudge; refund/cancellation handling is currently managed by the business through Paystack.

## Scheduled email reminders and win-backs

The repository’s hourly GitHub Actions workflow calls `/api/send-reminders`. Set the same secret value in both places:

- Vercel environment variable: `CRON_SECRET`
- GitHub repository Actions secret: `DUENUDGE_CRON_SECRET`

The endpoint processes existing freelancer reminders, confirmed-booking reminders, one-time no-show rebooking emails after 24 hours (marketing opt-in required), and opted-in win-back email. Configure a Resend sender that is verified for the business’s email domain before enabling production sending.

## Deployment

The app is deployed on Vercel from GitHub. Merge the reviewed feature branch into the connected deployment branch to trigger production deployment. Apply the Supabase migration and configure the variables/webhook/cron secrets before enabling customer bookings or live payments. Test settlement with Paystack test-mode credentials first.
