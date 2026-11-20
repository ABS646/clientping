import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const { id } = await params
  const supabase = createAdminClient()
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  const user = authData?.user
  if (authError || !user) return NextResponse.json({ error: 'Your session expired. Please sign in again.' }, { status: 401 })

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id,status,service_name,starts_at,deposit_status,customers(name,email),business_settings!inner(id,owner_id,business_name,timezone)')
    .eq('id', id)
    .eq('business_settings.owner_id', user.id)
    .maybeSingle()
  if (error || !booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  if (!['requested','awaiting_confirmation'].includes(booking.status)) return NextResponse.json({ error: 'Only a pending booking request can be confirmed.' }, { status: 409 })
  if (booking.deposit_status === 'pending' || booking.deposit_status === 'failed') return NextResponse.json({ error: 'The required deposit has not been received.' }, { status: 409 })

  const { error: updateError } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id).in('status', ['requested','awaiting_confirmation'])
  if (updateError) return NextResponse.json({ error: 'Could not confirm this booking.' }, { status: 500 })

  const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers
  const business = Array.isArray(booking.business_settings) ? booking.business_settings[0] : booking.business_settings
  const subject = `Your ${booking.service_name} time is confirmed`
  const startLabel = new Date(booking.starts_at).toLocaleString('en-NG', { dateStyle:'medium', timeStyle:'short', timeZone:business?.timezone || 'Africa/Lagos' })
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'DueNudge <onboarding@resend.dev>',
      to: customer.email,
      subject,
      text: `Hi ${customer.name},\n\n${business?.business_name} has confirmed your ${booking.service_name} for ${startLabel}.\n\nIf you need to make a change, please contact the business directly.`,
    })
  } catch (mailError) {
    console.error('Appointment confirmation email failed:', mailError)
    return NextResponse.json({ confirmed: true, emailSent: false, message: 'Booking confirmed, but the email could not be sent.' })
  }
  return NextResponse.json({ confirmed: true, emailSent: true })
}
