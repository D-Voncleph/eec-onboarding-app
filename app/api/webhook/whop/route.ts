import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { event, data } = await request.json();

    console.log(`Webhook received: ${event}`);

    switch (event) {
      case 'membership_activated':
        await handleMembershipActivated(data);
        break;
      case 'membership_deactivated':
        await handleMembershipDeactivated(data);
        break;
      case 'payment_succeeded':
        await handlePaymentSucceeded(data);
        break;
      case 'refund_created':
        await handleRefundCreated(data);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleMembershipActivated(data: any) {
  const userId = data?.user_id || data?.membership?.user_id;
  const email = data?.email || data?.user?.email || data?.membership?.user?.email;

  if (userId && email) {
    await supabase.from('members').upsert({
      whop_user_id: userId,
      email: email,
      status: 'active',
      current_day: 1,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'whop_user_id' });

    console.log('Member added:', email);
  }
}

async function handleMembershipDeactivated(data: any) {
  const userId = data?.user_id || data?.membership?.user_id;

  if (userId) {
    await supabase.from('members')
      .update({ status: 'cancelled' })
      .eq('whop_user_id', userId);

    console.log('Member deactivated:', userId);
  }
}

async function handlePaymentSucceeded(data: any) {
  console.log('Payment succeeded:', data);
}

async function handleRefundCreated(data: any) {
  const userId = data?.user_id || data?.membership?.user_id;

  if (userId) {
    await supabase.from('member_events').insert({
      member_id: userId,
      event_type: 'refund',
      created_at: new Date().toISOString(),
    });

    await supabase.from('members')
      .update({ status: 'refunded' })
      .eq('whop_user_id', userId);
  }

  console.log('Refund created:', data);
}
