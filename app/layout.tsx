import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DueNudge — Fewer no-shows. More confirmed work.',
  description:
    'DueNudge helps service businesses collect booking deposits, remind customers before appointments, and bring opted-in past customers back.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
  <head>
    <script defer data-site-id="959a82e6-a27e-47fc-a328-494fba7c8105" src="https://lomenanalytics.com/api/public/track.js"></script>
  </head>
  <body className={inter.className}>{children}</body>
</html>
)
}
