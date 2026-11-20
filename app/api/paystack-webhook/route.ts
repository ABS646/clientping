import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase'
import { resend } from '@/lib/resend'

type PaystackEvent = {
  event?: string
  data?: {
    reference?: string
    status?: string
    currency?: string
    amount?: number
    customer?: { email?: string }
  }
}

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })

  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''
  const expected = crypto.createHmac('sha512', secret).update(body).digest('hex')
  const actualBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: PaystackEvent
  try {
    event = JSON.parse(body) as PaystackEvent
  } catch {
    return NextResponse.json({ error: 'Invalid event body' }, { status: 400 })
  }
  if (event.event !== 'charge.success') return NextResponse.json({ received: true })

  const data = event.data || {}
  const supabase = createAdminClient()

  if (data.reference?.startsWith('dn_')) {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, business_id, customer_id, service_name, starts_at, deposit_amount, status, deposit_status, customers(name,email), business_settings(business_name,timezone)')
      .eq('paystack_reference', data.reference)
      .maybeSingle()
    if (error) {
      console.error('Booking webhook lookup failed:', error)
      return NextResponse.json({ error: 'Could not process booking payment.' }, { status: 500 })
    }
    if (!booking) return NextResponse.json({ received: true })

    const expectedAmount = Math.round(Number(booking.deposit_amount) * 100)
    if (data.status !== 'success' || data.currency !== 'NGN' || data.amount !== expectedAmount) {
      console.error('Booking payment webhook amount or currency mismatch:', data.reference)
      return NextResponse.json({ error: 'Payment details did not match the booking.' }, { status: 400 })
    }
    const { data: transitioned, error: updateError } = await supabase.from('bookings').update({
      deposit_status: 'paid',
      status: booking.status === 'cancelled' ? 'cancelled' : 'awaiting_confirmation',
    }).eq('id', booking.id).neq('deposit_status', 'paid').select('id').maybeSingle()
    if (updateError) {
      console.error('Booking payment update failed:', updateError)
      return NextResponse.json({ error: 'Could not confirm booking payment.' }, { status: 500 })
    }
    if (transitioned) {
      const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers
      const business = Array.isArray(booking.business_settings) ? booking.business_settings[0] : booking.business_settings
      if (customer?.email) {
        const subject = `Deposit received for ${booking.service_name}`
        const startLabel = new Date(booking.starts_at).toLocaleString('en-NG', { dateStyle:'medium', timeStyle:'short', timeZone:business?.timezone || 'Africa/Lagos' })
        try {
          const mail = await resend.emails.send({
            from: process.env.RESEND_FROM || 'DueNudge <onboarding@resend.dev>',
            to: customer.email,
            subject,
            text: `Hi ${customer.name},\n\nYour deposit for ${booking.service_name} with ${business?.business_name || 'the business'} has been received. The business still needs to confirm your requested time of ${startLabel}. They will contact you if anything needs to change.`,
          })
          await supabase.from('message_log').insert({ business_id:booking.business_id, booking_id:booking.id, customer_id:booking.customer_id, kind:'booking_confirmation', recipient:customer.email, subject, provider_id:mail.data?.id || null })
        } catch (mailError) {
          console.error('Deposit confirmation email failed:', mailError)
        }
      }
    }
    return NextResponse.json({ received: true })
  }

  const email = data.customer?.email
  if (email) {
    const { error } = await supabase
      .from('profiles')
      .update({ plan: 'paid', paystack_ref: data.reference })
      .eq('email', email)

    if (error) {
      console.error('Error upgrading user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
