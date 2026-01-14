import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';

// WHOP configuration
const WHOP_CONFIG = {
  appId: import.meta.env.VITE_WHOP_APP_ID,
  isDevMode: import.meta.env.VITE_WHOP_DEV_MODE === 'true',
};

// Auth context
const WhopAuthContext = createContext(null);

// Message types for WHOP iframe communication
const MESSAGE_TYPES = {
  GET_USER: 'whop-sdk:get-user',
  USER_RESPONSE: 'whop-sdk:user-response',
  PURCHASE: 'whop-sdk:purchase',
  PURCHASE_RESPONSE: 'whop-sdk:purchase-response',
  RESIZE: 'whop-sdk:resize',
};

// Mock user for development
const createDevUser = () => ({
  id: 'dev_user_' + Date.now(),
  email: 'dev@example.com',
  username: 'developer',
  membership: { isValid: true, planId: 'plan_premium' },
});

export function WhopAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeSdkRef = useRef(null);

  // Create iframe SDK interface
  const createIframeSdk = useCallback(() => {
    return {
      getUser: async () => {
        return new Promise((resolve, reject) => {
          // Check if we're in a WHOP iframe
          if (window.parent === window) {
            // Not in iframe, use dev mode
            resolve(createDevUser());
            return;
          }

          // Send message to parent window
          window.parent.postMessage(
            { type: MESSAGE_TYPES.GET_USER, payload: {} },
            '*'
          );

          // Set up one-time listener for response
          const handleMessage = (event) => {
            if (event.data?.type === MESSAGE_TYPES.USER_RESPONSE) {
              window.removeEventListener('message', handleMessage);
              if (event.data.payload?.user) {
                resolve(event.data.payload.user);
              } else {
                reject(new Error('No user data received'));
              }
            }
          };

          window.addEventListener('message', handleMessage);

          // Timeout after 5 seconds
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            reject(new Error('User request timed out'));
          }, 5000);
        });
      },

      inAppPurchase: async ({ planId }) => {
        return new Promise((resolve, reject) => {
          // Check if we're in a WHOP iframe
          if (window.parent === window) {
            // Not in iframe, simulate purchase
            alert('Dev Mode: Simulating purchase...\n\nPremium features would be enabled now.');
            resolve({ status: 'ok' });
            return;
          }

          // Send message to parent window
          window.parent.postMessage(
            { type: MESSAGE_TYPES.PURCHASE, payload: { planId } },
            '*'
          );

          // Set up one-time listener for response
          const handleMessage = (event) => {
            if (event.data?.type === MESSAGE_TYPES.PURCHASE_RESPONSE) {
              window.removeEventListener('message', handleMessage);
              resolve(event.data.payload);
            }
          };

          window.addEventListener('message', handleMessage);

          // Timeout after 30 seconds
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            reject(new Error('Purchase request timed out'));
          }, 30000);
        });
      },

      resize: ({ width, height }) => {
        if (window.parent === window) return;
        window.parent.postMessage(
          { type: MESSAGE_TYPES.RESIZE, payload: { width, height } },
          '*'
        );
      },
    };
  }, []);

  // Fetch user from WHOP iframe SDK
  const fetchUser = useCallback(async () => {
    try {
      if (WHOP_CONFIG.isDevMode) {
        // Dev mode - use mock user for development
        setUser(createDevUser());
        setLoading(false);
        return;
      }

      const sdk = createIframeSdk();
      iframeSdkRef.current = sdk;

      const userData = await sdk.getUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch WHOP user:', err);
      if (WHOP_CONFIG.isDevMode) {
        setUser(createDevUser());
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [createIframeSdk]);

  // Handle incoming messages from parent window
  useEffect(() => {
    const handleMessage = (event) => {
      // Handle any messages from WHOP parent window
      if (event.data?.type?.startsWith('whop-sdk:')) {
        console.log('Received WHOP SDK message:', event.data.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  // Create purchase function that mirrors iframeSdk interface
  const purchase = useCallback(async ({ planId }) => {
    if (!iframeSdkRef.current) {
      iframeSdkRef.current = createIframeSdk();
    }
    return iframeSdkRef.current.inAppPurchase({ planId });
  }, [createIframeSdk]);

  const value = {
    user,
    token: user?.id || 'dev_token',
    loading,
    error,
    refreshUser,
    isDevMode: WHOP_CONFIG.isDevMode,
    isPremium: user?.membership?.isValid || WHOP_CONFIG.isDevMode,
    purchase,
  };

  return (
    <WhopAuthContext.Provider value={value}>
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

export default WhopAuthContext;
