import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type ChangeEvent, type CSSProperties } from 'react'
import { createInitialDocument, defaultSettings } from './resume/initialResume'
import type { Resume, ResumeDocument, ResumeItem, ResumeSettings } from './resume/types'
import { scoreResume } from './resume/analysis'
import { migrateResumeFile, serializeResume } from './resume/serialization'
import { getTemplate, templates, type TemplateCategory } from './templates/registry'
import { ResumeTemplatePage } from './templates/ResumeTemplatePage'

type View = 'dashboard' | 'editor' | 'templates'
type HistoryState = { past: ResumeDocument[]; future: ResumeDocument[] }
type BulletHelper = { entryId: string; index: number } | null
const STORAGE_KEY = 'resume-studio-documents-v2'
const SECTION_LABELS: Record<string, string> = { summary: 'Professional summary', experience: 'Work experience', education: 'Education', skills: 'Skills', projects: 'Projects', certifications: 'Certifications', achievements: 'Achievements', awards: 'Awards', publications: 'Publications', languages: 'Languages', interests: 'Interests', volunteering: 'Volunteer experience', courses: 'Courses', internships: 'Internships', references: 'References', conferences: 'Conferences', patents: 'Patents', organizations: 'Organizations' }
const SECTION_TYPES: Record<string, keyof Resume> = { projects: 'projects', certifications: 'certifications', achievements: 'achievements', awards: 'awards', publications: 'publications', languages: 'languages', interests: 'interests', volunteering: 'volunteering', courses: 'courses', internships: 'internships', references: 'references', conferences: 'conferences', patents: 'patents', organizations: 'organizations' }
const SECTION_OPTIONS = Object.keys(SECTION_LABELS)
const PALETTES = [
  { name: 'Forest', primary: '#345f4b', accent: '#87a879', heading: '#244832', text: '#303a34' }, { name: 'Ocean', primary: '#315d7a', accent: '#74a8c8', heading: '#20435e', text: '#303943' },
  { name: 'Navy', primary: '#263b5a', accent: '#8498b5', heading: '#1d2d47', text: '#303640' }, { name: 'Burgundy', primary: '#814a52', accent: '#c38d8d', heading: '#633740', text: '#413536' },
  { name: 'Purple', primary: '#69558e', accent: '#ab98c9', heading: '#49366b', text: '#393641' }, { name: 'Black & white', primary: '#383b39', accent: '#929690', heading: '#222523', text: '#333735' },
]

function readDocuments(): ResumeDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [createInitialDocument()]
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ResumeDocument[]
  } catch { /* Invalid local data is ignored and replaced with a fresh document. */ }
  return [createInitialDocument()]
}

function Button({ children, onClick, kind = 'soft', title, disabled = false, type = 'button' }: { children: ReactNode; onClick?: () => void; kind?: 'soft' | 'primary' | 'plain' | 'danger'; title?: string; disabled?: boolean; type?: 'button' | 'submit' }) {
  return <button type={type} className={`button button-${kind}`} onClick={onClick} title={title} disabled={disabled}>{children}</button>
}

function Field({ label, value, onChange, placeholder, type = 'text', wide = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; wide?: boolean }) {
  return <label className={`field${wide ? ' field-wide' : ''}`}><span>{label}</span><input type={type} value={value} placeholder={placeholder ?? label} onChange={(event) => onChange(event.target.value)} /></label>
}

function SectionCard({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="editor-card"><div className="card-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>
}

function App() {
  const [documents, setDocuments] = useState<ResumeDocument[]>(readDocuments)
  const [currentId, setCurrentId] = useState(documents[0]?.id ?? '')
  const [view, setView] = useState<View>('editor')
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor')
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] })
  const [savedText, setSavedText] = useState('Saved just now')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false)
  const [templateCategory, setTemplateCategory] = useState<'All' | TemplateCategory>('All')
  const [templateSearch, setTemplateSearch] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [zoom, setZoom] = useState(85)
  const [fullscreen, setFullscreen] = useState(false)
  const [shortcutHelp, setShortcutHelp] = useState(false)
  const [bulletHelper, setBulletHelper] = useState<BulletHelper>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const document = documents.find((item) => item.id === currentId) ?? documents[0]

  useEffect(() => {
    const timer = window.setTimeout(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(documents)); setSavedText('Saved just now') }, 450)
    return () => window.clearTimeout(timer)
  }, [documents])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey
      if (event.key === 'Escape') { setFullscreen(false); setSettingsOpen(false); setShortcutHelp(false) }
      if (command && event.key.toLowerCase() === 's') { event.preventDefault(); setSavedText('Saved just now') }
      if (command && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo() }
      if (command && event.key.toLowerCase() === 'p') { event.preventDefault(); printResume() }
      if (command && event.key === '/') { event.preventDefault(); setShortcutHelp(true) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const updateCurrent = useCallback((update: (current: ResumeDocument) => ResumeDocument) => {
    const current = documents.find((item) => item.id === currentId)
    if (!current) return
    const next = { ...update(current), updatedAt: new Date().toISOString() }
    setSavedText('Saving…')
    setHistory((state) => ({ past: [...state.past.slice(-49), current], future: [] }))
    setDocuments((items) => items.map((item) => item.id === currentId ? next : item))
  }, [currentId, documents])

  function printResume() {
    if (!document) return
    const originalTitle = window.document.title
    const name = document.resume.personal.name.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Resume'
    window.document.title = `${name}_Resume`
    window.addEventListener('afterprint', () => { window.document.title = originalTitle }, { once: true })
    window.print()
  }

  function undo() {
    const previous = history.past.at(-1)
    if (!previous || !document) return
    setDocuments((items) => items.map((item) => item.id === currentId ? previous : item))
    setHistory((state) => ({ past: state.past.slice(0, -1), future: [document, ...state.future] }))
  }
  function redo() {
    const next = history.future[0]
    if (!next || !document) return
    setDocuments((items) => items.map((item) => item.id === currentId ? next : item))
    setHistory((state) => ({ past: [...state.past, document], future: state.future.slice(1) }))
  }
  function openDocument(id: string) { setCurrentId(id); setHistory({ past: [], future: [] }); setView('editor') }
  function createResume() {
    const created = createInitialDocument()
    created.title = 'Untitled resume'
    created.resume = { ...created.resume, personal: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', website: '', stackOverflow: '', medium: '', kaggle: '', customLinks: [] }, summary: '', experience: [], education: [], skills: [], projects: [], certifications: [], achievements: [], awards: [], publications: [], languages: [], interests: [], volunteering: [], courses: [], internships: [], references: [], conferences: [], patents: [], organizations: [], customSections: [] }
    setDocuments((items) => [...items, created]); setCurrentId(created.id); setHistory({ past: [], future: [] }); setView('editor')
  }
  function duplicateDocument(target: ResumeDocument) {
    const copy = structuredClone(target); copy.id = crypto.randomUUID(); copy.title = `${target.title} copy`; copy.updatedAt = new Date().toISOString()
    setDocuments((items) => [...items, copy]); openDocument(copy.id)
  }
  function deleteDocument(target: ResumeDocument) {
    if (documents.length === 1) { const replacement = createInitialDocument(); setDocuments([replacement]); setCurrentId(replacement.id); return }
    const remaining = documents.filter((item) => item.id !== target.id); setDocuments(remaining); if (target.id === currentId) { setCurrentId(remaining[0].id); setView('dashboard') }
  }
  function updateResume(update: (resume: Resume) => Resume) { updateCurrent((current) => ({ ...current, resume: update(current.resume) })) }
  function updateSetting<K extends keyof ResumeSettings>(key: K, value: ResumeSettings[K]) { updateCurrent((current) => ({ ...current, settings: { ...current.settings, [key]: value } })) }
  function addResumeSection(sectionId: string) {
    if (!document || document.sectionOrder.includes(sectionId)) return
    updateCurrent((current) => ({ ...current, sectionOrder: [...current.sectionOrder, sectionId], hiddenSections: current.hiddenSections.filter((id) => id !== sectionId) }))
  }
  function addCustomSection() {
    const id = `custom-${crypto.randomUUID()}`
    updateCurrent((current) => ({ ...current, sectionOrder: [...current.sectionOrder, id], resume: { ...current.resume, customSections: [...current.resume.customSections, { id, title: 'New section', items: [] }] } }))
  }
  function updateItemSection(sectionId: string, update: (items: ResumeItem[]) => ResumeItem[]) {
    const field = SECTION_TYPES[sectionId]
    if (!field) return
    updateResume((resume) => ({ ...resume, [field]: update(resume[field] as ResumeItem[]) }))
  }
  function addEntry(sectionId: string) {
    updateItemSection(sectionId, (items) => [...items, { id: crypto.randomUUID(), title: '', subtitle: '', description: '', bullets: [], technologies: [] }])
  }
  function updateEntry(sectionId: string, id: string, patch: Partial<ResumeItem>) { updateItemSection(sectionId, (items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)) }
  function removeEntry(sectionId: string, id: string) { updateItemSection(sectionId, (items) => items.filter((item) => item.id !== id)) }
  function addSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const name = newSkill.trim(); if (!name || document.resume.skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) return
    updateResume((resume) => ({ ...resume, skills: [...resume.skills, { id: crypto.randomUUID(), name, category: 'Tools' }] })); setNewSkill('')
  }
  function exportJson(target = document) {
    if (!target) return
    const file = new Blob([serializeResume(target)], { type: 'application/json' })
    download(file, `${safeName(target.title)}.json`)
  }
  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result))
        const migrated = migrateResumeFile(parsed, file.name.replace(/\.json$/i, ''))
        const imported: ResumeDocument = { ...createInitialDocument(), ...migrated, id: crypto.randomUUID(), updatedAt: new Date().toISOString(), pageBreakBefore: [] }
        setDocuments((items) => [...items, imported]); setCurrentId(imported.id); setView('editor'); setHistory({ past: [], future: [] })
      } catch (error) { window.alert(error instanceof Error ? error.message : 'This file could not be imported.') }
    }
    reader.readAsText(file); event.target.value = ''
  }
  function download(file: Blob, filename: string) { const url = URL.createObjectURL(file); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url) }
  function safeName(value: string) { return value.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Resume' }
  function dropSection(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    updateCurrent((current) => { const order = [...current.sectionOrder]; const from = order.indexOf(sourceId); const to = order.indexOf(targetId); if (from < 0 || to < 0) return current; order.splice(from, 1); order.splice(to, 0, sourceId); return { ...current, sectionOrder: order } })
  }

  const selectedTemplate = useMemo(() => getTemplate(document?.settings.templateId ?? 'professional'), [document?.settings.templateId])
  const score = document ? scoreResume(document.resume) : { score: 0, checks: [] }
  const filteredTemplates = templates.filter((template) => (templateCategory === 'All' || template.category === templateCategory) && `${template.name} ${template.category}`.toLowerCase().includes(templateSearch.toLowerCase()))
  const currentBullet = bulletHelper ? document?.resume.experience.find((item) => item.id === bulletHelper.entryId)?.bullets[bulletHelper.index] ?? '' : ''
  const bulletSuggestions = bulletHelper ? [
    { label: 'Make professional', text: currentBullet.replace(/^\s*(worked on|helped with)\s+/i, 'Contributed to ').replace(/\.$/, '') || currentBullet },
    { label: 'Make concise', text: currentBullet.replace(/\b(in order to)\b/gi, 'to').replace(/\s+/g, ' ').trim() },
    { label: 'Achievement-focused', text: `${currentBullet.replace(/\.$/, '')} — add a specific outcome, such as [measurable result].` },
    { label: 'Action-oriented', text: currentBullet.replace(/^\s*(worked on)\s+/i, 'Supported ').replace(/\.$/, '') || currentBullet },
    { label: 'Fix grammar', text: currentBullet.charAt(0).toUpperCase() + currentBullet.slice(1).replace(/\s+/g, ' ').trim() },
  ].map((item) => ({ ...item, entryId: bulletHelper.entryId, index: bulletHelper.index })) : []

  if (!document) return null
  return <div className={`app-shell${fullscreen ? ' fullscreen' : ''}`}>
    <header className="topbar">
      <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setView('dashboard') }}><span className="brand-icon">r<span>.</span></span><span>resume<span className="brand-light">studio</span></span></a>
      <nav className="top-nav" aria-label="Main navigation"><button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>My resumes</button><button className={view === 'editor' ? 'active' : ''} onClick={() => setView('editor')}>Editor</button><button className={view === 'templates' ? 'active' : ''} onClick={() => setView('templates')}>Templates</button></nav>
      <div className="header-right"><span className="save-state"><i />{savedText}</span>{view === 'editor' && <><Button kind="soft" onClick={() => setSettingsOpen(true)}>Customize</Button><Button kind="primary" onClick={printResume}>Export PDF <span>↗</span></Button></>}<button className="help-button" onClick={() => setShortcutHelp(true)} aria-label="Keyboard shortcuts">?</button></div>
    </header>
    <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importJson} />

    {view === 'dashboard' && <main className="dashboard-page">
      <div className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>My resumes</h1><p>Build a version for every next step.</p></div><div className="heading-actions"><Button onClick={() => importRef.current?.click()}>Import JSON</Button><Button kind="primary" onClick={createResume}>＋ Create resume</Button></div></div>
      <section className="completion-panel"><div><span className="eyebrow">CURRENT RESUME COMPLETENESS</span><strong>{score.score}%</strong><p>A checklist of useful sections to help you prepare your resume.</p></div><div className="completion-meter"><div className="completion-ring" style={{ '--progress': `${score.score}%` } as CSSProperties}><span>{score.score}<small>%</small></span></div><div className="completion-hints">{['Contact details', 'Summary', 'Experience', 'Education', 'Skills', 'Profile links', 'Projects', 'Achievements'].map((name, index) => <span key={name} className={score.checks[index] ? 'done' : ''}>{score.checks[index] ? '✓' : '○'} {name}</span>)}</div></div></section>
      <div className="list-heading"><h2>Recent resumes <span>{documents.length}</span></h2><button onClick={() => setView('templates')}>Browse templates <b>↗</b></button></div>
      <div className="resume-list">{documents.map((item) => <article className="resume-list-card" key={item.id}><button className="list-thumb" onClick={() => openDocument(item.id)} aria-label={`Open ${item.title}`}><ResumeTemplatePage document={item} compact /></button><div className="list-card-info"><span className="resume-type">{getTemplate(item.settings.templateId).name}</span><h3>{item.title}</h3><p>{item.resume.personal.name || 'New resume'} · Edited {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.updatedAt))}</p><div className="list-card-actions"><Button kind="plain" onClick={() => openDocument(item.id)}>Open editor ↗</Button><Button kind="plain" onClick={() => duplicateDocument(item)}>Duplicate</Button><Button kind="plain" onClick={() => exportJson(item)}>Export JSON</Button><Button kind="plain" onClick={() => deleteDocument(item)}>Delete</Button></div></div></article>)}</div>
    </main>}

    {view === 'templates' && <main className="gallery-page">
      <div className="page-heading"><div><div className="eyebrow">DESIGNED FOR YOUR NEXT MOVE</div><h1>Choose a template</h1><p>Switch designs any time. Your resume content stays the same.</p></div><Button kind="soft" onClick={() => setView('editor')}>← Back to editor</Button></div>
      <div className="gallery-controls"><div className="filter-pills">{(['All', 'ATS', 'Professional', 'Modern', 'Developer', 'Creative'] as const).map((category) => <button key={category} onClick={() => setTemplateCategory(category)} className={templateCategory === category ? 'selected' : ''}>{category}</button>)}</div><label className="search-box"><span>⌕</span><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search templates" /></label></div>
      <div className="template-grid">{filteredTemplates.map((template) => { const selected = document.settings.templateId === template.id; const previewDoc = { ...document, settings: { ...document.settings, templateId: template.id } }; return <article className={`template-card${selected ? ' current' : ''}`} key={template.id}>
        <button className="template-thumb" aria-label={`Preview ${template.name}`} onClick={() => { updateSetting('templateId', template.id); setView('editor') }}><ResumeTemplatePage document={previewDoc} compact />{selected && <span className="selected-badge">✓ Selected</span>}</button>
        <div className="template-info"><div><div className="template-category">{template.category}</div><h2>{template.name}</h2><p>{template.description}</p></div><div className="template-actions"><Button kind="soft" onClick={() => { updateSetting('templateId', template.id); setView('editor') }}>Preview</Button><Button kind={selected ? 'primary' : 'primary'} onClick={() => { updateSetting('templateId', template.id); setView('editor') }}>{selected ? 'Selected' : 'Use template'}</Button></div></div>
      </article> })}</div>
      {filteredTemplates.length === 0 && <div className="empty-gallery">No templates match “{templateSearch}”. Try another search.</div>}
    </main>}

    {view === 'editor' && <main className="editor-workspace">
      <aside className="editor-nav"><button className="nav-icon active" title="Resume editor" aria-label="Resume editor">▤</button><button className="nav-icon" title="Templates" aria-label="Templates" onClick={() => setView('templates')}>▧</button><button className="nav-icon" title="Section manager" aria-label="Section manager" onClick={() => setSectionManagerOpen((open) => !open)}>☷</button><button className="nav-icon" title="Customize" aria-label="Customize" onClick={() => setSettingsOpen(true)}>◐</button><button className="nav-icon bottom" title="Shortcuts" onClick={() => setShortcutHelp(true)}>?</button></aside>
      <div className="mobile-view-tabs" role="tablist" aria-label="Editor or preview"><button role="tab" aria-selected={mobileTab === 'editor'} className={mobileTab === 'editor' ? 'active' : ''} onClick={() => setMobileTab('editor')}>Editor</button><button role="tab" aria-selected={mobileTab === 'preview'} className={mobileTab === 'preview' ? 'active' : ''} onClick={() => setMobileTab('preview')}>Preview</button></div>
      <section className={`editor-pane${mobileTab === 'preview' ? ' mobile-hidden' : ''}`}>
        <div className="editor-titlebar"><div><span className="eyebrow">EDITING</span><div className="title-input-wrap"><input aria-label="Resume name" value={document.title} onChange={(event) => updateCurrent((current) => ({ ...current, title: event.target.value }))} /><button aria-label="Rename resume">✎</button></div></div><div className="titlebar-actions"><button title="Undo (Ctrl/Cmd+Z)" aria-label="Undo" disabled={!history.past.length} onClick={undo}>↶</button><button title="Redo (Ctrl/Cmd+Shift+Z)" aria-label="Redo" disabled={!history.future.length} onClick={redo}>↷</button><button title="Manage sections" onClick={() => setSectionManagerOpen((open) => !open)}>☷ <span>Sections</span></button></div></div>
        <div className="completion-line"><span>Completeness</span><div><i style={{ width: `${score.score}%` }} /></div><strong>{score.score}%</strong></div>
        <div className="editor-scroll">
          <SectionCard title="Personal information" description="Give employers a way to reach you.">
            <div className="form-grid">{([['Full name', 'name'], ['Job title', 'title'], ['Email', 'email'], ['Phone', 'phone'], ['Location', 'location'], ['LinkedIn', 'linkedin'], ['Portfolio', 'portfolio'], ['GitHub', 'github'], ['Website', 'website'], ['Stack Overflow', 'stackOverflow'], ['Medium', 'medium'], ['Kaggle', 'kaggle']] as const).map(([label, key]) => <Field key={key} label={label} value={document.resume.personal[key]} onChange={(value) => updateResume((resume) => ({ ...resume, personal: { ...resume.personal, [key]: value } }))} placeholder={label} />)}</div>
            {document.resume.personal.customLinks.map((link) => <div className="custom-link-row" key={link.id}><Field label="Link label" value={link.label} onChange={(value) => updateResume((resume) => ({ ...resume, personal: { ...resume.personal, customLinks: resume.personal.customLinks.map((item) => item.id === link.id ? { ...item, label: value } : item) } }))} /><Field label="URL" value={link.url} onChange={(value) => updateResume((resume) => ({ ...resume, personal: { ...resume.personal, customLinks: resume.personal.customLinks.map((item) => item.id === link.id ? { ...item, url: value } : item) } }))} /><Button kind="plain" onClick={() => updateResume((resume) => ({ ...resume, personal: { ...resume.personal, customLinks: resume.personal.customLinks.filter((item) => item.id !== link.id) } }))}>Remove</Button></div>)}
            <Button kind="plain" onClick={() => updateResume((resume) => ({ ...resume, personal: { ...resume.personal, customLinks: [...resume.personal.customLinks, { id: crypto.randomUUID(), label: '', url: '' }] } }))}>＋ Add custom profile link</Button>
          </SectionCard>

          <SectionCard title="Professional summary" description="A concise introduction tailored to the work you want to do.">
            <label className="field"><span>Summary</span><textarea rows={4} value={document.resume.summary} placeholder="Describe your experience, focus, and strengths." onChange={(event) => updateResume((resume) => ({ ...resume, summary: event.target.value }))} /><small>{document.resume.summary.length} characters</small></label>
          </SectionCard>

          <SectionCard title="Work experience" description="Highlight impact and ownership. Drag roles from the grip to reorder." action={<Button kind="plain" onClick={() => updateResume((resume) => ({ ...resume, experience: [...resume.experience, { id: crypto.randomUUID(), role: '', company: '', location: '', employmentType: '', startDate: '', endDate: '', current: false, bullets: [''], technologies: [] }] }))}>＋ Add experience</Button>}>
            {document.resume.experience.length === 0 && <EmptyState text="Add your first position to give your resume some context." />}
            <div className="entry-list">{document.resume.experience.map((item, index) => <article className="entry-editor" key={item.id}><div className="entry-head"><button className="drag-handle" draggable aria-label="Drag to reorder experience" onDragStart={(event) => event.dataTransfer.setData('text/plain', item.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const sourceId = event.dataTransfer.getData('text/plain'); updateResume((resume) => { const items = [...resume.experience]; const from = items.findIndex((entry) => entry.id === sourceId); const to = items.findIndex((entry) => entry.id === item.id); if (from < 0 || to < 0) return resume; const [moved] = items.splice(from, 1); items.splice(to, 0, moved); return { ...resume, experience: items } }) }}>⠿</button><span>POSITION {String(index + 1).padStart(2, '0')}</span><button className="remove-link" onClick={() => updateResume((resume) => ({ ...resume, experience: resume.experience.filter((entry) => entry.id !== item.id) }))}>Remove</button></div>
              <div className="form-grid"><Field label="Job title" value={item.role} onChange={(value) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, role: value } : entry) }))} placeholder="Job title" /><Field label="Company" value={item.company} onChange={(value) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, company: value } : entry) }))} placeholder="Company" /><Field label="Location" value={item.location} onChange={(value) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, location: value } : entry) }))} placeholder="City, Country" /><label className="field"><span>Employment type</span><select value={item.employmentType} onChange={(event) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, employmentType: event.target.value } : entry) }))}><option value="">Select type</option>{['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'].map((type) => <option key={type}>{type}</option>)}</select></label><Field label="Start date" value={item.startDate} onChange={(value) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, startDate: value } : entry) }))} placeholder="2022" /><Field label="End date" value={item.current ? 'Present' : item.endDate} onChange={(value) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, endDate: value, current: false } : entry) }))} placeholder="2024" /><label className="checkbox-row field-wide"><input type="checkbox" checked={item.current} onChange={(event) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, current: event.target.checked } : entry) }))} /><span>I currently work here</span></label>
              <div className="field field-wide"><div className="subsection-title"><span>Achievements</span><Button kind="plain" onClick={() => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, bullets: [...entry.bullets, ''] } : entry) }))}>＋ Add achievement</Button></div>{item.bullets.map((bullet, bulletIndex) => <div className="bullet-row" key={`${item.id}-${bulletIndex}`}><button className="bullet-grip" draggable aria-label="Drag achievement" onDragStart={(event) => event.dataTransfer.setData('text/plain', `${item.id}:${bulletIndex}`)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const [sourceEntry, sourceIndexText] = event.dataTransfer.getData('text/plain').split(':'); if (sourceEntry !== item.id) return; const sourceIndex = Number(sourceIndexText); updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => { if (entry.id !== item.id) return entry; const bullets = [...entry.bullets]; const [moved] = bullets.splice(sourceIndex, 1); bullets.splice(bulletIndex, 0, moved); return { ...entry, bullets } }) })) }}>⠿</button><textarea rows={2} value={bullet} placeholder="Describe a result, contribution, or responsibility." onChange={(event) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, bullets: entry.bullets.map((line, i) => i === bulletIndex ? event.target.value : line) } : entry) }))} /><button aria-label="Improve bullet" title="Writing suggestions" onClick={() => setBulletHelper({ entryId: item.id, index: bulletIndex })}>✦</button><button aria-label="Remove achievement" onClick={() => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, bullets: entry.bullets.filter((_, i) => i !== bulletIndex) } : entry) }))}>×</button></div>)}</div>
              <Field label="Technologies" value={item.technologies.join(', ')} onChange={(value) => updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === item.id ? { ...entry, technologies: value.split(',').map((tech) => tech.trim()).filter(Boolean) } : entry) }))} placeholder="Separate technologies with commas" wide />
              </div></article>)}</div>
          </SectionCard>

          <SectionCard title="Education" description="Degrees, training, and relevant study." action={<Button kind="plain" onClick={() => updateResume((resume) => ({ ...resume, education: [...resume.education, { id: crypto.randomUUID(), degree: '', school: '', location: '', year: '' }] }))}>＋ Add education</Button>}>
            {document.resume.education.map((item) => <div className="form-grid entry-education" key={item.id}><Field label="Degree or program" value={item.degree} onChange={(value) => updateResume((resume) => ({ ...resume, education: resume.education.map((entry) => entry.id === item.id ? { ...entry, degree: value } : entry) }))} /><Field label="School" value={item.school} onChange={(value) => updateResume((resume) => ({ ...resume, education: resume.education.map((entry) => entry.id === item.id ? { ...entry, school: value } : entry) }))} /><Field label="Location" value={item.location} onChange={(value) => updateResume((resume) => ({ ...resume, education: resume.education.map((entry) => entry.id === item.id ? { ...entry, location: value } : entry) }))} /><Field label="Year" value={item.year} onChange={(value) => updateResume((resume) => ({ ...resume, education: resume.education.map((entry) => entry.id === item.id ? { ...entry, year: value } : entry) }))} /><button className="remove-link field-wide" onClick={() => updateResume((resume) => ({ ...resume, education: resume.education.filter((entry) => entry.id !== item.id) }))}>Remove education</button></div>)}
          </SectionCard>

          <SectionCard title="Skills" description="Group relevant skills and set an optional proficiency." action={<label className="skill-style-control">Preview style <select value={document.settings.skillStyle} onChange={(event) => updateSetting('skillStyle', event.target.value as ResumeSettings['skillStyle'])}><option value="plain">Plain list</option><option value="tags">Tags</option><option value="dots">Dots</option><option value="bars">Bars</option></select></label>}>
            <form className="skill-form" onSubmit={addSkill}><label className="sr-only" htmlFor="skill-new">New skill</label><input id="skill-new" value={newSkill} onChange={(event) => setNewSkill(event.target.value)} placeholder="Add a skill" /><Button kind="primary" type="submit">Add skill</Button></form><div className="skills-manager">{document.resume.skills.map((skill) => <div className="skill-edit-row" key={skill.id}><span>⠿</span><input aria-label="Skill name" value={skill.name} onChange={(event) => updateResume((resume) => ({ ...resume, skills: resume.skills.map((item) => item.id === skill.id ? { ...item, name: event.target.value } : item) }))} /><select aria-label="Skill category" value={skill.category} onChange={(event) => updateResume((resume) => ({ ...resume, skills: resume.skills.map((item) => item.id === skill.id ? { ...item, category: event.target.value } : item) }))}>{['Programming', 'Frameworks', 'Cloud', 'DevOps', 'Databases', 'Testing', 'Tools', 'Operating Systems', 'Methodologies', 'Soft Skills', 'Design'].map((category) => <option key={category}>{category}</option>)}</select><select aria-label="Skill proficiency" value={skill.proficiency ?? ''} onChange={(event) => updateResume((resume) => ({ ...resume, skills: resume.skills.map((item) => item.id === skill.id ? { ...item, proficiency: event.target.value ? Number(event.target.value) : undefined } : item) }))}><option value="">Level</option>{[1, 2, 3, 4, 5].map((level) => <option value={level} key={level}>{level}/5</option>)}</select><button aria-label={`Remove ${skill.name}`} onClick={() => updateResume((resume) => ({ ...resume, skills: resume.skills.filter((item) => item.id !== skill.id) }))}>×</button></div>)}</div>
          </SectionCard>

          {document.sectionOrder.filter((id) => SECTION_TYPES[id] && !['summary', 'experience', 'education', 'skills'].includes(id) && !document.hiddenSections.includes(id)).map((sectionId) => <SectionCard key={sectionId} title={document.sectionTitles[sectionId] ?? SECTION_LABELS[sectionId]} action={<div className="section-card-actions"><Button kind="plain" onClick={() => updateCurrent((current) => ({ ...current, hiddenSections: [...current.hiddenSections, sectionId] }))}>Hide</Button><Button kind="plain" onClick={() => { const field = SECTION_TYPES[sectionId]; updateResume((resume) => ({ ...resume, [field]: [...resume[field] as ResumeItem[], ...structuredClone(resume[field] as ResumeItem[]).map((item) => ({ ...item, id: crypto.randomUUID() }))] })) }}>Duplicate section</Button><Button kind="plain" onClick={() => addEntry(sectionId)}>＋ Add item</Button></div>}>
            {(document.resume[SECTION_TYPES[sectionId]] as ResumeItem[]).length === 0 && <EmptyState text={`Add ${SECTION_LABELS[sectionId].toLowerCase()} details to show them in your resume.`} />}
            {(document.resume[SECTION_TYPES[sectionId]] as ResumeItem[]).map((item) => <div className="form-grid entry-education" key={item.id}><Field label="Title" value={item.title} onChange={(value) => updateEntry(sectionId, item.id, { title: value })} /><Field label="Organization / subtitle" value={item.subtitle ?? ''} onChange={(value) => updateEntry(sectionId, item.id, { subtitle: value })} /><Field label="Date" value={item.endDate ?? ''} onChange={(value) => updateEntry(sectionId, item.id, { endDate: value })} /><Field label="URL" value={item.url ?? ''} onChange={(value) => updateEntry(sectionId, item.id, { url: value })} /><label className="field field-wide"><span>Description</span><textarea value={item.description ?? ''} onChange={(event) => updateEntry(sectionId, item.id, { description: event.target.value })} /></label><button className="remove-link field-wide" onClick={() => removeEntry(sectionId, item.id)}>Remove item</button></div>)}
          </SectionCard>)}
          {document.resume.customSections.map((section) => !document.hiddenSections.includes(section.id) && <SectionCard key={section.id} title={document.sectionTitles[section.id] ?? section.title} action={<div className="section-card-actions"><Button kind="plain" onClick={() => updateCurrent((current) => ({ ...current, hiddenSections: [...current.hiddenSections, section.id] }))}>Hide</Button><Button kind="plain" onClick={() => updateResume((resume) => ({ ...resume, customSections: resume.customSections.map((entry) => entry.id === section.id ? { ...entry, items: [...entry.items, ...structuredClone(entry.items).map((item) => ({ ...item, id: crypto.randomUUID() }))] } : entry) }))}>Duplicate</Button><Button kind="plain" onClick={() => updateResume((resume) => ({ ...resume, customSections: resume.customSections.map((entry) => entry.id === section.id ? { ...entry, items: [...entry.items, { id: crypto.randomUUID(), title: '', description: '' }] } : entry) }))}>＋ Add item</Button></div>}>
            <Field label="Section name" value={document.sectionTitles[section.id] ?? section.title} onChange={(value) => updateCurrent((current) => ({ ...current, sectionTitles: { ...current.sectionTitles, [section.id]: value } }))} />
            {section.items.map((item) => <div className="form-grid entry-education" key={item.id}><Field label="Entry title" value={item.title} onChange={(value) => updateResume((resume) => ({ ...resume, customSections: resume.customSections.map((entry) => entry.id === section.id ? { ...entry, items: entry.items.map((row) => row.id === item.id ? { ...row, title: value } : row) } : entry) }))} /><label className="field field-wide"><span>Description</span><textarea value={item.description ?? ''} onChange={(event) => updateResume((resume) => ({ ...resume, customSections: resume.customSections.map((entry) => entry.id === section.id ? { ...entry, items: entry.items.map((row) => row.id === item.id ? { ...row, description: event.target.value } : row) } : entry) }))} /></label></div>)}
            <Button kind="danger" onClick={() => updateCurrent((current) => ({ ...current, sectionOrder: current.sectionOrder.filter((id) => id !== section.id), resume: { ...current.resume, customSections: current.resume.customSections.filter((entry) => entry.id !== section.id) } }))}>Delete section</Button>
          </SectionCard>)}
          <div className="privacy-note">◇ Autosaves privately to this browser.</div>
        </div>
      </section>

      <section className={`preview-pane${mobileTab === 'editor' ? ' mobile-hidden' : ''}`} id="preview-pane" aria-label="Live resume preview">
        <div className="preview-toolbar"><div><span className="eyebrow">LIVE PREVIEW</span><span className="preview-template-chip">{selectedTemplate.name}</span></div><div className="preview-actions"><button onClick={undo} disabled={!history.past.length} aria-label="Undo">↶</button><button onClick={redo} disabled={!history.future.length} aria-label="Redo">↷</button><span className="toolbar-divider"/><button onClick={() => setZoom((value) => Math.max(50, value - 10))} aria-label="Zoom out">−</button><span>{zoom}%</span><button onClick={() => setZoom((value) => Math.min(140, value + 10))} aria-label="Zoom in">＋</button><button onClick={() => setZoom(100)} title="Fit page">Fit</button><button onClick={() => setFullscreen((value) => !value)} title="Full screen">⛶</button></div></div>
        <div className="preview-scroller"><div className="preview-paper-sizer" style={{ width: `${zoom}%` }}><ResumeTemplatePage document={document} /></div></div>
        <div className="preview-bottom"><button onClick={() => setView('templates')}>Change template</button><span>{savedText}</span><div className="page-controls"><button onClick={() => updateCurrent((current) => ({ ...current, pageBreakBefore: current.pageBreakBefore.slice(0, -1) }))}>− Page break</button><button onClick={() => updateCurrent((current) => { const nextId = current.sectionOrder.slice(1).find((id) => !current.pageBreakBefore.includes(id)); return nextId ? { ...current, pageBreakBefore: [...current.pageBreakBefore, nextId] } : current })}>＋ Page break</button></div></div>
      </section>
    </main>}

    {sectionManagerOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSectionManagerOpen(false) }}><aside className="side-drawer"><div className="drawer-heading"><div><span className="eyebrow">ORGANIZE YOUR CONTENT</span><h2>Manage sections</h2></div><button onClick={() => setSectionManagerOpen(false)} aria-label="Close">×</button></div><p className="drawer-copy">Drag sections to reorder. Hidden sections stay in your resume and can be added back.</p><div className="section-manager-list">{document.sectionOrder.map((id) => <div className="section-manager-item" key={id} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); dropSection(event.dataTransfer.getData('text/plain'), id) }}><span className="manager-grip">⠿</span><span className="manager-name">{document.sectionTitles[id] ?? document.resume.customSections.find((item) => item.id === id)?.title ?? SECTION_LABELS[id] ?? id}</span>{id.startsWith('custom-') && <button title="Rename" onClick={() => updateCurrent((current) => ({ ...current, sectionTitles: { ...current.sectionTitles, [id]: prompt('Section name', current.sectionTitles[id] ?? 'New section') ?? current.sectionTitles[id] ?? 'New section' } }))}>✎</button>}<button title={document.hiddenSections.includes(id) ? 'Show section' : 'Hide section'} onClick={() => updateCurrent((current) => ({ ...current, hiddenSections: current.hiddenSections.includes(id) ? current.hiddenSections.filter((item) => item !== id) : [...current.hiddenSections, id] }))}>{document.hiddenSections.includes(id) ? '◉' : '◌'}</button>{!['summary', 'experience', 'education', 'skills'].includes(id) && <button title="Delete section" onClick={() => updateCurrent((current) => ({ ...current, sectionOrder: current.sectionOrder.filter((item) => item !== id), hiddenSections: current.hiddenSections.filter((item) => item !== id), resume: { ...current.resume, customSections: current.resume.customSections.filter((item) => item.id !== id), ...(SECTION_TYPES[id] ? { [SECTION_TYPES[id]]: [] } : {}) } }))}>×</button>}</div>)}</div><label className="field add-section-select"><span>Add an existing section</span><select defaultValue="" onChange={(event) => { addResumeSection(event.target.value); event.target.value = '' }}><option value="" disabled>Choose a section…</option>{SECTION_OPTIONS.filter((id) => !document.sectionOrder.includes(id)).map((id) => <option value={id} key={id}>{SECTION_LABELS[id]}</option>)}</select></label><Button kind="soft" onClick={addCustomSection}>＋ Create custom section</Button><div className="drawer-bottom"><Button kind="danger" onClick={() => updateCurrent((current) => ({ ...current, sectionOrder: current.sectionOrder.filter((id) => id.startsWith('custom-') ? false : true), hiddenSections: [], resume: { ...current.resume, customSections: [] } }))}>Reset section layout</Button></div></aside></div>}

    {settingsOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}><aside className="side-drawer customization-drawer"><div className="drawer-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2>Customize design</h2></div><button onClick={() => setSettingsOpen(false)} aria-label="Close">×</button></div><label className="field"><span>Template</span><select value={document.settings.templateId} onChange={(event) => updateSetting('templateId', event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.category}</option>)}</select></label>
      <div className="drawer-section"><h3>Color palettes</h3><div className="palette-grid">{PALETTES.map((palette) => <button key={palette.name} onClick={() => updateCurrent((current) => ({ ...current, settings: { ...current.settings, primaryColor: palette.primary, accentColor: palette.accent, headingColor: palette.heading, textColor: palette.text } }))}><span style={{ background: palette.primary }} /><span style={{ background: palette.accent }} /><b>{palette.name}</b></button>)}</div></div>
      <div className="drawer-section"><h3>Custom colors</h3><div className="color-grid">{([['Primary', 'primaryColor'], ['Accent', 'accentColor'], ['Text', 'textColor'], ['Headings', 'headingColor'], ['Page', 'backgroundColor']] as const).map(([label, key]) => <label key={key}>{label}<input type="color" value={document.settings[key]} onChange={(event) => updateSetting(key, event.target.value)} /></label>)}</div></div>
      <div className="drawer-section"><h3>Typography</h3><label className="field"><span>Font family</span><select value={document.settings.fontFamily} onChange={(event) => updateSetting('fontFamily', event.target.value)}>{['Arial', 'Georgia', 'Garamond', 'Helvetica', 'Trebuchet MS', 'Verdana', 'Tahoma', 'Courier New'].map((font) => <option key={font}>{font}</option>)}</select></label><Range label="Body size" value={document.settings.fontSize} min={8} max={14} onChange={(value) => updateSetting('fontSize', value)} /><Range label="Heading size" value={document.settings.headingSize} min={9} max={18} onChange={(value) => updateSetting('headingSize', value)} /><Range label="Line height" value={document.settings.lineHeight} min={1.1} max={2} step={0.1} onChange={(value) => updateSetting('lineHeight', value)} /><Range label="Letter spacing" value={document.settings.letterSpacing} min={-0.5} max={2} step={0.1} onChange={(value) => updateSetting('letterSpacing', value)} /></div>
      <div className="drawer-section"><h3>Layout</h3><Range label="Page margins" value={document.settings.pageMargin} min={25} max={75} onChange={(value) => updateSetting('pageMargin', value)} /><Range label="Section spacing" value={document.settings.sectionSpacing} min={8} max={34} onChange={(value) => updateSetting('sectionSpacing', value)} /><Range label="Paragraph spacing" value={document.settings.paragraphSpacing} min={2} max={16} onChange={(value) => updateSetting('paragraphSpacing', value)} /><Range label="Column width" value={document.settings.columnWidth} min={45} max={75} onChange={(value) => updateSetting('columnWidth', value)} /><Range label="Header spacing" value={document.settings.headerSpacing} min={8} max={36} onChange={(value) => updateSetting('headerSpacing', value)} /><Range label="Sidebar width" value={document.settings.sidebarWidth} min={22} max={42} onChange={(value) => updateSetting('sidebarWidth', value)} /></div>
      <div className="drawer-bottom"><Button kind="soft" onClick={() => updateCurrent((current) => ({ ...current, settings: { ...defaultSettings, templateId: current.settings.templateId } }))}>Reset to defaults</Button><Button kind="primary" onClick={() => setSettingsOpen(false)}>Done</Button></div></aside></div>}

    {bulletHelper && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setBulletHelper(null) }}><div className="dialog"><div className="dialog-title"><div><span className="eyebrow">WRITING HELPER</span><h2>Refine this bullet</h2></div><button onClick={() => setBulletHelper(null)} aria-label="Close">×</button></div><p className="helper-notice">Suggestions preserve the facts you wrote. Add your real results where you see a placeholder.</p><div className="suggestions">{bulletSuggestions.map((suggestion) => <button key={suggestion.label} onClick={() => { updateResume((resume) => ({ ...resume, experience: resume.experience.map((entry) => entry.id === suggestion.entryId ? { ...entry, bullets: entry.bullets.map((line, i) => i === suggestion.index ? suggestion.text : line) } : entry) })); setBulletHelper(null) }}><span>{suggestion.label}</span><p>{suggestion.text}</p><b>Use suggestion ↗</b></button>)}</div></div></div>}

    {shortcutHelp && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShortcutHelp(false) }}><div className="dialog shortcut-dialog"><div className="dialog-title"><div><span className="eyebrow">QUICK ACTIONS</span><h2>Keyboard shortcuts</h2></div><button onClick={() => setShortcutHelp(false)} aria-label="Close">×</button></div><div className="shortcut-list"><span>Save</span><kbd>⌘ / Ctrl + S</kbd><span>Undo</span><kbd>⌘ / Ctrl + Z</kbd><span>Redo</span><kbd>⌘ / Ctrl + Shift + Z</kbd><span>Print / export PDF</span><kbd>⌘ / Ctrl + P</kbd><span>Exit fullscreen / dialog</span><kbd>Esc</kbd><span>Show this guide</span><kbd>⌘ / Ctrl + /</kbd></div></div></div>}
  </div>
}

function EmptyState({ text }: { text: string }) { return <div className="empty-state">{text}</div> }
function Range({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) { return <label className="range-control"><span>{label}<b>{value}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label> }

export default App
