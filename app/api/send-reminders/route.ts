import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resend } from '@/lib/resend'

export async function GET() {
  const supabase = createAdminClient()

  // 1. Find all reminders that are due to be sent
  const now = new Date().toISOString()
  const { data: dueReminders, error } = await supabase
    .from('reminders')
    .select(`
      id,
      client_id,
      interval_days,
      attempts,
      max_attempts,
      clients (
        name,
        email,
        waiting_for,
        amount,
        currency
      )
    `)
    .lte('next_send_at', now)
    .eq('active', true)
    .lt('attempts', 5) // Stop after 5 tries

  if (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!dueReminders || dueReminders.length === 0) {
    return NextResponse.json({ message: 'No reminders due right now' })
  }

  // 2. Loop through and send emails
  for (const reminder of dueReminders) {
    const client = reminder.clients as any // Tell TS this is an object
    const attempts = reminder.attempts || 0

    let subject = ''
    let body = ''

    // Determine tone based on how many times we've reminded them
    if (attempts === 0) {
      subject = `Quick check-in: ${client.waiting_for}`
      body = `Hi ${client.name},\n\nJust a gentle reminder regarding the ${client.waiting_for}${client.amount ? ` of ${client.currency} ${client.amount}` : ''}. Let me know if you need anything else.\n\nBest,`
    } else if (attempts < 3) {
      subject = `Following up on ${client.waiting_for}`
      body = `Hi ${client.name},\n\nI wanted to follow up again on the ${client.waiting_for}${client.amount ? ` of ${client.currency} ${client.amount}` : ''}. Could you give me an update when you get a chance?\n\nThanks,`
    } else {
      subject = `Final notice: ${client.waiting_for}`
      body = `Hi ${client.name},\n\nI haven't heard back regarding the ${client.waiting_for}${client.amount ? ` of ${client.currency} ${client.amount}` : ''}. Please let me know as soon as possible.\n\nRegards,`
    }

    try {
      // Send the email
      await resend.emails.send({
        from: 'ClientPing <onboarding@resend.dev>', // Resend's free testing sender
        to: client.email,
        subject: subject,
        text: body,
      })

      // 3. Log it in the database so we have a history
      await supabase.from('sent_log').insert({
        client_id: reminder.client_id,
        subject: subject,
        body: body,
      })

      // 4. Schedule the NEXT reminder
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + (reminder.interval_days || 3))

      await supabase
        .from('reminders')
        .update({
          next_send_at: nextDate.toISOString(),
          attempts: attempts + 1,
        })
        .eq('id', reminder.id)

    } catch (emailError) {
      console.error(`Failed to send to ${client.email}:`, emailError)
    }
  }

  return NextResponse.json({ 
    message: `Processed ${dueReminders.length} reminders` 
  })
}