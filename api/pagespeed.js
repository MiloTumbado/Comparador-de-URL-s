const GOOGLE_PAGESPEED_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const DEFAULT_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const VALID_STRATEGIES = new Set(['mobile', 'desktop'])

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
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Metodo no permitido.' })
  }

  const apiKey = process.env.PAGESPEED_API_KEY?.trim()
  if (!apiKey) {
    console.error('PAGESPEED_API_KEY is not configured in server environment.')
    return sendJson(res, 503, {
      error: 'El servicio de analisis no esta configurado correctamente.',
    })
  }

  const targetUrlParam = getFirstQueryValue(req.query?.url)
  const strategyParam = getFirstQueryValue(req.query?.strategy) ?? 'mobile'

  if (!targetUrlParam || typeof targetUrlParam !== 'string') {
    return sendJson(res, 400, { error: 'Debes enviar una URL valida.' })
  }

  if (typeof strategyParam !== 'string' || !VALID_STRATEGIES.has(strategyParam)) {
    return sendJson(res, 400, {
      error: 'La estrategia debe ser mobile o desktop.',
    })
  }

  let normalizedTargetUrl = ''

  try {
    normalizedTargetUrl = normalizeUrl(targetUrlParam)
  } catch {
    return sendJson(res, 400, { error: 'La URL enviada no es valida.' })
  }

  if (!normalizedTargetUrl) {
    return sendJson(res, 400, { error: 'Debes enviar una URL valida.' })
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
      console.error('Google PageSpeed API error:', {
        status: response.status,
        payload,
      })

      return sendJson(res, 502, {
        error: 'No se pudo obtener el reporte de PageSpeed. Intenta nuevamente.',
      })
    }

    return sendJson(res, 200, payload)
  } catch (error) {
    console.error('Unexpected PageSpeed proxy failure:', error)
    return sendJson(res, 502, {
      error: 'No se pudo conectar con PageSpeed en este momento.',
    })
  }
}
