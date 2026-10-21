export const LECTURERS = [
  'NC', 'LF', 'AM', 'CC', 'RM', 'MR', 'JD', 'TC', 'PGi', 'VOB', 'HAJ', 'PGo', 'CK',
] as const;
export const MODULES = [
  'Aviation Science 1', 'Aircraft Anatomy & Design', 'Mathematics 1',
  'Avionics Fundamentals', 'Management Fundamentals & Communication',
] as const;
export const TYPES = ['Quiz', 'Class Test', 'Lab Report', 'Presentation', 'Project Milestone', 'Project Submission', 'Practical Assessment', 'Other'] as const;
export const GROUPS = Array.from({ length: 6 }, (_, i) => `AVIATION_${i + 1}`);
export const groupLabel = (id: string) => id.replace('AVIATION_', 'Aviation ');
export type Assessment = {
  id: string; lecturer: string; module: string; groups: string[];
  type: string; title: string; weighting: number; due_date: string; notes: string;
  updated_at?: string;
};
export type Draft = Omit<Assessment, 'id' | 'updated_at'>;
export const WEEKS = [
  { start: '2026-10-26', label: 'Reading Week', short: '26 Oct', reading: true },
  { start: '2026-11-02', label: 'Week 8', short: '02 Nov', reading: false },
  { start: '2026-11-09', label: 'Week 9', short: '09 Nov', reading: false },
  { start: '2026-11-16', label: 'Week 10', short: '16 Nov', reading: false },
  { start: '2026-11-23', label: 'Week 11', short: '23 Nov', reading: false },
  { start: '2026-11-30', label: 'Week 12', short: '30 Nov', reading: false },
];
export function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function traffic(count: number) {
  return count === 0 ? 'empty' : count <= 2 ? 'green' : count <= 4 ? 'amber' : 'red';
}
export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
export const workloadLabel = (count: number) => ({ empty: 'No assessments', green: 'Balanced', amber: 'Busy', red: 'High workload' })[traffic(count)];
export function typeColor(type: string) {
  return ({ Quiz: 'green', 'Lab Report': 'yellow', 'Class Test': 'orange', Presentation: 'blue', 'Project Milestone': 'red', 'Project Submission': 'red' } as Record<string, string>)[type] || 'purple';
}
export const inReadingWeek = (date: string) => date >= '2026-10-26' && date <= '2026-10-30';
export const formatDate = (date: string) => new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
export const todayDublin = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function weekCounts(rows: Assessment[]) {
  const counts = new Map<string, number>();
  for (const row of rows) { const key = weekStart(row.due_date); counts.set(key, (counts.get(key) || 0) + 1); }
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
export function groupWorkload(rows: Assessment[], start: string, groups: readonly string[] = GROUPS) {
  const items = rows.filter(r => weekStart(r.due_date) === start);
  return groups.map(group => ({ group, count: items.filter(r => r.groups.includes(group)).length }));
}
export function workloadSummary(rows: Assessment[], start: string, groups: readonly string[] = GROUPS) {
  const loads = groupWorkload(rows, start, groups);
  const max = Math.max(0, ...loads.map(x => x.count));
  const min = Math.min(...loads.map(x => x.count));
  const text = groups.length === 1
    ? `${max} assessments for ${groupLabel(groups[0])}`
    : min === max ? `${max} assessments per group` : `${min}–${max} assessments per group`;
  return { max, text, loads };
}
export function validate(d: Draft) {
  if (!(LECTURERS as readonly string[]).includes(d.lecturer)) return 'Select a lecturer.';
  if (!(MODULES as readonly string[]).includes(d.module)) return 'Select a module.';
  if (!(TYPES as readonly string[]).includes(d.type)) return 'Select an assessment type.';
  if (!d.title.trim() || d.title.length > 160) return 'Enter a title of 1–160 characters.';
  if (!d.groups.length || new Set(d.groups).size !== d.groups.length || d.groups.some(g => !GROUPS.includes(g))) return 'Select at least one valid group.';
  if (!Number.isFinite(d.weighting) || d.weighting < 0 || d.weighting > 100) return 'Weighting must be between 0 and 100%.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.due_date) || Number.isNaN(Date.parse(d.due_date)) || new Date(d.due_date).toISOString().slice(0,10) !== d.due_date) return 'Enter a valid due date.';
  if (d.notes.length > 4000) return 'Notes must be no longer than 4,000 characters.';
  return '';
}
export function sampleData(): Assessment[] {
  return [
    ['Principles of flight quiz', 0, 0, 'Quiz', '2026-11-03', 10, [0,1,2]],
    ['Aircraft structures report', 1, 2, 'Lab Report', '2026-11-06', 15, [3,4,5]],
    ['Algebra & trigonometry', 2, 1, 'Class Test', '2026-11-10', 20, [0,1,2,3,4,5]],
    ['Circuit analysis lab', 3, 3, 'Lab Report', '2026-11-12', 10, [0,1,2]],
    ['Team communication', 4, 4, 'Presentation', '2026-11-13', 15, [3,4,5]],
    ['Aerodynamics investigation', 0, 0, 'Lab Report', '2026-11-17', 20, [0,1,2]],
    ['Design concept review', 1, 2, 'Project Milestone', '2026-11-18', 10, [0,1,2,3,4,5]],
    ['Calculus checkpoint', 2, 1, 'Quiz', '2026-11-19', 10, [3,4,5]],
    ['Digital systems test', 3, 3, 'Class Test', '2026-11-20', 20, [0,1,2]],
    ['Management case study', 4, 4, 'Project Submission', '2026-11-20', 25, [0,1,2,3,4,5]],
    ['Flight mechanics test', 0, 0, 'Class Test', '2026-11-24', 25, [0,1,2,3,4,5]],
    ['Aircraft design portfolio', 1, 2, 'Project Submission', '2026-12-03', 30, [0,1,2,3,4,5]],
    ['Avionics practical', 3, 3, 'Practical Assessment', '2026-12-04', 25, [0,1,2]],
  ].map((v, i) => ({
    id: `sample-${i}`,
    title: v[0] as string, module: MODULES[v[1] as number], lecturer: LECTURERS[v[2] as number],
    type: v[3] as string, due_date: v[4] as string, weighting: v[5] as number,
    groups: (v[6] as number[]).map(n => GROUPS[n]), notes: '',
  }));
}
