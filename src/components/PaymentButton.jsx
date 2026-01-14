import { useState } from 'react';
import { useWhopAuth } from '../lib/whop-sdk';
import { ShoppingCartIcon, CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function PaymentButton({ planId, price, features, className }) {
  const { isDevMode, refreshUser, purchase } = useWhopAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    setError(null);

    try {
      const result = await purchase({ planId });

      if (result.status === 'ok') {
        setSuccess(true);
        // Refresh user data to get updated membership
        await refreshUser();
      } else {
        setError(result.error || 'Purchase failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={`bg-success/10 border border-xl p-6 ${className}`}>
        <div className="flex items-center gap--success/20 rounded3 mb-4">
          <CheckCircleIcon className="h-8 w-8 text-success" />
          <div>
            <h3 className="text-lg font-semibold text-success">Upgrade Complete!</h3>
            <p className="text-success/70 text-sm">You now have premium access</p>
          </div>
        </div>
        <button
          onClick={() => setSuccess(false)}
          className="w-full py-2 px-4 bg-success/20 hover:bg-success/30 text-success rounded-lg transition-colors"
        >
          Refresh to See New Features
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-accent to-accent-secondary p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <LockClosedIcon className="h-5 w-5" />
          <span className="text-sm font-medium opacity-90">Premium Access</span>
        </div>
        <div className="text-4xl font-bold">{price}</div>
        <div className="text-sm opacity-80 mt-1">One-time payment, lifetime access</div>
      </div>

      {/* Features */}
      <div className="p-6">
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <span className="text-text-secondary text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full py-3 px-4 bg-accent hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
        >
          {loading ? (
            <>
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              Processing...
            </>
          ) : (
            <>
              <ShoppingCartIcon className="h-5 w-5" />
              Upgrade Now
            </>
          )}
        </button>

        <p className="text-center text-text-tertiary text-xs mt-4">
          Secure payment powered by WHOP
        </p>
      </div>
    </div>
  );
}
