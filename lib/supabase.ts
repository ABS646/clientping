import { createBrowserClient } from '@supabase/ssr'
import { createClient as createAdminClientBase } from '@supabase/supabase-js'

// Browser client — used in pages/components (login, dashboard)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Admin client — used ONLY in API routes (bypasses security, uses service_role)
export function createAdminClient() {
  return createAdminClientBase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}