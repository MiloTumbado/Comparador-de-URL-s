import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { PageSpeedReport } from '../types/pagespeed'

interface SummaryProps {
  left: PageSpeedReport
  right: PageSpeedReport
}

const getHost = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const getScoreColor = (score: number): string => {
  if (score >= 90) {
    return '#4d7c0f'
  }

  if (score >= 70) {
    return '#b45309'
  }

  return '#b91c1c'
}

const countWins = (left: PageSpeedReport, right: PageSpeedReport) => {
  let leftWins = 0
  let rightWins = 0

  left.categories.forEach((category) => {
    const rightCategory = right.categories.find((item) => item.key === category.key)
    if (!rightCategory) {
      return
    }

    if (category.score > rightCategory.score) {
      leftWins += 1
      return
    }

    if (category.score < rightCategory.score) {
      rightWins += 1
    }
  })

  return { leftWins, rightWins }
}

export const Summary = ({ left, right }: SummaryProps) => {
  const leftHost = getHost(left.url)
  const rightHost = getHost(right.url)
  const { leftWins, rightWins } = countWins(left, right)

  const winner =
    leftWins === rightWins ? 'Technical tie' : leftWins > rightWins ? leftHost : rightHost

  const averageDiff = Math.abs(left.averageScore - right.averageScore)

  const status =
    leftWins === rightWins
      ? 'Tie on Lighthouse metrics'
      : `${winner} wins ${Math.max(leftWins, rightWins)} of 4 metrics`

  const chartData = [
    {
      name: leftHost,
      score: left.averageScore,
      fill: getScoreColor(left.averageScore),
    },
    {
      name: rightHost,
      score: right.averageScore,
      fill: getScoreColor(right.averageScore),
    },
  ]

  return (
    <section className="surface section-fade fade-delay-4 p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-stone-300/75 bg-white/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Overall winner</p>
          <p className="mt-1 text-[clamp(1.4rem,3vw,2.2rem)] font-bold text-stone-900">{winner}</p>
        </div>

        <div className="rounded-2xl border border-lime-700/22 bg-lime-100/45 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Avg score difference</p>
          <p className="mt-1 text-[clamp(1.4rem,3vw,2.2rem)] font-bold text-lime-700">+{averageDiff} pts</p>
        </div>

        <div className="rounded-2xl border border-teal-700/24 bg-teal-700/10 px-4 py-3 md:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Status</p>
          <p className="mt-2 inline-flex rounded-full bg-lime-100 px-3 py-1 text-sm font-semibold text-lime-800">
            {status}
          </p>
        </div>
      </div>

      <div className="mt-5 h-44 rounded-2xl border border-stone-300/75 bg-white/75 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 0, left: -14, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#57534e', fontSize: 13 }} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              width={28}
              tick={{ fill: '#78716c', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              formatter={(value) => [`${value ?? 0} points`, 'Score']}
              contentStyle={{ borderRadius: 12, borderColor: '#d6d3d1', fontSize: 12 }}
            />
            <Bar dataKey="score" radius={[12, 12, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
