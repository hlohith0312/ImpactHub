const API_URL = "http://127.0.0.1:5000/api";
let currentUser = null;
let globalProblems = [];
let activeChatProblemId = null;
let chatInterval = null;

// ==================================================================
// 1. AUTHENTICATION
// ==================================================================

function switchAuthTab(tab) {
    if(tab === 'login') {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('tab-register').classList.remove('active');
    } else {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('tab-login').classList.remove('active');
        document.getElementById('tab-register').classList.add('active');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const user = document.getElementById('rUser').value;
    const pass = document.getElementById('rPass').value;
    const role = document.getElementById('rRole').value;
    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, role: role })
        });
        if(res.ok) { alert("Account Created!"); switchAuthTab('login'); }
        else { alert("Error registering"); }
    } catch (err) { alert("Backend offline?"); }
}

async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('lUser').value;
    const pass = document.getElementById('lPass').value;
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if(res.ok) { currentUser = data; initDashboard(); }
        else { alert(data.error); }
    } catch (err) { alert("Backend offline?"); }
}

function logout() { location.reload(); }

// ==================================================================
// 2. DASHBOARD
// ==================================================================

function initDashboard() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('displayUser').innerText = currentUser.username;
    document.getElementById('displayRole').innerText = currentUser.role.toUpperCase();
    document.getElementById('profileName').innerText = currentUser.username;
    
    if(currentUser.role === 'ngo') document.getElementById('navPost').classList.remove('hidden');
    loadProblems();
}

function showSection(id) {
    document.getElementById('view-problems').classList.add('hidden');
    document.getElementById('view-post').classList.add('hidden');
    document.getElementById('view-profile').classList.add('hidden');
    document.getElementById(`view-${id}`).classList.remove('hidden');
    
    // Load Profile Data if that section is active
    if(id === 'profile') loadMyBadges();
}

// ==================================================================
// 3. PROBLEMS & CHAT
// ==================================================================

async function loadProblems() {
    const res = await fetch(`${API_URL}/problems`);
    globalProblems = await res.json();
    const container = document.getElementById('problemsList');
    container.innerHTML = "";

    globalProblems.forEach(p => {
        let actionArea = "";
        
        // --- STUDENT LOGIC ---
        if(currentUser.role === 'student') {
            if(p.status === 'Open') {
                actionArea = `
                    <div class="action-box">
                        <input type="text" id="sol-${p.id}" placeholder="GitHub Link">
                        <button onclick="submitSolution(${p.id})" class="btn-sm">Submit</button>
                    </div>`;
            } else if(p.solver_name === currentUser.username && p.status === 'Pending Review') {
                // Pending Review: Show Chat & Re-Upload
                actionArea = `
                    <div class="action-box pending">
                        <p><strong>Under Review</strong></p>
                        <input type="text" id="sol-${p.id}" value="${p.solution_link}" style="margin-bottom:5px;">
                        <button onclick="submitSolution(${p.id})" class="btn-sm" style="background:#eab308;">Re-Upload</button>
                        <button onclick="openChat(${p.id}, '${p.ngo_name}')" class="btn-chat"><i class="fa-solid fa-comments"></i> Chat with NGO</button>
                    </div>`;
            }
        } 
        // --- NGO LOGIC ---
        else if(currentUser.role === 'ngo' && p.ngo_name === currentUser.username) {
            if(p.status === 'Pending Review') {
                actionArea = `
                    <div class="action-box pending">
                        <p><strong>Submission:</strong> <a href="${p.solution_link}" target="_blank">View Project</a></p>
                        <p>by ${p.solver_name}</p>
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <button onclick="openChat(${p.id}, '${p.solver_name}')" class="btn-chat"><i class="fa-solid fa-comments"></i> Chat</button>
                            <button onclick="acceptSolution(${p.id})" class="btn-success">Accept & Certify</button>
                        </div>
                    </div>`;
            }
        }
        
        if(p.status === 'Solved') {
            actionArea = `<div class="action-box"><span class="badge solved">Solved by ${p.solver_name}</span></div>`;
        }

        container.innerHTML += `
            <div class="card problem-card">
                <div class="card-header">
                    <span class="badge ${p.status.toLowerCase().replace(' ', '-')}">${p.status}</span>
                    <span class="meta">Posted by ${p.ngo_name}</span>
                </div>
                <h3>${p.title}</h3>
                <p>${p.description}</p>
                ${actionArea}
            </div>
        `;
    });
}

// --- CHAT SYSTEM ---
function openChat(problemId, chatPartner) {
    activeChatProblemId = problemId;
    document.getElementById('chatOverlay').classList.remove('hidden');
    document.getElementById('chatPartner').innerText = chatPartner;
    loadMessages();
    if(chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadMessages, 3000);
}

function closeChat() {
    document.getElementById('chatOverlay').classList.add('hidden');
    activeChatProblemId = null;
    if(chatInterval) clearInterval(chatInterval);
}

async function loadMessages() {
    if(!activeChatProblemId) return;
    const res = await fetch(`${API_URL}/messages/${activeChatProblemId}`);
    const msgs = await res.json();
    
    const box = document.getElementById('chatBox');
    box.innerHTML = "";
    
    msgs.forEach(m => {
        const isMe = m.sender_id === currentUser.id;
        box.innerHTML += `
            <div class="msg-row ${isMe ? 'msg-me' : 'msg-other'}">
                <div class="msg-bubble">
                    <small><b>${isMe ? 'You' : m.sender}</b> ${m.time}</small>
                    <p>${m.content}</p>
                </div>
            </div>`;
    });
    box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value;
    if(!text) return;
    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            problem_id: activeChatProblemId, 
            user_id: currentUser.id, 
            content: text 
        })
    });
    input.value = "";
    loadMessages();
}

// --- CORE ACTIONS ---
async function postProblem(e) {
    e.preventDefault();
    const title = document.getElementById('pTitle').value;
    const desc = document.getElementById('pDesc').value;
    await fetch(`${API_URL}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc, user_id: currentUser.id })
    });
    alert("Problem Posted!");
    document.getElementById('pTitle').value = "";
    document.getElementById('pDesc').value = "";
    showSection('problems');
    loadProblems();
}

async function submitSolution(probId) {
    const link = document.getElementById(`sol-${probId}`).value;
    if(!link) return alert("Please paste a link!");
    await fetch(`${API_URL}/submit_solution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: probId, user_id: currentUser.id, solution_link: link })
    });
    alert("Solution Submitted/Updated!");
    loadProblems();
}

async function acceptSolution(probId) {
    await fetch(`${API_URL}/accept_solution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: probId, tx_hash: "0x"+Math.random().toString(16).substr(2,40) })
    });
    alert("Accepted! Certificate Issued.");
    loadProblems();
}

// ==================================================================
// 4. PROFILE & CERTIFICATES (FIXED FOR NGO)
// ==================================================================

function loadMyBadges() {
    const container = document.getElementById('badgesContainer');
    const label = document.querySelector('.stat-box label');
    const score = document.getElementById('impactScore');
    
    container.innerHTML = "";

    // --- NGO LOGIC: Show "Problems Posted" ---
    if(currentUser.role === 'ngo') {
        label.innerText = "Problems Posted";
        
        const myPosts = globalProblems.filter(p => p.ngo_name === currentUser.username);
        score.innerText = myPosts.length;

        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#64748b;">
                <i class="fa-solid fa-hand-holding-heart" style="font-size:3rem; margin-bottom:15px; display:block;"></i>
                <p>NGOs track posted challenges here.</p>
                <p><strong>Certificates are issued to Students only.</strong></p>
            </div>
        `;
        return;
    }

    // --- STUDENT LOGIC: Show "Impact Badges" ---
    label.innerText = "Impact Badges";
    
    const mySolved = globalProblems.filter(p => p.solver_name === currentUser.username && p.status === 'Solved');
    score.innerText = mySolved.length;

    if(mySolved.length === 0) { 
        container.innerHTML = "<p>No badges yet.</p>"; 
        return; 
    }

    mySolved.forEach(p => {
        container.innerHTML += `
            <div class="badge-card">
                <div class="badge-icon"><i class="fa-solid fa-award"></i></div>
                <div class="badge-info">
                    <h4>${p.title}</h4>
                    <p class="badge-desc">Solved by <strong>${currentUser.username}</strong></p>
                    <div class="cert-download-area">
                        <button onclick="downloadCertificate('${currentUser.username}', '${p.title}', '${p.ngo_name}')" class="btn-download">Download</button>
                    </div>
                </div>
            </div>`;
    });
}

function downloadCertificate(studentName, problemName, ngoName) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1000; canvas.height = 700;
    ctx.fillStyle = "#fff"; ctx.fillRect(0,0,1000,700);
    ctx.lineWidth = 20; ctx.strokeStyle = "#2563eb"; ctx.strokeRect(20,20,960,660);
    ctx.font = "bold 60px Arial"; ctx.fillStyle = "#1e293b"; ctx.textAlign = "center";
    ctx.fillText("CERTIFICATE OF IMPACT", 500, 180);
    ctx.font = "40px Arial"; ctx.fillStyle = "#2563eb"; ctx.fillText(studentName.toUpperCase(), 500, 350);
    ctx.font = "30px Arial"; ctx.fillStyle = "#333"; ctx.fillText(`Solved: "${problemName}"`, 500, 450);
    ctx.font = "italic 25px Arial"; ctx.fillStyle = "#666"; ctx.fillText(`Verified by: ${ngoName}`, 500, 550);
    const link = document.createElement('a');
    link.download = `Cert-${studentName}.png`;
    link.href = canvas.toDataURL();
    link.click();
}