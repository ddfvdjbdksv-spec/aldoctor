# 🚀 دليل تحسين الأداء وإدارة Firebase
## منصة الدكتور في اللغة العربية

---

## 📦 الملفات الجديدة وطريقة الاستخدام

### 1. `firebase-sync.js` — طبقة المزامنة الأهم

**المشكلة اللي بيحلها:**
الداشبورد كان بيحفظ الكورسات والاختبارات في `localStorage` فقط، بدون ما يكتبهم في Firebase. لما الطالب يفتح الموقع، كان بيقرأ من Firebase اللي مش محدّث!

**كيف يشتغل:**
- يضيف Interceptors فوق `DASH_DB` بدون أي تغيير في الكود الموجود
- أي `saveCourse()` → بتكتب في Firebase تلقائياً
- أي `deleteCourse()` → بتمسح من Firebase فعلياً
- لما الداشبورد يفتح → بيحمّل من Firebase وبيملي localStorage

**طريقة التفعيل:**
أضف السطر ده في `dashboard.html` بعد `firebase-config.js` مباشرةً:

```html
<!-- في <head> أو قبل </body> — بعد firebase-config.js -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="firebase-config.js"></script>
<script src="firebase-sync.js"></script>  <!-- ← الجديد -->
<script src="dashboard.js"></script>
```

> ⚠️ المهم إن `firebase-sync.js` يتحمل **بعد** `firebase-config.js` وقبل أو بعد `dashboard.js` (الـ interceptors بتشتغل بعد `DOMContentLoaded`)

**مزامنة يدوية للطوارئ:**
لو عندك بيانات قديمة في localStorage محتاج ترفعها لـ Firebase:
```javascript
// افتح Console في الداشبورد واكتب:
FirebaseSync.forceSync();
```

---

## 📊 بنية البيانات في Firebase

### Collections وحجمها المتوقع:

| Collection | Document Size | عدد المتوقع | ملاحظات |
|---|---|---|---|
| `platform_data/courses_list` | < 500KB | 1 document | كل الكورسات في document واحد |
| `students/{phone}` | ~2KB | 50k طالب | Document ID = رقم الهاتف |
| `quizzes/{quizId}` | ~50KB | مئات | كل اختبار document منفصل |
| `quiz_attempts/{id}` | ~5KB | ملايين | الأكثر نمواً في الوقت |
| `paymentRequests/{id}` | ~1KB | آلاف | |

---

## ⚡ تحسينات الأداء المطلوبة في الكود

### المشكلة 1: تحميل كل الاختبارات دفعة واحدة

**في `lessons.html` سطر 1360:**
```javascript
// ❌ الكود الحالي — بيحمّل كل الاختبارات
const snap = await window.db.collection('quizzes').get();

// ✅ المقترح — فلتر بالصف الدراسي
const snap = await window.db.collection('quizzes')
  .where('grade', '==', currentCourseGrade)
  .get();
```

### المشكلة 2: تحميل كل الاختبارات في `tests.html`

**في `tests.html` سطر 517:**
```javascript
// ❌ الكود الحالي
const snap = await window.db.collection('quizzes').get();

// ✅ المقترح — فلتر بصف الطالب
const userGrade = getCurrentUser()?.grade;
const snap = await window.db.collection('quizzes')
  .where('grade', 'in', [userGrade, 'all'])
  .get();
```

### المشكلة 3: بحث الطالب بـ `.where().get()` كل مرة

**في `app.js` سطر 725:**
```javascript
// ❌ بيعمل full collection scan
window.db.collection('students').where('phone', '==', phone).where('password', '==', pass).get()

// ✅ استخدم Document ID مباشرةً (أسرع بكتير وأرخص)
// لأن phone هو الـ document ID
window.db.collection('students').doc(phone).get()
// ثم تحقق من الـ password في JavaScript
```

### المشكلة 4: محاولات الاختبار بدون فلتر

**في `tests.html` سطر 526:**
```javascript
// ❌ بيجيب كل محاولات الطالب ده
const snap2 = await window.db.collection('quiz_attempts')
  .where('studentId', '==', String(userId)).get();

// ✅ كويس — بس نضيف limit لو الطالب عنده محاولات كتير
const snap2 = await window.db.collection('quiz_attempts')
  .where('studentId', '==', String(userId))
  .orderBy('submittedAt', 'desc')
  .limit(50)
  .get();
```

---

## 🗑️ ضمان الحذف الفعلي من Firebase

### المشكلة:
`deleteCourse()` و`deleteQuiz()` في الداشبورد كانوا بيمسحوا من `localStorage` فقط، والبيانات فاضلة في Firebase.

### الحل:
`firebase-sync.js` بيتعامل مع ده تلقائياً:
- حذف كورس → بيعمل `platform_data/courses_list` update بقايمة بدونه
- حذف اختبار → بيعمل `quizzes/{quizId}.delete()` فعلي

---

## 📈 Firestore Indexes المطلوبة

أضف الملف `firestore.indexes.json` لمشروعك وارفعه باستخدام:

```bash
firebase deploy --only firestore:indexes
```

أو من Firebase Console:
1. اذهب لـ Firestore Database
2. اختر Indexes
3. أضف Composite indexes يدوياً حسب الملف

---

## 💰 تقليل تكلفة Firestore (Reads)

### الكاشينج الحالي (ممتاز):
- `app.js` بيستخدم `localStorage` كـ cache للكورسات ✅
- `lessons.html` بيستخدم `alamin_quizzes` كـ cache ✅

### تحسين إضافي — Cache بوقت صلاحية:
أضف ده في `app.js` لتجنب قراءة Firebase كل مرة:

```javascript
const CACHE_TTL = 5 * 60 * 1000; // 5 دقايق

async function fetchPlatformCoursesOptimized() {
  const cacheTime = localStorage.getItem('alamin_courses_time');
  const now = Date.now();
  
  // لو الكاش طازج (أقل من 5 دقايق) → استخدمه
  if (cacheTime && (now - Number(cacheTime)) < CACHE_TTL) {
    const cached = localStorage.getItem('alamin_courses');
    if (cached) return JSON.parse(cached);
  }
  
  // كاش منتهي → اقرأ من Firebase
  const courses = await fetchFromFirebase();
  localStorage.setItem('alamin_courses', JSON.stringify(courses));
  localStorage.setItem('alamin_courses_time', String(now));
  return courses;
}
```

---

## 🔥 تحمّل 50,000 طالب في نفس الوقت

### ليه Firebase يتحمّل ده؟
- Firestore بيعمل auto-scaling تلقائياً
- كل document بيتقرأ بشكل مستقل
- مفيش single point of failure

### الـ Bottlenecks الوحيدة عندك:

**1. `platform_data/courses_list` — القراءة الأكتر:**
كل طالب بيفتح الصفحة بيقرأ هذا الـ document.
**الحل:** استخدم Firestore built-in cache (تلقائي في الـ Compat SDK).

**2. `quizzes` collection — عند فتح اختبار:**
لو 1000 طالب فتحوا اختبارات في نفس الوقت → 1000 read.
**الحل:** الـ client-side caching الموجود كافي.

**3. `quiz_attempts` — الكتابة عند التسليم:**
الكتابات عند التسليم مش متزامنة (كل طالب بيسلّم بوقت مختلف).
**لا مشكلة.**

---

## 🛡️ أمان Firebase — ملاحظة مهمة

القواعد الجديدة في `firestore.rules` بتحمي:
- أكواد التفعيل: **للقراءة فقط** (مش للكتابة)
- الطلاب الجدد: لازم يكون عندهم phone + name + grade
- محاولات الاختبار: مش ممكن تتحذف
- طلبات الدفع: مش ممكن تتحذف

### الخطوة القادمة الموصى بها:
أضف **Firebase Authentication** للأدمن بس:
```javascript
// dashboard.html — أضف قبل أي عملية write
const adminPassword = 'كلمة سر الأدمن';
// لو Firebase Auth مضاف → بتتحقق من uid بدل ده
```

---

## 📋 خطوات التطبيق (بالترتيب)

1. ✅ **ارفع `firebase-sync.js`** لسيرفرك
2. ✅ **أضف السطر** في `dashboard.html` (بعد firebase-config.js)
3. ✅ **ارفع `firestore.rules`** الجديد للـ Firebase Console
4. ✅ **افتح الداشبورد** وشغّل `FirebaseSync.forceSync()` من الـ Console مرة واحدة لرفع البيانات الموجودة
5. ⭐ **اختياري:** ارفع `firestore.indexes.json` لتسريع الـ queries

---

## 🔍 مراقبة الأداء

من Firebase Console → Firestore:
- **Usage** → شوف عدد الـ reads/writes/deletes يومياً
- **Rules Playground** → اختبر القواعد
- **Indexes** → تأكد إن الـ indexes اشتغلت

**Free Tier Firestore:**
- 50,000 read/day
- 20,000 write/day
- 20,000 delete/day

لو تجاوزت الحد: فعّل الـ Caching بشكل أقوى أو انتقل لـ Blaze plan.
