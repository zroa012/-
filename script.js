/* 智能学习助手 - 完整稳定版
   1. 首次使用介绍页仅显示一次
   2. 开始学习页面只有一个倒计时
   3. 倒计时结束前不显示评价
   4. 离开开始学习页面或切换到其他标签页时，正在进行的倒计时自动重置
*/

let knowledge = JSON.parse(localStorage.getItem("studyKnowledge") || "[]");
let studyRecords = JSON.parse(localStorage.getItem("studyRecords") || "[]");

let timerInterval = null;
let timerSeconds = 1800;
let timerRunning = false;
let timerFinished = false;
let timerPageActive = true;

function saveData() {
    localStorage.setItem("studyKnowledge", JSON.stringify(knowledge));
    localStorage.setItem("studyRecords", JSON.stringify(studyRecords));
}

function todayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatDateChinese() {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function showMessage(text) {
    const el = document.getElementById("message");
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
    clearTimeout(showMessage._timer);
    showMessage._timer = setTimeout(() => el.style.display = "none", 1800);
}

function getNode(id) {
    return knowledge.find(x => String(x.id) === String(id));
}

function ensureNodeFields(node) {
    node.id = node.id || Date.now() + Math.random();
    node.subject = node.subject || "未分类";
    node.name = node.name || node.knowledge || "未命名知识点";
    node.time = Number(node.time || 30);
    node.proficiency = Number(node.proficiency || 0);
    node.records = Number(node.records || 0);
    node.lastStudy = node.lastStudy || "";
    node.nextReview = node.nextReview || todayString();
    return node;
}

knowledge = knowledge.map(ensureNodeFields);

function showPage(id) {
    if (id !== "study") {
        resetTimer(true);
    }

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = document.getElementById(id);
    if (page) page.classList.add("active");

    if (id === "study") {
        timerPageActive = true;
        fillStudySelect();
        const select = document.getElementById("studyId");
        if (select && select.value) changeStudyNode();
        else resetTimer(true);
    }

    refresh();
}

function fillStudySelect() {
    const select = document.getElementById("studyId");
    if (!select) return;

    const old = select.value;
    select.innerHTML = "";

    if (!knowledge.length) {
        select.innerHTML = '<option value="">暂无知识点，请先添加</option>';
        resetTimer(true);
        return;
    }

    knowledge.forEach(node => {
        const option = document.createElement("option");
        option.value = node.id;
        option.textContent = `${node.subject} · ${node.name}`;
        select.appendChild(option);
    });

    if (knowledge.some(x => String(x.id) === String(old))) {
        select.value = old;
    }
}

function getStudyMinutes() {
    const input = document.getElementById("studyTime");
    let minutes = Number(input ? input.value : 30);
    if (!Number.isFinite(minutes)) minutes = 30;
    return Math.max(1, Math.min(600, Math.floor(minutes)));
}

function renderTimer() {
    const el = document.getElementById("studyTimer");
    if (!el) return;

    const min = Math.floor(timerSeconds / 60);
    const sec = timerSeconds % 60;
    el.textContent = `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;

    const status = document.getElementById("timerStatus");
    if (!status) return;

    if (timerFinished) status.textContent = "学习时间已完成，请评价本次学习";
    else if (timerRunning) status.textContent = "正在专注学习……";
    else status.textContent = "准备开始学习";
}

function setEvaluation(show) {
    const el = document.getElementById("studyEvaluation");
    if (el) el.classList.toggle("show", !!show);
}

function resetTimer(silent = false) {
    unlockSidebarAfterStudy();
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerFinished = false;
    timerPageActive = document.getElementById("study")?.classList.contains("active") ?? true;

    const minutes = getStudyMinutes();
    timerSeconds = minutes * 60;

    renderTimer();
    setEvaluation(false);

    if (!silent) showMessage("倒计时已重置");
}

function startTimer() {
    const select = document.getElementById("studyId");
    if (!knowledge.length || !select || !select.value) {
        showMessage("请先添加并选择一个知识点");
        return;
    }

    if (timerFinished) {
        resetTimer(true);
    }

    if (timerRunning) return;

   // 开始学习后强制收起侧边栏
   lockSidebarForStudy();
   
   timerPageActive = true;
   timerRunning = true;
    setEvaluation(false);
    renderTimer();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!timerPageActive || !document.getElementById("study")?.classList.contains("active") || document.hidden) {
            resetTimer(true);
            return;
        }

        timerSeconds--;

        if (timerSeconds <= 0) {
            timerSeconds = 0;
            clearInterval(timerInterval);
            timerInterval = null;
            timerRunning = false;
            timerFinished = true;
            renderTimer();
            setEvaluation(true);
            showMessage("学习时间结束，请进行评价");
            return;
        }

        renderTimer();
    }, 1000);
}

function pauseTimer() {
    if (!timerRunning) return;
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    renderTimer();
    showMessage("倒计时已暂停");
}

function changeStudyTime() {
    if (timerRunning) {
        showMessage("学习进行中不能修改时间");
        const input = document.getElementById("studyTime");
        if (input) input.value = Math.floor(timerSeconds / 60) || 1;
        return;
    }
    resetTimer(true);
}

function changeStudyNode() {
    resetTimer(true);
    setEvaluation(false);
}

function studyTime() {
    if (!timerFinished) {
        showMessage("请先完成倒计时，再进行评价");
        return;
    }

    const select = document.getElementById("studyId");
    const node = select ? getNode(select.value) : null;
    if (!node) {
        showMessage("请选择知识点");
        return;
    }

    const checked = document.querySelector('input[name="studyResult"]:checked');
    const result = Number(checked ? checked.value : 3);

    // 与常见 C++ 版本对应的 1~5 评价：结果越高，熟练度提升越明显。
    node.proficiency = Math.max(0, Math.min(100,
        Math.round(node.proficiency * 0.7 + result * 20 * 0.3)
    ));
    node.records += 1;
    node.lastStudy = todayString();

    const minutes = getStudyMinutes();
    studyRecords.push({
        date: todayString(),
        nodeId: node.id,
        name: node.name,
        minutes,
        result
    });

    // 简单的复习安排：掌握程度越高，复习间隔越长。
    const intervals = {1:1, 2:2, 3:3, 4:5, 5:7};
    const next = new Date();
    next.setDate(next.getDate() + intervals[result]);
    node.nextReview = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;

    saveData();
    resetTimer(true);
    showMessage("本次学习已记录");
    refresh();
}

function showAdd() {
    const modal = document.getElementById("addModal");
    if (modal) modal.classList.add("show");
}

function closeAdd() {
    const modal = document.getElementById("addModal");
    if (modal) modal.classList.remove("show");
}

function addNode() {
    const subject = document.getElementById("addSubject")?.value.trim();
    const name = document.getElementById("addKnowledge")?.value.trim();
    const time = Number(document.getElementById("addTime")?.value || 30);

    if (!subject || !name) {
        showMessage("请填写科目和知识点");
        return;
    }

    knowledge.push({
        id: Date.now() + Math.random(),
        subject,
        name,
        time: Math.max(1, Math.min(600, Math.floor(time))),
        proficiency: 0,
        records: 0,
        lastStudy: "",
        nextReview: todayString()
    });

    saveData();
    closeAdd();

    ["addSubject","addKnowledge"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const addTime = document.getElementById("addTime");
    if (addTime) addTime.value = 30;

    refresh();
    fillStudySelect();
    resetTimer(true);
    showMessage("知识点添加成功");
}

function deleteNode(id) {
    if (!confirm("确定要删除这个知识点吗？")) return;
    knowledge = knowledge.filter(x => String(x.id) !== String(id));
    saveData();
    refresh();
    fillStudySelect();
    resetTimer(true);
    showMessage("知识点已删除");
}

function reviewNode(id) {
    const node = getNode(id);
    if (!node) return;
    showPage("study");
    const select = document.getElementById("studyId");
    if (select) {
        select.value = id;
        changeStudyNode();
    }
}

function dueNodes() {
    const today = todayString();
    return knowledge.filter(n => !n.nextReview || n.nextReview <= today);
}

function refresh() {
    document.getElementById("homeDate")?.replaceChildren(document.createTextNode(formatDateChinese()));
    document.getElementById("planDate")?.replaceChildren(document.createTextNode(formatDateChinese()));

    const totalMinutes = studyRecords.reduce((s,r) => s + Number(r.minutes || 0), 0);
    const avg = knowledge.length
        ? Math.round(knowledge.reduce((s,n) => s + Number(n.proficiency || 0), 0) / knowledge.length)
        : 0;
    const due = dueNodes();

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText("homeKnowledge", knowledge.length);
    setText("homeReview", due.length);
    setText("homeTime", totalMinutes);
    setText("homeProficiency", avg);
    setText("countKnowledge", knowledge.length);
    setText("countProficiency", avg);
    setText("countTime", totalMinutes);
    setText("countRecord", studyRecords.length);

    renderKnowledge();
    renderPlan();
    renderReview();
    renderRecent();
    renderWeak();
    renderCount();
    renderDelete();
    renderHomePlan();
    renderHomeWeak();
}

function renderKnowledge() {
    const el = document.getElementById("knowledgeList");
    if (!el) return;

    if (!knowledge.length) {
        el.innerHTML = '<div class="empty">还没有知识点，点击“添加知识点”开始吧。</div>';
        return;
    }

    el.innerHTML = knowledge.map(n => `
        <div class="knowledge-item">
            <div>
                <div class="item-title">${escapeHtml(n.name)}</div>
                <div class="item-sub">${escapeHtml(n.subject)} · 学习 ${n.records} 次</div>
            </div>
            <div class="item-right">
                <span class="progress"><div style="width:${n.proficiency}%"></div></span>
                <strong>${n.proficiency}%</strong>
            </div>
        </div>
    `).join("");
}

function renderPlan() {
    const el = document.getElementById("planList");
    if (!el) return;

    const list = dueNodes();
    el.innerHTML = list.length ? list.map(n => `
        <div class="plan-item">
            <div>
                <div class="item-title">${escapeHtml(n.name)}</div>
                <div class="item-sub">${escapeHtml(n.subject)}</div>
            </div>
            <div class="plan-time">${n.time} 分钟</div>
        </div>
    `).join("") : '<div class="empty">今天暂时没有需要复习的知识点。</div>';

    const total = list.reduce((s,n) => s + Number(n.time || 0), 0);
    const elTime = document.getElementById("planTime");
    if (elTime) elTime.textContent = total;
}

function renderReview() {
    const el = document.getElementById("reviewList");
    if (!el) return;

    const list = dueNodes();
    el.innerHTML = list.length ? list.map(n => `
        <div class="review-item">
            <div class="item-title">${escapeHtml(n.name)}</div>
            <div class="item-sub">${escapeHtml(n.subject)} · 熟练度 ${n.proficiency}%</div>
            <button class="review-button" onclick="reviewNode('${String(n.id)}')">去学习</button>
        </div>
    `).join("") : '<div class="empty">今天没有需要复习的知识点。</div>';
}

function renderRecent() {
    const el = document.getElementById("recentList");
    if (!el) return;

    const days = {};
    studyRecords.forEach(r => {
        days[r.date] = (days[r.date] || 0) + Number(r.minutes || 0);
    });

    const entries = Object.entries(days).sort((a,b) => b[0].localeCompare(a[0])).slice(0,7);

    el.innerHTML = entries.length
        ? entries.map(([date,minutes]) => `<div class="recent-row"><span>${date}</span><strong>${minutes} 分钟</strong></div>`).join("")
        : '<div class="empty">还没有学习记录。</div>';

    const recent = studyRecords.filter(r => {
        const d = new Date(r.date + "T00:00:00");
        const diff = (new Date() - d) / 86400000;
        return diff >= 0 && diff < 7;
    });

    const time = recent.reduce((s,r) => s + Number(r.minutes || 0), 0);
    const uniqueDays = new Set(recent.map(r => r.date)).size;

    document.getElementById("recentTime") && (document.getElementById("recentTime").textContent = time);
    document.getElementById("recentDays") && (document.getElementById("recentDays").textContent = uniqueDays);
    document.getElementById("recentAverage") && (document.getElementById("recentAverage").textContent = uniqueDays ? Math.round(time/uniqueDays) : 0);
}

function renderWeak() {
    const el = document.getElementById("weakList");
    const home = document.getElementById("homeWeak");
    const list = knowledge.filter(n => Number(n.proficiency) < 60).sort((a,b) => a.proficiency-b.proficiency);

    const html = list.length ? list.map(n => `
        <div class="weak-item">
            <div class="item-title">${escapeHtml(n.name)}</div>
            <div class="item-sub">${escapeHtml(n.subject)} · 熟练度 ${n.proficiency}%</div>
        </div>
    `).join("") : '<div class="empty">目前没有明显薄弱知识点。</div>';

    if (el) el.innerHTML = html;
    if (home) home.innerHTML = list.slice(0,3).length
        ? list.slice(0,3).map(n => `<div class="recent-row"><span>${escapeHtml(n.name)}</span><strong>${n.proficiency}%</strong></div>`).join("")
        : '<div class="empty">目前没有薄弱知识点。</div>';
}

function renderCount() {
    const el = document.getElementById("countDetail");
    if (!el) return;

    el.innerHTML = knowledge.length ? knowledge.map(n => `
        <div class="stat-line">
            <span>${escapeHtml(n.subject)} · ${escapeHtml(n.name)}</span>
            <strong>${n.proficiency}%</strong>
        </div>
    `).join("") : '<div class="empty">暂无数据。</div>';
}

function renderDelete() {
    const el = document.getElementById("deleteList");
    if (!el) return;

    el.innerHTML = knowledge.length ? knowledge.map(n => `
        <div class="delete-item">
            <div>
                <div class="item-title">${escapeHtml(n.name)}</div>
                <div class="item-sub">${escapeHtml(n.subject)}</div>
            </div>
            <button class="delete-btn" onclick="deleteNode('${String(n.id)}')">删除</button>
        </div>
    `).join("") : '<div class="empty">暂无可删除的知识点。</div>';
}

function renderHomePlan() {
    const el = document.getElementById("homePlan");
    if (!el) return;
    const list = dueNodes().slice(0,3);

    el.innerHTML = list.length ? list.map(n => `
        <div class="recent-row">
            <span>${escapeHtml(n.name)}</span>
            <strong>${n.time} 分钟</strong>
        </div>
    `).join("") : '<div class="empty">今天暂无复习计划。</div>';
}

function renderHomeWeak() {
    // 保留为空函数，具体内容由 renderWeak 统一更新。
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
}

/* =========================
   首次使用介绍页
   ========================= */

function initFirstUseIntro() {
    if (localStorage.getItem("hasSeenIntro") === "true") return;
    if (document.getElementById("firstUseIntro")) return;

    const style = document.createElement("style");
    style.id = "firstUseIntroStyle";
    style.textContent = `
        #firstUseIntro{
            position:fixed;
            inset:0;
            z-index:99999;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            background:linear-gradient(135deg,#eef4ff,#f8fbff,#eef8f4);
            transition:opacity .3s
        }
        #firstUseIntro.hide{
            opacity:0;
            pointer-events:none
        }
        .first-use-card{
            width:min(760px,100%);
            max-height:90vh;
            overflow:auto;
            background:#fff;
            border-radius:26px;
            padding:40px;
            box-shadow:0 25px 70px rgba(0,0,0,.13);
            text-align:center
        }
        .first-use-icon{
            font-size:42px;
            margin-bottom:10px
        }
        .first-use-card h1{
            margin:0;
            color:#202938;
            font-size:32px
        }
        .first-use-subtitle{
            color:#7b8494;
            line-height:1.7
        }
        .first-use-features{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:12px;
            text-align:left;
            margin:25px 0
        }
        .first-use-feature{
            display:flex;
            gap:12px;
            padding:14px;
            border-radius:14px;
            background:#f7f9fc
        }
        .feature-icon{
            font-size:22px
        }
        .first-use-feature strong{
            display:block;
            margin-bottom:3px
        }
        .first-use-feature span{
            font-size:12px;
            color:#7b8494
        }
        .first-use-flow{
            padding:16px;
            background:#f7f9fc;
            border-radius:14px
        }
        .flow-title{
            font-weight:bold;
            margin-bottom:10px
        }
        .flow-list{
            display:flex;
            justify-content:center;
            gap:7px;
            flex-wrap:wrap;
            font-size:12px
        }
        .flow-list span{
            padding:7px;
            background:#fff;
            border-radius:7px
        }
        .first-use-note{
            font-size:12px;
            color:#9ba3b1;
            line-height:1.7
        }
        #startUsingButton{
            width:220px;
            height:48px;
            border:0;
            border-radius:12px;
            background:#4f7cff;
            color:#fff;
            font-size:16px;
            font-weight:bold
        }
        @media(max-width:650px){
            .first-use-card{padding:28px 20px}
            .first-use-features{grid-template-columns:1fr}
        }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "firstUseIntro";

    wrap.innerHTML = `
        <div class="first-use-card">
            <div class="first-use-icon">📚</div>
            <h1>欢迎使用智能学习助手</h1>
            <p class="first-use-subtitle">
                用更清晰的方式记录知识点、安排复习计划，
                帮助你形成自己的学习节奏。
            </p>

            <div class="first-use-features">
                <div class="first-use-feature">
                    <div class="feature-icon">📖</div>
                    <div>
                        <strong>知识点管理</strong>
                        <span>记录并管理已经学习的知识点。</span>
                    </div>
                </div>

                <div class="first-use-feature">
                    <div class="feature-icon">⏱️</div>
                    <div>
                        <strong>专注学习</strong>
                        <span>使用学习倒计时进行一次完整学习。</span>
                    </div>
                </div>

                <div class="first-use-feature">
                    <div class="feature-icon">🔄</div>
                    <div>
                        <strong>智能复习</strong>
                        <span>根据学习结果安排后续复习。</span>
                    </div>
                </div>

                <div class="first-use-feature">
                    <div class="feature-icon">📊</div>
                    <div>
                        <strong>学习统计</strong>
                        <span>查看学习时间、次数和知识点掌握情况。</span>
                    </div>
                </div>
            </div>

            <div class="first-use-flow">
                <div class="flow-title">推荐使用流程</div>
                <div class="flow-list">
                    <span>① 添加知识点</span>
                    <span>→</span>
                    <span>② 开始学习</span>
                    <span>→</span>
                    <span>③ 完成评价</span>
                    <span>→</span>
                    <span>④ 按计划复习</span>
                </div>
            </div>

            <p class="first-use-note">
                首次使用后，本介绍页不会再次自动显示。
            </p>

            <button id="startUsingButton">开始使用</button>
        </div>
    `;

    document.body.appendChild(wrap);

    const btn = document.getElementById("startUsingButton");
    if (btn) {
        btn.onclick = () => {
            localStorage.setItem("hasSeenIntro", "true");
            wrap.classList.add("hide");
            setTimeout(() => wrap.remove(), 300);
        };
    }
}


/* =========================
   侧边栏：状态记忆 + 学习强制收起
   ========================= */

function applySidebarState() {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    if (!sidebar || !sidebarToggle) return;

    const collapsed =
        localStorage.getItem("sidebarCollapsed") === "true";

    sidebar.classList.toggle("collapsed", collapsed);
    sidebarToggle.title = collapsed ? "展开侧边栏" : "收起侧边栏";
}

function lockSidebarForStudy() {
    document.body.classList.add("study-lock-sidebar");
}

function unlockSidebarAfterStudy() {
    document.body.classList.remove("study-lock-sidebar");
    applySidebarState();
}

function initSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    if (!sidebar || !sidebarToggle) return;

    applySidebarState();

    // 防止同一个按钮被重复绑定
    if (sidebarToggle.dataset.sidebarInitialized === "true") return;
    sidebarToggle.dataset.sidebarInitialized = "true";

    sidebarToggle.addEventListener("click", function () {
        if (document.body.classList.contains("study-lock-sidebar")) {
            return;
        }

        sidebar.classList.toggle("collapsed");

        const collapsed = sidebar.classList.contains("collapsed");
        localStorage.setItem(
            "sidebarCollapsed",
            collapsed ? "true" : "false"
        );

        sidebarToggle.title = collapsed ? "展开侧边栏" : "收起侧边栏";
    });
}


/* =========================
   防止页面中出现多个倒计时
   ========================= */

function cleanupDuplicateTimers() {
    const timers = Array.from(document.querySelectorAll("#studyTimer"));

    // 正常情况下这里应该只有一个。
    // 如果旧 HTML/CSS/脚本残留导致出现多个，只保留第一个。
    if (timers.length <= 1) return;

    const keep = timers[0];

    timers.slice(1).forEach(timer => {
        const box = timer.closest(".timer-box");
        if (box) {
            box.remove();
        } else {
            timer.remove();
        }
    });

    // 确保保留的倒计时仍在开始学习页面中
    if (!document.getElementById("studyTimer")) {
        keep.id = "studyTimer";
    }
}


/* =========================
   页面可见性
   切换标签页时重置正在进行的倒计时
   ========================= */

document.addEventListener("visibilitychange", () => {
    if (
        document.hidden &&
        document.getElementById("study")?.classList.contains("active") &&
        (timerRunning || timerSeconds > 0)
    ) {
        timerPageActive = false;
        resetTimer(true);
    }
});


window.addEventListener("beforeunload", () => {
    clearInterval(timerInterval);
});


/* =========================
   初始化
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
    cleanupDuplicateTimers();

    refresh();
    fillStudySelect();
    resetTimer(true);

    initSidebar();
    initFirstUseIntro();
});
