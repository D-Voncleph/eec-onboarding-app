import { inngest } from "./client.js";
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export const onboardingFlow = inngest.createFunction(
    { id: "onboarding-flow" },
    { event: "app/webhook.received" },
    async ({ event, step }) => {
        const userEmail = event.data.email;
        const userId = event.data.userId;
        const flowStartTime = Date.now();

        // 1. Fetch the Active Sequence for THIS User
        const sequence = await step.run("fetch-sequence", async () => {
            const { data: sequenceData, error } = await supabase
                .from('sequences')
                .select('content')
                .eq('user_id', userId)
                .eq('active', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error || !sequenceData) {
                console.log(`⚠️ No active sequence found for User ${userId}. Aborting.`);
                return null;
            }

            return sequenceData.content.sort((a, b) => a.day - b.day);
        });

        if (!sequence) {
            return { success: false, message: `No active sequence found for User ${userId}.` };
        }

        // 2. Record sequence start event
        await step.run("record-sequence-start", async () => {
            await supabase
                .from('member_events')
                .insert({
                    user_id: userId,
                    member_email: userEmail,
                    event_type: 'sequence_started',
                    event_data: { sequence_length: sequence.length }
                });
        });

        let currentDayTracker = 1;

        // 3. Iterate and Send
        for (const dayContent of sequence) {
            const { day, subject, body } = dayContent;

            // Calculate if we need to wait
            if (day > currentDayTracker) {
                const daysToWait = day - currentDayTracker;
                await step.sleep(`wait-for-day-${day}`, `${daysToWait}d`);
                currentDayTracker = day;
            }

            // Send Email and track latency
            await step.run(`send-email-day-${day}`, async () => {
                const emailStartTime = Date.now();
                const { id } = await resend.emails.send({
                    from: 'Onboarding <onboarding@resend.dev>',
                    to: [userEmail],
                    subject: subject,
                    html: body.replace(/\n/g, '<br>'),
                });

                // Record email sent event with latency
                const latency = Date.now() - flowStartTime;
                await supabase
                    .from('member_events')
                    .insert({
                        user_id: userId,
                        member_email: userEmail,
                        event_type: 'email_sent',
                        event_data: {
                            email_id: id,
                            day: day,
                            latency_ms: latency,
                            subject: subject
                        }
                    });

                return { id };
            });

            // Update Status in DB
            await step.run(`update-status-day-${day}`, async () => {
                await supabase
                    .from('members')
                    .update({ status: `Day ${day}: Sent` })
                    .eq('email', userEmail);
            });
        }

        // 4. Record sequence completion
        await step.run("record-sequence-completion", async () => {
            await supabase
                .from('member_events')
                .insert({
                    user_id: userId,
                    member_email: userEmail,
                    event_type: 'sequence_completed',
                    event_data: { total_days: sequence.length }
                });
        });

        return { success: true, completedDays: sequence.length };
    }
);
