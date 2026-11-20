import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

function text(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const slug = text(body.slug, 50).toLowerCase()
  const serviceId = text(body.serviceId, 64)
  const name = text(body.name, 120)
  const email = text(body.email, 254).toLowerCase()
  const phone = text(body.phone, 32)
  const customerNote = text(body.note, 1000)
  const startsAt = text(body.startsAt, 40)
  const marketingOptIn = body.marketingOptIn === true
  const termsAccepted = body.termsAccepted === true
  const bookingType = body.bookingType === 'order' ? 'order' : 'appointment'

  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug) || !serviceId || !name || !email || !startsAt) {
    return NextResponse.json({ error: 'Please complete the required booking details.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  const appointmentDate = new Date(startsAt)
  const now = Date.now()
  if (!Number.isFinite(appointmentDate.getTime()) || appointmentDate.getTime() < now + 30 * 60_000 || appointmentDate.getTime() > now + 365 * 24 * 60 * 60_000) {
    return NextResponse.json({ error: 'Choose a time at least 30 minutes from now and within the next year.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: business, error: businessError } = await supabase
      .from('business_settings')
      .select('id, business_name, currency, slug, deposit_terms, paystack_subaccount_code, paystack_status')
      .eq('slug', slug)
      .maybeSingle()
    if (businessError || !business) return NextResponse.json({ error: 'Booking page not found.' }, { status: 404 })

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, business_id, name, price, deposit_amount, currency')
      .eq('id', serviceId)
      .eq('business_id', business.id)
      .eq('is_active', true)
      .maybeSingle()
    if (serviceError || !service) return NextResponse.json({ error: 'That service is no longer available.' }, { status: 404 })

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, marketing_opt_in')
      .eq('business_id', business.id)
      .eq('email', email)
      .maybeSingle()

    let customerId = existingCustomer?.id
    if (customerId) {
      const { error } = await supabase.from('customers').update({
        name,
        phone: phone || null,
        marketing_opt_in: marketingOptIn,
      }).eq('id', customerId)
      if (error) throw error
    } else {
      const { data: customer, error } = await supabase.from('customers').insert({
        business_id: business.id,
        name,
        email,
        phone: phone || null,
        marketing_opt_in: marketingOptIn,
      }).select('id').single()
      if (error) throw error
      customerId = customer.id
    }

    const depositAmount = Number(service.deposit_amount || 0)
    const price = Number(service.price || 0)
    if (!Number.isFinite(depositAmount) || depositAmount < 0 || depositAmount > price) {
      return NextResponse.json({ error: 'This service has an invalid deposit configuration.' }, { status: 422 })
    }
    const requiresDeposit = depositAmount > 0
    if (requiresDeposit && !termsAccepted) return NextResponse.json({ error: 'Please accept the business’s deposit and cancellation terms.' }, { status: 400 })
    if (requiresDeposit && (business.paystack_status !== 'connected' || !business.paystack_subaccount_code)) {
      return NextResponse.json({ error: 'This business has not finished setting up secure deposit settlement yet. Please contact them directly.' }, { status: 503 })
    }
    if (requiresDeposit && !business.deposit_terms?.trim()) {
      return NextResponse.json({ error: 'This business has not added its deposit and cancellation terms yet. Please contact them directly.' }, { status: 503 })
    }
    if (requiresDeposit && (service.currency || business.currency) !== 'NGN') {
      return NextResponse.json({ error: 'Online deposit checkout currently supports Nigerian naira only.' }, { status: 422 })
    }
    const reference = `dn_${crypto.randomUUID().replaceAll('-', '')}`
    const { data: booking, error: bookingError } = await supabase.from('bookings').insert({
      business_id: business.id,
      service_id: service.id,
      customer_id: customerId,
      service_name: service.name,
      booking_type: bookingType,
      starts_at: appointmentDate.toISOString(),
      status: requiresDeposit ? 'pending_payment' : 'requested',
      service_price: price,
      deposit_amount: depositAmount,
      deposit_status: requiresDeposit ? 'pending' : 'not_required',
      deposit_terms_snapshot: requiresDeposit ? business.deposit_terms.trim() : null,
      deposit_terms_accepted_at: requiresDeposit ? new Date().toISOString() : null,
      paystack_reference: requiresDeposit ? reference : null,
      customer_note: customerNote || null,
    }).select('id').single()
    if (bookingError) throw bookingError

    if (requiresDeposit) {
      const secret = process.env.PAYSTACK_SECRET_KEY
      if (!secret) {
        await supabase.from('bookings').delete().eq('id', booking.id)
        return NextResponse.json({ error: 'Online deposits are not configured yet. Please contact the business directly.' }, { status: 503 })
      }
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://getduenudge.com'}/book/${slug}?booking=created`
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount: String(Math.round(depositAmount * 100)),
          currency: 'NGN',
          reference,
          subaccount: business.paystack_subaccount_code,
          bearer: 'subaccount',
          callback_url: callbackUrl,
          metadata: { booking_id: booking.id, business_id: business.id, booking_type: bookingType },
        }),
      })
      const payment = await response.json().catch(() => null)
      if (!response.ok || !payment?.status || !payment?.data?.authorization_url) {
        await supabase.from('bookings').update({ deposit_status: 'failed', status: 'cancelled' }).eq('id', booking.id)
        console.error('Paystack could not initialize a booking deposit:', payment?.message || response.status)
        return NextResponse.json({ error: 'We could not start the deposit payment. Please try again.' }, { status: 502 })
      }
      return NextResponse.json({ checkoutUrl: payment.data.authorization_url, bookingId: booking.id })
    }

    const startLabel = appointmentDate.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })
    const subject = `Booking request received by ${business.business_name}`
    try {
      const mail = await resend.emails.send({
        from: process.env.RESEND_FROM || 'DueNudge <onboarding@resend.dev>',
        to: email,
        subject,
        text: `Hi ${name},\n\nWe received your request for ${service.name} on ${startLabel}. The business will confirm the time with you. This email is not a confirmation of an available appointment.\n\n${business.business_name}`,
      })
      await supabase.from('message_log').insert({
        business_id: business.id,
        booking_id: booking.id,
        customer_id: customerId,
        kind: 'booking_confirmation',
        recipient: email,
        subject,
        provider_id: mail.data?.id || null,
      })
    } catch (mailError) {
      console.error('Booking confirmation email failed:', mailError)
    }

    return NextResponse.json({ bookingId: booking.id, confirmed: false, requested: true })
  } catch (error) {
    console.error('Public booking creation failed:', error)
    return NextResponse.json({ error: 'We could not save this booking. Please try again.' }, { status: 500 })
  }
}
