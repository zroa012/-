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
    functionZoomCenterX = 0;
    functionZoomCenterY = 0;
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    // 先显示弹窗，再读取画布尺寸，避免弹窗 display:none 时尺寸为 0。
    requestAnimationFrame(() => renderFunctionZoom());
}

function closeFunctionZoom(event) {
    if (event && event.target && event.target.id !== "functionZoomModal") return;
    const modal = document.getElementById("functionZoomModal");
    if (modal) modal.classList.remove("show");
    document.body.style.overflow = "";
}

let functionZoomScale = 1;
let functionZoomCenterX = 0;
let functionZoomCenterY = 0;
let functionZoomDragging = false;
let functionZoomDragLastX = 0;
let functionZoomDragLastY = 0;

function zoomFunctionGraph(factor) {
    functionZoomScale = Math.max(0.45, Math.min(4, functionZoomScale * factor));
    renderFunctionZoom();
}

function resetFunctionZoom() {
    functionZoomScale = 1;
    functionZoomCenterX = 0;
    functionZoomCenterY = 0;
    renderFunctionZoom();
}

function getFunctionCompiled(expr) {
    try {
        const normalized = String(expr || "")
            .trim()
            .replace(/×/g, "*")
            .replace(/π/g, "Math.PI");
        const safe = normalized
            .replace(/\^/g, "**")
            .replace(/\bsin\b/gi, "Math.sin")
            .replace(/\bcos\b/gi, "Math.cos")
            .replace(/\btan\b/gi, "Math.tan")
            .replace(/\bsqrt\b/gi, "Math.sqrt")
            .replace(/\babs\b/gi, "Math.abs")
            .replace(/\blog\b/gi, "Math.log10");
        if (!/^[0-9xX+\-*/().,\sA-Za-z*_]+$/.test(safe)) return null;
        return new Function("x", `return (${safe});`);
    } catch (e) {
        return null;
    }
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
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    // 放大查看采用“可拖动画布”而不是简单放大一张已经裁切好的图片。
    // 这样 y=x^2+15 这类超出原 -10~10 范围的函数，也可以拖动看到。
    const padLeft = 52, padRight = 18, padTop = 18, padBottom = 38;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const halfX = 10 / functionZoomScale;
    const halfY = halfX * (plotH / plotW);
    const xmin = functionZoomCenterX - halfX;
    const xmax = functionZoomCenterX + halfX;
    const ymin = functionZoomCenterY - halfY;
    const ymax = functionZoomCenterY + halfY;
    const X = x => padLeft + (x - xmin) / (xmax - xmin) * plotW;
    const Y = y => padTop + plotH - (y - ymin) / (ymax - ymin) * plotH;

    // 网格间距根据当前视野自动选择，保证拖动和放大后刻度仍然清楚。
    const niceStep = span => {
        const raw = span / 10;
        const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
        const n = raw / p;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
    };
    const stepX = niceStep(xmax - xmin);
    const stepY = niceStep(ymax - ymin);

    ctx.font = "11px Arial, Microsoft YaHei, sans-serif";
    ctx.textBaseline = "middle";

    const firstX = Math.ceil(xmin / stepX) * stepX;
    for (let v = firstX; v <= xmax + stepX * 0.001; v += stepX) {
        const px = X(v);
        const axis = Math.abs(v) < stepX * 1e-8;
        ctx.strokeStyle = axis ? "#9aa3b2" : "#e8ebf0";
        ctx.lineWidth = axis ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(px, padTop); ctx.lineTo(px, padTop + plotH); ctx.stroke();
        ctx.fillStyle = "#707988";
        ctx.textAlign = "center";
        ctx.fillText(String(Number(v.toFixed(8))), px, padTop + plotH + 17);
    }

    const firstY = Math.ceil(ymin / stepY) * stepY;
    for (let v = firstY; v <= ymax + stepY * 0.001; v += stepY) {
        const py = Y(v);
        const axis = Math.abs(v) < stepY * 1e-8;
        ctx.strokeStyle = axis ? "#9aa3b2" : "#e8ebf0";
        ctx.lineWidth = axis ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(padLeft, py); ctx.lineTo(padLeft + plotW, py); ctx.stroke();
        ctx.fillStyle = "#707988";
        ctx.textAlign = "right";
        ctx.fillText(String(Number(v.toFixed(8))), padLeft - 8, py);
    }

    // 当坐标轴不在当前视野内时，仍然保留边界提示，避免拖动后“轴消失”时不知道位置。
    ctx.fillStyle = "#4f5968";
    ctx.font = "bold 13px Arial, Microsoft YaHei, sans-serif";
    if (xmin <= 0 && xmax >= 0) {
        const px = X(0);
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("y", Math.min(px + 7, padLeft + plotW - 18), padTop + 3);
    }
    if (ymin <= 0 && ymax >= 0) {
        const py = Y(0);
        ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText("x", padLeft + plotW, Math.max(padTop + 3, py + 8));
    }

    const expr = source.dataset.expression || "";
    const compiled = getFunctionCompiled(expr);
    if (!compiled) return;

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
        const visible = Number.isFinite(y) && y >= ymin - (ymax - ymin) * 0.5 && y <= ymax + (ymax - ymin) * 0.5;
        if (!visible || (previousY !== null && Math.abs(y - previousY) > (ymax - ymin) * 0.45)) {
            drawing = false;
            previousY = null;
            continue;
        }
        if (!drawing) { ctx.moveTo(px, py); drawing = true; }
        else ctx.lineTo(px, py);
        previousY = y;
    }
    ctx.stroke();
}

function startFunctionZoomDrag(e) {
    const canvas = document.getElementById("functionZoomCanvas");
    if (!canvas) return;
    functionZoomDragging = true;
    functionZoomDragLastX = e.clientX;
    functionZoomDragLastY = e.clientY;
    canvas.classList.add("dragging");
    if (canvas.setPointerCapture && e.pointerId != null) canvas.setPointerCapture(e.pointerId);
}

function moveFunctionZoomDrag(e) {
    if (!functionZoomDragging) return;
    const canvas = document.getElementById("functionZoomCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const plotW = Math.max(1, rect.width - 70);
    const plotH = Math.max(1, rect.height - 56);
    const halfX = 10 / functionZoomScale;
    const halfY = halfX * (plotH / plotW);
    const dx = e.clientX - functionZoomDragLastX;
    const dy = e.clientY - functionZoomDragLastY;
    functionZoomCenterX -= dx * (2 * halfX / plotW);
    functionZoomCenterY += dy * (2 * halfY / plotH);
    functionZoomDragLastX = e.clientX;
    functionZoomDragLastY = e.clientY;
    renderFunctionZoom();
}

function endFunctionZoomDrag() {
    functionZoomDragging = false;
    const canvas = document.getElementById("functionZoomCanvas");
    if (canvas) canvas.classList.remove("dragging");
}

(function initFunctionGraphZoom() {
    document.addEventListener("click", function(e) {
        const canvas = e.target && e.target.closest ? e.target.closest("#functionCanvas") : null;
        if (canvas) openFunctionZoom();
    });
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") closeFunctionZoom();
    });

    document.addEventListener("pointerdown", function(e) {
        const canvas = e.target && e.target.closest ? e.target.closest("#functionZoomCanvas") : null;
        if (canvas) startFunctionZoomDrag(e);
    });
    document.addEventListener("pointermove", function(e) {
        if (functionZoomDragging) moveFunctionZoomDrag(e);
    });
    document.addEventListener("pointerup", endFunctionZoomDrag);
    document.addEventListener("pointercancel", endFunctionZoomDrag);
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
            padding:24px;
            background:#f5f6f8;
            transition:opacity .25s ease;
        }
        #firstUseIntro.hide{
            opacity:0;
            pointer-events:none;
        }
        .first-use-card{
            width:min(820px,100%);
            max-height:90vh;
            overflow:auto;
            box-sizing:border-box;
            background:#fff;
            border:1px solid #dfe3e8;
            border-radius:8px;
            padding:36px 40px 32px;
            box-shadow:0 8px 28px rgba(0,0,0,.07);
        }
        .first-use-kicker{
            color:#4f7cff;
            font-size:13px;
            margin-bottom:8px;
        }
        .first-use-card h1{
            margin:0;
            color:#202938;
            font-size:30px;
            line-height:1.3;
        }
        .first-use-subtitle{
            margin:10px 0 0;
            color:#697386;
            line-height:1.8;
            font-size:14px;
        }
        .first-use-section-title{
            margin:26px 0 12px;
            font-size:16px;
            color:#202938;
        }
        .first-use-features{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
        }
        .first-use-feature{
            padding:16px 18px;
            border:1px solid #e1e5ea;
            border-radius:6px;
            background:#fff;
        }
        .first-use-feature strong{
            display:block;
            margin-bottom:6px;
            color:#202938;
            font-size:15px;
        }
        .first-use-feature span{
            display:block;
            color:#788293;
            font-size:12px;
            line-height:1.7;
        }
        .first-use-flow{
            margin-top:18px;
            padding:16px 18px;
            border:1px solid #e1e5ea;
            border-radius:6px;
            background:#fafbfc;
        }
        .flow-title{
            margin-bottom:12px;
            color:#202938;
            font-weight:600;
            font-size:14px;
        }
        .flow-list{
            display:grid;
            grid-template-columns:repeat(4,1fr);
            gap:8px;
        }
        .flow-step{
            min-height:68px;
            padding:12px;
            box-sizing:border-box;
            background:#fff;
            border:1px solid #e1e5ea;
            border-radius:5px;
        }
        .flow-step b{
            display:block;
            color:#4f7cff;
            font-size:12px;
            margin-bottom:6px;
        }
        .flow-step span{
            color:#4b5565;
            font-size:13px;
            line-height:1.5;
        }
        .first-use-tools{
            margin-top:12px;
            color:#788293;
            font-size:12px;
            line-height:1.8;
        }
        .first-use-footer{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:20px;
            margin-top:26px;
            padding-top:18px;
            border-top:1px solid #eceff2;
        }
        .first-use-note{
            margin:0;
            color:#9aa2ae;
            font-size:12px;
            line-height:1.6;
        }
        #startUsingButton{
            flex:0 0 auto;
            min-width:150px;
            height:42px;
            padding:0 22px;
            border:1px solid #4f7cff;
            border-radius:5px;
            background:#4f7cff;
            color:#fff;
            font-size:14px;
            cursor:pointer;
        }
        #startUsingButton:hover{
            background:#416ee8;
            border-color:#416ee8;
        }
        @media(max-width:650px){
            .first-use-card{padding:28px 20px 24px;}
            .first-use-features{grid-template-columns:1fr;}
            .flow-list{grid-template-columns:1fr 1fr;}
            .first-use-footer{align-items:stretch;flex-direction:column;}
            #startUsingButton{width:100%;}
        }
        @media(max-width:430px){
            .flow-list{grid-template-columns:1fr;}
        }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "firstUseIntro";

    wrap.innerHTML = `
        <div class="first-use-card">
            <div class="first-use-kicker">SMART STUDY</div>
            <h1>欢迎使用智能学习助手</h1>
            <p class="first-use-subtitle">
                这里用于记录你的学习内容、学习时间和复习情况。
                第一次使用时，按照下面的流程完成一次学习即可。
            </p>

            <div class="first-use-section-title">你可以使用这些功能</div>
            <div class="first-use-features">
                <div class="first-use-feature">
                    <strong>知识点管理</strong>
                    <span>在侧边栏添加、查看和删除知识点，建立自己的学习内容。</span>
                </div>
                <div class="first-use-feature">
                    <strong>开始学习</strong>
                    <span>选择知识点并开始计时，记录实际投入的学习时间。</span>
                </div>
                <div class="first-use-feature">
                    <strong>复习与学习状况</strong>
                    <span>首页查看今日复习、学习统计和近期学习趋势。</span>
                </div>
                <div class="first-use-feature">
                    <strong>错题与薄弱知识点</strong>
                    <span>记录错题，查看需要重点巩固的知识点，方便后续复习。</span>
                </div>
            </div>

            <div class="first-use-section-title">推荐使用流程</div>
            <div class="first-use-flow">
                <div class="flow-title">完成一次学习</div>
                <div class="flow-list">
                    <div class="flow-step">
                        <b>01</b>
                        <span>添加知识点</span>
                    </div>
                    <div class="flow-step">
                        <b>02</b>
                        <span>进入开始学习并选择知识点</span>
                    </div>
                    <div class="flow-step">
                        <b>03</b>
                        <span>学习结束后完成评价</span>
                    </div>
                    <div class="flow-step">
                        <b>04</b>
                        <span>回到首页查看复习安排和学习情况</span>
                    </div>
                </div>
                <div class="first-use-tools">
                    更多学习工具中还提供函数图像、几何画板、科学计算器和在线实验室。
                </div>
            </div>

            <div class="first-use-footer">
                <p class="first-use-note">
                    本介绍页只会在第一次使用时显示。之后可以直接进入首页。
                </p>
                <button id="startUsingButton">开始使用</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);

    const btn = document.getElementById("startUsingButton");
    if (btn) {
        btn.onclick = () => {
            localStorage.setItem("hasSeenIntro", "true");
            wrap.classList.add("hide");
            setTimeout(() => wrap.remove(), 250);
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
    initCalculator();
    initNewFeatures();
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
    if (button) {
        const labels = {
            geometryPanel: ["打开几何画板", "收起几何画板"],
            calculatorPanel: ["打开计算器", "收起计算器"],
        };
        const pair = labels[id] || ["打开工具", "收起工具"];
        button.textContent = opening ? pair[1] : pair[0];
    }
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

window.addEventListener("resize",()=>{if(geometryState.initialized)drawGeometryBoard();});

/* =========================================================
   学习助手增强功能
   - 智能复习排序
   - 知识点详情
   - 每日学习目标
   - 学习日历与个人成长
   - 错因分析
   - 本地代码练习区
   - 每日随机励志语句
   ========================================================= */

const DAILY_QUOTES = [
    "最初的鸟儿是不会飞翔的，飞翔是他们勇敢跃入峡谷的奖励，重要的不是强风，而是勇气，是它让你们成为世上最初的飞鸟。",
    "心有所向，日复一日，必有精进。",
    "觉得自己是正确的，就要大声地说出来，坚决地去行动，这是我一直以来都贯彻的人生理念。",
    "不知道如何向前的话，总之先迈出第一步，后面的道路就会自然而然地展开了。",
    "人们总是喜欢相信自己愿意相信的事。所以有些事，可能只是你不愿看到而已。",
    "只要你不失去崇高，整个世界都会为你敞开。",
    "命运总是喜欢开玩笑，但你不能就此屈服。",
    "无论身在何方，都不要忘记自己的初心。",
    "即使是最微小的光点，也有划破黑暗的力量。",
    "与其做一颗无依无靠的流星，不如燃烧自己，照亮一方天地。",
    "与其做一颗无依无靠的流星，不如燃烧自己，照亮一方天地。",
    "过去不会被撼动，但你可以继续走。",
    "洞悉真谛的智者不受罪恶沾染，如沐濯雨露却依然清净的月莲。",
    "不论前路是星辰还是深渊，能向前迈出下一步都是值得庆贺的事。",
    "驻足过去的人，不会有未来。",
    "不是所有折翼坠落的鹰都能腾空，但不冒险就永远碰不到天空。",
    "只有无坚不摧的意志，才能发挥力量。",
    "被束缚的鸟永远飞不上天。",
    "只要坚信自己的道路，就无所谓天气是晴是雨。",
    "用自己的双脚丈量土地，将未知变为知识"
]



const CODE_TEMPLATES = {
    blank: "",
    search: `#include<bits/stdc++.h>
using namespace std;
int a[10000005];
int main()
{
\tint n,m,q;
\t//lower_bound upper_bound
\tcin>>n>>m;
\tfor(int i=1;i<=n;i++)
\t{
\t\tcin>>a[i];
\t}
\twhile(m--)
\t{
\t\tcin>>q;
\t\tint ans=-1,l=1,r=n;
\t\twhile(l<=r)
\t\t{
\t\t\tint mid=(l+r)/2;
\t\t\tif(q<=a[mid])
\t\t\t{
\t\t\t\tif(q==a[mid]) ans=mid;
\t\t\t\tr=mid-1;
\t\t\t}
\t\t\telse l=mid+1;\t
\t\t}
\t\tcout<<ans<<" ";
\t}
}` ,
    dp: `#include<bits/stdc++.h>
using namespace std;
int w[105],val[105];
int dp[1005];
int main()
{
    int t,m;
    cin>>t>>m;
    for(int i=1;i<=m;i++) cin>>w[i]>>val[i];
    for(int i=1;i<=m;i++)
    {
        for(int j=t;j>=w[i];j--)
        {
            dp[j]=max(dp[j],dp[j-w[i]]+val[i]);
        }
    }
    cout<<dp[t];
}`
};

function getWrongCauseLabel(cause) {
    return ({
        concept:"概念不会",
        understand:"审题错误",
        method:"思路错误",
        code:"代码错误",
        calculation:"计算错误",
        careless:"粗心"
    })[cause] || "未分类";
}

function getWrongCountForNode(nodeId) {
    return wrongQuestions.filter(q => String(q.nodeId) === String(nodeId)).length;
}

function getReviewPriority(node) {
    const today = todayString();
    const due = !node.nextReview || node.nextReview <= today;
    const proficiency = Number(node.proficiency || 0);
    const wrong = getWrongCountForNode(node.id);
    let daysLate = 0;
    if (node.nextReview) {
        const a = new Date(node.nextReview + "T00:00:00");
        const b = new Date(today + "T00:00:00");
        daysLate = Math.max(0, Math.round((b - a) / 86400000));
    }
    return (due ? 100 : 0) + Math.max(0, 70 - proficiency) + Math.min(25, wrong * 5) + Math.min(20, daysLate * 3);
}

function smartReviewNodes(limit = 8) {
    return knowledge.slice().sort((a,b) => getReviewPriority(b) - getReviewPriority(a)).slice(0, limit);
}

function renderSmartHomePlan() {
    const el = document.getElementById("homePlan");
    if (!el) return;
    if (!knowledge.length) {
        el.innerHTML = '<div class="empty">还没有知识点。先添加一个知识点，再开始学习。</div>';
        return;
    }
    const list = smartReviewNodes(5);
    el.innerHTML = list.map(n => {
        const priority = getReviewPriority(n);
        const reason = n.nextReview <= todayString() ? "已经到复习时间" : (n.proficiency < 60 ? "熟练度偏低" : "建议巩固");
        return `<div class="home-review-item">\n            <div>\n                <div class="item-title">${escapeHtml(n.name)}</div>\n                <div class="item-sub">${escapeHtml(n.subject)} · ${reason} · 熟练度 ${n.proficiency}%</div>\n            </div>\n            <button class="review-button" onclick="reviewNode('${String(n.id)}')">去学习</button>\n        </div>`;
    }).join("");
}

function renderKnowledgeEnhanced() {
    const el = document.getElementById("knowledgeList");
    if (!el) return;
    if (!knowledge.length) {
        el.innerHTML = '<div class="empty">还没有知识点，点击“添加知识点”开始吧。</div>';
        return;
    }
    el.innerHTML = knowledge.map(n => `
        <div class="knowledge-item knowledge-clickable" onclick="openKnowledgeDetail('${String(n.id)}')">
            <div>
                <div class="item-title">${escapeHtml(n.name)}</div>
                <div class="item-sub">${escapeHtml(n.subject)} · 学习 ${n.records} 次 · ${n.lastStudy ? `最近学习 ${n.lastStudy}` : "尚未学习"}</div>
            </div>
            <div class="item-right">
                <span class="progress"><div style="width:${n.proficiency}%"></div></span>
                <strong>${n.proficiency}%</strong>
            </div>
        </div>
    `).join("");
}

function openKnowledgeDetail(id) {
    const node = getNode(id);
    const modal = document.getElementById("knowledgeDetailModal");
    const title = document.getElementById("knowledgeDetailTitle");
    const content = document.getElementById("knowledgeDetailContent");
    if (!node || !modal || !content) return;
    if (title) title.textContent = node.name;
    const relatedWrong = wrongQuestions.filter(q => String(q.nodeId) === String(node.id));
    const records = studyRecords.filter(r => String(r.nodeId) === String(node.id)).slice(-6).reverse();
    const priority = Math.round(getReviewPriority(node));
    content.innerHTML = `
        <div class="detail-meta"><span>${escapeHtml(node.subject)}</span><span>熟练度 ${node.proficiency}%</span><span>学习 ${node.records} 次</span></div>
        <div class="detail-progress"><div style="width:${node.proficiency}%"></div></div>
        <div class="detail-grid">
            <div><strong>累计学习</strong><span>${records.reduce((s,r)=>s+Number(r.minutes||0),0)} 分钟（最近记录）</span></div>
            <div><strong>下一次复习</strong><span>${node.nextReview || "待安排"}</span></div>
            <div><strong>相关错题</strong><span>${relatedWrong.length} 道</span></div>
            <div><strong>复习优先级</strong><span>${priority}</span></div>
        </div>
        <h3 class="detail-section-title">最近学习记录</h3>
        <div class="detail-records">${records.length ? records.map(r=>`<div><span>${escapeHtml(r.date)}</span><span>${r.minutes} 分钟 · 评价 ${r.result}/5</span></div>`).join("") : '<div class="empty">还没有学习记录。</div>'}</div>
        <div class="detail-actions"><button class="primary" onclick="closeKnowledgeDetail();reviewNode('${String(node.id)}')">开始复习</button></div>
    `;
    modal.classList.add("show");
}

function closeKnowledgeDetail() {
    const modal = document.getElementById("knowledgeDetailModal");
    if (modal) modal.classList.remove("show");
}

function getTodayRecords() {
    const today = todayString();
    return studyRecords.filter(r => r.date === today);
}

function getDailyGoals() {
    const key = `dailyGoal_${todayString()}`;
    let goal;
    try { goal = JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { goal = null; }
    if (!goal) {
        goal = { minutes: 60, topics: 3, sessions: 3 };
        localStorage.setItem(key, JSON.stringify(goal));
    }
    return goal;
}

function renderHomeGoals() {
    const el = document.getElementById("homeGoals");
    if (!el) return;
    const goal = getDailyGoals();
    const records = getTodayRecords();
    const minutes = records.reduce((s,r)=>s+Number(r.minutes||0),0);
    const topics = new Set(records.map(r=>String(r.nodeId))).size;
    const sessions = records.length;
    const rows = [
        ["学习时间", minutes, goal.minutes, "分钟"],
        ["学习知识点", topics, goal.topics, "个"],
        ["学习次数", sessions, goal.sessions, "次"]
    ];
    el.innerHTML = rows.map(([name,current,target,unit])=>{
        const percent = Math.min(100, Math.round(current / Math.max(1,target) * 100));
        return `<div class="goal-row"><div class="goal-head"><span>${name}</span><strong>${current} / ${target} ${unit}</strong></div><div class="goal-track"><div style="width:${percent}%"></div></div></div>`;
    }).join("");
    const tip = document.getElementById("goalDateTip");
    if (tip) tip.textContent = `${formatDateChinese()} · 完成度 ${Math.round(rows.reduce((s,r)=>s+Math.min(1,r[1]/Math.max(1,r[2])),0)/rows.length*100)}%`;
}

function renderHomeAdvice() {
    const el = document.getElementById("homeAdvice");
    if (!el) return;
    if (!knowledge.length) {
        el.innerHTML = '<div class="advice-box"><strong>先建立你的知识库</strong><p>添加几个正在学习的知识点，系统才能根据学习情况生成复习建议。</p></div>';
        return;
    }
    const sorted = knowledge.slice().sort((a,b)=>getReviewPriority(b)-getReviewPriority(a));
    const node = sorted[0];
    const wrong = getWrongCountForNode(node.id);
    let reason = node.proficiency < 60 ? `“${node.name}”目前熟练度为 ${node.proficiency}%，建议优先巩固。` : `“${node.name}”已经到了复习时间，建议今天再练习一次。`;
    if (wrong) reason += ` 这个知识点还有 ${wrong} 道相关错题，可以一起回顾。`;
    el.innerHTML = `<div class="advice-box"><strong>今天可以先学习：${escapeHtml(node.name)}</strong><p>${escapeHtml(reason)}</p><button class="primary" onclick="reviewNode('${String(node.id)}')">开始学习</button></div>`;
}

function getDailyQuote() {
    const key = "dailyQuoteRecord";
    let record = null;
    try { record = JSON.parse(localStorage.getItem(key) || "null"); } catch (_) {}
    if (!record || record.date !== todayString()) {
        const index = Math.floor(Math.random() * DAILY_QUOTES.length);
        record = {date:todayString(), index};
        localStorage.setItem(key, JSON.stringify(record));
    }
    return DAILY_QUOTES[record.index] || DAILY_QUOTES[0];
}

function renderDailyQuote() {
    const el = document.getElementById("dailyQuote");
    if (el) el.textContent = `“${getDailyQuote()}”`;
}

function getMonthDays(year, month) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstWeekday = (first.getDay() + 6) % 7;
    const days = [];
    for (let i=0;i<firstWeekday;i++) days.push(null);
    for (let d=1;d<=last.getDate();d++) days.push(new Date(year,month,d));
    return days;
}

function renderStudyCalendar() {
    const el = document.getElementById("studyCalendar");
    if (!el) return;
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const map = {};
    studyRecords.forEach(r=>{ map[r.date]=(map[r.date]||0)+Number(r.minutes||0); });
    const days = getMonthDays(y,m);
    const max = Math.max(1,...Object.values(map).filter((v,i)=>true));
    const cells = days.map(d=>{
        if (!d) return '<div class="calendar-cell blank"></div>';
        const key = `${y}-${String(m+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const minutes = map[key] || 0;
        const level = minutes === 0 ? 0 : minutes < 20 ? 1 : minutes < 40 ? 2 : minutes < 60 ? 3 : 4;
        return `<div class="calendar-cell level-${level}" title="${key}：${minutes} 分钟"><span>${d.getDate()}</span></div>`;
    }).join("");
    el.innerHTML = `<div class="calendar-head"><strong>${y}年${m+1}月</strong><span>学习越多，格子越深</span></div><div class="calendar-week">${["一","二","三","四","五","六","日"].map(x=>`<span>${x}</span>`).join("")}</div><div class="calendar-grid">${cells}</div>`;
}

function getStreak() {
    const dates = new Set(studyRecords.map(r=>r.date));
    let d = new Date(); d.setHours(0,0,0,0);
    let streak = 0;
    while (dates.has(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`)) {
        streak++; d.setDate(d.getDate()-1);
    }
    return streak;
}

function getLast30DaysData() {
    const map = {};
    studyRecords.forEach(r=>{map[r.date]=(map[r.date]||0)+Number(r.minutes||0);});
    const out=[];
    for(let i=29;i>=0;i--){
        const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
        const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        out.push({date:key,minutes:map[key]||0,label:`${d.getMonth()+1}/${d.getDate()}`});
    }
    return out;
}

function drawGrowthChart(canvas,data) {
    if(!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const width=Math.max(320,Math.floor(rect.width||700)),height=240,dpr=window.devicePixelRatio||1;
    canvas.width=width*dpr;canvas.height=height*dpr;
    const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const pad={left:42,right:18,top:20,bottom:32},plotW=width-pad.left-pad.right,plotH=height-pad.top-pad.bottom;
    const max=Math.max(30,Math.ceil(Math.max(...data.map(x=>x.minutes),0)/10)*10);
    ctx.font="11px Arial, Microsoft YaHei, sans-serif";ctx.textAlign="right";ctx.textBaseline="middle";ctx.fillStyle="#8b95a3";ctx.strokeStyle="#e9edf1";
    for(let i=0;i<=3;i++){const y=pad.top+plotH*i/3;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(width-pad.right,y);ctx.stroke();ctx.fillText(String(Math.round(max*(3-i)/3)),pad.left-7,y);}
    const pts=data.map((d,i)=>({x:pad.left+plotW*i/(data.length-1),y:pad.top+plotH*(1-d.minutes/max)}));
    ctx.strokeStyle="#4f7cff";ctx.lineWidth=2.5;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    pts.forEach((p,i)=>{if(i%5===0||i===pts.length-1){ctx.fillStyle="#4f7cff";ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();ctx.fillStyle="#7d8793";ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(data[i].label,p.x,height-pad.bottom+8);}});
}

function renderGrowth() {
    const total = studyRecords.reduce((s,r)=>s+Number(r.minutes||0),0);
    const avg = knowledge.length ? Math.round(knowledge.reduce((s,n)=>s+Number(n.proficiency||0),0)/knowledge.length) : 0;
    const el=document.getElementById("growthSummary");
    if(el) el.innerHTML=`<div><strong>${total}</strong><span>累计分钟</span></div><div><strong>${getStreak()}</strong><span>连续学习天数</span></div><div><strong>${avg}%</strong><span>平均熟练度</span></div><div><strong>${knowledge.length}</strong><span>知识点</span></div>`;
    drawGrowthChart(document.getElementById("growthCanvas"),getLast30DaysData());
}

function renderWrongCauseStats() {
    const el=document.getElementById("wrongCauseStats");
    if(!el) return;
    const counts={concept:0,understand:0,method:0,code:0,calculation:0,careless:0};
    wrongQuestions.forEach(q=>{if(counts[q.cause]!==undefined)counts[q.cause]++;});
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    if(!total){el.innerHTML='<div class="empty">记录一些错题后，这里会自动生成错因分析。</div>';return;}
    el.innerHTML=Object.entries(counts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="cause-row"><span>${getWrongCauseLabel(k)}</span><div class="cause-track"><div style="width:${Math.round(v/total*100)}%"></div></div><strong>${Math.round(v/total*100)}%</strong></div>`).join("");
}

function initCodePractice() {
    const editor=document.getElementById("codeEditor");
    if(!editor||editor.dataset.init)return;
    editor.dataset.init="true";
    const saved=localStorage.getItem("codeDraft");
    if(saved!==null) editor.value=saved;
    let timer=null;
    editor.addEventListener("input",()=>{
        clearTimeout(timer);
        timer=setTimeout(()=>{localStorage.setItem("codeDraft",editor.value);const s=document.getElementById("codeSaveStatus");if(s)s.textContent="已自动保存";},250);
    });
}

function loadCodeTemplate(){
    const select=document.getElementById("codeTemplateSelect"),editor=document.getElementById("codeEditor");
    if(!select||!editor)return;
    if(editor.value.trim() && !confirm("载入模板会替换当前代码，确定继续吗？"))return;
    editor.value=CODE_TEMPLATES[select.value]||"";
    localStorage.setItem("codeDraft",editor.value);
    showMessage("代码模板已载入");
}
async function copyCodeDraft(){
    const editor=document.getElementById("codeEditor");
    if(!editor)return;
    const text=editor.value;
    try{
        if(navigator.clipboard && window.isSecureContext){
            await navigator.clipboard.writeText(text);
            showMessage("代码已复制");
            return;
        }
        editor.focus();
        editor.select();
        const ok=document.execCommand("copy");
        editor.setSelectionRange(editor.value.length,editor.value.length);
        showMessage(ok?"代码已复制":"复制失败，请手动复制");
    }catch(e){
        showMessage("复制失败，请手动复制");
    }
}
function clearCodeDraft(){
    const editor=document.getElementById("codeEditor");if(!editor)return;
    if(!confirm("确定清空当前代码吗？"))return;
    editor.value="";localStorage.removeItem("codeDraft");showMessage("代码已清空");
}

function renderRecentEnhanced(){
    const data=getLast7DaysData();
    const el=document.getElementById("recentList");
    if(el) el.innerHTML=data.slice().reverse().map(x=>`<div class="recent-row"><span>${x.date}</span><strong>${x.minutes} 分钟</strong></div>`).join("");
    const time=data.reduce((s,x)=>s+x.minutes,0),days=data.filter(x=>x.minutes>0).length;
    const setText=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    setText("recentTime",time);setText("recentDays",days);setText("recentAverage",days?Math.round(time/days):0);setText("recentRecords",studyRecords.length);
    drawLineChart(document.getElementById("studyTrendCanvas"),data,{height:300});
    drawLineChart(document.getElementById("homeTrendCanvas"),data,{height:230});
    renderStudyCalendar();renderGrowth();
}

function renderWrongQuestionsEnhanced(){
    const el=document.getElementById("wrongList"),count=document.getElementById("wrongCountTip");
    if(count)count.textContent=`${wrongQuestions.length} 道错题`;
    if(!el)return;
    if(!wrongQuestions.length){el.innerHTML='<div class="empty">还没有错题。完成学习后，如果有错题可以直接记录到这里。</div>';renderWrongCauseStats();return;}
    el.innerHTML=wrongQuestions.map(q=>`<div class="wrong-item"><div class="wrong-item-head"><div><div class="item-title">${escapeHtml(q.knowledgeName)}</div><div class="item-sub">${escapeHtml(q.subject)} · ${escapeHtml(q.date)} · ${getWrongCauseLabel(q.cause)}</div></div><button class="delete-btn" onclick="deleteWrongQuestion('${String(q.id)}')">删除</button></div><div class="wrong-content"><strong>题目：</strong>${escapeHtml(q.content)}</div>${q.mistake?`<div class="wrong-content"><strong>我的错误：</strong>${escapeHtml(q.mistake)}</div>`:""}${q.answer?`<div class="wrong-content"><strong>正确答案 / 解析：</strong>${escapeHtml(q.answer)}</div>`:""}</div>`).join("");
    renderWrongCauseStats();
}

function refreshEnhanced(){
    document.getElementById("homeDate")?.replaceChildren(document.createTextNode(formatDateChinese()));
    const totalMinutes=studyRecords.reduce((s,r)=>s+Number(r.minutes||0),0);
    const avg=knowledge.length?Math.round(knowledge.reduce((s,n)=>s+Number(n.proficiency||0),0)/knowledge.length):0;
    const due=dueNodes();
    const setText=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    setText("homeKnowledge",knowledge.length);setText("homeReview",due.length);setText("homeTime",totalMinutes);setText("homeProficiency",avg);
    renderKnowledgeEnhanced();renderRecentEnhanced();renderWeak();renderDelete();renderSmartHomePlan();renderHomeWeak();renderHomeStats();renderWrongQuestionsEnhanced();renderHomeGoals();renderHomeAdvice();renderDailyQuote();
}

// 用增强版刷新函数覆盖旧版，避免修改原有稳定功能。
function refresh(){ refreshEnhanced(); }

function renderKnowledge(){ renderKnowledgeEnhanced(); }
function renderRecent(){ renderRecentEnhanced(); }
function renderWrongQuestions(){ renderWrongQuestionsEnhanced(); }

// 错题保存逻辑增加错误原因，并兼容旧数据。
const originalSaveWrongQuestion = saveWrongQuestion;
saveWrongQuestion = function(continueAdding){
    const cause=document.getElementById("wrongCause")?.value || "concept";
    const content=document.getElementById("wrongContent")?.value.trim();
    if(!content){showMessage("请先填写题目或错题内容");return;}
    const node=pendingStudyNodeId?getNode(pendingStudyNodeId):null;
    wrongQuestions.unshift({id:Date.now()+Math.random(),date:todayString(),nodeId:pendingStudyNodeId||"",subject:node?.subject||"未分类",knowledgeName:node?.name||"未指定知识点",content,mistake:document.getElementById("wrongMistake")?.value.trim()||"",answer:document.getElementById("wrongAnswer")?.value.trim()||"",cause});
    saveData();renderWrongQuestionsEnhanced();clearWrongQuestionForm();showMessage("错题已加入错题本");
    if(!continueAdding){closeWrongQuestionModal();return;}
};

const originalClearWrongQuestionForm = clearWrongQuestionForm;
clearWrongQuestionForm = function(){
    ["wrongContent","wrongMistake","wrongAnswer"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
    const cause=document.getElementById("wrongCause");if(cause)cause.value="concept";
};

function initNewFeatures(){
    wrongQuestions.forEach(q=>{if(!q.cause)q.cause="concept";});
    saveData();
    initCodePractice();
    renderDailyQuote();
}

// 更新初始化：保留原有初始化顺序，只移除已经不存在的旧科学实验室调用。

/* 智能复习：根据熟练度、错题数和复习到期情况动态调整下一次复习日期。 */
const baseStudyTimeForSmartReview = studyTime;
studyTime = function(){
    const beforeFinished = timerFinished;
    baseStudyTimeForSmartReview();
    if (!beforeFinished || !pendingStudyNodeId) return;
    const node = getNode(pendingStudyNodeId);
    if (!node) return;
    const result = Number(document.querySelector('input[name="studyResult"]:checked')?.value || 3);
    const wrong = getWrongCountForNode(node.id);
    let interval = result <= 1 ? 1 : result === 2 ? 2 : result === 3 ? 4 : result === 4 ? 7 : 12;
    if (node.proficiency < 40) interval = Math.min(interval, 2);
    if (wrong >= 2) interval = Math.min(interval, 3);
    const next = new Date();
    next.setDate(next.getDate() + interval);
    node.nextReview = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;
    saveData();
    refresh();
};
