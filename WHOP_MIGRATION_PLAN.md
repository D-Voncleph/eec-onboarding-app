# EEC Onboarding App - WHOP Migration Plan

**Created:** January 11, 2026
**Version:** 1.0
**Status:** Ready for Implementation

---

## Executive Summary

This document provides a comprehensive, foolproof plan to migrate the EEC Onboarding App from a standalone web application to a fully-functional WHOP-embedded app. The migration maintains all existing features while adding native WHOP integration, payment capabilities, and proper iframe embedding.

### Key Objectives

1. Replace Supabase Auth with WHOP SDK authentication
2. Ensure seamless iframe embedding within WHOP platform
3. Maintain all core features: Dashboard, Sequence Editor, Member Queue, Webhooks
4. Add payment integration for premium feature access
5. Deploy via WHOP Apps API with proper build promotion workflow

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Strategy](#authentication-strategy)
3. [Backend API Redesign](#backend-api-redesign)
4. [Frontend Updates](#frontend-updates)
5. [Payment Integration](#payment-integration)
6. [Database & Data Migration](#database--data-migration)
7. [Security Implementation](#security-implementation)
8. [Deployment Pipeline](#deployment-pipeline)
9. [Testing & QA Checklist](#testing--qa-checklist)
10. [Implementation Phases](#implementation-phases)
11. [Risk Mitigation](#risk-mitigation)
12. [Rollback Procedures](#rollback-procedures)

---

## Architecture Overview

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Current System                           │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                       │
│  ├── Auth: Supabase Auth                                       │
│  ├── State: React Context + useState                           │
│  └── UI: TailwindCSS + Heroicons                               │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Express.js - Port 3000)                              │
│  ├── API Routes: /api/*                                        │
│  ├── Auth: Bearer token via Supabase                           │
│  ├── Webhooks: /api/webhook/whop/*                             │
│  └── Queue: Inngest for email sequencing                       │
├─────────────────────────────────────────────────────────────────┤
│  Services                                                      │
│  ├── Database: Supabase (PostgreSQL)                           │
│  ├── Email: Resend API                                         │
│  └── Auth: Supabase Auth                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      WHOP-Native System                         │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                       │
│  ├── Auth: WHOP SDK (@whop/react)                              │
│  ├── State: React Context + WHOP UserContext                   │
│  └── UI: TailwindCSS + Frosted UI (@whop/react)                │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Express.js - Port 3000)                              │
│  ├── Auth: Bearer token via WHOP verifyUserToken               │
│  ├── Webhooks: /api/webhook/whop/* (verified)                  │
│  └── Queue: Inngest for email sequencing                       │
├─────────────────────────────────────────────────────────────────┤
│  Services (UNCHANGED)                                          │
│  ├── Database: Supabase (PostgreSQL) - Auth removed            │
│  ├── Email: Resend API                                         │
│  └── Queue: Inngest                                            │
├─────────────────────────────────────────────────────────────────┤
│  WHOP Platform Layer                                           │
│  ├── Iframe Communication via @whop/react                      │
│  ├── Payment: inAppPurchase() + Checkout Embed                 │
│  └── User Context: user_me() + checkAccess()                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architecture Changes

| Component | Current | Target | Impact |
|-----------|---------|--------|--------|
| Auth | Supabase Auth | WHOP SDK | High - All auth flows change |
| User ID | Supabase UUID | WHOP user ID | Medium - Database schema update |
| Webhooks | Basic validation | Verified with webhook secret | High - Security improvement |
| UI Library | Heroicons | Frosted UI | Low - Cosmetic only |
| Payment | None | WHOP Checkout | New feature |

---

## Authentication Strategy

### WHOP SDK Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   WHOP Authentication Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User opens app in WHOP iframe                               │
│           │                                                     │
│           ▼                                                     │
│  2. WHOP passes user token via iframe SDK                      │
│           │                                                     │
│           ▼                                                     │
│  3. Frontend captures token from useIframeSdk()                │
│           │                                                     │
│           ▼                                                     │
│  4. Token sent to backend in Authorization header              │
│           │                                                     │
│           ▼                                                     │
│  5. Backend verifies token with makeUserTokenVerifier          │
│           │                                                     │
│           ▼                                                     │
│  6. Extract WHOP user_id for database operations               │
│           │                                                     │
│           ▼                                                     │
│  7. Return data to frontend                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### Frontend Authentication (New File: `src/lib/whop-auth.jsx`)

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useIframeSdk } from '@whop/react';

const WhopAuthContext = createContext(null);

export function WhopAuthProvider({ children }) {
  const iframeSdk = useIframeSdk();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        if (!iframeSdk) {
          // Dev mode - use mock user
          setUser({ id: 'dev_user', email: 'dev@example.com' });
          setLoading(false);
          return;
        }

        const userData = await iframeSdk.getUser();
        setUser(userData);
      } catch (err) {
        setError(err.message);
        // Fallback to dev mode for testing
        setUser({ id: 'dev_user', email: 'dev@example.com' });
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [iframeSdk]);

  const refreshUser = async () => {
    setLoading(true);
    try {
      const userData = await iframeSdk?.getUser();
      setUser(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WhopAuthContext.Provider value={{ user, loading, error, refreshUser }}>
      {children}
    </WhopAuthContext.Provider>
  );
}

export function useWhopAuth() {
  const context = useContext(WhopAuthContext);
  if (!context) {
    throw new Error('useWhopAuth must be used within WhopAuthProvider');
  }
  return context;
}
```

#### Backend Token Verification (Update: `server/index.js`)

```javascript
import { makeUserTokenVerifier } from "@whop/api";

// Initialize token verifier
const verifyUserToken = makeUserTokenVerifier({
  appId: process.env.WHOP_APP_ID,
});

// Helper to get authenticated user from token
const getWhopUser = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const user = await verifyUserToken(token);
    return user;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

// Middleware for protected routes
const requireWhopAuth = async (req, res, next) => {
  const user = await getWhopUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized - Invalid or missing token' });
  }

  req.whopUser = user;
  next();
};
```

### Authentication Edge Cases

| Scenario | Handling |
|----------|----------|
| Token expired | Frontend detects 401, triggers iframeSdk.refresh() |
| No iframe SDK (dev mode) | Fallback to dev user for local development |
| Invalid token | Return 401, frontend redirects to WHOP login |
| Multiple tabs | Each tab maintains own token state |
| Token refresh | Use iframeSdk.getUser() to refresh |

---

## Backend API Redesign

### Updated API Endpoints

| Endpoint | Method | Auth | Description | File:Line |
|----------|--------|------|-------------|-----------|
| `/api/sequence` | GET | WHOP | Fetch active sequence | server/index.js:39-58 |
| `/api/sequence` | POST | WHOP | Save sequence | server/index.js:61-114 |
| `/api/members` | GET | WHOP | List recent members | server/index.js:117-132 |
| `/api/metrics/dashboard` | GET | WHOP | Dashboard metrics | server/index.js:135-220 |
| `/api/preferences` | GET/PUT | WHOP | Theme preferences | server/index.js:223-281 |
| `/api/webhook/whop` | POST | Verified | Membership webhook | server/index.js:284-327 |
| `/api/webhook/whop/refund` | POST | Verified | Refund webhook | server/index.js:330-373 |
| `/api/inngest` | POST | None | Inngest endpoint | server/index.js:377-380 |
| `/api/purchase/status` | GET | WHOP | Check premium status | NEW |
| `/api/purchase/checkout` | POST | WHOP | Create checkout | NEW |

### Updated Backend Structure

```
server/
├── index.js                    # Main Express server (UPDATED)
├── lib/
│   ├── whop-sdk.js            # NEW - WHOP SDK config
│   └── webhook-validator.js    # NEW - Webhook signature verification
├── routes/
│   ├── sequence.js            # NEW - Sequence routes
│   ├── members.js             # NEW - Member routes
│   ├── metrics.js             # NEW - Metrics routes
│   └── purchase.js            # NEW - Payment routes
└── inngest/
    ├── client.js
    └── functions.js
```

### CORS Configuration (Update: `server/index.js`)

```javascript
import cors from 'cors';

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from WHOP domains
    const allowedOrigins = [
      'https://whop.com',
      'https://www.whop.com',
      'https://dashboard.whop.com',
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Backend server
    ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-whop-signature'],
};

app.use(cors(corsOptions));
```

### Webhook Verification (New: `server/lib/webhook-validator.js`)

```javascript
import { makeWebhookValidator } from "@whop/api";

// Create webhook validator
const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
  signatureHeaderName: "x-whop-signature",
});

export async function verifyWhopWebhook(req) {
  try {
    const webhook = await validateWebhook(req);
    return webhook;
  } catch (error) {
    console.error('Webhook verification failed:', error.message);
    throw new Error('Invalid webhook signature');
  }
}
```

### Updated Webhook Endpoint (Update: `server/index.js`)

```javascript
import { verifyWhopWebhook } from './lib/webhook-validator.js';

// WHOP Membership Webhook
app.post('/api/webhook/whop', async (req, res) => {
  try {
    // Verify webhook signature
    const webhook = await verifyWhopWebhook(req);
    const { action, data } = webhook;

    console.log(`⚡ Webhook received: ${action}`);

    switch (action) {
      case 'membership.went_valid':
        // New member joined
        await handleNewMembership(data);
        break;

      case 'membership.went_invalid':
        // Membership canceled/expired
        await handleMembershipEnded(data);
        break;

      case 'payment.succeeded':
        // Payment successful - trigger premium access
        await handlePaymentSuccess(data);
        break;

      case 'payment.failed':
        // Payment failed
        await handlePaymentFailed(data);
        break;

      default:
        console.log(`Unhandled webhook action: ${action}`);
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

async function handleNewMembership(data) {
  const { user_id, plan_id, started_at } = data;

  // Record new member in Supabase
  const { error } = await supabase
    .from('members')
    .upsert({
      whop_user_id: user_id,
      status: 'Active',
      joined_at: new Date(started_at),
      plan_id: plan_id,
    }, { onConflict: 'whop_user_id' });

  if (error) {
    console.error('Failed to record member:', error);
  }

  // Trigger onboarding flow
  await inngest.send({
    name: 'app/webhook.received',
    data: { userId: user_id, event: 'membership.activated' },
  });
}
```

---

## Frontend Updates

### File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| `src/App.jsx` | UPDATE | Replace Supabase Auth with WHOP Auth |
| `src/lib/supabase.js` | UPDATE | Make optional for dev mode |
| `src/Auth.jsx` | UPDATE | Add WHOP login fallback |
| `src/lib/whop-auth.jsx` | CREATE | New authentication context |
| `src/components/PaymentButton.jsx` | CREATE | Premium purchase button |
| `src/hooks/useWhopSdk.js` | CREATE | Custom hook for iframe SDK |
| `src/config/whop.js` | CREATE | WHOP configuration |

### Updated App.jsx Structure

```jsx
import { useWhopAuth } from './lib/whop-auth';
import { useIframeSdk } from '@whop/react';

// Remove Supabase imports
// import { supabase } from './lib/supabase';

export default function App() {
  const { user, loading, error } = useWhopAuth();
  const iframeSdk = useIframeSdk();
  const [activeView, setActiveView] = useState('dashboard');

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-text-secondary font-mono">Initializing...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center p-6 bg-card/40 rounded-xl border border-error/20">
          <p className="text-error">Authentication Error</p>
          <p className="text-text-secondary mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-accent text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render main app
  return (
    <div className="flex h-screen bg-primary text-text-primary">
      {/* Sidebar */}
      <Sidebar user={user} onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {activeView === 'dashboard' && <Dashboard user={user} />}
          {activeView === 'editor' && <SequenceEditor user={user} />}
          {activeView === 'queue' && <MemberQueue user={user} />}
          {activeView === 'settings' && <ConfigPanel user={user} />}
        </div>
      </main>
    </div>
  );
}

async function handleSignOut() {
  if (iframeSdk) {
    await iframeSdk.close();
  }
  // No local sign out needed - WHOP handles session
}
```

### Payment Button Component (New: `src/components/PaymentButton.jsx`)

```jsx
import { useIframeSdk } from '@whop/react';

export default function PaymentButton({ planId, children, className }) {
  const iframeSdk = useIframeSdk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handlePurchase() {
    setLoading(true);
    setError(null);

    try {
      if (!iframeSdk) {
        // Dev mode - simulate purchase
        alert('Dev mode: Purchase simulated');
        return;
      }

      const result = await iframeSdk.inAppPurchase({ planId });

      if (result.status === 'ok') {
        // Purchase successful
        alert('Purchase successful! Premium features enabled.');
        // Refresh user data to update access
        window.location.reload();
      } else {
        setError(result.error || 'Purchase failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className={`${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
```

### Iframe Resize Handling (New: `src/hooks/useWhopSdk.js`)

```javascript
import { useEffect, useState } from 'react';
import { useIframeSdk } from '@whop/react';

export function useWhopResize() {
  const iframeSdk = useIframeSdk();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!iframeSdk) return;

    // Initial resize to fit content
    iframeSdk.resize({ width: '100%', height: '100%' });

    // Listen for resize events
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [iframeSdk]);

  return dimensions;
}
```

### Updated Sequence Editor (Update: `src/App.jsx` - SequenceEditor function)

The SequenceEditor component needs updates to use WHOP user context:

```javascript
function SequenceEditor() {
  const { user } = useWhopAuth();
  const [sequence, setSequence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSequence() {
      try {
        // Get token from localStorage (set by auth provider)
        const token = localStorage.getItem('whop_token');

        const res = await fetch('http://localhost:3000/api/sequence', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.sequence && data.sequence.length > 0) {
          setSequence(data.sequence);
        }
      } catch (err) {
        console.error('Failed to load sequence:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSequence();
  }, [user]);

  // ... rest of component unchanged
}
```

---

## Payment Integration

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Premium Purchase Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User clicks "Upgrade to Premium"                            │
│           │                                                     │
│           ▼                                                     │
│  2. Frontend calls iframeSdk.inAppPurchase({ planId })         │
│           │                                                     │
│           ▼                                                     │
│  3. WHOP displays checkout modal                                │
│           │                                                     │
│           ▼                                                     │
│  4. User completes payment                                      │
│           │                                                     │
│           ▼                                                     │
│  5. WHOP sends payment webhook                                  │
│           │                                                     │
│           ▼                                                     │
│  6. Backend verifies and grants premium access                  │
│           │                                                     │
│           ▼                                                     │
│  7. Frontend refreshes user data                                │
│           │                                                     │
│           ▼                                                     │
│  8. Premium features unlocked                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Plan Configuration

```javascript
// src/config/plans.js
export const PLANS = {
  PREMIUM: {
    id: process.env.VITE_WHOP_PREMIUM_PLAN_ID,
    name: 'EEC Premium',
    price: '$10,000',
    features: [
      'Full Sequence Editor',
      'Unlimited Members',
      'Email Automation',
      'Priority Support',
      'Custom Branding',
    ],
  },
  ENTERPRISE: {
    id: process.env.VITE_WHOP_ENTERPRISE_PLAN_ID,
    name: 'EEC Enterprise',
    price: 'Custom',
    features: [
      'Everything in Premium',
      'White-label Solution',
      'API Access',
      'Dedicated Account Manager',
    ],
  },
};
```

### Premium Access Check (New: `server/lib/premium-access.js`)

```javascript
import { whopSdk } from './whop-sdk.js';

export async function checkPremiumAccess(userId) {
  try {
    // Check if user has active premium membership
    const response = await whopSdk.users.checkAccess(
      process.env.WHOP_PREMIUM_PRODUCT_ID,
      { id: userId }
    );

    return {
      hasAccess: response.has_access,
      accessLevel: response.access_level,
    };
  } catch (error) {
    console.error('Failed to check premium access:', error);
    return { hasAccess: false, accessLevel: 'no_access' };
  }
}

export async function requirePremiumAccess(userId) {
  const access = await checkPremiumAccess(userId);

  if (!access.hasAccess) {
    throw new Error('Premium access required');
  }

  return access;
}
```

### Updated Metrics Endpoint with Premium Check (Update: `server/index.js`)

```javascript
app.get('/api/metrics/dashboard', requireWhopAuth, async (req, res) => {
  const { id: userId } = req.whopUser;

  // Check premium access
  const premium = await checkPremiumAccess(userId);

  // If not premium, return limited metrics
  if (!premium.hasAccess) {
    return res.json({
      limited: true,
      upgradeRequired: true,
      message: 'Upgrade to Premium for full analytics',
    });
  }

  // ... existing metrics logic
});
```

---

## Database & Data Migration

### Supabase Schema Updates

The database schema needs to be updated to use WHOP user IDs instead of Supabase UUIDs:

```sql
-- migration_whop_users.sql
-- Run this migration to add WHOP user ID support

-- 1. Add whop_user_id column to existing tables
ALTER TABLE members ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE;
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS whop_user_id TEXT;
ALTER TABLE member_events ADD COLUMN IF NOT EXISTS whop_user_id TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_whop_user ON members(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_whop_user ON sequences(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_events_whop_user ON member_events(whop_user_id);

-- 3. Update RLS policies to use whop_user_id
ALTER TABLE members DROP POLICY IF EXISTS "Users can view own members" ON members;
ALTER TABLE members DROP POLICY IF EXISTS "Users can insert own members" ON members;

CREATE POLICY "Users can view own members" ON members
  FOR SELECT USING (auth.uid()::TEXT = whop_user_id);

CREATE POLICY "Users can insert own members" ON INSERT WITH CHECK ( members
  FORauth.uid()::TEXT = whop_user_id);

-- Similar updates for other tables...
```

### User Data Migration Strategy

**Phase 1: Backward Compatibility**
- Add `whop_user_id` column alongside `user_id`
- Write to both columns during transition period
- Read from either column

**Phase 2: Data Sync Script**
```javascript
// scripts/migrate-users.js
// Run this script to map existing users to WHOP IDs

async function migrateUsers() {
  // Get all existing users
  const { data: users } = await supabase
    .from('auth.users')
    .select('id, email');

  for (const user of users) {
    // Get WHOP user ID by email (if account exists)
    const whopUser = await whopSdk.users.findByEmail(user.email);

    if (whopUser) {
      // Update all tables with WHOP user ID
      await supabase
        .from('members')
        .update({ whop_user_id: whopUser.id })
        .eq('user_id', user.id);

      await supabase
        .from('sequences')
        .update({ whop_user_id: whopUser.id })
        .eq('user_id', user.id);

      console.log(`Migrated: ${user.email} -> ${whopUser.id}`);
    }
  }
}
```

**Phase 3: Cleanup (After verification)**
- Remove `user_id` column (or keep for backup)
- Update all queries to use `whop_user_id` only

### Environment Variables

```bash
# .env.production
# WHOP Configuration
WHOP_APP_ID=app_xxxxxxxxxxxxx
WHOP_API_KEY=whop_api_key_xxxxxxxx
WHOP_WEBHOOK_SECRET=whsec_xxxxxxxx
WHOP_PREMIUM_PLAN_ID=plan_xxxxxxxx
WHOP_PREMIUM_PRODUCT_ID=prod_xxxxxxxx

# Existing (unchanged)
RESEND_API_KEY=re_xxxxxxxx
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJxxx
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# Dev mode
VITE_WHOP_DEV_MODE=true
```

---

## Security Implementation

### Security Checklist

| Item | Status | Implementation |
|------|--------|----------------|
| HTTPS enforcement | Required | Enforced by WHOP |
| Webhook signature verification | Required | makeWebhookValidator |
| User token verification | Required | makeUserTokenVerifier |
| API key storage | Required | Environment variables only |
| CORS restrictions | Required | WHOP domains only |
| Input validation | Required | Express Validator |
| Rate limiting | Recommended | express-rate-limit |
| Audit logging | Recommended | Winston/Morgan |

### Webhook Security (Update: `server/index.js`)

```javascript
import rateLimit from 'express-rate-limit';

// Rate limiting for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/webhook', webhookLimiter);

// Webhook verification middleware
app.post('/api/webhook/whop', async (req, res) => {
  try {
    // Verify signature first
    const webhook = await verifyWhopWebhook(req);

    // Log webhook for audit
    console.log(`📝 Webhook: ${webhook.action}`, {
      timestamp: new Date().toISOString(),
      userId: webhook.data?.user_id,
      action: webhook.action,
    });

    // Process webhook
    await processWebhook(webhook);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Invalid webhook' });
  }
});
```

### Token Security (Frontend)

```javascript
// src/lib/token-storage.js

// Store token securely (not in localStorage - vulnerable to XSS)
const TOKEN_KEY = 'whop_auth_token';

export function setToken(token) {
  // Use HttpOnly cookie in production (set by backend)
  // For iframe, token is managed by WHOP SDK
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// In production, use HttpOnly cookies instead
// Backend sets: res.cookie('whop_token', token, { httpOnly: true, secure: true })
```

---

## Deployment Pipeline

### Build Process

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Starting deployment..."

# 1. Build frontend
echo "📦 Building frontend..."
npm run build

# 2. Verify build
echo "✅ Verifying build..."
if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist folder not found"
  exit 1
fi

# 3. Upload to hosting (Vercel, Netlify, or S3)
echo "☁️ Uploading to hosting..."
# Example: vercel --prod

# 4. Get source URL
SOURCE_URL="https://your-app.vercel.app"

# 5. Create app build via WHOP API
echo "📤 Creating WHOP app build..."
curl -X POST "https://api.whop.com/api/v1/app-builds" \
  -H "Authorization: Bearer $WHOP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "'$WHOP_APP_ID'",
    "source_url": "'$SOURCE_URL'",
    "version": "'$(git rev-parse --short HEAD)'",
    "chelog": "Deployment via CI/CD"
  }'

# 6. Promote to production (after testing)
echo "🔄 Promoting to production..."
# Wait for build verification...

echo "✅ Deployment complete!"
```

### WHOP Dashboard Configuration

1. **Create App in WHOP Dashboard**
   - Go to https://whop.com/dashboard/developers
   - Click "Create App"
   - Fill in details:
     - Name: EEC Onboarding App
     - Description: Automated onboarding sequence management
     - Base URL: https://your-app.vercel.app
     - App View Type: Dashboard (for merchant apps)

2. **Configure Webhooks**
   - Navigate to Webhooks tab
   - Add webhook URL: https://your-app.vercel.app/api/webhook/whop
   - Select events:
     - `membership.went_valid`
     - `membership.went_invalid`
     - `payment.succeeded`
     - `payment.failed`

3. **Create Products/Plans**
   - Create Premium product in WHOP dashboard
   - Note the product ID and plan ID
   - Add to environment variables

4. **Generate API Keys**
   - Go to API Keys section
   - Create new key with permissions:
     - `read_users`
     - `read_products`
     - `read_plans`
     - `read_memberships`
     - `write_webhooks`

### Deployment Checklist

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Build frontend | `npm run build` succeeds |
| 2 | Deploy to hosting | URL accessible |
| 3 | Test locally | Dev mode works |
| 4 | Create WHOP build | Build ID returned |
| 5 | Test in sandbox | App loads in test iframe |
| 6 | Promote to production | Build status: active |
| 7 | Configure webhooks | Test events received |
| 8 | Test payment flow | Checkout works |

---

## Testing & QA Checklist

### Pre-Deployment Testing

#### Unit Tests (Jest/Vitest)

```javascript
// tests/auth.test.js
describe('WHOP Auth', () => {
  test('verifies valid token', async () => {
    const user = await verifyUserToken(validToken);
    expect(user).toHaveProperty('id');
  });

  test('rejects invalid token', async () => {
    await expect(verifyUserToken(invalidToken)).rejects.toThrow();
  });
});

describe('API Endpoints', () => {
  test('GET /api/sequence returns 401 without token', async () => {
    const response = await request(app).get('/api/sequence');
    expect(response.status).toBe(401);
  });

  test('POST /api/deploy saves sequence', async () => {
    const response = await request(app)
      .post('/api/deploy')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ sequence: testSequence });
    expect(response.status).toBe(200);
  });
});
```

#### Integration Tests

```javascript
// tests/integration/webhook.test.js
describe('Webhook Integration', () => {
  test('processes membership.created webhook', async () => {
    const webhookPayload = {
      action: 'membership.went_valid',
      data: {
        user_id: 'user_123',
        plan_id: 'plan_premium',
        started_at: new Date().toISOString(),
      },
    };

    // Sign webhook
    const signedPayload = signWebhook(webhookPayload, webhookSecret);

    const response = await request(app)
      .post('/api/webhook/whop')
      .set('x-whop-signature', signedPayload)
      .send(webhookPayload);

    expect(response.status).toBe(200);

    // Verify member was created
    const member = await supabase
      .from('members')
      .select('*')
      .eq('whop_user_id', 'user_123')
      .single();

    expect(member).not.toBeNull();
  });
});
```

### Manual Testing Checklist

#### Authentication
- [ ] App loads in WHOP iframe
- [ ] User data displays correctly
- [ ] Token refresh works
- [ ] Invalid token shows error
- [ ] Dev mode fallback works

#### Core Features
- [ ] Dashboard loads with metrics
- [ ] Sequence editor opens
- [ ] Can save sequence changes
- [ ] Member queue shows members
- [ ] Theme preferences save

#### Webhooks
- [ ] Membership created webhook fires
- [ ] Refund webhook records event
- [ ] Email queue processes
- [ ] Metrics update correctly

#### Payment (if enabled)
- [ ] Payment button visible
- [ ] Checkout modal opens
- [ ] Purchase completes
- [ ] Premium features unlock
- [ ] Refund revokes access

#### Edge Cases
- [ ] Network error handling
- [ ] Token expiration handling
- [ ] Multiple browser tabs
- [ ] Rapid page navigation
- [ ] Large data sets

### Performance Testing

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial load | < 3s | Lighthouse |
| API response | < 500ms | Network tab |
| Frame rate | 60fps | DevTools |
| Bundle size | < 500KB | Build output |

---

## Implementation Phases

### Phase 1: Foundation (Days 1-3)

**Objectives:**
- Set up development environment
- Install WHOP SDK
- Create authentication infrastructure

**Tasks:**

| Task | Description | File |
|------|-------------|------|
| 1.1 | Install dependencies | `package.json` |
| 1.2 | Create WHOP SDK config | `server/lib/whop-sdk.js` |
| 1.3 | Create auth context | `src/lib/whop-auth.jsx` |
| 1.4 | Create token verification | `server/middleware/auth.js` |
| 1.5 | Update CORS config | `server/index.js` |
| 1.6 | Create dev proxy config | `vite.config.js` |

**Deliverables:**
- [ ] `server/lib/whop-sdk.js` - Initialized WHOP SDK
- [ ] `src/lib/whop-auth.jsx` - Auth context provider
- [ ] `src/hooks/useWhopSdk.js` - Custom SDK hook
- [ ] Updated `server/index.js` with new auth

**Acceptance Criteria:**
- [ ] App loads in local dev mode
- [ ] WHOP SDK initializes without errors
- [ ] Token verification works

### Phase 2: Backend Migration (Days 4-6)

**Objectives:**
- Update all API endpoints for WHOP auth
- Add webhook verification
- Create payment endpoints

**Tasks:**

| Task | Description | File |
|------|-------------|------|
| 2.1 | Update sequence endpoints | `server/routes/sequence.js` |
| 2.2 | Update member endpoints | `server/routes/members.js` |
| 2.3 | Update metrics endpoints | `server/routes/metrics.js` |
| 2.4 | Add webhook verification | `server/lib/webhook-validator.js` |
| 2.5 | Create purchase endpoints | `server/routes/purchase.js` |
| 2.6 | Add premium access check | `server/lib/premium-access.js` |

**Deliverables:**
- [ ] All API endpoints use WHOP auth
- [ ] Webhooks verified with signatures
- [ ] Premium access endpoints working

**Acceptance Criteria:**
- [ ] All API endpoints return 401 without valid token
- [ ] Webhook verification passes for signed requests
- [ ] Premium check returns correct status

### Phase 3: Frontend Migration (Days 7-10)

**Objectives:**
- Replace Supabase auth with WHOP auth
- Update all views to use new auth
- Add payment UI components

**Tasks:**

| Task | Description | File |
|------|-------------|------|
| 3.1 | Update App.jsx | `src/App.jsx` |
| 3.2 | Update Auth component | `src/Auth.jsx` |
| 3.3 | Create PaymentButton | `src/components/PaymentButton.jsx` |
| 3.4 | Update Dashboard | `src/components/Dashboard.jsx` |
| 3.5 | Update SequenceEditor | `src/components/SequenceEditor.jsx` |
| 3.6 | Update MemberQueue | `src/components/MemberQueue.jsx` |

**Deliverables:**
- [ ] Updated main app with WHOP auth
- [ ] Payment button component
- [ ] All views functional with new auth

**Acceptance Criteria:**
- [ ] User data displays correctly
- [ ] Premium button shows for non-premium users
- [ ] All views load without errors

### Phase 4: Payment Integration (Days 11-13)

**Objectives:**
- Implement premium purchase flow
- Add access control to premium features
- Test payment flow

**Tasks:**

| Task | Description | File |
|------|-------------|------|
| 4.1 | Configure product/plan | `.env` |
| 4.2 | Implement purchase button | `src/components/PaymentButton.jsx` |
| 4.3 | Add webhook handlers | `server/index.js` |
| 4.4 | Create access control | `server/middleware/premium.js` |
| 4.5 | Add upgrade UI | `src/views/PremiumUpgrade.jsx` |

**Deliverables:**
- [ ] Working payment flow
- [ ] Premium feature access control
- [ ] Upgrade UI

**Acceptance Criteria:**
- [ ] Payment modal opens correctly
- [ ] Purchase completes successfully
- [ ] Premium features unlock after purchase

### Phase 5: Database Migration (Days 14-15)

**Objectives:**
- Add WHOP user ID columns
- Create migration scripts
- Verify data integrity

**Tasks:**

| Task | Description | File |
|------|-------------|------|
| 5.1 | Create migration SQL | `migrations/migration_whop_users.sql` |
| 5.2 | Create sync script | `scripts/sync-users.js` |
| 5.3 | Update data access layer | `server/lib/data-access.js` |
| 5.4 | Test data queries | `tests/db.test.js` |

**Deliverables:**
- [ ] Migration script executed
- [ ] User data synced
- [ ] All queries working

**Acceptance Criteria:**
- [ ] Existing users can still access data
- [ ] New users created with WHOP IDs
- [ ] Queries return correct data

### Phase 6: Deployment (Days 16-18)

**Objectives:**
- Deploy to production hosting
- Create WHOP app build
- Configure webhooks
- Test in WHOP environment

**Tasks:**

| Task | Description |
|------|-------------|
| 6.1 | Deploy to Vercel/Netlify |
| 6.2 | Create WHOP app in dashboard |
| 6.3 | Upload first build |
| 6.4 | Configure webhooks |
| 6.5 | Test in sandbox |
| 6.6 | Promote to production |

**Deliverables:**
- [ ] App deployed and accessible
- [ ] WHOP app configured
- [ ] Webhooks configured and working

**Acceptance Criteria:**
- [ ] App loads in WHOP iframe
- [ ] Webhooks receive events
- [ ] Payment flow works

### Phase 7: QA & Launch (Days 19-21)

**Objectives:**
- Comprehensive testing
- Bug fixes
- Launch preparation

**Tasks:**

| Task | Description |
|------|-------------|
| 7.1 | Run full test suite |
| 7.2 | Fix all critical bugs |
| 7.3 | Performance optimization |
| 7.4 | Security audit |
| 7.5 | Documentation |
| 7.6 | Launch |

**Deliverables:**
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Launch ready

---

## Risk Mitigation

### Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WHOP API changes | Low | High | Use versioned APIs, monitor docs |
| Token refresh issues | Medium | High | Implement refresh handler |
| Data migration failure | Medium | High | Backup before migration, rollback plan |
| Payment flow broken | Medium | High | Test thoroughly, use sandbox |
| Performance degradation | Low | Medium | Monitor metrics, optimize bundle |
| Security breach | Low | Critical | Audit code, use verified webhooks |

### Contingency Plans

| Scenario | Trigger | Action |
|----------|---------|--------|
| WHOP API down | 5xx errors > 10% | Show error, retry with backoff |
| Token expired | 401 errors | Refresh token, retry request |
| Webhook fails | 3 consecutive failures | Alert, manual review |
| Payment stuck | No confirmation after 5min | Check webhook, manual refund if needed |
| Database issue | Query errors > 5% | Fallback to cache, alert |

---

## Rollback Procedures

### Quick Rollback Steps

**1. Revert WHOP App Build**
```bash
# In WHOP Dashboard
1. Go to Builds tab
2. Select previous build
3. Click "Promote to Production"
```

**2. Revert Backend**
```bash
# Deploy previous version
git checkout previous-commit
npm run build
vercel --prod
```

**3. Database Rollback**
```sql
-- If schema changed
ALTER TABLE members DROP COLUMN whop_user_id;
-- Restore from backup if needed
```

**4. Rollback to Standalone**
If WHOP integration fails completely:
1. Keep Supabase auth as fallback
2. Point app to standalone URL
3. Notify users of temporary issue

### Emergency Contacts

| Issue | Contact |
|-------|---------|
| WHOP API outage | https://status.whop.com |
| Payment issues | WHOP Support |
| Critical bugs | Dev team |

---

## Success Metrics

### KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| App load time | < 3s | Lighthouse |
| API response time | < 500ms | Network tab |
| Error rate | < 1% | Server logs |
| Payment success rate | > 95% | Payment webhooks |
| User satisfaction | > 4.5/5 | Feedback |

### Launch Checklist

- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Runbook created
- [ ] Team trained

---

## Appendix

### File Reference

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main application component |
| `src/lib/whop-auth.jsx` | WHOP authentication context |
| `src/lib/whop-sdk.js` | WHOP SDK configuration |
| `src/components/PaymentButton.jsx` | Premium purchase button |
| `server/index.js` | Express server with routes |
| `server/lib/whop-sdk.js` | Backend WHOP SDK |
| `server/lib/webhook-validator.js` | Webhook signature verification |
| `server/routes/purchase.js` | Payment endpoints |
| `migrations/migration_whop_users.sql` | Database migration |

### Environment Variables

```bash
# Required
WHOP_APP_ID=app_xxxxxxxx
WHOP_API_KEY=whop_xxxxxxxx
WHOP_WEBHOOK_SECRET=whsec_xxxxxxxx
WHOP_PREMIUM_PLAN_ID=plan_xxxxxxxx
WHOP_PREMIUM_PRODUCT_ID=prod_xxxxxxxx

# Optional (for dev)
VITE_WHOP_DEV_MODE=true
```

### Useful Links

| Resource | URL |
|----------|-----|
| WHOP Developer Docs | https://docs.whop.com |
| WHOP Dashboard | https://whop.com/dashboard/developers |
| API Reference | https://docs.whop.com/api-reference |
| Status Page | https://status.whop.com |
| Support | support@whop.com |

---

**Plan Prepared:** January 11, 2026
**Plan Owner:** Development Team
**Review Date:** Before Phase 1 implementation

---

*This plan is designed to be followed sequentially. Each phase builds on the previous, and all acceptance criteria must be met before proceeding to the next phase.*
