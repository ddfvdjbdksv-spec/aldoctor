// ============================================================
// إعدادات Firebase الخاصة بمنصة الدكتور في اللغة العربية
// يستخدم Compat SDK لأن dashboard.html بيحمّل:
//   firebase-app-compat.js + firebase-firestore-compat.js
//   + firebase-auth-compat.js + firebase-functions-compat.js
//
// ⚠️ التوجيه الحالي (بعد التراجع عن الخطوة اللي فاتت):
//   1) taninya-dea03  → الـ App الافتراضي (default) — دي القاعدة
//      اللي كل حاجة بتشتغل عليها فعليًا: كورسات / اختبارات /
//      تسجيل دخول / إنشاء حساب / أدمن. هي المطلوب نستخدمها.
//   2) aldoctor-7e153 → App تاني اسمه "secondary" — **للعرض فقط**
//      في الداشبورد (نشوف الطلاب اللي كانوا اتسجلوا عليها في
//      الفترة اللي كانت شغالة فيها بس)، من غير أي كتابة جديدة عليها.
// ============================================================

// ── المشروع الأساسي (taninya) — الافتراضي، وعليه كل حاجة ───────
const firebaseConfigOld = {
  apiKey: "AIzaSyCG6cBPsLRdSZc7r5mOo3hakVMguPI8gt0",
  authDomain: "taninya-dea03.firebaseapp.com",
  projectId: "taninya-dea03",
  storageBucket: "taninya-dea03.firebasestorage.app",
  messagingSenderId: "1014776531393",
  appId: "1:1014776531393:web:7e35de769db3274e044740",
  measurementId: "G-ETT283NP64"
};

// ── مشروع aldoctor — Secondary App، للعرض فقط في الداشبورد ──────
const firebaseConfigLegacy = {
  apiKey: "AIzaSyB6qAG7BUbcaOlsUAeLFhNlnagaHy-XEFc",
  authDomain: "aldoctor-7e153.firebaseapp.com",
  projectId: "aldoctor-7e153",
  storageBucket: "aldoctor-7e153.firebasestorage.app",
  messagingSenderId: "532244052896",
  appId: "1:532244052896:web:84f83cdd097ee81d6982c5",
  measurementId: "G-GLXD2SLFQR"
};

// ── تهيئة الـ App الافتراضي (taninya) ───────────────────────────
firebase.initializeApp(firebaseConfigOld);
window.db   = firebase.firestore();   // Firestore الأساسي (كل حاجة تقريبًا)
window.auth = firebase.auth();        // Auth الأساسي (الأدمن + الطلاب)

// ── تهيئة الـ App التاني (aldoctor) باسم "secondary" ────────────
// ⚠️ للعرض فقط جوه الداشبورد — مفيش أي كتابة جديدة عليه من دلوقتي.
const legacyApp = firebase.initializeApp(firebaseConfigLegacy, "secondary");
window.dbLegacy = legacyApp.firestore();

// ⚠️ إضافة مطلوبة لتسجيل دخول الأدمن فقط: حساب الأدمن (Firebase Authentication)
// لسه مخزّن في مشروع aldoctor القديم، فمحتاجين Auth instance عليه عشان
// "Admin Login" في صفحة تسجيل الدخول يقدر يتحقق منه لو مش لاقي الحساب
// في المشروع الجديد (taninya). ده مش بيأثر على تسجيل دخول/تسجيل الطلاب
// اللي فاضل شغال بالكامل على المشروع الجديد (window.auth / window.db).
window.authLegacy = legacyApp.auth();

// ملحوظة: window.dbNew / window.authNew / window.functionsNew القديمة
// (من التعديل اللي فات) بقوا غير مستخدمين. سيبناهم يشاورو على نفس
// الـ secondary app بس كـ Firestore فقط، عشان أي كود قديم يفضل يشتغل
// بدل ما يكسر فجأة، لكن من غير Auth/Functions حقيقيين عليه.
window.dbNew = window.dbLegacy;
