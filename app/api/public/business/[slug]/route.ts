import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
    return NextResponse.json({ error: 'Booking page not found.' }, { status: 404 })
  }

  try {
    const supabase = createAdminClient()
    const { data: business, error } = await supabase
      .from('business_settings')
      .select('id, business_name, slug, industry, currency, timezone, deposit_terms, paystack_status, paystack_subaccount_code')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !business) {
      return NextResponse.json({ error: 'Booking page not found.' }, { status: 404 })
    }

    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, description, duration_minutes, price, deposit_amount, currency')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (servicesError) throw servicesError
    const { paystack_subaccount_code, paystack_status, ...publicBusiness } = business
    return NextResponse.json({ business: { ...publicBusiness, can_accept_deposits: paystack_status === 'connected' && Boolean(paystack_subaccount_code) && Boolean(business.deposit_terms?.trim()) }, services: services || [] })
  } catch (error) {
    console.error('Public business lookup failed:', error)
    return NextResponse.json({ error: 'Booking page is temporarily unavailable.' }, { status: 503 })
  }
}
