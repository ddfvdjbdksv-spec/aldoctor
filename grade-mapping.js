// ============================================================
// خريطة الصفوف الدراسية - منصة الدكتور في اللغة العربية
// المنصة مخصصة للمرحلة الثانوية فقط (أولى / ثانية / ثالثة ثانوي)
// ============================================================

const GRADE_LABELS = {
  '1': 'أولى ثانوي',
  '2': 'ثانية ثانوي',
  '3': 'ثالثة ثانوي',
  'all': 'كل الصفوف'
};

const GRADE_ORDER = ['1','2','3'];

// كل الصفوف ثانوية → دايماً بيطلب الشعبة
const SECONDARY_GRADES = ['1','2','3'];

window.gradeLabel = function (g) {
  return GRADE_LABELS[g] || g;
};

window.gradeClass = function (g) {
  return { '1': 'grade1', '2': 'grade2', '3': 'grade3' }[String(g)] || 'grade1';
};

window.isSecondaryGrade = function (g) {
  return SECONDARY_GRADES.includes(String(g));
};

window.normalizeGrade = function (g) {
  if (!g) return 'all';
  const s = String(g).trim();
  return GRADE_ORDER.includes(s) ? s : s;
};

window.buildGradeOptions = function (includeAll = true) {
  let html = includeAll ? `<option value="all">${GRADE_LABELS.all}</option>` : '';
  GRADE_ORDER.forEach(g => {
    html += `<option value="${g}">${GRADE_LABELS[g]}</option>`;
  });
  return html;
};
