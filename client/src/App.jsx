import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, GraduationCap, Layers3, LockKeyhole, LogOut, Mail,
  Menu, Moon, NotebookPen, Pencil, Plus, Search, SearchX, ShieldCheck,
  Sparkles, Sun, Trash2, UserRound, X, Shield, Users, FileText, Activity, Send, RefreshCw, BadgeCheck
} from 'lucide-react';

const API_ROOT = import.meta.env.VITE_API_ROOT || 'https://online-notes-hub-wawi.onrender.com/api';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('nh_token') || '');
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [resources, setResources] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminResources, setAdminResources] = useState([]);
  const [adminForm, setAdminForm] = useState({ title: '', subjectId: '', topicTitle: '', content: '' });
  const [adminFormError, setAdminFormError] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [view, setView] = useState('auth');
  const [activeSubjectId, setActiveSubjectId] = useState('');
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editDraft, setEditDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [toast, setToast] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nh_theme') === 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const apiRequest = async (path, options = {}) => {
    const { token: tokenOverride, ...fetchOptions } = options;
    const activeToken = tokenOverride || token || localStorage.getItem('nh_token') || '';
    const headers = {
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...(fetchOptions.headers || {})
    };
    if (activeToken) headers.Authorization = `Bearer ${activeToken}`;

    let response;
    try {
      response = await fetch(`${API_ROOT}${path}`, { ...fetchOptions, headers });
    } catch {
      throw new Error(
        'Cannot reach the NotesHub backend. Start the project from the main project folder with "npm run dev" and check that http://localhost:5000/api/health opens.'
      );
    }

    if (response.status === 204) return {};
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      const responsePreview = (await response.text().catch(() => '')).trim().slice(0, 180);
      const hint = response.status === 404
        ? 'The /api route was not found. Check that Vite is proxying /api to Express on port 5000.'
        : 'The frontend may be receiving the Vite/HTML page instead of an Express API response.';
      throw new Error(
        `NotesHub expected JSON from ${response.url || `${API_ROOT}${path}`} but received HTTP ${response.status} (${contentType || 'unknown content type'}). ${hint} Start the backend from the project root and open http://localhost:5000/api/health. ${responsePreview ? `Response preview: ${responsePreview}` : ''}`
      );
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `The server returned error ${response.status}. Check the backend terminal for details.`);
    }
    return data;
  };

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('nh_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setBooting(false);
      setUser(null);
      setSubjects([]);
      setNotes([]);
      setResources([]);
      setAdminData(null);
      setAdminUsers([]);
      setAdminResources([]);
      setView('auth');
      return () => { alive = false; };
    }

    setBooting(true);
    (async () => {
      const profile = await apiRequest('/auth/me', { token });
      const [library, saved, shared] = await Promise.all([
        apiRequest('/subjects', { token }),
        apiRequest('/notes', { token }),
        apiRequest('/resources', { token })
      ]);
      let dashboard = null;
      let userResult = { users: [] };
      let resourceResult = { resources: [] };
      if (profile.user.role === 'admin') {
        [dashboard, userResult, resourceResult] = await Promise.all([
          apiRequest('/admin/dashboard', { token }),
          apiRequest('/admin/users', { token }),
          apiRequest('/admin/resources', { token })
        ]);
      }
      if (!alive) return;
      setUser(profile.user);
      setSubjects(library.subjects || []);
      setAdminUsers(userResult.users || []);
      setAdminResources(resourceResult.resources || []);
      setAdminForm((current) => current.subjectId ? current : ({
        ...current,
        subjectId: library.subjects?.[0]?.id || '',
        topicTitle: library.subjects?.[0]?.topics?.[0]?.t || ''
      }));
      setNotes(saved.notes || []);
      setResources(shared.resources || []);
      setAdminData(dashboard);
      setActiveSubjectId((current) => current || library.subjects?.[0]?.id || '');
      setView((current) => current === 'auth' ? (profile.user.role === 'admin' ? 'admin' : 'home') : current);
    })().catch((error) => {
      if (!alive) return;
      localStorage.removeItem('nh_token');
      setToken('');
      setUser(null);
      setAuthError(error.message || 'Please log in again.');
    }).finally(() => {
      if (alive) setBooting(false);
    });

    return () => { alive = false; };
  }, [token]);

  const activeSubject = subjects.find((subject) => subject.id === activeSubjectId) || subjects[0] || null;
  const activeTopic = activeSubject?.topics?.[activeTopicIndex] || null;
  const topicNotes = activeTopic
    ? notes.filter((note) => note.subjectId === activeSubject?.id && note.topicTitle === activeTopic.t)
    : [];

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    const matches = [];
    subjects.forEach((subject) => {
      subject.topics.forEach((topic, index) => {
        const plainText = `${topic.t} ${topic.b.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')}`.toLowerCase();
        if (plainText.includes(query)) matches.push({ subject, topic, index });
      });
    });
    return matches;
  }, [searchTerm, subjects]);

  const showToast = (message) => setToast(message);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      const normalizedName = authForm.name.trim();
      const normalizedEmail = authForm.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Please enter a valid email address.');
      if (authMode === 'signup') {
        if (normalizedName.length < 2 || normalizedName.length > 60 || !/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,59}$/u.test(normalizedName)) {
          throw new Error('Enter a valid name using 2–60 letters, spaces, dots, apostrophes or hyphens.');
        }
        if (authForm.password.length < 8 || !/[a-z]/.test(authForm.password) || !/[A-Z]/.test(authForm.password) || !/\d/.test(authForm.password)) {
          throw new Error('Password needs 8+ characters, an uppercase letter, a lowercase letter and a number.');
        }
      }
      const endpoint = authMode === 'signup' ? '/auth/register' : '/auth/login';
      const payload = authMode === 'signup'
        ? { name: normalizedName, email: normalizedEmail, password: authForm.password }
        : { email: normalizedEmail, password: authForm.password };
      const result = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      if (!result?.token || !result?.user) {
        throw new Error('The server did not complete sign in. Check the backend terminal and MongoDB Atlas connection, then try again.');
      }
      localStorage.setItem('nh_token', result.token);
      setToken(result.token);
      setUser(result.user);
      setAuthForm({ name: '', email: '', password: '' });
      setSearchTerm('');
      setView(result.user.role === 'admin' ? 'admin' : 'home');
      showToast(authMode === 'signup' ? 'Your study space is ready. Welcome!' : `Welcome back, ${result.user.name.split(' ')[0]}!`);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nh_token');
    setToken('');
    setUser(null);
    setSearchTerm('');
    setAdminData(null);
    setAdminUsers([]);
    setAdminResources([]);
    setView('auth');
    setAuthMode('login');
    setAuthError('');
    showToast('You are safely logged out. See you soon!');
  };

  const openSubject = (subjectId) => {
    setActiveSubjectId(subjectId);
    setActiveTopicIndex(0);
    setSearchTerm('');
    setView('home');
    setMobileMenuOpen(false);
  };

  const openTopic = (subjectId, topicIndex) => {
    setActiveSubjectId(subjectId);
    setActiveTopicIndex(topicIndex);
    setNoteDraft('');
    setEditingNoteId('');
    setView('reader');
    setSearchTerm('');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeTopic = (direction) => {
    if (!activeSubject) return;
    const nextIndex = activeTopicIndex + direction;
    if (nextIndex < 0 || nextIndex >= activeSubject.topics.length) return;
    openTopic(activeSubject.id, nextIndex);
  };

  const saveNote = async (event) => {
    event.preventDefault();
    const content = noteDraft.trim();
    if (!activeSubject || !activeTopic) return showToast('Choose a subject and topic first.');
    if (content.length < 3) return showToast('Please write at least 3 characters in your note.');
    if (content.length > 5000) return showToast('Notes can be up to 5,000 characters.');
    setSavingNote(true);
    try {
      const result = await apiRequest('/notes', {
        method: 'POST',
        body: JSON.stringify({
          subjectId: activeSubject.id,
          subjectName: activeSubject.name,
          topicTitle: activeTopic.t,
          content
        })
      });
      setNotes((current) => [result.note, ...current]);
      setNoteDraft('');
      showToast('Note saved to your notebook.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setSavingNote(false);
    }
  };

  const updateNote = async (noteId) => {
    const content = editDraft.trim();
    if (content.length < 3) return showToast('A note must contain at least 3 characters.');
    if (content.length > 5000) return showToast('Notes can be up to 5,000 characters.');
    setSavingNote(true);
    try {
      const result = await apiRequest(`/notes/${noteId}`, {
        method: 'PATCH', body: JSON.stringify({ content })
      });
      setNotes((current) => current.map((note) => note._id === noteId ? result.note : note));
      setEditingNoteId('');
      setEditDraft('');
      showToast('Your changes have been saved.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    try {
      await apiRequest(`/notes/${noteId}`, { method: 'DELETE' });
      setNotes((current) => current.filter((note) => note._id !== noteId));
      if (editingNoteId === noteId) setEditingNoteId('');
      showToast('Note deleted.');
    } catch (error) {
      showToast(error.message);
    }
  };

  const navigateToNoteTopic = (note) => {
    const subject = subjects.find((item) => item.id === note.subjectId);
    const index = subject?.topics.findIndex((topic) => topic.t === note.topicTitle) ?? -1;
    if (subject && index >= 0) openTopic(subject.id, index);
    else setView('home');
  };

  const startSearch = (value) => {
    setSearchTerm(value);
    setView(value.trim() ? 'search' : 'home');
  };

  const formattedDate = (date) => new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(date));

  const totalTopics = subjects.reduce((total, subject) => total + subject.topics.length, 0);

  const refreshAdminData = async () => {
    if (user?.role !== 'admin') return;
    try {
      const [dashboard, usersResult, resourceResult] = await Promise.all([
        apiRequest('/admin/dashboard'),
        apiRequest('/admin/users'),
        apiRequest('/admin/resources')
      ]);
      setAdminData(dashboard);
      setAdminUsers(usersResult.users || []);
      setAdminResources(resourceResult.resources || []);
      const shared = await apiRequest('/resources');
      setResources(shared.resources || []);
    } catch (error) {
      showToast(error.message);
    }
  };

  const openAdmin = async () => {
    setView('admin');
    setSearchTerm('');
    setMobileMenuOpen(false);
    await refreshAdminData();
  };

  const createAdminResource = async (event) => {
    event.preventDefault();
    setAdminFormError('');
    const title = adminForm.title.trim();
    const content = adminForm.content.trim();
    if (title.length < 4 || title.length > 120) return setAdminFormError('Title must be between 4 and 120 characters.');
    if (!adminForm.subjectId || !adminForm.topicTitle) return setAdminFormError('Please choose a subject and topic.');
    if (content.length < 20 || content.length > 8000) return setAdminFormError('Study material must be between 20 and 8,000 characters.');
    setAdminBusy(true);
    try {
      await apiRequest('/admin/resources', {
        method: 'POST',
        body: JSON.stringify({ ...adminForm, title, content, status: 'published' })
      });
      setAdminForm({ title: '', subjectId: subjects[0]?.id || '', topicTitle: subjects[0]?.topics?.[0]?.t || '', content: '' });
      await refreshAdminData();
      showToast('Study resource published for all students.');
    } catch (error) {
      setAdminFormError(error.message);
    } finally {
      setAdminBusy(false);
    }
  };

  const deleteAdminResource = async (resourceId) => {
    if (!window.confirm('Delete this shared study resource? Students will no longer see it.')) return;
    try {
      await apiRequest(`/admin/resources/${resourceId}`, { method: 'DELETE' });
      await refreshAdminData();
      showToast('Shared resource deleted.');
    } catch (error) { showToast(error.message); }
  };

  const selectedAdminSubject = subjects.find((subject) => subject.id === adminForm.subjectId) || subjects[0];

  if (booting) {
    return <div className="boot-screen"><div className="brand-mark large">N</div><div className="loader-line" /><p>Getting your study space ready…</p></div>;
  }

  if (!token || !user) {
    return (
      <div className="auth-layout">
        <div className="auth-art">
          <div className="auth-art-top"><div className="brand-lockup"><span className="brand-mark">N</span><span>notes<span>hub</span></span></div><span className="art-label">A little more organised, every day.</span></div>
          <div className="art-copy">
            <span className="eyebrow light"><Sparkles size={14} /> YOUR PERSONAL STUDY SPACE</span>
            <h1>Good notes.<br /><em>Clear mind.</em><br />Better days.</h1>
            <p>Bring your subjects, important concepts and personal notes together in one calm place.</p>
          </div>
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="auth-art-footer"><span>Made for curious minds.</span><span>01 / 04</span></div>
        </div>
        <div className="auth-panel">
          <div className="auth-panel-top"><span className="mobile-brand"><span className="brand-mark">N</span> noteshub</span><span className="secure-note"><ShieldCheck size={15} /> Secure sign in</span></div>
          <div className="auth-card-wrap">
            <div className="auth-heading"><span className="eyebrow">LET'S GET STARTED</span><h2>{authMode === 'signup' ? 'Create your space' : 'Welcome back'}</h2><p>{authMode === 'signup' ? 'A fresh space for everything you are learning.' : 'Pick up where you left off. Your notes are right here.'}</p></div>
            <div className="auth-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthError(''); }}>Log in</button><button className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Create account</button></div>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && <label className="field"><span>Your name</span><div className="input-wrap"><UserRound size={17} /><input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="What should we call you?" minLength={2} maxLength={60} autoComplete="name" required /></div></label>}
              <label className="field"><span>Email address</span><div className="input-wrap"><Mail size={17} /><input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" maxLength={254} autoComplete="email" required /></div></label>
              <label className="field"><span>Password</span><div className="input-wrap"><LockKeyhole size={17} /><input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Enter your password'} minLength={authMode === 'signup' ? 8 : 1} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} required /></div>{authMode === 'signup' && <small className="auth-password-hint">Use 8+ characters with uppercase, lowercase and a number.</small>}</label>
              {authError && <div className="form-error" role="alert">{authError}</div>}
              <button className="primary-btn auth-submit" type="submit" disabled={authBusy}>{authBusy ? <span className="button-spinner" /> : <>{authMode === 'signup' ? 'Create my account' : 'Log in to NotesHub'} <ArrowRight size={17} /></>}</button>
            </form>
            <p className="auth-footnote"><ShieldCheck size={15} /> Your account and personal notes are stored securely.</p><p className="auth-demo-hint">Demo student and administrator access are provided in the project README after running the seed command.</p>
          </div>
          <div className="auth-bottom"><span>© {new Date().getFullYear()} NotesHub</span><span>Learn something good today ✦</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><span className="brand-mark">N</span><span>notes<span>hub</span></span><button className="icon-btn mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="main-nav">
          <button className={view === 'home' || view === 'reader' ? 'selected' : ''} onClick={() => { setView('home'); setSearchTerm(''); setMobileMenuOpen(false); }}><Layers3 size={18} /> <span>Explore subjects</span></button>
          <button className={view === 'notes' ? 'selected' : ''} onClick={() => { setView('notes'); setSearchTerm(''); setMobileMenuOpen(false); }}><Bookmark size={18} /> <span>My notebook</span><span className="nav-count">{notes.length}</span></button>
          <button className={view === 'resources' ? 'selected' : ''} onClick={() => { setView('resources'); setSearchTerm(''); setMobileMenuOpen(false); }}><FileText size={18} /> <span>Class resources</span><span className="nav-count">{resources.length}</span></button>
          {user.role === 'admin' && <button className={view === 'admin' ? 'selected' : ''} onClick={openAdmin}><Shield size={18} /> <span>Admin dashboard</span></button>}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-section-head"><span className="sidebar-section-label">YOUR SUBJECTS</span><span className="subject-count">{subjects.length}</span></div>
        <nav className="subject-nav">
          {subjects.map((subject) => <button key={subject.id} className={activeSubjectId === subject.id && view !== 'notes' ? 'active' : ''} onClick={() => openSubject(subject.id)}><span className="subject-dot" style={{ background: subject.c }} /><span>{subject.name}</span><span className="subject-topic-count">{subject.topics.length}</span></button>)}
        </nav>
        <div className="sidebar-bottom-card"><div className="sidebar-spark"><Sparkles size={17} /></div><b>Small steps add up.</b><p>A few minutes of learning today can make tomorrow easier.</p></div>
        <div className="sidebar-user"><div className="avatar">{user.name.charAt(0).toUpperCase()}</div><div className="user-meta"><b>{user.name}</b><span>{user.email}</span></div><button className="icon-btn logout-btn" onClick={handleLogout} title="Log out" aria-label="Log out"><LogOut size={17} /></button></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-btn menu-toggle" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{view === 'notes' ? 'My notebook' : view === 'reader' ? 'Reading room' : view === 'search' ? 'Search results' : view === 'resources' ? 'Class resources' : view === 'admin' ? 'Admin dashboard' : 'Explore'}</b></div></div>
          <div className="topbar-actions"><div className="top-search"><Search size={17} /><input aria-label="Search study notes" value={searchTerm} onChange={(event) => startSearch(event.target.value)} placeholder="Search topics, concepts…" /><kbd>⌘ K</kbd></div><button className="icon-btn theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label="Toggle theme">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><div className="top-avatar" title={user.name}>{user.name.charAt(0).toUpperCase()}</div></div>
        </header>

        <div className="page-content">
          {view === 'home' && (
            <>
              <section className="welcome-banner">
                <div className="welcome-copy"><span className="eyebrow"><Sparkles size={14} /> YOUR LEARNING CORNER</span><h1>Hey, {user.name.split(' ')[0]} <span className="wave">✦</span><br />Ready to learn something?</h1><p>Your study space is looking good. Pick a subject and take it one topic at a time.</p><button className="banner-btn" onClick={() => activeSubject?.topics?.length && openTopic(activeSubject.id, 0)}>Start learning <ArrowRight size={16} /></button></div>
                <div className="welcome-illustration" aria-hidden="true"><div className="illo-circle circle-back" /><div className="illo-book"><div className="book-spine" /><div className="book-page"><span /><span /><span /><span /></div></div><div className="illo-star star-a">✦</div><div className="illo-star star-b">✧</div><div className="illo-pencil" /></div>
              </section>

              <section className="stat-grid">
                <div className="stat-card"><div className="stat-icon purple"><BookOpen size={19} /></div><div><strong>{subjects.length}</strong><span>Subjects to explore</span></div></div>
                <div className="stat-card"><div className="stat-icon green"><Layers3 size={19} /></div><div><strong>{totalTopics}</strong><span>Topics ready to read</span></div></div>
                <div className="stat-card"><div className="stat-icon orange"><Bookmark size={19} /></div><div><strong>{notes.length}</strong><span>Notes in your notebook</span></div></div>
              </section>

              <div className="section-heading"><div><span className="eyebrow">PICK UP A SUBJECT</span><h2>Your learning library</h2><p>Choose a subject to see its topics and study material.</p></div><span className="section-side-note"><GraduationCap size={17} /> Made for your study routine</span></div>
              <section className="subject-grid">
                {subjects.map((subject, index) => <button className={`subject-card subject-card-${index % 5}`} key={subject.id} onClick={() => openSubject(subject.id)}><div className="subject-card-top"><span className="subject-card-icon" style={{ color: subject.c, background: `${subject.c}15` }}>{subject.id === 'dotnet' ? 'C#' : subject.id === 'mern' ? 'JS' : subject.id === 'dm' ? '▥' : subject.id === 'cyber' ? '⌁' : '⌘'}</span><span className="card-arrow"><ArrowRight size={16} className="diagonal-arrow" /></span></div><h3>{subject.name}</h3><p>{subject.d}</p><div className="subject-card-bottom"><span>{subject.topics.length} topics</span><span className="read-link">Explore <ArrowRight size={14} /></span></div><div className="card-accent" style={{ background: subject.c }} /></button>)}
              </section>
              {activeSubject && <section className="topic-library"><div className="topic-library-heading"><div><span className="eyebrow">NOW EXPLORING</span><h2>{activeSubject.name} topics</h2><p>{activeSubject.d} · {activeSubject.topics.length} topics to work through</p></div><span className="topic-library-count">{activeSubject.topics.length} LESSONS</span></div><div className="topic-tile-grid">{activeSubject.topics.map((topic, index) => <button className="topic-tile" key={`${activeSubject.id}-${index}`} onClick={() => openTopic(activeSubject.id, index)}><span className="topic-tile-number" style={{ color: activeSubject.c, background: `${activeSubject.c}16` }}>{String(index + 1).padStart(2, '0')}</span><span className="topic-tile-copy"><b>{topic.t}</b><small>{activeSubject.name} · Study notes</small></span><ArrowRight size={16} /></button>)}</div></section>}
            </>
          )}

          {view === 'resources' && (
            <section className="content-section">
              <div className="section-heading"><div><span className="eyebrow">SHARED BY YOUR FACULTY / ADMIN</span><h2>Class resources</h2><p>Published study material is shared with every NotesHub student.</p></div><div className="notebook-total"><FileText size={17} /><b>{resources.length}</b><span>resources</span></div></div>
              {resources.length ? <div className="resource-grid">{resources.map((resource) => <article className="resource-card" key={resource._id}><div className="resource-card-top"><span className="saved-note-subject">{resource.subjectName}</span><span className="resource-status"><BadgeCheck size={13} /> Published</span></div><h3>{resource.title}</h3><p className="resource-topic">{resource.topicTitle}</p><div className="resource-body">{resource.content}</div><div className="resource-card-foot"><span>By {resource.createdBy?.name || 'NotesHub Admin'}</span><span>{formattedDate(resource.updatedAt)}</span></div></article>)}</div> : <div className="empty-state"><div className="empty-art"><FileText size={30} /></div><h3>No class resources yet</h3><p>Your administrator can publish shared notes and revision sheets here.</p></div>}
            </section>
          )}

          {view === 'admin' && user.role === 'admin' && (
            <section className="content-section admin-page">
              <div className="admin-heading-row"><div><span className="eyebrow"><Shield size={13} /> ADMINISTRATION</span><h2>Workspace overview</h2><p>Monitor student activity and publish learning material for the whole class.</p></div><button className="secondary-btn refresh-btn" onClick={refreshAdminData}><RefreshCw size={15} /> Refresh data</button></div>
              <div className="admin-stat-grid">
                <article className="admin-stat-card"><span className="admin-stat-icon purple"><Users size={19} /></span><div><strong>{adminData?.stats?.users ?? '—'}</strong><span>Registered accounts</span></div></article>
                <article className="admin-stat-card"><span className="admin-stat-icon green"><NotebookPen size={19} /></span><div><strong>{adminData?.stats?.personalNotes ?? '—'}</strong><span>Personal notes saved</span></div></article>
                <article className="admin-stat-card"><span className="admin-stat-icon orange"><FileText size={19} /></span><div><strong>{adminData?.stats?.publishedResources ?? '—'}</strong><span>Published class resources</span></div></article>
                <article className="admin-stat-card"><span className="admin-stat-icon blue"><Activity size={19} /></span><div><strong>{adminData?.stats?.newUsersThisWeek ?? '—'}</strong><span>New users this week</span></div></article>
              </div>

              <div className="admin-content-grid">
                <section className="admin-panel admin-create-panel">
                  <div className="admin-panel-heading"><div><span className="eyebrow">CONTENT MANAGEMENT</span><h3>Publish a study resource</h3><p>Students can read published resources from Class resources.</p></div><span className="admin-panel-icon"><Send size={17} /></span></div>
                  <form className="admin-resource-form" onSubmit={createAdminResource}>
                    <label className="field"><span>Resource title</span><input value={adminForm.title} onChange={(event) => setAdminForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. MERN Stack – Quick Revision" minLength={4} maxLength={120} required /></label>
                    <div className="admin-form-row">
                      <label className="field"><span>Subject</span><select value={adminForm.subjectId || subjects[0]?.id || ''} onChange={(event) => { const subject = subjects.find((item) => item.id === event.target.value); setAdminForm((current) => ({ ...current, subjectId: event.target.value, topicTitle: subject?.topics?.[0]?.t || '' })); }} required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                      <label className="field"><span>Related topic</span><select value={adminForm.topicTitle} onChange={(event) => setAdminForm((current) => ({ ...current, topicTitle: event.target.value }))} required>{(selectedAdminSubject?.topics || []).map((topic) => <option key={topic.t} value={topic.t}>{topic.t}</option>)}</select></label>
                    </div>
                    <label className="field"><span>Study material <small>{adminForm.content.length}/8000</small></span><textarea className="admin-content-input" value={adminForm.content} onChange={(event) => setAdminForm((current) => ({ ...current, content: event.target.value }))} placeholder="Write clear study material, definitions, examples or revision points…" minLength={20} maxLength={8000} rows={7} required /></label>
                    {adminFormError && <div className="form-error" role="alert">{adminFormError}</div>}
                    <button className="primary-btn" type="submit" disabled={adminBusy}>{adminBusy ? <span className="button-spinner" /> : <><Send size={15} /> Publish to students</>}</button>
                  </form>
                </section>

                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><span className="eyebrow">RECENT SIGNUPS</span><h3>Student accounts</h3><p>Latest registered accounts (up to 8).</p></div><Users size={19} /></div>
                  <div className="admin-user-list">{(adminData?.latestUsers || []).map((account) => <div className="admin-user-row" key={account._id}><span className="avatar">{account.name?.charAt(0)?.toUpperCase()}</span><div className="admin-user-copy"><b>{account.name}</b><span>{account.email}</span><small>ID: {account._id}</small></div><span className={`role-pill ${account.role}`}>{account.role}</span></div>)}{!adminData?.latestUsers?.length && <p className="admin-empty-line">No accounts to display.</p>}</div>
                  <div className="admin-panel-foot">Showing recent registrations. Full list is available below.</div>
                </section>
              </div>

              <div className="admin-content-grid admin-lower-grid">
                <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">ACCOUNT MONITORING</span><h3>All accounts</h3><p>Role, account ID and personal note count.</p></div><Users size={19} /></div>
                  <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Account</th><th>Role</th><th>Notes</th></tr></thead><tbody>{adminUsers.map((account) => <tr key={account._id}><td><b>{account.name}</b><span>{account.email}</span><small>{account._id}</small></td><td><span className={`role-pill ${account.role}`}>{account.role}</span></td><td>{account.noteCount}</td></tr>)}</tbody></table>{!adminUsers.length && <p className="admin-empty-line">Select Refresh data to load all accounts.</p>}</div>
                </section>
                <section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">PERSONAL NOTE ACTIVITY</span><h3>Recent notebook updates</h3><p>Only metadata is displayed; private note content stays hidden.</p></div><Activity size={19} /></div>
                  <div className="admin-activity-list">{(adminData?.latestNoteActivity || []).map((activity) => <div className="admin-activity-row" key={activity.id}><div className="activity-dot" /><div><b>{activity.topicTitle}</b><span>{activity.subjectName} · {activity.owner?.name || 'Account removed'}</span><small>{activity.owner?.email || '—'} · {formattedDate(activity.updatedAt)}</small></div></div>)}{!adminData?.latestNoteActivity?.length && <p className="admin-empty-line">No personal note activity yet.</p>}</div>
                </section>
              </div>

              <section className="admin-panel admin-resource-management"><div className="admin-panel-heading"><div><span className="eyebrow">PUBLISHED LIBRARY</span><h3>Manage class resources</h3><p>These resources are visible to signed-in students.</p></div><FileText size={19} /></div>
                {adminResources.length ? <div className="admin-resource-list">{adminResources.map((resource) => <div className="admin-resource-row" key={resource._id}><div><b>{resource.title}</b><span>{resource.subjectName} · {resource.topicTitle} · {resource.status}</span></div><button className="icon-btn danger" title="Delete resource" aria-label="Delete resource" onClick={() => deleteAdminResource(resource._id)}><Trash2 size={16} /></button></div>)}</div> : <p className="admin-empty-line">No shared resources have been published.</p>}
              </section>
            </section>
          )}

          {view === 'reader' && activeTopic && activeSubject && (
            <div className="reader-layout">
              <div className="reader-main">
                <button className="back-link" onClick={() => setView('home')}><ArrowLeft size={15} /> Back to subjects</button>
                <div className="reader-meta"><span className="topic-chip" style={{ color: activeSubject.c, background: `${activeSubject.c}16` }}>{activeSubject.name}</span><span><Clock3 size={14} /> A quick study read</span><span>Topic {activeTopicIndex + 1} of {activeSubject.topics.length}</span></div>
                <article className="reading-card"><div className="reading-topline"><span className="reading-kicker">THE STUDY NOTES</span><span className="reading-number">{String(activeTopicIndex + 1).padStart(2, '0')} <i>/ {String(activeSubject.topics.length).padStart(2, '0')}</i></span></div><h1>{activeTopic.t}</h1><div className="reading-rule" style={{ background: activeSubject.c }} /><div className="reading-content" dangerouslySetInnerHTML={{ __html: activeTopic.b }} /></article>
                <div className="topic-pager"><button className="pager-btn" disabled={activeTopicIndex === 0} onClick={() => changeTopic(-1)}><ChevronLeft size={17} /><span><small>PREVIOUS</small>Previous topic</span></button><span className="pager-progress">{activeTopicIndex + 1} / {activeSubject.topics.length}</span><button className="pager-btn next" disabled={activeTopicIndex === activeSubject.topics.length - 1} onClick={() => changeTopic(1)}><span><small>NEXT UP</small>Next topic</span><ChevronRight size={17} /></button></div>
              </div>
              <aside className="reader-notebook"><div className="notebook-heading"><div className="notebook-icon"><NotebookPen size={18} /></div><div><b>Your notebook</b><span>Keep the important bits.</span></div></div><form className="quick-note-form" onSubmit={saveNote}><label htmlFor="quickNote">Add a personal note</label><textarea id="quickNote" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="A reminder, a question, something to revise later…" maxLength={5000} rows={5} /><div className="note-form-bottom"><span>{noteDraft.length}/5000</span><button type="submit" className="primary-btn small-btn" disabled={savingNote || !noteDraft.trim()}>{savingNote ? 'Saving…' : <><Plus size={15} /> Save note</>}</button></div></form><div className="saved-notes-head"><span>YOUR NOTES ON THIS TOPIC</span><span>{topicNotes.length}</span></div>{topicNotes.length ? <div className="topic-note-list">{topicNotes.map((note) => <div className="topic-note" key={note._id}>{editingNoteId === note._id ? <><textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} rows={4} maxLength={5000} /><div className="note-actions"><button className="subtle-btn" onClick={() => setEditingNoteId('')} type="button">Cancel</button><button className="mini-save" onClick={() => updateNote(note._id)} type="button" disabled={savingNote}>Save changes</button></div></> : <><p>{note.content}</p><div className="note-actions"><span>{formattedDate(note.updatedAt)}</span><div><button className="icon-btn tiny" onClick={() => { setEditingNoteId(note._id); setEditDraft(note.content); }} title="Edit note"><Pencil size={14} /></button><button className="icon-btn tiny danger" onClick={() => deleteNote(note._id)} title="Delete note"><Trash2 size={14} /></button></div></div></>}</div>)}</div> : <div className="empty-notes"><div><NotebookPen size={20} /></div><b>No personal notes yet</b><p>Jot down a thought or a question. You can come back to it anytime.</p></div>}<button className="all-notes-link" onClick={() => setView('notes')}>Open my full notebook <ArrowRight size={15} /></button></aside>
            </div>
          )}

          {view === 'search' && (
            <section className="content-section"><div className="section-heading search-heading"><div><span className="eyebrow">FIND WHAT YOU NEED</span><h2>Search results</h2><p>{searchResults.length} {searchResults.length === 1 ? 'topic' : 'topics'} found for <b>“{searchTerm}”</b>.</p></div><button className="clear-search" onClick={() => startSearch('')}><X size={15} /> Clear search</button></div>{searchResults.length ? <div className="search-result-list">{searchResults.map(({ subject, topic, index }) => <button className="search-result" key={`${subject.id}-${index}`} onClick={() => openTopic(subject.id, index)}><span className="result-subject-dot" style={{ background: subject.c }} /><span className="result-copy"><small>{subject.name}</small><b>{topic.t}</b><span>{topic.b.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').slice(0, 150)}…</span></span><ArrowRight size={18} /></button>)}</div> : <div className="empty-state"><div className="empty-art"><SearchX size={30} /></div><h3>No matching topics just yet</h3><p>Try a shorter keyword, or search for a subject name such as “MERN” or “Cryptography”.</p><button className="secondary-btn" onClick={() => startSearch('')}>Browse all subjects</button></div>}</section>
          )}

          {view === 'notes' && (
            <section className="content-section"><div className="section-heading"><div><span className="eyebrow">YOUR PERSONAL COLLECTION</span><h2>My notebook</h2><p>Little reminders that make revision easier. Only you can see these notes.</p></div><div className="notebook-total"><Bookmark size={17} /><b>{notes.length}</b><span>{notes.length === 1 ? 'saved note' : 'saved notes'}</span></div></div>{notes.length ? <div className="all-notes-grid">{notes.map((note) => <article className="saved-note-card" key={note._id}><div className="saved-note-top"><span className="saved-note-subject">{note.subjectName}</span><span className="saved-note-date">{formattedDate(note.updatedAt)}</span></div><h3>{note.topicTitle}</h3>{editingNoteId === note._id ? <><textarea className="edit-note-area" value={editDraft} onChange={(event) => setEditDraft(event.target.value)} rows={5} maxLength={5000} /><div className="saved-note-actions"><button className="subtle-btn" onClick={() => setEditingNoteId('')}>Cancel</button><button className="primary-btn small-btn" onClick={() => updateNote(note._id)} disabled={savingNote}>Save changes</button></div></> : <><p className="saved-note-content">{note.content}</p><div className="saved-note-actions"><button className="text-btn" onClick={() => navigateToNoteTopic(note)}>Open topic <ArrowRight size={15} /></button><div><button className="icon-btn tiny" onClick={() => { setEditingNoteId(note._id); setEditDraft(note.content); }} aria-label="Edit note"><Pencil size={15} /></button><button className="icon-btn tiny danger" onClick={() => deleteNote(note._id)} aria-label="Delete note"><Trash2 size={15} /></button></div></div></>}</article>)}</div> : <div className="empty-state notebook-empty"><div className="empty-art"><NotebookPen size={30} /></div><h3>Your notebook is waiting</h3><p>Open any topic and save your own explanation, a question or a quick revision point.</p><button className="primary-btn" onClick={() => setView('home')}>Explore subjects <ArrowRight size={16} /></button></div>}</section>
          )}
        </div>
        <footer className="page-footer"><span>© {new Date().getFullYear()} NotesHub</span><span>Built for learning, one note at a time <span className="footer-star">✦</span></span><button onClick={() => showToast('Need a hand? Reach out to your NotesHub project administrator.')}><CircleHelp size={14} /> Need help?</button></footer>
      </main>
      {toast && <div className="toast-message" role="status"><span><Check size={15} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15} /></button></div>}
    </div>
  );
}

