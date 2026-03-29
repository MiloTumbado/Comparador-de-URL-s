import clsx from 'clsx'

import type { AnalysisMode, Strategy } from '../types/pagespeed'

interface UrlInputProps {
  urlA: string
  urlB: string
  mode: AnalysisMode
  strategy: Strategy
  disabled?: boolean
  onModeChange: (mode: AnalysisMode) => void
  onUrlAChange: (value: string) => void
  onUrlBChange: (value: string) => void
  onStrategyChange: (strategy: Strategy) => void
  onAnalyze: () => void
}

const strategies: Strategy[] = ['mobile', 'desktop']

const modes: Array<{ value: AnalysisMode; label: string }> = [
  { value: 'single', label: 'Normal' },
  { value: 'compare', label: 'Comparar' },
]

export const UrlInput = ({
  urlA,
  urlB,
  mode,
  strategy,
  disabled,
  onModeChange,
  onUrlAChange,
  onUrlBChange,
  onStrategyChange,
  onAnalyze,
}: UrlInputProps) => {
  return (
    <form
      className="surface section-fade fade-delay-1 grid gap-6 p-5 md:p-7"
      onSubmit={(event) => {
        event.preventDefault()
        onAnalyze()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full border border-stone-300/80 bg-white/75 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onModeChange(item.value)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition duration-300',
                mode === item.value
                  ? 'bg-gradient-to-r from-stone-900 to-stone-700 text-white shadow-[0_10px_24px_-18px_rgba(28,25,20,0.8)]'
                  : 'text-stone-600 hover:text-stone-900',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-stone-500">
          {mode === 'single'
            ? 'Analiza una URL'
            : 'Compara URL A vs URL B'}
        </p>
      </div>

      <div className={clsx('grid gap-4', mode === 'compare' && 'md:grid-cols-2')}>
        <label className="group grid gap-2 rounded-2xl border border-stone-300/75 bg-gradient-to-br from-white/95 to-stone-100/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] transition duration-300 focus-within:-translate-y-0.5 focus-within:border-teal-700/35 focus-within:shadow-[0_18px_28px_-24px_rgba(15,118,110,0.8)]">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 group-focus-within:text-teal-900/80">
            {mode === 'single' ? 'URL' : 'URL A'}
          </span>
          <input
            type="text"
            value={urlA}
            onChange={(event) => onUrlAChange(event.target.value)}
            placeholder="https://bluecaddy.us"
            className="w-full bg-transparent text-lg font-bold text-stone-800 outline-none placeholder:text-stone-400"
          />
        </label>

        {mode === 'compare' && (
          <label className="group grid gap-2 rounded-2xl border border-stone-300/75 bg-gradient-to-br from-white/95 to-stone-100/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] transition duration-300 focus-within:-translate-y-0.5 focus-within:border-amber-700/35 focus-within:shadow-[0_18px_28px_-24px_rgba(180,83,9,0.8)]">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 group-focus-within:text-amber-900/80">
              URL B
            </span>
            <input
              type="text"
              value={urlB}
              onChange={(event) => onUrlBChange(event.target.value)}
              placeholder="https://competitor-site.com"
              className="w-full bg-transparent text-lg font-bold text-stone-800 outline-none placeholder:text-stone-400"
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full border border-stone-300/80 bg-white/75 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          {strategies.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onStrategyChange(item)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition duration-300',
                strategy === item
                  ? 'bg-gradient-to-r from-lime-200 to-emerald-200 text-emerald-900 shadow-[0_10px_24px_-18px_rgba(77,124,15,0.75)]'
                  : 'text-stone-600 hover:text-stone-900',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={disabled}
          className={clsx(
            'rounded-full px-6 py-2 text-sm font-bold uppercase tracking-[0.08em] transition duration-300',
            disabled
              ? 'cursor-not-allowed bg-stone-300 text-stone-500'
              : 'bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white shadow-[0_22px_34px_-26px_rgba(15,118,110,0.95)] hover:-translate-y-0.5 hover:shadow-[0_24px_36px_-24px_rgba(15,118,110,0.9)]',
          )}
        >
          {disabled
            ? 'Analizando...'
            : mode === 'single'
              ? 'Analizar pagina'
              : 'Comparar paginas'}
        </button>
      </div>
    </form>
  )
}
