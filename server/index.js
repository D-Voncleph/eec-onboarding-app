import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { onboardingFlow } from "./inngest/functions.js";
import { getWhopUser, checkPremiumAccess, verifyWebhookSignature, createWebhookValidator } from "./lib/whop-sdk.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Initialize Clients ---
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- Middleware ---

// CORS configuration for WHOP iframe
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://whop.com',
      'https://www.whop.com',
      'https://dashboard.whop.com',
      'http://localhost:5173',
      'http://localhost:3000',
      undefined // Allow requests with no origin
    ];
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
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests' }
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Too many webhook requests' }
});

// --- Authentication Middleware ---
const requireWhopAuth = async (req, res, next) => {
  const whopUser = await getWhopUser(req);

  if (!whopUser) {
    return res.status(401).json({ error: 'Unauthorized - Invalid or missing token' });
  }

  req.whopUser = whopUser;
  next();
};

// --- API Routes (Protected) ---

// 1. GET Current Sequence
app.get('/api/sequence', apiLimiter, requireWhopAuth, async (req, res) => {
  try {
    const userId = req.whopUser.id;

    // Try whop_user_id first, fallback to user_id
    let { data, error } = await supabase
      .from('sequences')
      .select('content')
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching sequence:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ sequence: data?.content || [] });
  } catch (error) {
    console.error('Error in /api/sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Deploy Sequence
app.post('/api/deploy', apiLimiter, requireWhopAuth, async (req, res) => {
  try {
    const userId = req.whopUser.id;
    const { sequence } = req.body;

    console.log(`💾 Deploying sequence for user: ${userId}`);

    // Check if sequence exists for this user
    let { data: existing } = await supabase
      .from('sequences')
      .select('id')
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('sequences')
        .update({
          content: sequence,
          whop_user_id: userId,
          updated_at: new Date()
        })
        .eq('id', existing.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('sequences')
        .insert({
          content: sequence,
          whop_user_id: userId,
          active: true
        });
      error = result.error;
    }

    if (error) {
      console.error('❌ Database Save Failed:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log('✅ Sequence deployed successfully');
    res.json({ success: true, message: 'Sequence saved.' });
  } catch (error) {
    console.error('Error in /api/deploy:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. GET Members
app.get('/api/members', apiLimiter, requireWhopAuth, async (req, res) => {
  try {
    const userId = req.whopUser.id;

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .order('joined_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching members:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ members: data });
  } catch (error) {
    console.error('Error in /api/members:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET Dashboard Metrics
app.get('/api/metrics/dashboard', apiLimiter, requireWhopAuth, async (req, res) => {
  try {
    const userId = req.whopUser.id;

    // Check premium access
    const premium = await checkPremiumAccess(userId);

    if (!premium.hasAccess) {
      return res.json({
        limited: true,
        upgradeRequired: true,
        message: 'Upgrade to Premium for full analytics',
        features: ['Basic metrics', 'Limited to 10 members'],
      });
    }

    // Get total members count
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`);

    // Get refund count
    const { count: refundCount } = await supabase
      .from('member_events')
      .select('*', { count: 'exact', head: true })
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .eq('event_type', 'refund');

    // Get completion count
    const { count: completionCount } = await supabase
      .from('member_events')
      .select('*', { count: 'exact', head: true })
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .eq('event_type', 'sequence_completed');

    // Get average delivery latency
    const { data: latencyData } = await supabase
      .from('member_events')
      .select('event_data, created_at')
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .eq('event_type', 'email_sent')
      .order('created_at', { ascending: false })
      .limit(100);

    let avgLatency = 0;
    if (latencyData && latencyData.length > 0) {
      const latencies = latencyData
        .filter(e => e.event_data?.latency_ms)
        .map(e => e.event_data.latency_ms);
      if (latencies.length > 0) {
        avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
      }
    }

    // Calculate trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { count: recentRefunds } = await supabase
      .from('member_events')
      .select('*', { count: 'exact', head: true })
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .eq('event_type', 'refund')
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: previousRefunds } = await supabase
      .from('member_events')
      .select('*', { count: 'exact', head: true })
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .eq('event_type', 'refund')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString());

    const refundChange = previousRefunds > 0
      ? (((recentRefunds - previousRefunds) / previousRefunds) * 100).toFixed(1)
      : '0.0';

    res.json({
      refundRate: parseFloat((totalMembers > 0 ? ((refundCount / totalMembers) * 100) : 0).toFixed(1)),
      refundChange: parseFloat(refundChange),
      completionRate: totalMembers > 0 ? Math.round((completionCount / totalMembers) * 100) : 0,
      completionChange: 0,
      avgLatency: avgLatency || 42,
      totalMembers: totalMembers || 0,
      limited: false,
      upgradeRequired: false,
    });

  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET User Preferences
app.get('/api/preferences', apiLimiter, requireWhopAuth, async (req, res) => {
  try {
    const userId = req.whopUser.id;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .or(`whop_user_id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json(data || { theme: 'light', email_notifications: true });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. PUT User Preferences
app.put('/api/preferences', apiLimiter, requireWhopAuth, async (req, res) => {
  try {
    const userId = req.whopUser.id;
    const { theme, email_notifications } = req.body;

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        whop_user_id: userId,
        theme: theme || 'light',
        email_notifications: email_notifications !== undefined ? email_notifications : true,
        updated_at: new Date()
      }, { onConflict: 'whop_user_id' })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Preferences updated for user ${userId}`);
    res.json({ success: true, preferences: data });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. GET Premium Status
app.get('/api/premium/status', apiLimiter, requireWhopAuth, async (req, res) => {
  try {
    const userId = req.whopUser.id;
    const premium = await checkPremiumAccess(userId);
    res.json(premium);
  } catch (error) {
    console.error('Error checking premium status:', error);
    res.status(500).json({ hasAccess: false, accessLevel: 'no_access' });
  }
});

// --- Webhook Endpoints (Verified) ---

// Main WHOP Webhook Handler
app.post('/api/webhook/whop', webhookLimiter, async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-whop-signature'];
    const isValid = verifyWebhookSignature(req.body, signature, process.env.WHOP_WEBHOOK_SECRET);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const { action, data } = req.body;

    console.log(`⚡ Webhook received: ${action}`);

    // Handle different webhook events
    switch (action) {
      case 'membership.went_valid':
        await handleNewMembership(data);
        break;
      case 'membership.went_invalid':
        await handleMembershipEnded(data);
        break;
      case 'payment.succeeded':
        await handlePaymentSuccess(data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(data);
        break;
      default:
        console.log(`Unhandled webhook action: ${action}`);
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Invalid webhook' });
  }
});

// --- Webhook Event Handlers ---

async function handleNewMembership(data) {
  const { user_id, plan_id, started_at } = data;

  console.log(`🎉 New membership: ${user_id}`);

  // Save member to database
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

async function handleMembershipEnded(data) {
  const { user_id } = data;

  console.log(`👋 Membership ended: ${user_id}`);

  await supabase
    .from('members')
    .update({ status: 'Inactive' })
    .eq('whop_user_id', user_id);
}

async function handlePaymentSuccess(data) {
  const { user_id, amount, plan_id } = data;

  console.log(`💰 Payment succeeded: ${user_id} - $${amount / 100}`);

  // Record payment event
  await supabase
    .from('member_events')
    .insert({
      whop_user_id: user_id,
      event_type: 'payment_succeeded',
      event_data: { amount, plan_id }
    });
}

async function handlePaymentFailed(data) {
  const { user_id, amount, reason } = data;

  console.log(`❌ Payment failed: ${user_id} - ${reason}`);

  await supabase
    .from('member_events')
    .insert({
      whop_user_id: user_id,
      event_type: 'payment_failed',
      event_data: { amount, reason }
    });
}

// --- Inngest Endpoint ---
app.use(
  '/api/inngest',
  serve({ client: inngest, functions: [onboardingFlow] })
);

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`>> EEC ONBOARDING APP ONLINE ON PORT ${PORT}`);
  console.log(`>> WHOP SDK: ${process.env.WHOP_APP_ID ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`>> Mode: ${process.env.VITE_WHOP_DEV_MODE === 'true' ? 'Development' : 'Production'}`);
});
