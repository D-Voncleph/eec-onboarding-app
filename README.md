# EEC Onboarding App - WHOP Native App

A WHOP-native onboarding automation platform for creators. Deploy as an embedded app within WHOP.

## Features

- **Dashboard Analytics**: Track refund rates, completion rates, and member engagement
- **Sequence Editor**: Create 5-day onboarding email sequences
- **Member Queue**: View active members and their progress
- **Premium Access**: Gate premium features behind WHOP membership
- **Email Automation**: Automated onboarding flows via Inngest + Resend

## Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Express.js + Inngest
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **Authentication**: WHOP SDK (iframe-native)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase service role key
- `WHOP_APP_ID` - Your WHOP app ID
- `WHOP_API_KEY` - Your WHOP API key
- `WHOP_WEBHOOK_SECRET` - Webhook signing secret
- `RESEND_API_KEY` - For sending emails

### 3. Run Locally

```bash
# Development mode (uses mock data)
npm run dev

# With backend server
npm run start:all
```

### 4. Build for Production

```bash
npm run build
```

## WHOP App Configuration

### 1. Create WHOP App

1. Go to [WHOP Developer Dashboard](https://dashboard.whop.com/developer)
2. Create a new app
3. Note your `WHOP_APP_ID` and `WHOP_API_KEY`

### 2. Configure App URL

Deploy your app to a hosting provider, then add your URL:
- **Railway**: `railway up`
- **Render**: Connect your GitHub repo
- **Fly.io**: `fly deploy`
- **Vercel**: `npx vercel --prod`

### 3. Set Up Webhooks

In WHOP Developer Dashboard, add webhook endpoints:

```
https://your-domain.com/api/webhook/whop
```

Events to subscribe:
- `membership.went_valid`
- `membership.went_invalid`
- `payment.succeeded`
- `payment.failed`

### 4. Configure Database

Run the migration script in Supabase SQL editor:

```bash
# migrations/migration_whop_users.sql
```

This adds:
- `whop_user_id` columns to all tables
- Indexes for fast lookups
- RLS policies for WHOP authentication

### 5. Submit for Review

1. Test thoroughly in development mode
2. Deploy to production
3. Add app to WHOP App Store
4. Submit for review

## App Structure

```
eec-onboarding-app/
├── server/
│   ├── index.js          # Express server with API endpoints
│   ├── inngest/
│   │   ├── client.js     # Inngest client configuration
│   │   └── functions.js  # Background job functions
│   └── lib/
│       └── whop-sdk.js   # Server-side WHOP SDK wrapper
├── src/
│   ├── lib/
│   │   └── whop-sdk.jsx  # Frontend WHOP auth context
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── SequenceEditor.jsx
│   │   ├── MemberQueue.jsx
│   │   ├── ConfigPanel.jsx
│   │   └── PaymentButton.jsx
│   ├── App.jsx           # Main app with routing
│   └── main.jsx          # Entry point
├── migrations/
│   └── migration_whop_users.sql
├── scripts/
│   └── deploy.js         # Deployment script
└── dist/                 # Production build output
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/sequence` | GET | WHOP | Get user's sequence |
| `/api/deploy` | POST | WHOP | Save/update sequence |
| `/api/members` | GET | WHOP | List members |
| `/api/metrics/dashboard` | GET | WHOP | Get dashboard metrics |
| `/api/preferences` | GET/PUT | WHOP | User preferences |
| `/api/premium/status` | GET | WHOP | Check premium access |
| `/api/webhook/whop` | POST | Verified | WHOP webhook handler |
| `/api/inngest` | POST | - | Inngest event handler |

## Development Mode

Set `VITE_WHOP_DEV_MODE=true` in `.env` to enable:

- Mock user authentication
- Simulated premium access
- Test data for dashboard

## Production Checklist

- [ ] All environment variables set
- [ ] Database migration applied
- [ ] Webhooks configured in WHOP
- [ ] Premium plan IDs configured
- [ ] CORS settings correct for WHOP domains
- [ ] Build passes without errors
- [ ] App tested in WHOP iframe
- [ ] Email templates verified with Resend

## Support

For WHOP app issues, refer to:
- [WHOP Developer Docs](https://docs.whop.com)
- [WHOP SDK Reference](https://docs.whop.com/sdk)
