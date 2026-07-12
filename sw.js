// ============================================================
// Service Worker — منصة الدكتور في اللغة العربية
// الإصدار: غيّر الرقم ده كل ما تعمل تحديث → التحديث يوصل فوراً
// ============================================================

const CACHE_VERSION = 'aldoctor-v5-cache-fix';

// الملفات اللي هتتحفظ offline (كـ fallback فقط — الشبكة دايماً هي الأساس)
const CORE_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/firebase-config.js',
  '/grade-mapping.js',
  '/lessons.html',
  '/profile.html',
  '/tests.html',
  '/dashboard.html',
  '/dashboard.js',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&family=Outfit:wght@300;400;600;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// ══════════════════════════════════════════
// 1. Install — تخزين الملفات الأساسية
//    نستخدم fetch مباشرة بـ cache:'no-store' عشان
//    نضمن إن أول نسخة تتخزن offline هي فعلاً أحدث نسخة
//    مش نسخة قديمة راجعة من HTTP cache المتصفح/السيرفر
// ══════════════════════════════════════════
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async cache => {
      await Promise.all(
        CORE_FILES.map(async url => {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res && res.ok) await cache.put(url, res);
          } catch (e) {
            // لو ملف فشل تحميله، تجاهله بدل ما install كله يفشل
            console.warn('[SW] تعذّر تخزين:', url, e);
          }
        })
      );
    })
  );
  // تفعيل فوري بدون انتظار إغلاق التابات القديمة
  self.skipWaiting();
});

// ══════════════════════════════════════════
// 2. Activate — حذف الكاش القديم تلقائياً
//    ده اللي بيخلي التحديث يوصل على طول
// ══════════════════════════════════════════
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    )
  );
  // السيطرة على كل التابات فوراً
  self.clients.claim();
});

// ══════════════════════════════════════════
// 2.5. Message listener — يسمح للصفحة بإجبار الـ SW
//      الجديد يتفعّل فورًا لو حبينا نتحكم يدويًا
//      (extra safety، غير الـ skipWaiting التلقائي فوق)
// ══════════════════════════════════════════
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ══════════════════════════════════════════
// 3. Fetch — استراتيجية Network First (Cache-Busting)
//    يجرب الشبكة أول، ودايمًا بـ cache:'no-store' عشان
//    يتخطى HTTP cache بتاع المتصفح/السيرفر تمامًا
//    ويجيب أحدث نسخة فعلية من السيرفر مباشرة.
//    لو الشبكة فشلت (offline) → يرجع للكاش المحلي.
// ══════════════════════════════════════════
self.addEventListener('fetch', event => {
  // تجاهل الـ Firebase وأي API calls خارجية
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('firebaseapp.com') ||
    (url.hostname.includes('googleapis.com') && url.pathname.includes('firestore')) ||
    url.hostname.includes('firestore.googleapis.com') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(networkResponse => {
        // لو الشبكة ردت → حدّث الكاش بالنسخة الجديدة
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // مفيش نت → ارجع من الكاش
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // لو مش موجود في الكاش → ارجع الصفحة الرئيسية
          return caches.match('/index.html');
        });
      })
  );
});

// ══════════════════════════════════════════
// 4. Push Notifications (مستقبلي)
// ══════════════════════════════════════════
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'منصة الدكتور', {
    body: data.body || 'يوجد تحديث جديد!',
    icon: '/ايقونة الهدر.png',
    badge: '/ايقونة الهدر.png',
    dir: 'rtl',
    lang: 'ar'
  });
});
