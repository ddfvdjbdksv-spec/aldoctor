// ============================================================
// firebase-sync.js — طبقة المزامنة مع Firebase
// منصة الدكتور في اللغة العربية
//
// ✅ يربط DASH_DB (localStorage) بـ Firestore تلقائياً
// ✅ أي save → بيكتب في Firebase
// ✅ أي delete → بيمسح من Firebase فعلياً
// ✅ لما الداشبورد يفتح → بيحمّل من Firebase وبيملي localStorage
// ✅ مفيش أي تغيير في منطق الداشبورد الموجود
// ============================================================

(function () {
  'use strict';

  // ── انتظر تحميل Firebase ──────────────────────────────────
  function waitForFirebase(cb, tries = 0) {
    if (window.db) { cb(); return; }
    if (tries > 40) { console.warn('[FirebaseSync] Firebase مش موجود — الداشبورد هيشتغل offline فقط'); return; }
    setTimeout(() => waitForFirebase(cb, tries + 1), 150);
  }

  // ══════════════════════════════════════════════════════════
  //  1. COURSES SYNC
  //     البنية في Firestore: platform_data/courses_list → { items: [...] }
  //     (نفس البنية اللي app.js و lessons.html بيقروها)
  // ══════════════════════════════════════════════════════════

  async function pushCoursesToFirebase(courses) {
    try {
      await window.db
        .collection('platform_data')
        .doc('courses_list')
        .set({ items: courses, updatedAt: new Date().toISOString() });
      console.log('[FirebaseSync] ✅ الكورسات اتحفظت في Firebase:', courses.length, 'كورس');
    } catch (err) {
      console.error('[FirebaseSync] ❌ فشل حفظ الكورسات:', err);
    }
  }

  async function pullCoursesFromFirebase() {
    try {
      const doc = await window.db.collection('platform_data').doc('courses_list').get();
      if (!doc.exists) return [];
      const data = doc.data() || {};
      return Array.isArray(data.items) ? data.items :
             Array.isArray(data.courses) ? data.courses :
             Array.isArray(data.list) ? data.list : [];
    } catch (err) {
      console.warn('[FirebaseSync] تعذّر تحميل الكورسات من Firebase:', err);
      return null; // null = فشل الاتصال → نستخدم الكاش
    }
  }

  // ══════════════════════════════════════════════════════════
  //  2. QUIZZES SYNC
  //     البنية في Firestore: quizzes/{quizId} — كل اختبار document لوحده
  //     (نفس البنية اللي tests.html و lessons.html بيقروها)
  // ══════════════════════════════════════════════════════════

  async function pushQuizToFirebase(quiz) {
    try {
      await window.db.collection('quizzes').doc(quiz.id).set(quiz);
      console.log('[FirebaseSync] ✅ الاختبار اتحفظ في Firebase:', quiz.id);
    } catch (err) {
      console.error('[FirebaseSync] ❌ فشل حفظ الاختبار:', err);
    }
  }

  async function deleteQuizFromFirebase(quizId) {
    try {
      await window.db.collection('quizzes').doc(quizId).delete();
      console.log('[FirebaseSync] ✅ الاختبار اتمسح من Firebase:', quizId);
    } catch (err) {
      console.error('[FirebaseSync] ❌ فشل حذف الاختبار:', err);
    }
  }

  async function pullQuizzesFromFirebase() {
    try {
      const snap = await window.db.collection('quizzes').get();
      if (snap.empty) return [];
      const quizzes = [];
      snap.forEach(d => {
        const data = d.data();
        quizzes.push({ ...data, id: data.id || d.id });
      });
      return quizzes;
    } catch (err) {
      console.warn('[FirebaseSync] تعذّر تحميل الاختبارات من Firebase:', err);
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  3. INTERCEPT DASH_DB — بدون تغيير كود الداشبورد
  //     بنضيف Firebase calls فوق الـ localStorage الموجود
  // ══════════════════════════════════════════════════════════

  function installSyncInterceptors() {
    if (!window.DASH_DB) {
      console.warn('[FirebaseSync] DASH_DB مش موجود لسه، هحاول بعد شوية...');
      setTimeout(installSyncInterceptors, 300);
      return;
    }

    const _originalSaveCourses = window.DASH_DB.saveCourses.bind(window.DASH_DB);
    const _originalSaveQuizzes = window.DASH_DB.saveQuizzes.bind(window.DASH_DB);

    // ── Override saveCourses ──
    window.DASH_DB.saveCourses = function (arr) {
      _originalSaveCourses(arr);          // 1. حفظ محلي كالعادة
      pushCoursesToFirebase(arr);         // 2. مزامنة مع Firebase
    };

    // ── Override saveQuizzes ──
    // بنتتبع التغيير: نشوف أي quizzes اتمسحت وأي quizzes اتغيرت
    window.DASH_DB.saveQuizzes = function (arr) {
      const oldQuizzes = window.DASH_DB.getQuizzes();
      _originalSaveQuizzes(arr);          // 1. حفظ محلي كالعادة

      // 2. نشوف الحذوفات
      const newIds = new Set(arr.map(q => q.id));
      oldQuizzes.forEach(oldQ => {
        if (!newIds.has(oldQ.id)) {
          deleteQuizFromFirebase(oldQ.id); // مسح فعلي من Firebase
        }
      });

      // 3. نحفظ كل quiz اتضاف أو اتعدّل
      const oldById = {};
      oldQuizzes.forEach(q => { oldById[q.id] = q; });
      arr.forEach(newQ => {
        const oldQ = oldById[newQ.id];
        // حفظ لو جديد أو اتغيّر
        if (!oldQ || JSON.stringify(oldQ) !== JSON.stringify(newQ)) {
          pushQuizToFirebase(newQ);
        }
      });
    };

    console.log('[FirebaseSync] ✅ Interceptors مثبتة على DASH_DB');
  }

  // ══════════════════════════════════════════════════════════
  //  4. INITIAL LOAD — عند فتح الداشبورد نحمّل من Firebase
  //     ونملي localStorage بأحدث البيانات
  // ══════════════════════════════════════════════════════════

  function showSyncStatus(msg, type = 'info') {
    // إنشاء عنصر الحالة لو مش موجود
    let el = document.getElementById('firebase-sync-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'firebase-sync-status';
      el.style.cssText = `
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        padding:10px 20px; border-radius:12px; font-family:'Tajawal',sans-serif;
        font-size:14px; font-weight:600; direction:rtl; z-index:99999;
        box-shadow:0 4px 20px rgba(0,0,0,.3); transition:opacity .4s;
      `;
      document.body.appendChild(el);
    }

    const colors = {
      info:    { bg: '#1e3a5f', color: '#93c5fd', border: '#3b82f6' },
      success: { bg: '#064e3b', color: '#6ee7b7', border: '#10b981' },
      error:   { bg: '#7f1d1d', color: '#fca5a5', border: '#ef4444' },
    };
    const c = colors[type] || colors.info;

    el.style.background  = c.bg;
    el.style.color       = c.color;
    el.style.border      = `1px solid ${c.border}`;
    el.style.opacity     = '1';
    el.textContent       = msg;

    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  async function initialLoad() {
    showSyncStatus('⏳ جاري تحميل البيانات من Firebase...');

    let anythingLoaded = false;

    // ── تحميل الكورسات ──
    const remoteCourses = await pullCoursesFromFirebase();
    if (remoteCourses !== null) {
      localStorage.setItem('dash_courses', JSON.stringify(remoteCourses));
      anythingLoaded = true;
    }

    // ── تحميل الاختبارات ──
    const remoteQuizzes = await pullQuizzesFromFirebase();
    if (remoteQuizzes !== null) {
      localStorage.setItem('dash_quizzes', JSON.stringify(remoteQuizzes));
      anythingLoaded = true;
    }

    if (anythingLoaded) {
      showSyncStatus('✅ تم تحميل البيانات من Firebase', 'success');

      // إعادة رسم الداشبورد بالبيانات الجديدة
      if (typeof renderCourses === 'function') renderCourses();
      if (typeof renderQuizzes === 'function') renderQuizzes();
      if (typeof renderBank   === 'function') renderBank();
      if (typeof updateStats  === 'function') updateStats();
      if (typeof populateQuizCourseSelect === 'function') populateQuizCourseSelect();
    } else {
      showSyncStatus('⚠️ يعمل من الكاش المحلي (تحقق من الاتصال)', 'error');
    }

    // تثبيت الـ interceptors بعد التحميل
    installSyncInterceptors();
  }

  // ══════════════════════════════════════════════════════════
  //  5. BOOTSTRAP — ابدأ بعد تحميل الصفحة و Firebase
  // ══════════════════════════════════════════════════════════

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForFirebase(initialLoad));
  } else {
    waitForFirebase(initialLoad);
  }

  // ── تصدير للاستخدام اليدوي لو محتاج ──
  window.FirebaseSync = {
    pushCoursesToFirebase,
    pullCoursesFromFirebase,
    pushQuizToFirebase,
    deleteQuizFromFirebase,
    pullQuizzesFromFirebase,
    // مزامنة يدوية كاملة (للطوارئ)
    forceSync: async function () {
      const courses = window.DASH_DB?.getCourses() || [];
      const quizzes = window.DASH_DB?.getQuizzes() || [];
      await pushCoursesToFirebase(courses);
      // مزامنة كل الاختبارات
      for (const q of quizzes) await pushQuizToFirebase(q);
      showSyncStatus('✅ تمت المزامنة الكاملة مع Firebase', 'success');
      console.log('[FirebaseSync] Force sync done:', courses.length, 'كورس,', quizzes.length, 'اختبار');
    }
  };

})();
