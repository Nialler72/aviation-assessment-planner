import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, CircleHelp, ClipboardList, Clock3, LayoutDashboard, List, LoaderCircle, Plane, Plus, RefreshCw, Search, TriangleAlert, Users, X } from 'lucide-react';
import { db, demo } from './client';
import { groupWorkload, workloadSummary, GROUPS, LECTURERS, MODULES, TYPES, WEEKS, shiftDate, weekDays, formatDate, groupLabel, inReadingWeek, sampleData, todayDublin, traffic, typeColor, validate, weekCounts, weekStart, workloadLabel, type Assessment, type Draft } from './domain';
import { exportExcel, exportPDF } from './export';

type View = 'Overview' | 'Calendar' | 'Assessments' | 'Analytics' | 'About';
const initialDraft = (): Draft => ({ lecturer: '', module: '', groups: [], type: 'Quiz', title: '', weighting: 0, due_date: '2026-11-02', notes: '' });
const demoKey = 'aviation-planner-demo-v1';
const errorText = (e: unknown) => e instanceof Error ? e.message : (e as { message?: string })?.message || 'Something went wrong. Please try again.';

export default function App() {
  const [view, setView] = useState<View>('Overview');
  const [rows, setRows] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [group, setGroup] = useState('');
  const [module, setModule] = useState('');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Assessment | 'new' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [board, setBoard] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      if (demo) {
        const saved = localStorage.getItem(demoKey);
        setRows(saved ? JSON.parse(saved) : sampleData());
      } else {
        if (!db) throw new Error('Connection settings are missing. Add the Supabase project URL and publishable key.');
        // Fetch every page: Supabase limits a single response to 1,000 rows.
        let all: Assessment[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error: fetchError } = await db.from('assessments').select('*').order('due_date').order('id').range(from, from + 999);
          if (fetchError) throw fetchError;
          all = all.concat(data as Assessment[]);
          if (data.length < 1000) break;
        }
        setRows(all);
      }
      setError('');
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(true), 30000); return () => clearInterval(timer); }, [refresh]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); }, [notice]);
  const filtered = useMemo(() => rows.filter(r => (!group || r.groups.includes(group)) && (!module || r.module === module) && (!query || `${r.title} ${r.lecturer} ${r.module} ${r.type}`.toLowerCase().includes(query.toLowerCase()))).sort((a,b) => a.due_date.localeCompare(b.due_date)), [rows, group, module, query]);
  const counts = weekCounts(filtered);
  const activeGroups = group ? [group] : GROUPS;
  const high = counts.flatMap(([start]) => groupWorkload(filtered, start, activeGroups).filter(x => x.count >= 5).map(x => ({...x, start})));
  const highWeeks = new Set(high.map(x => x.start)).size;
  const upcoming = filtered.filter(r => r.due_date >= todayDublin());
  const extra = counts.filter(([w]) => !WEEKS.some(x => x.start === w)).map(([start]) => ({ start, label: start >= '2026-12-07' ? 'Assessment period' : 'Additional week', short: formatDate(start), reading: false }));
  const weeks = [...WEEKS, ...extra].sort((a,b) => a.start.localeCompare(b.start));
  const scope = `${demo ? 'DEMO DATA | ' : ''}${group ? groupLabel(group) : 'All groups'} | ${module || 'All modules'}${query ? ` | Search: ${query}` : ''}`;
  async function persist(draft: Draft) {
    const invalid = validate(draft); if (invalid) throw new Error(invalid);
    const clean = { ...draft, title: draft.title.trim(), notes: draft.notes.trim() };
    if (demo) {
      const next = editor && editor !== 'new' ? rows.map(r => r.id === editor.id ? { ...r, ...clean } : r) : [...rows, { ...clean, id: crypto.randomUUID() }];
      localStorage.setItem(demoKey, JSON.stringify(next)); setRows(next);
    } else {
      if (!db) throw new Error('Database is not configured.');
      let op;
      if (editor && editor !== 'new') {
        op = db.from('assessments').update(clean).eq('id', editor.id);
        if (editor.updated_at) op = op.eq('updated_at', editor.updated_at);
      } else op = db.from('assessments').insert(clean);
      const { data, error } = await op.select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('This assessment changed or was deleted by someone else. Close this form, refresh the board and try again.');
      await refresh(true);
    }
    setEditor(null); setNotice(demo ? 'Saved in this browser’s demo only.' : 'Assessment saved to the shared board.');
  }
  async function remove(row: Assessment) {
    if (demo) {
      const next = rows.filter(r => r.id !== row.id); localStorage.setItem(demoKey, JSON.stringify(next)); setRows(next);
    } else {
      if (!db) throw new Error('Database is not configured.');
      let op = db.from('assessments').delete().eq('id', row.id);
      if (row.updated_at) op = op.eq('updated_at', row.updated_at);
      const { data, error } = await op.select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('This assessment has changed. Refresh the board before deleting it.');
      await refresh(true);
    }
    setEditor(null); setNotice('Assessment deleted.');
  }
  async function download(kind: 'xlsx' | 'pdf') {
    setExporting(true);
    try { if (kind === 'xlsx') await exportExcel(filtered, scope, activeGroups); else await exportPDF(filtered, scope); }
    catch (e) { setError(`Export failed: ${errorText(e)}`); }
    finally { setExporting(false); }
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setView('Overview'); }}><div className="brand-mark"><Plane size={25}/></div><div><strong>SETU<span>AVIATION</span></strong><small>ASSESSMENT PLANNER</small></div></a>
      <div className="workspace-label">STAFF WORKSPACE</div>
      <nav aria-label="Main navigation">{([
        ['Overview', LayoutDashboard], ['Calendar', CalendarDays], ['Assessments', ClipboardList], ['Analytics', BarChart3],
      ] as const).map(([name,Icon]) => <button key={name} className={`nav-item ${view === name ? 'active' : ''}`} onClick={() => setView(name)}><Icon size={19}/>{name}{name === 'Assessments' && <span className="nav-count">{rows.length}</span>}</button>)}</nav>
      <div className="semester"><div className="semester-icon"><CalendarDays size={18}/></div><small>ACADEMIC YEAR</small><strong>2026 / 2027</strong><span>Year 1 · Semester 1</span><div className="semester-line"/><p>Six groups.<br/>One coordinated schedule.</p></div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setView('About')}><CircleHelp size={19}/>How it works</button><div className="shared"><div className="avatar"><Users size={18}/></div><div><strong>Lecturer workspace</strong><small>Shared access · No sign-in</small></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Aviation <ChevronRight size={14}/><span>Year 1</span><ChevronRight size={14}/><strong>{view}</strong></div><div className="topbar-right"><span className={`status-dot ${demo ? 'demo-dot' : ''}`}/><span>{demo ? 'Demo workspace' : 'Shared workspace'}</span><span className="year-chip">SEMESTER 1</span></div></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow">PLAN TOGETHER. SPREAD THE WORKLOAD.</div><h1>{view === 'Overview' ? <>A clearer view of <span>what’s ahead.</span></> : view === 'Calendar' ? 'Your assessment calendar.' : view === 'Assessments' ? 'Every assessment, in one place.' : view === 'Analytics' ? 'Make space for better learning.' : 'A little coordination goes a long way.'}</h1><p>Year 1 Aviation Continuous Assessment Planner</p></div><button className="primary" onClick={() => setEditor('new')} disabled={loading || !!error}><Plus size={18}/> Add assessment</button></div>
        {demo && <div className="banner demo-banner"><CircleHelp size={18}/><span><strong>Demo mode.</strong> Sample assessments and edits stay in this browser. They are not shared with colleagues.</span></div>}
        {error && <div className="banner error-banner" role="alert"><TriangleAlert size={20}/><div><strong>Unable to load or update the shared board.</strong><p>{error}</p><small>If this is your first setup, run the database script in Supabase’s SQL Editor.</small></div><button onClick={() => void refresh()}>Retry</button></div>}
        {notice && <div className="toast" role="status"><Check size={18}/>{notice}</div>}
        {view === 'About' ? <About/> : <>
          <div className="filters"><label className="search"><Search size={17}/><input aria-label="Search assessments" placeholder="Search assessments, modules, initials…" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Filter by group" value={group} onChange={e => setGroup(e.target.value)}><option value="">All six groups</option>{GROUPS.map(g => <option key={g} value={g}>{groupLabel(g)}</option>)}</select><select aria-label="Filter by module" value={module} onChange={e => setModule(e.target.value)}><option value="">All modules</option>{MODULES.map(m => <option key={m}>{m}</option>)}</select>{(group || module || query) && <button className="text-button" onClick={() => { setGroup(''); setModule(''); setQuery(''); }}>Clear</button>}<button className="icon-button" aria-label="Refresh assessments" title="Refresh assessments" onClick={() => void refresh()}><RefreshCw size={17} className={loading ? 'spin' : ''}/></button></div>
          <div className="stats-grid">
            <Stat label="Scheduled entries" value={filtered.length} detail={group ? groupLabel(group) : 'Across all six groups'} icon={<ClipboardList/>}/>
            <Stat label="Modules represented" value={new Set(filtered.map(r => r.module)).size} detail="Of 5 Year 1 modules" icon={<LayoutDashboard/>}/>
            <Stat label="Upcoming entries" value={upcoming.length} detail="Due today or later · Dublin time" icon={<Clock3/>}/>
            <Stat label="Weeks to review" value={highWeeks} detail="5+ assessments for a group" icon={<Activity/>} alert={high.length > 0}/>
          </div>
          {high.length > 0 && <div className="banner workload-banner"><TriangleAlert size={19}/><span><strong>A little room to rebalance.</strong> {high.map(x => formatDate(x.start) + ', ' + groupLabel(x.group) + ': ' + x.count + ' assessments').join(' · ')}. Consider spreading deadlines where possible.</span><button className="text-button" onClick={() => setView('Analytics')}>View workload <ArrowRight size={15}/></button></div>}
          {loading && <div className="loading" role="status"><LoaderCircle className="spin" size={20}/> Loading assessments…</div>}
          {(view === 'Overview' || view === 'Calendar' || view === 'Assessments') && <section className="panel calendar-panel"><div className="section-heading"><div><h2>{view === 'Assessments' ? 'Assessment register' : selectedWeek ? 'Your week, day by day' : 'The semester at a glance'}</h2><p>{view === 'Assessments' ? 'Select an assessment to view, edit or delete it.' : selectedWeek ? 'Your group, module and search filters still apply. Exports include all matching weeks.' : 'Click a week heading to explore its daily schedule.'}</p></div><div className="section-actions">{view !== 'Assessments' && !selectedWeek && <div className="segmented"><button aria-label="Board view" aria-pressed={board} className={board ? 'selected' : ''} onClick={() => setBoard(true)}><CalendarDays size={16}/>Board</button><button aria-label="List view" aria-pressed={!board} className={!board ? 'selected' : ''} onClick={() => setBoard(false)}><List size={16}/>List</button></div>}<button className="export-button" disabled={exporting || loading || !!error} onClick={() => void download('xlsx')}><ArrowDownToLine size={16}/>{exporting ? 'Exporting…' : 'Excel'}</button><button className="export-button" disabled={exporting || loading || !!error} onClick={() => void download('pdf')}>PDF</button></div></div>
            {view !== 'Assessments' && selectedWeek ? <WeekDetail start={selectedWeek} rows={filtered} groups={activeGroups} onNavigate={setSelectedWeek} onBack={() => setSelectedWeek(null)} onSelect={setEditor} onAdd={date => setEditor({ ...initialDraft(), id: '', due_date: date, groups: group ? [group] : [], module })} disabled={loading || !!error}/> : view !== 'Assessments' && board ? <><div className="board-scroll" tabIndex={0} aria-label="Weekly calendar; scroll horizontally for additional weeks"><div className="week-board" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(190px, 1fr))` }}>{weeks.map(w => {
              const items = filtered.filter(r => weekStart(r.due_date) === w.start);
              const summary = workloadSummary(filtered, w.start, activeGroups);
              return <div className={`week-column ${w.reading ? 'reading' : ''}`} key={w.start}><button className="week-head week-open" aria-label={`View days for ${w.label}, ${formatDate(w.start)} ${w.start.slice(0,4)}`} onClick={() => setSelectedWeek(w.start)}><div><small>{w.label}</small><h3>{w.short}<span className="count">{items.length} entries</span></h3><span className="week-open-hint">View days <ChevronRight size={12}/></span></div><span className={`week-indicator ${traffic(summary.max)}`} title={workloadLabel(summary.max)}/></button><GroupLoad rows={filtered} start={w.start} groups={activeGroups}/>{w.reading && <div className="reading-note"><CalendarDays size={17}/><strong>Reading Week</strong><span>26–30 October<br/>Assessments are allowed.</span></div>}<div className="week-cards">{items.map(r => <AssessmentCard key={r.id} row={r} onClick={() => setEditor(r)}/>)}{!items.length && !w.reading && <div className="week-empty">A little breathing room.<br/><span>No assessments scheduled</span></div>}</div><button className="week-add" onClick={() => setEditor({ ...initialDraft(), id: '', due_date: w.start })} disabled={!!error}><Plus size={14}/>Add to this week</button></div>;
            })}</div></div><div className="legend">{[['green','Quiz'],['yellow','Lab report'],['orange','Class test'],['red','Project / submission'],['blue','Presentation'],['purple','Practical / other']].map(([c,t]) => <span key={c}><i className={`legend-dot ${c}`}/>{t}</span>)}<span className="legend-note">Assessment period begins 7 December · All dates allowed</span></div></> : <AssessmentTable rows={filtered} onSelect={setEditor}/>}
          </section>}
          {(view === 'Overview' || view === 'Analytics') && <div className="analytics-grid"><section className="panel"><div className="section-heading"><div><h2>Weekly workload</h2><p>Assessments per group per week. Entry totals are shown separately.</p></div><BarChart3 size={20}/></div><WorkloadChart rows={filtered} weeks={weeks} groups={activeGroups}/><div className="traffic-legend"><span><i className="legend-dot green"/>1–2 Balanced</span><span><i className="legend-dot amber"/>3–4 Busy</span><span><i className="legend-dot red"/>5+ High workload</span></div></section><section className="panel"><div className="section-heading"><div><h2>{view === 'Analytics' ? 'Assessments by module' : 'Coming up next'}</h2><p>{view === 'Analytics' ? 'Scheduled entries by module.' : 'The next deadlines on the shared schedule.'}</p></div></div>{view === 'Analytics' ? <div className="module-list">{MODULES.map(m => <div key={m}><span>{m}</span><strong>{filtered.filter(r => r.module === m).length}</strong></div>)}</div> : <div className="upcoming-list">{upcoming.slice(0,4).map(r => <button key={r.id} onClick={() => setEditor(r)}><div className="date-tile"><strong>{r.due_date.slice(8)}</strong><small>{formatDate(r.due_date).split(' ')[1]}</small></div><div><strong>{r.title}</strong><small>{r.module} · {r.lecturer}</small></div><ChevronRight size={16}/></button>)}{!upcoming.length && <p className="empty-state">No upcoming assessments in this selection.</p>}</div>}</section></div>}
          {view === 'Analytics' && <section className="panel"><div className="section-heading"><div><h2>Workload by group</h2><p>Each cell counts the assessments affecting that group in that week.</p></div></div><div className="table-scroll"><table><thead><tr><th>Group</th>{weeks.map(w => <th key={w.start}>{w.short}</th>)}</tr></thead><tbody>{GROUPS.filter(g => !group || group === g).map(g => <tr key={g}><th>{groupLabel(g)}</th>{weeks.map(w => { const n = filtered.filter(r => r.groups.includes(g) && weekStart(r.due_date) === w.start).length; return <td key={w.start}><span className={`heat-cell ${traffic(n)}`} title={workloadLabel(n)}>{n}</span></td>; })}</tr>)}</tbody></table></div></section>}
        </>}
        <footer><span><Plane size={14}/> SETU Aviation · Assessment coordination</span><span>{demo ? 'Local demonstration' : 'Shared board · Refreshes every 30 seconds'}<span className="footer-separator">/</span> Academic year 2026–27</span></footer>
      </main>
    </div>
    {editor && <Editor row={editor === 'new' || !editor.id ? null : editor} seed={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSave={async d => {
      // A week-specific draft has no database id and must be inserted.
      if (editor !== 'new' && !editor.id) {
        const invalid = validate(d); if (invalid) throw new Error(invalid);
        if (demo) { const next = [...rows,{ ...d, id: crypto.randomUUID() }]; localStorage.setItem(demoKey,JSON.stringify(next)); setRows(next); }
        else { if (!db) throw new Error('Database is not configured.'); const { error } = await db.from('assessments').insert(d); if (error) throw error; await refresh(true); }
        setEditor(null); setNotice(demo ? 'Saved in this browser’s demo only.' : 'Assessment saved to the shared board.');
      } else await persist(d);
    }} onDelete={remove}/>}
  </div>;
}
function WeekDetail({start, rows, groups, onNavigate, onBack, onSelect, onAdd, disabled}: {
  start: string; rows: Assessment[]; groups: string[]; onNavigate: (date: string) => void; onBack: () => void;
  onSelect: (row: Assessment) => void; onAdd: (date: string) => void; disabled: boolean;
}) {
  const days = weekDays(start);
  const label = WEEKS.find(w => w.start === start)?.label || (start >= '2026-12-07' ? 'Assessment period' : 'Additional week');
  const count = rows.filter(r => weekStart(r.due_date) === start).length;
  return <div className="week-detail">
    <div className="week-toolbar">
      <button onClick={onBack}>← Back to semester</button>
      <div className="week-range" aria-live="polite"><h3>{label} · {formatDate(start)} {start.slice(0,4)} – {formatDate(days[6])} {days[6].slice(0,4)}</h3><p>{count} scheduled entries in this selection</p><GroupLoad rows={rows} start={start} groups={groups}/></div>
      <div className="week-navigation"><button aria-label="Previous week" onClick={() => onNavigate(shiftDate(start,-7))}>← Previous</button><button aria-label="Next week" onClick={() => onNavigate(shiftDate(start,7))}>Next →</button></div>
    </div>
    <div className="daily-scroll" tabIndex={0} aria-label="Daily assessment calendar, Monday to Sunday">
      <div className="daily-grid">{days.map((date,i) => {
        const items = rows.filter(r => r.due_date === date);
        const day = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i];
        return <section className={`day-column ${i >= 5 ? 'weekend' : ''}`} key={date} aria-label={`${day}, ${formatDate(date)}`}>
          <div className="day-heading"><h3>{day}</h3><span>{formatDate(date)}</span><span className="count">{items.length}</span></div>
          <div className="week-cards">{items.map(r => <AssessmentCard key={r.id} row={r} onClick={() => onSelect(r)}/>)}{!items.length && <p className="day-empty">No assessments</p>}</div>
          <button className="week-add" disabled={disabled} aria-label={`Add assessment on ${day}, ${formatDate(date)}`} onClick={() => onAdd(date)}><Plus size={14}/>Add assessment</button>
        </section>;
      })}</div>
    </div>
  </div>;
}
function Stat({ label, value, detail, icon, alert = false }: { label: string; value: number; detail: string; icon: React.ReactNode; alert?: boolean }) {
  return <div className={`stat-card ${alert ? 'stat-alert' : ''}`}><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><strong>{value.toString().padStart(2,'0')}</strong><small>{detail}</small></div>;
}
function AssessmentCard({row,onClick}: { row: Assessment; onClick: () => void }) {
  return <button className={`assessment-card type-${typeColor(row.type)}`} onClick={onClick}><span className={`type-pill ${typeColor(row.type)}`}>{row.type}</span><small className="card-module">{row.module}</small><strong>{row.title}</strong><div className="card-meta"><span>{formatDate(row.due_date)}</span><span>{row.weighting}%</span></div><div className="card-bottom"><span className="initials">{row.lecturer}</span><span>{row.groups.length === 6 ? 'All six Aviation groups' : row.groups.map(groupLabel).join(', ')}</span></div></button>;
}
function AssessmentTable({rows,onSelect}: { rows: Assessment[]; onSelect: (r: Assessment) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>Assessment</th><th>Module</th><th>Lecturer</th><th>Type</th><th>Due</th><th>Weight</th><th>Groups</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><button className="table-link" onClick={() => onSelect(r)}>{r.title}</button></td><td>{r.module}</td><td>{r.lecturer}</td><td><span className={`type-pill ${typeColor(r.type)}`}>{r.type}</span></td><td className="nowrap">{formatDate(r.due_date)} {r.due_date.slice(0,4)}</td><td>{r.weighting}%</td><td>{r.groups.map(groupLabel).join(', ')}</td></tr>)}</tbody></table>{!rows.length && <div className="empty-state"><ClipboardList size={28}/><h3>No assessments here yet</h3><p>Add an assessment or adjust your filters to get started.</p></div>}</div>;
}
function Editor({ row, seed, onClose, onSave, onDelete }: { row: Assessment | null; seed?: Assessment; onClose: () => void; onSave: (d: Draft) => Promise<void>; onDelete: (r: Assessment) => Promise<void> }) {
  const [draft,setDraft] = useState<Draft>(() => { const r = row || seed; return r ? { lecturer:r.lecturer,module:r.module,groups:r.groups,type:r.type,title:r.title,weighting:r.weighting,due_date:r.due_date,notes:r.notes } : initialDraft(); });
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [confirm,setConfirm] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { await onSave(draft); } catch(e) { setError(errorText(e)); } finally { setBusy(false); } }
  async function del() { if (!row) return; setBusy(true); setError(''); try { await onDelete(row); } catch(e) { setError(errorText(e)); } finally { setBusy(false); } }
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="editor-title"><form onSubmit={submit}><div className="modal-heading"><div><div className="eyebrow">SHARED ASSESSMENT BOARD</div><h2 id="editor-title">{row ? 'Edit assessment' : 'Plan an assessment'}</h2><p>Help colleagues see what’s ahead for your students.</p></div><button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Close form"><X/></button></div><div className="form-body"><label>Assessment title<input autoFocus required maxLength={160} placeholder="e.g. Principles of flight quiz" value={draft.title} onChange={e => set('title',e.target.value)}/></label><div className="form-grid"><label>Lecturer initials<select required value={draft.lecturer} onChange={e => set('lecturer',e.target.value)}><option value="">Select lecturer</option>{LECTURERS.map(l => <option key={l}>{l}</option>)}</select><small>PGi / PGo distinguish the two PG lecturers</small></label><label>Assessment type<select value={draft.type} onChange={e => set('type',e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></label></div><label>Module<select required value={draft.module} onChange={e => set('module',e.target.value)}><option value="">Select module</option>{MODULES.map(m => <option key={m}>{m}</option>)}</select></label><fieldset><legend>Groups affected</legend><div className="group-options">{GROUPS.map(g => <label key={g}><input type="checkbox" checked={draft.groups.includes(g)} onChange={e => set('groups',e.target.checked ? [...draft.groups,g] : draft.groups.filter(x => x !== g))}/>{groupLabel(g)}</label>)}</div><button type="button" className="text-button" onClick={() => set('groups',draft.groups.length === 6 ? [] : [...GROUPS])}>{draft.groups.length === 6 ? 'Clear groups' : 'Select all six groups'}</button></fieldset><div className="form-grid"><label>Due date<input type="date" required value={draft.due_date} onChange={e => set('due_date',e.target.value)}/></label><label>Assessment weighting (%)<input type="number" min={0} max={100} step={0.1} required value={draft.weighting} onChange={e => set('weighting',e.target.valueAsNumber)}/></label></div>{inReadingWeek(draft.due_date) && <div className="banner demo-banner"><CircleHelp size={18}/><span>This falls in Reading Week. You can still schedule and save it.</span></div>}{draft.due_date >= '2026-12-07' && <div className="form-hint">This falls in the December assessment period. It will appear in its own calendar week.</div>}<label>Notes <span className="optional">(optional)</span><textarea rows={3} maxLength={4000} placeholder="Any useful context for colleagues. Avoid student or personal information." value={draft.notes} onChange={e => set('notes',e.target.value)}/></label><p className="form-hint">Shared board: anyone with access can edit or delete this assessment.</p>{error && <div className="banner error-banner" role="alert">{error}</div>}{confirm && <div className="delete-confirm"><strong>Delete this assessment from the shared board?</strong><p>This cannot be undone.</p><button type="button" className="danger" disabled={busy} onClick={() => void del()}>Yes, delete assessment</button><button type="button" onClick={() => setConfirm(false)}>Keep assessment</button></div>}</div><div className="modal-footer">{row && <button type="button" className="delete-link" disabled={busy} onClick={() => setConfirm(true)}>Delete assessment</button>}<div className="spacer"/><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={17}/> : <Check size={17}/>}Save assessment</button></div></form></dialog>;
}
function GroupLoad({rows,start,groups}: {rows: Assessment[]; start: string; groups: string[]}) {
  const summary = workloadSummary(rows,start,groups);
  return <div className="group-load"><strong className={traffic(summary.max)}>{summary.text} · {workloadLabel(summary.max)}</strong><div>{summary.loads.map(x => <span key={x.group} className={traffic(x.count)}>{groupLabel(x.group)}: {x.count}</span>)}</div></div>;
}
function WorkloadChart({rows,weeks,groups}: {rows: Assessment[]; weeks: {start:string;short:string;label:string}[]; groups:string[]}) {
  const data = weeks.map(w => ({...w, loads: groupWorkload(rows,w.start,groups), entries: rows.filter(r => weekStart(r.due_date) === w.start).length}));
  const scale = Math.max(5,...data.flatMap(w => w.loads.map(x => x.count)));
  return <div className="bar-chart">{data.map(w => <div className="group-chart-week" key={w.start}><h3>{w.label} · {w.short}<small>{w.entries} scheduled entries</small></h3>{w.loads.map(x => <div className="chart-row" key={x.group}><span>{groupLabel(x.group)}</span><div className="bar-track"><div className={'bar '+traffic(x.count)} style={{width: (x.count / scale * 100)+'%'}}/></div><strong>{x.count}</strong><small className={traffic(x.count)}>{workloadLabel(x.count)}</small></div>)}</div>)}</div>;
}
function About() {
  return <section className="panel about"><h2>Year 1 Aviation Continuous Assessment Planner</h2><p>This planner is used to coordinate Continuous Assessments across Year 1 Aviation modules and minimise assessment clustering.</p><h3>One board for all six groups</h3><p>Add an assessment, select the affected groups, and enter a deadline. The calendar, workload dashboard and exports update from the same schedule. Use the group filter to see the workload for a particular group.</p><h3>Shared access, without sign-in</h3><p>Lecturers are identified by initials. Everyone who can access this board can add, edit or delete any assessment. Initials are labels, not verified identities. Avoid student information and confidential notes.</p><h3>All dates are welcome</h3><p>Reading Week is 26–30 October 2026. Weeks 8–12 begin on 2, 9, 16, 23 and 30 November. The assessment period begins on 7 December. Reading Week, exam weeks, weekends and later dates are all allowed; additional calendar columns appear automatically.</p><h3>Reading the workload</h3><p>Workload is calculated separately for each Aviation group each week: green means 1–2 assessments, amber 3–4, and red 5 or more. Zero is neutral. Where group counts differ, the week summary shows their range and the busiest group’s status. Each scheduled entry counts once in the separate overall total, and once for each group it affects in workload calculations. Weights are module percentages and are not added across unrelated modules.</p><h3>Exports and updates</h3><p>Excel and PDF exports include the current group, module and search selection, with all matching dates. The shared board checks for changes every 30 seconds; use Refresh to check immediately.</p></section>;
}


