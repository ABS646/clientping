'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Business = { id: string; business_name: string; slug: string; industry: string; currency: string; winback_days: number; deposit_terms: string | null; paystack_status: string; paystack_account_name: string | null; paystack_settlement_bank: string | null }
type Service = { id: string; name: string; description: string | null; duration_minutes: number; price: number; deposit_amount: number; currency: string; is_active: boolean }
type Booking = {
  id: string; service_name: string; starts_at: string; status: string; booking_type: string; service_price: number; deposit_amount: number; deposit_status: string; created_at: string;
  customers: { id: string; name: string; email: string; phone: string | null } | { id: string; name: string; email: string; phone: string | null }[] | null
}
type Customer = { id: string; name: string; email: string; phone: string | null; marketing_opt_in: boolean; last_visit_at: string | null; winback_sent_at: string | null }
type Bank = { name:string; code:string }
type View = 'overview' | 'bookings' | 'customers' | 'services' | 'settings'

const industries = ['salon','clinic','dentist','restaurant','tailor','photographer','tutor','gym','home_renovation','other']
const industryLabel: Record<string,string> = { salon:'Salon / beauty', clinic:'Clinic', dentist:'Dentist', restaurant:'Restaurant', tailor:'Tailor', photographer:'Photographer', tutor:'Tutor', gym:'Gym / fitness', home_renovation:'Home renovation', other:'Other service business' }
const statusLabel: Record<string,string> = { requested:'Time request', pending_payment:'Awaiting deposit', awaiting_confirmation:'Deposit paid · confirm time', confirmed:'Confirmed', completed:'Completed', no_show:'No-show', cancelled:'Cancelled' }
const currency = (value: number, code = 'NGN') => new Intl.NumberFormat('en-NG', { style:'currency', currency:code, maximumFractionDigits:0 }).format(Number(value || 0))
const customerFor = (booking: Booking) => Array.isArray(booking.customers) ? booking.customers[0] : booking.customers

export default function DashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [view, setView] = useState<View>('overview')
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [asOf, setAsOf] = useState(0)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [industry, setIndustry] = useState('salon')
  const [winbackDays, setWinbackDays] = useState('30')
  const [serviceName, setServiceName] = useState('')
  const [serviceDuration, setServiceDuration] = useState('60')
  const [servicePrice, setServicePrice] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositTerms, setDepositTerms] = useState('')
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [resolvedAccountName, setResolvedAccountName] = useState('')
  const [verifiedLast4, setVerifiedLast4] = useState('')
  const [acceptSettlementTerms, setAcceptSettlementTerms] = useState(false)
  const [settlementBusy, setSettlementBusy] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: foundBusiness, error: businessError } = await supabase.from('business_settings').select('*').eq('owner_id', user.id).maybeSingle()
    if (businessError) {
      setNotice(`Setup needed: ${businessError.message}. Apply the database migration from the project before using the new dashboard.`)
      setAsOf(Date.now())
      setLoading(false)
      return
    }
    setBusiness(foundBusiness)
    if (foundBusiness) {
      setBusinessName(foundBusiness.business_name)
      setSlug(foundBusiness.slug)
      setIndustry(foundBusiness.industry)
      setDepositTerms(foundBusiness.deposit_terms || '')
      setWinbackDays(String(foundBusiness.winback_days || 30))
      const [servicesResult, bookingsResult, customersResult] = await Promise.all([
        supabase.from('services').select('*').eq('business_id', foundBusiness.id).order('created_at', { ascending: true }),
        supabase.from('bookings').select('*,customers(id,name,email,phone)').eq('business_id', foundBusiness.id).order('starts_at', { ascending: true }),
        supabase.from('customers').select('*').eq('business_id', foundBusiness.id).order('last_visit_at', { ascending: true, nullsFirst: true }),
      ])
      if (servicesResult.error || bookingsResult.error || customersResult.error) {
        setNotice('Some workspace data could not load. Confirm the database migration and row-security policies are installed.')
      }
      setServices(servicesResult.data || [])
      setBookings(bookingsResult.data || [])
      setCustomers(customersResult.data || [])
    }
    setAsOf(Date.now())
    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (view !== 'settings' || !business || business.paystack_status === 'connected' || banks.length) return
    fetch('/api/paystack/banks').then(async (response) => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load banks.')
      setBanks(result.banks || [])
      setBankCode(result.banks?.[0]?.code || '')
    }).catch((error) => setNotice(error.message))
  }, [view, business, banks.length])

  const todayBookings = bookings.filter((booking) => new Date(booking.starts_at).toDateString() === new Date().toDateString() && !['cancelled','completed'].includes(booking.status))
  const needsAttention = bookings.filter((booking) => ['requested','pending_payment','awaiting_confirmation','no_show'].includes(booking.status))
  const inactiveCustomers = customers.filter((customer) => {
    if (!customer.last_visit_at || !customer.marketing_opt_in) return false
    const days = (asOf - new Date(customer.last_visit_at).getTime()) / 86_400_000
    return days >= Number(business?.winback_days || 30)
  })
  const filteredCustomers = customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone || ''}`.toLowerCase().includes(customerSearch.toLowerCase()))

  async function createBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const normalizedSlug = slugify(slug || businessName)
    const { error } = await supabase.from('business_settings').insert({ owner_id:user.id, business_name:businessName.trim(), slug:normalizedSlug, industry, currency:'NGN', timezone:'Africa/Lagos' })
    if (error) setNotice(error.message.includes('business_settings') ? 'Database migration is not installed yet. Apply supabase/migrations/20261119000000_booking_recovery.sql in your Supabase project.' : error.message)
    else { setNotice('Workspace created. Add at least one service to start taking bookings.'); await load() }
    setSaving(false)
  }

  async function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!business) return
    setSaving(true); setNotice('')
    const price = Number(servicePrice || 0); const deposit = Number(depositAmount || 0)
    if (deposit > price) { setNotice('Deposit cannot be higher than the service price.'); setSaving(false); return }
    const { error } = await supabase.from('services').insert({ business_id:business.id, name:serviceName.trim(), duration_minutes:Number(serviceDuration), price, deposit_amount:deposit, currency:business.currency || 'NGN' })
    if (error) setNotice(error.message)
    else { setServiceName(''); setServicePrice(''); setDepositAmount(''); setNotice('Service added.'); await load() }
    setSaving(false)
  }

  async function updateStatus(booking: Booking, nextStatus: string) {
    if (nextStatus === 'confirmed') {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/business/bookings/${booking.id}/confirm`, { method:'POST', headers:{ Authorization:`Bearer ${session?.access_token || ''}` } })
      const result = await response.json()
      if (!response.ok) { setNotice(result.error || 'Could not confirm this booking.'); return }
      setNotice(result.emailSent === false ? result.message : 'Time confirmed and customer notified.')
      await load()
      return
    }
    const { error } = await supabase.from('bookings').update({ status:nextStatus }).eq('id', booking.id)
    if (error) { setNotice(error.message); return }
    if (nextStatus === 'completed') {
      const customer = customerFor(booking)
      if (customer?.id) await supabase.from('customers').update({ last_visit_at:booking.starts_at, winback_sent_at:null }).eq('id', customer.id)
    }
    setNotice(nextStatus === 'no_show' ? 'Marked as a no-show. Deposit status remains recorded for your follow-up.' : 'Booking updated.')
    await load()
  }

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!business) return
    setSaving(true); setNotice('')
    const { error } = await supabase.from('business_settings').update({ business_name:businessName.trim(), slug:slugify(slug), industry, deposit_terms:depositTerms.trim() || null, winback_days:Number(winbackDays) }).eq('id', business.id)
    setNotice(error ? error.message : 'Business settings saved.')
    setSaving(false); if (!error) await load()
  }

  async function verifySettlementAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!business) return
    setSettlementBusy(true); setNotice(''); setResolvedAccountName(''); setVerifiedLast4(''); setAcceptSettlementTerms(false)
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/paystack/resolve', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session?.access_token || ''}` },
      body:JSON.stringify({ businessId:business.id, bankCode, accountNumber }),
    })
    const result = await response.json()
    if (!response.ok) setNotice(result.error || 'Could not verify the bank account.')
    else { setResolvedAccountName(result.accountName); setVerifiedLast4(result.last4); setNotice('Account name verified. Check it carefully before you connect settlement.') }
    setSettlementBusy(false)
  }

  async function connectSettlementAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!business || !resolvedAccountName || !acceptSettlementTerms) return
    setSettlementBusy(true); setNotice('Creating the Paystack settlement account…')
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/business/paystack-connect', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session?.access_token || ''}` },
      body:JSON.stringify({ businessId:business.id, bankCode, accountNumber, contactName, contactPhone, expectedAccountName:resolvedAccountName }),
    })
    const result = await response.json()
    if (!response.ok) setNotice(result.error || 'Could not connect Paystack settlement.')
    else { setNotice(`Settlement connected to ${result.accountName} · ${result.bank} · ending ${result.last4}.`); setAccountNumber(''); setResolvedAccountName(''); setAcceptSettlementTerms(false); await load() }
    setSettlementBusy(false)
  }

  async function logout() { await supabase.auth.signOut(); router.push('/login') }
  async function copyBookingLink() {
    if (!business) return
    const url = `${window.location.origin}/book/${business.slug}`
    try { await navigator.clipboard.writeText(url); setNotice('Booking link copied.') } catch { setNotice(url) }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f7f7f2] text-slate-500">Loading DueNudge…</main>

  const nav: { id: View; label: string; icon: string }[] = [
    { id:'overview', label:'Overview', icon:'◫' }, { id:'bookings', label:'Bookings', icon:'▤' },
    { id:'customers', label:'Customers', icon:'◎' }, { id:'services', label:'Services', icon:'✳' }, { id:'settings', label:'Settings', icon:'⚙' },
  ]

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200 bg-white p-5 lg:flex">
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">Due<span className="text-emerald-700">Nudge</span></Link>
        <div className="mt-8 rounded-2xl bg-[#f4f7f0] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace</p><p className="mt-1 truncate font-bold">{business?.business_name || 'Set up your business'}</p><p className="mt-1 text-xs text-slate-500">{industryLabel[business?.industry || 'salon']}</p></div>
        <nav className="mt-7 space-y-1">{nav.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${view === item.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><span className="w-5 text-center">{item.icon}</span>{item.label}{item.id === 'bookings' && needsAttention.length > 0 && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{needsAttention.length}</span>}</button>)}</nav>
        {business && <div className="mt-auto rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-950">Your booking page</p><p className="mt-1 truncate text-xs text-emerald-800">/book/{business.slug}</p><button onClick={copyBookingLink} className="mt-3 w-full rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">Copy booking link</button></div>}
        <button onClick={logout} className="mt-4 px-3 py-2 text-left text-sm text-slate-500 hover:text-slate-950">Log out</button>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-[#f7f7f2]/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">DueNudge workspace</p><h1 className="mt-1 text-lg font-bold sm:text-xl">{nav.find((item) => item.id === view)?.label || 'Overview'}</h1></div><div className="flex items-center gap-2"><button onClick={copyBookingLink} disabled={!business} className="hidden rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold sm:block disabled:opacity-50">Share booking link</button><button onClick={logout} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-white lg:hidden">Log out</button></div></div><div className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">{nav.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${view === item.id ? 'bg-slate-950 text-white' : 'bg-white text-slate-600'}`}>{item.label}</button>)}</div></header>
        <main className="mx-auto max-w-6xl p-4 sm:p-7">
          {notice && <div role="status" className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss" className="font-bold">×</button></div>}
          {!business ? <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">First, the basics</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Set up your business.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Create a simple booking page for your customers. You choose which services require a deposit.</p><form onSubmit={createBusiness} className="mt-7 space-y-4"><label className="block text-sm font-semibold">Business name<input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="e.g. Studio Nia" /></label><label className="block text-sm font-semibold">Booking link<input required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="studio-nia" /><span className="mt-1 block text-xs font-normal text-slate-500">getduenudge.com/book/{slugify(slug || 'your-business')}</span></label><label className="block text-sm font-semibold">Business type<select value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal">{industries.map((value) => <option key={value} value={value}>{industryLabel[value]}</option>)}</select></label><button disabled={saving} className="w-full rounded-xl bg-slate-950 px-5 py-3.5 font-bold text-white disabled:opacity-50">{saving ? 'Creating workspace…' : 'Create my booking page'}</button></form></section> : view === 'overview' ? <>
            <section className="mb-6 rounded-3xl bg-slate-950 p-6 text-white sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-emerald-200">Less chasing. Fewer empty slots.</p><h2 className="mt-2 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Know what’s booked, what’s at risk, and who to bring back.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Deposits help secure appointments. Timely reminders help customers show up. Opt-in win-backs help past customers return.</p></div><button onClick={() => setView('bookings')} className="shrink-0 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300">Review bookings</button></div></section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Today’s bookings" value={todayBookings.length} hint="Bookings and requests on the calendar" /><Metric label="Need attention" value={needsAttention.length} hint="Confirm times, collect deposits, review no-shows" /><Metric label="Customers to win back" value={inactiveCustomers.length} hint={`Opted in · inactive ${business.winback_days}+ days`} /><Metric label="Services listed" value={services.filter((service) => service.is_active).length} hint="Available on your booking page" /></div>
            <div className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">Upcoming bookings</h3><p className="mt-1 text-xs text-slate-500">Your next customer visits</p></div><button onClick={() => setView('bookings')} className="text-xs font-bold text-emerald-800">All bookings →</button></div><BookingList bookings={bookings.filter((booking) => new Date(booking.starts_at) >= new Date() && !['cancelled','completed'].includes(booking.status)).slice(0,5)} updateStatus={updateStatus} /></section><section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold">Win-back opportunity</h3><p className="mt-1 text-xs leading-5 text-slate-500">Only customers who agreed to updates appear here. The automatic email runs from the scheduled recovery job.</p>{inactiveCustomers.length ? <div className="mt-4 space-y-3">{inactiveCustomers.slice(0,4).map((customer) => <div key={customer.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f7f2] p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{customer.name}</p><p className="truncate text-xs text-slate-500">{customer.email}</p></div><span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">{customer.winback_sent_at ? 'Sent' : 'Queued'}</span></div>)}</div> : <Empty text="Opted-in past customers will appear here when it’s time to invite them back." />}</section></div>
          </> : view === 'bookings' ? <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="mb-4"><h2 className="text-xl font-bold">Bookings and order deposits</h2><p className="mt-1 text-sm text-slate-500">Track confirmations, deposits, completions, and no-shows.</p></div><BookingList bookings={bookings} updateStatus={updateStatus} emptyText="No bookings yet. Add services, then share your public booking link." /></section> : view === 'customers' ? <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-xl font-bold">Your customers</h2><p className="mt-1 text-sm text-slate-500">Win-back messages are only sent when a customer has opted in.</p></div><input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search customers" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm" /></div><div className="mt-5 divide-y divide-slate-100">{filteredCustomers.length ? filteredCustomers.map((customer) => <div key={customer.id} className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{customer.name}</p><p className="text-sm text-slate-500">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</p></div><div className="text-xs text-slate-500">{customer.last_visit_at ? `Last visit ${new Date(customer.last_visit_at).toLocaleDateString()}` : 'No completed visit recorded'} · {customer.marketing_opt_in ? 'Updates opted in' : 'No marketing opt-in'}</div></div>) : <Empty text="Customer records will appear after the first booking." />}</div></section> : view === 'services' ? <section className="grid gap-6 xl:grid-cols-[1fr_1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-xl font-bold">Add a service</h2><p className="mt-1 text-sm text-slate-500">Choose the amount customers pay upfront to hold a slot.</p><form onSubmit={addService} className="mt-5 space-y-4"><label className="block text-sm font-semibold">Service name<input required value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="e.g. Braids appointment" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Duration (minutes)<input type="number" min="5" max="1440" required value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label><label className="block text-sm font-semibold">Price (₦)<input type="number" min="0" step="100" required value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label></div><label className="block text-sm font-semibold">Deposit (₦)<input type="number" min="0" step="100" required value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">Set to 0 to skip online deposits for this service.</span></label><button disabled={saving} className="w-full rounded-xl bg-slate-950 px-5 py-3.5 font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Add service'}</button></form></div><div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-xl font-bold">Listed services</h2><p className="mt-1 text-sm text-slate-500">These appear on your public booking page.</p><div className="mt-4 space-y-3">{services.length ? services.map((service) => <div key={service.id} className="rounded-xl bg-[#f7f7f2] p-4"><div className="flex justify-between gap-3"><p className="font-semibold">{service.name}</p><span className="whitespace-nowrap text-sm font-bold">{currency(service.price, service.currency)}</span></div><p className="mt-1 text-xs text-slate-500">{service.duration_minutes} min · {Number(service.deposit_amount) > 0 ? `${currency(service.deposit_amount, service.currency)} deposit` : 'No deposit'}</p></div>) : <Empty text="Add your first service to publish your booking page." />}</div></div></section> : <section className="max-w-3xl space-y-6 rounded-2xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-bold">Business settings</h2>
              <p className="mt-1 text-sm text-slate-500">Manage your public booking page and customer recovery defaults.</p>
              <form onSubmit={saveBusiness} className="mt-5 space-y-4">
                <label className="block text-sm font-semibold">Business name<input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
                <label className="block text-sm font-semibold">Booking link slug<input required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">getduenudge.com/book/{slug}</span></label>
                <label className="block text-sm font-semibold">Business type<select value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal">{industries.map((value) => <option key={value} value={value}>{industryLabel[value]}</option>)}</select></label>
                <label className="block text-sm font-semibold">Win-back after (days)<input type="number" min="7" max="365" value={winbackDays} onChange={(e) => setWinbackDays(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">Only customers who explicitly opted in receive a reactivation email.</span></label>
                <label className="block text-sm font-semibold">Deposit and cancellation terms<textarea rows={4} maxLength={1200} value={depositTerms} onChange={(e) => setDepositTerms(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="Explain when deposits are due and how cancellations or refunds are handled." /><span className="mt-1 block text-xs font-normal text-slate-500">Customers must review and accept these terms before paying a deposit. Write your own policy; DueNudge does not set legal or refund terms for you.</span></label>
                <button disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save settings'}</button>
              </form>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-xl font-bold">Deposit settlement</h2><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Connect the business bank account that should receive customer deposits through Paystack.</p></div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${business.paystack_status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{business.paystack_status === 'connected' ? 'Connected' : 'Not connected'}</span>
              </div>
              {business.paystack_status === 'connected' ? <div className="mt-5 rounded-xl bg-emerald-50 p-4"><p className="font-semibold text-emerald-950">{business.paystack_account_name}</p><p className="mt-1 text-sm text-emerald-800">{business.paystack_settlement_bank}</p><p className="mt-3 text-xs leading-5 text-emerald-900">Paystack subaccount settlement is connected. DueNudge receives 0% of each customer deposit; Paystack processing fees are borne by the business settlement account. Contact support if this bank account needs to change.</p></div> : <>
                <form onSubmit={verifySettlementAccount} className="mt-5 space-y-4">
                  <label className="block text-sm font-semibold">Settlement bank<select required value={bankCode} onChange={(e) => { setBankCode(e.target.value); setResolvedAccountName('') }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"><option value="">Choose a Nigerian bank</option>{banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></label>
                  <label className="block text-sm font-semibold">Bank account number<input required inputMode="numeric" autoComplete="off" maxLength={16} value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g,'').slice(0,16)); setResolvedAccountName('') }} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
                  <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Business contact name<input required maxLength={120} value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label><label className="block text-sm font-semibold">Contact phone <span className="font-normal text-slate-500">(optional)</span><input maxLength={32} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label></div>
                  <button disabled={settlementBusy || !bankCode || accountNumber.length < 8} className="rounded-xl border border-slate-300 px-5 py-3 font-bold disabled:opacity-50">{settlementBusy && !resolvedAccountName ? 'Verifying account…' : 'Verify bank account'}</button>
                </form>
                {resolvedAccountName && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Verify before connecting</p><p className="mt-2 text-lg font-bold text-emerald-950">{resolvedAccountName}</p><p className="mt-1 text-sm text-emerald-800">Account ending {verifiedLast4} · {banks.find((bank) => bank.code === bankCode)?.name}</p><form onSubmit={connectSettlementAccount} className="mt-4 space-y-4"><label className="flex items-start gap-3 text-xs leading-5 text-emerald-950"><input required type="checkbox" checked={acceptSettlementTerms} onChange={(e) => setAcceptSettlementTerms(e.target.checked)} className="mt-1" />I confirm this is the correct bank account and authorize DueNudge to create a Paystack subaccount for this business. Paystack receives the bank details; the account number is not stored in DueNudge. Customer deposits are routed to this business account, DueNudge takes no share, and the business bears Paystack transaction fees.</label><button disabled={settlementBusy || !acceptSettlementTerms} className="w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-50">{settlementBusy ? 'Connecting settlement…' : 'Create Paystack settlement account'}</button></form></div>}
                <p className="mt-4 text-xs leading-5 text-slate-500">Bank details are sent directly from this secure page to Paystack for account verification and subaccount setup. DueNudge stores only the verified account name, bank name, and Paystack subaccount code. Online deposits stay disabled until setup is complete.</p>
              </>}
            </div>
          </section>}
        </main>
      </div>
    </div>
  )
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50) }
function Metric({ label, value, hint }: { label:string; value:number; hint:string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></div> }
function Empty({ text }: { text:string }) { return <div className="py-8 text-center text-sm leading-6 text-slate-500">{text}</div> }
function BookingList({ bookings, updateStatus, emptyText='No upcoming bookings yet.' }: { bookings:Booking[]; updateStatus:(booking:Booking,status:string)=>void; emptyText?:string }) {
  if (!bookings.length) return <Empty text={emptyText} />
  return <div className="mt-4 divide-y divide-slate-100">{bookings.map((booking) => { const customer = customerFor(booking); const reviewable = ['requested','awaiting_confirmation'].includes(booking.status); return <article key={booking.id} className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{booking.service_name}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : ['pending_payment','requested','awaiting_confirmation'].includes(booking.status) ? 'bg-amber-100 text-amber-900' : booking.status === 'no_show' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{statusLabel[booking.status] || booking.status}</span></div><p className="mt-1 text-sm text-slate-600">{customer?.name || 'Customer'} · {customer?.email || ''}</p><p className="mt-1 text-xs text-slate-500">{new Date(booking.starts_at).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'})} · {currency(booking.service_price)}{Number(booking.deposit_amount)>0 ? ` · deposit ${currency(booking.deposit_amount)} (${booking.deposit_status})` : ''}</p></div><div className="flex flex-wrap gap-2">{reviewable && booking.deposit_status !== 'pending' && <button onClick={() => updateStatus(booking,'confirmed')} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900">Confirm time</button>}{booking.status === 'confirmed' && <><button onClick={() => updateStatus(booking,'completed')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-emerald-50">Completed</button><button onClick={() => updateStatus(booking,'no_show')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-rose-50">No-show</button></>}{booking.status === 'requested' && <button onClick={() => updateStatus(booking,'cancelled')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-rose-700">Decline request</button>}</div></article> })}</div>
}
