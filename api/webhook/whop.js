// WHOP Webhook Handler
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-whop-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature in production
    const signature = req.headers['x-whop-signature'];
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const isDevMode = process.env.VITE_WHOP_DEV_MODE === 'true';
      if (!isDevMode) {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (signature !== expectedSignature) {
          console.error('Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }
    }

    const { event, data } = req.body;

    console.log(`⚡ Webhook received: ${event}`);

    // Handle different webhook events
    switch (event) {
      case 'membership_activated':
        // New membership activated - new member joined
        await handleMembershipActivated(data, res);
        break;

      case 'membership_deactivated':
        // Membership ended
        await handleMembershipDeactivated(data, res);
        break;

      case 'payment_succeeded':
        // Payment completed
        await handlePaymentSucceeded(data, res);
        break;

      case 'refund_created':
        // Refund processed
        await handleRefundCreated(data, res);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
        res.status(200).json({ status: 'received', event });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }

  // Don't wait for DB operations
  res.status(200).json({ status: 'processed' });
}

async function handleMembershipActivated(data) {
  console.log('Membership activated:', data);
  // New member joined - add to database
  // data typically contains: user_id, membership_id, plan_id, etc.
  const userId = data?.user_id || data?.membership?.user_id;
  const email = data?.email || data?.user?.email || data?.membership?.user?.email;

  if (userId && email) {
    try {
      await supabase.from('members').upsert({
        whop_user_id: userId,
        email: email,
        status: 'active',
        current_day: 1,
        joined_at: new Date().toISOString()
      }, { onConflict: 'whop_user_id' });
      console.log('Member added:', email);
    } catch (e) {
      console.log('Member insert error:', e.message);
    }
  }
}

async function handleMembershipDeactivated(data) {
  console.log('Membership deactivated:', data);
  // Membership ended - update status
  const userId = data?.user_id || data?.membership?.user_id;
  if (userId) {
    try {
      await supabase.from('members')
        .update({ status: 'cancelled' })
        .eq('whop_user_id', userId);
      console.log('Member deactivated:', userId);
    } catch (e) {
      console.log('Member update error:', e.message);
    }
  }
}

async function handlePaymentSucceeded(data) {
  console.log('Payment succeeded:', data);
  // Record payment - could log to email_logs table
}

async function handleRefundCreated(data) {
  console.log('Refund created:', data);
  // Handle refund - update member status
}
