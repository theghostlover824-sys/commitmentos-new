import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Filter,
  Inbox,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import './styles.css'

const getTodayISO = () => new Date().toISOString().slice(0, 10)

const getPrettyToday = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

const statusOptions = ['Not started', 'In progress', 'Waiting', 'Complete']
const sourceOptions = ['Work', 'Personal', 'Email', 'Slack', 'Meeting', 'Other']

function fromDb(row) {
  return {
    id: row.id,
    title: row.title,
    owner: row.owner,
    dueDate: row.due_date,
    status:
      row.status === 'not_started'
        ? 'Not started'
        : row.status === 'in_progress'
          ? 'In progress'
          : row.status === 'waiting'
            ? 'Waiting'
            : 'Complete',
    confidence: row.confidence,
    source: row.source,
    notes: row.notes || '',
  }
}

function toDb(form, userId) {
  const status =
    form.status === 'Not started'
      ? 'not_started'
      : form.status === 'In progress'
        ? 'in_progress'
        : form.status.toLowerCase()

  return {
    user_id: userId,
    title: form.title.trim(),
    owner: form.owner,
    due_date: form.dueDate,
    status,
    confidence: Number(form.confidence),
    source: form.source,
    notes: form.notes || '',
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  const [commitments, setCommitments] = useState([])
  const [activeView, setActiveView] = useState('Today')
  const [query, setQuery] = useState('')

  const [showComposer, setShowComposer] = useState(false)
  const [editing, setEditing] = useState(null)

  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) {
        setError(error.message)
      }

      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !user) {
      setCommitments([])
      return
    }

    let cancelled = false

    async function loadCommitments() {
      setError('')

      const { data, error: dbError } = await supabase
        .from('commitments')
        .select('*')
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (dbError) {
        setError(dbError.message)
        setCommitments([])
        return
      }

      setCommitments((data || []).map(fromDb))
    }

    loadCommitments()

    return () => {
      cancelled = true
    }
  }, [user])

  const todayISO = getTodayISO()

  const filtered = useMemo(() => {
    let list = commitments

    if (activeView === 'Today') {
      list = list.filter((item) => item.dueDate === todayISO)
    }

    if (activeView === 'Waiting On') {
      list = list.filter((item) => item.status === 'Waiting')
    }

    if (query.trim()) {
      const needle = query.toLowerCase()

      list = list.filter((item) =>
        `${item.title} ${item.owner} ${item.source}`
          .toLowerCase()
          .includes(needle)
      )
    }

    return list
  }, [activeView, commitments, query, todayISO])

  const counts = {
    today: commitments.filter(
      (item) =>
        item.dueDate === todayISO &&
        item.status !== 'Complete'
    ).length,

    waiting: commitments.filter(
      (item) => item.status === 'Waiting'
    ).length,

    complete: commitments.filter(
      (item) => item.status === 'Complete'
    ).length,
  }

  function notify(message) {
    setToast(message)

    window.setTimeout(() => {
      setToast('')
    }, 2400)
  }

  async function handleAuth(event) {
    event.preventDefault()

    if (!supabase) return

    setAuthBusy(true)
    setError('')
    setAuthMessage('')

    try {
      if (authMode === 'signin') {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })

        if (signInError) {
          throw signInError
        }
      } else {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
          })

        if (signUpError) {
          throw signUpError
        }

        if (!data.session) {
          setAuthMessage(
            'Account created. Please check your email and confirm your account.'
          )

          setAuthMode('signin')
        }
      }

      setPassword('')
    } catch (authError) {
      setError(authError.message || 'Authentication failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) return

    const { error: signOutError } =
      await supabase.auth.signOut()

    if (signOutError) {
      setError(signOutError.message)
      return
    }

    setCommitments([])
  }

  async function saveCommitment(form) {
    if (!supabase || !user) return

    setError('')

    const payload = toDb(form, user.id)

    try {
      if (editing) {
        const { data, error: updateError } =
          await supabase
            .from('commitments')
            .update(payload)
            .eq('id', editing.id)
            .select('*')
            .single()

        if (updateError) throw updateError

        setCommitments((items) =>
          items.map((item) =>
            item.id === editing.id ? fromDb(data) : item
          )
        )

        notify('Commitment updated')
      } else {
        const { data, error: insertError } =
          await supabase
            .from('commitments')
            .insert(payload)
            .select('*')
            .single()

        if (insertError) throw insertError

        setCommitments((items) => [
          fromDb(data),
          ...items,
        ])

        notify('Commitment added')
      }

      setEditing(null)
      setShowComposer(false)
    } catch (dbError) {
      setError(dbError.message || 'Database operation failed.')
    }
  }

  async function toggleComplete(item) {
    if (!supabase || !user) return

    setError('')

    const newStatus =
      item.status === 'Complete'
        ? 'in_progress'
        : 'complete'

    const { data, error: updateError } =
      await supabase
        .from('commitments')
        .update({ status: newStatus })
        .eq('id', item.id)
        .select('*')
        .single()

    if (updateError) {
      setError(updateError.message)
      return
    }

    setCommitments((items) =>
      items.map((current) =>
        current.id === item.id
          ? fromDb(data)
          : current
      )
    )

    notify(
      newStatus === 'complete'
        ? 'Marked complete'
        : 'Reopened commitment'
    )
  }

  async function deleteCommitment(item) {
    if (!supabase || !user) return

    setError('')

    const { error: deleteError } =
      await supabase
        .from('commitments')
        .delete()
        .eq('id', item.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setCommitments((items) =>
      items.filter((current) => current.id !== item.id)
    )

    notify('Commitment deleted')
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-loading setup-required">
        <div className="brand">
          <div className="brand-mark">
            <Target size={19} />
          </div>

          <span>
            Commitment<span className="brand-accent">OS</span>
          </span>
        </div>

        <h1>Supabase configuration required</h1>

        <p>
          Add VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY to the deployment
          environment.
        </p>
      </div>
    )
  }

  if (!authReady) {
    return (
      <div className="auth-loading">
        <div className="brand">
          <div className="brand-mark">
            <Target size={19} />
          </div>

          <span>
            Commitment<span className="brand-accent">OS</span>
          </span>
        </div>

        <p>Connecting securely…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        email={email}
        password={password}
        busy={authBusy}
        error={error}
        message={authMessage}
        onSubmit={handleAuth}
        onEmail={setEmail}
        onPassword={setPassword}
        onSwitch={() => {
          setAuthMode(
            authMode === 'signin'
              ? 'signup'
              : 'signin'
          )

          setError('')
          setAuthMessage('')
        }}
      />
    )
  }

  const displayName =
    user.email?.split('@')[0] || 'User'

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">
            <Target size={19} />
          </div>

          <span>
            Commitment<span className="brand-accent">OS</span>
          </span>
        </div>

        <nav className="main-nav">

          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Today"
            active={activeView === 'Today'}
            count={counts.today}
            onClick={() => setActiveView('Today')}
          />

          <NavItem
            icon={<Inbox size={18} />}
            label="All Commitments"
            active={activeView === 'All Commitments'}
            onClick={() =>
              setActiveView('All Commitments')
            }
          />

          <NavItem
            icon={<UsersRound size={18} />}
            label="Waiting On"
            active={activeView === 'Waiting On'}
            count={counts.waiting}
            onClick={() =>
              setActiveView('Waiting On')
            }
          />

        </nav>

        <div className="sidebar-bottom">

          <div className="workspace-card">

            <div className="avatar">
              {displayName.slice(0, 2).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}'s workspace</strong>
              <span>{user.email}</span>
            </div>

            <ChevronDown size={15} />

          </div>

          <button
            className="help-link"
            type="button"
            onClick={handleSignOut}
          >
            <CircleHelp size={16} />
            Sign out
          </button>

        </div>

      </aside>

      <main className="main-content">

        <header className="topbar">

          <button
            className="mobile-menu"
            type="button"
          >
            <Menu size={20} />
          </button>

          <div className="crumb">
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{activeView}</strong>
          </div>

          <div className="top-actions">

            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>

            <div className="top-avatar">
              {displayName.slice(0, 2).toUpperCase()}
            </div>

          </div>

        </header>

        <section className="content-wrap">

          <div className="page-heading">

            <div>

              <p className="eyebrow">
                {getPrettyToday()}
              </p>

              <h1>
                {activeView === 'Today'
                  ? `Good morning, ${displayName}`
                  : activeView}
              </h1>

              <p className="subheading">
                {activeView === 'Today'
                  ? 'Keep the important things moving forward.'
                  : activeView === 'Waiting On'
                    ? 'A clear view of every promise currently outside your hands.'
                    : 'One calm place for every promise you make.'}
              </p>

            </div>

            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setEditing(null)
                setShowComposer(true)
              }}
            >
              <Plus size={18} />
              New commitment
            </button>

          </div>

          {activeView === 'Today' && (
            <div className="summary-grid">

              <SummaryCard
                label="Due today"
                value={counts.today}
                detail="Keep your focus here"
                icon={<CalendarDays size={18} />}
                tone="purple"
              />

              <SummaryCard
                label="Waiting on"
                value={counts.waiting}
                detail="Needs a follow-up"
                icon={<Clock3 size={18} />}
                tone="orange"
              />

              <SummaryCard
                label="Completed"
                value={counts.complete}
                detail="All-time momentum"
                icon={<Check size={18} />}
                tone="green"
              />

            </div>
          )}

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          <div className="toolbar">

            <div className="search-box">
              <Search size={17} />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search commitments..."
              />
            </div>

            <button
              className="filter-button"
              type="button"
            >
              <Filter size={16} />
              Filter
              <ChevronDown size={14} />
            </button>

          </div>

          <div className="section-header">

            <div>

              <h2>
                {activeView === 'All Commitments'
                  ? 'All commitments'
                  : activeView === 'Waiting On'
                    ? 'Waiting on others'
                    : 'Your focus today'}
              </h2>

              <span className="muted">
                {filtered.length}{' '}
                {filtered.length === 1
                  ? 'commitment'
                  : 'commitments'}
              </span>

            </div>

            <button
              className="view-button"
              type="button"
            >
              Sort by
              <strong>Due date</strong>
              <ChevronDown size={14} />
            </button>

          </div>

          <div className="commitment-list">

            {filtered.length ? (
              filtered.map((item) => (
                <CommitmentCard
                  key={item.id}
                  item={item}
                  onToggle={toggleComplete}
                  onEdit={() => {
                    setEditing(item)
                    setShowComposer(true)
                  }}
                  onDelete={deleteCommitment}
                />
              ))
            ) : (
              <EmptyState
                onCreate={() => {
                  setEditing(null)
                  setShowComposer(true)
                }}
              />
            )}

          </div>

        </section>

      </main>

      {showComposer && (
        <Composer
          initial={editing}
          onClose={() => {
            setShowComposer(false)
            setEditing(null)
          }}
          onSave={saveCommitment}
        />
      )}

      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}

    </div>
  )
}

function AuthScreen({
  mode,
  email,
  password,
  busy,
  error,
  message,
  onSubmit,
  onEmail,
  onPassword,
  onSwitch,
}) {
  const signup = mode === 'signup'

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="brand auth-brand">

          <div className="brand-mark">
            <Target size={19} />
          </div>

          <span>
            Commitment<span className="brand-accent">OS</span>
          </span>

        </div>

        <p className="eyebrow">
          {signup
            ? 'Create your workspace'
            : 'Welcome back'}
        </p>

        <h1>
          {signup
            ? 'Start keeping promises visible.'
            : 'Sign in to your commitments.'}
        </h1>

        <p className="subheading">
          Your data is stored in your Supabase account
          and protected by row-level security.
        </p>

        <form
          className="auth-form"
          onSubmit={onSubmit}
        >

          <label>
            Email

            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) =>
                onEmail(event.target.value)
              }
            />
          </label>

          <label>
            Password

            <input
              type="password"
              autoComplete={
                signup
                  ? 'new-password'
                  : 'current-password'
              }
              minLength="6"
              required
              value={password}
              onChange={(event) =>
                onPassword(event.target.value)
              }
            />
          </label>

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          {message && (
            <div className="success-banner">
              {message}
            </div>
          )}

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Please wait…'
              : signup
                ? 'Create account'
                : 'Sign in'}
          </button>

        </form>

        <button
          className="auth-switch"
          type="button"
          onClick={onSwitch}
        >
          {signup
            ? 'Already have an account? Sign in'
            : 'New here? Create an account'}
        </button>

      </div>

    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  count,
  onClick,
}) {
  return (
    <button
      className={`nav-item ${active ? 'active' : ''}`}
      type="button"
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && <b>{count}</b>}
    </button>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  tone,
}) {
  return (
    <div className="summary-card">

      <div className={`summary-icon ${tone}`}>
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>

    </div>
  )
}

function CommitmentCard({
  item,
  onToggle,
  onEdit,
  onDelete,
}) {
  const date = new Date(
    `${item.dueDate}T12:00:00`
  ).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  const isOverdue =
    item.dueDate < getTodayISO() &&
    item.status !== 'Complete'

  return (
    <article
      className={`commitment-card ${
        item.status === 'Complete'
          ? 'completed'
          : ''
      }`}
    >

      <button
        className={`check-button ${
          item.status === 'Complete'
            ? 'checked'
            : ''
        }`}
        type="button"
        onClick={() => onToggle(item)}
        aria-label={
          item.status === 'Complete'
            ? 'Reopen commitment'
            : 'Complete commitment'
        }
      >
        {item.status === 'Complete' && (
          <Check size={15} />
        )}
      </button>

      <div className="commitment-body">

        <div className="title-row">

          <h3>{item.title}</h3>

          <div className="card-actions">

            <button
              className="edit-button"
              type="button"
              onClick={onEdit}
              aria-label="Edit commitment"
            >
              <Pencil size={15} />
            </button>

            <button
              className="edit-button"
              type="button"
              onClick={() => onDelete(item)}
              aria-label="Delete commitment"
            >
              Delete
            </button>

          </div>

        </div>

        <div className="meta-row">

          <span
            className={`status-pill ${item.status
              .toLowerCase()
              .replace(' ', '-')}`}
          >
            {item.status}
          </span>

          <span>
            <CalendarDays size={14} />

            <em
              className={
                isOverdue ? 'overdue' : ''
              }
            >
              {isOverdue ? 'Overdue' : date}
            </em>
          </span>

          <span>
            <UserRound size={14} />
            {item.owner}
          </span>

          <span className="source-tag">
            {item.source}
          </span>

        </div>

        {item.notes && (
          <p className="notes">
            {item.notes}
          </p>
        )}

        <div className="confidence">

          <span>Confidence</span>

          <div className="confidence-bar">
            <i
              style={{
                width: `${item.confidence}%`,
              }}
            />
          </div>

          <strong>
            {item.confidence}%
          </strong>

        </div>

      </div>

      <ArrowUpRight
        className="card-arrow"
        size={18}
      />

    </article>
  )
}

function EmptyState({ onCreate }) {
  return (
    <div className="empty-state">

      <div className="empty-icon">
        <Sparkles size={24} />
      </div>

      <h3>Nothing here yet</h3>

      <p>
        Capture a commitment to make it visible
        and actionable.
      </p>

      <button
        className="secondary-button"
        type="button"
        onClick={onCreate}
      >
        <Plus size={16} />
        Add commitment
      </button>

    </div>
  )
}

function Composer({
  initial,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(
    initial || {
      title: '',
      owner: 'You',
      dueDate: getTodayISO(),
      status: 'Not started',
      confidence: 80,
      source: 'Work',
      notes: '',
    }
  )

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function submit(event) {
    event.preventDefault()

    if (!form.title.trim()) return

    onSave({
      ...form,
      title: form.title.trim(),
      confidence: Number(form.confidence),
    })
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >

      <section className="composer">

        <div className="composer-head">

          <div>

            <span className="eyebrow">
              {initial
                ? 'Edit commitment'
                : 'Capture a promise'}
            </span>

            <h2>
              {initial
                ? 'Update commitment'
                : 'New commitment'}
            </h2>

          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
          >
            <X size={18} />
          </button>

        </div>

        <form onSubmit={submit}>

          <label>
            What needs to happen?

            <input
              autoFocus
              required
              value={form.title}
              onChange={(event) =>
                update(
                  'title',
                  event.target.value
                )
              }
              placeholder="e.g. Send the proposal to the client"
            />
          </label>

          <div className="form-grid">

            <label>
              Owner

              <select
                value={form.owner}
                onChange={(event) =>
                  update(
                    'owner',
                    event.target.value
                  )
                }
              >
                <option>You</option>
                <option>Maya</option>
                <option>Jordan</option>
                <option>Team</option>
              </select>
            </label>

            <label>
              Due date

              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  update(
                    'dueDate',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Status

              <select
                value={form.status}
                onChange={(event) =>
                  update(
                    'status',
                    event.target.value
                  )
                }
              >
                {statusOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Source

              <select
                value={form.source}
                onChange={(event) =>
                  update(
                    'source',
                    event.target.value
                  )
                }
              >
                {sourceOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

          </div>

          <label>
            Confidence

            <span className="range-value">
              {form.confidence}%
            </span>

            <input
              className="range"
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.confidence}
              onChange={(event) =>
                update(
                  'confidence',
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Notes

            <textarea
              rows="3"
              value={form.notes}
              onChange={(event) =>
                update(
                  'notes',
                  event.target.value
                )
              }
              placeholder="Add useful context (optional)"
            />
          </label>

          <div className="composer-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
            >
              {initial
                ? 'Save changes'
                : 'Add commitment'}
            </button>

          </div>

        </form>

      </section>

    </div>
  )
}

createRoot(
  document.getElementById('root')
).render(<App />)
