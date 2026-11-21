'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

const industries = ['Salons & beauty', 'Clinics & dentists', 'Restaurants', 'Tailors', 'Photographers', 'Tutors & classes', 'Gyms & trainers', 'Home renovation']

const features = [
  {
    number: '01',
    title: 'Appointment reminders',
    description: 'Send an automatic email reminder within your business’s configured reminder window (24 hours by default). SMS and a second 2-hour reminder are not currently available.',
  },
  {
    number: '02',
    title: 'Collect booking deposits',
    description: 'Request a deposit through Paystack when customers book online. Set clear deposit and cancellation terms for your business; no-show forfeiture is not automatic.',
  },
  {
    number: '03',
    title: 'Bring past customers back',
    description: 'Send one opt-in win-back email after your configured inactivity window (30 days by default). Discount codes are not currently sent automatically.',
  },
]

const faqs = [
  [
    'How do the automatic reminders work?',
    'When a booking is confirmed, NoShowFix sends one automatic email reminder within your business’s configured reminder window (24 hours by default). SMS and a separate 2-hour reminder are not currently available.',
  ],
  [
    'How do deposits work?',
    'You can set a deposit amount for a service. When a customer books online, they pay through Paystack and the funds are routed to your connected settlement account. Your deposit, cancellation and no-show terms should be clear to customers; NoShowFix does not automatically forfeit a deposit when someone misses an appointment.',
  ],
  [
    'How does the win-back feature work?',
    'NoShowFix can send one rebooking email after your configured inactivity window, currently only to customers who opted in to marketing updates. It does not automatically include a discount offer.',
  ],
  [
    'Do customers need an account?',
    'No. Customers can use your public booking page without creating a NoShowFix account.',
  ],
]

export default function Home() {
  const [slotValue, setSlotValue] = useState('8000')
  const [missedBookings, setMissedBookings] = useState('14')
  const estimatedLoss = useMemo(() => Math.max(0, Number(slotValue) || 0) * Math.max(0, Number(missedBookings) || 0), [slotValue, missedBookings])
  const formattedLoss = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(estimatedLoss)

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f7f2] text-slate-950">
      <div className="border-b border-blue-950/10 bg-blue-950 px-4 py-2 text-center text-xs font-medium tracking-wide text-blue-50">For service businesses tired of losing time to no-shows and fake orders</div>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="NoShowFix home" className="text-xl font-black tracking-tight">No<span className="text-blue-600">ShowFix</span></Link>
        <nav className="flex items-center gap-5 text-sm font-semibold"><a className="hidden text-slate-600 hover:text-slate-950 sm:block" href="#how-it-works">How it works</a><a className="hidden text-slate-600 hover:text-slate-950 sm:block" href="#features">Features</a><a className="hidden text-slate-600 hover:text-slate-950 sm:block" href="#pricing">Pricing</a><Link href="/login" className="text-slate-600 hover:text-slate-950">Log in</Link><Link href="/login" className="rounded-xl bg-slate-950 px-4 py-2.5 text-white hover:bg-blue-800">Get started</Link></nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-900/10 bg-white px-3.5 py-2 text-xs font-bold text-blue-900"><span className="h-2 w-2 rounded-full bg-blue-500" />Built for Salons, Clinics, Tailors &amp; Restaurants</p>
          <h1 className="mt-6 max-w-2xl text-5xl font-bold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[4.35rem]">Your clients book. If they don&apos;t show up, you still get paid.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">NoShowFix helps service businesses collect booking deposits and send automatic email reminders, so your chairs and tables are less likely to sit empty.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/login" className="rounded-xl bg-blue-700 px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-800">Build my booking page <span aria-hidden="true">→</span></Link><a href="#how-it-works" className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-center text-sm font-bold text-slate-800 hover:border-slate-500">See how it works</a></div>
          <p className="mt-4 text-xs text-slate-500">Simple booking link. No customer account required.</p>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -right-10 -top-12 h-52 w-52 rounded-full bg-sky-200/70 blur-3xl" />
          <div className="absolute -bottom-8 -left-10 h-48 w-48 rounded-full bg-blue-200/70 blur-3xl" />
          <div className="relative rotate-1 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-xs font-semibold text-slate-500">TODAY · YOUR BUSINESS</p><p className="mt-1 text-lg font-bold">Bookings at a glance</p></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-800">LIVE VIEW</span></div>
            <div className="mt-5 grid grid-cols-3 gap-3"><MiniStat label="Today" value="08" tone="blue"/><MiniStat label="Deposits" value="₦24k" tone="dark"/><MiniStat label="At risk" value="02" tone="amber"/></div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-[#f7f7f2] p-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-bold text-blue-800">10:30</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">Wash &amp; style · Ada</p><p className="mt-1 text-xs text-slate-500">Deposit paid · email reminder scheduled</p></div><span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-800">Confirmed</span></div>
              <div className="flex items-center gap-3 rounded-2xl bg-[#f7f7f2] p-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-sm font-bold text-amber-900">12:00</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">Braids · Zainab</p><p className="mt-1 text-xs text-slate-500">Deposit due · booking request</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">Action</span></div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-blue-950 p-4 text-white"><div><p className="text-xs text-blue-200">A customer has been away</p><p className="mt-1 text-sm font-bold">An opt-in win-back email is ready</p></div><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">↗</span></div>
            <p className="mt-3 text-center text-[10px] text-slate-400">Illustrative product preview</p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">The cost of an empty slot</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">See what missed bookings could mean for your business. This is an illustration using your own numbers—not an industry average.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-[120px_120px_1fr] sm:items-end"><label className="text-xs font-semibold text-slate-600">Value per slot<input inputMode="numeric" value={slotValue} onChange={(e) => setSlotValue(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-950" /></label><label className="text-xs font-semibold text-slate-600">Missed slots / month<input inputMode="numeric" value={missedBookings} onChange={(e) => setMissedBookings(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-950" /></label><div className="col-span-2 rounded-xl bg-amber-100 px-4 py-3 sm:col-span-1"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Potential revenue left on the table</p><p className="mt-0.5 text-xl font-black text-amber-950">{formattedLoss}</p></div></div></div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">How it works</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A clearer path from booking to showing up.</h2><p className="mt-4 leading-7 text-slate-600">Set up your booking page, collect deposits where you need them, and stay in touch with customers.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3"><Step number="01" title="Set up your services" description="Add your business details, services, prices and deposit amounts to create a public booking page."/><Step number="02" title="Clients book online" description="Share your booking link. Customers choose a service and can pay the requested deposit through Paystack."/><Step number="03" title="Send an email reminder" description="Confirmed bookings can receive one automatic email reminder within your configured reminder window."/></div></section>

      <section id="features" className="bg-blue-950 py-20 text-white sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Built for local service businesses</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Protect your time. Keep customers in the loop.</h2><p className="mt-4 leading-7 text-blue-100/70">Practical tools for appointments, customer deposits and repeat visits—with clear expectations about what is automated today.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{features.map((feature) => <article key={feature.number} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6"><p className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400/15 text-xs font-black text-blue-200">{feature.number}</p><h3 className="mt-5 text-lg font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-blue-100/75">{feature.description}</p></article>)}</div></div></section>

      <section id="businesses" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24"><div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Same leak. Different business.</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Built for the people whose time gets booked.</h2><p className="mt-4 max-w-lg leading-7 text-slate-600">From a clinic chair to a Friday dinner table, one missed booking can waste more than the time it takes to send a reminder.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{industries.map((item,index) => <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800"><span className="mb-3 block text-xs font-bold text-blue-700">0{index+1}</span>{item}</div>)}</div></div><div className="mt-14 grid gap-6 border-t border-slate-200 pt-8 md:grid-cols-3"><div><p className="font-bold">For appointments</p><p className="mt-2 text-sm leading-6 text-slate-600">Use deposits and email reminders to help protect time on your calendar.</p></div><div><p className="font-bold">For made-to-order work</p><p className="mt-2 text-sm leading-6 text-slate-600">Ask for a deposit before starting a custom order or arranging a site visit.</p></div><div><p className="font-bold">For repeat customers</p><p className="mt-2 text-sm leading-6 text-slate-600">Send an opt-in email when a past customer has been away.</p></div></div></section>

      <section id="pricing" className="border-y border-slate-200 bg-white px-5 py-20 sm:px-8 sm:py-24"><div className="mx-auto max-w-4xl"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Pricing</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Simple pricing for busy businesses.</h2></div><div className="mx-auto mt-9 max-w-xl rounded-[2rem] border border-slate-200 bg-[#f7f7f2] p-7 text-center shadow-sm sm:p-10"><p className="text-sm font-semibold text-slate-600">NoShowFix</p><p className="mt-3 text-4xl font-black tracking-tight">₦10,000 <span className="text-xl font-semibold text-slate-500">/ $25</span></p><p className="mt-4 text-sm leading-6 text-slate-600">(That&apos;s less than the cost of ONE no-show. If we save you two no-shows a month, the app pays for itself.)</p><Link href="/login" className="mt-7 inline-flex rounded-xl bg-blue-700 px-6 py-4 text-sm font-bold text-white hover:bg-blue-800">Get started</Link></div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24"><div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-800">Questions, answered</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Keep it clear for you and your customers.</h2></div><div className="space-y-3">{faqs.map(([question,answer]) => <details key={question} className="group rounded-2xl border border-slate-200 bg-white p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">{question}<span className="text-xl text-blue-700 transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{answer}</p></details>)}</div></div></section>

      <section className="px-5 pb-20 sm:px-8"><div className="mx-auto max-w-7xl rounded-[2rem] bg-blue-100 px-6 py-12 text-center sm:px-12 sm:py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-900">Put your time back on the calendar</p><h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Get fewer ghosts. More good customers.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-blue-950/70">Set up your business, list a service and share your booking page.</p><Link href="/login" className="mt-7 inline-flex rounded-xl bg-slate-950 px-6 py-4 text-sm font-bold text-white hover:bg-blue-800">Start with NoShowFix <span aria-hidden="true" className="ml-2">→</span></Link></div></section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© {new Date().getFullYear()} NoShowFix. Less chasing. More confirmed work.</span><div className="flex gap-5"><a href="mailto:tryclientping@gmail.com" className="hover:text-slate-950">Contact</a><Link href="/login" className="hover:text-slate-950">Log in</Link></div></div></footer>
    </main>
  )
}

function MiniStat({ label, value, tone }:{label:string;value:string;tone:'blue'|'dark'|'amber'}) {
  const styles = { blue: 'bg-blue-50 text-blue-950', dark: 'bg-slate-950 text-white', amber: 'bg-amber-100 text-amber-950' }
  return <div className={`rounded-xl p-3 ${styles[tone]}`}><p className="text-[10px] font-semibold opacity-70">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>
}

function Step({ number, title, description }:{number:string;title:string;description:string}) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-6"><p className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-xs font-black text-blue-900">{number}</p><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>
}
