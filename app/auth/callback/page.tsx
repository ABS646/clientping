'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function completeSignIn() {
      const url = new URL(window.location.href)
      const providerError = url.searchParams.get('error_description') || url.searchParams.get('error')
      if (providerError) {
        if (active) setError(providerError)
        return
      }
      const code = url.searchParams.get('code')
      if (!code) {
        if (active) setError('The confirmation link is missing its sign-in code. Request a new email and try again.')
        return
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (!active) return
      if (exchangeError) {
        setError(exchangeError.message)
        return
      }
      const requestedNext = url.searchParams.get('next') || '/dashboard'
      const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard'
      router.replace(next)
    }
    void completeSignIn()
    return () => { active = false }
  }, [router, supabase])

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">Sign-in link could not be completed</h1>
            <p className="mt-3 break-words text-sm leading-6 text-gray-600">{error}</p>
            <Link href="/login" className="mt-6 inline-flex rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white">Return to login</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">Confirming your sign-in…</h1>
            <p className="mt-3 text-sm text-gray-600">Please wait while we securely finish signing you in.</p>
          </>
        )}
      </section>
    </main>
  )
}
