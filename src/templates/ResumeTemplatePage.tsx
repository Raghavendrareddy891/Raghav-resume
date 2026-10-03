import type { CSSProperties } from 'react'
import type { ResumeDocument, ResumeItem } from '../resume/types'
import type { ResumeTemplateProps } from './registry'

const labels: Record<string, string> = {
  summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills', projects: 'Projects', certifications: 'Certifications', achievements: 'Achievements', awards: 'Awards', publications: 'Publications', languages: 'Languages', interests: 'Interests', volunteering: 'Volunteer Experience', courses: 'Courses', internships: 'Internships', references: 'References', conferences: 'Conferences', patents: 'Patents', organizations: 'Organizations',
}

function itemFields(document: ResumeDocument, sectionId: string): ResumeItem[] {
  const { resume } = document
  const custom = resume.customSections.find((section) => section.id === sectionId)
  if (custom) return custom.items
  if (sectionId === 'experience') return resume.experience.map((item) => ({ id: item.id, title: item.role, subtitle: item.company, location: item.location, startDate: item.startDate, endDate: item.current ? 'Present' : item.endDate, bullets: [...item.bullets, ...(item.technologies.length ? [`Technologies: ${item.technologies.join(', ')}`] : [])] }))
  if (sectionId === 'education') return resume.education.map((item) => ({ id: item.id, title: item.degree, subtitle: item.school, location: item.location, endDate: item.year }))
  if (sectionId === 'skills') return [{ id: 'skills', title: resume.skills.map((skill) => skill.name).join(' · ') }]
  return (resume[sectionId as keyof typeof resume] as ResumeItem[] | undefined) ?? []
}

function visibleOrder(document: ResumeDocument) {
  const order = document.sectionOrder.length ? document.sectionOrder : Object.keys(labels)
  return order.filter((id) => !document.hiddenSections.includes(id))
}

function Section({ document, id }: { document: ResumeDocument; id: string }) {
  const { resume } = document
  if (id === 'summary') {
    if (!resume.summary.trim()) return null
    return <section className="resume-block" key={id} style={document.pageBreakBefore.includes(id) ? { breakBefore: 'page', pageBreakBefore: 'always' } : undefined}><h3>{document.sectionTitles[id] ?? labels[id]}</h3><p>{resume.summary}</p></section>
  }
  if (id === 'skills') {
    if (!resume.skills.length) return null
    const style = document.settings.templateId === 'ats-classic' ? 'plain' : document.settings.skillStyle
    return (
      <section className={`resume-block resume-block-skills skills-${style}`} key={id} style={document.pageBreakBefore.includes(id) ? { breakBefore: 'page', pageBreakBefore: 'always' } : undefined}>
        <h3>{document.sectionTitles.skills ?? labels.skills}</h3>
        {style === 'plain' ? <p>{resume.skills.map((skill) => skill.name).join(' · ')}</p> : (
          <div className="skill-display">{resume.skills.map((skill) => (
            <span key={skill.id} className="preview-skill">
              <b>{skill.name}</b>
              {style === 'dots' && <i>{[1, 2, 3, 4, 5].map((dot) => <em key={dot} className={dot <= (skill.proficiency ?? 3) ? 'filled' : ''} />)}</i>}
              {style === 'bars' && <i><em style={{ width: `${((skill.proficiency ?? 3) / 5) * 100}%` }} /></i>}
            </span>
          ))}</div>
        )}
      </section>
    )
  }
  const items = itemFields(document, id).filter((item) => item.title || item.subtitle || item.description || item.bullets?.length)
  if (!items.length) return null
  const title = document.sectionTitles[id] ?? labels[id] ?? resume.customSections.find((section) => section.id === id)?.title ?? id
  return <section className={`resume-block resume-block-${id}`} key={id} style={document.pageBreakBefore.includes(id) ? { breakBefore: 'page', pageBreakBefore: 'always' } : undefined}><h3>{title}</h3>{items.map((item) => <article className="resume-item" key={item.id}>
    <div className="resume-item-heading"><strong>{item.title}</strong><span>{[item.startDate, item.endDate].filter(Boolean).join(' – ')}</span></div>
    {item.subtitle && <div className="resume-item-subheading">{item.subtitle}{item.location ? ` · ${item.location}` : ''}</div>}
    {item.description && <p>{item.description}</p>}{item.bullets && item.bullets.filter(Boolean).length > 0 && <ul>{item.bullets.filter(Boolean).map((line, index) => <li key={index}>{line}</li>)}</ul>}
    {item.technologies?.length ? <p className="resume-technologies">{item.technologies.join(' · ')}</p> : null}
  </article>)}</section>
}

export function ResumeTemplatePage({ document, compact = false }: ResumeTemplateProps) {
  const { resume, settings } = document
  const primary = resume.personal
  const templateId = settings.templateId
  const templateClasses: Record<string, string> = { 'ats-classic': 'tpl-ats', 'clean-professional': 'tpl-clean', 'modern-sidebar': 'tpl-sidebar', 'minimal-modern': 'tpl-minimal', 'software-engineer': 'tpl-software', 'devops-engineer': 'tpl-devops', 'tech-professional': 'tpl-tech', 'portfolio-style': 'tpl-portfolio' }
  const templateClass = templateClasses[templateId] ?? `tpl-${templateId}`
  const links = [primary.email, primary.phone, primary.location, primary.linkedin, primary.github, primary.portfolio, primary.website, primary.stackOverflow, primary.medium, primary.kaggle, ...primary.customLinks.map((link) => link.url)].filter(Boolean)
  const ordered = visibleOrder(document)
  const sectionsWithCustom = [...ordered, ...resume.customSections.map((section) => section.id).filter((id) => !ordered.includes(id) && !document.hiddenSections.includes(id))]
  return <article className={`resume-paper ${templateClass}${compact ? ' compact' : ''}`} style={{
    '--resume-primary': settings.primaryColor, '--resume-accent': settings.accentColor, '--resume-text': settings.textColor, '--resume-heading': settings.headingColor, '--resume-bg': settings.backgroundColor,
    '--resume-font': settings.fontFamily, '--resume-font-size': `${settings.fontSize}px`, '--resume-heading-size': `${settings.headingSize}px`, '--resume-line-height': settings.lineHeight,
    '--resume-letter-spacing': `${settings.letterSpacing}px`, '--resume-margin': `${settings.pageMargin}px`, '--resume-section-gap': `${settings.sectionSpacing}px`, '--resume-paragraph-gap': `${settings.paragraphSpacing}px`, '--resume-sidebar-width': `${settings.sidebarWidth}%`, '--resume-column-width': `${settings.columnWidth}%`, '--resume-header-spacing': `${settings.headerSpacing}px`,
  } as CSSProperties}>
    <header className="resume-head">
      <div><h2>{primary.name || 'Your Name'}</h2><p className="resume-title">{primary.title || 'Professional Title'}</p></div>
      <div className="resume-contact">{links.map((link, index) => <span key={`${link}-${index}`}>{link}</span>)}</div>
    </header>
    {templateId === 'modern-sidebar' || templateId === 'software-engineer' || templateId === 'portfolio-style' ? <div className="resume-columns">
      <aside className="resume-aside"><Section document={document} id="skills" />{['education', 'certifications', 'languages'].map((id) => <Section key={id} document={document} id={id} />)}</aside>
      <div className="resume-main">{sectionsWithCustom.filter((id) => !['skills', 'education', 'certifications', 'languages'].includes(id)).map((id) => <Section key={id} document={document} id={id} />)}</div>
    </div> : sectionsWithCustom.map((id) => <Section key={id} document={document} id={id} />)}
  </article>
}
