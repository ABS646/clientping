import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="font-bold text-lg">ClientPing</div>
        <Link href="/login" className="text-sm font-medium hover:underline">
          Log in
        </Link>
      </nav>

      <section className="max-w-3xl mx-auto px-6 pt-16 pb-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight">
          Stop chasing clients.
          <br />
          Get paid faster.
        </h1>
        <p className="mt-6 text-lg text-gray-600">
          ClientPing automatically follows up with your clients until they pay,
          reply, or approve. No more awkward emails.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/login"
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800"
          >
            Get started free
          </Link>
        </div>
        <p className="mt-3 text-sm text-gray-400">
          Free for 3 clients. upgrade for ₦3,500/month.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          {
            t: 'Auto reminders',
            d: 'Set it once. We nudge your client every few days until they respond.',
          },
          {
            t: 'Track who owes you',
            d: 'See at a glance who is overdue, who replied, and who is ignoring you.',
          },
          {
            t: 'Polite, professional',
            d: 'Templates that sound human, not desperate. You approve, we send.',
          },
        ].map((f) => (
          <div key={f.t} className="border rounded-2xl p-6">
            <h3 className="font-semibold mb-2">{f.t}</h3>
            <p className="text-sm text-gray-500">{f.d}</p>
          </div>
        ))}
      </section>
    </main>
  )
}