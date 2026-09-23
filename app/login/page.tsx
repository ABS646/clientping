'use client'

import { useState } from 'react'
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
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo-icon.png" alt="ClientPing" className="w-10 h-10" />
          <span className="font-bold text-2xl tracking-tight">
            Client<span className="text-blue-600">Ping</span>
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
              placeholder="Email"
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

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-lg py-3 font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Log in'
                  : 'Sign up'}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
            }}
            className="mt-4 text-sm text-gray-500 hover:text-black w-full text-center"
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Log in'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} ClientPing ·{' '}
          <a href="mailto:tryclientping@gmail.com" className="hover:text-gray-600">
            Contact
          </a>
        </p>
      </div>
    </div>
  )
}