import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 503 })
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const businessId = typeof body.businessId === 'string' ? body.businessId : ''
  const bankCode = typeof body.bankCode === 'string' ? body.bankCode : ''
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.replace(/\s/g,'') : ''
  if (!businessId || !bankCode || !/^\d{8,16}$/.test(accountNumber)) return NextResponse.json({ error: 'Enter a bank and valid account number.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Your session expired. Please sign in again.' }, { status: 401 })
  const { data: business } = await supabase.from('business_settings').select('id,paystack_subaccount_code').eq('id',businessId).eq('owner_id',user.id).maybeSingle()
  if (!business) return NextResponse.json({ error: 'Business not found.' }, { status: 404 })
  if (business.paystack_subaccount_code) return NextResponse.json({ error: 'A settlement account is already connected.' }, { status: 409 })

  try {
    const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, { headers:{ Authorization:`Bearer ${secret}` }, cache:'no-store' })
    const result = await response.json()
    if (!response.ok || !result?.status || !result?.data?.account_name) return NextResponse.json({ error: 'We could not verify this account. Check the bank and account number.' }, { status: 422 })
    return NextResponse.json({ accountName:String(result.data.account_name).trim(), last4:accountNumber.slice(-4) })
  } catch (error) {
    console.error('Paystack account resolution failed:', error)
    return NextResponse.json({ error: 'Could not verify this account right now. Try again.' }, { status: 502 })
  }
}
