// ============================================================
// إعدادات Firebase الخاصة بمنصة الدكتور في اللغة العربية
// يستخدم Compat SDK لأن dashboard.html بيحمّل:
//   firebase-app-compat.js + firebase-firestore-compat.js
//   + firebase-auth-compat.js + firebase-functions-compat.js
//
// ✅ التوجيه بعد الرجوع للوضع الطبيعي (يوليو 2026):
//   1) aldoctor-7e153 → الـ App الافتراضي (default) — دي القاعدة
//      الأصلية اللي كل حاجة بترجع تشتغل عليها: كورسات / اختبارات /
//      تسجيل دخول / إنشاء حساب / أدمن.
//   2) taninya-dea03  → App تاني اسمه "secondary" — قاعدة احتياطية
//      بس (كانت الحل المؤقت وقت توقف aldoctor). سايبينها متاحة
//      للرجوع ليها يدويًا لو احتجنا نتأكد من بيانات قديمة، لكن
//      النظام مبقاش بيعتمد عليها في القراءة ولا الكتابة.
//
// ⚠️ لو احتجت رجوع مؤقت لـ taninya كخطة طوارئ، بدّل الترتيب هنا،
//    لكن متنساش إن أي طالب اتسجل بعد كده هيتسجل في المشروع اللي
//    بقى "default" وقتها فقط.
// ============================================================

// ── المشروع الأساسي (aldoctor) — الافتراضي، وعليه كل حاجة ───────
const firebaseConfigPrimary = {
  apiKey: "AIzaSyB6qAG7BUbcaOlsUAeLFhNlnagaHy-XEFc",
  authDomain: "aldoctor-7e153.firebaseapp.com",
  projectId: "aldoctor-7e153",
  storageBucket: "aldoctor-7e153.firebasestorage.app",
  messagingSenderId: "532244052896",
  appId: "1:532244052896:web:84f83cdd097ee81d6982c5",
  measurementId: "G-GLXD2SLFQR"
};

// ── مشروع taninya — Secondary App، احتياطي/طوارئ فقط ─────────────
const firebaseConfigBackup = {
  apiKey: "AIzaSyCG6cBPsLRdSZc7r5mOo3hakVMguPI8gt0",
  authDomain: "taninya-dea03.firebaseapp.com",
  projectId: "taninya-dea03",
  storageBucket: "taninya-dea03.firebasestorage.app",
  messagingSenderId: "1014776531393",
  appId: "1:1014776531393:web:7e35de769db3274e044740",
  measurementId: "G-ETT283NP64"
};

// ── تهيئة الـ App الافتراضي (aldoctor) ──────────────────────────
firebase.initializeApp(firebaseConfigPrimary);
window.db   = firebase.firestore();   // Firestore الأساسي (كل حاجة)
window.auth = firebase.auth();        // Auth الأساسي (الأدمن + الطلاب)

// ── تهيئة الـ App التاني (taninya) باسم "secondary" ──────────────
// ⚠️ احتياطي/طوارئ فقط — مفيش أي كتابة عليه من دلوقتي.
const backupApp = firebase.initializeApp(firebaseConfigBackup, "secondary");
window.dbBackup = backupApp.firestore();

// توافق مع أي كود قديم كان بيستخدم window.dbLegacy / window.dbNew
// (سايبينهم يشاورو على نفس الـ backup app عشان مايكسروش فجأة)
window.dbLegacy = window.dbBackup;
window.dbNew    = window.dbBackup;
