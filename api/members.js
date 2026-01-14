// Members API - Get active members
import { supabase } from './lib/supabase.js';

export default async function handler(req, res) {
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
    const userId = req.headers['x-user-id'] || 'dev_user';

    // Try to get active members
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('whop_user_id', userId)
      .in('status', ['pending', 'active'])
      .order('joined_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log('Members fetch error:', error.message);
      // Return empty list if table doesn't exist
      return res.status(200).json({
        members: [],
        message: 'No active members (database not configured)'
      });
    }

    if (!members || members.length === 0) {
      return res.status(200).json({
        members: [],
        message: 'No active members found'
      });
    }

    return res.status(200).json({
      members: members.map(m => ({
        id: m.id,
        email: m.email,
        status: m.status,
        current_day: m.current_day,
        joined_at: m.joined_at
      }))
    });
  } catch (error) {
    console.error('Members error:', error);
    return res.status(500).json({ error: error.message });
  }
}
