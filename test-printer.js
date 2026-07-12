/**
 * نظام الطباعة المتقدم لنتائج الاختبارات
 * Advanced Print System for Test Results
 * 
 * يوفر هذا الملف دوال متقدمة لطباعة نتائج الاختبارات بشكل احترافي وشامل
 */

class TestResultsPrinter {
  constructor() {
    this.printWindow = null;
    this.testData = {
      testName: '',
      testDate: new Date().toLocaleDateString('ar-EG'),
      testGrade: '',
      testDuration: '',
      passedStudents: [],
      absentStudents: []
    };
  }

  /**
   * فتح نافذة الطباعة مع البيانات الكاملة
   * Open print window with complete data
   */
  openPrintWindow(testData) {
    this.testData = testData;
    
    const printWindow = window.open('print-results.html', 'PrintResults', 'width=1200,height=800');
    
    if (printWindow) {
      // إرسال البيانات إلى النافذة الجديدة
      setTimeout(() => {
        if (printWindow.document.readyState === 'complete' || printWindow.document.readyState === 'interactive') {
          this.sendDataToPrintWindow(printWindow);
        }
      }, 500);
    } else {
      alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
    }
  }

  /**
   * إرسال البيانات إلى نافذة الطباعة
   */
  sendDataToPrintWindow(printWindow) {
    try {
      printWindow.testData = this.testData;
      
      // تحديث عناصر النافذة
      printWindow.document.getElementById('testName').textContent = this.testData.testName;
      printWindow.document.getElementById('testDate').textContent = this.testData.testDate;
      printWindow.document.getElementById('testGrade').textContent = this.testData.testGrade;
      printWindow.document.getElementById('testDuration').textContent = this.testData.testDuration;
      printWindow.document.getElementById('printDate').textContent = this.testData.testDate;

      // تحميل البيانات
      printWindow.loadPassedStudents();
      printWindow.loadAbsentStudents();
      printWindow.calculateSummary();
    } catch (error) {
      console.error('خطأ في إرسال البيانات:', error);
    }
  }

  /**
   * طباعة نتائج اختبار محدد مع تحديد الصف
   */
  printTestResults(gradeId, testId) {
    // هنا يتم جلب البيانات من API أو قاعدة البيانات
    // This is where you fetch data from API or database
    
    const testData = {
      testName: 'اختبار القراءة المحررة',
      testDate: new Date().toLocaleDateString('ar-EG'),
      testGrade: 'السادس الثانوي',
      testDuration: 'ساعتان',
      passedStudents: [
        // سيتم ملأها من البيانات الحقيقية
      ],
      absentStudents: [
        // سيتم ملأها من البيانات الحقيقية
      ]
    };

    this.openPrintWindow(testData);
  }

  /**
   * طباعة التقرير بتنسيق PDF
   */
  printAsPDF() {
    // هذه دالة متقدمة تتطلب مكتبة html2pdf أو أخرى
    alert('خاصية PDF سيتم إضافتها قريباً');
  }

  /**
   * تحديث بيانات الطلاب الناجحين
   */
  setPassedStudents(students) {
    this.testData.passedStudents = students;
  }

  /**
   * تحديث بيانات الطلاب الغائبين
   */
  setAbsentStudents(students) {
    this.testData.absentStudents = students;
  }

  /**
   * الحصول على ملخص الإحصائيات
   */
  getSummary() {
    const passed = this.testData.passedStudents.length;
    const absent = this.testData.absentStudents.length;
    const total = passed + absent;

    return {
      totalExpected: total,
      passed: passed,
      absent: absent,
      attendanceRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      averageScore: passed > 0 ? (this.testData.passedStudents.reduce((a, b) => a + b.score, 0) / passed).toFixed(1) : 0,
      highestScore: passed > 0 ? Math.max(...this.testData.passedStudents.map(s => s.score)) : 0,
      lowestScore: passed > 0 ? Math.min(...this.testData.passedStudents.map(s => s.score)) : 0
    };
  }
}

/**
 * إنشاء مثيل عام من المطبعة
 */
const testResultsPrinter = new TestResultsPrinter();

/**
 * دالة مساعدة لطباعة النتائج من خلال واجهة الأدمين
 * Helper function to print results from admin interface
 */
function printTestResultsFromAdmin(gradeId, testId) {
  // جلب البيانات من API
  const testData = {
    testName: document.querySelector('[data-test-name]')?.textContent || 'اختبار',
    testDate: new Date().toLocaleDateString('ar-EG'),
    testGrade: document.querySelector('[data-grade-name]')?.textContent || 'الصف',
    testDuration: '60 دقيقة',
    passedStudents: getPassedStudentsFromTable(),
    absentStudents: getAbsentStudentsFromTable()
  };

  testResultsPrinter.openPrintWindow(testData);
}

/**
 * جلب بيانات الطلاب الناجحين من الجدول
 */
function getPassedStudentsFromTable() {
  const students = [];
  const rows = document.querySelectorAll('table#results-table tbody tr');
  
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length > 0 && !cells[cells.length - 1].textContent.includes('غائب')) {
      students.push({
        rank: index + 1,
        name: cells[0]?.textContent.trim() || '',
        rollNo: cells[1]?.textContent.trim() || '',
        score: parseInt(cells[2]?.textContent) || 0,
        total: 100,
        percentage: parseInt(cells[3]?.textContent) || 0,
        grade: getGradeFromPercentage(parseInt(cells[3]?.textContent) || 0)
      });
    }
  });

  return students;
}

/**
 * جلب بيانات الطلاب الغائبين من الجدول
 */
function getAbsentStudentsFromTable() {
  const students = [];
  const rows = document.querySelectorAll('table#results-table tbody tr');
  
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length > 0 && cells[cells.length - 1].textContent.includes('غائب')) {
      students.push({
        rank: index + 1,
        name: cells[0]?.textContent.trim() || '',
        rollNo: cells[1]?.textContent.trim() || '',
        reason: 'غياب'
      });
    }
  });

  return students;
}

/**
 * تحديد التقدير بناءً على النسبة المئوية
 */
function getGradeFromPercentage(percentage) {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * تصدير البيانات إلى Excel
 */
function exportResultsToExcel(gradeId, testId) {
  const summary = testResultsPrinter.getSummary();
  
  // بيانات للتصدير
  const data = [
    ['نتائج الاختبار'],
    ['الصف:', testResultsPrinter.testData.testGrade],
    ['التاريخ:', testResultsPrinter.testData.testDate],
    [],
    ['ملخص الإحصائيات'],
    ['إجمالي الطلاب:', summary.totalExpected],
    ['الطلاب الناجحون:', summary.passed],
    ['الطلاب الغائبون:', summary.absent],
    ['معدل الحضور:', summary.attendanceRate + '%'],
    ['متوسط الدرجات:', summary.averageScore],
    [],
    ['الطلاب الناجحون'],
    ['#', 'اسم الطالب', 'الرقم الجلسة', 'الدرجة', 'النسبة %', 'التقدير']
  ];

  // إضافة بيانات الطلاب الناجحين
  testResultsPrinter.testData.passedStudents.forEach((student, index) => {
    data.push([index + 1, student.name, student.rollNo, student.score, student.percentage + '%', student.grade]);
  });

  // إضافة الطلاب الغائبين
  data.push([], ['الطلاب الغائبون'], ['#', 'اسم الطالب', 'الرقم الجلسة', 'سبب الغياب']);
  testResultsPrinter.testData.absentStudents.forEach((student, index) => {
    data.push([index + 1, student.name, student.rollNo, student.reason]);
  });

  // إنشاء ملف CSV
  const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  // تحميل الملف
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `نتائج_الاختبار_${testResultsPrinter.testData.testGrade}_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * دالة لطباعة النتائج مباشرة باستخدام window.print
 * مع تنسيق احترافي
 */
function printResultsDirectly() {
  window.print();
}

/**
 * تعيين بيانات الاختبار
 */
function setTestData(testData) {
  testResultsPrinter.testData = testData;
}

/**
 * الحصول على بيانات الاختبار الحالية
 */
function getTestData() {
  return testResultsPrinter.testData;
}

/**
 * إعادة تعيين البيانات
 */
function resetTestData() {
  testResultsPrinter = new TestResultsPrinter();
}

// تصدير الدوال والفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TestResultsPrinter,
    testResultsPrinter,
    printTestResultsFromAdmin,
    exportResultsToExcel,
    setTestData,
    getTestData,
    resetTestData
  };
}
