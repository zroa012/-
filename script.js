(function () {

    function createFirstUseIntro() {

        // 已经使用过，不再显示
        if (localStorage.getItem("hasSeenIntro") === "true") {
            return;
        }

        // 防止重复创建
        if (document.getElementById("firstUseIntro")) {
            return;
        }

        let intro = document.createElement("div");

        intro.id = "firstUseIntro";

        intro.innerHTML = `
            <div class="first-use-card">

                <div class="first-use-icon">
                    🧠
                </div>

                <h1>智能学习助手</h1>

                <p class="first-use-subtitle">
                    让学习、记录与复习形成一个完整的学习闭环
                </p>

                <div class="first-use-features">

                    <div class="first-use-feature">
                        <div class="feature-icon">⏱️</div>
                        <div>
                            <strong>学习计时</strong>
                            <span>设定学习时间，专注完成学习任务</span>
                        </div>
                    </div>

                    <div class="first-use-feature">
                        <div class="feature-icon">📚</div>
                        <div>
                            <strong>知识点管理</strong>
                            <span>添加、查看和管理自己的知识点</span>
                        </div>
                    </div>

                    <div class="first-use-feature">
                        <div class="feature-icon">⭐</div>
                        <div>
                            <strong>学习评价</strong>
                            <span>学习完成后评价自己的掌握程度</span>
                        </div>
                    </div>

                    <div class="first-use-feature">
                        <div class="feature-icon">🧠</div>
                        <div>
                            <strong>记忆能力</strong>
                            <span>根据学习结果动态调整知识点状态</span>
                        </div>
                    </div>

                    <div class="first-use-feature">
                        <div class="feature-icon">🔄</div>
                        <div>
                            <strong>智能复习</strong>
                            <span>根据学习情况安排后续复习计划</span>
                        </div>
                    </div>

                    <div class="first-use-feature">
                        <div class="feature-icon">📊</div>
                        <div>
                            <strong>学习统计</strong>
                            <span>查看学习时间、熟练度和学习记录</span>
                        </div>
                    </div>

                </div>

                <div class="first-use-flow">

                    <div class="flow-title">
                        使用流程
                    </div>

                    <div class="flow-list">

                        <span>选择知识点</span>
                        <b>→</b>

                        <span>开始学习</span>
                        <b>→</b>

                        <span>完成学习</span>
                        <b>→</b>

                        <span>评价掌握程度</span>
                        <b>→</b>

                        <span>安排复习</span>

                    </div>

                </div>

                <p class="first-use-note">
                    本网站是一款学习辅助工具，
                    会根据你的学习记录和掌握程度帮助安排后续学习与复习。
                </p>

                <button
                    id="startUsingButton"
                    type="button">
                    开始使用
                </button>

            </div>
        `;

        document.body.appendChild(intro);

        // 给“开始使用”按钮绑定事件
        document
            .getElementById("startUsingButton")
            .addEventListener("click", function () {

                localStorage.setItem(
                    "hasSeenIntro",
                    "true"
                );

                intro.classList.add("first-use-hide");

                setTimeout(function () {

                    if (intro.parentNode) {
                        intro.parentNode.removeChild(intro);
                    }

                }, 350);

            });
    }


    /* =====================================================
       自动添加样式
       不需要修改 style.css
       ===================================================== */

    function addFirstUseStyle() {

        if (document.getElementById("firstUseStyle")) {
            return;
        }

        let style = document.createElement("style");

        style.id = "firstUseStyle";

        style.textContent = `

            #firstUseIntro {
                position: fixed;
                inset: 0;

                width: 100%;
                height: 100%;

                z-index: 999999;

                display: flex;
                align-items: center;
                justify-content: center;

                padding: 24px;
                box-sizing: border-box;

                background:
                    linear-gradient(
                        135deg,
                        #eef4ff 0%,
                        #f8fbff 50%,
                        #eef8f4 100%
                    );

                opacity: 1;

                transition:
                    opacity 0.35s ease;
            }


            #firstUseIntro.first-use-hide {
                opacity: 0;
                pointer-events: none;
            }


            .first-use-card {
                width: min(760px, 100%);
                max-height: 90vh;

                overflow-y: auto;

                box-sizing: border-box;

                padding: 42px 48px;

                background: #ffffff;

                border-radius: 26px;

                box-shadow:
                    0 25px 70px rgba(0, 0, 0, 0.13);

                text-align: center;
            }


            .first-use-icon {
                width: 72px;
                height: 72px;

                margin: 0 auto 16px;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 20px;

                background: #eef4ff;

                font-size: 38px;
            }


            .first-use-card h1 {
                margin: 0;

                font-size: 34px;
                line-height: 1.3;

                color: #1f2937;
            }


            .first-use-subtitle {
                margin: 10px 0 28px;

                color: #6b7280;

                font-size: 15px;
                line-height: 1.7;
            }


            .first-use-features {
                display: grid;

                grid-template-columns:
                    repeat(2, minmax(0, 1fr));

                gap: 12px;

                margin-bottom: 24px;

                text-align: left;
            }


            .first-use-feature {
                display: flex;

                align-items: center;

                gap: 12px;

                padding: 14px;

                box-sizing: border-box;

                border-radius: 15px;

                background: #f8fafc;

                border: 1px solid #edf1f5;
            }


            .feature-icon {
                width: 40px;
                height: 40px;

                flex-shrink: 0;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 11px;

                background: #ffffff;

                font-size: 21px;
            }


            .first-use-feature strong {
                display: block;

                margin-bottom: 3px;

                color: #1f2937;

                font-size: 14px;
            }


            .first-use-feature span {
                display: block;

                color: #6b7280;

                font-size: 12px;

                line-height: 1.5;
            }


            .first-use-flow {
                margin-bottom: 20px;

                padding: 18px;

                border-radius: 16px;

                background: #f8fafc;
            }


            .flow-title {
                margin-bottom: 12px;

                color: #374151;

                font-size: 14px;

                font-weight: 700;
            }


            .flow-list {
                display: flex;

                align-items: center;
                justify-content: center;

                flex-wrap: wrap;

                gap: 7px;

                color: #4b5563;

                font-size: 12px;
            }


            .flow-list span {
                padding: 7px 9px;

                border-radius: 8px;

                background: #ffffff;
            }


            .flow-list b {
                color: #9ca3af;
            }


            .first-use-note {
                max-width: 600px;

                margin: 0 auto 22px;

                color: #9ca3af;

                font-size: 12px;

                line-height: 1.7;
            }


            #startUsingButton {
                width: 220px;
                height: 50px;

                border: none;

                border-radius: 13px;

                background: #2563eb;

                color: #ffffff;

                font-size: 16px;

                font-weight: 600;

                cursor: pointer;

                transition:
                    transform 0.2s ease,
                    opacity 0.2s ease;
            }


            #startUsingButton:hover {
                transform: translateY(-2px);

                opacity: 0.92;
            }


            #startUsingButton:active {
                transform: translateY(0);
            }


            @media (max-width: 650px) {

                #firstUseIntro {
                    padding: 12px;
                }


                .first-use-card {
                    padding: 30px 20px;

                    border-radius: 22px;
                }


                .first-use-card h1 {
                    font-size: 28px;
                }


                .first-use-features {
                    grid-template-columns: 1fr;
                }


                .flow-list {
                    flex-direction: column;
                }


                .flow-list b {
                    transform: rotate(90deg);
                }

            }

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       页面加载完成
       ===================================================== */

    function initFirstUseIntro() {

        addFirstUseStyle();

        createFirstUseIntro();
    }


    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initFirstUseIntro
        );

    } else {

        initFirstUseIntro();

    }

})();

let data = JSON.parse(localStorage.getItem("studyData") || "[]");
let records = JSON.parse(localStorage.getItem("studyRecords") || "[]");

function getToday()
{
    let date = new Date();

    let y = date.getFullYear();
    let m = String(date.getMonth()+1).padStart(2,"0");
    let d = String(date.getDate()).padStart(2,"0");

    return y+"-"+m+"-"+d;
}

function saveData()
{
    localStorage.setItem("studyData",JSON.stringify(data));
    localStorage.setItem("studyRecords",JSON.stringify(records));
}

function compute_result(talent,day)
{
    if(talent<=0)
        return 0;

    return Math.exp(-day/talent);
}

function compute_talent(k,result)
{
    if(result==5)
        k.talent*=1.5;

    else if(result==4)
        k.talent*=1.3;

    else if(result==3)
        k.talent*=1.0;

    else if(result==2)
        k.talent*=0.7;

    else if(result==1)
        k.talent*=0.5;

    k.talent=Math.max(0.5,Math.min(k.talent,100));
}

function update_talent_by_error(k,predicted,actual)
{
    let error=actual-predicted;

    let factor=1.0+error*0.5;

    if(factor<0.7)
        factor=0.7;

    if(factor>1.3)
        factor=1.3;

    k.talent*=factor;

    k.talent=Math.max(0.5,Math.min(k.talent,100));
}

function compute_Next_review_time(proficiency,time,level)
{
    let s=1.0;

    s*=1.0+proficiency;
    s*=1.0+level*0.5;
    s*=1.0+time/60.0;

    let t=0.8;

    return -s*Math.log(t);
}

function compute_NextDate(date,day)
{
    let t=new Date(date+"T00:00:00");

    t.setDate(t.getDate()+day);

    let y=t.getFullYear();
    let m=String(t.getMonth()+1).padStart(2,"0");
    let d=String(t.getDate()).padStart(2,"0");

    return y+"-"+m+"-"+d;
}

function compute_day(date1,date2)
{
    let t1=new Date(date1+"T00:00:00");
    let t2=new Date(date2+"T00:00:00");

    return Math.round(
        (t2-t1)/(24*60*60*1000)
    );
}

function update(k,Proficiency,time)
{
    k.proficiency=Proficiency;
    k.time=time;

    if(Proficiency>=0.8)
        k.level++;

    else if(Proficiency<0.5)
        k.level=Math.max(0,k.level-1);

    k.Next_review_time=
        Math.floor(
            compute_Next_review_time(
                k.proficiency,
                k.time,
                k.level
            )
        );

    // 与 C++ 完全对应：复习间隔还要乘以 sqrt(talent)
    k.Next_review_time=
        Math.floor(
            k.Next_review_time*Math.sqrt(k.talent)
        );

    if(k.Next_review_time<1)
        k.Next_review_time=1;

    k.Next_review_Date=
        compute_NextDate(
            getToday(),
            k.Next_review_time
        );
}

function compute_Proficiency(result)
{
    if(result==1)
        return 0.1;

    else if(result==2)
        return 0.3;

    else if(result==3)
        return 0.5;

    else if(result==4)
        return 0.75;

    else if(result==5)
        return 0.95;

    return 0;
}

function record(id,time,result,proficiency)
{
    let k={
        date:getToday(),
        id:id,
        time:time,
        result:result,
        proficiency:proficiency
    };

    records.push(k);
}

function getReviewNodes()
{
    let today=getToday();

    return data.filter(function(k)
    {
        return compute_day(today,k.Next_review_Date)<=0;
    });
}

function showPage(page)
{
    // 离开“开始学习”页面时，停止并重置倒计时
    let current=document.querySelector(".page.active");
    if(current && current.id==="study" && page!=="study")
    {
        resetStudyTimer();
    }

    let pages=document.querySelectorAll(".page");

    pages.forEach(function(p)
    {
        p.classList.remove("active");
    });

    document.getElementById(page).classList.add("active");

    refresh();

    window.scrollTo(0,0);
}

function showAdd()
{
    document.getElementById("addModal").classList.add("show");
}

function closeAdd()
{
    document.getElementById("addModal").classList.remove("show");
}

function addNode()
{
    let subject=document.getElementById("addSubject").value.trim();
    let knowledge=document.getElementById("addKnowledge").value.trim();
    let time=parseInt(document.getElementById("addTime").value);

    if(subject=="")
    {
        showMessage("请输入科目");
        return;
    }

    if(knowledge=="")
    {
        showMessage("请输入知识点");
        return;
    }

    if(!time || time<1)
        time=1;

    let id=1;

    if(data.length>0)
    {
        id=Math.max(...data.map(function(k)
        {
            return k.id;
        }))+1;
    }

    let k={
        id:id,
        subject:subject,
        knowledge_point:knowledge,
        proficiency:0,
        time:time,
        level:0,
        Next_review_time:1,
        Next_review_Date:compute_NextDate(getToday(),1),
        talent:10
    };

    data.push(k);

    saveData();

    document.getElementById("addSubject").value="";
    document.getElementById("addKnowledge").value="";

    closeAdd();

    refresh();

    showMessage("知识点添加成功！");
}

/* =========================
   开始学习：计时器 + C++核心算法
   ========================= */

let studyTimer=null;
let timerRunning=false;
let timerEndTime=0;
let timerRemaining=0;
let timerStartedAt=0;
let timerInitialSeconds=0;

function getStudyElements()
{
    return {
        page:document.getElementById("study"),
        timeInput:document.getElementById("studyTime"),
        select:document.getElementById("studyId"),
        resultBox:document.querySelector("#study .result-list")
    };
}

function ensureStudyTimerUI()
{
    let e=getStudyElements();
    if(!e.page || !e.timeInput) return;

    let box=document.getElementById("studyTimerBox");

    if(!box)
    {
        box=document.createElement("div");
        box.id="studyTimerBox";
        box.className="form-box";
        box.style.marginBottom="18px";
        box.innerHTML=`
            <div style="text-align:center">
                <div style="font-size:14px;opacity:.7;margin-bottom:8px">学习倒计时</div>
                <div id="studyTimerDisplay" style="font-size:48px;font-weight:700;letter-spacing:2px">00:00</div>
                <div id="studyTimerStatus" style="margin-top:6px;opacity:.7">尚未开始</div>
                <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap">
                    <button type="button" class="primary" onclick="startStudyTimer()">▶ 开始</button>
                    <button type="button" onclick="pauseStudyTimer()">⏸ 暂停</button>
                    <button type="button" onclick="resetStudyTimer()">↺ 重置</button>
                </div>
            </div>
        `;
        e.page.insertBefore(box,e.page.querySelector(".form-box"));
    }

    if(e.resultBox)
        e.resultBox.style.display=timerRunning ? "" : "none";

    updateStudyTimerDisplay();
}

function getSelectedStudyNode()
{
    let select=document.getElementById("studyId");
    if(!select || data.length===0) return null;

    let id=parseInt(select.value);
    return data.find(function(k){ return k.id===id; }) || data[0];
}

function getStudyMinutesFromInput()
{
    let input=document.getElementById("studyTime");
    let time=parseInt(input ? input.value : 1);

    if(!time || time<1)
        time=1;

    return time;
}

function formatStudyTime(seconds)
{
    seconds=Math.max(0,Math.floor(seconds));
    let m=Math.floor(seconds/60);
    let s=seconds%60;
    return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}

function updateStudyTimerDisplay()
{
    let display=document.getElementById("studyTimerDisplay");
    let status=document.getElementById("studyTimerStatus");

    if(display)
        display.innerText=formatStudyTime(timerRemaining);

    if(status)
    {
        if(timerRunning)
            status.innerText="学习进行中";
        else if(timerRemaining===0 && timerInitialSeconds>0)
            status.innerText="倒计时已结束，请完成评价";
        else if(timerInitialSeconds>0 && timerRemaining<timerInitialSeconds)
            status.innerText="已暂停";
        else
            status.innerText="尚未开始";
    }
}

function hideStudyEvaluation()
{
    let box=document.querySelector("#study .result-list");
    if(box)
        box.style.display="none";
}

function showStudyEvaluation()
{
    let box=document.querySelector("#study .result-list");
    if(box)
        box.style.display="";
}

function resetStudyTimer()
{
    if(studyTimer!==null)
    {
        clearInterval(studyTimer);
        studyTimer=null;
    }

    timerRunning=false;
    timerEndTime=0;
    timerStartedAt=0;
    timerInitialSeconds=getStudyMinutesFromInput()*60;
    timerRemaining=timerInitialSeconds;

    hideStudyEvaluation();
    updateStudyTimerDisplay();
}

function startStudyTimer()
{
    if(data.length===0)
    {
        showMessage("现在还没有知识点");
        return;
    }

    if(timerRunning) return;

    let minutes=getStudyMinutesFromInput();

    if(timerInitialSeconds<=0 || timerRemaining<=0 || timerInitialSeconds!==minutes*60)
    {
        timerInitialSeconds=minutes*60;
        timerRemaining=timerInitialSeconds;
    }

    if(timerRemaining<=0)
        timerRemaining=timerInitialSeconds;

    timerEndTime=Date.now()+timerRemaining*1000;
    timerStartedAt=Date.now();
    timerRunning=true;
    hideStudyEvaluation();
    updateStudyTimerDisplay();

    if(studyTimer!==null)
        clearInterval(studyTimer);

    studyTimer=setInterval(function()
    {
        timerRemaining=Math.max(0,Math.ceil((timerEndTime-Date.now())/1000));
        updateStudyTimerDisplay();

        if(timerRemaining<=0)
        {
            clearInterval(studyTimer);
            studyTimer=null;
            timerRunning=false;
            showStudyEvaluation();
            updateStudyTimerDisplay();
            showMessage("学习时间到了，请完成评价！");
        }
    },250);
}

function pauseStudyTimer()
{
    if(!timerRunning) return;

    timerRemaining=Math.max(0,Math.ceil((timerEndTime-Date.now())/1000));
    clearInterval(studyTimer);
    studyTimer=null;
    timerRunning=false;
    updateStudyTimerDisplay();
}

function getActualStudyMinutes()
{
    if(timerInitialSeconds<=0)
        return getStudyMinutesFromInput();

    let elapsedSeconds=timerInitialSeconds-timerRemaining;

    // 与 C++ 一样，学习时间至少记录 1 分钟。
    // 完整倒计时结束则记录完整计划时间。
    if(timerRemaining<=0)
        return Math.max(1,Math.round(timerInitialSeconds/60));

    return Math.max(1,Math.floor(elapsedSeconds/60));
}

function finishStudyTimer()
{
    if(studyTimer!==null)
    {
        clearInterval(studyTimer);
        studyTimer=null;
    }

    timerRunning=false;
}

function studyTime()
{
    if(data.length===0)
    {
        showMessage("现在还没有知识点");
        return;
    }

    // 必须先开始学习，避免没有实际学习就直接提交评价。
    if(!timerRunning && timerRemaining===timerInitialSeconds)
    {
        showMessage("请先点击“开始”进行学习");
        return;
    }

    let select=document.getElementById("studyId");
    let id=parseInt(select ? select.value : 0);
    let k=data.find(function(x){ return x.id===id; });

    if(!k)
    {
        showMessage("请选择知识点");
        return;
    }

    let checked=document.querySelector('input[name="studyResult"]:checked');
    if(!checked)
    {
        showMessage("请选择学习评价");
        return;
    }

    let result=parseInt(checked.value);
    let time=getActualStudyMinutes();

    /*
     * C++ study_time() 的核心逻辑：
     * retention = compute_result(talent, 0)
     * actual = proficiency
     * error = actual - retention
     * compute_talent()
     * update_talent_by_error()
     * update()
     * record()
     */
    let proficiency=compute_Proficiency(result);
    let retention=compute_result(k.talent,0);
    let actual=proficiency;

    compute_talent(k,result);
    update_talent_by_error(k,retention,actual);
    update(k,proficiency,time);

    record(k.id,time,result,proficiency);
    saveData();
    finishStudyTimer();

    showMessage("本次学习已经记录！");

    setTimeout(function()
    {
        showPage("knowledge");
    },500);
}

function reviewNode(id)
{
    let k=data.find(function(x){ return x.id===id; });

    if(!k) return;

    let result=prompt(
        "你觉得自己掌握得怎么样？\n\n"+
        "1. 完全不会\n"+
        "2. 有一点印象\n"+
        "3. 基本掌握\n"+
        "4. 比较熟练\n"+
        "5. 非常熟练"
    );

    result=parseInt(result);

    if(result<1 || result>5 || isNaN(result))
    {
        showMessage("请输入1~5");
        return;
    }

    let time=parseInt(prompt("这次学习了多少分钟？",k.time));

    if(!time || time<1)
        time=1;

    /* 与 C++ Review() 对应 */
    let day=compute_day(k.Next_review_Date,getToday());
    if(day<0) day=0;

    let retention=compute_result(k.talent,day);
    let proficiency=compute_Proficiency(result);
    let actual=proficiency;

    compute_talent(k,result);
    update_talent_by_error(k,retention,actual);
    update(k,proficiency,time);

    record(k.id,time,result,proficiency);
    saveData();

    showMessage("复习完成！");
    refresh();
}

function deleteNode(id)
{
    if(!confirm("确定要删除这个知识点吗？"))
        return;

    data=data.filter(function(k)
    {
        return k.id!=id;
    });

    saveData();

    refresh();

    showMessage("删除成功！");
}

function showMessage(text)
{
    let box=document.getElementById("message");

    box.innerText=text;
    box.style.display="block";

    setTimeout(function()
    {
        box.style.display="none";
    },2000);
}

function refresh()
{
    let today=getToday();

    document.getElementById("homeDate").innerText=
        today;

    document.getElementById("planDate").innerText=
        today;

    let reviewNodes=getReviewNodes();

    let totalTime=records.reduce(
        function(a,b)
        {
            return a+b.time;
        },
        0
    );

    let average=0;

    if(data.length>0)
    {
        average=
            data.reduce(
                function(a,b)
                {
                    return a+b.proficiency;
                },
                0
            )/data.length;
    }

    document.getElementById("homeKnowledge").innerText=
        data.length;

    document.getElementById("homeReview").innerText=
        reviewNodes.length;

    document.getElementById("homeTime").innerText=
        totalTime;

    document.getElementById("homeProficiency").innerText=
        Math.round(average*100);

    showKnowledge();
    showPlan();
    showStudy();
    showReview();
    showRecent();
    showWeak();
    showCount();
    showDelete();
    showHome();
}

function showHome()
{
    let list=document.getElementById("homePlan");

    let nodes=getReviewNodes();

    if(nodes.length==0)
    {
        list.innerHTML=
            '<div class="empty">今天没有需要复习的内容</div>';
    }

    else
    {
        list.innerHTML=nodes.slice(0,3).map(
            function(k)
            {
                return `
                <div class="plan-item">
                    <div>
                        <div class="item-title">
                            ${k.subject} · ${k.knowledge_point}
                        </div>
                        <div class="item-sub">
                            熟练度 ${Math.round(k.proficiency*100)}%
                        </div>
                    </div>

                    <div class="plan-time">
                        ${k.time} 分钟
                    </div>
                </div>
                `;
            }
        ).join("");
    }

    let weak=data
        .slice()
        .sort(function(a,b)
        {
            return a.proficiency-b.proficiency;
        })
        .slice(0,3);

    let weakBox=document.getElementById("homeWeak");

    if(weak.length==0)
    {
        weakBox.innerHTML=
            '<div class="empty">还没有知识点</div>';
    }

    else
    {
        weakBox.innerHTML=weak.map(
            function(k)
            {
                return `
                <div class="plan-item">
                    <div>
                        <div class="item-title">
                            ${k.subject} · ${k.knowledge_point}
                        </div>
                    </div>

                    <div class="plan-time">
                        ${Math.round(k.proficiency*100)}%
                    </div>
                </div>
                `;
            }
        ).join("");
    }
}

function showKnowledge()
{
    let box=document.getElementById("knowledgeList");

    if(data.length==0)
    {
        box.innerHTML=
            '<div class="empty">现在还没有记录过的知识点</div>';
        return;
    }

    box.innerHTML=data.map(
        function(k)
        {
            return `
            <div class="knowledge-item">

                <div>
                    <div class="item-title">
                        ${k.subject} · ${k.knowledge_point}
                    </div>

                    <div class="item-sub">
                        等级 ${k.level}
                        · 记忆能力 ${k.talent.toFixed(2)}
                        · 下次复习 ${k.Next_review_Date}
                    </div>
                </div>

                <div class="item-right">

                    <div>
                        <span class="progress">
                            <div style="width:${k.proficiency*100}%"></div>
                        </span>

                        <strong>
                            ${Math.round(k.proficiency*100)}%
                        </strong>
                    </div>

                    <div class="item-sub">
                        ${k.time} 分钟
                    </div>

                </div>

            </div>
            `;
        }
    ).join("");
}

function showPlan()
{
    let box=document.getElementById("planList");

    let nodes=getReviewNodes();

    let total=0;

    nodes.forEach(function(k)
    {
        total+=k.time;
    });

    document.getElementById("planTime").innerText=
        total;

    if(nodes.length==0)
    {
        box.innerHTML=
            '<div class="empty">今天没有需要复习的知识点</div>';
        return;
    }

    box.innerHTML=nodes.map(
        function(k)
        {
            return `
            <div class="plan-item">
                <div>
                    <div class="item-title">
                        ${k.subject} · ${k.knowledge_point}
                    </div>

                    <div class="item-sub">
                        熟练度 ${Math.round(k.proficiency*100)}%
                    </div>
                </div>

                <div class="plan-time">
                    ${k.time} 分钟
                </div>
            </div>
            `;
        }
    ).join("");
}

function showStudy()
{
    let select=document.getElementById("studyId");

    if(data.length==0)
    {
        ensureStudyTimerUI();
        select.innerHTML=
            '<option>暂无知识点</option>';
        return;
    }

    select.innerHTML=data.map(
        function(k)
        {
            return `
            <option value="${k.id}">
                ${k.subject} - ${k.knowledge_point}
            </option>
            `;
        }
    ).join("");

    let selected=getSelectedStudyNode();
    if(selected)
    {
        let input=document.getElementById("studyTime");
        if(input)
            input.value=selected.time;
    }

    if(!timerRunning)
        resetStudyTimer();

    ensureStudyTimerUI();
}

function showReview()
{
    let box=document.getElementById("reviewList");

    let nodes=getReviewNodes();

    if(nodes.length==0)
    {
        box.innerHTML=
            '<div class="empty">今天没有需要复习的内容！要学点新知识吗？</div>';
        return;
    }

    box.innerHTML=nodes.map(
        function(k)
        {
            let day=
                compute_day(
                    k.Next_review_Date,
                    getToday()
                );

            if(day<0)
                day=0;

            let retention=
                compute_result(
                    k.talent,
                    day
                );

            return `
            <div class="review-item">

                <div class="item-title">
                    ${k.subject} · ${k.knowledge_point}
                </div>

                <div class="item-sub">
                    当前记忆保持率：
                    ${Math.round(retention*100)}%
                </div>

                <div class="item-sub">
                    熟练度：
                    ${Math.round(k.proficiency*100)}%
                    · 记忆能力：
                    ${k.talent.toFixed(2)}
                </div>

                <button
                    class="review-button"
                    onclick="reviewNode(${k.id})">
                    开始复习
                </button>

            </div>
            `;
        }
    ).join("");
}

function showRecent()
{
    let today=getToday();

    let total=0;
    let days=0;

    let html="";

    for(let i=6;i>=0;i--)
    {
        let date=compute_NextDate(today,-i);

        let dayRecords=records.filter(
            function(k)
            {
                return k.date==date;
            }
        );

        let time=0;

        dayRecords.forEach(function(k)
        {
            time+=k.time;
        });

        if(time>0)
            days++;

        total+=time;

        html+=`
        <div class="recent-row">
            <span>${date}</span>
            <span>${time} 分钟</span>
            <span>${dayRecords.length} 次</span>
        </div>
        `;
    }

    document.getElementById("recentList").innerHTML=html;

    document.getElementById("recentTime").innerText=
        total;

    document.getElementById("recentDays").innerText=
        days;

    document.getElementById("recentAverage").innerText=
        (total/7).toFixed(1);
}

function showWeak()
{
    let box=document.getElementById("weakList");

    if(data.length==0)
    {
        box.innerHTML=
            '<div class="empty">现在还没有知识点</div>';
        return;
    }

    let nodes=data.slice().sort(
        function(a,b)
        {
            return a.proficiency-b.proficiency;
        }
    );

    box.innerHTML=nodes.map(
        function(k)
        {
            return `
            <div class="weak-item">

                <div class="item-title">
                    ${k.subject} · ${k.knowledge_point}
                </div>

                <div class="item-sub">
                    熟练度：
                    ${Math.round(k.proficiency*100)}%
                    · 建议学习 ${k.time} 分钟
                </div>

            </div>
            `;
        }
    ).join("");
}

function showCount()
{
    let total=0;

    data.forEach(function(k)
    {
        total+=k.proficiency;
    });

    let average=
        data.length>0?
        total/data.length*100:
        0;

    let time=0;

    records.forEach(function(k)
    {
        time+=k.time;
    });

    document.getElementById("countKnowledge").innerText=
        data.length;

    document.getElementById("countProficiency").innerText=
        average.toFixed(1);

    document.getElementById("countTime").innerText=
        time;

    document.getElementById("countRecord").innerText=
        records.length;

    let a=0;
    let b=0;
    let c=0;

    data.forEach(function(k)
    {
        if(k.proficiency>=0.8)
            a++;

        else if(k.proficiency>=0.5)
            b++;

        else
            c++;
    });

    document.getElementById("countDetail").innerHTML=`
        <div class="stat-line">
            <span>已经熟练</span>
            <strong>${a}</strong>
        </div>

        <div class="stat-line">
            <span>基本掌握</span>
            <strong>${b}</strong>
        </div>

        <div class="stat-line">
            <span>需要加强</span>
            <strong>${c}</strong>
        </div>
    `;
}

function showDelete()
{
    let box=document.getElementById("deleteList");

    if(data.length==0)
    {
        box.innerHTML=
            '<div class="empty">现在还没有知识点</div>';
        return;
    }

    box.innerHTML=data.map(
        function(k)
        {
            return `
            <div class="delete-item">

                <div>
                    <div class="item-title">
                        ${k.subject} · ${k.knowledge_point}
                    </div>

                    <div class="item-sub">
                        ID：${k.id}
                    </div>
                </div>

                <button
                    class="delete-btn"
                    onclick="deleteNode(${k.id})">
                    删除
                </button>

            </div>
            `;
        }
    ).join("");
}

/* =========================
   学习页面事件：切换知识点/离开标签页自动重置
   ========================= */

document.addEventListener("change",function(e)
{
    if(e.target && e.target.id==="studyId")
    {
        let k=getSelectedStudyNode();
        let input=document.getElementById("studyTime");

        if(k && input)
            input.value=k.time;

        resetStudyTimer();
    }
});

document.addEventListener("input",function(e)
{
    if(e.target && e.target.id==="studyTime" && !timerRunning)
    {
        resetStudyTimer();
    }
});

document.addEventListener("visibilitychange",function()
{
    if(document.visibilityState==="hidden")
    {
        resetStudyTimer();
    }
});

window.addEventListener("pagehide",function()
{
    resetStudyTimer();
});

window.addEventListener("beforeunload",function()
{
    resetStudyTimer();
});

/* 第一次加载 */
refresh();
