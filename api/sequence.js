// Sequence API - Get user's sequence
import { supabase } from './lib/supabase.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from header or query
    const userId = req.headers['x-user-id'] || req.query.userId || 'dev_user';

    // Try to get user's sequence
    const { data: sequence, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('whop_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Table might not exist or other error
      console.log('Sequence fetch error:', error.message);
      // Return default sequence
      return res.status(200).json({
        id: 'default',
        title: 'Quick Win',
        steps: [
          { day: 1, title: 'Welcome & Quick Win', subject: 'Welcome! Start Here' },
          { day: 2, title: 'The Quick Win', subject: 'Your Quick Win is Inside' },
          { day: 3, title: 'Community Path', subject: 'Join the Community' },
          { day: 4, title: 'Resources', subject: 'Your Resources Are Ready' },
          { day: 5, title: 'Bonus', subject: 'Your Bonus Awaits' }
        ],
        isDefault: true
      });
    }

    if (!sequence) {
      // Return default sequence
      return res.status(200).json({
        id: 'default',
        title: 'Quick Win',
        steps: [
          { day: 1, title: 'Welcome & Quick Win', subject: 'Welcome! Start Here' },
          { day: 2, title: 'The Quick Win', subject: 'Your Quick Win is Inside' },
          { day: 3, title: 'Community Path', subject: 'Join the Community' },
          { day: 4, title: 'Resources', subject: 'Your Resources Are Ready' },
          { day: 5, title: 'Bonus', subject: 'Your Bonus Awaits' }
        ],
        isDefault: true
      });
    }

    // Parse settings JSON if it's a string
    let steps = [];
    if (sequence.settings) {
      const settings = typeof sequence.settings === 'string'
        ? JSON.parse(sequence.settings)
        : sequence.settings;
      steps = settings.steps || [];
    }

    return res.status(200).json({
      id: sequence.id,
      title: sequence.title,
      status: sequence.status,
      steps,
      created_at: sequence.created_at
    });
  } catch (error) {
    console.error('Sequence error:', error);
    return res.status(500).json({ error: error.message });
  }
}
