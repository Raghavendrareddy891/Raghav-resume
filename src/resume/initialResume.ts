import type { Resume, ResumeDocument, ResumeSettings } from './types'

export const defaultSettings: ResumeSettings = {
  templateId: 'professional', primaryColor: '#345f4b', accentColor: '#87a879', textColor: '#303a34', headingColor: '#244832', backgroundColor: '#ffffff',
  fontFamily: 'Arial', fontSize: 10, headingSize: 11, lineHeight: 1.5, letterSpacing: 0, pageMargin: 48, sectionSpacing: 18, paragraphSpacing: 7, columnWidth: 100, headerSpacing: 18, sidebarWidth: 31, lineSpacing: 1.5, skillStyle: 'plain',
}

export const initialResume: Resume = {
  personal: {
    name: 'Alex Morgan', title: 'Product Designer', email: 'alex.morgan@email.com', phone: '+1 (555) 014-2086', location: 'Brooklyn, NY',
    linkedin: 'linkedin.com/in/alexmorgan', github: '', portfolio: 'alexmorgan.design', website: '', stackOverflow: '', medium: '', kaggle: '', customLinks: [],
  },
  summary: 'Product designer with 6+ years of experience turning complex problems into clear, human-centered digital products. I partner closely with research, engineering, and product teams to make useful experiences feel effortless.',
  experience: [
    { id: 'experience-1', role: 'Senior Product Designer', company: 'Northstar Labs', location: 'New York, NY', employmentType: 'Full-time', startDate: '2022', endDate: '', current: true, bullets: ['Led the redesign of a core onboarding journey, improving activation by 28% across web and mobile.', 'Built a shared component library with engineering, reducing design handoff time across three product teams.'], technologies: ['Figma', 'Design systems'] },
    { id: 'experience-2', role: 'Product Designer', company: 'Fieldwork', location: 'New York, NY', employmentType: 'Full-time', startDate: '2019', endDate: '2022', current: false, bullets: ['Shaped early product concepts through customer interviews, prototypes, and iterative usability testing.'], technologies: ['Figma', 'Research'] },
  ],
  education: [{ id: 'education-1', degree: 'BFA, Communication Design', school: 'Parsons School of Design', location: 'New York, NY', year: '2018' }],
  skills: ['Product strategy', 'Interaction design', 'Prototyping', 'Figma', 'Design systems', 'User research'].map((name, index) => ({ id: `skill-${index}`, name, category: index < 3 ? 'Design' : 'Tools' })),
  projects: [], certifications: [], achievements: [], awards: [], publications: [], languages: [], interests: [], volunteering: [], courses: [], internships: [], references: [], conferences: [], patents: [], organizations: [], customSections: [],
}

export const defaultSectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'achievements']

export function createInitialDocument(): ResumeDocument {
  return { id: crypto.randomUUID(), title: 'Product Designer Resume', updatedAt: new Date().toISOString(), resume: structuredClone(initialResume), settings: { ...defaultSettings }, sectionOrder: [...defaultSectionOrder], hiddenSections: [], sectionTitles: {}, pageBreakBefore: [] }
}
