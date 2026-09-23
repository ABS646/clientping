import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="ClientPing" className="w-9 h-9" />
          <span className="font-bold text-xl tracking-tight">
            Client<span className="text-blue-600">Ping</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-black">
            Log in
          </Link>
          <Link
            href="/login"
            className="text-sm bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
          Built for freelancers who hate chasing payments
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
          Stop chasing clients.
          <br />
          <span className="text-blue-600">Get paid faster.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          ClientPing automatically follows up with your clients by email until
          they pay, reply, or approve. No more awkward "just checking in"
          messages.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="bg-black text-white px-8 py-4 rounded-lg font-medium hover:bg-gray-800 text-lg"
          >
            Get started free
          </Link>
          <a
            href="#pricing"
            className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-medium hover:border-black text-lg"
          >
            See pricing
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          Free for 3 clients · No credit card needed
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Everything you need to stop chasing payments
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: 'Automatic reminders',
              description:
                'Set it once and forget it. We send polite follow-up emails every few days until your client responds.',
            },
            {
              title: 'Know who owes you',
              description:
                'A live dashboard shows exactly how much money is outstanding across all your clients.',
            },
            {
              title: 'Professional branding',
              description:
                'Add your logo and business name so every reminder looks like it came from a real business.',
            },
          ].map((f) => (
            <div key={f.title} className="border rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">
          Simple pricing
        </h2>
        <p className="text-center text-gray-600 mb-12">
          Start free. Upgrade when you're ready.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="border rounded-2xl p-8">
            <h3 className="text-xl font-bold mb-2">Free</h3>
            <div className="text-4xl font-bold mb-1">₦0</div>
            <p className="text-gray-500 text-sm mb-6">Forever</p>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Track up to 3 clients
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Manual tracking dashboard
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Export paid clients to CSV
              </li>
            </ul>
            <Link
              href="/login"
              className="block text-center border border-gray-300 rounded-lg py-3 font-medium hover:border-black"
            >
              Get started
            </Link>
          </div>

          {/* Pro */}
          <div className="border-2 border-blue-600 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
              Most popular
            </div>
            <h3 className="text-xl font-bold mb-2">Pro</h3>
            <div className="text-4xl font-bold mb-1">₦3,500</div>
            <p className="text-gray-500 text-sm mb-6">per month</p>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Unlimited clients
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Automatic email reminders
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Logo + business name on invoices
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Priority support
              </li>
            </ul>
            <Link
              href="/login"
              className="block text-center bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Common questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: 'How do the automatic reminders work?',
              a: "When you add a client, we schedule a series of polite email reminders. The first is friendly, then a bit firmer, and finally a professional final notice. You don't have to do anything — it just happens.",
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. No contracts. Cancel from your dashboard whenever you want. Your data stays accessible on the free plan.',
            },
            {
              q: 'Do my clients need to sign up?',
              a: 'No. Your clients just receive emails. They never have to create an account.',
            },
            {
              q: 'Is my data secure?',
              a: 'Yes. We use industry-standard encryption and your data is never shared with third parties.',
            },
          ].map((item) => (
            <div key={item.q} className="border rounded-xl p-6">
              <h3 className="font-semibold mb-2">{item.q}</h3>
              <p className="text-gray-600 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-2xl font-bold mb-3">Questions? We're here.</h2>
        <p className="text-gray-600 mb-6">
          Reach out anytime. We reply within 24 hours.
        </p>
        <a
          href="mailto:tryclientping@gmail.com"
          className="inline-block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800"
        >
          tryclienping@gmail.com
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>© {new Date().getFullYear()} ClientPing. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="mailto:tryclientping@gmail.com" className="hover:text-black">
              Contact
            </a>
            <Link href="/login" className="hover:text-black">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}