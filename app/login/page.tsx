'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'

  useEffect(() => {
    let active = true
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      if (session) router.replace('/dashboard')
      else setCheckingSession(false)
    }
    void checkUser()
    return () => { active = false }
  }, [router, supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        return
      }

      const callbackUrl = `${window.location.origin}/auth/callback?next=/dashboard`
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl },
      })
      if (error) throw error
      if (data.session) {
        router.push('/dashboard')
        return
      }
      setMessage('Account created. Check your inbox (and spam folder) for the confirmation link. It will return you to DueNudge after you confirm.')
      setMode('login')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign-in could not be started.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="font-bold text-2xl tracking-tight">
            Due<span className="text-blue-600">Nudge</span>
          </span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-gray-500 mb-6 text-sm">
            {mode === 'login'
              ? 'Log in to manage your bookings and customers'
              : 'Set up your business booking page'}
          </p>

          {googleAuthEnabled && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white py-3 font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
                <span className="h-px flex-1 bg-gray-200" /><span>or use email</span><span className="h-px flex-1 bg-gray-200" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600 text-gray-900 bg-white placeholder:text-gray-400"
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-600 text-gray-900 bg-white placeholder:text-gray-400"
            />

            {error && <p className="text-red-700 text-sm bg-red-50 p-2 rounded" role="alert">{error}</p>}
            {message && <p className="text-green-700 text-sm bg-green-50 p-2 rounded" role="status">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-lg py-3 font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600 mb-2">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError('')
                setMessage('')
              }}
              className="text-sm font-bold text-blue-600 hover:text-blue-800"
            >
              {mode === 'login' ? 'Go to Sign up' : 'Go to Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
