import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: Request) {
  let token = ''
  try { token = String((await request.json()).token || '') } catch { return NextResponse.json({ error:'Invalid request.' }, { status:400 }) }
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error:'This unsubscribe link is invalid or has expired.' }, { status:400 })
  const supabase = createAdminClient()
  const { data: customer, error } = await supabase.from('customers').select('id').eq('marketing_unsubscribe_token',token).maybeSingle()
  if (error || !customer) return NextResponse.json({ error:'This unsubscribe link is invalid or has expired.' }, { status:404 })
  const { error: updateError } = await supabase.from('customers').update({ marketing_opt_in:false }).eq('id',customer.id)
  if (updateError) return NextResponse.json({ error:'Could not update your preference. Please contact the business.' }, { status:500 })
  return NextResponse.json({ unsubscribed:true })
}
