# Whop Webhook Configuration Guide

This guide explains how to configure Whop webhooks to send refund events to your EEC Onboarding App.

## Step 1: Access Whop Developer Dashboard

1. Go to [Whop Developer Portal](https://whop.com/dashboard/developers)
2. Sign in with your Whop account
3. Navigate to your app or create a new one

## Step 2: Configure Webhook Endpoints

You'll need to set up TWO webhook endpoints:

### Primary Webhook (Member Creation)
**Endpoint URL**: `https://your-backend-domain.com/api/webhook/whop/{YOUR_USER_ID}`

**Events to subscribe to**:
- `membership.created` - When a new member joins
- `membership.went_valid` - When membership becomes active

### Refund Webhook (NEW)
**Endpoint URL**: `https://your-backend-domain.com/api/webhook/whop/{YOUR_USER_ID}/refund`

**Events to subscribe to**:
- `payment.refunded` - When a payment is refunded
- `membership.cancelled` - When membership is cancelled

## Step 3: Get Your User ID

Your User ID can be found in the Config panel of the EEC app:
1. Log into your EEC Onboarding App
2. Go to **Config** section
3. Copy the User ID from the webhook URL shown

## Step 4: Test Webhooks

After configuring, you can test webhooks:

1. In Whop Developer Portal, use the "Send Test Webhook" feature
2. Check your EEC app's "Execution Queue" to see if events are received
3. Check the "System Overview" dashboard to see metrics update

## Webhook Payload Examples

### Member Created Event
```json
{
  "event": "membership.created",
  "data": {
    "email": "customer@example.com",
    "membership_id": "mem_123",
    "plan_id": "plan_456"
  }
}
```

### Refund Event
```json
{
  "event": "payment.refunded",
  "data": {
    "email": "customer@example.com",
    "amount": 9900,
    "reason": "customer_request"
  }
}
```

## Troubleshooting

- **Webhooks not received?** Check that your backend is publicly accessible and HTTPS is enabled
- **401 Errors?** Verify the User ID in the URL matches your account
- **Events tracked incorrectly?** Check the browser console and server logs for errors

## Security Notes

- Webhooks should validate the Whop signature (implement in production)
- User ID in URL should be treated as sensitive information
- Consider rate limiting webhook endpoints to prevent abuse
