// WHOP Plan Configuration
// Get these from your WHOP Dashboard > Products > Plans

export const PLANS = {
  PREMIUM: {
    id: import.meta.env.VITE_WHOP_PREMIUM_PLAN_ID || 'plan_premium',
    name: 'EEC Premium',
    price: '$997',
    description: 'Full access to all premium features',
    features: [
      'Full Sequence Editor Access',
      'Unlimited Member Onboarding',
      'Advanced Analytics Dashboard',
      'Email Automation Integration',
      'Priority Support',
      'Custom Branding Options',
    ],
  },
  ENTERPRISE: {
    id: import.meta.env.VITE_WHOP_ENTERPRISE_PLAN_ID || 'plan_enterprise',
    name: 'EEC Enterprise',
    price: '$2,497',
    description: 'For agencies and teams',
    features: [
      'Everything in Premium',
      'White-Label Solution',
      'API Access',
      'Dedicated Account Manager',
      'Custom Integrations',
      'Team Collaboration Tools',
    ],
  },
};

export const PREMIUM_PRODUCT_ID = import.meta.env.VITE_WHOP_PREMIUM_PRODUCT_ID || 'prod_premium';

export default PLANS;
