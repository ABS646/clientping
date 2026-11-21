import { NextResponse } from 'next/server'
import countryToCurrency from 'country-to-currency'

export const dynamic = 'force-dynamic'

const countryCurrencies = countryToCurrency as Record<string, string>
const DEFAULT_COUNTRY = 'NG'
const BASE_CURRENCY = 'NGN'
const RATE_URL = 'https://open.er-api.com/v6/latest/NGN'

type RateResponse = {
  result?: string
  time_last_update_utc?: string
  rates?: Record<string, number>
}

function localeFromAcceptLanguage(header: string | null) {
  if (!header) return 'en'
  const firstLanguage = header.split(',')[0]?.split(';')[0]?.trim()
  if (!firstLanguage) return 'en'
  try {
    return new Intl.Locale(firstLanguage).toString()
  } catch {
    return 'en'
  }
}

function regionFromAcceptLanguage(header: string | null) {
  if (!header) return null
  const firstLanguage = header.split(',')[0]?.split(';')[0]?.trim()
  if (!firstLanguage) return null
  try {
    return new Intl.Locale(firstLanguage).region?.toUpperCase() || null
  } catch {
    return null
  }
}

function response(body: object) {
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export async function GET(request: Request) {
  const acceptLanguage = request.headers.get('accept-language')
  const locale = localeFromAcceptLanguage(acceptLanguage)
  const detectedCountry = request.headers.get('x-vercel-ip-country')?.toUpperCase()
    || regionFromAcceptLanguage(acceptLanguage)
    || DEFAULT_COUNTRY
  const targetCurrency = countryCurrencies[detectedCountry] || BASE_CURRENCY

  if (targetCurrency === BASE_CURRENCY) {
    return response({ country: detectedCountry, currency: BASE_CURRENCY, rate: 1, updatedAt: null, rateSource: null, locale })
  }

  try {
    const rateResponse = await fetch(RATE_URL, { next: { revalidate: 86_400 } })
    if (!rateResponse.ok) throw new Error(`Rate provider returned ${rateResponse.status}`)
    const data = await rateResponse.json() as RateResponse
    const rate = data.result === 'success' ? data.rates?.[targetCurrency] : undefined
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      return response({ country: detectedCountry, currency: BASE_CURRENCY, rate: 1, updatedAt: null, rateSource: null, locale })
    }
    return response({ country: detectedCountry, currency: targetCurrency, rate, updatedAt: data.time_last_update_utc || null, rateSource: 'ExchangeRate-API', locale })
  } catch (error) {
    console.error('Local pricing rate lookup failed:', error)
    return response({ country: detectedCountry, currency: BASE_CURRENCY, rate: 1, updatedAt: null, rateSource: null, locale })
  }
}
