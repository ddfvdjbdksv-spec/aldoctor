# Implementation Plan - Adding Premium Promo Banners

This plan details the design and implementation of two premium interactive banners on the homepage, immediately below the courses section.

## Proposed Changes

### [Component Name] Front-end Layout & Styling

We will add two new visual banner sections to the homepage. These banners will match the aesthetic of the platform (sleek dark blue gradients, light borders, subtle glows, and modern transitions).

---

#### [MODIFY] [index.html](file:///c:/Users/M%20lapan/OneDrive/Desktop/الدكتور/index.html)

Insert the new banner code directly under the `.courses-section` grid container:

```html
            <!-- ══ Promo Sections ══ -->
            <section class="promos-wrapper">
                <!-- Promo 1: Discover Courses -->
                <div class="promo-card promo-courses">
                    <div class="promo-body">
                        <div class="promo-content">
                            <span class="promo-badge"><i class="fas fa-graduation-cap"></i> كورسات الدكتور</span>
                            <h2 class="promo-title">اكتشف كورساتنا المتميزة</h2>
                            <p class="promo-text">
                                اختر من بين مجموعة واسعة من الكورسات الشاملة المصممة خصيصاً لمساعدتك في التميز وإتقان اللغة العربية بكل سهولة وبأعلى جودة تعليمية.
                            </p>
                            <a href="#home" class="btn-promo btn-courses-animate" onclick="scrollToCourses(event)">
                                اكتشف كورساتنا <i class="fas fa-arrow-left"></i>
                            </a>
                        </div>
                        <div class="promo-media">
                            <div class="promo-glow"></div>
                            <img src="اكتشف كورستنا.png" alt="اكتشف كورساتنا" class="promo-img">
                        </div>
                    </div>
                </div>

                <!-- Promo 2: Join Us -->
                <div class="promo-card promo-join">
                    <div class="promo-body">
                        <div class="promo-content">
                            <span class="promo-badge"><i class="fas fa-users"></i> انضم إلينا</span>
                            <h2 class="promo-title">عايز تنضم لينا في فريق بسطتهالك؟</h2>
                            <p class="promo-text">
                                يمكنك الآن الانضمام لفريق المعلمين على المنصة، والمشاركة في تدريس المناهج التعليمية للصفوف الثانوية والمساهمة في تطوير المنصة وتعليم الطلاب بأفضل طريقة ممكنة!
                            </p>
                            <a href="https://wa.me/201028164601" target="_blank" class="btn-promo btn-yellow">
                                انضم الآن <i class="fab fa-whatsapp"></i>
                            </a>
                        </div>
                        <div class="promo-media">
                            <div class="promo-glow"></div>
                            <img src="انضم لعائلتنا.png" alt="انضم لعائلتنا" class="promo-img">
                        </div>
                    </div>
                </div>
            </section>
```

---

#### [MODIFY] [style.css](file:///c:/Users/M%20lapan/OneDrive/Desktop/الدكتور/style.css)

Append the following responsive styles to the end of `style.css`:

```css
/* ═══════════════════════════════════════════════════════════
   PROMO SECTIONS — Discover Courses & Join Family Banners
   ═══════════════════════════════════════════════════════════ */

.promos-wrapper {
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 24px 80px;
    display: flex;
    flex-direction: column;
    gap: 40px;
}

.promo-card {
    background: linear-gradient(135deg, #091e3a 0%, #2f80ed 100%);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 48px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
    transition: transform 0.4s ease, box-shadow 0.4s ease;
}

.promo-courses {
    background: linear-gradient(135deg, #0b2545 0%, #134074 100%);
    border-color: rgba(56, 189, 248, 0.2);
}

.promo-join {
    background: linear-gradient(135deg, #06283d 0%, #1363df 100%);
    border-color: rgba(56, 189, 248, 0.2);
}

[data-theme="dark"] .promo-courses {
    background: linear-gradient(135deg, #02111d 0%, #0c3558 100%);
}

[data-theme="dark"] .promo-join {
    background: linear-gradient(135deg, #011422 0%, #0d468b 100%);
}

.promo-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 48px;
}

.promo-content {
    flex: 1.2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: right;
}

.promo-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #e0f2fe;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 6px 14px;
    border-radius: 30px;
    margin-bottom: 20px;
}

.promo-title {
    font-size: 2.2rem;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.3;
    margin-bottom: 16px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.promo-text {
    font-size: 1.05rem;
    color: #e0f2fe;
    line-height: 1.8;
    margin-bottom: 32px;
    max-width: 650px;
    opacity: 0.95;
}

.btn-promo {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: #ffffff;
    font-weight: 800;
    font-size: 1.05rem;
    padding: 14px 32px;
    border-radius: 14px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
    transition: all 0.3s ease;
}

.btn-promo:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(2, 132, 199, 0.5);
    filter: brightness(1.1);
}

.btn-promo.btn-yellow {
    background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
    color: #0f172a;
    box-shadow: 0 4px 14px rgba(234, 179, 8, 0.3);
}

.btn-promo.btn-yellow:hover {
    box-shadow: 0 8px 24px rgba(234, 179, 8, 0.5);
}

/* Horizontal slide animation for the courses button */
@keyframes promo-move-x {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(-8px); }
}

.btn-courses-animate {
    animation: promo-move-x 2s ease-in-out infinite;
}

.btn-courses-animate:hover {
    animation-play-state: paused;
    transform: translateY(-2px) scale(1.03);
}

.promo-media {
    flex: 0.8;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
}

.promo-glow {
    position: absolute;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%);
    z-index: 0;
    pointer-events: none;
}

.promo-img {
    width: 100%;
    max-height: 280px;
    object-fit: contain;
    position: relative;
    z-index: 1;
    transition: transform 0.5s ease;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.25));
}

.promo-card:hover .promo-img {
    transform: scale(1.05) translateY(-5px);
}

/* Responsive Rules */
@media (max-width: 992px) {
    .promo-body {
        flex-direction: column-reverse;
        gap: 36px;
    }
    
    .promo-content {
        align-items: center;
        text-align: center;
    }
    
    .promo-media {
        width: 100%;
    }
    
    .promo-img {
        max-height: 220px;
    }
}

@media (max-width: 576px) {
    .promo-card {
        padding: 32px 20px;
        border-radius: 20px;
    }
    
    .promo-title {
        font-size: 1.7rem;
    }
    
    .promo-text {
        font-size: 0.95rem;
    }
    
    .btn-promo {
        width: 100%;
        justify-content: center;
        padding: 12px 24px;
        font-size: 0.95rem;
    }
}
```

---

#### [MODIFY] [app.js](file:///c:/Users/M%20lapan/OneDrive/Desktop/الدكتور/app.js)

Append the smooth-scroll click-handler to the end of `app.js`:

```javascript
// ================= Banners Smooth Scroll Helper =================
function scrollToCourses(e) {
    e.preventDefault();
    const coursesSection = document.querySelector('.courses-section');
    if (coursesSection) {
        coursesSection.scrollIntoView({ behavior: 'smooth' });
    }
}
window.scrollToCourses = scrollToCourses;
```

---

## Verification Plan

### Automated / Browser-based Verification
1. Open the project in the browser.
2. Confirm the images load correctly inside the banners.
3. Hover on the "Discover our courses" button and verify it transitions correctly and pauses the horizontal swing animation.
4. Click the button to confirm smooth scrolling to the courses grid.
5. Check dark/light mode toggle and verify banner colors adjust cleanly.
6. Verify mobile viewport presentation.
