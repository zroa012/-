/* 智能学习助手 - 完整稳定版
   1. 首次使用介绍页仅显示一次
   2. 开始学习页面只有一个倒计时
   3. 倒计时结束前不显示评价
   4. 离开开始学习页面或切换到其他标签页时，正在进行的倒计时自动重置
*/

let knowledge = JSON.parse(localStorage.getItem("studyKnowledge") || "[]");
let studyRecords = JSON.parse(localStorage.getItem("studyRecords") || "[]");
let wrongQuestions = JSON.parse(localStorage.getItem("wrongQuestions") || "[]");
let pendingStudyNodeId = null;

let timerInterval = null;
let timerSeconds = 1800;
let timerRunning = false;
let timerFinished = false;
let timerPageActive = true;
let studyMode = localStorage.getItem("studyMode") || "paper";
let timerEndAt = 0;
let leftBrowserPage = false;
let leftWhileRunning = false;

function saveData() {
    localStorage.setItem("studyKnowledge", JSON.stringify(knowledge));
    localStorage.setItem("studyRecords", JSON.stringify(studyRecords));
    localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));
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

function updateStudyModeUI() {
    const paper = document.getElementById("paperStudyMode");
    const online = document.getElementById("onlineStudyMode");
    const hint = document.getElementById("studyModeHint");

    if (paper) paper.classList.toggle("active", studyMode === "paper");
    if (online) online.classList.toggle("active", studyMode === "online");

    if (hint) {
        hint.textContent = studyMode === "online"
            ? "上网学习：可以切换到其他网页/标签页，倒计时会继续；回来后会收到提示。"
            : "纸质学习：切换到其他网页/标签页时，正在进行的倒计时会重置。";
    }
}

function setStudyMode(mode) {
    if (mode !== "online" && mode !== "paper") return;
    if (timerRunning) {
        showMessage("学习进行中不能切换学习方式，请先暂停");
        return;
    }
    studyMode = mode;
    localStorage.setItem("studyMode", mode);
    updateStudyModeUI();
    resetTimer(true);
    showMessage(mode === "online" ? "已切换为上网学习" : "已切换为纸质学习");
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
    timerEndAt = 0;
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

    if (timerFinished) resetTimer(true);
    if (timerRunning) return;

    lockSidebarForStudy();
    timerPageActive = true;
    timerRunning = true;
    setEvaluation(false);

    timerEndAt = Date.now() + timerSeconds * 1000;
    renderTimer();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!timerPageActive || !document.getElementById("study")?.classList.contains("active")) {
            resetTimer(true);
            return;
        }

        if (studyMode === "paper" && document.hidden) {
            resetTimer(true);
            leftWhileRunning = true;
            return;
        }

        timerSeconds = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));

        if (timerSeconds <= 0) {
            timerSeconds = 0;
            clearInterval(timerInterval);
            timerInterval = null;
            timerRunning = false;
            timerFinished = true;
            timerEndAt = 0;
            unlockSidebarAfterStudy();
            renderTimer();
            setEvaluation(true);
            showMessage("学习时间结束，请进行评价");
            return;
        }

        renderTimer();
    }, 250);
}

function pauseTimer() {
    if (!timerRunning) return;

    if (timerEndAt) {
        timerSeconds = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
    }

    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerEndAt = 0;
    unlockSidebarAfterStudy();
    renderTimer();
    showMessage("倒计时已暂停，侧边栏已恢复");
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
    pendingStudyNodeId = node.id;
    resetTimer(true);
    refresh();
    openWrongQuestionModal();
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

    renderKnowledge();
    renderRecent();
    renderWeak();
    renderDelete();
    renderHomePlan();
    renderHomeWeak();
    renderHomeStats();
    renderWrongQuestions();
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

function getLast7DaysData() {
    const result = [];
    const map = {};
    studyRecords.forEach(r => {
        map[r.date] = (map[r.date] || 0) + Number(r.minutes || 0);
    });
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        result.push({ date:key, minutes:Number(map[key] || 0), label:`${d.getMonth()+1}/${d.getDate()}` });
    }
    return result;
}

function drawLineChart(canvas, data, options = {}) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || 700));
    const height = Math.max(220, Math.floor(options.height || 280));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);
    const pad = {left:48,right:20,top:24,bottom:40};
    const plotW = width-pad.left-pad.right;
    const plotH = height-pad.top-pad.bottom;
    const maxVal = Math.max(10, Math.ceil(Math.max(...data.map(x=>x.minutes),0)/10)*10);
    ctx.font = "12px Arial, Microsoft YaHei, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#e8ebf0";
    ctx.fillStyle = "#8c95a3";
    for(let i=0;i<=4;i++){
        const y=pad.top+plotH*i/4;
        ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(width-pad.right,y); ctx.stroke();
        ctx.fillText(String(Math.round(maxVal*(4-i)/4)),pad.left-8,y);
    }
    const points=data.map((item,i)=>({
        x: pad.left + (data.length===1 ? plotW/2 : plotW*i/(data.length-1)),
        y: pad.top + plotH*(1-item.minutes/maxVal)
    }));
    ctx.strokeStyle="#4f7cff";
    ctx.lineWidth=3;
    ctx.lineJoin="round";
    ctx.lineCap="round";
    ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.stroke();
    points.forEach((p,i)=>{
        ctx.fillStyle="#4f7cff";
        ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#606978"; ctx.textAlign="center"; ctx.textBaseline="top";
        ctx.fillText(data[i].label,p.x,height-pad.bottom+12);
    });
}

function renderRecent() {
    const data = getLast7DaysData();
    const el = document.getElementById("recentList");
    if (el) {
        el.innerHTML = data.slice().reverse().map(x => `<div class="recent-row"><span>${x.date}</span><strong>${x.minutes} 分钟</strong></div>`).join("");
    }
    const time = data.reduce((s,x)=>s+x.minutes,0);
    const days = data.filter(x=>x.minutes>0).length;
    const setText=(id,v)=>{const e=document.getElementById(id); if(e)e.textContent=v;};
    setText("recentTime",time);
    setText("recentDays",days);
    setText("recentAverage",days?Math.round(time/days):0);
    setText("recentRecords",studyRecords.length);
    drawLineChart(document.getElementById("studyTrendCanvas"),data,{height:300});
    drawLineChart(document.getElementById("homeTrendCanvas"),data,{height:230});
}

function renderHomeStats() {
    const totalMinutes = studyRecords.reduce((s,r)=>s+Number(r.minutes||0),0);
    const avg = knowledge.length ? Math.round(knowledge.reduce((s,n)=>s+Number(n.proficiency||0),0)/knowledge.length) : 0;
    const setText=(id,v)=>{const e=document.getElementById(id); if(e)e.textContent=v;};
    setText("homeStatKnowledge",knowledge.length);
    setText("homeStatRecords",studyRecords.length);
    setText("homeStatTime",totalMinutes);
    setText("homeStatProficiency",`${avg}%`);
}

function openTool(url) {
    window.open(url,"_blank","noopener,noreferrer");
}


function openFunctionZoom() {
    const source = document.getElementById("functionCanvas");
    const modal = document.getElementById("functionZoomModal");
    const target = document.getElementById("functionZoomCanvas");
    const expr = document.getElementById("functionZoomExpression");
    if (!source || !modal || !target) return;
    if (source.dataset.drawn !== "true") { drawFunctionGraph(); }
    if (source.dataset.drawn !== "true") return;
    if (expr) expr.textContent = `y = ${source.dataset.expression || ""}`;
    functionZoomScale = 1;
    renderFunctionZoom();
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeFunctionZoom(event) {
    if (event && event.target && event.target.id !== "functionZoomModal") return;
    const modal = document.getElementById("functionZoomModal");
    if (modal) modal.classList.remove("show");
    document.body.style.overflow = "";
}

let functionZoomScale = 1;

function zoomFunctionGraph(factor) {
    functionZoomScale = Math.max(0.6, Math.min(2.5, functionZoomScale * factor));
    renderFunctionZoom();
}

function resetFunctionZoom() {
    functionZoomScale = 1;
    renderFunctionZoom();
}

function renderFunctionZoom() {
    const source = document.getElementById("functionCanvas");
    const target = document.getElementById("functionZoomCanvas");
    if (!source || !target || source.dataset.drawn !== "true") return;
    const rect = target.getBoundingClientRect();
    const width = Math.max(520, Math.floor(rect.width || 900));
    const height = Math.max(360, Math.floor(rect.height || 600));
    const dpr = window.devicePixelRatio || 1;
    target.width = width * dpr;
    target.height = height * dpr;
    const ctx = target.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,width,height);
    const scale = functionZoomScale;
    const sw = source.width / dpr;
    const sh = source.height / dpr;
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;
    ctx.drawImage(source, dx, dy, dw, dh);
}

function drawFunctionGraph() {
    const canvas = document.getElementById("functionCanvas");
    const input = document.getElementById("functionInput");
    if (!canvas || !input) return;

    const expr = input.value.trim().replace(/×/g, "*").replace(/π/g, "Math.PI");
    if (!expr) { showMessage("请输入函数表达式"); return; }

    let compiled;
    try {
        const safe = expr
            .replace(/\^/g, "**")
            .replace(/\bsin\b/gi, "Math.sin")
            .replace(/\bcos\b/gi, "Math.cos")
            .replace(/\btan\b/gi, "Math.tan")
            .replace(/\bsqrt\b/gi, "Math.sqrt")
            .replace(/\babs\b/gi, "Math.abs")
            .replace(/\blog\b/gi, "Math.log10");
        if (!/^[0-9xX+\-*/().,\sA-Za-z*_]+$/.test(safe)) throw new Error("非法字符");
        compiled = new Function("x", `return (${safe});`);
    } catch (e) {
        showMessage("函数表达式无法识别，请检查格式");
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(420, Math.floor(rect.width || 650));
    const height = 380;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 坐标范围：-10 到 10，每 1 个单位一个刻度。
    const xmin = -10, xmax = 10, ymin = -10, ymax = 10;
    const padLeft = 48, padRight = 18, padTop = 18, padBottom = 36;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const X = x => padLeft + (x - xmin) / (xmax - xmin) * plotW;
    const Y = y => padTop + plotH - (y - ymin) / (ymax - ymin) * plotH;

    // 背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 网格和刻度
    ctx.font = "11px Arial, Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let v = xmin; v <= xmax; v++) {
        const px = X(v);
        ctx.strokeStyle = v === 0 ? "#9aa3b2" : "#e8ebf0";
        ctx.lineWidth = v === 0 ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(px, padTop); ctx.lineTo(px, padTop + plotH); ctx.stroke();
        if (v !== 0) {
            ctx.fillStyle = "#707988";
            ctx.fillText(String(v), px, padTop + plotH + 7);
        }
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let v = ymin; v <= ymax; v++) {
        const py = Y(v);
        ctx.strokeStyle = v === 0 ? "#9aa3b2" : "#e8ebf0";
        ctx.lineWidth = v === 0 ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(padLeft, py); ctx.lineTo(padLeft + plotW, py); ctx.stroke();
        if (v !== 0) {
            ctx.fillStyle = "#707988";
            ctx.fillText(String(v), padLeft - 8, py);
        }
    }

    // 原点
    ctx.fillStyle = "#606978";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("0", padLeft - 8, Y(0) + 7);

    // X / Y 轴名称
    ctx.font = "bold 13px Arial, Microsoft YaHei, sans-serif";
    ctx.fillStyle = "#4f5968";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("x", padLeft + plotW, padTop + plotH + 23);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("y", padLeft + 7, padTop + 3);

    // 函数曲线
    ctx.strokeStyle = "#4f7cff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let drawing = false;
    let previousY = null;
    for (let i = 0; i <= plotW; i++) {
        const x = xmin + (xmax - xmin) * i / plotW;
        let y;
        try { y = Number(compiled(x)); } catch { y = NaN; }
        const px = X(x);
        const py = Y(y);

        // 跳过无定义值、无穷值以及跨越整个绘图区的渐近线跳变。
        if (!Number.isFinite(y) || Math.abs(y) > 100 || (previousY !== null && Math.abs(y - previousY) > 25)) {
            drawing = false;
            previousY = null;
            continue;
        }
        if (!drawing) { ctx.moveTo(px, py); drawing = true; }
        else ctx.lineTo(px, py);
        previousY = y;
    }
    ctx.stroke();

    // 保存当前函数，供导出图片使用。
    canvas.dataset.expression = input.value.trim();
    canvas.dataset.drawn = "true";
}

(function initFunctionGraphZoom() {
    document.addEventListener("click", function(e) {
        const canvas = e.target && e.target.closest ? e.target.closest("#functionCanvas") : null;
        if (canvas) openFunctionZoom();
    });
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") closeFunctionZoom();
    });
})();

function exportFunctionGraph() {
    const canvas = document.getElementById("functionCanvas");
    const input = document.getElementById("functionInput");
    if (!canvas || !input) return;

    if (canvas.dataset.drawn !== "true") {
        drawFunctionGraph();
    }
    if (canvas.dataset.drawn !== "true") return;

    const expression = canvas.dataset.expression || input.value.trim() || "未知函数";
    const out = document.createElement("canvas");
    const W = 1200, H = 760;
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d");

    ctx.fillStyle = "#f5f7fb";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(45, 35, W - 90, H - 70);

    ctx.fillStyle = "#202938";
    ctx.font = "bold 30px Arial, Microsoft YaHei, sans-serif";
    ctx.fillText("智能学习助手 · 函数图像", 80, 85);
    ctx.fillStyle = "#606978";
    ctx.font = "18px Arial, Microsoft YaHei, sans-serif";
    ctx.fillText(`y = ${expression}`, 80, 120);
    ctx.font = "14px Arial, Microsoft YaHei, sans-serif";
    ctx.fillText(`坐标范围：x ∈ [-10, 10]，y ∈ [-10, 10] · ${formatDateChinese()}`, 80, 148);

    const sourceW = canvas.width / (window.devicePixelRatio || 1);
    const sourceH = canvas.height / (window.devicePixelRatio || 1);
    const targetX = 80, targetY = 175, targetW = 1040, targetH = 500;
    // 直接缩放已绘制好的坐标系，刻度和 x/y 轴名称也会一起导出。
    ctx.drawImage(canvas, 0, 0, sourceW, sourceH, targetX, targetY, targetW, targetH);

    ctx.fillStyle = "#8c95a3";
    ctx.font = "13px Arial, Microsoft YaHei, sans-serif";
    ctx.fillText("函数图像由智能学习助手生成", 80, 705);

    const a = document.createElement("a");
    a.download = `函数图像_${todayString()}.png`;
    a.href = out.toDataURL("image/png");
    a.click();
    showMessage("函数图像已导出为图片");
}

function exportStudyImage() {
    const data=getLast7DaysData();
    const W=1100,H=720;
    const canvas=document.createElement("canvas"); canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#f5f7fb";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#ffffff";ctx.fillRect(40,35,W-80,H-70);
    ctx.fillStyle="#202938";ctx.font="bold 30px Arial, Microsoft YaHei, sans-serif";ctx.fillText("智能学习助手 · 学习情况",75,90);
    ctx.fillStyle="#8c95a3";ctx.font="16px Arial, Microsoft YaHei, sans-serif";ctx.fillText(`生成日期：${formatDateChinese()}`,75,120);
    const total=data.reduce((s,x)=>s+x.minutes,0), days=data.filter(x=>x.minutes>0).length;
    ctx.fillStyle="#4f7cff";ctx.font="bold 24px Arial";ctx.fillText(String(total),75,180);ctx.fillStyle="#606978";ctx.font="14px Arial, Microsoft YaHei, sans-serif";ctx.fillText("近7天学习分钟",75,205);
    ctx.fillStyle="#42c98b";ctx.font="bold 24px Arial";ctx.fillText(String(days),250,180);ctx.fillStyle="#606978";ctx.font="14px Arial, Microsoft YaHei, sans-serif";ctx.fillText("学习天数",250,205);
    ctx.fillStyle="#9b72e8";ctx.font="bold 24px Arial";ctx.fillText(String(studyRecords.length),390,180);ctx.fillStyle="#606978";ctx.font="14px Arial, Microsoft YaHei, sans-serif";ctx.fillText("累计学习次数",390,205);
    const left=75,top=250,cw=950,ch=350,maxVal=Math.max(10,Math.ceil(Math.max(...data.map(x=>x.minutes),0)/10)*10);
    ctx.strokeStyle="#e8ebf0";ctx.lineWidth=1;ctx.font="12px Arial";ctx.fillStyle="#8c95a3";ctx.textAlign="right";
    for(let i=0;i<=5;i++){const y=top+ch*i/5;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+cw,y);ctx.stroke();ctx.fillText(String(Math.round(maxVal*(5-i)/5)),left-10,y+4);}
    const pts=data.map((d,i)=>({x:left+cw*i/6,y:top+ch*(1-d.minutes/maxVal)}));
    ctx.strokeStyle="#4f7cff";ctx.lineWidth=4;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    pts.forEach((p,i)=>{ctx.fillStyle="#4f7cff";ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#606978";ctx.textAlign="center";ctx.font="13px Arial";ctx.fillText(data[i].label,p.x,top+ch+25);});
    const a=document.createElement("a");a.download=`学习情况_${todayString()}.png`;a.href=canvas.toDataURL("image/png");a.click();
    showMessage("学习情况图片已导出");
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
    const list = dueNodes().slice(0, 5);

    el.innerHTML = list.length ? list.map(n => `
        <div class="home-review-item">
            <div>
                <div class="item-title">${escapeHtml(n.name)}</div>
                <div class="item-sub">${escapeHtml(n.subject)} · 建议学习 ${n.time} 分钟</div>
            </div>
            <button class="review-button" onclick="reviewNode('${String(n.id)}')">去学习</button>
        </div>
    `).join("") : '<div class="empty">今天暂无需要复习的知识点。</div>';
}
function openWrongQuestionModal() {
    const modal = document.getElementById("wrongQuestionModal");
    const choice = document.getElementById("wrongQuestionChoice");
    const form = document.getElementById("wrongQuestionForm");
    if (!modal) return;
    if (choice) choice.style.display = "block";
    if (form) form.style.display = "none";
    clearWrongQuestionForm();
    modal.classList.add("show");
}

function closeWrongQuestionModal() {
    const modal = document.getElementById("wrongQuestionModal");
    if (modal) modal.classList.remove("show");
    pendingStudyNodeId = null;
    refresh();
    showMessage("本次学习已记录");
}

function showWrongQuestionForm() {
    const choice = document.getElementById("wrongQuestionChoice");
    const form = document.getElementById("wrongQuestionForm");
    if (choice) choice.style.display = "none";
    if (form) form.style.display = "block";
}

function clearWrongQuestionForm() {
    ["wrongContent", "wrongMistake", "wrongAnswer"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function saveWrongQuestion(continueAdding) {
    const content = document.getElementById("wrongContent")?.value.trim();
    const mistake = document.getElementById("wrongMistake")?.value.trim();
    const answer = document.getElementById("wrongAnswer")?.value.trim();

    if (!content) {
        showMessage("请先填写题目或错题内容");
        return;
    }

    const node = pendingStudyNodeId ? getNode(pendingStudyNodeId) : null;
    wrongQuestions.unshift({
        id: Date.now() + Math.random(),
        date: todayString(),
        nodeId: pendingStudyNodeId || "",
        subject: node?.subject || "未分类",
        knowledgeName: node?.name || "未指定知识点",
        content,
        mistake,
        answer
    });
    saveData();
    renderWrongQuestions();
    clearWrongQuestionForm();
    showMessage("错题已加入错题本");

    if (!continueAdding) {
        closeWrongQuestionModal();
        return;
    }

    const form = document.getElementById("wrongQuestionForm");
    if (form) form.style.display = "block";
}

function deleteWrongQuestion(id) {
    if (!confirm("确定要删除这道错题吗？")) return;
    wrongQuestions = wrongQuestions.filter(x => String(x.id) !== String(id));
    saveData();
    renderWrongQuestions();
    showMessage("错题已删除");
}

function renderWrongQuestions() {
    const el = document.getElementById("wrongList");
    const count = document.getElementById("wrongCountTip");
    if (count) count.textContent = `${wrongQuestions.length} 道错题`;
    if (!el) return;

    if (!wrongQuestions.length) {
        el.innerHTML = '<div class="empty">还没有错题。完成学习后，如果有错题可以直接记录到这里。</div>';
        return;
    }

    el.innerHTML = wrongQuestions.map(q => `
        <div class="wrong-item">
            <div class="wrong-item-head">
                <div>
                    <div class="item-title">${escapeHtml(q.knowledgeName)}</div>
                    <div class="item-sub">${escapeHtml(q.subject)} · ${escapeHtml(q.date)}</div>
                </div>
                <button class="delete-btn" onclick="deleteWrongQuestion('${String(q.id)}')">删除</button>
            </div>
            <div class="wrong-content"><strong>题目：</strong>${escapeHtml(q.content)}</div>
            ${q.mistake ? `<div class="wrong-content"><strong>我的错误：</strong>${escapeHtml(q.mistake)}</div>` : ""}
            ${q.answer ? `<div class="wrong-content"><strong>正确答案 / 解析：</strong>${escapeHtml(q.answer)}</div>` : ""}
        </div>
    `).join("");
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
    const studyActive = document.getElementById("study")?.classList.contains("active");
    if (!studyActive) return;

    if (document.hidden) {
        leftBrowserPage = true;

        if (timerRunning) {
            leftWhileRunning = true;
            if (studyMode === "paper") {
                timerPageActive = false;
                resetTimer(true);
            }
            // 上网学习不重置，timerEndAt 会让倒计时在后台继续计算。
        }
        return;
    }

    if (leftBrowserPage) {
        leftBrowserPage = false;

        if (studyMode === "online" && leftWhileRunning) {
            showMessage("欢迎回来！上网学习倒计时没有重置，可以继续学习。");
        } else if (studyMode === "paper" && leftWhileRunning) {
            showMessage("欢迎回来！纸质学习倒计时已重置，请重新开始。");
        }

        leftWhileRunning = false;
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
    updateStudyModeUI();
    initFirstUseIntro();
    setTimeout(() => { drawFunctionGraph(); }, 0);
    window.addEventListener("resize", () => { renderRecent(); drawFunctionGraph(); });
});

/* =========================
   本地学习工具：几何画板 + 科学计算器
   不依赖任何外部网站
   ========================= */
function toggleLocalTool(id, button) {
    const panel = document.getElementById(id);
    if (!panel) return;
    const opening = panel.style.display === "none" || !panel.style.display;
    panel.style.display = opening ? "block" : "none";
    if (button) button.textContent = opening ? "收起工具" : (id === "geometryPanel" ? "打开几何画板" : "打开计算器");
    if (opening && id === "geometryPanel") setTimeout(initGeometryBoard, 0);
}

let geometryState = { tool: "select", points: [], objects: [], initialized: false };
let geometryDrag = null;

function geometryCanvasSize() {
    const canvas = document.getElementById("geometryCanvas");
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(420, Math.floor(rect.width || 650));
    const h = Math.max(300, Math.floor(rect.height || 420));
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w*dpr || canvas.height !== h*dpr) {
        canvas.width = w*dpr; canvas.height = h*dpr;
    }
    return {canvas,w,h,dpr};
}

function geoToCanvas(e) {
    const canvas = document.getElementById("geometryCanvas");
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX-r.left, y: e.clientY-r.top };
}

function drawGeometryBoard() {
    const size = geometryCanvasSize();
    if (!size) return;
    const {canvas,w,h,dpr}=size;
    const ctx=canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h);
    const grid=25;
    ctx.strokeStyle="#edf0f4"; ctx.lineWidth=1;
    for(let x=0;x<=w;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<=h;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    const ox=w/2, oy=h/2;
    ctx.strokeStyle="#aab2bf"; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(w,oy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,h);ctx.stroke();
    ctx.fillStyle="#687385";ctx.font="12px Arial, Microsoft YaHei,sans-serif";
    ctx.fillText("x",w-16,oy-7);ctx.fillText("y",ox+7,15);ctx.fillText("0",ox+6,oy+14);

    geometryState.objects.forEach(o=>{
        ctx.strokeStyle="#4f7cff";ctx.fillStyle="#4f7cff";ctx.lineWidth=2;
        if(o.type==="point"){ctx.beginPath();ctx.arc(o.a.x,o.a.y,5,0,Math.PI*2);ctx.fill();}
        if(o.type==="segment"||o.type==="line"){
            let dx=o.b.x-o.a.x,dy=o.b.y-o.a.y;
            let a=o.a,b=o.b;
            if(o.type==="line"){
                const len=Math.hypot(dx,dy)||1, ux=dx/len,uy=dy/len;
                a={x:o.a.x-ux*1500,y:o.a.y-uy*1500};b={x:o.a.x+ux*1500,y:o.a.y+uy*1500};
            }
            ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
        if(o.type==="circle"){ctx.beginPath();ctx.arc(o.a.x,o.a.y,o.r,0,Math.PI*2);ctx.stroke();}
        if(o.type==="triangle"){ctx.beginPath();ctx.moveTo(o.a.x,o.a.y);ctx.lineTo(o.b.x,o.b.y);ctx.lineTo(o.c.x,o.c.y);ctx.closePath();ctx.stroke();}
    });
    geometryState.points.forEach((p,i)=>{
        ctx.fillStyle="#202938";ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();
        ctx.font="bold 12px Arial, Microsoft YaHei,sans-serif";ctx.fillText(String.fromCharCode(65+i),p.x+7,p.y-7);
    });
}

function initGeometryBoard(){
    const canvas=document.getElementById("geometryCanvas");
    if(!canvas) return;
    if(!geometryState.initialized){
        geometryState.initialized=true;
        document.querySelectorAll("[data-geo-tool]").forEach(btn=>btn.addEventListener("click",()=>{
            geometryState.tool=btn.dataset.geoTool; geometryState.points=[];
            document.querySelectorAll("[data-geo-tool]").forEach(b=>b.classList.toggle("active",b===btn));
            drawGeometryBoard();
        }));
        canvas.addEventListener("click",geometryClick);
    }
    drawGeometryBoard();
}

function geometryClick(e){
    const p=geoToCanvas(e), tool=geometryState.tool;
    if(tool==="select") return;
    geometryState.points.push(p);
    const need={point:1,segment:2,line:2,circle:2,triangle:3}[tool];
    if(geometryState.points.length<need){drawGeometryBoard();return;}
    const a=geometryState.points[0], b=geometryState.points[1], c=geometryState.points[2];
    if(tool==="point") geometryState.objects.push({type:"point",a});
    if(tool==="segment") geometryState.objects.push({type:"segment",a,b});
    if(tool==="line") geometryState.objects.push({type:"line",a,b});
    if(tool==="circle") geometryState.objects.push({type:"circle",a,r:Math.max(3,Math.hypot(b.x-a.x,b.y-a.y))});
    if(tool==="triangle") geometryState.objects.push({type:"triangle",a,b,c});
    geometryState.points=[];drawGeometryBoard();
}

function clearGeometryBoard(){ geometryState.points=[];geometryState.objects=[];drawGeometryBoard(); }

function calculatorInsert(v){
    const d=document.getElementById("calculatorDisplay"); if(!d)return;
    d.value += v; d.focus();
}
function calculateExpression(expr){
    let s=String(expr||"").replace(/×/g,"*").replace(/÷/g,"/").replace(/π/g,"Math.PI").replace(/\be\b/g,"Math.E").replace(/\^/g,"**");
    s=s.replace(/sin\(/gi,"__SIN__(").replace(/cos\(/gi,"__COS__(").replace(/tan\(/gi,"__TAN__(").replace(/sqrt\(/gi,"Math.sqrt(").replace(/log\(/gi,"Math.log10(").replace(/ln\(/gi,"Math.log(");
    if(!/^[0-9+\-*/().,%\sA-Za-z_*]+$/.test(s)) throw new Error("非法字符");
    s=s.replace(/__SIN__\(/g,"sin(").replace(/__COS__\(/g,"cos(").replace(/__TAN__\(/g,"tan(");
    const deg=v=>Math.PI/180*v;
    const rad=v=>v*180/Math.PI;
    const fn=new Function("sin","cos","tan","rad",`return (${s});`);
    const result=fn(x=>Math.sin(deg(x)),x=>Math.cos(deg(x)),x=>Math.tan(deg(x)),rad);
    if(!Number.isFinite(result)) throw new Error("结果无效");
    return result;
}

function initCalculator(){
    const display=document.getElementById("calculatorDisplay"); if(!display||display.dataset.init)return;
    display.dataset.init="true";
    document.querySelectorAll("[data-calc]").forEach(btn=>btn.addEventListener("click",()=>{
        const type=btn.dataset.calc,v=btn.textContent;
        if(type==="clear"){display.value="";return;}
        if(type==="back"){display.value=display.value.slice(0,-1);return;}
        if(type==="equals"){
            try{display.value=String(calculateExpression(display.value));document.getElementById("calculatorStatus").textContent="计算完成 · 角度模式：DEG";}
            catch(e){document.getElementById("calculatorStatus").textContent="表达式无法计算，请检查输入";}
            return;
        }
        calculatorInsert(v);
    }));
    display.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();document.querySelector('[data-calc="equals"]').click();}});
}

document.addEventListener("DOMContentLoaded",()=>{initCalculator();});
window.addEventListener("resize",()=>{if(geometryState.initialized)drawGeometryBoard();});
