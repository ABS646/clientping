import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature')

  // 1. Verify the request actually came from Paystack (security)
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  // 2. If payment was successful, upgrade the user
  if (event.event === 'charge.success') {
    const email = event.data.customer.email
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({ plan: 'paid', paystack_ref: event.data.reference })
      .eq('email', email)

    if (error) {
      console.error('Error upgrading user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Upgraded ${email} to paid plan`)
  }

  // 3. Always return 200 so Paystack knows we received it
  return NextResponse.json({ received: true })
}