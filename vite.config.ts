import type { ServerResponse } from 'node:http'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const GOOGLE_PAGESPEED_ENDPOINT =
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const DEFAULT_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const VALID_STRATEGIES = new Set(['mobile', 'desktop'])

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown): void => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

const normalizeUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return ''
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  return new URL(withProtocol).toString()
}

const createPageSpeedDevProxyPlugin = (apiKey: string): Plugin => ({
  name: 'pagespeed-dev-proxy',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/api/pagespeed', async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Metodo no permitido.' })
        return
      }

      if (!apiKey) {
        sendJson(res, 503, {
          error: 'El servicio de analisis no esta configurado correctamente.',
        })
        return
      }

      const requestUrl = new URL(req.url ?? '', 'http://localhost')
      const targetUrl = requestUrl.searchParams.get('url')?.trim() ?? ''
      const strategy = requestUrl.searchParams.get('strategy') ?? 'mobile'

      if (!targetUrl) {
        sendJson(res, 400, { error: 'Debes enviar una URL valida.' })
        return
      }

      if (!VALID_STRATEGIES.has(strategy)) {
        sendJson(res, 400, { error: 'La estrategia debe ser mobile o desktop.' })
        return
      }

      let normalizedTargetUrl = ''

      try {
        normalizedTargetUrl = normalizeUrl(targetUrl)
      } catch {
        sendJson(res, 400, { error: 'La URL enviada no es valida.' })
        return
      }

      if (!normalizedTargetUrl) {
        sendJson(res, 400, { error: 'Debes enviar una URL valida.' })
        return
      }

      const requestedCategories = requestUrl.searchParams
        .getAll('category')
        .filter((category) => DEFAULT_CATEGORIES.includes(category))

      const categories =
        requestedCategories.length > 0 ? requestedCategories : DEFAULT_CATEGORIES

      const queryParams = new URLSearchParams({
        url: normalizedTargetUrl,
        strategy,
        key: apiKey,
      })

      categories.forEach((category) => {
        queryParams.append('category', category)
      })

      const endpoint = `${GOOGLE_PAGESPEED_ENDPOINT}?${queryParams.toString()}`

      try {
        const response = await fetch(endpoint)
        const payload = (await response.json()) as {
          error?: {
            message?: string
          }
        }

        if (!response.ok) {
          const upstreamErrorMessage =
            typeof payload?.error?.message === 'string' && payload.error.message.trim().length > 0
              ? payload.error.message
              : null

          sendJson(res, 502, {
            error: upstreamErrorMessage ?? 'Could not retrieve the PageSpeed report. Please try again.',
          })
          return
        }

        sendJson(res, 200, payload)
      } catch {
        sendJson(res, 502, {
          error: 'Could not connect to PageSpeed right now.',
        })
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.PAGESPEED_API_KEY?.trim() ?? ''

  return {
    plugins: [react(), tailwindcss(), createPageSpeedDevProxyPlugin(apiKey)],
  }
})
