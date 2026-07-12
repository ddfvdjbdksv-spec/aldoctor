// Single Page Application (SPA) Controller - "منصة الدكتور في اللغة العربية"
// ملاحظة: التسجيل/الدخول بقوا متصلين بقاعدة بيانات Firestore (نفس قاعدة بيانات الداشبورد)
// بدل التخزين الوهمي في localStorage. يعتمد الملف ده على:
//   - firebase-config.js  (بيوفر window.db [قديم] و window.dbNew/authNew/functionsNew [جديد])
//   - grade-mapping.js    (بيوفر buildGradeOptions / isSecondaryGrade)

// إيميل حساب الأدمن في Firebase Authentication (مش سر — مجرد معرّف/username،
// الحماية الفعلية هي كلمة المرور المخزنة عند Firebase نفسها، مش هنا).
// المستخدم لسه بيكتب "2026" في الواجهة كالمعتاد؛ الكود بيحوّله للإيميل ده تلقائيًا.
//
// ⚠️ ملاحظة مهمة: حساب الأدمن وبياناته الأمنية اتعملوا أصلاً في المشروع
// القديم (aldoctor). بعد النقل للمشروع الجديد (taninya) بقينا محتاجين
// نتحقق من الاتنين: بنجرب المشروع الجديد الأول (لو الحساب اتعمل هناك
// كمان)، ولو فشل بنجرب المشروع القديم اللي لسه فيه بيانات الأدمن الأصلية.
const ADMIN_LOGIN_EMAIL = 'admin@taninya-dea03.local';
const ADMIN_LOGIN_EMAIL_LEGACY = 'admin@aldoctor-7e153.local';

document.addEventListener('DOMContentLoaded', () => {
    initIntroSplash();
    initTheme();
    initRouting();
    initSearch();
    initForms();
    initForgotPassword();
    populateRegisterGradeSelect();
    initAuthHeader();
    loadHomeCourses();
    // initAiPopup(); // تم إلغاء ظهور البوب-أب المنبثق بناءً على طلب العميل — القسم الثابت في الصفحة الرئيسية باقٍ زي ما هو
});

// ================= Intro Splash Screen (Gateway) =================
function initIntroSplash() {
    const splash = document.getElementById('intro-splash');
    if (!splash) return;

    document.body.classList.add('intro-active');

    // Let the entrance animation play, then reveal the platform
    const MIN_DISPLAY_TIME = 2400; // ms

    const hideSplash = () => {
        splash.classList.add('intro-hidden');
        document.body.classList.remove('intro-active');
        setTimeout(() => splash.remove(), 800);
    };

    setTimeout(hideSplash, MIN_DISPLAY_TIME);

    // Allow tapping/clicking the splash to skip it
    splash.addEventListener('click', hideSplash);
}

// ================= Theme Switcher Management =================
function initTheme() {
    const themeCheckbox = document.getElementById('checkbox');
    const savedTheme = localStorage.getItem('theme') || 'light';

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeCheckbox) themeCheckbox.checked = true;
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (themeCheckbox) themeCheckbox.checked = false;
        }
        // الـ toggle الجديد — CSS بيتحكم في الشكل تلقائياً عبر [data-theme="dark"]
    };

    applyTheme(savedTheme);

    // زرار الهيدر الجديد
    const headerThemeBtn = document.getElementById('header-theme-btn');
    if (headerThemeBtn) {
        headerThemeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            const newTheme = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // checkbox legacy
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', () => {
            const newTheme = themeCheckbox.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // القايمة القديمة لو موجودة
    const themeRow = document.getElementById('hb-theme-toggle');
    if (themeRow) {
        themeRow.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            const newTheme = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }
}

// ================= SPA Routing and Page Swapping =================
const routes = {
    '#home': 'home-view',
    '#login': 'login-view',
    '#register': 'register-view'
};

function initRouting() {
    // Listen to hash changes in URL
    window.addEventListener('hashchange', handleRouteChange);

    // Initial route handling
    handleRouteChange();
}

function handleRouteChange() {
    const hash = window.location.hash || '#home';
    const activeSectionId = routes[hash] || 'home-view';

    // Swap active views
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
        if (section.id === activeSectionId) {
            section.classList.add('active');
        }
    });

    // Update Header active button states
    updateHeaderActiveStates(hash);

    // ── نقل الصفحة لأعلى الفورم الجديد (الصورة + العنوان) ──
    // بنستخدم 'auto' (instant) مش 'smooth' عشان منضمن إن السكروول يحصل فوراً
    // قبل ما يبدأ أي transition/animation على القسم الجديد، وبنأكد إنه يتم
    // بعد ما المتصفح يخلص الـ layout الخاص بالقسم (display:none -> block)
    // عن طريق requestAnimationFrame مرتين (frame واحد مش كفاية في بعض المتصفحات).
    const scrollToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0; // fallback لبعض المتصفحات القديمة
    };

    scrollToTop();
    requestAnimationFrame(() => {
        requestAnimationFrame(scrollToTop);
    });
}

function updateHeaderActiveStates(hash) {
    const loginLink = document.getElementById('nav-login-btn');
    const registerLink = document.getElementById('nav-register-btn');

    // Reset styles
    if (loginLink) loginLink.classList.remove('active-nav-link');
    if (registerLink) registerLink.classList.remove('active-nav-btn');

    if (hash === '#login') {
        if (loginLink) loginLink.classList.add('active-nav-link');
    } else if (hash === '#register') {
        if (registerLink) registerLink.classList.add('active-nav-btn');
    }
}

// ================= Search Overlay / Modal Toggle =================
function initSearch() {
    const searchToggle = document.getElementById('search-toggle');
    const searchClose = document.getElementById('search-close');
    const searchOverlay = document.getElementById('search-overlay');

    if (searchToggle && searchOverlay) {
        searchToggle.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            const input = searchOverlay.querySelector('input');
            if (input) setTimeout(() => input.focus(), 100);
        });
    }

    if (searchClose && searchOverlay) {
        searchClose.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
        });
    }

    if (searchOverlay) {
        // Close when clicking outside modal content
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                searchOverlay.classList.remove('active');
            }
        });
    }

    // Support escape key to close search / forgot-password overlays
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (searchOverlay && searchOverlay.classList.contains('active')) {
            searchOverlay.classList.remove('active');
        }
        const fpOverlay = document.getElementById('forgot-password-overlay');
        if (fpOverlay && fpOverlay.classList.contains('active')) {
            fpOverlay.classList.remove('active');
        }
    });
}

// ================= Forgot Password Modal Toggle =================
function initForgotPassword() {
    const link = document.getElementById('forgot-password-link');
    const closeBtn = document.getElementById('forgot-password-close');
    const overlay = document.getElementById('forgot-password-overlay');
    if (!link || !overlay) return;

    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('forgot-password-form').reset();
        const alertBox = document.getElementById('forgot-modal-alert');
        alertBox.className = 'forgot-modal-alert';
        alertBox.textContent = '';
        overlay.classList.add('active');
    });

    closeBtn.addEventListener('click', () => overlay.classList.remove('active'));

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
}

// ================= Grade Select (Register Form) =================
function populateRegisterGradeSelect() {
    const select = document.getElementById('reg-grade');
    if (!select) return;
    if (typeof buildGradeOptions === 'function') {
        // buildGradeOptions(false) => بدون خيار "كل الصفوف"، مع خيار افتراضي فاضي
        select.innerHTML = '<option value="" disabled selected>اختر الصف الدراسي</option>' + buildGradeOptions(false).replace('<option value="">اختر الصف الدراسي</option>', '');
    }
}

// لما الطالب يغيّر الصف في فورم التسجيل: لو ثانوي (1 أو 2 أو 3) أظهر سؤال الشعبة
function handleGradeChange() {
    const grade = document.getElementById('reg-grade').value;
    const trackRow = document.getElementById('reg-track-row');
    const trackSelect = document.getElementById('reg-track');
    const isSecondary = typeof isSecondaryGrade === 'function'
        ? isSecondaryGrade(grade)
        : ['1', '2', '3'].includes(grade);

    if (isSecondary) {
        trackRow.style.display = '';
        trackSelect.setAttribute('required', 'required');
    } else {
        trackRow.style.display = 'none';
        trackSelect.removeAttribute('required');
        trackSelect.value = '';
    }
}
window.handleGradeChange = handleGradeChange;

// ================= Authentication - Firestore Data Layer =================
// كل طلاب المنصة بيتسجلوا في نفس مجموعة Firestore اللي بيستخدمها الداشبورد: collection('students')
// document id = رقم هاتف الطالب (عشان يسهل البحث عند تسجيل الدخول/استعادة كلمة السر)
const STUDENTS_COLLECTION = 'students';

// بيتأكد إن قاعدة البيانات (window.db) جاهزة، ولو لسه بتتحمّل بينتظر لحد 4 ثواني
// قبل ما يعتبرها فاشلة. ده بيحل مشكلة "تعليق/فشل" تسجيل الدخول لو المستخدم
// ضغط submit بسرعة قبل ما Firebase يخلص التهيئة.
function waitForDb(timeoutMs = 4000) {
    return new Promise((resolve) => {
        if (window.db) { resolve(true); return; }
        const start = Date.now();
        const interval = setInterval(() => {
            if (window.db) {
                clearInterval(interval);
                resolve(true);
            } else if (Date.now() - start >= timeoutMs) {
                clearInterval(interval);
                resolve(false);
            }
        }, 100);
    });
}

async function ensureDb() {
    const ok = await waitForDb();
    if (!ok) {
        return false;
    }
    return true;
}

async function findStudentByPhone(phone) {
    const doc = await window.db.collection(STUDENTS_COLLECTION).doc(phone).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

function saveSession(student) {
    const data = JSON.stringify(student);
    localStorage.setItem('alamin_current', data);
    localStorage.setItem('alamin_session', data); // backward compat
    initAuthHeader();
}

function getCurrentSession() {
    try {
        return JSON.parse(localStorage.getItem('alamin_current') || localStorage.getItem('alamin_session') || 'null');
    } catch (err) {
        return null;
    }
}

function logoutUser() {
    localStorage.removeItem('alamin_current');
    localStorage.removeItem('alamin_session');
    initAuthHeader();
    navigateTo('#home');
}
window.logoutUser = logoutUser;

function getDisplayName(user) {
    if (!user) return '';
    return user.fullName || user.name ||
        [user.firstName || user.fname, user.lastName || user.lname].filter(Boolean).join(' ') ||
        user.phone || 'طالب';
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[ch]));
}

function initAuthHeader() {
    const guestLinks = document.getElementById('hb-guest-links');
    const userLinks = document.getElementById('hb-user-links');
    const hbUserName = document.getElementById('hb-user-name');
    const user = getCurrentSession();

    if (!guestLinks || !userLinks) return;

    if (!user) {
        guestLinks.style.display = '';
        userLinks.style.display = 'none';
        return;
    }

    // مسجل دخول
    guestLinks.style.display = 'none';
    userLinks.style.display = '';

    const displayName = getDisplayName(user);
    if (hbUserName) {
        hbUserName.textContent = displayName.split(' ').slice(0, 2).join(' ') || 'حسابي';
    }

    // لو أدمن يوجه للداشبورد
    const profileLink = document.getElementById('nav-profile-btn');
    if (profileLink) {
        profileLink.href = user.role === 'admin' ? 'dashboard.html' : 'profile.html';
    }
}

async function fetchPlatformCourses() {
    let courses = [];
    let firebaseReadOk = false;
    if (window.db) {
        try {
            const doc = await window.db.collection('platform_data').doc('courses_list').get();
            firebaseReadOk = true;
            if (doc.exists) {
                const data = doc.data() || {};
                courses = Array.isArray(data.items) ? data.items :
                    (Array.isArray(data.courses) ? data.courses :
                        (Array.isArray(data.list) ? data.list : []));
                courses = sanitizePublishedCourses(courses);
                if (courses.length) {
                    localStorage.setItem('alamin_courses', JSON.stringify(courses));
                } else {
                    localStorage.removeItem('alamin_courses');
                }
            } else {
                localStorage.removeItem('alamin_courses');
            }
        } catch (err) {
            console.warn('Courses load failed, using local cache:', err);
        }
    }

    if (!courses.length && !firebaseReadOk) {
        try {
            courses = JSON.parse(localStorage.getItem('alamin_courses') || '[]');
            courses = sanitizePublishedCourses(courses);
        } catch (err) {
            courses = [];
        }
    }
    return courses;
}

const LEGACY_SEED_COURSE_TITLES = new Set([
    'المراجعة النهائية الصف الأول الثانوي',
    'المراجعة النهائية الصف الثاني الثانوي',
    'مراجعة التربية الدينية الصف الثالث'
]);

function sanitizePublishedCourses(courses) {
    if (!Array.isArray(courses)) return [];
    const clean = courses.filter(course => !LEGACY_SEED_COURSE_TITLES.has(course && course.title));
    if (clean.length !== courses.length) {
        localStorage.setItem('alamin_courses', JSON.stringify(clean));
    }
    // ترتيب عرض الكورسات بالصفحة الرئيسية حسب رقم "الترتيب" المحدد من لوحة التحكم تصاعدياً
    // (الكورسات بدون رقم ترتيب صريح تظهر بعد المرتّبة يدوياً، بنفس ترتيبها الأصلي)
    const getOrderValue = (c) => {
        const v = parseInt(c && c.order, 10);
        return Number.isFinite(v) ? v : 9999;
    };
    return clean.slice().sort((a, b) => getOrderValue(a) - getOrderValue(b));
}

function normalizeCourseId(id) {
    return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function getCourseLessonCount(course) {
    return Array.isArray(course.lessons) ? course.lessons.length : 0;
}

function getCourseDurationLabel(course) {
    const lessons = course.lessons || [];
    const minutes = lessons.reduce((sum, lesson) => {
        const segments = lesson.segments || [];
        const segmentMinutes = segments.reduce((inner, seg) => {
            const raw = String(seg.duration || '').trim();
            const match = raw.match(/(\d+)\s*:?/);
            return inner + (match ? Number(match[1]) : 0);
        }, 0);
        return sum + segmentMinutes;
    }, 0);
    if (!minutes) return 'متاح الآن';
    if (minutes >= 60) return `${Math.round(minutes / 60)} ساعات`;
    return `${minutes} دقيقة`;
}

// يحسب بيانات شارة الخصم (سعر قبل/بعد) لأي كورس عادي أو مجمع
function getCourseDiscountInfo(course) {
    const price = parseFloat(course && course.price);
    const oldPrice = parseFloat(course && course.oldPrice);
    if (!Number.isFinite(price) || !Number.isFinite(oldPrice) || oldPrice <= price || price < 0) return null;
    const savings = oldPrice - price;
    const pct = Math.round((savings / oldPrice) * 100);
    return { price, oldPrice, savings, pct };
}

function getCourseStatusBadge(course) {
    // 'auto' (default) falls back to free/paid; teacher can override with
    // 'new' / 'popular' / 'top' from the dashboard for marketing purposes.
    const kind = course.cardBadgeType || 'auto';
    if (kind === 'new') return { cls: 'cst-new', icon: 'fa-sparkles', label: 'جديد' };
    if (kind === 'popular') return { cls: 'cst-popular', icon: 'fa-fire', label: 'الأكثر مشاهدة' };
    if (kind === 'top') return { cls: 'cst-top', icon: 'fa-star', label: 'الأعلى تقييماً' };
    const isPaid = course.type === 'paid';
    if (isPaid) {
        const discount = getCourseDiscountInfo(course);
        const label = discount ? `${discount.price} ج.م (خصم ${discount.pct}%)` : `مدفوع ${course.price || 0} ج.م`;
        return { cls: 'cst-paid', icon: 'fa-tag', label };
    }
    return { cls: 'cst-free', icon: 'fa-gift', label: 'مجاني' };
}

// يعرض السعر بنفس تصميم بطاقات الكورسات الحالية (سعر قبل الخصم بخط فوقه + سعر بعد الخصم + شارة نسبة الخصم)
// نفس الدالة تُستخدم لأي كورس — عادي أو مجمع — عشان يظهر السعر بنفس الشكل تماماً في الحالتين
function getCoursePriceRowHTML(course) {
    if (!course || course.type !== 'paid') return '';
    const discount = getCourseDiscountInfo(course);
    if (discount) {
        return `<div class="course-tile-price">
            <s class="ctp-old">${discount.oldPrice} ج.م</s>
            <span class="ctp-new">${discount.price} ج.م</span>
            <span class="ctp-off">خصم ${discount.pct}%</span>
        </div>`;
    }
    return `<div class="course-tile-price"><span class="ctp-new">${escapeHTML(String(course.price || 0))} ج.م</span></div>`;
}

function renderCourseCard(course, index) {
    const thumb = course.thumbnail || course.thumb || 'الدكتور في اللغه العربيه .jpeg';
    const safeThumb = escapeHTML(thumb);
    const title = escapeHTML(course.title || 'كورس جديد');
    const courseId = escapeHTML(normalizeCourseId(course.id));

    // ── Customizable name badge ──
    const showBadge = course.cardShowBadge !== false; // default: shown
    const namePos = ['top', 'bottom', 'left', 'right'].includes(course.cardNamePosition) ? course.cardNamePosition : 'top';
    const nameColor = escapeHTML(course.cardNameColor || '#ffffff');
    const nameBg = escapeHTML(course.cardNameBg || '#0284c7');
    const radius = parseInt(course.cardRadius, 10);
    const safeRadius = (Number.isFinite(radius) && radius >= 0 && radius <= 60) ? radius : 24;

    // ── Status ribbon (مجاني / جديد / الأكثر مشاهدة / الأعلى تقييماً) ──
    const showStatus = course.cardShowStatus !== false; // default: shown
    const status = getCourseStatusBadge(course);

    // ── Hover / tap bottom-sheet info ──
    const showHoverInfo = course.cardShowHover !== false; // default: shown
    // ── Short description (from the dashboard "desc"/"aiSmartDesc" field) ──
    // Shown as max 2 lines inside the reveal overlay; CSS line-clamp handles the "…"
    const descRaw = (course.desc || course.aiSmartDesc || '').toString().trim();
    const descText = descRaw ? escapeHTML(descRaw) : '';

    // Image is the whole card. object-fit:contain keeps it 100% intact —
    // no crop, no zoom, no distortion. A softly blurred copy of the same
    // image fills any leftover space behind it so nothing looks empty.
    return `
        <div class="course-tile" tabindex="0" role="button"
             aria-label="${title}"
             style="--tile-radius:${safeRadius}px"
             data-course-id="${courseId}"
             onclick="handleCourseTileTap(this, '${courseId}', event)"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();navigateToCourseTile(this,'${courseId}')}">

            <div class="course-tile-media">
                <div class="course-tile-bg" style="background-image:url('${safeThumb}')"></div>
                <img src="${safeThumb}" alt="${title}" class="course-tile-img" loading="lazy">
                <div class="course-tile-dim"></div>
            </div>

            ${showStatus ? `
            <div class="course-status-badge ${status.cls}">
                <i class="fas ${status.icon}"></i> ${escapeHTML(status.label)}
            </div>` : ''}

            ${course.courseType === 'bundle' ? `
            <div class="course-status-badge" style="top:${showStatus ? '46px' : '10px'};background:#0284c7;color:#fff;">
                <i class="fas fa-layer-group"></i> كورس مجمع
            </div>` : ''}

            ${showBadge ? `
            <div class="course-name-badge cnb-${namePos}${(namePos === 'bottom' && showHoverInfo) ? ' cnb-with-sheet' : ''}" style="--cnb-color:${nameColor};--cnb-bg:${nameBg}">
                ${title}
            </div>` : ''}

            ${showHoverInfo ? `
            <div class="course-tile-sheet">
                <div class="course-tile-sheet-title">${title}</div>
                ${descText ? `<div class="course-tile-desc">${descText}</div>` : ''}
                ${getCoursePriceRowHTML(course)}
                <button class="course-tile-enter-btn" onclick="event.stopPropagation();navigateToCourseTile(this.closest('.course-tile'),'${courseId}')">
                    <i class="fas fa-graduation-cap"></i>
                    <span>الدخول للكورس</span>
                </button>
            </div>` : `
            ${getCoursePriceRowHTML(course)}
            <button class="course-tile-enter-btn" style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:8;width:calc(100% - 28px)"
                    onclick="event.stopPropagation();navigateToCourseTile(this.closest('.course-tile'),'${courseId}')">
                <i class="fas fa-graduation-cap"></i>
                <span>الدخول للكورس</span>
            </button>`}
        </div>
    `;
}

// Small "press & go" animation before navigating to the course page.
function navigateToCourseTile(tileEl, courseId) {
    if (!tileEl || tileEl.classList.contains('tile-leaving')) return;
    tileEl.classList.add('tile-leaving');
    setTimeout(() => openCourse(courseId), 260);
}

// Desktop: hover already reveals the sheet, so any tap/click can navigate
// straight away. Touch devices: first tap only reveals the sheet — a
// second tap on the tile (or the enter button) navigates.
function handleCourseTileTap(tileEl, courseId, evt) {
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    // If the tile is already the scroll-centered "hero" card, its overlay is
    // already visible — a single tap should navigate straight away, same as
    // when the sheet was opened manually.
    const alreadyOpen = tileEl.classList.contains('sheet-open') || tileEl.classList.contains('is-hero');
    if (isTouch && !alreadyOpen) {
        if (evt) evt.preventDefault();
        document.querySelectorAll('.course-tile.sheet-open').forEach(t => {
            if (t !== tileEl) t.classList.remove('sheet-open');
        });
        tileEl.classList.add('sheet-open');
        return;
    }
    navigateToCourseTile(tileEl, courseId);
}

// Tapping outside an open tile on touch devices closes its sheet again.
document.addEventListener('click', function (e) {
    if (e.target.closest('.course-tile')) return;
    document.querySelectorAll('.course-tile.sheet-open').forEach(t => t.classList.remove('sheet-open'));
});



function revealCourseTiles() {
    const tiles = document.querySelectorAll('.course-tile:not(.cc-skeleton):not(.in-view)');
    if (!tiles.length) return;
    if (!('IntersectionObserver' in window)) {
        tiles.forEach(t => t.classList.add('in-view'));
        return;
    }
    const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    tiles.forEach(t => io.observe(t));
}

// ============== Hero (scroll-centered) course card ==============
// Whichever tile sits closest to the vertical middle of the viewport becomes
// the "Hero Card": it gets a gentle scale-up + soft shadow (via .is-hero in
// CSS) and its overlay (title / description / enter button) reveals itself
// automatically — no hover or tap required. Uses IntersectionObserver to
// keep track of which tiles are currently on screen (cheap), then only
// measures getBoundingClientRect() for that small subset on scroll/resize,
// throttled with requestAnimationFrame so there's no scroll jank.
(function () {
    let io = null;
    let visibleTiles = new Set();
    let ticking = false;
    let listenersBound = false;

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function computeHero() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            if (prefersReducedMotion()) return;

            const viewportCenter = window.innerHeight / 2;
            let closest = null;
            let closestDist = Infinity;

            visibleTiles.forEach(tile => {
                if (!tile.isConnected) { visibleTiles.delete(tile); return; }
                const rect = tile.getBoundingClientRect();
                const dist = Math.abs((rect.top + rect.height / 2) - viewportCenter);
                if (dist < closestDist) { closestDist = dist; closest = tile; }
            });

            document.querySelectorAll('.course-tile.is-hero').forEach(t => {
                if (t !== closest) t.classList.remove('is-hero');
            });
            if (closest && !closest.classList.contains('is-hero')) {
                closest.classList.add('is-hero');
            }
        });
    }

    function refreshCourseHeroObserver() {
        const grid = document.querySelector('#home-view .courses-grid');
        if (!grid) return;

        if (io) io.disconnect();
        visibleTiles = new Set();

        if (!('IntersectionObserver' in window)) return;

        io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) visibleTiles.add(entry.target);
                else visibleTiles.delete(entry.target);
            });
            computeHero();
        }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });

        grid.querySelectorAll('.course-tile:not(.cc-skeleton)').forEach(t => io.observe(t));

        if (!listenersBound) {
            window.addEventListener('scroll', computeHero, { passive: true });
            window.addEventListener('resize', computeHero, { passive: true });
            listenersBound = true;
        }
        computeHero();
    }

    window.refreshCourseHeroObserver = refreshCourseHeroObserver;
})();

async function loadHomeCourses() {
    const grid = document.querySelector('#home-view .courses-grid');
    if (!grid) return;

    // ── 1. عرض الكاش الفوري بدون أي تأخير ──
    let cached = [];
    try { cached = sanitizePublishedCourses(JSON.parse(localStorage.getItem('alamin_courses') || '[]')); } catch (e) { }

    if (cached.length) {
        grid.innerHTML = cached.map((c, i) => renderCourseCard(c, i)).join('');
        requestAnimationFrame(revealCourseTiles);
        requestAnimationFrame(() => window.refreshCourseHeroObserver && window.refreshCourseHeroObserver());
    } else {
        grid.innerHTML = [1, 2, 3].map(() => `<div class="course-tile cc-skeleton"></div>`).join('');
    }

    // ── 2. انتظر حتى يكون Firebase جاهزاً (max 8 ثواني) ──
    const dbReady = await waitForDb(8000);
    if (!dbReady || !window.db) {
        // Firebase غير متاح — استخدم الكاش
        if (!cached.length) {
            grid.innerHTML = `<div class="courses-empty"><i class="fas fa-book-open"></i><strong>لا توجد كورسات منشورة حالياً</strong></div>`;
        }
        return;
    }

    // ── 3. اجلب من Firebase (المصدر الموثوق دائماً) ──
    try {
        const doc = await window.db.collection('platform_data').doc('courses_list').get();
        if (doc.exists) {
            const data = doc.data() || {};
            let fresh = Array.isArray(data.items) ? data.items :
                (Array.isArray(data.courses) ? data.courses :
                    (Array.isArray(data.list) ? data.list : []));
            fresh = sanitizePublishedCourses(fresh);
            if (fresh.length) {
                localStorage.setItem('alamin_courses', JSON.stringify(fresh));
                grid.innerHTML = fresh.map((c, i) => renderCourseCard(c, i)).join('');
                requestAnimationFrame(revealCourseTiles);
                requestAnimationFrame(() => window.refreshCourseHeroObserver && window.refreshCourseHeroObserver());
                // تحديث عداد الكورسات في الـ ticker
                const ticker = document.getElementById('tickerCourses');
                if (ticker) ticker.textContent = fresh.length;
                return;
            }
        }
        // Firebase موجود لكن فاضي أو courses فاضية
        localStorage.removeItem('alamin_courses');
        grid.innerHTML = `<div class="courses-empty"><i class="fas fa-book-open"></i><strong>لا توجد كورسات منشورة حالياً</strong><span>أضف أول كورس من لوحة التحكم وسيظهر هنا فوراً.</span></div>`;
        const ticker = document.getElementById('tickerCourses');
        if (ticker) ticker.textContent = '0';
    } catch (err) {
        console.warn('[loadHomeCourses] Firebase error:', err.code, err.message);
        // Firebase فشل — استخدم الكاش
        if (cached.length) {
            grid.innerHTML = cached.map((c, i) => renderCourseCard(c, i)).join('');
            requestAnimationFrame(revealCourseTiles);
            requestAnimationFrame(() => window.refreshCourseHeroObserver && window.refreshCourseHeroObserver());
        } else {
            grid.innerHTML = `<div class="courses-empty"><i class="fas fa-book-open"></i><strong>لا توجد كورسات منشورة حالياً</strong></div>`;
        }
    }
}

function openCourse(courseId) {
    const user = getCurrentSession();
    if (!user) {
        window.location.hash = '#login';
        alert('سجل دخولك أولاً عشان تفتح محتوى الكورس.');
        return;
    }
    window.location.href = `lessons.html?course=${encodeURIComponent(courseId)}`;
}
window.openCourse = openCourse;

// ================= Robust Hash Navigation Helper =================
// بيضمن إن الانتقال يحصل ويتم السكروول لأعلى الفورم حتى لو المستخدم
// ضغط على رابط بيوجّه لنفس الـ hash الحالي (اللي مكنش بيعمل hashchange أصلاً)
function navigateTo(hash) {
    if (window.location.hash === hash) {
        // الهاش نفسه — مفيش hashchange هيحصل، فننفذ التغيير يدوياً
        handleRouteChange();
    } else {
        window.location.hash = hash;
    }
}
window.navigateTo = navigateTo;

function initForms() {
    // Form navigation helper links
    const goToRegister = document.getElementById('go-to-register');
    if (goToRegister) {
        goToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('#register');
        });
    }

    const goToLogin = document.getElementById('go-to-login');
    if (goToLogin) {
        goToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('#login');
        });
    }

    // أي رابط تاني في الصفحة بيوجّه لـ #login أو #register (هيدر، أزرار الصفوف، CTA...)
    // بنوصّله بالـ navigateTo عشان يشتغل دايماً حتى لو كان نفس الهاش الحالي
    document.querySelectorAll('a[href="#login"], a[href="#register"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.getAttribute('href'));
        });
    });

    // فحص لحظي لتطابق كلمة المرور وتأكيدها أثناء الكتابة
    const pwInp = document.getElementById('reg-password');
    const pwConfirmInp = document.getElementById('reg-password-confirm');
    if (pwInp && pwConfirmInp) {
        const checkMatch = () => {
            if (!pwConfirmInp.value) {
                clearFieldError('reg-password-confirm', 'err-password-confirm');
                return;
            }
            if (pwInp.value !== pwConfirmInp.value) {
                addInlineErr('err-password-confirm', '❌ كلمة المرور وتأكيدها غير متطابقتين');
            } else {
                clearFieldError('reg-password-confirm', 'err-password-confirm');
            }
        };
        pwInp.addEventListener('input', checkMatch);
        pwConfirmInp.addEventListener('input', checkMatch);
    }
}

// Egyptian Phone number validation regex
const EGYPT_PHONE_REGEX = /^(010|011|012|015)[0-9]{8}$/;
// Palestinian Phone number validation regex (Jawwal 059 / Ooredoo-Wataniya 056 + 7 digits = 10 digits إجمالاً)
const PALESTINE_PHONE_REGEX = /^(059|056)[0-9]{7}$/;

// يتحقق إن كان الرقم مصرياً أو فلسطينياً صحيحاً — تُستخدم في كل نماذج الهاتف بالمنصة
function isValidPhoneNumber(phone) {
    const p = String(phone || '').trim();
    return EGYPT_PHONE_REGEX.test(p) || PALESTINE_PHONE_REGEX.test(p);
}
// يتحقق إن كان الرقم فلسطينياً تحديداً — يُستخدم في فلتر لوحة التحكم وأزرار واتساب
function isPalestinianPhoneNumber(phone) {
    return PALESTINE_PHONE_REGEX.test(String(phone || '').trim());
}
// يحوّل الرقم المحلي (مصري/فلسطيني) لصيغة دولية تصلح لروابط واتساب wa.me
function toWhatsAppPhone(phone) {
    const p = String(phone || '').trim();
    if (PALESTINE_PHONE_REGEX.test(p)) return '970' + p.slice(1);
    if (EGYPT_PHONE_REGEX.test(p)) return '20' + p.slice(1);
    return p.replace(/[^\d]/g, '');
}
// يفتح محادثة واتساب مباشرة على رقم مصري أو فلسطيني
function openWhatsAppChat(phone, message) {
    const num = toWhatsAppPhone(phone);
    if (!num) return;
    const url = 'https://wa.me/' + num + (message ? ('?text=' + encodeURIComponent(message)) : '');
    window.open(url, '_blank');
}

let isLoginSubmitting = false;

// Submit Handler for Login — backend كامل مأخوذ من login.html
async function handleLoginSubmit(e) {
    e.preventDefault();

    // ── منع الضغطات المتكررة أثناء تسجيل الدخول ──
    if (isLoginSubmitting) return;
    isLoginSubmitting = true;
    setButtonLoading('login-submit-btn', true);

    try {
        clearAllLoginErrors();

        const phoneInp = document.getElementById('login-phone');
        const passInp = document.getElementById('login-password');
        const codeChk = document.getElementById('login-by-code');

        const phone = (phoneInp ? phoneInp.value.trim() : '');
        const pass = (passInp ? passInp.value : '');
        const loginByCode = codeChk ? codeChk.checked : false;

        const dbReady = await ensureDb();
        if (!dbReady) {
            showFormAlert('❌ تعذّر الاتصال بقاعدة البيانات. تأكد من اتصال الإنترنت وحاول مرة أخرى.', 'error', 'login-form-alert');
            return;
        }

        // ── وضع الكود ──
        if (loginByCode) {
            const code = pass.toUpperCase();
            if (!code) {
                addInlineErr('err-login-password', '⚠️ من فضلك ادخل الكود الخاص بك');
                passInp?.focus();
                return;
            }

            try {
                // 1) centerStudents
                const centerSnap = await withTimeout(
                    window.db.collection('centerStudents').where('centerCode', '==', code).limit(1).get(),
                    10000, 'login-timeout'
                );
                if (!centerSnap.empty) {
                    const doc = centerSnap.docs[0];
                    const user = { ...doc.data(), id: doc.id, role: 'student', type: 'center', centerCode: code };
                    saveSession(user);
                    showFormAlert('✅ أهلاً بيك يا ' + (user.name || user.fullName || 'طالب') + '! تم تسجيل الدخول.', 'success', 'login-form-alert');
                    setTimeout(() => { navigateTo('#home'); initAuthHeader(); }, 900);
                    return;
                }
                // 2) و 3) students (doc id أو qrCode) — قراءة مباشرة من Firestore
                try {
                    let user = null;
                    const docSnap = await window.db.collection(STUDENTS_COLLECTION).doc(code).get();
                    if (docSnap.exists) {
                        user = { id: docSnap.id, ...docSnap.data(), role: 'student' };
                    } else {
                        const qrSnap = await window.db.collection(STUDENTS_COLLECTION).where('qrCode', '==', code).limit(1).get();
                        if (!qrSnap.empty) {
                            const doc = qrSnap.docs[0];
                            user = { id: doc.id, ...doc.data(), role: 'student' };
                        }
                    }
                    if (!user) throw new Error('code-not-found');
                    saveSession(user);
                    showFormAlert('✅ أهلاً بيك يا ' + (user.name || 'طالب') + '! تم تسجيل الدخول.', 'success', 'login-form-alert');
                    setTimeout(() => { navigateTo('#home'); initAuthHeader(); }, 900);
                    return;
                } catch (codeErr) {
                    addInlineErr('err-login-password', '❌ الكود غير صحيح أو غير مسجل — تأكد من الكود وحاول تاني');
                    showFormAlert('❌ الكود غير صحيح أو غير مسجل.', 'error', 'login-form-alert');
                }
            } catch (err) {
                console.error(err);
                showFormAlert(describeConnectionError(err), 'error', 'login-form-alert');
            }
            return;
        }

        // ── وضع رقم + كلمة مرور ──
        let firstErrorField = null;
        if (!phone) {
            addInlineErr('err-login-phone', '⚠️ من فضلك ادخل رقم الموبايل');
            firstErrorField = 'login-phone';
        } else if (!isValidPhoneNumber(phone) && !(phone === '20202020')) {
            addInlineErr('err-login-phone', '⚠️ رقم الهاتف غير صحيح — أدخل رقماً مصرياً أو فلسطينياً صحيحاً');
            firstErrorField = 'login-phone';
        }
        if (!pass) {
            addInlineErr('err-login-password', '⚠️ من فضلك ادخل كلمة السر');
            if (!firstErrorField) firstErrorField = 'login-password';
        }
        if (firstErrorField) {
            const el = document.getElementById(firstErrorField);
            if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            return;
        }

        // أدمن — تسجيل دخول حقيقي عبر Firebase Authentication
        // (مفيش أي كلمة مرور مكتوبة هنا في الكود؛ التحقق بيحصل عند Google)
        if (phone === '20202020') {
            if (!window.auth) {
                // ننتظر لحد 3 ثواني لو Firebase لسه بيحمّل (بطء نت مثلاً)
                let waited = 0;
                while (!window.auth && waited < 3000) {
                    await new Promise(r => setTimeout(r, 200));
                    waited += 200;
                }
            }
            if (!window.auth) {
                showFormAlert('❌ تعذّر تحميل خدمة تسجيل الدخول. حاول تاني بعد شوية.', 'error', 'login-form-alert');
                return;
            }
            try {
                let newOk = false;
                let legacyOk = false;
                let firstErr = null;

                // 1) نجرب المشروع الجديد (taninya)
                try {
                    await window.auth.signInWithEmailAndPassword(ADMIN_LOGIN_EMAIL, pass);
                    newOk = true;
                } catch (errNew) {
                    firstErr = firstErr || errNew;
                }

                // 2) نجرب برضو المشروع القديم (aldoctor) — مش بس "لو فشل الأول"
                //    لازم نحاول نسجّل دخول في الاتنين مع بعض (مش واحد بس) عشان
                //    قراءة "الطلاب" في الداشبورد من قاعدتين مختلفتين محتاجة جلسة
                //    Auth حقيقية في كل مشروع لوحده (Firestore rules بتتحقق من
                //    request.auth الخاص بكل مشروع لوحده، مش مشترك بين المشروعين).
                if (!window.authLegacy) {
                    let waitedLegacy = 0;
                    while (!window.authLegacy && waitedLegacy < 3000) {
                        await new Promise(r => setTimeout(r, 200));
                        waitedLegacy += 200;
                    }
                }
                if (window.authLegacy) {
                    try {
                        await window.authLegacy.signInWithEmailAndPassword(ADMIN_LOGIN_EMAIL_LEGACY, pass);
                        legacyOk = true;
                    } catch (errLegacy) {
                        firstErr = firstErr || errLegacy;
                    }
                }

                const signedIn = newOk || legacyOk;
                console.log('[AdminLogin] taninya:', newOk, '| aldoctor:', legacyOk);
                if (!signedIn) throw firstErr;

                const admin = { id: 0, name: 'الأستاذ الدكتور', phone: '01000000000', role: 'admin' };
                saveSession(admin);
                showFormAlert('✅ مرحباً بك يا أستاذ الدكتور! جاري الانتقال للوحة التحكم...', 'success', 'login-form-alert');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
            } catch (err) {
                console.error('Admin auth error:', err);
                // ── رسالة تشخيص مؤقتة: بتوضح السبب الحقيقي من Firebase على الشاشة مباشرة ──
                // (هنشيلها ونرجّع الرسالة العادية بعد ما تتأكد المشكلة اتحلت)
                let diag = 'بيانات الدخول غير صحيحة.';
                if (err && err.code === 'auth/user-not-found') {
                    diag = 'الحساب غير موجود في Firebase Authentication (اتحقق منه في المشروعين taninya-dea03 و aldoctor-7e153).';
                } else if (err && (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials')) {
                    diag = 'الحساب موجود لكن كلمة المرور غلط (راجع كلمة المرور المسجلة في Firebase Console).';
                } else if (err && err.code === 'auth/network-request-failed') {
                    diag = 'مفيش اتصال بالإنترنت أو تعذّر الوصول لـ Firebase.';
                } else if (err && err.code === 'auth/too-many-requests') {
                    diag = 'محاولات كتير غلط متتالية — Firebase وقف المحاولات مؤقتًا. جرّب بعد شوية.';
                } else if (err && err.code) {
                    diag = 'كود الخطأ من Firebase: ' + err.code;
                }
                addInlineErr('err-login-password', '❌ رقم الأدمن أو كلمة المرور غلط');
                showFormAlert('❌ ' + diag, 'error', 'login-form-alert');
            }
            return;
        }

        try {
            // التحقق من رقم الهاتف + الباسورد مباشرة على Firestore
            const snap = await window.db.collection(STUDENTS_COLLECTION)
                .where('phone', '==', phone)
                .where('password', '==', pass)
                .limit(1)
                .get();
            if (snap.empty) throw Object.assign(new Error('wrong-credentials'), { code: 'wrong-credentials' });
            const doc = snap.docs[0];
            const user = { id: doc.id, ...doc.data(), role: 'student' };
            saveSession(user);
            const greetName = user.firstName || (user.name || '').split(' ')[0] || 'طالب';
            showFormAlert('✅ مرحباً بك يا ' + greetName + '! تم تسجيل الدخول بنجاح.', 'success', 'login-form-alert');
            document.getElementById('login-form')?.reset();
            setTimeout(() => { navigateTo('#home'); initAuthHeader(); }, 900);
        } catch (err) {
            console.error(err);
            // localStorage fallback (لو مفيش نت)
            const users = JSON.parse(localStorage.getItem('alamin_users') || '[]');
            const user = users.find(u => u.phone === phone && u.password === pass);
            if (user) {
                user.role = 'student';
                saveSession(user);
                const greetName2 = user.firstName || (user.name || '').split(' ')[0] || 'طالب';
                showFormAlert('✅ مرحباً بك يا ' + greetName2 + '! تم تسجيل الدخول بنجاح.', 'success', 'login-form-alert');
                setTimeout(() => { navigateTo('#home'); initAuthHeader(); }, 900);
            } else if (err && err.code === 'wrong-credentials') {
                addInlineErr('err-login-password', '❌ رقم الموبايل أو كلمة المرور غلط');
                showFormAlert('❌ رقم الموبايل أو كلمة المرور غلط!', 'error', 'login-form-alert');
            } else {
                showFormAlert(describeConnectionError(err), 'error', 'login-form-alert');
            }
        }
    } catch (err) {
        console.error('Unexpected login error:', err);
        showFormAlert('❌ حدث خطأ غير متوقع. برجاء المحاولة مرة أخرى.', 'error', 'login-form-alert');
    } finally {
        isLoginSubmitting = false;
        setButtonLoading('login-submit-btn', false);
    }
}

// ================= Submit Button Loading State Helpers =================
// بيتحكم في حالة التحميل لأي زرار submit: تعطيل + سبينر + منع الضغط المتكرر
function setButtonLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('is-loading');
    } else {
        btn.disabled = false;
        btn.classList.remove('is-loading');
    }
}

// ================= Inline Field Error Helpers =================
function showFieldError(fieldId, errId, message) {
    const input = document.getElementById(fieldId);
    const errEl = document.getElementById(errId);
    if (input) { input.classList.add('input-error'); }
    if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
    if (input && !document.querySelector('.input-error:focus')) {
        input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
function clearFieldError(fieldId, errId) {
    const input = document.getElementById(fieldId);
    const errEl = document.getElementById(errId);
    if (input) input.classList.remove('input-error');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
}
function clearAllRegisterErrors() {
    [['reg-fullname', 'err-fullname'],
    ['reg-phone', 'err-phone'], ['reg-father-phone', 'err-father-phone'],
    ['reg-recovery-phone', 'err-recovery-phone'], ['reg-school', 'err-school'],
    ['reg-grade', 'err-grade'], ['reg-track', 'err-track'],
    ['reg-gov', 'err-gov'], ['reg-gender', 'err-gender'],
    ['reg-password', 'err-password'], ['reg-password-confirm', 'err-password-confirm']
    ].forEach(([f, e]) => clearFieldError(f, e));
    clearFormAlert('reg-form-alert');
}
function clearAllLoginErrors() {
    [['login-phone', 'err-login-phone'], ['login-password', 'err-login-password']]
        .forEach(([f, e]) => clearFieldError(f, e));
    clearFormAlert('login-form-alert');
}
function showFormAlert(message, type, alertId) {
    const a = document.getElementById(alertId || 'reg-form-alert');
    if (!a) return;
    a.textContent = message;
    a.className = 'form-alert form-alert-' + (type || 'error');
    a.style.display = 'block';
    a.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function clearFormAlert(alertId) {
    const a = document.getElementById(alertId || 'reg-form-alert');
    if (a) { a.style.display = 'none'; a.textContent = ''; a.className = 'form-alert'; }
}
function addInlineErr(errId, message) {
    const fieldMap = {
        'err-fullname': 'reg-fullname', 'err-phone': 'reg-phone',
        'err-father-phone': 'reg-father-phone', 'err-recovery-phone': 'reg-recovery-phone',
        'err-school': 'reg-school', 'err-grade': 'reg-grade', 'err-track': 'reg-track',
        'err-gov': 'reg-gov', 'err-gender': 'reg-gender',
        'err-password': 'reg-password', 'err-password-confirm': 'reg-password-confirm',
        'err-login-phone': 'login-phone', 'err-login-password': 'login-password'
    };
    const e = document.getElementById(errId);
    if (e) { e.textContent = message; e.style.display = 'block'; }
    const inp = document.getElementById(fieldMap[errId]);
    if (inp) inp.classList.add('input-error');
}

// بيضيف timeout لأي Firestore promise عشان منعلقش لو النت بطيء أو الاتصال ضايع
function withTimeout(promise, ms, timeoutMessage) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(timeoutMessage || 'Timeout')), ms);
        promise.then(
            (val) => { clearTimeout(timer); resolve(val); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}

// ─────────────────────────────────────────────────────────────
// بيحدد نوع الخطأ الحقيقي قبل ما نوريه للمستخدم:
// فيه فرق بين "قطع اتصال فعلي بقاعدة البيانات" (مفيش نت / السيرفر
// مش راد / انتهت المهلة) وبين "خطأ داخل Cloud Function" (كود ناقص،
// منطقة deploy غلط، خطأ في منطق الفنكشن نفسها...). النوع التاني مش
// معناه إن قاعدة البيانات فيها مشكلة، فمينفعش نطلع رسالة
// "خطأ في الاتصال بقاعدة البيانات" في الحالتين وكأنهم نفس الحاجة.
// ─────────────────────────────────────────────────────────────
function describeConnectionError(err, fallbackMsg) {
    const code = (err && err.code) || '';
    const msg = (err && err.message) || '';

    const isRealConnectionIssue =
        code === 'auth/network-request-failed' ||
        code === 'unavailable' ||
        code === 'functions/unavailable' ||
        code === 'functions/deadline-exceeded' ||
        /timeout/i.test(msg) ||
        (typeof navigator !== 'undefined' && navigator.onLine === false);

    if (isRealConnectionIssue) {
        return '❌ تعذّر الاتصال بقاعدة البيانات. تأكد من اتصال الإنترنت وحاول مرة أخرى.';
    }

    // مش قطع اتصال بالداتابيز — نسجّل التفاصيل عشان تبان في الـ console
    // للتشخيص، ونطلع للمستخدم رسالة عامة صحيحة بدل ما نلوم قاعدة البيانات ظلماً.
    console.error('[Non-DB error — Cloud Function/service issue]', code || '(no code)', msg);
    return fallbackMsg || '❌ حدث خطأ غير متوقع أثناء تنفيذ العملية. حاول مرة أخرى، ولو استمرت المشكلة برجاء إبلاغ الدعم الفني.';
}

let isRegisterSubmitting = false;

// Submit Handler for Registration
async function handleRegisterSubmit(e) {
    e.preventDefault();

    // ── منع الضغطات المتكررة أثناء إرسال الطلب ──
    if (isRegisterSubmitting) return;
    isRegisterSubmitting = true;
    setButtonLoading('register-submit-btn', true);

    try {
        clearAllRegisterErrors();

        const dbReady = await ensureDb();
        if (!dbReady) {
            showFormAlert('❌ تعذّر الاتصال بقاعدة البيانات. تأكد من اتصال الإنترنت وحاول مرة أخرى.', 'error', 'reg-form-alert');
            return;
        }

        const fullName = (document.getElementById('reg-fullname')?.value || '').trim().replace(/\s+/g, ' ');

        const phone = (document.getElementById('reg-phone')?.value || '').trim();
        const fatherPhone = (document.getElementById('reg-father-phone')?.value || '').trim();
        const recoveryPhone = (document.getElementById('reg-recovery-phone')?.value || '').trim();

        const school = (document.getElementById('reg-school')?.value || '').trim();
        const grade = document.getElementById('reg-grade')?.value || '';
        const track = document.getElementById('reg-track')?.value || '';
        const gov = document.getElementById('reg-gov')?.value || '';
        const gender = document.getElementById('reg-gender')?.value || '';
        const password = (document.getElementById('reg-password')?.value || '').trim();
        const passwordConfirm = (document.getElementById('reg-password-confirm')?.value || '').trim();

        // ─── Inline Validations ────────────────────────────────────
        let firstErrorField = null;
        function markErr(fid, eid, msg) {
            addInlineErr(eid, msg);
            if (!firstErrorField) firstErrorField = fid;
        }

        // الاسم الثلاثي: لازم 3 كلمات على الأقل (الاسم الأول + الثاني + الثالث)
        const nameParts = fullName ? fullName.split(' ').filter(Boolean) : [];
        if (!fullName) {
            markErr('reg-fullname', 'err-fullname', '⚠️ الاسم الثلاثي مطلوب');
        } else if (nameParts.length < 3) {
            markErr('reg-fullname', 'err-fullname', '⚠️ من فضلك ادخل الاسم الثلاثي كاملاً (الاسم الأول والثاني والثالث)');
        }

        if (!isValidPhoneNumber(phone)) {
            markErr('reg-phone', 'err-phone', '⚠️ رقم هاتف الطالب غير صحيح — مصري (11 رقماً يبدأ بـ 010/011/012/015) أو فلسطيني (10 أرقام يبدأ بـ 059/056)');
        }
        if (!isValidPhoneNumber(fatherPhone)) {
            markErr('reg-father-phone', 'err-father-phone', '⚠️ رقم هاتف ولي الأمر غير صحيح — مصري (11 رقماً يبدأ بـ 010/011/012/015) أو فلسطيني (10 أرقام يبدأ بـ 059/056)');
        }
        if (!isValidPhoneNumber(recoveryPhone)) {
            markErr('reg-recovery-phone', 'err-recovery-phone', '⚠️ رقم الاسترداد غير صحيح — مصري (11 رقماً يبدأ بـ 010/011/012/015) أو فلسطيني (10 أرقام يبدأ بـ 059/056)');
        }
        if (!school) {
            markErr('reg-school', 'err-school', '⚠️ اسم المدرسة مطلوب');
        }
        if (!grade) {
            markErr('reg-grade', 'err-grade', '⚠️ برجاء اختيار الصف الدراسي');
        }

        const isSecondary = typeof isSecondaryGrade === 'function'
            ? isSecondaryGrade(grade)
            : ['1', '2', '3'].includes(grade);

        if (isSecondary && !track) {
            markErr('reg-track', 'err-track', '⚠️ برجاء تحديد الشعبة: علمي ولا أدبي؟');
        }
        if (!gov) {
            markErr('reg-gov', 'err-gov', '⚠️ برجاء اختيار المحافظة');
        }
        if (!gender) {
            markErr('reg-gender', 'err-gender', '⚠️ برجاء اختيار النوع');
        }
        if (password.length < 6) {
            markErr('reg-password', 'err-password', '⚠️ كلمة المرور يجب ألا تقل عن 6 خانات');
        } else if (!passwordConfirm) {
            markErr('reg-password-confirm', 'err-password-confirm', '⚠️ من فضلك أكّد كلمة المرور');
        } else if (password !== passwordConfirm) {
            markErr('reg-password-confirm', 'err-password-confirm', '❌ كلمة المرور وتأكيدها غير متطابقتين');
        }

        if (firstErrorField) {
            const el = document.getElementById(firstErrorField);
            if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            showFormAlert('⚠️ يوجد بعض الأخطاء في البيانات المدخلة، برجاء مراجعتها وتصحيحها أعلاه.', 'error', 'reg-form-alert');
            return;
        }

        const firstNameForGreeting = nameParts[0] || fullName;

        // ─── فحص التكرار: هل الرقم مسجل قبل كده؟ ───────────────────
        try {
            const existingDoc = await withTimeout(
                window.db.collection(STUDENTS_COLLECTION).doc(phone).get(),
                8000, 'check-timeout'
            );
            if (existingDoc.exists) {
                addInlineErr('err-phone', '❌ هذا الرقم مسجل بالفعل — جاري تحويلك لصفحة تسجيل الدخول');
                document.getElementById('reg-phone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                showFormAlert('❌ هذا الرقم مسجل بالفعل. جاري تحويلك لصفحة تسجيل الدخول...', 'error', 'reg-form-alert');
                setTimeout(() => { navigateTo('#login'); }, 1500);
                return;
            }
        } catch (readErr) {
            console.warn('Duplicate check skipped (error or timeout):', readErr);
        }

        // ─── بناء بيانات الطالب وحفظها مباشرة على Firestore (taninya) ───
        const newStudent = {
            name: fullName, fullName,
            phone, fatherPhone, recoveryPhone,
            school, grade, track: isSecondary ? track : null, gov, gender, password,
            studentType: 'outside', role: 'student', status: 'pending',
            enrolledCourses: [], qrCode: phone,
            joinDate: new Date().toLocaleDateString('ar-EG'),
            registeredAt: new Date().toISOString()
        };

        try {
            await withTimeout(
                window.db.collection(STUDENTS_COLLECTION).doc(phone).set(newStudent),
                12000, 'save-timeout'
            );
        } catch (writeErr) {
            console.error('Registration write failed:', writeErr);
            showFormAlert('❌ حدث خطأ أثناء حفظ بياناتك. تأكد من اتصال الإنترنت وحاول مرة أخرى.', 'error', 'reg-form-alert');
            return;
        }

        // ─── Auto Login ───────────────────────────────────────────
        saveSession({ id: phone, ...newStudent });

        showFormAlert(`✅ تم إنشاء حسابك بنجاح يا ${firstNameForGreeting}! جاري تسجيل دخولك...`, 'success', 'reg-form-alert');

        // إعادة تحميل البيانات اللازمة (الكورسات، حالة الهيدر...) بعد الدخول التلقائي
        try {
            await loadHomeCourses();
        } catch (err) {
            console.warn('loadHomeCourses after auto-login failed:', err);
        }
        initAuthHeader();

        setTimeout(() => {
            document.getElementById('register-form')?.reset();
            handleGradeChange();
            // دخول مباشر إلى المنصة بدون المطالبة بتسجيل الدخول مرة أخرى
            navigateTo('#home');
        }, 1200);
    } catch (err) {
        // أي خطأ غير متوقع لم تتم معالجته فوق
        console.error('Unexpected register error:', err);
        showFormAlert('❌ حدث خطأ غير متوقع. برجاء المحاولة مرة أخرى.', 'error', 'reg-form-alert');
    } finally {
        isRegisterSubmitting = false;
        setButtonLoading('register-submit-btn', false);
    }
}

// Submit Handler for Forgot Password
async function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    if (!ensureDb()) return;

    const alertBox = document.getElementById('forgot-modal-alert');
    const showAlert = (msg, type) => {
        alertBox.textContent = msg;
        alertBox.className = 'forgot-modal-alert ' + (type === 'ok' ? 'ok' : 'err');
    };

    const phone = document.getElementById('fp-phone').value.trim();
    const recoveryPhone = document.getElementById('fp-recovery-phone').value.trim();
    const newPassword = document.getElementById('fp-new-password').value.trim();
    const confirmPassword = document.getElementById('fp-confirm-password').value.trim();

    if (!isValidPhoneNumber(phone) || !isValidPhoneNumber(recoveryPhone)) {
        showAlert('❌ برجاء إدخال أرقام هواتف صحيحة (مصرية أو فلسطينية)', 'err');
        return;
    }
    if (newPassword.length < 6) {
        showAlert('❌ كلمة المرور الجديدة 6 أحرف على الأقل', 'err');
        return;
    }
    if (newPassword !== confirmPassword) {
        showAlert('❌ كلمة المرور الجديدة وتأكيدها غير متطابقتين', 'err');
        return;
    }

    // التحقق من رقم الاسترداد وتحديث الباسورد مباشرة على Firestore
    try {
        const doc = await window.db.collection(STUDENTS_COLLECTION).doc(phone).get();
        if (!doc.exists || String((doc.data() || {}).recoveryPhone || '') !== recoveryPhone) {
            showAlert('❌ رقم الهاتف أو رقم استعادة الحساب غير مطابقين لبياناتنا.', 'err');
            return;
        }
        await window.db.collection(STUDENTS_COLLECTION).doc(phone).update({ password: newPassword });
    } catch (err) {
        console.error('Password reset failed:', err);
        showAlert('❌ حدث خطأ أثناء تحديث كلمة المرور. حاول مرة أخرى.', 'err');
        return;
    }

    showAlert('✅ تم تغيير كلمة المرور بنجاح! يمكنك تسجيل الدخول الآن.', 'ok');
    setTimeout(() => {
        document.getElementById('forgot-password-overlay').classList.remove('active');
        document.getElementById('forgot-password-form').reset();
    }, 1800);
}
window.handleForgotPasswordSubmit = handleForgotPasswordSubmit;

// ================= Banners Smooth Scroll Helper =================
function scrollToCourses(e) {
    e.preventDefault();
    const coursesSection = document.querySelector('.courses-section');
    if (coursesSection) {
        coursesSection.scrollIntoView({ behavior: 'smooth' });
    }
}
window.scrollToCourses = scrollToCourses;

// ================= AI Recommendation Popup =================
// تم إلغاء هذا البوب-أب المنبثق نهائيًا بناءً على طلب العميل.
// القسم الثابت الخاص بالمساعد الذكي داخل الصفحة الرئيسية (ai-advisor-section) باقٍ ولم يتأثر.
