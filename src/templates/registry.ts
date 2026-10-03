import type { ComponentType } from 'react'
import type { ResumeDocument } from '../resume/types'
import { ResumeTemplatePage } from './ResumeTemplatePage'

export type TemplateCategory = 'ATS' | 'Professional' | 'Modern' | 'Developer' | 'Creative'
export type ResumeTemplateProps = { document: ResumeDocument; compact?: boolean }
export type TemplateDefinition = { id: string; name: string; category: TemplateCategory; description: string; className: string; component: ComponentType<ResumeTemplateProps> }

const templateData: Omit<TemplateDefinition, 'component'>[] = [
  { id: 'ats-classic', name: 'ATS Classic', category: 'ATS', description: 'Single-column and recruiter-friendly.', className: 'tpl-ats' },
  { id: 'professional', name: 'Professional', category: 'Professional', description: 'Balanced, clear, and versatile.', className: 'tpl-professional' },
  { id: 'corporate', name: 'Corporate', category: 'Professional', description: 'Structured for established teams.', className: 'tpl-corporate' },
  { id: 'executive', name: 'Executive', category: 'Professional', description: 'Confident hierarchy for senior roles.', className: 'tpl-executive' },
  { id: 'clean-professional', name: 'Clean Professional', category: 'Professional', description: 'Quiet typography with generous space.', className: 'tpl-clean' },
  { id: 'modern', name: 'Modern', category: 'Modern', description: 'A crisp contemporary profile.', className: 'tpl-modern' },
  { id: 'modern-sidebar', name: 'Modern Sidebar', category: 'Modern', description: 'Compact sidebar with clear sections.', className: 'tpl-sidebar' },
  { id: 'contemporary', name: 'Contemporary', category: 'Modern', description: 'A bold editorial header and timeline.', className: 'tpl-contemporary' },
  { id: 'elegant', name: 'Elegant', category: 'Modern', description: 'Refined serif details and soft rules.', className: 'tpl-elegant' },
  { id: 'minimal-modern', name: 'Minimal Modern', category: 'Modern', description: 'Essential content, beautifully spare.', className: 'tpl-minimal' },
  { id: 'software-engineer', name: 'Software Engineer', category: 'Developer', description: 'Technical strengths up front.', className: 'tpl-software' },
  { id: 'devops-engineer', name: 'DevOps Engineer', category: 'Developer', description: 'Operational focus and clean metadata.', className: 'tpl-devops' },
  { id: 'tech-professional', name: 'Tech Professional', category: 'Developer', description: 'A modern layout for technical teams.', className: 'tpl-tech' },
  { id: 'creative', name: 'Creative', category: 'Creative', description: 'Expressive color and asymmetric detail.', className: 'tpl-creative' },
  { id: 'portfolio-style', name: 'Portfolio Style', category: 'Creative', description: 'Project-forward with a strong profile.', className: 'tpl-portfolio' },
]

export const templateRegistry: Record<string, TemplateDefinition> = Object.fromEntries(
  templateData.map((template) => [template.id, { ...template, component: ResumeTemplatePage }]),
)
export const templates = Object.values(templateRegistry)
export const getTemplate = (id: string) => templateRegistry[id] ?? templateRegistry.professional
