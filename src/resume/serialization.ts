import { createInitialDocument } from './initialResume'
import type { Resume, ResumeDocument, ResumeSettings, Skill } from './types'

export type ImportedResume = Pick<ResumeDocument, 'title' | 'resume' | 'settings' | 'sectionOrder' | 'hiddenSections' | 'sectionTitles'>

export function serializeResume(document: ResumeDocument): string {
  return JSON.stringify({ version: 1, title: document.title, resume: document.resume, settings: document.settings, sectionOrder: document.sectionOrder, hiddenSections: document.hiddenSections, sectionTitles: document.sectionTitles }, null, 2)
}

export function migrateResumeFile(value: unknown, fallbackTitle: string): ImportedResume {
  if (typeof value !== 'object' || value === null) throw new Error('This file is not a valid resume JSON.')
  const file = value as Record<string, unknown>
  const version = Number(file.version ?? 1)
  if (!Number.isInteger(version) || version < 1 || version > 1) throw new Error(`Unsupported resume file version: ${String(file.version)}.`)
  if (typeof file.resume !== 'object' || file.resume === null || Array.isArray(file.resume)) throw new Error('This file does not contain resume data.')

  const base = createInitialDocument()
  const emptyResume: Resume = {
    ...base.resume,
    personal: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', website: '', stackOverflow: '', medium: '', kaggle: '', customLinks: [] },
    summary: '', experience: [], education: [], skills: [], projects: [], certifications: [], achievements: [], awards: [], publications: [], languages: [], interests: [], volunteering: [], courses: [], internships: [], references: [], conferences: [], patents: [], organizations: [], customSections: [],
  }
  const rawResume = file.resume as Partial<Resume>
  const rawSkills = (rawResume as { skills?: unknown }).skills
  const skills: Skill[] = Array.isArray(rawSkills) ? rawSkills.map((skill, index) => {
    if (typeof skill === 'string') return { id: `imported-skill-${index}`, name: skill, category: 'Tools' }
    const record = skill as Skill
    return { ...record, id: record.id || `imported-skill-${index}`, name: record.name ?? '', category: record.category ?? 'Tools' }
  }) : emptyResume.skills
  const rawExperience = Array.isArray(rawResume.experience) ? rawResume.experience : emptyResume.experience
  const experience = rawExperience.map((entry, index) => ({
    ...entry, id: entry.id || `imported-experience-${index}`,
    employmentType: entry.employmentType ?? '', bullets: Array.isArray(entry.bullets) ? entry.bullets : [], technologies: Array.isArray(entry.technologies) ? entry.technologies : [],
  }))
  const rawPersonal = (rawResume as { personal?: Partial<Resume['personal']> }).personal
  const importedResume: Resume = {
    ...emptyResume, ...rawResume, personal: { ...emptyResume.personal, ...rawPersonal, customLinks: rawPersonal?.customLinks ?? [] },
    skills, experience,
    education: Array.isArray(rawResume.education) ? rawResume.education : emptyResume.education,
    projects: Array.isArray(rawResume.projects) ? rawResume.projects : [], certifications: Array.isArray(rawResume.certifications) ? rawResume.certifications : [],
    achievements: Array.isArray(rawResume.achievements) ? rawResume.achievements : [], awards: Array.isArray(rawResume.awards) ? rawResume.awards : [],
    publications: Array.isArray(rawResume.publications) ? rawResume.publications : [], languages: Array.isArray(rawResume.languages) ? rawResume.languages : [],
    interests: Array.isArray(rawResume.interests) ? rawResume.interests : [], volunteering: Array.isArray(rawResume.volunteering) ? rawResume.volunteering : [],
    courses: Array.isArray(rawResume.courses) ? rawResume.courses : [], internships: Array.isArray(rawResume.internships) ? rawResume.internships : [],
    references: Array.isArray(rawResume.references) ? rawResume.references : [], conferences: Array.isArray(rawResume.conferences) ? rawResume.conferences : [],
    patents: Array.isArray(rawResume.patents) ? rawResume.patents : [], organizations: Array.isArray(rawResume.organizations) ? rawResume.organizations : [], customSections: Array.isArray(rawResume.customSections) ? rawResume.customSections : [],
  }
  return {
    title: typeof file.title === 'string' ? file.title : fallbackTitle,
    resume: importedResume,
    settings: { ...base.settings, ...(typeof file.settings === 'object' && file.settings !== null ? file.settings as Partial<ResumeSettings> : {}) },
    sectionOrder: Array.isArray(file.sectionOrder) ? file.sectionOrder.filter((section): section is string => typeof section === 'string') : base.sectionOrder,
    hiddenSections: Array.isArray(file.hiddenSections) ? file.hiddenSections.filter((section): section is string => typeof section === 'string') : [],
    sectionTitles: typeof file.sectionTitles === 'object' && file.sectionTitles !== null ? file.sectionTitles as Record<string, string> : {},
  }
}
