'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  deposit_amount: number
  currency: string
}
type Business = { business_name: string; industry: string; currency: string; can_accept_deposits: boolean; deposit_terms: string | null }
type LocalPricing = { country: string; currency: string; rate: number; updatedAt: string | null; rateSource: string | null; locale: string }

function money(value: number, currency: string, locale = 'en') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'NGN', maximumFractionDigits: currency === 'NGN' ? 0 : 2 }).format(value || 0)
}

function priceLabel(value: number, baseCurrency: string, pricing: LocalPricing | null, locale: string) {
  if (pricing && pricing.currency !== baseCurrency && pricing.rate > 0) {
    return `≈ ${money(value * pricing.rate, pricing.currency, locale)} · ${money(value, baseCurrency, locale)}`
  }
  return money(value, baseCurrency, locale)
}

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const slug = params.slug
  const [business, setBusiness] = useState<Business | null>(null)
  const [localPricing, setLocalPricing] = useState<LocalPricing | null>(null)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [services, setServices] = useState<Service[]>([])
  const [serviceId, setServiceId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [bookingType, setBookingType] = useState<'appointment' | 'order'>('appointment')
  const [depositWasRequired, setDepositWasRequired] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verifiedReference, setVerifiedReference] = useState('')

  useEffect(() => {
    fetch(`/api/public/business/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'This booking page is not available.')
        setBusiness(data.business)
        setServices(data.services || [])
        setServiceId(data.services?.[0]?.id || '')
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    fetch('/api/local-pricing')
      .then(async (response) => {
        if (!response.ok) return null
        return await response.json() as LocalPricing
      })
      .then((pricing) => { if (pricing) setLocalPricing(pricing) })
      .catch(() => setLocalPricing(null))
      .finally(() => setPricingLoading(false))
  }, [])

  const selected = services.find((service) => service.id === serviceId)
  const visitorLocale = localPricing?.locale || 'en'
  const hasLocalEstimate = Boolean(selected && localPricing && localPricing.currency !== selected.currency && localPricing.rate > 0)
  const paid = searchParams.get('reference') || searchParams.get('trxref')
  const verifyingPayment = Boolean(paid) && verifiedReference !== paid && !error

  useEffect(() => {
    if (!paid) return
    let cancelled = false
    fetch(`/api/public/bookings/verify?reference=${encodeURIComponent(paid)}`)
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'We could not verify your payment.')
        if (cancelled) return
        setVerifiedReference(paid)
        if (result.paid) { setDepositWasRequired(true); setSuccess(true) }
        else setError('Your payment is still being confirmed. Refresh this page in a moment, or contact the business if you were charged.')
      })
      .catch((verificationError) => {
        if (!cancelled) { setVerifiedReference(paid); setError(verificationError.message || 'We could not verify your payment.') }
      })
    return () => { cancelled = true }
  }, [paid])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError('')
    setDepositWasRequired(Number(selected.deposit_amount) > 0)
    const startsAt = new Date(`${date}T${time}:00`).toISOString()
    try {
      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, serviceId, name, email, phone, startsAt, note, marketingOptIn, bookingType, termsAccepted }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'We could not save your booking.')
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl)
        return
      }
      setSuccess(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not save your booking.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || pricingLoading) return <main className="min-h-screen grid place-items-center bg-[#f7f7f2] text-slate-500">Loading booking page…</main>
  if (error && !business) return <main className="min-h-screen grid place-items-center bg-[#f7f7f2] px-6 text-center"><div><p className="text-xl font-semibold text-slate-900">Booking page unavailable</p><p className="mt-2 text-slate-600">{error}</p><Link className="mt-5 inline-block text-sm font-semibold text-emerald-700" href="/">DueNudge</Link></div></main>

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between text-sm">
          <span className="font-bold tracking-tight text-slate-900">{business?.business_name || 'Book an appointment'}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Secure booking</span>
        </div>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          {verifyingPayment ? (
            <div className="py-10 text-center"><h1 className="text-2xl font-bold text-slate-950">Confirming your deposit…</h1><p className="mt-2 text-sm text-slate-600">Please keep this page open for a moment.</p></div>
          ) : success ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
              <h1 className="mt-5 text-2xl font-bold text-slate-950">{depositWasRequired ? 'Deposit received.' : 'Request received.'}</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">{depositWasRequired ? `Your deposit was routed to ${business?.business_name}. The business still needs to confirm your requested time; check your email for updates.` : `Your preferred time has been sent to ${business?.business_name}. It is not confirmed until the business replies.`}</p>
            </div>
          ) : services.length === 0 ? (
            <div className="py-8 text-center"><h1 className="text-2xl font-bold text-slate-950">No services available yet</h1><p className="mt-2 text-sm text-slate-600">Please contact {business?.business_name} directly.</p></div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Book a time</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Let’s get you scheduled.</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Choose a service and a time that works for you.</p>
              <form onSubmit={submit} className="mt-7 space-y-4">
                <label className="block text-sm font-semibold text-slate-800">What are you booking?
                  <select value={bookingType} onChange={(e) => setBookingType(e.target.value as 'appointment' | 'order')} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"><option value="appointment">Appointment / site visit</option><option value="order">Custom order</option></select>
                </label>
                <label className="block text-sm font-semibold text-slate-800">Service
                  <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {priceLabel(Number(service.price), service.currency, localPricing, visitorLocale)}</option>)}
                  </select>
                </label>
                {selected && <div className="rounded-xl bg-[#f4f7f0] p-4 text-sm text-slate-700">{selected.description && <p>{selected.description}</p>}<p className="mt-1">{selected.duration_minutes} minutes</p><p className="mt-2 font-semibold">Service price: {priceLabel(Number(selected.price), selected.currency, localPricing, visitorLocale)}</p><p className="mt-1">{Number(selected.deposit_amount) > 0 ? `Deposit to request this booking: ${priceLabel(Number(selected.deposit_amount), selected.currency, localPricing, visitorLocale)}` : 'No online deposit required'}</p></div>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">Date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900" /></label>
                  <label className="block text-sm font-semibold text-slate-800">Time<input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900" /></label>
                </div>
                <label className="block text-sm font-semibold text-slate-800">Your name<input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">Email<input required type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900" /></label>
                  <label className="block text-sm font-semibold text-slate-800">Phone <span className="font-normal text-slate-500">(optional)</span><input type="tel" maxLength={32} value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900" /></label>
                </div>
                <label className="block text-sm font-semibold text-slate-800">Anything we should know? <span className="font-normal text-slate-500">(optional)</span><textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900" /></label>
                <label className="flex items-start gap-3 text-xs leading-5 text-slate-600"><input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-1" />I’d like occasional updates and offers from this business. I can opt out at any time.</label>
                {selected && Number(selected.deposit_amount) > 0 && business?.deposit_terms && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-950">Deposit & cancellation terms</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">{business.deposit_terms}</p><label className="mt-3 flex items-start gap-3 text-xs leading-5 text-amber-950"><input type="checkbox" required checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1" />I have read and agree to these terms for my deposit.</label></div>}
                {selected && Number(selected.deposit_amount) > 0 && !business?.can_accept_deposits && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">This business is still completing its settlement setup. Please contact them directly before paying a deposit.</p>}
                {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                <button disabled={submitting || !selected || (Number(selected.deposit_amount) > 0 && (!business?.can_accept_deposits || !termsAccepted))} className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Saving your booking…' : selected && Number(selected.deposit_amount) > 0 ? hasLocalEstimate ? `Pay ≈ ${money(Number(selected.deposit_amount) * (localPricing?.rate || 1), localPricing?.currency || selected.currency, visitorLocale)} · NGN ${money(Number(selected.deposit_amount), selected.currency, 'en-NG')}` : `Pay deposit · ${money(Number(selected.deposit_amount), selected.currency, visitorLocale)}` : 'Send booking request'}</button>
                {selected && Number(selected.deposit_amount) > 0 && <p className="text-center text-xs leading-5 text-slate-600">Paystack will charge <strong>{money(Number(selected.deposit_amount), selected.currency, visitorLocale)} in {selected.currency}</strong>. The local-currency amount is only an estimate; Paystack checkout shows the actual charge currency and your card issuer may apply its own exchange rate or fees.</p>}
                {hasLocalEstimate && localPricing?.rateSource && <p className="text-center text-[11px] leading-5 text-slate-500">Indicative daily exchange rate{localPricing.updatedAt ? ` updated ${new Date(localPricing.updatedAt).toLocaleDateString(visitorLocale)}` : ''}. <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="underline">Rates by Exchange Rate API</a></p>}
                <p className="text-center text-xs leading-5 text-slate-500">Your selected date and time are a request. The business will confirm availability. The deposit is routed to the business’s Paystack settlement account, not DueNudge.</p>
              </form>
            </>
          )}
        </section>
        <p className="mt-5 text-center text-xs text-slate-500">Booking powered by <Link href="/" className="font-semibold text-emerald-700">DueNudge</Link></p>
      </div>
    </main>
  )
}
