// ============================================================
// migrate-taninya-to-aldoctor.js
// ينقل البيانات من taninya-dea03 (المؤقتة) إلى aldoctor-7e153 (الأصلية)
// من غير ما يكرر أي حاجة موجودة بالفعل في aldoctor.
//
// ✅ بيشتغل بوضع DRY RUN افتراضيًا (تقرير بس، مفيش كتابة حقيقية).
// ✅ لتنفيذ النقل فعليًا، شغّله بـ: node migrate-taninya-to-aldoctor.js --live
//
// المتطلبات قبل التشغيل:
//   1) npm install firebase-admin
//   2) نزّل Service Account Key لكل مشروع من:
//      Firebase Console → ⚙️ Project Settings → Service Accounts
//      → Generate new private key
//      واحفظهم هنا باسم:
//        - taninya-service-account.json   (مصدر / source)
//        - aldoctor-service-account.json  (هدف / target)
// ============================================================

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const LIVE = process.argv.includes('--live');

const SOURCE_KEY_PATH = path.join(__dirname, 'taninya-service-account.json');
const TARGET_KEY_PATH = path.join(__dirname, 'aldoctor-service-account.json');

for (const p of [SOURCE_KEY_PATH, TARGET_KEY_PATH]) {
  if (!fs.existsSync(p)) {
    console.error(`❌ ملف مفقود: ${p}`);
    console.error('   نزّل Service Account Key من Firebase Console وحطه بنفس الاسم جنب السكريبت.');
    process.exit(1);
  }
}

const sourceApp = admin.initializeApp(
  { credential: admin.credential.cert(require(SOURCE_KEY_PATH)) },
  'source' // taninya
);
const targetApp = admin.initializeApp(
  { credential: admin.credential.cert(require(TARGET_KEY_PATH)) },
  'target' // aldoctor
);

const sourceDb = sourceApp.firestore();
const targetDb = targetApp.firestore();

// ── تقرير تراكمي ──────────────────────────────────────────────
const report = {
  students: { total: 0, copied: 0, skippedDuplicate: 0, errors: 0 },
};

function logStep(msg) { console.log(`\n${msg}`); }

// ══════════════════════════════════════════════════════════
// 1) STUDENTS — الأهم. تحويد بـ رقم الهاتف (نفس الـ doc id pattern
//    المستخدم في index.js: db.collection('students').doc(phone))
// ══════════════════════════════════════════════════════════
async function migrateStudents() {
  logStep('📚 جاري قراءة الطلاب من taninya-dea03...');
  const sourceSnap = await sourceDb.collection('students').get();
  report.students.total = sourceSnap.size;
  console.log(`   لقيت ${sourceSnap.size} طالب في taninya.`);

  logStep('📚 جاري قراءة الطلاب الموجودين في aldoctor-7e153 (عشان نتجنب التكرار)...');
  const targetSnap = await targetDb.collection('students').get();
  const existingIds = new Set();
  const existingPhones = new Set();
  targetSnap.forEach(doc => {
    existingIds.add(doc.id);
    const phone = String((doc.data() || {}).phone || '').trim();
    if (phone) existingPhones.add(phone);
  });
  console.log(`   لقيت ${targetSnap.size} طالب موجود بالفعل في aldoctor.`);

  const toCopy = [];
  sourceSnap.forEach(doc => {
    const data = doc.data() || {};
    const phone = String(data.phone || '').trim();
    const isDuplicate = existingIds.has(doc.id) || (phone && existingPhones.has(phone));
    if (isDuplicate) {
      report.students.skippedDuplicate++;
    } else {
      toCopy.push({ id: doc.id, data });
    }
  });

  console.log(`\n   ➜ هيتم نسخ: ${toCopy.length} طالب جديد`);
  console.log(`   ➜ هيتم تجاهل (موجودين بالفعل): ${report.students.skippedDuplicate} طالب`);

  if (!LIVE) {
    console.log('   [DRY RUN] مفيش كتابة فعلية. دي أول 5 أسماء هيتم نسخها كمثال:');
    toCopy.slice(0, 5).forEach(s => console.log('     -', s.data.name || s.data.fullName || s.id, '|', s.data.phone));
    return;
  }

  logStep('✍️  جاري الكتابة الفعلية في aldoctor-7e153...');
  let batch = targetDb.batch();
  let opsInBatch = 0;
  for (const s of toCopy) {
    const ref = targetDb.collection('students').doc(s.id);
    batch.set(ref, { ...s.data, _migratedFromTaninya: true, _migratedAt: new Date().toISOString() });
    opsInBatch++;
    report.students.copied++;
    if (opsInBatch >= 400) { // حد أمان أقل من 500 بتاع Firestore batch
      await batch.commit();
      batch = targetDb.batch();
      opsInBatch = 0;
      console.log(`   ... تم نسخ ${report.students.copied} لحد دلوقتي`);
    }
  }
  if (opsInBatch > 0) await batch.commit();
  console.log(`   ✅ تم نسخ ${report.students.copied} طالب بنجاح.`);
}

// ══════════════════════════════════════════════════════════
// 2) COURSES LIST — platform_data/courses_list هو مستند واحد فيه
//    array اسمه items. بندمج: أي كورس (بمعرّف id) موجود في aldoctor
//    منسيبهوش زي ما هو، وأي كورس جديد في taninya مش موجود في aldoctor
//    بنضيفه.
// ══════════════════════════════════════════════════════════
async function migrateCoursesList() {
  logStep('📖 جاري مراجعة قائمة الكورسات (platform_data/courses_list)...');
  const [sourceDoc, targetDoc] = await Promise.all([
    sourceDb.collection('platform_data').doc('courses_list').get(),
    targetDb.collection('platform_data').doc('courses_list').get(),
  ]);

  const sourceItems = sourceDoc.exists ? (sourceDoc.data().items || []) : [];
  const targetItems = targetDoc.exists ? (targetDoc.data().items || []) : [];

  console.log(`   taninya عندها ${sourceItems.length} كورس، aldoctor عندها ${targetItems.length} كورس.`);

  const targetIds = new Set(targetItems.map(c => String(c.id)));
  const missingFromTarget = sourceItems.filter(c => !targetIds.has(String(c.id)));

  console.log(`   ➜ كورسات موجودة في taninya وناقصة من aldoctor: ${missingFromTarget.length}`);
  if (missingFromTarget.length) {
    missingFromTarget.forEach(c => console.log('     -', c.id, '|', c.title || c.name || ''));
  }

  if (!missingFromTarget.length) {
    console.log('   ✅ مفيش كورسات ناقصة — aldoctor محدّثة بالفعل.');
    return;
  }

  if (!LIVE) {
    console.log('   [DRY RUN] مفيش كتابة فعلية.');
    return;
  }

  const mergedItems = [...targetItems, ...missingFromTarget];
  await targetDb.collection('platform_data').doc('courses_list').set({
    items: mergedItems,
    updatedAt: new Date().toISOString(),
  });
  console.log(`   ✅ تم دمج ${missingFromTarget.length} كورس جديد في aldoctor.`);
}

// ══════════════════════════════════════════════════════════
// 3) كولكشنز عامة (كل document لوحده) — بننسخ أي doc id مش موجود
//    في aldoctor. مناسب لـ: quizzes, question_bank, videos,
//    paymentRequests, payment_requests, activationCodes, course_codes,
//    quiz_attempts, student_activity, studentNotifications, centerStudents
// ══════════════════════════════════════════════════════════
async function migrateGenericCollection(name) {
  logStep(`🗂️  جاري مراجعة collection: ${name}`);
  const [sourceSnap, targetSnap] = await Promise.all([
    sourceDb.collection(name).get(),
    targetDb.collection(name).get(),
  ]);

  if (sourceSnap.empty) {
    console.log(`   taninya مفيش فيها حاجة في ${name}. تجاهل.`);
    return;
  }

  const existingIds = new Set();
  targetSnap.forEach(d => existingIds.add(d.id));

  const toCopy = [];
  sourceSnap.forEach(d => {
    if (!existingIds.has(d.id)) toCopy.push({ id: d.id, data: d.data() });
  });

  console.log(`   taninya: ${sourceSnap.size} | aldoctor: ${targetSnap.size} | ناقص وهيتنسخ: ${toCopy.length}`);

  if (!toCopy.length) return;
  if (!LIVE) {
    console.log('   [DRY RUN] مفيش كتابة فعلية.');
    return;
  }

  let batch = targetDb.batch();
  let ops = 0;
  for (const item of toCopy) {
    batch.set(targetDb.collection(name).doc(item.id), item.data);
    ops++;
    if (ops >= 400) { await batch.commit(); batch = targetDb.batch(); ops = 0; }
  }
  if (ops > 0) await batch.commit();
  console.log(`   ✅ تم نسخ ${toCopy.length} document من ${name}.`);
}

const GENERIC_COLLECTIONS = [
  'quizzes',
  'question_bank',
  'videos',
  'paymentRequests',
  'payment_requests',
  'activationCodes',
  'course_codes',
  'quiz_attempts',
  'student_activity',
  'studentNotifications',
  'centerStudents',
];

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
(async () => {
  console.log('══════════════════════════════════════════════');
  console.log(LIVE ? '🔴 وضع التنفيذ الفعلي (LIVE) — هيتم الكتابة في aldoctor-7e153' : '🟡 وضع DRY RUN — تقرير بس، مفيش كتابة');
  console.log('══════════════════════════════════════════════');

  try {
    await migrateStudents();
    await migrateCoursesList();
    for (const col of GENERIC_COLLECTIONS) {
      await migrateGenericCollection(col);
    }

    console.log('\n══════════════════════════════════════════════');
    console.log('📊 التقرير النهائي:');
    console.log(`   الطلاب: ${report.students.total} في taninya | نُسخ ${report.students.copied} | اتجاهل (مكرر) ${report.students.skippedDuplicate}`);
    console.log('══════════════════════════════════════════════');
    if (!LIVE) {
      console.log('\n➡️  ده كان DRY RUN بس. لو الأرقام شكلها صح، شغّل تاني بـ:');
      console.log('   node migrate-taninya-to-aldoctor.js --live');
    } else {
      console.log('\n✅ تم النقل الفعلي. راجع Firebase Console للتأكيد قبل ما توقف الاعتماد على taninya.');
    }
  } catch (err) {
    console.error('❌ خطأ أثناء الترحيل:', err);
    process.exit(1);
  }
})();
