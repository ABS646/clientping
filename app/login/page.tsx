'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Check if they are already logged in when they visit the page
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        setCheckingSession(false)
      }
    }
    checkUser()
  }, [router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        router.push('/dashboard')
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setMessage('Account created! Please check your email to confirm your address.')
        setLoading(false)
        setMode('login')
      }
    }
  }

  // Show a loading state while we check if they are already logged in
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
              ? 'Log in to manage your clients'
              : 'Start tracking who owes you in 30 seconds'}
          </p>

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

            {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}
            {message && <p className="text-green-600 text-sm bg-green-50 p-2 rounded">{message}</p>}

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