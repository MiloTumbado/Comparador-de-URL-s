import clsx from 'clsx'

import type { CoreWebVitals, PageSpeedReport } from '../types/pagespeed'

interface MetricsTableProps {
  left: PageSpeedReport
  right: PageSpeedReport
}

type MetricKey = keyof CoreWebVitals

interface MetricConfig {
  key: MetricKey
  label: string
  good: number
  warning: number
  formatter: (value: number | null) => string
}

const METRICS: MetricConfig[] = [
  {
    key: 'fcp',
    label: 'First Contentful Paint',
    good: 1800,
    warning: 3000,
    formatter: (value) => formatMs(value),
  },
  {
    key: 'lcp',
    label: 'Largest Contentful Paint',
    good: 2500,
    warning: 4000,
    formatter: (value) => formatMs(value),
  },
  {
    key: 'tbt',
    label: 'Total Blocking Time',
    good: 200,
    warning: 600,
    formatter: (value) => formatMs(value, true),
  },
  {
    key: 'cls',
    label: 'Cumulative Layout Shift',
    good: 0.1,
    warning: 0.25,
    formatter: (value) => formatCls(value),
  },
]

const getHost = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const formatMs = (value: number | null, keepMs = false): string => {
  if (value === null) {
    return '-'
  }

  if (keepMs || value < 1000) {
    return `${Math.round(value)}ms`
  }

  return `${(value / 1000).toFixed(1)}s`
}

const formatCls = (value: number | null): string => {
  if (value === null) {
    return '-'
  }

  return value.toFixed(2)
}

const getGrade = (value: number | null, config: MetricConfig): 'A' | 'B' | 'C' | '-' => {
  if (value === null) {
    return '-'
  }

  if (value <= config.good) {
    return 'A'
  }

  if (value <= config.warning) {
    return 'B'
  }

  return 'C'
}

const pickWinner = (
  leftValue: number | null,
  rightValue: number | null,
): 'left' | 'right' | 'tie' | 'none' => {
  if (leftValue === null && rightValue === null) {
    return 'none'
  }

  if (leftValue === null) {
    return 'right'
  }

  if (rightValue === null) {
    return 'left'
  }

  if (leftValue === rightValue) {
    return 'tie'
  }

  return leftValue < rightValue ? 'left' : 'right'
}

export const MetricsTable = ({ left, right }: MetricsTableProps) => {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="surface section-fade fade-delay-3 p-5 md:p-6">
        <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-stone-700">
          Core Web Vitals
        </h3>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-300/70 bg-white/70">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-xs uppercase tracking-[0.08em] text-stone-500">
                <th className="px-2 py-2 text-left">Metric</th>
                <th className="px-2 py-2 text-right">{getHost(left.url)}</th>
                <th className="px-2 py-2 text-right">{getHost(right.url)}</th>
                <th className="px-2 py-2 text-right">Winner</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => {
                const leftValue = left.vitals[metric.key]
                const rightValue = right.vitals[metric.key]
                const leftGrade = getGrade(leftValue, metric)
                const rightGrade = getGrade(rightValue, metric)
                const winner = pickWinner(leftValue, rightValue)

                return (
                  <tr key={metric.key} className="border-b border-stone-200/80 text-stone-700 even:bg-stone-100/35">
                    <td className="px-2 py-3 font-medium">{metric.label}</td>
                    <td
                      className={clsx(
                        'px-2 py-3 text-right font-semibold',
                        winner === 'left' && 'text-lime-700',
                        winner === 'right' && 'text-rose-600',
                      )}
                    >
                      {metric.formatter(leftValue)}
                      <span className="ml-2 rounded-md border border-stone-300 bg-stone-200 px-2 py-0.5 text-xs text-stone-700">
                        {leftGrade}
                      </span>
                    </td>
                    <td
                      className={clsx(
                        'px-2 py-3 text-right font-semibold',
                        winner === 'right' && 'text-lime-700',
                        winner === 'left' && 'text-rose-600',
                      )}
                    >
                      {metric.formatter(rightValue)}
                      <span className="ml-2 rounded-md border border-stone-300 bg-stone-200 px-2 py-0.5 text-xs text-stone-700">
                        {rightGrade}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right text-xs uppercase tracking-[0.08em] text-stone-500">
                      {winner === 'none' && '-'}
                      {winner === 'tie' && 'Tie'}
                      {winner === 'left' && getHost(left.url)}
                      {winner === 'right' && getHost(right.url)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="surface section-fade fade-delay-4 p-5 md:p-6">
        <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-stone-700">
          Opportunities
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[left, right].map((report) => (
            <div
              key={report.url}
              className="rounded-2xl border border-stone-300/75 bg-gradient-to-br from-white/90 to-stone-100/70 px-4 py-3 shadow-[0_16px_32px_-30px_rgba(36,31,24,0.75)]"
            >
              <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.08em] text-stone-800">
                {getHost(report.url)}
              </p>

              {report.opportunities.length === 0 ? (
                <p className="text-sm text-lime-700">Sin issues mayores detectados.</p>
              ) : (
                <ul className="grid gap-2 text-sm text-stone-700">
                  {report.opportunities.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3">
                      <span className="leading-tight">{item.title}</span>
                      <span className="whitespace-nowrap font-semibold text-amber-700">
                        +{(item.savingsMs / 1000).toFixed(1)}s
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
