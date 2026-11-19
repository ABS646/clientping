import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Paystack deposits are not configured.' }, { status: 503 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const businessId = clean(body.businessId, 64)
  const bankCode = clean(body.bankCode, 24)
  const accountNumber = clean(body.accountNumber, 20).replace(/\s/g, '')
  const contactName = clean(body.contactName, 120)
  const contactPhone = clean(body.contactPhone, 32)
  const expectedAccountName = clean(body.expectedAccountName, 120)
  if (!businessId || !bankCode || !/^\d{8,16}$/.test(accountNumber) || !contactName || !expectedAccountName) {
    return NextResponse.json({ error: 'Enter the business contact name, bank, and a valid account number.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  const user = authData?.user
  if (authError || !user) return NextResponse.json({ error: 'Your session expired. Please sign in again.' }, { status: 401 })

  const { data: business, error: businessError } = await supabase
    .from('business_settings')
    .select('id,owner_id,business_name,paystack_status,paystack_subaccount_code')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (businessError || !business) return NextResponse.json({ error: 'Business not found.' }, { status: 404 })
  if (business.paystack_subaccount_code) return NextResponse.json({ error: 'A settlement account is already connected. Contact support to change it.' }, { status: 409 })

  // Claim setup before calling Paystack so double-clicks cannot create duplicate subaccounts.
  const { data: claim, error: claimError } = await supabase
    .from('business_settings')
    .update({ paystack_status: 'connecting' })
    .eq('id', business.id)
    .eq('owner_id', user.id)
    .in('paystack_status', ['not_connected', 'failed'])
    .select('id')
    .maybeSingle()
  if (claimError || !claim) return NextResponse.json({ error: 'Settlement setup is already in progress. Refresh this page and check the status.' }, { status: 409 })

  try {
    const resolvedResponse = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const resolved = await resolvedResponse.json()
    if (!resolvedResponse.ok || !resolved?.status || !resolved?.data?.account_name) {
      await supabase.from('business_settings').update({ paystack_status: 'failed' }).eq('id', business.id)
      return NextResponse.json({ error: 'We could not verify that bank account. Check the bank and account number and try again.' }, { status: 422 })
    }

    const accountName = String(resolved.data.account_name).trim()
    const normalized = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
    if (normalized(accountName) !== normalized(expectedAccountName)) {
      await supabase.from('business_settings').update({ paystack_status: 'failed' }).eq('id', business.id)
      return NextResponse.json({ error: 'The account name changed since verification. Verify the account again before connecting it.' }, { status: 409 })
    }
    const createResponse = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: business.business_name,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 0,
        description: `DueNudge settlement for ${business.business_name}`,
        primary_contact_name: contactName,
        primary_contact_email: user.email,
        primary_contact_phone: contactPhone || undefined,
      }),
      cache: 'no-store',
    })
    const created = await createResponse.json()
    const subaccountCode = created?.data?.subaccount_code
    if (!createResponse.ok || !created?.status || typeof subaccountCode !== 'string') {
      await supabase.from('business_settings').update({ paystack_status: 'failed' }).eq('id', business.id)
      console.error('Paystack subaccount creation failed:', created?.message || createResponse.status)
      return NextResponse.json({ error: 'Paystack could not set up settlement for this account. Please try again or contact support.' }, { status: 502 })
    }

    const { error: saveError } = await supabase.from('business_settings').update({
      paystack_subaccount_code: subaccountCode,
      paystack_account_name: accountName,
      paystack_settlement_bank: clean(created.data.settlement_bank || bankCode, 100),
      paystack_connected_at: new Date().toISOString(),
      paystack_status: 'connected',
    }).eq('id', business.id).eq('owner_id', user.id)
    if (saveError) {
      console.error('Paystack subaccount created but DueNudge could not save the code:', saveError)
      return NextResponse.json({ error: 'Paystack created the settlement account, but DueNudge could not save its connection. Please contact support before trying again.' }, { status: 500 })
    }

    return NextResponse.json({ connected: true, accountName, bank: clean(created.data.settlement_bank || bankCode, 100), last4: accountNumber.slice(-4) })
  } catch (error) {
    await supabase.from('business_settings').update({ paystack_status: 'failed' }).eq('id', business.id)
    console.error('Paystack settlement setup failed:', error)
    return NextResponse.json({ error: 'Could not connect settlement right now. Please try again.' }, { status: 502 })
  }
}
