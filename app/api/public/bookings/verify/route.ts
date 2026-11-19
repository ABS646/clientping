import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get('reference') || ''
  if (!/^dn_[a-f0-9]{32}$/.test(reference)) {
    return NextResponse.json({ error: 'Invalid payment reference.' }, { status: 400 })
  }
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Payment verification is not configured.' }, { status: 503 })

  try {
    const supabase = createAdminClient()
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, business_id, customer_id, service_name, starts_at, deposit_amount, deposit_status, status, customers(name,email), business_settings(business_name)')
      .eq('paystack_reference', reference)
      .maybeSingle()
    if (error || !booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const result = await response.json().catch(() => null)
    const transaction = result?.data
    const expectedAmount = Math.round(Number(booking.deposit_amount) * 100)
    const paid = response.ok && result?.status === true && transaction?.status === 'success' && transaction?.reference === reference && transaction?.amount === expectedAmount && transaction?.currency === 'NGN'

    if (!paid) return NextResponse.json({ paid: false, status: booking.deposit_status })

    const { data: transitioned, error: updateError } = await supabase.from('bookings').update({
      deposit_status: 'paid',
      status: booking.status === 'cancelled' ? 'cancelled' : 'awaiting_confirmation',
    }).eq('id', booking.id).neq('deposit_status', 'paid').select('id').maybeSingle()
    if (updateError) throw updateError

    if (transitioned) {
      const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers
      const business = Array.isArray(booking.business_settings) ? booking.business_settings[0] : booking.business_settings
      const businessName = business?.business_name || 'the business'
      const startLabel = new Date(booking.starts_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })
      const subject = `Your deposit is confirmed with ${businessName}`
      try {
        const mail = await resend.emails.send({
          from: process.env.RESEND_FROM || 'DueNudge <onboarding@resend.dev>',
          to: customer.email,
        subject,
        text: `Hi ${customer.name},\n\nYour deposit for ${booking.service_name} has been received. The business still needs to confirm your requested time of ${startLabel}. They will contact you if anything needs to change.\n\n${businessName}`,
        })
        await supabase.from('message_log').insert({
          business_id: booking.business_id,
          booking_id: booking.id,
          customer_id: booking.customer_id,
          kind: 'booking_confirmation',
          recipient: customer.email,
          subject,
          provider_id: mail.data?.id || null,
        })
      } catch (mailError) {
        console.error('Deposit confirmation email failed:', mailError)
      }
    }

    return NextResponse.json({ paid: true, bookingId: booking.id })
  } catch (error) {
    console.error('Booking payment verification failed:', error)
    return NextResponse.json({ error: 'Payment verification failed. Please contact the business.' }, { status: 500 })
  }
}
