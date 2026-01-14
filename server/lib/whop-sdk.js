/**
 * Server-side WHOP SDK wrapper
 *
 * Handles:
 * - User token verification
 * - Webhook signature verification
 * - Premium access checking
 *
 * Uses @whop-sdk/core when available, with fallbacks for development.
 */

import { WhopSDK } from "@whop-sdk/core";
import crypto from 'crypto';

// Initialize server-side WHOP SDK
let whopSdk = null;

try {
  if (process.env.WHOP_APP_ID && process.env.WHOP_API_KEY) {
    whopSdk = new WhopSDK({
      appId: process.env.WHOP_APP_ID,
      apiKey: process.env.WHOP_API_KEY,
    });
    console.log('WHOP SDK initialized');
  }
} catch (error) {
  console.warn('WHOP SDK initialization failed:', error.message);
}

// Development mode - use mock data
const isDevMode = process.env.VITE_WHOP_DEV_MODE === 'true' || !whopSdk;

// Simple JWT-like token verification (for dev mode)
function verifyDevToken(token) {
  // In dev mode, accept any non-empty token
  if (token && token.length > 0) {
    return {
      id: 'dev_user_' + Date.now(),
      email: 'dev@example.com',
      username: 'developer',
      membership: { isValid: true, planId: 'plan_premium' },
    };
  }
  return null;
}

// Verify webhook signature
export function verifyWebhookSignature(body, signature, secret) {
  if (isDevMode) {
    // In dev mode, accept any signature
    return true;
  }

  if (!signature || !secret) {
    return false;
  }

  // WHOP uses HMAC-SHA256 for webhook signatures
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// User token verifier for API authentication
export async function verifyUserToken(token) {
  if (isDevMode) {
    return verifyDevToken(token);
  }

  if (!whopSdk) {
    throw new Error('WHOP SDK not initialized');
  }

  try {
    // Call WHOP API to verify token
    const response = await whopSdk.memberships.validateToken({
      token,
    });
    return response.user;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    throw error;
  }
}

// Webhook signature validator helper
export function createWebhookValidator(secret, headerName = 'x-whop-signature') {
  return async (req) => {
    const signature = req.headers[headerName];
    const body = req.body;

    if (!verifyWebhookSignature(body, signature, secret)) {
      throw new Error('Invalid webhook signature');
    }

    return body;
  };
}

// Helper to get user from request
export async function getWhopUser(req) {
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
}

// Helper to check if user has premium access
export async function checkPremiumAccess(userId) {
  if (isDevMode) {
    // In dev mode, always return premium access
    return {
      hasAccess: true,
      accessLevel: 'premium',
      planId: 'plan_premium',
    };
  }

  if (!whopSdk) {
    return { hasAccess: false, accessLevel: 'no_access' };
  }

  try {
    const productId = process.env.WHOP_PREMIUM_PRODUCT_ID;
    if (!productId) {
      console.warn('WHOP_PREMIUM_PRODUCT_ID not set');
      return { hasAccess: false, accessLevel: 'no_access' };
    }

    const response = await whopSdk.memberships.checkAccess(productId, {
      userId,
    });

    return {
      hasAccess: response.has_access,
      accessLevel: response.access_level,
      planId: response.plan_id,
    };
  } catch (error) {
    console.error('Failed to check premium access:', error);
    return { hasAccess: false, accessLevel: 'no_access' };
  }
}

// Export SDK for direct API calls
export { whopSdk };

// Create verified webhook handler
export function createWebhookHandler(handler) {
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

  return async (req, res) => {
    try {
      // Verify signature if in production
      if (!isDevMode && webhookSecret) {
        const signature = req.headers['x-whop-signature'];
        const body = JSON.stringify(req.body);

        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(body)
          .digest('hex');

        if (signature !== expectedSignature) {
          console.error('Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      const result = await handler(req.body);
      res.json({ status: 'success', ...result });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(400).json({ error: error.message });
    }
  };
}
