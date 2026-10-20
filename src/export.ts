import { type Assessment, groupLabel, weekCounts, workloadLabel } from './domain';
const headings = ['Week beginning', 'Due date', 'Module', 'Assessment', 'Lecturer', 'Type', 'Weighting (%)', 'Groups', 'Notes'];
import { weekStart } from './domain';
const values = (r: Assessment) => [weekStart(r.due_date), r.due_date, r.module, r.title, r.lecturer, r.type, r.weighting, r.groups.map(groupLabel).join(', '), r.notes];
export async function exportExcel(rows: Assessment[], scope: string) {
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  book.creator = 'SETU Aviation Assessment Planner';
  const sheet = book.addWorksheet('Assessments');
  sheet.addRow(['Year 1 Aviation Continuous Assessment Planner']);
  sheet.addRow([scope]);
  sheet.addRow(headings);
  rows.forEach(r => sheet.addRow(values(r)));
  sheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF13283F' } };
  sheet.columns.forEach((c, i) => c.width = [18,16,40,36,26,24,18,48,55][i]);
  sheet.views = [{ state: 'frozen', ySplit: 3 }];
  sheet.autoFilter = { from: 'A3', to: `I${Math.max(3, sheet.rowCount)}` };
  const workload = book.addWorksheet('Weekly workload');
  workload.addRow(['Week beginning', 'Assessments', 'Workload']);
  weekCounts(rows).forEach(([w,n]) => workload.addRow([w,n,workloadLabel(n)]));
  workload.columns.forEach(c => c.width = 24);
  const data = await book.xlsx.writeBuffer();
  download(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'aviation-assessments.xlsx');
}
export async function exportPDF(rows: Assessment[], scope: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(18); doc.text('Year 1 Aviation | Assessment Planner', 14, 17);
  doc.setFontSize(9); doc.text(scope, 14, 24);
  autoTable(doc, {
    startY: 30, head: [headings], body: rows.map(values),
    styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [19,40,63] },
    columnStyles: { 8: { cellWidth: 38 } },
    didDrawPage: () => { doc.setFontSize(8); doc.text(`SETU Aviation - ${doc.getNumberOfPages()}`, 14, 203); },
    margin: { bottom: 15 },
  });
  doc.save('aviation-assessments.pdf');
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
