import dns from 'node:dns/promises'
import net from 'node:net'

const GOOGLE_PAGESPEED_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const DEFAULT_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const VALID_STRATEGIES = new Set(['mobile', 'desktop'])
const RATE_LIMIT_MAX_REQUESTS = Number.parseInt(process.env.PAGESPEED_RATE_LIMIT_MAX ?? '30', 10)
const RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.PAGESPEED_RATE_LIMIT_WINDOW_MS ?? '60000', 10)

const RATE_LIMIT_BUCKETS = globalThis.__pagespeedRateLimitBuckets ?? new Map()
if (!globalThis.__pagespeedRateLimitBuckets) {
  globalThis.__pagespeedRateLimitBuckets = RATE_LIMIT_BUCKETS
}

const logServerError = (message) => {
  const prefix = '[pagespeed-proxy]'
  console.error(`${prefix} ${message}`)
}

const normalizeIp = (rawIp) => {
  if (typeof rawIp !== 'string') {
    return ''
  }

  const trimmed = rawIp.trim()
  if (!trimmed) {
    return ''
  }

  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed
}

const isPrivateOrReservedIPv4 = (ipAddress) => {
  const octets = ipAddress.split('.').map((part) => Number.parseInt(part, 10))
  const [first, second] = octets

  if (first === 10) return true
  if (first === 127) return true
  if (first === 0) return true
  if (first === 169 && second === 254) return true
  if (first === 172 && second >= 16 && second <= 31) return true
  if (first === 192 && second === 168) return true
  if (first === 100 && second >= 64 && second <= 127) return true
  if (first === 198 && (second === 18 || second === 19)) return true
  if (first >= 224) return true

  return false
}

const isPrivateOrReservedIPv6 = (ipAddress) => {
  const normalized = ipAddress.toLowerCase()

  if (normalized === '::' || normalized === '::1') {
    return true
  }

  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true
  }

  if (normalized.startsWith('::ffff:')) {
    const mappedIPv4 = normalized.slice(7)
    return net.isIP(mappedIPv4) === 4 && isPrivateOrReservedIPv4(mappedIPv4)
  }

  return false
}

const isPrivateOrReservedIp = (value) => {
  const ipAddress = normalizeIp(value)
  const ipVersion = net.isIP(ipAddress)

  if (ipVersion === 4) {
    return isPrivateOrReservedIPv4(ipAddress)
  }

  if (ipVersion === 6) {
    return isPrivateOrReservedIPv6(ipAddress)
  }

  return false
}

const isForbiddenHostname = (hostname) => {
  const normalized = hostname.toLowerCase()

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local')
  )
}

const assertSafeTargetHostname = async (hostname) => {
  if (isForbiddenHostname(hostname)) {
    throw new Error('FORBIDDEN_HOSTNAME')
  }

  const normalizedHostname = hostname.toLowerCase()
  const literalIpVersion = net.isIP(normalizedHostname)

  if (literalIpVersion > 0) {
    if (isPrivateOrReservedIp(normalizedHostname)) {
      throw new Error('FORBIDDEN_IP_TARGET')
    }
    return
  }

  let lookupResults = []

  try {
    lookupResults = await dns.lookup(normalizedHostname, {
      all: true,
      verbatim: true,
    })
  } catch {
    throw new Error('DNS_LOOKUP_FAILED')
  }

  if (!lookupResults.length) {
    throw new Error('DNS_LOOKUP_FAILED')
  }

  const hasForbiddenResolvedIp = lookupResults.some(({ address }) =>
    isPrivateOrReservedIp(address),
  )

  if (hasForbiddenResolvedIp) {
    throw new Error('FORBIDDEN_RESOLVED_IP')
  }
}

const getClientIp = (req) => {
  const forwardedHeader = req.headers['x-forwarded-for']
  const firstForwardedIp = Array.isArray(forwardedHeader)
    ? forwardedHeader[0]
    : forwardedHeader

  if (typeof firstForwardedIp === 'string' && firstForwardedIp.trim()) {
    return normalizeIp(firstForwardedIp.split(',')[0])
  }

  const realIpHeader = req.headers['x-real-ip']
  if (typeof realIpHeader === 'string' && realIpHeader.trim()) {
    return normalizeIp(realIpHeader)
  }

  return normalizeIp(req.socket?.remoteAddress ?? 'unknown') || 'unknown'
}

const pruneExpiredRateLimitBuckets = (now) => {
  for (const [ip, bucket] of RATE_LIMIT_BUCKETS) {
    if (bucket.resetAt <= now) {
      RATE_LIMIT_BUCKETS.delete(ip)
    }
  }
}

const consumeRateLimit = (ip, now) => {
  let bucket = RATE_LIMIT_BUCKETS.get(ip)

  if (!bucket || bucket.resetAt <= now) {
    bucket = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    }
  }

  bucket.count += 1
  RATE_LIMIT_BUCKETS.set(ip, bucket)

  return {
    limited: bucket.count > RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - bucket.count),
    resetAt: bucket.resetAt,
  }
}

const getFirstQueryValue = (value) => {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

const getCategories = (value) => {
  const requested = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : []

  const validCategories = requested.filter((item) =>
    DEFAULT_CATEGORIES.includes(item),
  )

  if (validCategories.length > 0) {
    return validCategories
  }

  return DEFAULT_CATEGORIES
}

const normalizeUrl = (rawUrl) => {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return ''
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  return new URL(withProtocol).toString()
}

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export default async function handler(req, res) {
  const now = Date.now()
  pruneExpiredRateLimitBuckets(now)

  const clientIp = getClientIp(req)
  const rateLimit = consumeRateLimit(clientIp, now)
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS))
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining))
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)))

  if (rateLimit.limited) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - now) / 1000))
    res.setHeader('Retry-After', String(retryAfterSeconds))

    return sendJson(res, 429, {
      error: 'Too many requests. Please try again in a few seconds.',
    })
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const apiKey = process.env.PAGESPEED_API_KEY?.trim()
  if (!apiKey) {
    logServerError('Missing PAGESPEED_API_KEY in server environment.')
    return sendJson(res, 503, {
      error: 'The analysis service is not configured correctly.',
    })
  }

  const targetUrlParam = getFirstQueryValue(req.query?.url)
  const strategyParam = getFirstQueryValue(req.query?.strategy) ?? 'mobile'

  if (!targetUrlParam || typeof targetUrlParam !== 'string') {
    return sendJson(res, 400, { error: 'You must provide a valid URL.' })
  }

  if (typeof strategyParam !== 'string' || !VALID_STRATEGIES.has(strategyParam)) {
    return sendJson(res, 400, {
      error: 'Strategy must be mobile or desktop.',
    })
  }

  let normalizedTargetUrl = ''

  try {
    normalizedTargetUrl = normalizeUrl(targetUrlParam)
  } catch {
    return sendJson(res, 400, { error: 'The provided URL is not valid.' })
  }

  if (!normalizedTargetUrl) {
    return sendJson(res, 400, { error: 'You must provide a valid URL.' })
  }

  let parsedTargetUrl

  try {
    parsedTargetUrl = new URL(normalizedTargetUrl)
  } catch {
    return sendJson(res, 400, { error: 'The provided URL is not valid.' })
  }

  if (!['http:', 'https:'].includes(parsedTargetUrl.protocol)) {
    return sendJson(res, 400, { error: 'The provided URL is not valid.' })
  }

  try {
    await assertSafeTargetHostname(parsedTargetUrl.hostname)
  } catch {
    return sendJson(res, 400, {
      error: 'The provided URL is not allowed.',
    })
  }

  const queryParams = new URLSearchParams({
    url: normalizedTargetUrl,
    strategy: strategyParam,
    key: apiKey,
  })

  getCategories(req.query?.category).forEach((category) => {
    queryParams.append('category', category)
  })

  const endpoint = `${GOOGLE_PAGESPEED_ENDPOINT}?${queryParams.toString()}`

  try {
    const response = await fetch(endpoint)
    const payload = await response.json()

    if (!response.ok) {
      logServerError('Google PageSpeed API returned non-2xx response.')

      return sendJson(res, 502, {
        error: 'Could not retrieve the PageSpeed report. Please try again.',
      })
    }

    return sendJson(res, 200, payload)
  } catch {
    logServerError('Unexpected failure while requesting Google PageSpeed API.')
    return sendJson(res, 502, {
      error: 'Could not connect to PageSpeed right now.',
    })
  }
}
