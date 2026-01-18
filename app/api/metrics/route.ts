import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get total members count
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    // Get active members count
    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get refunds count (from member_events)
    const { count: refunds } = await supabase
      .from('member_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'refund');

    // Get completion rate (members who reached day 5)
    const { count: completed } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .gte('current_day', 5);

    const completionRate = totalMembers ? Math.round((completed! / totalMembers) * 100) : 0;

    return NextResponse.json({
      totalMembers: totalMembers || 0,
      activeMembers: activeMembers || 0,
      refunds: refunds || 0,
      completionRate,
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
