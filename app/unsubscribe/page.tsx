'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function UnsubscribePage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f7f7f2] text-sm text-slate-500">Loading preferences…</main>}><UnsubscribeForm /></Suspense>
}

function UnsubscribeForm() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [loading,setLoading] = useState(false)
  const [done,setDone] = useState(false)
  const [error,setError] = useState('')

  async function unsubscribe() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/public/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update your preference.')
      setDone(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update your preference.')
    } finally { setLoading(false) }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f7f7f2] px-4 py-10 text-slate-950"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9"><p className="text-xl font-black">Due<span className="text-emerald-700">Nudge</span></p>{done ? <><h1 className="mt-7 text-2xl font-bold">You’re unsubscribed.</h1><p className="mt-3 text-sm leading-6 text-slate-600">You won’t receive more win-back emails from this business. Booking updates related to a service you request may still be sent.</p></> : <><h1 className="mt-7 text-2xl font-bold">Manage email preferences</h1><p className="mt-3 text-sm leading-6 text-slate-600">Unsubscribe from occasional win-back emails sent by the business. This does not affect messages about bookings you make.</p>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading || !token} onClick={unsubscribe} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Updating…' : 'Unsubscribe from win-back emails'}</button></>}</section></main>
}
