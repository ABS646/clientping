'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import dynamic from 'next/dynamic'

// Dynamically import the Paystack button (this fixes the "window is not defined" error)
const PaystackButton = dynamic(() => import('./PaystackButton'), { ssr: false })

type Client = {
  id: string
  name: string
  email: string
  waiting_for: string
  amount: number | null
  currency: string
  due_date: string | null
  status: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Core states
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  // Profile/Plan states
  const [plan, setPlan] = useState('free')
  const [userEmail, setUserEmail] = useState('')

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [waitingFor, setWaitingFor] = useState('payment')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Load user data and clients on component mount
  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // 1. Check the user's plan
    await checkPlan(user.id)

    // 2. Fetch their clients
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      
    setClients(data || [])
    setLoading(false)
  }

  // Check user plan from profiles table
  async function checkPlan(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('plan, email')
      .eq('id', userId)
      .single()
    
    if (data) {
      setPlan(data.plan)
      setUserEmail(data.email)
    }
  }

  // Add a new client
  async function addClient(e: React.FormEvent) {
    e.preventDefault()

    // Enforce free tier limit
    if (plan === 'free' && clients.length >= 3) {
      alert('You have reached the 3-client limit on the Free plan. Please upgrade to Pro for unlimited clients.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name,
        email,
        waiting_for: waitingFor,
        amount: amount ? parseFloat(amount) : null,
        currency: 'USD',
        due_date: dueDate || null,
      })
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    // Create the initial reminder schedule
    const nextSend = new Date()
    nextSend.setDate(nextSend.getDate() + 3) // First reminder in 3 days

    await supabase.from('reminders').insert({
      client_id: client.id,
      next_send_at: nextSend.toISOString(),
      interval_days: 3,
    })

    // Reset form and reload list
    setName('')
    setEmail('')
    setWaitingFor('payment')
    setAmount('')
    setDueDate('')
    setShowForm(false)
    load()
  }

  // Mark a client as done
  async function markDone(id: string) {
    await supabase.from('clients').update({ status: 'done' }).eq('id', id)
    await supabase.from('reminders').update({ active: false }).eq('client_id', id)
    load()
  }

  // Delete a client
  async function deleteClient(id: string) {
    if (!confirm('Delete this client?')) return
    await supabase.from('clients').delete().eq('id', id)
    load()
  }

  // Log out
  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Handle successful payment
  const onSuccess = () => {
    alert('Payment successful! You are now on the Pro plan.')
    window.location.reload() // Reload to refresh the plan status
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
      {/* Header with Upgrade Button */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">ClientPing</h1>
          <div className="flex items-center gap-4">
            {plan === 'free' && (
              <PaystackButton email={userEmail} onSuccess={onSuccess} />
            )}
            {plan === 'paid' && (
              <span className="text-sm text-green-600 font-medium">Pro Plan</span>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-black"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your clients</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            {showForm ? 'Cancel' : '+ Add client'}
          </button>
        </div>

        {/* Add Client Form */}
        {showForm && (
          <form
            onSubmit={addClient}
            className="bg-white rounded-2xl p-6 mb-6 space-y-4 shadow-sm"
          >
            <input
              placeholder="Client name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-black text-gray-900 bg-white placeholder:text-gray-400"
            />
            <input
              type="email"
              placeholder="Client email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-black text-gray-900 bg-white placeholder:text-gray-400"
            />
            <select
              value={waitingFor}
              onChange={(e) => setWaitingFor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-black text-gray-900 bg-white"
            >
              <option value="payment">Waiting for payment</option>
              <option value="reply">Waiting for reply</option>
              <option value="approval">Waiting for approval</option>
              <option value="file">Waiting for file</option>
            </select>
            <input
              type="number"
              placeholder="Amount (optional)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-black text-gray-900 bg-white placeholder:text-gray-400"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-black text-gray-900 bg-white placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="w-full bg-black text-white rounded-lg py-3 font-medium hover:bg-gray-800"
            >
              Add client
            </button>
          </form>
        )}

        {/* Clients List */}
        {clients.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No clients yet. Add one to start.
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((c) => (
              <div
                key={c.id}
                className={`bg-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  c.status === 'done' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-lg">{c.name}</div>
                  <div className="text-sm text-gray-600">{c.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Waiting for: {c.waiting_for}
                    {c.amount ? ` - $${c.amount}` : ''}
                    {c.due_date ? ` - due ${c.due_date}` : ''}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {c.status !== 'done' && (
                    <button
                      onClick={() => markDone(c.id)}
                      className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
                    >
                      Done
                    </button>
                  )}
                  <button
                    onClick={() => deleteClient(c.id)}
                    className="text-xs px-3 py-1 rounded-lg border text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}