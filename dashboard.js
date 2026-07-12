// ============================================================
// لوحة تحكم المحتوى - إدارة الكورسات والاختبارات
// تخزين محلي بالكامل (localStorage) - بدون أي اتصال بقاعدة بيانات خارجية
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initDashTheme();
    renderCourses();
    renderQuizzes();
    renderBank();
    updateStats();
    buildColorGrid();
    populateQuizCourseSelect();
});

// ---------------- THEME (shares the same key as the main site) ----------------
function initDashTheme() {
    const btn = document.getElementById('dashThemeToggle');
    const saved = localStorage.getItem('theme') || 'light';
    applyDashTheme(saved);
    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyDashTheme(next);
        localStorage.setItem('theme', next);
    });
}
function applyDashTheme(mode) {
    const btn = document.getElementById('dashThemeToggle');
    if (mode === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        btn.innerHTML = '<i class="fas fa-sun"></i> الوضع النهاري';
    } else {
        document.documentElement.removeAttribute('data-theme');
        btn.innerHTML = '<i class="fas fa-moon"></i> الوضع الليلي';
    }
}

// ---------------- PAGE SWITCHING ----------------
const PAGE_TITLES = {
    overview: 'نظرة عامة',
    courses: 'إدارة الكورسات',
    quizzes: 'إدارة الاختبارات',
    bank: 'بنك الأسئلة'
};
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('topbarTitle').textContent = PAGE_TITLES[name] || '';
    if (name === 'bank') renderBank();
}

// ---------------- LOCAL DATA LAYER ----------------
const DASH_DB = {
    getCourses: () => JSON.parse(localStorage.getItem('dash_courses')) || [],
    saveCourses: (arr) => localStorage.setItem('dash_courses', JSON.stringify(arr)),
    getQuizzes: () => JSON.parse(localStorage.getItem('dash_quizzes')) || [],
    saveQuizzes: (arr) => localStorage.setItem('dash_quizzes', JSON.stringify(arr)),
    getBank: () => JSON.parse(localStorage.getItem('dash_question_bank')) || [],
    saveBank: (arr) => localStorage.setItem('dash_question_bank', JSON.stringify(arr))
};

function updateStats() {
    document.getElementById('statCourses').textContent = DASH_DB.getCourses().length;
    document.getElementById('statQuizzes').textContent = DASH_DB.getQuizzes().length;
    document.getElementById('statQuestions').textContent = DASH_DB.getBank().length;
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// ============================================================
// =======================  COURSES  ===========================
// ============================================================

const COLOR_PRESETS = [
    'linear-gradient(135deg,#0284c7,#0369a1)',
    'linear-gradient(135deg,#eab308,#ca8a04)',
    'linear-gradient(135deg,#16a34a,#15803d)',
    'linear-gradient(135deg,#7c3aed,#5b21b6)',
    'linear-gradient(135deg,#ec4899,#be185d)',
    'linear-gradient(135deg,#0f172a,#334155)'
];

function buildColorGrid() {
    const grid = document.getElementById('colorGrid');
    grid.innerHTML = COLOR_PRESETS.map((c, i) =>
        `<div class="color-swatch" style="background:${c}" onclick="pickColor('${c}', this)"></div>`
    ).join('');
}
function pickColor(color, el) {
    document.getElementById('cColor').value = color;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
}

function handleThumbSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        document.getElementById('cThumb').value = ev.target.result;
        document.getElementById('thumbPreviewImg').src = ev.target.result;
        document.getElementById('thumbPreview').style.display = 'block';
        document.getElementById('thumbDrop').style.display = 'none';
    };
    reader.readAsDataURL(file);
}
function clearThumb() {
    document.getElementById('cThumb').value = '';
    document.getElementById('thumbPreview').style.display = 'none';
    document.getElementById('thumbDrop').style.display = 'flex';
    document.getElementById('cThumbInput').value = '';
}

function togglePriceField() {
    const isPaid = document.getElementById('cType').value === 'paid';
    document.getElementById('cPriceGroup').style.display = isPaid ? 'block' : 'none';
}

// ---- Lessons editor (inside course modal) ----
let currentLessons = [];

function addLessonField(lesson = null) {
    currentLessons.push(lesson || { title: '', videoUrl: '', pdfUrl: '' });
    renderLessonFields();
}
function removeLessonField(idx) {
    currentLessons.splice(idx, 1);
    renderLessonFields();
}
function renderLessonFields() {
    const wrap = document.getElementById('lessonsListWrap');
    if (currentLessons.length === 0) {
        wrap.innerHTML = '<div class="field-hint">لسه مفيش دروس مضافة لهذا الكورس.</div>';
        return;
    }
    wrap.innerHTML = currentLessons.map((l, i) => `
        <div class="lesson-row">
            <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                <input type="text" placeholder="عنوان الدرس" value="${escapeAttr(l.title)}" oninput="currentLessons[${i}].title=this.value">
                <input type="text" placeholder="رابط الفيديو (يوتيوب أو غيره)" value="${escapeAttr(l.videoUrl)}" oninput="currentLessons[${i}].videoUrl=this.value">
                <input type="text" placeholder="رابط PDF (اختياري)" value="${escapeAttr(l.pdfUrl)}" oninput="currentLessons[${i}].pdfUrl=this.value">
            </div>
            <button type="button" class="btn-mini btn-delete" onclick="removeLessonField(${i})">🗑️</button>
        </div>
    `).join('');
}

function openCourseModal(courseId = null) {
    document.getElementById('courseModalTitle').textContent = courseId ? 'تعديل الكورس ✏️' : 'إضافة كورس جديد 📚';
    document.getElementById('cId').value = '';
    document.getElementById('cTitle').value = '';
    document.getElementById('cDesc').value = '';
    document.getElementById('cGrade').value = '1';
    document.getElementById('cType').value = 'free';
    document.getElementById('cPrice').value = '';
    document.getElementById('cColor').value = COLOR_PRESETS[0];
    document.getElementById('cThumb').value = '';
    document.getElementById('thumbPreview').style.display = 'none';
    document.getElementById('thumbDrop').style.display = 'flex';
    currentLessons = [];
    togglePriceField();

    if (courseId) {
        const course = DASH_DB.getCourses().find(c => c.id === courseId);
        if (course) {
            document.getElementById('cId').value = course.id;
            document.getElementById('cTitle').value = course.title;
            document.getElementById('cDesc').value = course.desc || '';
            document.getElementById('cGrade').value = course.grade;
            document.getElementById('cType').value = course.type;
            document.getElementById('cPrice').value = course.price || '';
            document.getElementById('cColor').value = course.color;
            if (course.thumb) {
                document.getElementById('cThumb').value = course.thumb;
                document.getElementById('thumbPreviewImg').src = course.thumb;
                document.getElementById('thumbPreview').style.display = 'block';
                document.getElementById('thumbDrop').style.display = 'none';
            }
            currentLessons = course.lessons ? [...course.lessons] : [];
            togglePriceField();
        }
    }
    renderLessonFields();
    document.getElementById('courseModal').classList.add('open');
}

function saveCourse() {
    const title = document.getElementById('cTitle').value.trim();
    if (!title) { alert('برجاء إدخال اسم الكورس'); return; }

    const id = document.getElementById('cId').value || ('course_' + Date.now());
    const courseData = {
        id,
        title,
        desc: document.getElementById('cDesc').value.trim(),
        grade: document.getElementById('cGrade').value,
        type: document.getElementById('cType').value,
        price: document.getElementById('cType').value === 'paid' ? Number(document.getElementById('cPrice').value || 0) : 0,
        color: document.getElementById('cColor').value,
        thumb: document.getElementById('cThumb').value,
        lessons: currentLessons.filter(l => l.title.trim() !== ''),
        updatedAt: new Date().toISOString()
    };

    let courses = DASH_DB.getCourses();
    const existingIdx = courses.findIndex(c => c.id === id);
    if (existingIdx >= 0) {
        courses[existingIdx] = courseData;
    } else {
        courses.push(courseData);
    }
    DASH_DB.saveCourses(courses);

    closeModal('courseModal');
    renderCourses();
    updateStats();
    populateQuizCourseSelect();
}

function deleteCourse(id) {
    if (!confirm('متأكد إنك عايز تحذف الكورس ده؟')) return;
    DASH_DB.saveCourses(DASH_DB.getCourses().filter(c => c.id !== id));
    renderCourses();
    updateStats();
    populateQuizCourseSelect();
}

function gradeLabel(g) {
    return { '1': 'أول ثانوي', '2': 'ثاني ثانوي', '3': 'ثالث ثانوي', 'all': 'كل الصفوف' }[g] || g;
}

function renderCourses() {
    const grid = document.getElementById('coursesGrid');
    const courses = DASH_DB.getCourses();
    if (courses.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">📚</div><p>لسه مفيش كورسات مضافة. اضغط "إضافة كورس" عشان تبدأ.</p></div>`;
        return;
    }
    grid.innerHTML = courses.map(c => `
        <div class="course-card">
            <div class="course-cover" style="background:${c.thumb ? '#000' : c.color}">
                ${c.thumb ? `<img src="${c.thumb}" alt="${escapeAttr(c.title)}"><div class="course-cover-overlay"></div>` : ''}
                <span>${escapeHtml(c.title)}</span>
            </div>
            <div class="course-body">
                <div class="course-title">${escapeHtml(c.title)}</div>
                <div class="course-meta">
                    <span class="tag grade">${gradeLabel(c.grade)}</span>
                    <span class="tag ${c.type === 'free' ? 'free' : 'paid'}">${c.type === 'free' ? 'مجاني' : c.price + ' ج.م'}</span>
                    <span class="tag grade">${(c.lessons || []).length} درس</span>
                </div>
                <div class="course-footer">
                    <button class="btn-mini btn-edit" onclick="openCourseModal('${c.id}')">✏️ تعديل</button>
                    <button class="btn-mini btn-delete" onclick="deleteCourse('${c.id}')">🗑️ حذف</button>
                </div>
            </div>
        </div>
    `).join('');
}

function populateQuizCourseSelect() {
    const sel = document.getElementById('qCourse');
    const courses = DASH_DB.getCourses();
    const current = sel.value;
    sel.innerHTML = '<option value="">بدون ربط</option>' + courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
    sel.value = current;
}

// ============================================================
// =======================  QUIZZES  ===========================
// ============================================================

let currentQuestions = [];

function addQuestionField(q = null) {
    currentQuestions.push(q || { text: '', options: ['', '', '', ''], correct: 0, points: 1 });
    renderQuestionFields();
}
function removeQuestionField(idx) {
    currentQuestions.splice(idx, 1);
    renderQuestionFields();
}
function renderQuestionFields() {
    const wrap = document.getElementById('questionsWrap');
    document.getElementById('qCountLbl').textContent = `(${currentQuestions.length} سؤال)`;
    if (currentQuestions.length === 0) {
        wrap.innerHTML = '<div class="field-hint">لسه مفيش أسئلة مضافة. اضغط "سؤال جديد" أو استورد من بنك الأسئلة.</div>';
        return;
    }
    wrap.innerHTML = currentQuestions.map((q, i) => `
        <div class="q-block">
            <div class="q-block-head">
                <strong style="font-size:13px;color:var(--primary-color)">سؤال ${i + 1}</strong>
                <button type="button" class="btn-mini btn-delete" onclick="removeQuestionField(${i})">🗑️ حذف</button>
            </div>
            <div class="form-group" style="margin-bottom:10px">
                <textarea rows="2" placeholder="نص السؤال" oninput="currentQuestions[${i}].text=this.value" style="resize:vertical">${escapeHtml(q.text)}</textarea>
            </div>
            ${q.options.map((opt, oi) => `
                <div class="opt-row">
                    <input type="radio" name="correct_${i}" ${q.correct === oi ? 'checked' : ''} onchange="currentQuestions[${i}].correct=${oi}">
                    <input type="text" placeholder="اختيار ${oi + 1}" value="${escapeAttr(opt)}" oninput="currentQuestions[${i}].options[${oi}]=this.value">
                </div>
            `).join('')}
            <div class="field-hint">حدد الدائرة بجانب الإجابة الصحيحة.</div>
        </div>
    `).join('');
}

function openQuizModal(quizId = null) {
    document.getElementById('quizModalTitle').textContent = quizId ? 'تعديل الاختبار ✏️' : 'إنشاء اختبار جديد 📝';
    document.getElementById('qId').value = '';
    document.getElementById('qTitle').value = '';
    document.getElementById('qGrade').value = '1';
    document.getElementById('qTime').value = '30';
    document.getElementById('qPassing').value = '50';
    populateQuizCourseSelect();
    document.getElementById('qCourse').value = '';
    currentQuestions = [];

    if (quizId) {
        const quiz = DASH_DB.getQuizzes().find(q => q.id === quizId);
        if (quiz) {
            document.getElementById('qId').value = quiz.id;
            document.getElementById('qTitle').value = quiz.title;
            document.getElementById('qGrade').value = quiz.grade;
            document.getElementById('qTime').value = quiz.time;
            document.getElementById('qPassing').value = quiz.passing;
            document.getElementById('qCourse').value = quiz.courseId || '';
            currentQuestions = quiz.questions ? JSON.parse(JSON.stringify(quiz.questions)) : [];
        }
    }
    renderQuestionFields();
    document.getElementById('quizModal').classList.add('open');
}

function saveQuiz() {
    const title = document.getElementById('qTitle').value.trim();
    if (!title) { alert('برجاء إدخال عنوان الاختبار'); return; }
    const cleanQuestions = currentQuestions.filter(q => q.text.trim() !== '');
    if (cleanQuestions.length === 0) { alert('برجاء إضافة سؤال واحد على الأقل'); return; }

    const id = document.getElementById('qId').value || ('quiz_' + Date.now());
    const quizData = {
        id,
        title,
        grade: document.getElementById('qGrade').value,
        time: Number(document.getElementById('qTime').value || 30),
        passing: Number(document.getElementById('qPassing').value || 50),
        courseId: document.getElementById('qCourse').value || null,
        questions: cleanQuestions,
        updatedAt: new Date().toISOString()
    };

    let quizzes = DASH_DB.getQuizzes();
    const idx = quizzes.findIndex(q => q.id === id);
    if (idx >= 0) quizzes[idx] = quizData; else quizzes.push(quizData);
    DASH_DB.saveQuizzes(quizzes);

    // Save each question into the reusable question bank too
    let bank = DASH_DB.getBank();
    cleanQuestions.forEach(q => {
        const exists = bank.some(b => b.text === q.text);
        if (!exists) {
            bank.push({
                id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                text: q.text,
                options: q.options,
                correct: q.correct,
                grade: quizData.grade
            });
        }
    });
    DASH_DB.saveBank(bank);

    closeModal('quizModal');
    renderQuizzes();
    renderBank();
    updateStats();
}

function deleteQuiz(id) {
    if (!confirm('متأكد إنك عايز تحذف الاختبار ده؟')) return;
    DASH_DB.saveQuizzes(DASH_DB.getQuizzes().filter(q => q.id !== id));
    renderQuizzes();
    updateStats();
}

function renderQuizzes() {
    const wrap = document.getElementById('quizzesList');
    const quizzes = DASH_DB.getQuizzes();
    if (quizzes.length === 0) {
        wrap.innerHTML = `<div class="empty-state"><div class="icon">📝</div><p>لسه مفيش اختبارات مضافة. اضغط "إنشاء اختبار" عشان تبدأ.</p></div>`;
        return;
    }
    const courses = DASH_DB.getCourses();
    wrap.innerHTML = quizzes.map(q => {
        const course = courses.find(c => c.id === q.courseId);
        return `
        <div class="quiz-card">
            <div class="quiz-info">
                <h4>${escapeHtml(q.title)}</h4>
                <div class="quiz-meta">
                    <span><i class="fas fa-layer-group"></i> ${gradeLabel(q.grade)}</span>
                    <span><i class="fas fa-clock"></i> ${q.time} دقيقة</span>
                    <span><i class="fas fa-circle-question"></i> ${q.questions.length} سؤال</span>
                    ${course ? `<span><i class="fas fa-graduation-cap"></i> ${escapeHtml(course.title)}</span>` : ''}
                </div>
            </div>
            <div class="quiz-actions">
                <button class="btn-mini btn-edit" onclick="openQuizModal('${q.id}')">✏️ تعديل</button>
                <button class="btn-mini btn-delete" onclick="deleteQuiz('${q.id}')">🗑️ حذف</button>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// =====================  QUESTION BANK  =======================
// ============================================================

function renderBank() {
    const wrap = document.getElementById('bankList');
    const bank = DASH_DB.getBank();
    if (bank.length === 0) {
        wrap.innerHTML = `<div class="empty-state"><div class="icon">🗂️</div><p>لسه مفيش أسئلة محفوظة. الأسئلة بتتسجل هنا أوتوماتيك أول ما تضيفها لأي اختبار.</p></div>`;
        return;
    }
    wrap.innerHTML = bank.map(q => `
        <div class="quiz-card">
            <div class="quiz-info">
                <h4>${escapeHtml(q.text)}</h4>
                <div class="quiz-meta"><span><i class="fas fa-layer-group"></i> ${gradeLabel(q.grade)}</span></div>
            </div>
            <div class="quiz-actions">
                <button class="btn-mini btn-delete" onclick="deleteBankQuestion('${q.id}')">🗑️ حذف</button>
            </div>
        </div>
    `).join('');
}

function deleteBankQuestion(id) {
    if (!confirm('حذف السؤال من البنك؟')) return;
    DASH_DB.saveBank(DASH_DB.getBank().filter(q => q.id !== id));
    renderBank();
    updateStats();
}

// ---- Picker: import questions from bank into current quiz ----
let pickedQuestionIds = new Set();

function openBankPicker() {
    pickedQuestionIds = new Set();
    const wrap = document.getElementById('bankPickerList');
    const bank = DASH_DB.getBank();
    if (bank.length === 0) {
        wrap.innerHTML = '<div class="field-hint">بنك الأسئلة فاضي لسه.</div>';
    } else {
        wrap.innerHTML = bank.map(q => `
            <label style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:10px;cursor:pointer;">
                <input type="checkbox" onchange="toggleBankPick('${q.id}', this.checked)">
                <span style="font-size:13px;font-weight:600">${escapeHtml(q.text)}</span>
            </label>
        `).join('');
    }
    document.getElementById('bankPickerModal').classList.add('open');
}
function toggleBankPick(id, checked) {
    if (checked) pickedQuestionIds.add(id); else pickedQuestionIds.delete(id);
}
function importPickedQuestions() {
    const bank = DASH_DB.getBank();
    bank.filter(q => pickedQuestionIds.has(q.id)).forEach(q => {
        currentQuestions.push({ text: q.text, options: [...q.options], correct: q.correct, points: 1 });
    });
    renderQuestionFields();
    closeModal('bankPickerModal');
}

// ---------------- HELPERS ----------------
function escapeHtml(str) {
    return (str || '').toString()
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
    return (str || '').toString().replace(/"/g, '&quot;');
}
