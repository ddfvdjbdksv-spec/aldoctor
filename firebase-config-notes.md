# تعديل مطلوب في ملف firebase-config.js (لم يتم رفعه ضمن الملفات)

ملف `firebase-config.js` هو اللي بيعمل `firebase.initializeApp(...)` ويبني `window.db`.
هو مش موجود ضمن الملفات اللي رفعتها، فمحتاج تضيف السطر ده يدويًا فيه (تحت `firebase.initializeApp` مباشرة
وقبل أي استخدام تاني لـ `window.db`):

```js
firebase.initializeApp(firebaseConfig);

// ⚠️ مهم جداً: تعطيل الـ Offline Persistence الافتراضي
// لو الـ Persistence شغال (enablePersistence) هيفضل يعرض بيانات من IndexedDB المحلي
// حتى لو في نسخة أحدث على السيرفر، وده أحد أسباب "البيانات القديمة" اللي بتظهر.
// إحنا عايزين الداشبورد يعتمد دايماً على السيرفر مباشرة.
window.db = firebase.firestore();
window.db.settings({
  ignoreUndefinedProperties: true
  // ملحوظة: متعملش enablePersistence() هنا خالص للداشبورد —
  // لو كانت مفعّلة في نسخة قديمة من الكود، لازم تتشال.
});

window.auth = firebase.auth();
```

## لو لقيت في الملف الأصلي سطر زي ده، لازم يتشال بالكامل:
```js
firebase.firestore().enablePersistence()   // ← امسح السطر ده لو موجود
```

هذا السطر هو اللي بيخلي كل جهاز يحتفظ بنسخة محلية (IndexedDB) من البيانات ويقرأ منها
أول ما يفتح، وممكن تفضل قديمة لفترة قبل ما تتزامن، خصوصاً على المتصفحات اللي بتفتح
من أكتر من تبويب/جهاز في نفس الوقت.
