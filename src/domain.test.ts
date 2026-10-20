import { describe, expect, it } from 'vitest';
import { weekStart, traffic, inReadingWeek, validate, sampleData, weekCounts, LECTURERS, MODULES, TYPES, GROUPS } from './domain';
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
