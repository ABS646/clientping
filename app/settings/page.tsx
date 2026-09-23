'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [plan, setPlan] = useState('free')

  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    setUserId(user.id)
    setEmail(user.email || '')

    const { data } = await supabase
      .from('profiles')
      .select('business_name, logo_url, plan')
      .eq('id', user.id)
      .single()

    if (data) {
      setBusinessName(data.business_name || '')
      setLogoUrl(data.logo_url || '')
      setPlan(data.plan || 'free')
    }

    setLoading(false)
  }

  async function saveBusinessName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({ business_name: businessName })
      .eq('id', userId)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Business name saved!')
    }
    setSaving(false)
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (plan !== 'paid') {
      alert('Logo upload is a Pro feature. Please upgrade to unlock it.')
      return
    }

    setUploading(true)
    setMessage('')

    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}/logo.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setMessage('Upload error: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData.publicUrl + '?t=' + Date.now()

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ logo_url: publicUrl })
      .eq('id', userId)

    if (updateError) {
      setMessage('Save error: ' + updateError.message)
    } else {
      setLogoUrl(publicUrl)
      setMessage('Logo uploaded!')
    }

    setUploading(false)
  }

  async function removeLogo() {
    if (!confirm('Remove your logo?')) return

    const { error } = await supabase
      .from('profiles')
      .update({ logo_url: null })
      .eq('id', userId)

    if (!error) {
      setLogoUrl('')
      setMessage('Logo removed.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold">
            ClientPing
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-black"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Branding</h1>
        <p className="text-gray-600 mb-8">
          Make your invoices look professional. Your business name and logo
          will appear on every invoice your clients see.
        </p>

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 mb-6 text-sm">
            {message}
          </div>
        )}

        {/* Business Name */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-1">Business Name</h2>
          <p className="text-sm text-gray-500 mb-4">
            This appears at the top of every invoice.
          </p>
          <form onSubmit={saveBusinessName} className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="e.g. John's Design Studio"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-black text-gray-900 bg-white placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>

        {/* Logo Upload */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Logo</h2>
              <p className="text-sm text-gray-500">
                PNG, JPG, or SVG. Square images work best.
              </p>
            </div>
            {plan !== 'paid' && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                Pro
              </span>
            )}
          </div>

          {logoUrl ? (
            <div className="flex items-center gap-4 flex-wrap">
              <img
                src={logoUrl}
                alt="Your logo"
                className="w-20 h-20 object-contain rounded-lg border bg-white"
              />
              <div className="flex gap-2">
                <label className="text-sm text-gray-600 hover:text-black border border-gray-300 px-4 py-2 rounded-lg font-medium cursor-pointer">
                  {uploading ? 'Uploading...' : 'Change'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadLogo}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <button
                  onClick={removeLogo}
                  className="text-sm text-red-500 hover:text-red-700 border border-gray-300 px-4 py-2 rounded-lg font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400">
              <div className="text-gray-500 text-sm">
                {uploading ? 'Uploading...' : 'Click to upload a logo'}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={uploadLogo}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}

          {plan !== 'paid' && (
            <div className="mt-4 text-sm text-gray-500">
              Upgrade to Pro to upload your logo.
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">Preview</h2>
          <p className="text-sm text-gray-500 mb-4">
            This is how your branded invoice header will look.
          </p>
          <div className="border rounded-xl p-6 bg-gray-50">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-12 h-12 object-contain rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                  No logo
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-900">
                  {businessName || 'Your Business Name'}
                </div>
                <div className="text-xs text-gray-500">Invoice</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}