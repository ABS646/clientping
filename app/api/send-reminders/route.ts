import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  const expected = Buffer.from(secret)
  const actual = Buffer.from(supplied)
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

function related<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value
}

function formatTime(value: string, timezone: string) {
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone || 'Africa/Lagos' })
}

type LegacyClient = { name:string; email:string; waiting_for:string; amount:number | null; currency:string | null }
type ReminderCustomer = { name:string; email:string }
type ReminderBusiness = { business_name:string; reminder_hours:number; timezone:string }
type WinbackBusiness = { business_name:string; winback_days:number }
type RecoveryCustomer = { name:string; email:string; marketing_opt_in:boolean; marketing_unsubscribe_token:string }
type RecoveryBusiness = { business_name:string; slug:string; timezone:string }

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 })
  const supabase = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const stats = { legacy: 0, bookingReminders: 0, noShowRecovery: 0, winback: 0, failed: 0 }
  const from = process.env.RESEND_FROM || 'DueNudge <onboarding@resend.dev>'

  // Keep the existing payment/approval reminder workflow working for current accounts.
  const { data: dueReminders, error: legacyError } = await supabase
    .from('reminders')
    .select('id, client_id, interval_days, attempts, clients(name,email,waiting_for,amount,currency)')
    .lte('next_send_at', nowIso)
    .eq('active', true)
    .lt('attempts', 5)

  if (legacyError) {
    console.error('Error fetching existing reminders:', legacyError)
    stats.failed++
  } else {
    for (const reminder of dueReminders || []) {
      const client = related(reminder.clients as unknown as LegacyClient | LegacyClient[] | null)
      if (!client?.email) continue
      const attempts = reminder.attempts || 0
      const subject = attempts === 0
        ? `Quick check-in: ${client.waiting_for}`
        : attempts < 3
          ? `Following up on ${client.waiting_for}`
          : `Final notice: ${client.waiting_for}`
      const amountText = client.amount ? ` of ${client.currency} ${client.amount}` : ''
      const body = attempts === 0
        ? `Hi ${client.name},\n\nJust a gentle reminder regarding the ${client.waiting_for}${amountText}. Let me know if you need anything else.\n\nBest,`
        : attempts < 3
          ? `Hi ${client.name},\n\nI wanted to follow up again on the ${client.waiting_for}${amountText}. Could you give me an update when you get a chance?\n\nThanks,`
          : `Hi ${client.name},\n\nI haven't heard back regarding the ${client.waiting_for}${amountText}. Please let me know as soon as possible.\n\nRegards,`
      try {
        await resend.emails.send({ from, to: client.email, subject, text: body })
        await supabase.from('sent_log').insert({ client_id: reminder.client_id, subject, body })
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + (reminder.interval_days || 3))
        await supabase.from('reminders').update({ next_send_at: nextDate.toISOString(), attempts: attempts + 1 }).eq('id', reminder.id)
        stats.legacy++
      } catch (emailError) {
        console.error(`Legacy reminder failed for ${client.email}:`, emailError)
        stats.failed++
      }
    }
  }

  // Appointment reminder: send once inside the business-configured reminder window.
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .select('id,business_id,customer_id,service_name,starts_at,reminder_sent_at,customers(name,email),business_settings(business_name,reminder_hours,timezone)')
    .eq('status', 'confirmed')
    .gte('starts_at', nowIso)
    .lte('starts_at', horizon)
    .is('reminder_sent_at', null)

  if (bookingError) {
    console.error('Error fetching appointment reminders:', bookingError)
    stats.failed++
  } else {
    for (const booking of bookings || []) {
      const customer = related(booking.customers as unknown as ReminderCustomer | ReminderCustomer[] | null)
      const business = related(booking.business_settings as unknown as ReminderBusiness | ReminderBusiness[] | null)
      if (!customer?.email || !business) continue
      const hours = Number(business.reminder_hours || 24)
      const timeToBooking = new Date(booking.starts_at).getTime() - now.getTime()
      if (timeToBooking > hours * 60 * 60 * 1000) continue
      const subject = `Reminder: ${booking.service_name} with ${business.business_name}`
      const body = `Hi ${customer.name},\n\nA quick reminder about your ${booking.service_name} with ${business.business_name} on ${formatTime(booking.starts_at, business.timezone)}.\n\nIf you need to make a change, please contact the business directly.`
      try {
        const result = await resend.emails.send({ from, to: customer.email, subject, text: body })
        const sentAt = new Date().toISOString()
        const { error: updateError } = await supabase.from('bookings').update({ reminder_sent_at: sentAt }).eq('id', booking.id).is('reminder_sent_at', null)
        if (updateError) throw updateError
        await supabase.from('message_log').insert({ business_id: booking.business_id, booking_id: booking.id, customer_id: booking.customer_id, kind: 'appointment_reminder', recipient: customer.email, subject, provider_id: result.data?.id || null })
        stats.bookingReminders++
      } catch (emailError) {
        console.error(`Appointment reminder failed for ${customer.email}:`, emailError)
        stats.failed++
      }
    }
  }

  // Offer a rebooking link after a missed visit, only to customers who opted in.
  const noShowCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { data: noShowBookings, error: noShowError } = await supabase
    .from('bookings')
    .select('id,business_id,customer_id,service_name,starts_at,no_show_recovery_sent_at,customers(name,email,marketing_opt_in,marketing_unsubscribe_token),business_settings(business_name,slug,timezone)')
    .eq('status','no_show')
    .lte('starts_at',noShowCutoff)
    .is('no_show_recovery_sent_at',null)
    .limit(250)

  if (noShowError) {
    console.error('Error fetching no-show recovery bookings:', noShowError)
    stats.failed++
  } else {
    for (const booking of noShowBookings || []) {
      const customer = related(booking.customers as unknown as RecoveryCustomer | RecoveryCustomer[] | null)
      const business = related(booking.business_settings as unknown as RecoveryBusiness | RecoveryBusiness[] | null)
      if (!customer?.email || !customer.marketing_opt_in || !business) continue
      const subject = `Would you like to rebook with ${business.business_name}?`
      const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://getduenudge.com'}/book/${encodeURIComponent(business.slug)}`
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://getduenudge.com'}/unsubscribe?token=${encodeURIComponent(customer.marketing_unsubscribe_token)}`
      const body = `Hi ${customer.name},\n\nWe missed you for your ${booking.service_name} booking with ${business.business_name}. If you still need the service, you can request a new time here: ${bookingUrl}\n\nYou received this message because you opted in to updates from the business. To stop future win-back emails, unsubscribe here: ${unsubscribeUrl}`
      try {
        const result = await resend.emails.send({ from, to:customer.email, subject, text:body })
        const sentAt = new Date().toISOString()
        const { error: updateError } = await supabase.from('bookings').update({ no_show_recovery_sent_at:sentAt }).eq('id',booking.id).is('no_show_recovery_sent_at',null)
        if (updateError) throw updateError
        await supabase.from('message_log').insert({ business_id:booking.business_id, booking_id:booking.id, customer_id:booking.customer_id, kind:'winback', recipient:customer.email, subject, provider_id:result.data?.id || null })
        stats.noShowRecovery++
      } catch (emailError) {
        console.error(`No-show recovery email failed for ${customer.email}:`, emailError)
        stats.failed++
      }
    }
  }

  // Respect explicit opt-in. One win-back message is sent per inactive period.
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id,business_id,name,email,marketing_unsubscribe_token,last_visit_at,winback_sent_at,business_settings(business_name,winback_days)')
    .eq('marketing_opt_in', true)
    .not('last_visit_at', 'is', null)
    .is('winback_sent_at', null)
    .limit(250)

  if (customerError) {
    console.error('Error fetching win-back customers:', customerError)
    stats.failed++
  } else {
    for (const customer of customers || []) {
      const business = related(customer.business_settings as unknown as WinbackBusiness | WinbackBusiness[] | null)
      if (!business || !customer.email || !customer.last_visit_at) continue
      const cutoff = now.getTime() - Number(business.winback_days || 30) * 24 * 60 * 60 * 1000
      if (new Date(customer.last_visit_at).getTime() > cutoff) continue
      const subject = `We’d love to see you again at ${business.business_name}`
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://getduenudge.com'}/unsubscribe?token=${encodeURIComponent(customer.marketing_unsubscribe_token)}`
      const body = `Hi ${customer.name},\n\nIt’s been a little while since your last visit to ${business.business_name}. If you’d like to come back, reply to this email or contact the business to arrange your next visit.\n\nYou received this note because you opted in to updates from the business. To stop future win-back emails, unsubscribe here: ${unsubscribeUrl}`
      try {
        const result = await resend.emails.send({ from, to: customer.email, subject, text: body })
        const sentAt = new Date().toISOString()
        const { error: updateError } = await supabase.from('customers').update({ winback_sent_at: sentAt }).eq('id', customer.id).is('winback_sent_at', null)
        if (updateError) throw updateError
        await supabase.from('message_log').insert({ business_id: customer.business_id, customer_id: customer.id, kind: 'winback', recipient: customer.email, subject, provider_id: result.data?.id || null })
        stats.winback++
      } catch (emailError) {
        console.error(`Win-back email failed for ${customer.email}:`, emailError)
        stats.failed++
      }
    }
  }

  return NextResponse.json({ message: 'DueNudge reminders processed.', ...stats })
}
