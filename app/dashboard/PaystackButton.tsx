'use client'

import { usePaystackPayment } from 'react-paystack'

export default function PaystackButton({ 
  email, 
  onSuccess 
}: { 
  email: string, 
  onSuccess: () => void 
}) {
  const config = {
    reference: new Date().getTime().toString(),
    email: email,
    amount: 350000, // 350,000, kobo = ₦3,500 (roughly $9)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  }

  const initializePayment = usePaystackPayment(config)

  return (
    <button
      onClick={() => initializePayment({ onSuccess, onClose: () => console.log('Payment closed') })}
      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700"
    >
      Upgrade to Pro (₦3,500/mo)
    </button>
  )
}