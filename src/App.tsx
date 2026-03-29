import { useState } from 'react'

import { MetricsTable } from './components/MetricsTable'
import { ScoreCard } from './components/ScoreCard'
import { SingleReportDetails } from './components/SingleReportDetails'
import { Summary } from './components/Summary'
import { UrlInput } from './components/UrlInput'
import { usePageSpeed } from './hooks/usePageSpeed'
import type { AnalysisMode, Strategy } from './types/pagespeed'

const DEFAULTS: { urlA: string; urlB: string; strategy: Strategy } = {
  urlA: 'bluecaddy.us',
  urlB: 'competitor-site.com',
  strategy: 'mobile',
}

function App() {
  const [mode, setMode] = useState<AnalysisMode>('single')
  const [urlA, setUrlA] = useState(DEFAULTS.urlA)
  const [urlB, setUrlB] = useState(DEFAULTS.urlB)
  const [strategy, setStrategy] = useState<Strategy>(DEFAULTS.strategy)

  const {
    comparisonResult,
    singleResult,
    isLoading,
    error,
    analyzeSingle,
    analyzePair,
    clear,
  } = usePageSpeed()

  const handleModeChange = (nextMode: AnalysisMode) => {
    setMode(nextMode)
    clear()
  }

  const handleAnalyze = () => {
    if (mode === 'single') {
      void analyzeSingle(urlA, strategy)
      return
    }

    void analyzePair(urlA, urlB, strategy)
  }

  const hasResult = mode === 'single' ? Boolean(singleResult) : Boolean(comparisonResult)
  const showEmpty = !hasResult && !isLoading && !error

  const pageTitle =
    mode === 'single'
      ? 'Auditoria premium para una sola URL'
      : 'Benchmark visual entre dos sitios web'

  const pageDescription =
    mode === 'single'
      ? 'Mide performance real, accesibilidad, SEO y oportunidades tecnicas desde una consola limpia y elegante.'
      : 'Compara URL A vs URL B en mobile o desktop y detecta al instante quien domina en metricas criticas.'

  return (
    <main className="relative min-h-screen overflow-x-hidden px-4 pb-14 pt-8 md:px-8 md:pt-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="ambient-orb ambient-orb-a" />
        <div className="ambient-orb ambient-orb-b" />
        <div className="ambient-orb ambient-orb-c" />
      </div>

      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="surface section-fade px-6 py-7 md:px-9 md:py-10">
          <div className="relative grid gap-7 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="premium-badge">PageSpeed Studio</span>
                <span className="premium-badge premium-badge-accent">Google PSI API</span>
                <span className="premium-badge">Frontend Only</span>
              </div>

              <h1 className="text-balance text-[clamp(2.05rem,4.4vw,4.1rem)] font-semibold leading-[0.95] text-stone-900">
                {pageTitle}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-600 md:text-base">
                {pageDescription}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-stone-300/70 bg-white/70 px-4 py-3 shadow-[0_12px_24px_-22px_rgba(26,21,16,0.8)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Coverage
                </p>
                <p className="mt-1 text-2xl font-extrabold text-stone-900">4 categorias</p>
                <p className="text-xs text-stone-500">Performance, A11y, Best Practices, SEO</p>
              </article>

              <article className="rounded-2xl border border-teal-700/20 bg-teal-700/10 px-4 py-3 shadow-[0_12px_24px_-22px_rgba(15,118,110,0.65)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-900/75">
                  Modes
                </p>
                <p className="mt-1 text-2xl font-extrabold text-teal-900">Normal + Compare</p>
                <p className="text-xs text-teal-900/70">Single audit and A/B benchmark</p>
              </article>
            </div>
          </div>
        </header>

        <UrlInput
          urlA={urlA}
          urlB={urlB}
          mode={mode}
          strategy={strategy}
          disabled={isLoading}
          onModeChange={handleModeChange}
          onUrlAChange={setUrlA}
          onUrlBChange={setUrlB}
          onStrategyChange={setStrategy}
          onAnalyze={handleAnalyze}
        />

        {error && (
          <section className="surface section-fade fade-delay-2 border-rose-300/80 bg-rose-50/90 px-5 py-4 text-sm text-rose-700">
            {error}
          </section>
        )}

        {isLoading && (
          <section className="surface section-fade fade-delay-2 px-5 py-5 text-sm font-medium text-stone-600">
            <p>Consultando PageSpeed Insights. Esto puede tardar unos segundos...</p>
            <div className="mt-4 grid gap-2">
              <div className="skeleton-line h-3 w-full" />
              <div className="skeleton-line h-3 w-11/12" />
              <div className="skeleton-line h-3 w-4/5" />
            </div>
          </section>
        )}

        {mode === 'compare' && comparisonResult && (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <ScoreCard report={comparisonResult.left} />
              <ScoreCard report={comparisonResult.right} />
            </section>

            <MetricsTable left={comparisonResult.left} right={comparisonResult.right} />
            <Summary left={comparisonResult.left} right={comparisonResult.right} />
          </>
        )}

        {mode === 'single' && singleResult && (
          <>
            <section className="grid gap-4">
              <ScoreCard report={singleResult} />
            </section>

            <SingleReportDetails report={singleResult} />
          </>
        )}

        {showEmpty && (
          <section className="surface section-fade fade-delay-3 px-6 py-10 text-center text-stone-600">
            {mode === 'single'
              ? 'Ingresa una URL y pulsa Analizar pagina para iniciar el analisis.'
              : 'Ingresa URL A y URL B, luego pulsa Comparar paginas para iniciar el analisis.'}
          </section>
        )}
      </div>
    </main>
  )
}

export default App
