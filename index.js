// ============================================================
// functions/index.js — تسجيل دخول الطلاب (Server-Side)
// منصة الدكتور في اللغة العربية
//
// ⚠️ الهدف: نقل التحقق من باسورد/كود الطالب من المتصفح (client)
// إلى هنا (سيرفر)، عشان نقدر نقفل "allow read" على students
// في firestore.rules من غير ما نكسر تسجيل الدخول.
//
// بعد الـ deploy، لازم تضيف في index.html قبل app.js:
//   <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-functions-compat.js"></script>
// ============================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// ── تسجيل دخول بالكود (centerCode / doc id / qrCode) ──────────
// centerStudents لسه مقروءة من الكلاينت مباشرة (rules فيها allow read: if true)
// فبنسيبها زي ما هي في app.js. الفنكشن دي بتغطي بس الحالتين اللي كانوا
// بيقروا من "students" مباشرة: doc-id و qrCode.
exports.loginStudentByCode = functions.https.onCall(async (data, context) => {
  const code = String((data && data.code) || '').trim().toUpperCase();
  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'من فضلك ادخل الكود الخاص بك');
  }

  // 1) students doc id
  const docSnap = await db.collection('students').doc(code).get();
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() };
  }

  // 2) qrCode field
  const qrSnap = await db.collection('students').where('qrCode', '==', code).limit(1).get();
  if (!qrSnap.empty) {
    const doc = qrSnap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  throw new functions.https.HttpsError('not-found', 'الكود غير صحيح أو غير مسجل');
});

// ── تسجيل دخول برقم الهاتف + الباسورد ──────────────────────────
exports.loginStudentByPassword = functions.https.onCall(async (data, context) => {
  const phone = String((data && data.phone) || '').trim();
  const password = String((data && data.password) || '');

  if (!phone || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'رقم الموبايل أو كلمة المرور ناقصة');
  }

  const snap = await db.collection('students')
    .where('phone', '==', phone)
    .where('password', '==', password)
    .limit(1)
    .get();

  if (snap.empty) {
    // نفس رسالة الخطأ لحالة "مش موجود" و"باسورد غلط" عشان محدش يقدر
    // يستنتج إن الرقم موجود بس الباسورد غلط (user enumeration)
    throw new functions.https.HttpsError('unauthenticated', 'رقم الموبايل أو كلمة المرور غلط');
  }

  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
});

// ── هل الرقم ده مسجل قبل كده؟ (مستخدمة في صفحة "إنشاء حساب") ────
// بترجع true/false بس، من غير ما تكشف أي بيانات عن الطالب.
exports.checkStudentPhoneExists = functions.https.onCall(async (data, context) => {
  const phone = String((data && data.phone) || '').trim();
  if (!phone) {
    throw new functions.https.HttpsError('invalid-argument', 'رقم الهاتف مطلوب');
  }
  const doc = await db.collection('students').doc(phone).get();
  return { exists: doc.exists };
});

// ── استعادة كلمة المرور (نسيت كلمة المرور) ───────────────────────
// بتتحقق من رقم الاسترداد جوه السيرفر، ولو مطابق بتحدّث الباسورد.
// كده مفيش داعي المتصفح يقرا بيانات الطالب ولا يكتب على مستنده مباشرة.
exports.resetStudentPassword = functions.https.onCall(async (data, context) => {
  const phone = String((data && data.phone) || '').trim();
  const recoveryPhone = String((data && data.recoveryPhone) || '').trim();
  const newPassword = String((data && data.newPassword) || '');

  if (!phone || !recoveryPhone || !newPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'بيانات ناقصة');
  }
  if (newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'كلمة المرور يجب ألا تقل عن 6 خانات');
  }

  const doc = await db.collection('students').doc(phone).get();
  if (!doc.exists || String((doc.data() || {}).recoveryPhone || '') !== recoveryPhone) {
    throw new functions.https.HttpsError('not-found', 'رقم الهاتف أو رقم استعادة الحساب غير مطابقين لبياناتنا.');
  }

  await db.collection('students').doc(phone).update({ password: newPassword });
  return { success: true };
});

// ── تسجيل طالب جديد (كل العملية على السيرفر: فحص التكرار + الحفظ) ────────
// بكده مفيش حاجة بتتكتب مباشرة من المتصفح على collection students
exports.registerStudent = functions.https.onCall(async (data, context) => {
  const phone          = String((data && data.phone)         || '').trim();
  const fatherPhone    = String((data && data.fatherPhone)   || '').trim();
  const recoveryPhone  = String((data && data.recoveryPhone) || '').trim();
  const fullName       = String((data && data.fullName)      || '').trim();
  const school         = String((data && data.school)        || '').trim();
  const grade          = String((data && data.grade)         || '').trim();
  const track          = String((data && data.track)         || '') || null;
  const gov            = String((data && data.gov)           || '').trim();
  const gender         = String((data && data.gender)        || '').trim();
  const password       = String((data && data.password)      || '');

  // التحقق الأساسي من الحقول
  if (!phone || !fullName || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'بيانات التسجيل ناقصة');
  }

  // فحص التكرار — هل الرقم مسجل من قبل؟
  const existing = await db.collection('students').doc(phone).get();
  if (existing.exists) {
    throw new functions.https.HttpsError('already-exists', 'هذا الرقم مسجل بالفعل');
  }

  // بناء مستند الطالب الجديد
  const newStudent = {
    name: fullName, fullName,
    phone, fatherPhone, recoveryPhone,
    school, grade, track, gov, gender, password,
    studentType: 'outside', role: 'student', status: 'pending',
    enrolledCourses: [], qrCode: phone,
    joinDate: new Date().toLocaleDateString('ar-EG'),
    registeredAt: new Date().toISOString()
  };

  await db.collection('students').doc(phone).set(newStudent);
  return { success: true, student: newStudent };
});
