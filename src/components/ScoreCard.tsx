import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import type { PageSpeedReport } from '../types/pagespeed'

const getScoreColor = (score: number): string => {
  if (score >= 90) {
    return '#4d7c0f'
  }

  if (score >= 70) {
    return '#b45309'
  }

  return '#b91c1c'
}

const getHost = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

interface ScoreCardProps {
  report: PageSpeedReport
}

const getScoreLabel = (score: number): string => {
  if (score >= 90) {
    return 'Elite'
  }

  if (score >= 70) {
    return 'Improving'
  }

  return 'Needs work'
}

const getScoreBadge = (score: number): string => {
  if (score >= 90) {
    return 'bg-lime-100 text-lime-800 border-lime-300/80'
  }

  if (score >= 70) {
    return 'bg-amber-100 text-amber-800 border-amber-300/80'
  }

  return 'bg-rose-100 text-rose-700 border-rose-300/80'
}

export const ScoreCard = ({ report }: ScoreCardProps) => {
  const averageColor = getScoreColor(report.averageScore)
  const scoreLabel = getScoreLabel(report.averageScore)
  const chartData = report.categories.map((item) => ({
    ...item,
    fill: getScoreColor(item.score),
  }))

  return (
    <article className="surface section-fade fade-delay-2 p-5 md:p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Lighthouse snapshot
          </p>
          <h2 className="mt-1 text-[clamp(1.35rem,2.8vw,2rem)] font-semibold text-stone-900">
            {getHost(report.url)}
          </h2>
          <p className="text-sm text-stone-500">
            Lighthouse {report.strategy === 'mobile' ? 'Mobile' : 'Desktop'}
          </p>

          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${getScoreBadge(
              report.averageScore,
            )}`}
          >
            {scoreLabel}
          </span>
        </div>

        <div className="relative h-28 w-28 rounded-2xl bg-stone-900/4 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={[{ value: report.averageScore, fill: averageColor }]}
              innerRadius="72%"
              outerRadius="100%"
              barSize={11}
              startAngle={210}
              endAngle={-30}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" background cornerRadius={12} />
            </RadialBarChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <span className="text-2xl font-bold" style={{ color: averageColor }}>
              {report.averageScore}
            </span>
            <span className="text-xs uppercase tracking-[0.1em] text-stone-500">Avg</span>
          </div>
        </div>
      </header>

      <div className="h-52 rounded-2xl border border-stone-300/65 bg-white/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 25, left: 0, bottom: 4 }}
            barSize={14}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={112}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#44403c', fontSize: 14 }}
            />
            <Bar dataKey="score" radius={[99, 99, 99, 99]}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="score"
                position="right"
                fill="#44403c"
                fontSize={15}
                formatter={(value) => String(value ?? '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
