import type { Resume } from './types'

export function scoreResume(resume: Resume) {
  const checks = [
    Boolean(resume.personal.name && resume.personal.email),
    Boolean(resume.summary.trim()),
    resume.experience.length > 0,
    resume.education.length > 0,
    resume.skills.length > 0,
    Boolean(resume.personal.linkedin || resume.personal.portfolio || resume.personal.github),
    resume.projects.length > 0,
    resume.experience.some((item) => item.bullets.some(Boolean)),
  ]
  return { score: Math.round(checks.filter(Boolean).length / checks.length * 100), checks }
}
