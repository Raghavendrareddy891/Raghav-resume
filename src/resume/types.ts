export type PersonalInfo = {
  name: string
  title: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
  portfolio: string
  website: string
  stackOverflow: string
  medium: string
  kaggle: string
  customLinks: { id: string; label: string; url: string }[]
}

export type Experience = {
  id: string
  role: string
  company: string
  location: string
  employmentType: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
  technologies: string[]
}

export type Education = { id: string; degree: string; school: string; location: string; year: string }
export type Skill = { id: string; name: string; category: string; proficiency?: number }
export type ResumeItem = { id: string; title: string; subtitle?: string; location?: string; startDate?: string; endDate?: string; url?: string; description?: string; bullets?: string[]; technologies?: string[] }
export type CustomSection = { id: string; title: string; items: ResumeItem[] }

export type Resume = {
  personal: PersonalInfo
  summary: string
  experience: Experience[]
  education: Education[]
  skills: Skill[]
  projects: ResumeItem[]
  certifications: ResumeItem[]
  achievements: ResumeItem[]
  awards: ResumeItem[]
  publications: ResumeItem[]
  languages: ResumeItem[]
  interests: ResumeItem[]
  volunteering: ResumeItem[]
  courses: ResumeItem[]
  internships: ResumeItem[]
  references: ResumeItem[]
  conferences: ResumeItem[]
  patents: ResumeItem[]
  organizations: ResumeItem[]
  customSections: CustomSection[]
}

export type ResumeSettings = {
  templateId: string
  primaryColor: string
  accentColor: string
  textColor: string
  headingColor: string
  backgroundColor: string
  fontFamily: string
  fontSize: number
  headingSize: number
  lineHeight: number
  letterSpacing: number
  pageMargin: number
  sectionSpacing: number
  paragraphSpacing: number
  columnWidth: number
  headerSpacing: number
  sidebarWidth: number
  lineSpacing: number
  skillStyle: 'plain' | 'tags' | 'dots' | 'bars'
}

export type ResumeDocument = {
  id: string
  title: string
  updatedAt: string
  resume: Resume
  settings: ResumeSettings
  sectionOrder: string[]
  hiddenSections: string[]
  sectionTitles: Record<string, string>
  pageBreakBefore: string[]
}

export type ResumeFileV1 = { version: 1; resume: Resume; settings: ResumeSettings; title?: string }
