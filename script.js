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
    // 重置学习倒计时后解除侧边栏锁定
    unlockSidebarAfterStudy();
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
    // 开始学习后强制收起侧边栏
    lockSidebarForStudy();
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
    // 学习完成后恢复侧边栏
    unlockSidebarAfterStudy();
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

// =========================
// 侧边栏系统
// 1. 收起 / 展开
// 2. 刷新后记住状态
// 3. 开始学习时强制收起
// 4. 学习过程中禁止展开
// =========================

function applySidebarState() {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    if (!sidebar || !sidebarToggle) return;

    const collapsed = localStorage.getItem("sidebarCollapsed") === "true";

    if (collapsed) {
        sidebar.classList.add("collapsed");
        sidebarToggle.title = "展开侧边栏";
    } else {
        sidebar.classList.remove("collapsed");
        sidebarToggle.title = "收起侧边栏";
    }
}

function lockSidebarForStudy() {
    document.body.classList.add("study-lock-sidebar");
}

function unlockSidebarAfterStudy() {
    document.body.classList.remove("study-lock-sidebar");
    applySidebarState();
}

document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    if (!sidebar || !sidebarToggle) return;

    applySidebarState();

    sidebarToggle.addEventListener("click", function () {
        if (document.body.classList.contains("study-lock-sidebar")) return;

        sidebar.classList.toggle("collapsed");

        const collapsed = sidebar.classList.contains("collapsed");
        localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false");

        sidebarToggle.title = collapsed ? "展开侧边栏" : "收起侧边栏";
    });
});

