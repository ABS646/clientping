'use client'

import { usePaystackPayment } from 'react-paystack'

export default function PaystackButton({
  email,
  onSuccess,
}: {
  email: string
  onSuccess: () => void
}) {
  // Set this to 'true' once Paystack approves your account and you've
  // swapped in your live keys. Until then, keep it 'false' so users
  // can't accidentally "pay" with test mode.
  const PAYSTACK_LIVE = false

  const config = {
    reference: new Date().getTime().toString(),
    email: email,
    amount: 350000, // ₦3,500 in kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  }

  const initializePayment = usePaystackPayment(config)

  // While Paystack isn't live, show a "coming soon" state
  if (!PAYSTACK_LIVE) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
          Pro (coming soon)
        </span>
        <a
          href="mailto:tryclientping@gmail.com?subject=Notify me when Pro launches"
          className="text-xs text-blue-600 hover:underline"
        >
          Notify me
        </a>
      </div>
    )
  }

  return (
    <button
      onClick={() =>
        initializePayment({
          onSuccess,
          onClose: () => console.log('Payment closed'),
        })
      }
      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700"
    >
      Upgrade to Pro (₦3,500/mo)
    </button>
  )
}