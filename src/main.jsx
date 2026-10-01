import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp, Clock3,
  Filter, Inbox, LayoutDashboard, Menu, Pencil, Plus, Search, Sparkles,
  Target, UserRound, UsersRound, X, XCircle
} from 'lucide-react'
import './styles.css'

const today = new Date()
const isoToday = today.toISOString().slice(0, 10)
const prettyToday = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

const seedCommitments = [
  { id: 1, title: 'Send Q4 launch brief to the team', owner: 'You', dueDate: isoToday, status: 'In progress', confidence: 85, source: 'Work', notes: 'Include the launch timeline and decision log.' },
  { id: 2, title: 'Confirm design review with Maya', owner: 'Maya', dueDate: isoToday, status: 'Waiting', confidence: 60, source: 'Slack', notes: 'Waiting on a time that works for both calendars.' },
  { id: 3, title: 'Review onboarding flow feedback', owner: 'You', dueDate: new Date(today.getTime() + 86400000).toISOString().slice(0, 10), status: 'Not started', confidence: 95, source: 'Personal', notes: '' },
  { id: 4, title: 'Share analytics access with Jordan', owner: 'Jordan', dueDate: new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10), status: 'Waiting', confidence: 45, source: 'Email', notes: '' },
]

const statusOptions = ['Not started', 'In progress', 'Waiting', 'Complete']
const sourceOptions = ['Work', 'Personal', 'Email', 'Slack', 'Meeting', 'Other']

function App() {
  const [commitments, setCommitments] = useState(seedCommitments)
  const [activeView, setActiveView] = useState('Today')
  const [query, setQuery] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState('')

  const filtered = useMemo(() => {
    let list = commitments
    if (activeView === 'Today') list = list.filter((item) => item.dueDate === isoToday)
    if (activeView === 'Waiting On') list = list.filter((item) => item.status === 'Waiting')
    if (query.trim()) list = list.filter((item) => `${item.title} ${item.owner} ${item.source}`.toLowerCase().includes(query.toLowerCase()))
    return list
  }, [activeView, commitments, query])

  const counts = {
    today: commitments.filter((item) => item.dueDate === isoToday && item.status !== 'Complete').length,
    waiting: commitments.filter((item) => item.status === 'Waiting').length,
    complete: commitments.filter((item) => item.status === 'Complete').length,
  }

  function saveCommitment(form) {
    if (editing) {
      setCommitments((items) => items.map((item) => item.id === editing.id ? { ...item, ...form } : item))
      notify('Commitment updated')
    } else {
      setCommitments((items) => [{ ...form, id: Date.now() }, ...items])
      notify('Commitment added')
    }
    setEditing(null)
    setShowComposer(false)
  }

  function toggleComplete(item) {
    const next = item.status === 'Complete' ? 'In progress' : 'Complete'
    setCommitments((items) => items.map((current) => current.id === item.id ? { ...current, status: next } : current))
    notify(next === 'Complete' ? 'Marked complete' : 'Reopened commitment')
  }

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Target size={19} strokeWidth={2.5} /></div><span>Commitment<span className="brand-accent">OS</span></span></div>
        <nav className="main-nav">
          <NavItem icon={<LayoutDashboard size={18} />} label="Today" active={activeView === 'Today'} count={counts.today} onClick={() => setActiveView('Today')} />
          <NavItem icon={<Inbox size={18} />} label="All Commitments" active={activeView === 'All Commitments'} onClick={() => setActiveView('All Commitments')} />
          <NavItem icon={<UsersRound size={18} />} label="Waiting On" active={activeView === 'Waiting On'} count={counts.waiting} onClick={() => setActiveView('Waiting On')} />
        </nav>
        <div className="sidebar-bottom"><div className="workspace-card"><div className="avatar">AL</div><div><strong>Alex's workspace</strong><span>Personal space</span></div><ChevronDown size={15} /></div><div className="help-link"><CircleHelp size={16} /> Help & shortcuts</div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu"><Menu size={20} /></button><div className="crumb"><span>Workspace</span><span className="slash">/</span><strong>{activeView}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /></button><div className="top-avatar">AL</div></div></header>
        <section className="content-wrap">
          <div className="page-heading"><div><p className="eyebrow">{prettyToday}</p><h1>{activeView === 'Today' ? 'Good morning, Alex' : activeView}</h1><p className="subheading">{activeView === 'Today' ? 'Keep the important things moving forward.' : activeView === 'Waiting On' ? 'A clear view of every promise currently outside your hands.' : 'One calm place for every promise you make.'}</p></div><button className="primary-button" onClick={() => { setEditing(null); setShowComposer(true) }}><Plus size={18} /> New commitment</button></div>

          {activeView === 'Today' && <div className="summary-grid"><SummaryCard label="Due today" value={counts.today} detail="Keep your focus here" icon={<CalendarDays size={18} />} tone="purple" /><SummaryCard label="Waiting on" value={counts.waiting} detail="Needs a follow-up" icon={<Clock3 size={18} />} tone="orange" /><SummaryCard label="Completed" value={counts.complete} detail="All-time momentum" icon={<Check size={18} />} tone="green" /></div>}

          <div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commitments..." /></div><button className="filter-button"><Filter size={16} /> Filter <ChevronDown size={14} /></button></div>

          <div className="section-header"><div><h2>{activeView === 'All Commitments' ? 'All commitments' : activeView === 'Waiting On' ? 'Waiting on others' : 'Your focus today'}</h2><span className="muted">{filtered.length} {filtered.length === 1 ? 'commitment' : 'commitments'}</span></div><button className="view-button">Sort by <strong>Due date</strong><ChevronDown size={14} /></button></div>
          <div className="commitment-list">{filtered.length ? filtered.map((item) => <CommitmentCard key={item.id} item={item} onToggle={toggleComplete} onEdit={() => { setEditing(item); setShowComposer(true) }} />) : <EmptyState onCreate={() => setShowComposer(true)} />}</div>
        </section>
      </main>
      {showComposer && <Composer initial={editing} onClose={() => { setShowComposer(false); setEditing(null) }} onSave={saveCommitment} />}
      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
    </div>
  )
}

function NavItem({ icon, label, active, count, onClick }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count > 0 && <b>{count}</b>}</button> }
function SummaryCard({ label, value, detail, icon, tone }) { return <div className="summary-card"><div className={`summary-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div> }
function CommitmentCard({ item, onToggle, onEdit }) {
  const date = new Date(`${item.dueDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const isOverdue = item.dueDate < isoToday && item.status !== 'Complete'
  return <article className={`commitment-card ${item.status === 'Complete' ? 'completed' : ''}`}><button className={`check-button ${item.status === 'Complete' ? 'checked' : ''}`} onClick={() => onToggle(item)} aria-label={item.status === 'Complete' ? 'Reopen commitment' : 'Complete commitment'}>{item.status === 'Complete' && <Check size={15} />}</button><div className="commitment-body"><div className="title-row"><h3>{item.title}</h3><button className="edit-button" onClick={onEdit} aria-label="Edit commitment"><Pencil size={15} /></button></div><div className="meta-row"><span className={`status-pill ${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span><span><CalendarDays size={14} /> <em className={isOverdue ? 'overdue' : ''}>{isOverdue ? 'Overdue' : date}</em></span><span><UserRound size={14} /> {item.owner}</span><span className="source-tag">{item.source}</span></div>{item.notes && <p className="notes">{item.notes}</p>}<div className="confidence"><span>Confidence</span><div className="confidence-bar"><i style={{ width: `${item.confidence}%` }} /></div><strong>{item.confidence}%</strong></div></div><ArrowUpRight className="card-arrow" size={18} /></article>
}
function EmptyState({ onCreate }) { return <div className="empty-state"><div className="empty-icon"><Sparkles size={24} /></div><h3>Nothing here yet</h3><p>Capture a commitment to make it visible and actionable.</p><button className="secondary-button" onClick={onCreate}><Plus size={16} /> Add commitment</button></div> }

function Composer({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { title: '', owner: 'You', dueDate: isoToday, status: 'Not started', confidence: 80, source: 'Work', notes: '' })
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  function submit(event) { event.preventDefault(); if (form.title.trim()) onSave({ ...form, title: form.title.trim(), confidence: Number(form.confidence) }) }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="composer"><div className="composer-head"><div><span className="eyebrow">{initial ? 'Edit commitment' : 'Capture a promise'}</span><h2>{initial ? 'Update commitment' : 'New commitment'}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><form onSubmit={submit}><label>What needs to happen?<input autoFocus required value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Send the proposal to the client" /></label><div className="form-grid"><label>Owner<select value={form.owner} onChange={(event) => update('owner', event.target.value)}><option>You</option><option>Maya</option><option>Jordan</option><option>Team</option></select></label><label>Due date<input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} /></label><label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>Source<select value={form.source} onChange={(event) => update('source', event.target.value)}>{sourceOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div><label>Confidence <span className="range-value">{form.confidence}%</span><input className="range" type="range" min="0" max="100" step="5" value={form.confidence} onChange={(event) => update('confidence', event.target.value)} /></label><label>Notes <textarea rows="3" value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Add useful context (optional)" /></label><div className="composer-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{initial ? 'Save changes' : 'Add commitment'}</button></div></form></section></div>
}

createRoot(document.getElementById('root')).render(<App />)
