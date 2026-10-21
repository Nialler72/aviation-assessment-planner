import { describe, expect, it } from 'vitest';
import { groupWorkload, workloadSummary, groupLabel, weekStart, traffic, inReadingWeek, validate, sampleData, weekCounts, LECTURERS, MODULES, TYPES, GROUPS } from './domain';
describe('per-group workload', () => {
  const rows = [...GROUPS.map(g => [g]), GROUPS.slice(0,3), GROUPS.slice(3)].map((groups,i) => ({...sampleData()[0],id:String(i),groups,due_date:'2026-12-01'}));
  it('keeps eight entries separate from two assessments per group in Week 12', () => {
    expect(weekCounts(rows)).toEqual([['2026-11-30',8]]);
    expect(groupWorkload(rows,'2026-11-30').map(x => x.count)).toEqual([2,2,2,2,2,2]);
    const summary = workloadSummary(rows,'2026-11-30');
    expect(summary.text).toBe('2 assessments per group');
    expect(traffic(summary.max)).toBe('green');
  });
  it('flags only the overloaded group, including when filtering', () => {
    const extra = Array.from({length:3},(_,i) => ({...rows[0],id:'extra'+i,groups:['AVIATION_4']}));
    const loads = groupWorkload([...rows,...extra],'2026-11-30');
    expect(loads.filter(x => traffic(x.count) === 'red')).toEqual([{group:'AVIATION_4',count:5}]);
    expect(workloadSummary([...rows,...extra],'2026-11-30',['AVIATION_1']).max).toBe(2);
    expect(groupWorkload(rows,'2026-12-07').every(x => x.count === 0)).toBe(true);
    expect(groupLabel('AVIATION_4')).toBe('Aviation 4');
  });
});
describe('academic scheduling', () => {
  it('uses Monday weeks and includes Sunday without timezone drift', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(weekStart('2026-12-13')).toBe('2026-12-07');
  });
  it('has exact workload boundaries', () => {
    expect([0,1,2,3,4,5,20].map(traffic)).toEqual(['empty','green','green','amber','amber','red','red']);
  });
  it('allows reading week, December exam dates and later dates', () => {
    for (const due_date of ['2026-10-26','2026-12-07','2026-12-28','2027-01-05']) expect(validate({...sampleData()[0],due_date})).toBe('');
    expect(inReadingWeek('2026-10-30')).toBe(true);
    expect(inReadingWeek('2026-10-31')).toBe(false);
  });
  it('counts a multi-group assessment once, not once per group', () => {
    const r = {...sampleData()[0], groups: [...GROUPS]};
    expect(weekCounts([r])).toEqual([['2026-11-02',1]]);
  });
  it('rejects invalid fields and impossible dates', () => {
    const r=sampleData()[0];
    for(const change of [{groups:[]},{groups:['AVIATION_7']},{groups:['AVIATION_1','AVIATION_1']},{weighting:101},{weighting:NaN},{title:' '},{due_date:'2026-02-30'},{lecturer:'unknown'}]) expect(validate({...r,...change})).not.toBe('');
  });
  it('retains the required dropdown counts with distinct lecturer initials', () => {
    expect(new Set(LECTURERS).size).toBe(13); expect(MODULES).toHaveLength(5);
    expect(TYPES).toHaveLength(8); expect(GROUPS).toHaveLength(6);
  });
});

describe('daily week navigation', () => {
  it('shows all seven days across month and year boundaries', async () => {
    const {weekDays,shiftDate}=await import('./domain');
    expect(weekDays('2026-12-28')).toEqual(['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
    expect(shiftDate('2026-11-02',-7)).toBe('2026-10-26');
    expect(shiftDate('2026-11-30',7)).toBe('2026-12-07');
    expect(weekDays('2026-10-26')[6]).toBe('2026-11-01');
  });
});
