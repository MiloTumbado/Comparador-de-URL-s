export type Strategy = 'mobile' | 'desktop'

export type AnalysisMode = 'single' | 'compare'

export type CategoryKey =
  | 'performance'
  | 'accessibility'
  | 'best-practices'
  | 'seo'

export const CATEGORY_ORDER: CategoryKey[] = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
]

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best practices',
  seo: 'SEO',
}

export interface LighthouseCategory {
  id?: string
  title?: string
  score: number | null
}

export interface LighthouseAuditDetails {
  type?: string
  overallSavingsMs?: number
}

export interface LighthouseAudit {
  id?: string
  title?: string
  score?: number | null
  displayValue?: string
  numericValue?: number
  details?: LighthouseAuditDetails
}

export interface LighthouseResult {
  requestedUrl?: string
  finalDisplayedUrl?: string
  categories: Record<string, LighthouseCategory | undefined>
  audits: Record<string, LighthouseAudit | undefined>
}

export interface PageSpeedApiResponse {
  id?: string
  lighthouseResult?: LighthouseResult
}

export interface CategoryScore {
  key: CategoryKey
  label: string
  score: number
}

export interface CoreWebVitals {
  fcp: number | null
  lcp: number | null
  tbt: number | null
  cls: number | null
}

export interface OpportunityItem {
  id: string
  title: string
  savingsMs: number
  displayValue?: string
}

export interface PageSpeedReport {
  url: string
  strategy: Strategy
  categories: CategoryScore[]
  averageScore: number
  vitals: CoreWebVitals
  opportunities: OpportunityItem[]
  raw: PageSpeedApiResponse
}

export interface ComparisonResult {
  left: PageSpeedReport
  right: PageSpeedReport
}
