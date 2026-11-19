import { NextResponse } from 'next/server'

export const revalidate = 3600

type PaystackBankResponse = { status?: boolean; data?: Array<{ name:string; code:string; active:boolean; is_deleted:boolean }> }

export async function GET() {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 503 })
  try {
    const response = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100&use_cursor=true', {
      headers: { Authorization: `Bearer ${secret}` },
      next: { revalidate: 3600 },
    })
    const result = await response.json() as PaystackBankResponse
    if (!response.ok || !result?.status) throw new Error('Unable to retrieve bank list.')
    const banks = (result.data || []).filter((bank) => bank.active && !bank.is_deleted).map(({ name, code }) => ({ name, code }))
    return NextResponse.json({ banks })
  } catch (error) {
    console.error('Paystack bank list failed:', error)
    return NextResponse.json({ error: 'Could not load banks. Please try again later.' }, { status: 502 })
  }
}
