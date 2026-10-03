import { describe, expect, it } from 'vitest'
import { createInitialDocument } from './initialResume'
import { scoreResume } from './analysis'
import { migrateResumeFile, serializeResume } from './serialization'
import { templates } from '../templates/registry'

describe('Phase 2 resume features', () => {
  it('registers all 15 templates with unique ids', () => {
    expect(templates).toHaveLength(15)
    expect(new Set(templates.map((template) => template.id)).size).toBe(15)
  })

  it('scores useful resume fields as a completion checklist', () => {
    const document = createInitialDocument()
    expect(scoreResume(document.resume).score).toBe(88)
    document.resume.projects.push({ id: 'project-1', title: 'An example project' })
    expect(scoreResume(document.resume).score).toBe(100)
  })

  it('exports versioned JSON and imports it without losing settings or sections', () => {
    const document = createInitialDocument()
    document.settings.templateId = 'ats-classic'
    document.sectionTitles.projects = 'Selected work'
    const imported = migrateResumeFile(JSON.parse(serializeResume(document)), 'Imported')
    expect(imported.settings.templateId).toBe('ats-classic')
    expect(imported.sectionTitles.projects).toBe('Selected work')
    expect(imported.resume.personal.name).toBe(document.resume.personal.name)
  })

  it('migrates legacy string skills and fills new fields with defaults', () => {
    const imported = migrateResumeFile({ version: 1, title: 'Old file', resume: { personal: { name: 'Jordan Lee' }, skills: ['Linux'], experience: [{ role: 'Engineer', company: 'Acme', bullets: ['Built tools'] }] } }, 'fallback')
    expect(imported.title).toBe('Old file')
    expect(imported.resume.skills).toEqual([{ id: 'imported-skill-0', name: 'Linux', category: 'Tools' }])
    expect(imported.resume.experience[0].employmentType).toBe('')
    expect(imported.resume.personal.email).toBe('')
  })

  it('rejects malformed and unsupported resume files', () => {
    expect(() => migrateResumeFile(null, 'resume')).toThrow('valid resume JSON')
    expect(() => migrateResumeFile({ version: 3, resume: {} }, 'resume')).toThrow('Unsupported resume file version')
  })
})
