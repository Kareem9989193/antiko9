// Antiko Team Hacking Animation Script
const initBackground = () => {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width, height;
    let matrixCols = [];
    let circuits = [];

    const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;

        // Init Matrix rain columns
        const fontSize = 16;
        const columns = Math.ceil(width / fontSize);
        matrixCols = new Array(columns).fill(0).map(() => Math.random() * -100);

        // Init Circuits
        initCircuits();
    };

    const initCircuits = () => {
        circuits = [];
        const count = 30; // Increased count
        for (let i = 0; i < count; i++) {
            circuits.push({
                segments: generateCircuitPath(),
                progress: 0,
                speed: 0.004 + Math.random() * 0.008, // Faster movement
                delay: Math.random() * 2000
            });
        }
    };

    const generateCircuitPath = () => {
        const segments = [];
        let curX = Math.random() * width;
        let curY = Math.random() * height;
        const length = 5 + Math.floor(Math.random() * 5);

        for (let i = 0; i < length; i++) {
            const angle = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2][Math.floor(Math.random() * 4)];
            const dist = 50 + Math.random() * 100;
            const nextX = curX + Math.cos(angle) * dist;
            const nextY = curY + Math.sin(angle) * dist;
            segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
            curX = nextX;
            curY = nextY;
        }
        return segments;
    };

    const drawMatrix = () => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.fillRect(0, 0, width, height); // Back to fillRect for trail effect

        ctx.fillStyle = "rgba(255, 0, 51, 0.6)";
        ctx.font = "16px monospace";

        const chars = "010101ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        matrixCols.forEach((y, i) => {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const x = i * 16;
            ctx.fillText(char, x, y);

            if (y > height && Math.random() > 0.975) {
                matrixCols[i] = 0;
            } else {
                matrixCols[i] += 12;
            }
        });
    };

    const drawCircuits = () => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ff0033";
        ctx.lineWidth = 1.5;

        circuits.forEach(circuit => {
            circuit.progress += circuit.speed;
            if (circuit.progress > 1) {
                circuit.progress = 0;
                circuit.segments = generateCircuitPath();
            }

            const totalSegments = circuit.segments.length;
            const currentGlobalProgress = circuit.progress * totalSegments;

            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 0, 51, 0.2)";
            circuit.segments.forEach((s, idx) => {
                ctx.moveTo(s.x1, s.y1);
                ctx.lineTo(s.x2, s.y2);

                if (Math.floor(currentGlobalProgress) === idx) {
                    const localProgress = currentGlobalProgress % 1;
                    const dotX = s.x1 + (s.x2 - s.x1) * localProgress;
                    const dotY = s.y1 + (s.y2 - s.y1) * localProgress;
                    ctx.save();
                    ctx.fillStyle = "#fff";
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = "#fff";
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            });
            ctx.stroke();
        });

        ctx.shadowBlur = 0;
    };

    const animate = () => {
        drawMatrix();
        drawCircuits();
        requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);

    window.addEventListener("mousemove", (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) / 30;
        const moveY = (e.clientY / window.innerHeight / 2) / 30;

        canvas.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });

    resize();
    animate();
};

document.addEventListener("DOMContentLoaded", () => {
    initBackground();

    // Staggered entry
    document.querySelectorAll('.staggered-entry').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.1}s`;
    });

    startBloodRain();
    initHoverDetection();
    applyDynamicStyles();
    if (typeof initSoundEffect === 'function') initSoundEffect();
});

const applyDynamicStyles = () => {
    // Poll for Firebase initialization
    const checker = setInterval(() => {
        if (window.db && window.firebaseFirestore) {
            clearInterval(checker);
            startStyleSync();
        }
    }, 100);

    const startStyleSync = () => {
        const { doc, onSnapshot } = window.firebaseFirestore;
        const styleTag = document.getElementById('dynamic-site-styles') || document.createElement('style');
        styleTag.id = "dynamic-site-styles";
        if (!styleTag.parentElement) document.head.appendChild(styleTag);

        let gStyles = {};
        let pStyles = {};

        const refresh = () => {
            const isEditing = window.location.pathname.includes('admin.html');
            const primary = pStyles.style_primary || gStyles.primary || "#ff0033";
            const bg = pStyles.style_bg || gStyles.bg || "#050505";
            const font = gStyles.font_family || "'Tajawal', sans-serif";
            const gCSS = gStyles.custom_css || "";
            const pCSS = pStyles.style_css || "";

            document.documentElement.style.setProperty('--primary', primary);

            // Only apply global background and font if NOT in admin panel
            if (!isEditing) {
                document.body.style.backgroundColor = bg;
                styleTag.innerHTML = `
                    body { 
                        font-family: ${font}; 
                        background-color: ${bg} !important; 
                    }
                    :root { --primary: ${primary}; }
                    .zebra-list .feature-item:nth-child(even), 
                    .zebra-list .member-card:nth-child(even),
                    .zebra-list .shop-card:nth-child(even) { 
                        background: rgba(255,0,0,0.08) !important;
                    }
                    ${gCSS}
                    ${pCSS}
                `;
            } else {
                // In admin, only sync the primary color variable
                styleTag.innerHTML = `:root { --primary: ${primary}; }`;
            }
        };

        onSnapshot(doc(window.db, "site_content", "styles"), (snap) => {
            if (snap.exists()) { gStyles = snap.data(); refresh(); }
        });

        if (window.pageID) {
            onSnapshot(doc(window.db, "site_content", window.pageID), (snap) => {
                if (snap.exists()) { pStyles = snap.data(); refresh(); }
            });
        }
    }
};

let isHoveringInteractive = false;

const initHoverDetection = () => {
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('a, button, .btn-main, .feature-card, .shop-card, .member-card, i, .back-btn')) {
            isHoveringInteractive = true;
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('a, button, .btn-main, .feature-card, .shop-card, .member-card, i, .back-btn')) {
            isHoveringInteractive = false;
        }
    });
};

const startBloodRain = () => {
    const logoRectCheck = document.getElementById('main-logo-effect');

    if (!logoRectCheck) {
        setTimeout(startBloodRain, 500);
        return;
    }

    setInterval(() => {
        const logo = document.getElementById('main-logo-effect');
        if (!logo) return;

        if (document.hidden || isHoveringInteractive) return;

        const rect = logo.getBoundingClientRect();

        const drop = document.createElement('div');
        drop.classList.add('blood-drop');

        // Random X position across the text
        const startLeft = rect.left + 10 + Math.random() * (rect.width - 20);
        const startTop = rect.bottom - 25;

        drop.style.left = startLeft + 'px';
        drop.style.top = startTop + 'px';

        document.body.appendChild(drop);

        let pos = startTop;
        const speed = 0.5 + Math.random() * 1.0;

        const fall = () => {
            pos += speed;
            drop.style.top = pos + 'px';

            const elements = document.elementsFromPoint(startLeft, pos + 10);

            const hit = elements.find(el =>
                el !== drop &&
                (
                    el.classList.contains('feature-card') ||
                    el.classList.contains('shop-card') ||
                    el.classList.contains('member-card') ||
                    el.classList.contains('btn-main') ||
                    el.tagName === 'BUTTON' ||
                    el.tagName === 'A' ||
                    (el.tagName === 'I' && el.parentElement && el.parentElement.classList.contains('footer-social'))
                )
            );

            if (hit) {
                createSplatter(startLeft, pos);
                drop.remove();
            } else if (pos < window.innerHeight) {
                requestAnimationFrame(fall);
            } else {
                drop.remove();
            }
        };
        requestAnimationFrame(fall);

    }, 1100); // Balanced frequency (was 600ms)
};

const createSplatter = (x, y) => {
    const splat = document.createElement('div');
    splat.classList.add('blood-splat');

    const size = 30 + Math.random() * 30; // Increased splatter size
    splat.style.width = size + 'px';
    splat.style.height = (size * 0.8) + 'px';

    splat.style.left = (x - size / 2) + 'px';
    splat.style.top = (y - size / 4) + 'px';

    document.body.appendChild(splat);

    splat.style.transform = `rotate(${Math.random() * 360}deg)`;

    setTimeout(() => {
        splat.style.opacity = '0';
        setTimeout(() => splat.remove(), 1000);
    }, 4000);
};

const initSoundEffect = () => {
    let audioCtx = null;

    const playSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            if (!audioCtx) {
                audioCtx = new AudioContext();
            }

            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);

            const volume = 0.3; // Increased from 0.08
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.005);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.08);
        } catch (e) {
            console.warn("Sound blocked or error:", e);
        }
    };

    // Use a more robust event delegation for all interactive elements
    document.addEventListener('mousedown', (e) => {
        const target = e.target.closest('a, button, .btn-main, .feature-card, .shop-card, .member-card, i, .back-btn, .nav-item, [onclick]');
        if (target) {
            playSound();
        }
    }, { passive: true });
};
// --- Authentication and Modal Logic (Dynamic Injection) ---
// --- Authentication and Modal Logic (Direct Firebase Integration) ---
// Using Window Globals initialized in index.html (Firebase SDK)

const injectAuthUI = () => {
    if (document.getElementById('auth-modal')) return;

    // Inject Auth Button if not present
    if (!document.getElementById('auth-btn')) {
        const btn = document.createElement('div');
        btn.id = "auth-btn";
        btn.className = "menu-btn";
        btn.innerHTML = '<i class="fas fa-bars"></i>';
        btn.onclick = window.toggleAuthModal;
        document.body.appendChild(btn);
    }

    // Inject Modal
    const modal = document.createElement('div');
    modal.id = "auth-modal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" onclick="toggleAuthModal()">&times;</span>
            <div id="auth-form-container">
                <h2 id="auth-title">تسجيل الدخول</h2>
                <p id="auth-subtitle" style="color: #888; margin-top: -10px; margin-bottom: 20px; font-size: 0.9rem;">أهلاً بك مجدداً في بوابة أنتوكو</p>
                
                <div class="form-group auth-field" style="text-align: right;">
                    <label style="font-size: 0.8rem; color: var(--primary);">البريد الإلكتروني</label>
                    <input type="email" id="auth-email" placeholder="name@example.com">
                </div>
                <div class="form-group auth-field" style="text-align: right;">
                    <label style="font-size: 0.8rem; color: var(--primary);">كلمة السر</label>
                    <input type="password" id="auth-pass" placeholder="••••••••">
                </div>
                
                <div id="auth-actions">
                    <button id="main-auth-btn" class="auth-field" onclick="handleAuth('login')">دخول للحساب</button>
                    
                    <div class="auth-field divider" style="margin: 20px 0; position: relative; border-top: 1px solid #333;">
                        <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: rgba(20, 10, 10, 1); padding: 0 10px; font-size: 0.8rem; color: #555;">أو</span>
                    </div>

                    <button id="google-auth-btn" class="auth-field" onclick="handleGoogleAuth()" 
                        style="background: #fff; color: #444; border: 1px solid #ddd; margin-top: 0; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18">
                        الدخول بواسطة جوجل
                    </button>

                    <div id="switch-container" style="margin-top: 25px; border-top: 1px dashed #444; padding-top: 15px;">
                        <p id="switch-text" style="font-size: 0.85rem; color: #aaa; margin-bottom: 8px;">ليس لديك حساب؟</p>
                        <button id="switch-auth-btn" class="auth-field" onclick="switchAuthMode('register')" 
                            style="background:transparent; border:1px solid var(--primary); color:var(--primary); margin-top:0; padding: 8px;">إنشاء حساب جديد</button>
                    </div>
                    
                    <button id="logout-btn" onclick="handleLogout()" 
                        style="background:#222; border: 1px solid #444; color:#fff; display:none; margin-top:15px; width:100%;">
                        <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
                    </button>

                    <!-- Admin Link (Below Logout) -->
                    <a href="admin.html" id="admin-portal-btn" style="display:none; text-decoration:none; margin-top:10px;">
                        <button style="background: linear-gradient(135deg, #ff0033 0%, #800000 100%); color:#fff; border:none; width:100%; box-shadow: 0 4px 15px rgba(255,0,0,0.3);">
                            <i class="fas fa-shield-alt"></i> دخول لوحة الإدارة
                        </button>
                    </a>
                </div>
                <p id="auth-status" class="status-msg"></p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    checkLoginStatus();
};

window.toggleAuthModal = async () => {
    const modal = document.getElementById('auth-modal');
    if (!modal) {
        injectAuthUI();
        setTimeout(window.toggleAuthModal, 10);
        return;
    }

    const isOpening = modal.style.display !== 'flex';
    modal.style.display = isOpening ? 'flex' : 'none';

    if (isOpening) {
        checkLoginStatus();
        // Health check removed - we are using Direct Firebase SDK (Always Online if user has internet)
    }
};

window.switchAuthMode = (mode) => {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const mainBtn = document.getElementById('main-auth-btn');
    const switchBtn = document.getElementById('switch-auth-btn');
    const switchText = document.getElementById('switch-text');
    const status = document.getElementById('auth-status');
    const googleBtn = document.getElementById('google-auth-btn');
    const dividers = document.querySelectorAll('.divider');

    if (!title || !mainBtn) return;

    status.innerText = "";

    if (mode === 'register') {
        title.innerText = "إنشاء حساب جديد";
        subtitle.innerText = "انضم إلى فريق أنتوكو الآن";
        mainBtn.innerText = "تسجيل الحساب";
        mainBtn.style.background = "linear-gradient(to right, #4caf50, #2e7d32)"; // Greenish for register
        mainBtn.style.color = "#fff";
        mainBtn.onclick = () => handleAuth('register');

        switchText.innerText = "لديك حساب بالفعل؟";
        switchBtn.innerText = "تسجيل الدخول";
        switchBtn.onclick = () => switchAuthMode('login');

        // Hide google in register if you prefer focused registration
        // googleBtn.style.display = "none";
        // dividers.forEach(d => d.style.display = "none");
    } else {
        title.innerText = "تسجيل الدخول";
        subtitle.innerText = "أهلاً بك مجدداً في بوابة أنتوكو";
        mainBtn.innerText = "دخول للحساب";
        mainBtn.style.background = "var(--primary)"; // Original Red
        mainBtn.style.color = "#000";
        mainBtn.onclick = () => handleAuth('login');

        switchText.innerText = "ليس لديك حساب؟";
        switchBtn.innerText = "إنشاء حساب جديد";
        switchBtn.onclick = () => switchAuthMode('register');

        googleBtn.style.display = "flex";
        dividers.forEach(d => d.style.display = "block");
    }
};

window.handleGoogleAuth = async () => {
    const status = document.getElementById('auth-status');
    if (!window.firebaseAuth || !window.signInWithPopup) {
        status.innerText = "برجاء الانتظار حتى تحميل خدمات جوجل أو تأكد من اتصالك بالإنترنت...";
        status.style.color = "#ff4444";
        return;
    }

    try {
        console.log("Starting Google Sign-In...");
        const result = await window.signInWithPopup(window.firebaseAuth, window.googleProvider);
        const user = result.user;
        const idToken = await user.getIdToken();

        const data = await res.json();
        // Since we are moving to direct Firebase, we will determine role client-side based on admin email list
        const adminEmails = ["admon257admin@gmail.com", "karemkoko257koko@gmail.com"];
        const role = adminEmails.includes(user.email.toLowerCase()) ? 'admin' : 'user';

        localStorage.setItem('token', idToken);
        localStorage.setItem('role', role);
        console.log("Google Auth Success:", data);

        localStorage.setItem('token', data.token);
        localStorage.setItem('role', (data.role || 'user').toLowerCase());
        status.innerText = "تم الدخول بواسطة جوجل بنجاح!";
        status.style.color = "#4caf50";

        setTimeout(() => {
            status.innerText = "";
            checkLoginStatus();
            toggleAuthModal();
        }, 800);

    } catch (error) {
        console.error("Google Auth Error Details:", error);

        let errorMsg = "حدث خطأ أثناء الدخول بواسطة جوجل";

        if (error.code) {
            // Firebase specific errors
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    errorMsg = "تم إغلاق نافذة جوجل قبل إتمام الدخول";
                    break;
                case 'auth/popup-blocked':
                    errorMsg = "المتصفح حظر نافذة الدخول، يرجى السماح بالنوافذ المنبثقة";
                    break;
                case 'auth/network-request-failed':
                    errorMsg = "خطأ في الشبكة، تأكد من اتصالك بالإنترنت";
                    break;
                case 'auth/unauthorized-domain':
                    errorMsg = "هذا النطاق (Domain) غير مصرح له بالدخول من إعدادات Firebase";
                    break;
                default:
                    errorMsg = `خطأ من جوجل (${error.code})`;
            }
        } else if (error.message && error.message.includes('fetch')) {
            errorMsg = "فشل الاتصال بخادم الموقع (Backend) - تأكد من تشغيله";
        } else if (error.message) {
            errorMsg = error.message;
        }

        status.innerText = errorMsg;
        status.style.color = "#ff4444";
    }
};

window.handleAuth = async (type) => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-pass').value;
    const status = document.getElementById('auth-status');

    if (!email || !password) {
        status.innerText = "يرجى ملء كافة البيانات";
        status.style.color = "#ff4444";
        return;
    }

    status.innerText = "جاري الاتصال...";
    status.style.color = "var(--primary)";

    try {
        const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const auth = getAuth();

        let userCredential;
        if (type === 'login') {
            userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        } else {
            userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        }

        const user = userCredential.user;
        const idToken = await user.getIdToken();

        if (type === 'login') {
            const adminEmails = ["admon257admin@gmail.com", "karemkoko257koko@gmail.com"];
            const role = adminEmails.includes(user.email.toLowerCase()) ? 'admin' : 'user';

            localStorage.setItem('token', idToken);
            localStorage.setItem('role', role);
            status.innerText = "تم الدخول بنجاح!";
            status.style.color = "#4caf50";

            setTimeout(() => {
                status.innerText = "";
                checkLoginStatus();
                toggleAuthModal();
            }, 800);
        } else {
            status.innerText = "تم إنشاء الحساب! يمكنك الآن الدخول.";
            status.style.color = "#4caf50";
            switchAuthMode('login');
        }
    } catch (err) {
        console.error("Auth Error:", err);
        let msg = "حدث خطأ في المصادقة";
        if (err.code === 'auth/user-not-found' || err.code === 'auth/user-disabled' || err.code === 'auth/invalid-credential') msg = "البريد الإلكتروني أو كلمة السر غير صحيحة";
        if (err.code === 'auth/email-already-in-use') msg = "هذا البريد الإلكتروني مسجل بالفعل";
        status.innerText = msg;
        status.style.color = "#ff4444";
    }
};

window.handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    location.reload();
};

const checkLoginStatus = () => {
    const token = localStorage.getItem('token');
    const role = (localStorage.getItem('role') || "").toLowerCase();
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-portal-btn');
    const fields = document.querySelectorAll('.auth-field');
    const title = document.getElementById('auth-title');

    console.log("Current Login Status - Role:", role); // Debugging

    if (token) {
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (adminBtn) adminBtn.style.display = (role === 'admin') ? 'block' : 'none';

        fields.forEach(f => f.style.display = 'none');
        if (title) title.innerText = role === 'admin' ? "مرحباً أيها المدير" : "حسابك نشط الآن";
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
        fields.forEach(f => f.style.display = 'block');
        if (title) title.innerText = "بوابة الأعضاء";
    }
};

// Start logic
document.addEventListener('DOMContentLoaded', () => {
    const isEditing = window.location.pathname.includes('admin.html');

    initBackground();
    initHoverDetection();
    applyDynamicStyles();

    if (!isEditing) {
        injectAuthUI();
    }
});
