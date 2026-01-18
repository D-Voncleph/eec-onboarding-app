import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Default 5-day onboarding sequence
const defaultSequence = {
  id: 'default',
  name: '5-Day Onboarding',
  days: [
    {
      day: 1,
      subject: 'Welcome to the Community!',
      content: 'Welcome aboard! We are excited to have you join our community. Here is everything you need to get started...',
    },
    {
      day: 2,
      subject: 'Getting Started Guide',
      content: 'Day 2 is all about setting you up for success. Check out our getting started guide...',
    },
    {
      day: 3,
      subject: 'Pro Tips & Tricks',
      content: 'Ready to level up? Here are some pro tips to help you get the most out of your membership...',
    },
    {
      day: 4,
      subject: 'Community Resources',
      content: 'Did you know about all the resources available to you? Let us show you around...',
    },
    {
      day: 5,
      subject: 'Your First Week Complete!',
      content: 'Congratulations on completing your first week! Here is what is next on your journey...',
    },
  ],
};

export async function GET() {
  try {
    // Try to get custom sequence from database
    const { data: customSequence, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error || !customSequence) {
      // Return default sequence if none found
      return NextResponse.json({ sequence: defaultSequence });
    }

    // Parse the days JSON if stored as string
    const days = typeof customSequence.days === 'string'
      ? JSON.parse(customSequence.days)
      : customSequence.days;

    return NextResponse.json({
      sequence: {
        id: customSequence.id,
        name: customSequence.name,
        days,
      },
    });
  } catch (error) {
    console.error('Sequence error:', error);
    return NextResponse.json({ sequence: defaultSequence });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { error } = await supabase
      .from('sequences')
      .upsert({
        id: 'default',
        name: body.name || '5-Day Onboarding',
        days: JSON.stringify(body.days || defaultSequence.days),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sequence save error:', error);
    return NextResponse.json({ error: 'Failed to save sequence' }, { status: 500 });
  }
}
