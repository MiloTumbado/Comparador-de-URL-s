import { useCallback, useState } from 'react'

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type ComparisonResult,
  type CoreWebVitals,
  type OpportunityItem,
  type PageSpeedApiResponse,
  type PageSpeedReport,
  type Strategy,
} from '../types/pagespeed'

const API_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

const VITAL_AUDITS: Record<keyof CoreWebVitals, string> = {
  fcp: 'first-contentful-paint',
  lcp: 'largest-contentful-paint',
  tbt: 'total-blocking-time',
  cls: 'cumulative-layout-shift',
}

interface ApiErrorResponse {
  error?: {
    message?: string
  }
}

interface UsePageSpeedState {
  comparisonResult: ComparisonResult | null
  singleResult: PageSpeedReport | null
  isLoading: boolean
  error: string | null
  analyzeSingle: (url: string, strategy: Strategy) => Promise<void>
  analyzePair: (leftUrl: string, rightUrl: string, strategy: Strategy) => Promise<void>
  clear: () => void
}

const scoreToPercent = (score: number | null | undefined): number => {
  if (typeof score !== 'number') {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(score * 100)))
}

const normalizeUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim()

  if (!trimmed) {
    return ''
  }

  const valueWithProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  return new URL(valueWithProtocol).toString()
}

const parseOpportunities = (
  audits: Record<string, { details?: { type?: string; overallSavingsMs?: number }; title?: string; displayValue?: string } | undefined>,
): OpportunityItem[] => {
  const opportunities: OpportunityItem[] = []

  Object.entries(audits).forEach(([id, audit]) => {
    if (!audit || audit.details?.type !== 'opportunity') {
      return
    }

    const savingsMs = audit.details.overallSavingsMs ?? 0
    if (savingsMs <= 0) {
      return
    }

    const item: OpportunityItem = {
      id,
      title: audit.title ?? id,
      savingsMs,
    }

    if (audit.displayValue) {
      item.displayValue = audit.displayValue
    }

    opportunities.push(item)
  })

  opportunities.sort((a, b) => b.savingsMs - a.savingsMs)

  return opportunities.slice(0, 5)
}

const parseReport = (
  requestedUrl: string,
  strategy: Strategy,
  payload: PageSpeedApiResponse,
): PageSpeedReport => {
  if (!payload.lighthouseResult) {
    throw new Error('La respuesta de PageSpeed no incluye resultados de Lighthouse.')
  }

  const { categories, audits } = payload.lighthouseResult

  const categoryScores = CATEGORY_ORDER.map((category) => {
    const lighthouseCategory = categories[category]

    return {
      key: category,
      label: CATEGORY_LABELS[category],
      score: scoreToPercent(lighthouseCategory?.score),
    }
  })

  const averageScore = Math.round(
    categoryScores.reduce((acc, current) => acc + current.score, 0) /
      categoryScores.length,
  )

  const vitals = Object.entries(VITAL_AUDITS).reduce<CoreWebVitals>(
    (acc, [metric, auditId]) => {
      const rawValue = audits[auditId]?.numericValue
      acc[metric as keyof CoreWebVitals] =
        typeof rawValue === 'number' ? rawValue : null
      return acc
    },
    {
      fcp: null,
      lcp: null,
      tbt: null,
      cls: null,
    },
  )

  return {
    url: payload.lighthouseResult.finalDisplayedUrl ?? requestedUrl,
    strategy,
    categories: categoryScores,
    averageScore,
    vitals,
    opportunities: parseOpportunities(audits),
    raw: payload,
  }
}

const fetchReport = async (
  url: string,
  strategy: Strategy,
  apiKey: string,
): Promise<PageSpeedReport> => {
  const params = new URLSearchParams({
    url,
    strategy,
    key: apiKey,
  })

  CATEGORY_ORDER.forEach((category) => {
    params.append('category', category)
  })

  const endpoint = `${API_ENDPOINT}?${params.toString()}`
  const response = await fetch(endpoint)
  const payload = (await response.json()) as PageSpeedApiResponse | ApiErrorResponse

  if (!response.ok) {
    const apiErrorMessage = (payload as ApiErrorResponse).error?.message
    throw new Error(
      apiErrorMessage ??
        `PageSpeed devolvio un error HTTP ${response.status} para ${url}.`,
    )
  }

  return parseReport(url, strategy, payload as PageSpeedApiResponse)
}

export const usePageSpeed = (): UsePageSpeedState => {
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [singleResult, setSingleResult] = useState<PageSpeedReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeSingle = useCallback(async (url: string, strategy: Strategy) => {
    setError(null)

    const apiKey = import.meta.env.VITE_PAGESPEED_API_KEY?.trim()
    if (!apiKey) {
      setComparisonResult(null)
      setSingleResult(null)
      setError('Configura VITE_PAGESPEED_API_KEY en tu archivo .env antes de analizar.')
      return
    }

    let normalizedUrl = ''

    try {
      normalizedUrl = normalizeUrl(url)
    } catch {
      setComparisonResult(null)
      setSingleResult(null)
      setError('La URL no es valida. Usa un dominio o URL completa.')
      return
    }

    if (!normalizedUrl) {
      setComparisonResult(null)
      setSingleResult(null)
      setError('Debes ingresar una URL para iniciar el analisis.')
      return
    }

    setIsLoading(true)

    try {
      const report = await fetchReport(normalizedUrl, strategy, apiKey)
      setSingleResult(report)
      setComparisonResult(null)
    } catch (analysisError) {
      setSingleResult(null)
      setComparisonResult(null)
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'No se pudo completar el analisis de PageSpeed.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const analyzePair = useCallback(
    async (leftUrl: string, rightUrl: string, strategy: Strategy) => {
      setError(null)

      const apiKey = import.meta.env.VITE_PAGESPEED_API_KEY?.trim()
      if (!apiKey) {
        setComparisonResult(null)
        setSingleResult(null)
        setError('Configura VITE_PAGESPEED_API_KEY en tu archivo .env antes de analizar.')
        return
      }

      let normalizedLeft = ''
      let normalizedRight = ''

      try {
        normalizedLeft = normalizeUrl(leftUrl)
        normalizedRight = normalizeUrl(rightUrl)
      } catch {
        setComparisonResult(null)
        setSingleResult(null)
        setError('Una de las URLs no es valida. Usa un dominio o URL completa.')
        return
      }

      if (!normalizedLeft || !normalizedRight) {
        setComparisonResult(null)
        setSingleResult(null)
        setError('Debes ingresar URL A y URL B para iniciar el analisis.')
        return
      }

      setIsLoading(true)

      try {
        const [left, right] = await Promise.all([
          fetchReport(normalizedLeft, strategy, apiKey),
          fetchReport(normalizedRight, strategy, apiKey),
        ])

        setComparisonResult({ left, right })
        setSingleResult(null)
      } catch (analysisError) {
        setComparisonResult(null)
        setSingleResult(null)
        setError(
          analysisError instanceof Error
            ? analysisError.message
            : 'No se pudo completar la comparacion de PageSpeed.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const clear = useCallback(() => {
    setComparisonResult(null)
    setSingleResult(null)
    setError(null)
  }, [])

  return {
    comparisonResult,
    singleResult,
    isLoading,
    error,
    analyzeSingle,
    analyzePair,
    clear,
  }
}
