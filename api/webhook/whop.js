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

    const { action, data } = req.body;

    console.log(`⚡ Webhook received: ${action}`);

    // Handle different webhook events
    switch (action) {
      case 'membership.went_valid':
        // New premium member
        await handleNewMembership(data, res);
        break;

      case 'membership.went_invalid':
        // Membership ended
        await handleMembershipEnded(data, res);
        break;

      case 'payment.succeeded':
        // Payment completed
        await handlePaymentSuccess(data, res);
        break;

      case 'membership.created':
        // New member
        await handleMembershipCreated(data, res);
        break;

      default:
        console.log(`Unhandled webhook event: ${action}`);
        res.status(200).json({ status: 'received', action });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }

  // Don't wait for DB operations
  res.status(200).json({ status: 'processed' });
}

async function handleNewMembership(data, res) {
  console.log('New premium membership:', data);
  // Member upgraded to premium - grant access
}

async function handleMembershipEnded(data, res) {
  console.log('Membership ended:', data);
  // Remove premium access
}

async function handlePaymentSuccess(data, res) {
  console.log('Payment succeeded:', data);
  // Record payment
}

async function handleMembershipCreated(data, res) {
  console.log('New membership:', data);
  const { user, email } = data || {};

  if (user?.id && email) {
    try {
      // Add member to database
      await supabase.from('members').upsert({
        whop_user_id: user.id,
        email: email,
        status: 'pending',
        current_day: 1,
        joined_at: new Date().toISOString()
      }, { onConflict: 'whop_user_id' });
    } catch (e) {
      console.log('Member insert error:', e.message);
    }
  }
}
