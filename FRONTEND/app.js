// ═══════════════════════════════════════════════
//  IMPACTHUB — app.js  (v2)
// ═══════════════════════════════════════════════

const API_URL = 'http://127.0.0.1:5000/api';

const CATEGORIES = [
    { id: 'Technology',     label: 'Technology',     icon: '💻', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
    { id: 'Education',      label: 'Education',      icon: '📚', color: '#2563eb', bg: 'rgba(37,99,235,0.12)'  },
    { id: 'Environment',    label: 'Environment',    icon: '🌿', color: '#059669', bg: 'rgba(5,150,105,0.12)'  },
    { id: 'Health',         label: 'Health',         icon: '🏥', color: '#dc2626', bg: 'rgba(220,38,38,0.12)'  },
    { id: 'Community',      label: 'Community',      icon: '🤝', color: '#d97706', bg: 'rgba(217,119,6,0.12)'  },
    { id: 'Arts',           label: 'Arts & Culture', icon: '🎨', color: '#db2777', bg: 'rgba(219,39,119,0.12)' },
    { id: 'Sustainability', label: 'Sustainability', icon: '♻️', color: '#0891b2', bg: 'rgba(8,145,178,0.12)'  },
    { id: 'General',        label: 'General',        icon: '🌐', color: '#6b7280', bg: 'rgba(107,114,128,0.12)'}
];

// ── STATE ──
let currentUser    = JSON.parse(localStorage.getItem('impacthub_user')) || null;
let activeChat     = null;
let chatInterval   = null;
let notifInterval  = null;
let pendingApply   = null;
let activeFilter   = { status: 'all', category: 'all' };
let cachedProblems = [];

// ══════════════════════════════════════════════
//  STARTUP
// ══════════════════════════════════════════════
window.onload = async () => {
    loadAuthStats();
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
    if (currentUser) initDashboard();
};

// ══════════════════════════════════════════════
//  AUTH STATS
// ══════════════════════════════════════════════
async function loadAuthStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        if (!res.ok) return;
        const s = await res.json();
        el('stat-challenges').textContent = s.total_challenges;
        el('stat-solved').textContent     = s.solved_challenges;
        el('stat-students').textContent   = s.total_students;
        el('stat-ngos').textContent       = s.total_ngos;
    } catch { /* ignore */ }
}

// ══════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════
function switchAuthTab(tab) {
    el('tab-login').classList.toggle('active', tab === 'login');
    el('tab-register').classList.toggle('active', tab === 'register');
    el('loginForm').classList.toggle('hidden', tab !== 'login');
    el('registerForm').classList.toggle('hidden', tab !== 'register');
}

function togglePassword(inputId, btn) {
    const input = el(inputId);
    const hide  = input.type === 'password';
    input.type  = hide ? 'text' : 'password';
    btn.querySelector('i').className = `fa-solid fa-eye${hide ? '-slash' : ''}`;
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = el('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
    try {
        const res  = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: el('lUser').value.trim(), password: el('lPass').value })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data;
            localStorage.setItem('impacthub_user', JSON.stringify(data));
            initDashboard();
        } else { showToast(data.error || 'Login failed', 'error'); }
    } catch { showToast('Cannot connect to server. Is the backend running?', 'error'); }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
}

async function handleRegister(e) {
    e.preventDefault();
    const btn  = el('registerBtn');
    const role = document.querySelector('.role-card.active input[type=radio]')?.value || 'student';
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
    try {
        const res  = await fetch(`${API_URL}/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: el('rUser').value.trim(), password: el('rPass').value, role })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Account created! Please sign in.', 'success');
            switchAuthTab('login');
            el('lUser').value = el('rUser').value;
        } else { showToast(data.error || 'Registration failed', 'error'); }
    } catch { showToast('Cannot connect to server.', 'error'); }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
}

function logout() {
    clearInterval(chatInterval);
    clearInterval(notifInterval);
    localStorage.removeItem('impacthub_user');
    location.reload();
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
function initDashboard() {
    el('authScreen').classList.add('hidden');
    el('mainApp').classList.remove('hidden');
    const u = currentUser;
    el('sidebarName').textContent  = u.username;
    el('sidebarRole').textContent  = u.role === 'student' ? 'Student Developer' : 'NGO Organization';
    el('sidebarAvatar').textContent = u.username[0].toUpperCase();
    el('topAvatar').textContent    = u.username[0].toUpperCase();
    el('dashName').textContent     = u.username;
    el('dashSubtitle').textContent = u.role === 'student'
        ? 'Apply to challenges, earn certificates and grow your impact portfolio.'
        : 'Post challenges, review applicants and certify the best solutions.';

    if (u.role === 'student') { show('nav-my-applications'); show('nav-badges'); }
    else                      { show('nav-my-challenges');    show('nav-post');  }

    notifInterval = setInterval(pollNotifications, 15000);
    pollNotifications();
    buildCategoryChips();
    switchView('dashboard');
}

// ══════════════════════════════════════════════
//  VIEW SWITCHING
// ══════════════════════════════════════════════
function switchView(view) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    const section = el(`view-${view}`);
    if (section) section.classList.remove('hidden');
    document.querySelectorAll(`.nav-link[data-view="${view}"]`).forEach(b => b.classList.add('active'));
    if (el('globalSearch')) el('globalSearch').value = '';
    const loaders = {
        dashboard:   loadDashboard,
        challenges:  loadChallenges,
        'my-work':   loadMyWork,
        leaderboard: loadLeaderboard,
        badges:      loadMyBadges,
        analytics:   loadAnalytics
    };
    if (loaders[view]) loaders[view]();
}

function onSearchInput(query) {
    if (!el('view-challenges').classList.contains('hidden')) {
        renderChallenges(cachedProblems.filter(p =>
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.description.toLowerCase().includes(query.toLowerCase()) ||
            (p.ngo_name || '').toLowerCase().includes(query.toLowerCase())
        ));
    }
}

// ══════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════
async function loadDashboard() {
    try {
        const [statsRes, probRes, actRes] = await Promise.all([
            fetch(`${API_URL}/stats`),
            fetch(`${API_URL}/problems?user_id=${currentUser.id}`),
            fetch(`${API_URL}/activity`)
        ]);
        const stats    = await statsRes.json();
        const problems = await probRes.json();
        const activity = actRes.ok ? await actRes.json() : [];

        // Stat cards
        if (currentUser.role === 'student') {
            const wins   = problems.filter(p => p.status === 'Solved' && p.solver_name === currentUser.username).length;
            const myApps = problems.filter(p => p.user_status).length;
            el('dashStatsGrid').innerHTML =
                statCard('fa-bolt',        'violet', 'Impact Score',        wins * 500) +
                statCard('fa-trophy',      'amber',  'Challenges Won',      wins) +
                statCard('fa-paper-plane', 'cyan',   'Total Applications',  myApps) +
                statCard('fa-globe',       'green',  'Open Challenges',     stats.total_challenges - stats.solved_challenges);
        } else {
            const mine   = problems.filter(p => p.ngo_name === currentUser.username);
            const active = mine.filter(p => p.status === 'Open').length;
            const total  = mine.reduce((s, p) => s + p.submission_count, 0);
            el('dashStatsGrid').innerHTML =
                statCard('fa-bullhorn',    'violet', 'Active Challenges',   active) +
                statCard('fa-users',       'cyan',   'Total Applicants',    total) +
                statCard('fa-check-circle','green',  'Solved',              mine.filter(p => p.status === 'Solved').length) +
                statCard('fa-globe',       'amber',  'Platform Challenges', stats.total_challenges);
        }

        // Recent challenges list (compact, not cards)
        const recent = problems.slice(0, 5);
        el('recentChallenges').innerHTML = recent.length
            ? recent.map(p => {
                const cat = CATEGORIES.find(c => c.id === p.category) || CATEGORIES[CATEGORIES.length - 1];
                return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                    <span style="font-size:1.1rem">${cat.icon}</span>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:0.87rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.title)}</div>
                        <div style="font-size:0.74rem;color:var(--text-dim)">${esc(p.ngo_name)} · ${p.submission_count} applicants</div>
                    </div>
                    <span class="status-pill ${p.status === 'Solved' ? 'solved' : 'open'}">${p.status}</span>
                </div>`;
              }).join('')
            : '<p style="color:var(--text-dim);font-size:0.85rem;padding:12px 0">No challenges yet.</p>';

        // Activity feed
        el('activityFeed').innerHTML = activity.length
            ? activity.map(a => {
                const icons = { post: 'fa-plus', solve: 'fa-trophy', apply: 'fa-paper-plane' };
                return `<div class="activity-item">
                    <div class="activity-icon ${a.type}"><i class="fa-solid ${icons[a.type] || 'fa-bolt'}"></i></div>
                    <div class="activity-body">
                        <p>${a.text}</p>
                        <div class="activity-detail">${esc(a.detail)}</div>
                    </div>
                    <span class="activity-time">${a.time_str}</span>
                </div>`;
              }).join('')
            : '<p style="color:var(--text-dim);font-size:0.82rem;text-align:center;padding:20px">No activity yet.</p>';

    } catch (err) { console.error('Dashboard:', err); }
}

function statCard(icon, color, label, value) {
    return `<div class="stat-card">
        <div class="stat-icon ${color}"><i class="fa-solid ${icon}"></i></div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
    </div>`;
}

// ══════════════════════════════════════════════
//  CHALLENGES
// ══════════════════════════════════════════════
async function loadChallenges() {
    el('challengesGrid').innerHTML = `<div class="loading-state" style="grid-column:1/-1"><i class="fa-solid fa-spinner"></i>Loading challenges...</div>`;
    try {
        const res = await fetch(`${API_URL}/problems?user_id=${currentUser.id}`);
        cachedProblems = await res.json();
        applyFilters();
    } catch {
        el('challengesGrid').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wifi-slash"></i><h3>Could not connect</h3><p>Make sure the backend server is running.</p></div>`;
    }
}

function buildCategoryChips() {
    const chips = el('categoryChips');
    chips.innerHTML = `<button class="chip active" onclick="setCategoryFilter('all',this)">All Categories</button>` +
        CATEGORIES.map(c => `<button class="chip" onclick="setCategoryFilter('${c.id}',this)">${c.icon} ${c.label}</button>`).join('');
}

function setStatusFilter(status, btn) {
    activeFilter.status = status;
    el('statusChips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active'); else event?.target?.classList.add('active');
    applyFilters();
}

function setCategoryFilter(cat, btn) {
    activeFilter.category = cat;
    el('categoryChips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active'); else event?.target?.classList.add('active');
    applyFilters();
}

function applyFilters() {
    let filtered = cachedProblems;
    if (activeFilter.status !== 'all')   filtered = filtered.filter(p => p.status === activeFilter.status);
    if (activeFilter.category !== 'all') filtered = filtered.filter(p => p.category === activeFilter.category);
    renderChallenges(filtered);
}

function renderChallenges(problems) {
    const grid = el('challengesGrid');
    if (!problems.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-filter"></i><h3>No challenges match</h3><p>Try adjusting your filters or search.</p></div>`;
        return;
    }
    grid.innerHTML = problems.map(p => challengeCardHTML(p)).join('');
}

function challengeCardHTML(p) {
    const cat     = CATEGORIES.find(c => c.id === p.category) || CATEGORIES[CATEGORIES.length - 1];
    const isSolved = p.status === 'Solved';
    const timeStr  = p.created_at ? timeAgo(p.created_at) : '';

    // Solution showcase — visible to EVERYONE when solved
    const chainBadge = p.blockchain_tx && p.blockchain_tx !== 'Pending'
        ? `<a href="${p.chain_etherscan || '#'}" target="_blank" rel="noopener" class="chain-verified-badge" title="View transaction on Etherscan">
              <i class="fa-solid fa-link"></i> Blockchain Verified
           </a>`
        : p.blockchain_tx === 'Pending'
        ? `<span class="chain-pending-badge"><i class="fa-solid fa-spinner fa-spin"></i> Confirming on-chain...</span>`
        : '';

    const solutionBlock = isSolved ? `
        <div class="solution-showcase">
            <i class="fa-solid fa-trophy"></i>
            <div class="sol-info">
                <span>Winning solution by</span>
                <strong>${esc(p.solver_name)}</strong>
            </div>
            ${p.solver_link ? `<a href="${esc(p.solver_link)}" target="_blank" rel="noopener" class="view-sol-btn">View Solution ↗</a>` : ''}
            ${chainBadge}
        </div>` : '';

    // Action area
    let action = '';
    if (!isSolved && currentUser.role === 'student') {
        if (p.user_status === 'Accepted') {
            action = `<span class="won-badge"><i class="fa-solid fa-trophy"></i> You Won!</span>`;
        } else if (p.user_status) {
            action = `<span class="applied-badge"><i class="fa-solid fa-clock"></i> ${p.user_status}</span>`;
        } else {
            action = `<button class="btn-primary btn-sm" onclick="openApplyModal('${p.id}','${esc(p.title)}','${p.ngo_id}')"><i class="fa-solid fa-paper-plane"></i> Apply Now</button>`;
        }
    } else if (currentUser.role === 'ngo' && p.ngo_name === currentUser.username && !isSolved) {
        action = `<button class="btn-ghost" style="padding:8px 12px;font-size:0.8rem;" onclick="toggleApplicantDrawer('${p.id}')">
            <i class="fa-solid fa-users"></i> Applicants <span class="count-pill">${p.submission_count}</span>
        </button>
        <button class="btn-danger-ghost" onclick="closeChallenge('${p.id}','${esc(p.title)}')" title="Close challenge"><i class="fa-solid fa-lock"></i></button>`;
    } else if (isSolved && currentUser.role === 'student' && p.solver_name === currentUser.username) {
        action = `<span class="won-badge"><i class="fa-solid fa-trophy"></i> You Won!</span>`;
    }

    // NOTE: .card-inner wraps content, .applicant-drawer sits OUTSIDE it (fixes alignment)
    return `<div class="challenge-card ${isSolved ? 'solved' : ''}" id="card-${p.id}">
        <div class="card-inner">
            <div class="card-meta">
                <span class="cat-badge" style="background:${cat.bg};color:${cat.color}">${cat.icon} ${cat.label}</span>
                <span class="status-pill ${isSolved ? 'solved' : 'open'}">${isSolved ? '✓ Solved' : '● Open'}</span>
            </div>
            <h3 class="card-title">${esc(p.title)}</h3>
            <p class="card-desc">${esc(p.description)}</p>
            ${solutionBlock}
            <div class="card-footer">
                <span class="card-footer-meta"><i class="fa-solid fa-building-ngo"></i> ${esc(p.ngo_name)}</span>
                ${timeStr ? `<span class="card-footer-meta"><i class="fa-regular fa-clock"></i> ${timeStr}</span>` : ''}
                <span class="card-footer-meta"><i class="fa-solid fa-users"></i> ${p.submission_count}</span>
                <div class="card-actions">${action}</div>
            </div>
        </div>
        <div id="drawer-${p.id}" class="applicant-drawer hidden"></div>
    </div>`;
}

// ── Applicant Drawer (NGO) ──
async function toggleApplicantDrawer(pid) {
    const drawer = el(`drawer-${pid}`);
    if (!drawer) return;
    if (!drawer.classList.contains('hidden')) { drawer.classList.add('hidden'); return; }
    drawer.classList.remove('hidden');
    drawer.innerHTML = `<div class="loading-state"><i class="fa-solid fa-spinner"></i> Loading applicants...</div>`;
    try {
        const res  = await fetch(`${API_URL}/get_submissions/${pid}`);
        const subs = await res.json();
        if (!subs.length) {
            drawer.innerHTML = `<p class="drawer-empty">No applications yet. Share this challenge!</p>`;
            return;
        }
        drawer.innerHTML = subs.map(s => {
            const statusCls = s.status === 'Accepted' ? 'accepted' : s.status === 'Closed' ? 'closed' : 'pending';
            return `<div class="applicant-row">
                <div class="app-avatar">${(s.student_name[0] || 'U').toUpperCase()}</div>
                <div class="app-info">
                    <strong>${esc(s.student_name)}</strong>
                    <a href="${esc(s.link)}" target="_blank" rel="noopener" class="app-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> View Solution</a>
                    ${s.message ? `<div class="app-note">"${esc(s.message)}"</div>` : ''}
                    <div class="app-date"><i class="fa-regular fa-calendar"></i> ${s.time}</div>
                </div>
                <span class="status-tag ${statusCls}">${s.status === 'Accepted' ? '🏆 Winner' : s.status}</span>
                <div class="app-row-actions">
                    <button class="btn-icon" onclick="openChat('${pid}','${s.student_id}','${esc(s.student_name)}')" title="Chat with applicant">
                        <i class="fa-solid fa-comment"></i>
                    </button>
                    ${s.status === 'Pending' ? `<button class="btn-success" onclick="acceptSolution('${s.id}','${esc(s.student_name)}')">
                        <i class="fa-solid fa-check"></i> Accept
                    </button>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch { drawer.innerHTML = `<p class="drawer-empty">Error loading applicants.</p>`; }
}

async function acceptSolution(subId, studentName) {
    if (!confirm(`Accept ${studentName}'s solution?\n\nThis will:\n• Close the challenge\n• Issue a certificate to ${studentName}\n• Close all other applications`)) return;
    try {
        const res  = await fetch(`${API_URL}/accept_solution`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: subId, tx_hash: '0x' + crypto.randomUUID().replace(/-/g,'') })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`${studentName} is the winner! Challenge closed.`, 'success');
            loadChallenges();
        } else { showToast(data.error || 'Error', 'error'); }
    } catch { showToast('Server error. Please try again.', 'error'); }
}

async function closeChallenge(pid, title) {
    if (!confirm(`Close "${title}"?\n\nThis will archive the challenge and no new applications will be accepted.`)) return;
    try {
        const res  = await fetch(`${API_URL}/problems/${pid}/close`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Challenge closed.', 'success');
            loadChallenges();
        } else { showToast(data.error || 'Could not close challenge', 'error'); }
    } catch { showToast('Server error.', 'error'); }
}

// ══════════════════════════════════════════════
//  APPLY MODAL
// ══════════════════════════════════════════════
function openApplyModal(pid, title, ngoId) {
    pendingApply = { pid, title, ngoId };
    el('applyModalTitle').textContent = title;
    el('solutionLink').value  = '';
    el('solutionNote').value  = '';
    el('applyModal').classList.remove('hidden');
    setTimeout(() => el('solutionLink').focus(), 100);
}
function closeApplyModal() {
    el('applyModal').classList.add('hidden');
    pendingApply = null;
}
function handleModalBackdrop(e) {
    if (e.target.classList.contains('modal-overlay')) closeApplyModal();
}
async function submitApply() {
    if (!pendingApply) return;
    const link = el('solutionLink').value.trim();
    const note = el('solutionNote').value.trim();
    if (!link) return showToast('Please enter your solution link', 'error');
    try {
        const res  = await fetch(`${API_URL}/submit_solution`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problem_id: pendingApply.pid, user_id: currentUser.id, solution_link: link, message: note })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Application submitted!', 'success');
            closeApplyModal();
            loadChallenges();
        } else { showToast(data.error || 'Could not submit', 'error'); }
    } catch { showToast('Server error. Please try again.', 'error'); }
}

// ══════════════════════════════════════════════
//  MY WORK
// ══════════════════════════════════════════════
async function loadMyWork() {
    if (currentUser.role === 'student') {
        el('myWorkTitle').textContent    = 'My Applications';
        el('myWorkSubtitle').textContent = 'Track your submissions and chat with NGOs.';
        await loadMyApplications();
    } else {
        el('myWorkTitle').textContent    = 'My Challenges';
        el('myWorkSubtitle').textContent = 'Manage your posted challenges and review applicants.';
        await loadMyNGOChallenges();
    }
}

async function loadMyApplications() {
    const container = el('myWorkContent');
    container.innerHTML = `<div class="loading-state"><i class="fa-solid fa-spinner"></i> Loading...</div>`;
    try {
        const res  = await fetch(`${API_URL}/my_applications?user_id=${currentUser.id}`);
        const apps = await res.json();
        if (!apps.length) {
            container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><h3>No applications yet</h3><p>Browse challenges and apply to start building your impact portfolio.</p><button class="btn-primary" onclick="switchView('challenges')"><i class="fa-solid fa-globe"></i> Browse Challenges</button></div>`;
            return;
        }
        container.innerHTML = `<div class="applications-list">${apps.map(a => {
            const cat = CATEGORIES.find(c => c.id === a.category) || CATEGORIES[CATEGORIES.length - 1];
            const sc  = a.status.toLowerCase();
            let label = sc === 'accepted' ? '🏆 Won!' : sc === 'closed' ? 'Closed' : 'Under Review';
            return `<div class="app-card">
                <div class="app-status-col"><div class="app-status-dot ${sc}"></div></div>
                <div class="app-main">
                    <h4>${esc(a.problem_title)}</h4>
                    <div class="app-meta-row">
                        <span class="app-meta"><i class="fa-solid fa-building-ngo"></i> ${esc(a.ngo_name)}</span>
                        <span class="app-meta" style="color:${cat.color}">${cat.icon} ${cat.label}</span>
                        <span class="app-meta"><i class="fa-regular fa-calendar"></i> ${a.submitted_at}</span>
                        <span class="status-tag ${sc}">${label}</span>
                        <span class="status-tag" style="background:var(--bg-elevated);color:var(--text-dim)">${a.problem_status}</span>
                    </div>
                    <div class="app-actions-row">
                        <a href="${esc(a.link)}" target="_blank" rel="noopener" class="btn-ghost" style="font-size:0.78rem;padding:7px 12px;display:inline-flex;align-items:center;gap:6px;">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> My Submission
                        </a>
                        <button class="btn-icon" onclick="openChat('${a.problem_id}','${a.ngo_id}','${esc(a.ngo_name)}')" title="Chat with NGO">
                            <i class="fa-solid fa-comment"></i>
                        </button>
                        ${a.status === 'Accepted' && a.solver_link ? `<a href="${esc(a.solver_link)}" target="_blank" class="btn-success"><i class="fa-solid fa-trophy"></i> View Solution</a>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
    } catch { container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wifi-slash"></i><h3>Could not load</h3></div>`; }
}

async function loadMyNGOChallenges() {
    const container = el('myWorkContent');
    container.innerHTML = `<div class="loading-state"><i class="fa-solid fa-spinner"></i> Loading...</div>`;
    try {
        const res      = await fetch(`${API_URL}/problems?user_id=${currentUser.id}`);
        const problems = await res.json();
        const mine     = problems.filter(p => p.ngo_name === currentUser.username);
        if (!mine.length) {
            container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-circle-plus"></i><h3>No challenges posted yet</h3><button class="btn-primary" onclick="switchView('post')"><i class="fa-solid fa-circle-plus"></i> Post a Challenge</button></div>`;
            return;
        }
        container.innerHTML = `<div class="my-challenges-list">${mine.map(p => {
            const cat = CATEGORIES.find(c => c.id === p.category) || CATEGORIES[CATEGORIES.length - 1];
            const isOpen = p.status === 'Open';
            return `<div class="my-challenge-card">
                <div class="mcc-header" onclick="toggleApplicantDrawer('${p.id}')">
                    <div class="mcc-title">
                        <h4>${esc(p.title)}</h4>
                        <div class="mcc-info">
                            <span style="color:${cat.color}">${cat.icon} ${cat.label}</span>
                            <span><i class="fa-solid fa-users"></i> ${p.submission_count} applicant${p.submission_count !== 1 ? 's' : ''}</span>
                            ${p.created_at ? `<span><i class="fa-regular fa-clock"></i> ${timeAgo(p.created_at)}</span>` : ''}
                        </div>
                    </div>
                    <span class="status-pill ${p.status === 'Solved' ? 'solved' : isOpen ? 'open' : 'open'}">${p.status === 'Solved' ? '✓ Solved' : '● ' + p.status}</span>
                    ${p.status === 'Solved' ? `<span style="font-size:0.78rem;color:var(--warning);flex-shrink:0">Won by ${esc(p.solver_name)}</span>` : ''}
                    ${isOpen ? `<button class="btn-danger-ghost" onclick="event.stopPropagation();closeChallenge('${p.id}','${esc(p.title)}')" title="Close challenge">
                        <i class="fa-solid fa-lock"></i> Close
                    </button>` : ''}
                    <div class="toggle-btn"><i class="fa-solid fa-chevron-down"></i></div>
                </div>
                <div id="drawer-${p.id}" class="applicant-drawer hidden"></div>
            </div>`;
        }).join('')}</div>`;
    } catch { container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wifi-slash"></i><h3>Could not load</h3></div>`; }
}

// ══════════════════════════════════════════════
//  LEADERBOARD
// ══════════════════════════════════════════════
async function loadLeaderboard() {
    const container = el('leaderboardContent');
    container.innerHTML = `<div class="loading-state"><i class="fa-solid fa-spinner"></i> Loading...</div>`;
    try {
        const res     = await fetch(`${API_URL}/leaderboard`);
        const entries = await res.json();
        if (!entries.length) {
            container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-ranking-star"></i><h3>No entries yet</h3><p>Be the first to solve a challenge!</p></div>`;
            return;
        }
        const rankIcon = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;
        const rankCls  = r => r === 1 ? 'gold' : r === 2 ? 'silver' : r === 3 ? 'bronze' : '';
        container.innerHTML = `
            <div class="leaderboard-table">
                <div class="lb-header"><span>Rank</span><span>Developer</span><span>Solved</span><span>Impact Score</span></div>
                ${entries.map(e => `<div class="lb-row">
                    <span class="lb-rank ${rankCls(e.rank)}">${rankIcon(e.rank)}</span>
                    <div class="lb-user">
                        <div class="lb-avatar">${e.username[0].toUpperCase()}</div>
                        <span class="lb-name">${esc(e.username)}${e.username === currentUser.username ? ' <span style="font-size:0.7rem;color:var(--primary-hover)">(You)</span>' : ''}</span>
                    </div>
                    <span class="lb-count">${e.solved_count}</span>
                    <span class="lb-score">${e.score.toLocaleString()} pts</span>
                </div>`).join('')}
            </div>`;
    } catch { container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wifi-slash"></i><h3>Could not load leaderboard</h3></div>`; }
}

// ══════════════════════════════════════════════
//  BADGES
// ══════════════════════════════════════════════
async function loadMyBadges() {
    const grid = el('badgesGrid');
    grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><i class="fa-solid fa-spinner"></i> Loading badges...</div>`;
    try {
        const res      = await fetch(`${API_URL}/problems?user_id=${currentUser.id}`);
        const problems = await res.json();
        const wins     = problems.filter(p => p.status === 'Solved' && p.solver_name === currentUser.username);
        if (!wins.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-medal"></i><h3>No badges yet</h3><p>Win a challenge to earn your first certificate.</p><button class="btn-primary" onclick="switchView('challenges')"><i class="fa-solid fa-globe"></i> Browse Challenges</button></div>`;
            return;
        }
        grid.innerHTML = wins.map(p => `
            <div class="nft-card">
                <div class="hologram"><i class="fa-solid fa-trophy"></i></div>
                <h3>${esc(p.title)}</h3>
                <p>Verified by <strong>${esc(p.ngo_name)}</strong></p>
                <button class="btn-download" onclick="drawCertificate('${esc(currentUser.username)}','${esc(p.title)}','${esc(p.ngo_name)}')">
                    <i class="fa-solid fa-download"></i> Download Certificate
                </button>
            </div>`).join('');
    } catch { grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wifi-slash"></i><h3>Error loading badges</h3></div>`; }
}

// ══════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════
async function loadAnalytics() {
    const container = el('analyticsContent');
    el('analyticsSubtitle').textContent = currentUser.role === 'student'
        ? 'Your application history, success rate, and category breakdown.'
        : 'Challenge performance, applicant funnel, and engagement metrics.';
    container.innerHTML = `<div class="loading-state"><i class="fa-solid fa-spinner"></i> Calculating insights...</div>`;
    try {
        const res  = await fetch(`${API_URL}/analytics?user_id=${currentUser.id}&role=${currentUser.role}`);
        const data = await res.json();
        container.innerHTML = currentUser.role === 'student'
            ? renderStudentAnalytics(data)
            : renderNGOAnalytics(data);
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wifi-slash"></i><h3>Could not load analytics</h3><p>${err.message}</p></div>`;
    }
}

function renderStudentAnalytics(d) {
    const successRate = d.success_rate || 0;
    const catEntries  = Object.entries(d.by_category || {});
    const maxCat      = Math.max(...catEntries.map(e => e[1]), 1);

    return `
    <!-- KPI row -->
    <div class="analytics-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin-bottom:24px">
        ${kpiCard(d.total_applications, 'Total Applications', '#7c3aed')}
        ${kpiCard(d.accepted,           'Challenges Won',     '#d97706')}
        ${kpiCard(d.pending,            'Under Review',       '#2563eb')}
        ${kpiCard(d.impact_score,       'Impact Score',       '#059669')}
    </div>

    <div class="analytics-grid wide">
        <!-- Success rate donut -->
        <div class="analytics-card">
            <h4><i class="fa-solid fa-chart-pie"></i> Success Rate</h4>
            <div class="donut-row">
                <div class="donut-wrap">${donutSVG(successRate, '#059669', 130)}</div>
                <div class="donut-legend">
                    <div class="legend-item"><div class="legend-dot" style="background:#059669"></div><span class="legend-label">Accepted</span><span class="legend-val">${d.accepted}</span></div>
                    <div class="legend-item"><div class="legend-dot" style="background:#2563eb"></div><span class="legend-label">Pending</span><span class="legend-val">${d.pending}</span></div>
                    <div class="legend-item"><div class="legend-dot" style="background:rgba(255,255,255,0.15)"></div><span class="legend-label">Closed</span><span class="legend-val">${d.closed}</span></div>
                </div>
            </div>
        </div>

        <!-- Category breakdown -->
        <div class="analytics-card">
            <h4><i class="fa-solid fa-layer-group"></i> Applications by Category</h4>
            ${catEntries.length ? `<div class="bar-chart-rows">
                ${catEntries.sort((a,b) => b[1]-a[1]).map(([cat, count]) => {
                    const info = CATEGORIES.find(c => c.id === cat) || CATEGORIES[CATEGORIES.length-1];
                    return `<div class="bar-chart-row">
                        <span class="bar-label">${info.icon} ${cat}</span>
                        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(count/maxCat*100)}%;background:${info.color}"></div></div>
                        <span class="bar-value">${count}</span>
                    </div>`;
                }).join('')}
            </div>` : '<p style="color:var(--text-dim);font-size:0.85rem">No data yet.</p>'}
        </div>
    </div>

    <!-- Impact score milestone -->
    <div class="analytics-card" style="margin-top:18px">
        <h4><i class="fa-solid fa-bolt"></i> Impact Score Progress</h4>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            ${[0,500,1000,2000,5000].map(milestone => {
                const reached = d.impact_score >= milestone;
                return `<div style="text-align:center;opacity:${reached ? 1 : 0.35}">
                    <div style="font-size:1.8rem">${reached ? '🏅' : '⬜'}</div>
                    <div style="font-size:0.72rem;color:var(--text-dim);margin-top:4px">${milestone} pts</div>
                </div>`;
            }).join('')}
            <div style="flex:1;margin-left:8px">
                <div style="font-size:0.83rem;color:var(--text-dim);margin-bottom:6px">Current: <strong style="color:var(--primary-hover)">${d.impact_score} pts</strong></div>
                <div style="background:rgba(255,255,255,0.06);border-radius:50px;height:10px;overflow:hidden">
                    <div style="width:${Math.min(d.impact_score/50,100)}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:50px;transition:width 1s"></div>
                </div>
                <div style="font-size:0.72rem;color:var(--text-dim);margin-top:4px">Next milestone: ${[500,1000,2000,5000].find(m => m > d.impact_score) || '5000+'} pts</div>
            </div>
        </div>
    </div>`;
}

function renderNGOAnalytics(d) {
    const totalApplicants = d.total_applicants || 0;
    const catEntries = Object.entries(d.by_category || {});
    const maxCat     = Math.max(...catEntries.map(e => e[1]), 1);
    const solveRate  = d.solve_rate || 0;
    const topChallenges = (d.challenges || []).slice(0, 5);

    return `
    <!-- KPI row -->
    <div class="analytics-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin-bottom:24px">
        ${kpiCard(d.total_challenges,   'Total Challenges',    '#7c3aed')}
        ${kpiCard(d.open_challenges,    'Active / Open',       '#2563eb')}
        ${kpiCard(d.solved_challenges,  'Solved',              '#059669')}
        ${kpiCard(totalApplicants,      'Total Applicants',    '#d97706')}
    </div>

    <div class="analytics-grid wide">
        <!-- Solve rate donut -->
        <div class="analytics-card">
            <h4><i class="fa-solid fa-chart-pie"></i> Challenge Solve Rate</h4>
            <div class="donut-row">
                <div class="donut-wrap">${donutSVG(solveRate, '#d97706', 130)}</div>
                <div class="donut-legend">
                    <div class="legend-item"><div class="legend-dot" style="background:#d97706"></div><span class="legend-label">Solved</span><span class="legend-val">${d.solved_challenges}</span></div>
                    <div class="legend-item"><div class="legend-dot" style="background:#2563eb"></div><span class="legend-label">Open</span><span class="legend-val">${d.open_challenges}</span></div>
                    <div style="margin-top:8px;font-size:0.78rem;color:var(--text-dim)">Avg. ${d.avg_applicants} applicants/challenge</div>
                </div>
            </div>
        </div>

        <!-- Applicant funnel -->
        <div class="analytics-card">
            <h4><i class="fa-solid fa-filter"></i> Applicant Funnel</h4>
            <div class="funnel">
                ${funnelBar('Total Challenges', d.total_challenges, d.total_challenges, '#7c3aed')}
                ${funnelBar('With Applicants', d.challenges?.filter(c => c.submission_count > 0).length || 0, d.total_challenges, '#2563eb')}
                ${funnelBar('Solved', d.solved_challenges, d.total_challenges, '#059669')}
            </div>
        </div>
    </div>

    <!-- Category & top challenges -->
    <div class="analytics-grid wide" style="margin-top:18px">
        <div class="analytics-card">
            <h4><i class="fa-solid fa-layer-group"></i> Challenges by Category</h4>
            ${catEntries.length ? `<div class="bar-chart-rows">
                ${catEntries.sort((a,b)=>b[1]-a[1]).map(([cat, count]) => {
                    const info = CATEGORIES.find(c => c.id === cat) || CATEGORIES[CATEGORIES.length-1];
                    return `<div class="bar-chart-row">
                        <span class="bar-label">${info.icon} ${cat}</span>
                        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(count/maxCat*100)}%;background:${info.color}"></div></div>
                        <span class="bar-value">${count}</span>
                    </div>`;
                }).join('')}
            </div>` : '<p style="color:var(--text-dim);font-size:0.85rem">No data yet.</p>'}
        </div>

        <div class="analytics-card">
            <h4><i class="fa-solid fa-fire"></i> Top Challenges by Applicants</h4>
            ${topChallenges.length ? `<div style="display:flex;flex-direction:column;gap:10px">
                ${topChallenges.map((c,i) => `<div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:1rem;width:22px;text-align:center">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]||'•'}</span>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:0.83rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.title)}</div>
                        <div style="font-size:0.73rem;color:var(--text-dim)">${c.submission_count} applicants · ${c.status}</div>
                    </div>
                </div>`).join('')}
            </div>` : '<p style="color:var(--text-dim);font-size:0.85rem">No data yet.</p>'}
        </div>
    </div>`;
}

function kpiCard(value, label, color) {
    return `<div class="analytics-card" style="text-align:center">
        <div style="font-size:2.5rem;font-weight:700;font-family:'Space Grotesk',sans-serif;color:${color}">${value ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-top:6px;text-transform:uppercase;letter-spacing:0.04em">${label}</div>
    </div>`;
}

function donutSVG(pct, color, size = 130) {
    const r    = 45;
    const circ = 2 * Math.PI * r;
    const dash = (Math.min(pct,100) / 100) * circ;
    const gap  = circ - dash;
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="10"/>
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10"
            stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
            stroke-linecap="round" transform="rotate(-90 50 50)"/>
        <text x="50" y="46" text-anchor="middle" fill="${color}" font-size="20" font-weight="bold" font-family="Space Grotesk, sans-serif">${pct}%</text>
        <text x="50" y="62" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="9" font-family="sans-serif">rate</text>
    </svg>`;
}

function funnelBar(label, value, max, color) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return `<div class="funnel-row">
        <span class="funnel-label">${label}</span>
        <div class="funnel-bar-wrap">
            <div class="funnel-bar" style="width:${pct}%;background:${color}">${value > 0 ? value : ''}</div>
        </div>
        <span class="funnel-count">${value}</span>
    </div>`;
}

// ══════════════════════════════════════════════
//  POST CHALLENGE
// ══════════════════════════════════════════════
async function postProject(e) {
    e.preventDefault();
    const title = el('pTitle').value.trim();
    const desc  = el('pDesc').value.trim();
    const cat   = el('pCategory').value;
    if (!title || !desc || !cat) return showToast('Please fill in all fields', 'error');
    const btn = e.submitter || e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
    try {
        const res  = await fetch(`${API_URL}/problems`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description: desc, category: cat, user_id: currentUser.id })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Challenge published! 🚀', 'success');
            el('postForm').reset();
            switchView('challenges');
        } else { showToast(data.error || 'Failed to post', 'error'); }
    } catch { showToast('Server error. Please try again.', 'error'); }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Publish Challenge';
}

// ══════════════════════════════════════════════
//  CHAT
// ══════════════════════════════════════════════
function openChat(pid, uid, uname) {
    activeChat = { pid: String(pid), uid: String(uid), uname };
    el('chatPartnerName').textContent   = uname;
    el('chatChallengeName').textContent = 'via ImpactHub';
    el('chatAvatar').textContent        = (uname[0] || 'U').toUpperCase();
    el('chatOverlay').classList.remove('hidden');
    el('chatMessages').innerHTML        = '';
    loadMessages();
    if (chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadMessages, 3000);
    setTimeout(() => el('chatInput').focus(), 100);
}
function closeChat() {
    el('chatOverlay').classList.add('hidden');
    clearInterval(chatInterval);
    chatInterval = null;
    activeChat   = null;
}
async function loadMessages() {
    if (!activeChat) return;
    try {
        const res  = await fetch(`${API_URL}/messages?problem_id=${activeChat.pid}&user1=${currentUser.id}&user2=${activeChat.uid}`);
        if (!res.ok) return;
        const msgs = await res.json();
        const box  = el('chatMessages');
        const atBottom = box.scrollHeight - box.scrollTop <= box.clientHeight + 60;
        box.innerHTML = msgs.length
            ? msgs.map(m => {
                const mine = m.sender_id === currentUser.id;
                return `<div class="msg-bubble ${mine ? 'mine' : 'theirs'}">
                    <div class="msg-content">${esc(m.content)}</div>
                    <span class="msg-time">${m.time}</span>
                </div>`;
              }).join('')
            : `<div style="text-align:center;color:var(--text-muted);font-size:0.82rem;padding:30px">Say hello to ${esc(activeChat.uname)}! 👋</div>`;
        if (atBottom) box.scrollTop = box.scrollHeight;
        pollNotifications();
    } catch { /* silent */ }
}
async function sendMessage() {
    const input = el('chatInput');
    const txt   = input.value.trim();
    if (!txt || !activeChat) return;
    input.value = '';
    try {
        await fetch(`${API_URL}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problem_id: activeChat.pid, sender_id: currentUser.id, recipient_id: activeChat.uid, content: txt })
        });
        loadMessages();
    } catch { showToast('Could not send message', 'error'); }
}

// ══════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════
async function pollNotifications() {
    if (!currentUser) return;
    try {
        const res  = await fetch(`${API_URL}/notifications?user_id=${currentUser.id}`);
        const data = await res.json();
        const badge = el('notifBadge');
        if (data.unread_count > 0) {
            badge.textContent = data.unread_count > 9 ? '9+' : data.unread_count;
            badge.classList.remove('hidden');
        } else { badge.classList.add('hidden'); }
    } catch { /* silent */ }
}

// ══════════════════════════════════════════════
//  CERTIFICATE
// ══════════════════════════════════════════════
function drawCertificate(student, problem, ngo) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 850;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,1200,850);
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 14; ctx.strokeRect(28,28,1144,794);
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 3; ctx.strokeRect(46,46,1108,758);
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(46,46,1108,120);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = 'bold 52px Georgia';
    ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 600, 125);
    ctx.fillStyle = '#374151'; ctx.font = '22px Arial'; ctx.fillText('This certifies that', 600, 220);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 62px Georgia'; ctx.fillText(student.toUpperCase(), 600, 310);
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(250,335); ctx.lineTo(950,335); ctx.stroke();
    ctx.fillStyle = '#374151'; ctx.font = '22px Arial'; ctx.fillText('has successfully solved the following challenge:', 600, 390);
    ctx.fillStyle = '#1e3a8a'; ctx.font = 'bold 32px Georgia';
    const lines = wrapText(ctx, `"${problem}"`, 800);
    lines.forEach((line, i) => ctx.fillText(line, 600, 455 + i * 42));
    ctx.fillStyle = '#6b7280'; ctx.font = '20px Arial';
    ctx.fillText(`Issued by: ${ngo}`, 600, 600);
    ctx.fillText(`Date: ${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}`, 600, 630);
    ctx.beginPath(); ctx.arc(960,720,65,0,Math.PI*2);
    ctx.fillStyle = '#d4af37'; ctx.fill();
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#7c2d12'; ctx.font = 'bold 13px Arial';
    ctx.fillText('IMPACTHUB', 960, 712); ctx.fillText('VERIFIED', 960, 733);
    ctx.fillStyle = 'rgba(109,40,217,0.06)'; ctx.font = 'bold 110px Arial';
    ctx.save(); ctx.translate(600,450); ctx.rotate(-0.3); ctx.fillText('IMPACTHUB', 0, 0); ctx.restore();
    const link = document.createElement('a');
    link.download = `ImpactHub_Certificate_${student}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Certificate downloaded!', 'success');
}
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = []; let line = '';
    for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line.trim()); line = word + ' '; }
        else line = test;
    }
    if (line) lines.push(line.trim());
    return lines;
}

// ══════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════
function el(id)   { return document.getElementById(id); }
function show(id) { const e = el(id); if (e) e.classList.remove('hidden'); }
function hide(id) { const e = el(id); if (e) e.classList.add('hidden'); }

function esc(text) {
    if (text == null) return '';
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(text)));
    return d.innerHTML;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff/3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', {day:'numeric',month:'short'});
}

function showToast(message, type = 'info') {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${esc(message)}</span>`;
    el('toastContainer').appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 350); }, 3800);
}