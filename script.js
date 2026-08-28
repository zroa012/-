let data = JSON.parse(localStorage.getItem("studyData") || "[]");
let records = JSON.parse(localStorage.getItem("studyRecords") || "[]");

/* =========================
   学习倒计时
   ========================= */

let timerInterval = null;
let timerRunning = false;
let timerSeconds = 30 * 60;
let timerInitialSeconds = 30 * 60;
let timerEndTime = null;
let timerFinished = false;


/* =========================
   基础数据函数
   ========================= */

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


/* =========================
   页面切换
   ========================= */

function showPage(page)
{
    /*
     * 只要离开“开始学习”页面，
     * 就立即停止并重置倒计时。
     */
    if(page != "study")
    {
        resetStudyPage();
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


/* =========================
   添加知识点
   ========================= */

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

    if(time>600)
        time=600;

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
    document.getElementById("addTime").value="30";

    closeAdd();

    refresh();

    /*
     * 如果是在“开始学习”页面添加，
     * 自动选中新知识点并设置倒计时。
     */
    let studySelect=document.getElementById("studyId");

    if(studySelect)
    {
        studySelect.value=String(id);

        document.getElementById("studyTime").value=time;

        resetTimer();
    }

    showMessage("知识点添加成功，可以开始学习了！");
}


/* =========================
   学习倒计时
   ========================= */

function updateTimerDisplay()
{
    let total=Math.max(0,Math.floor(timerSeconds));

    let minutes=Math.floor(total/60);
    let seconds=total%60;

    let display=document.getElementById("studyTimer");

    if(display)
    {
        display.innerText=
            String(minutes).padStart(2,"0")+
            ":"+
            String(seconds).padStart(2,"0");
    }
}


function updateTimerStatus(text)
{
    let box=document.getElementById("timerStatus");

    if(box)
        box.innerText=text;
}


function showEvaluation()
{
    let evaluation=document.getElementById("studyEvaluation");

    if(evaluation)
        evaluation.classList.add("show");
}


function hideEvaluation()
{
    let evaluation=document.getElementById("studyEvaluation");

    if(evaluation)
        evaluation.classList.remove("show");
}


function syncTimer()
{
    if(!timerRunning || !timerEndTime)
        return;

    timerSeconds=
        Math.max(
            0,
            Math.ceil(
                (timerEndTime-Date.now())/1000
            )
        );

    updateTimerDisplay();

    if(timerSeconds<=0)
        finishTimer();
}


function startTimer()
{
    if(data.length==0)
    {
        showMessage("请先添加知识点");
        return;
    }

    if(timerRunning)
        return;

    if(timerSeconds<=0)
        resetTimer();

    timerFinished=false;
    timerRunning=true;

    /*
     * 只有真正开始倒计时，
     * 才显示下方评价。
     */
    showEvaluation();

    timerEndTime=
        Date.now()+timerSeconds*1000;

    updateTimerStatus("正在专注学习 · 加油！");

    clearInterval(timerInterval);

    timerInterval=setInterval(function()
    {
        syncTimer();
    },250);

    syncTimer();
}


function pauseTimer()
{
    if(!timerRunning)
        return;

    syncTimer();

    timerRunning=false;

    clearInterval(timerInterval);

    timerInterval=null;
    timerEndTime=null;

    updateTimerStatus("已暂停，可以继续学习");
}


function finishTimer()
{
    timerSeconds=0;
    timerRunning=false;

    clearInterval(timerInterval);

    timerInterval=null;
    timerEndTime=null;

    timerFinished=true;

    updateTimerDisplay();

    updateTimerStatus(
        "学习时间到了！请完成本次学习评价"
    );

    showEvaluation();

    showMessage("学习时间到了！🎉");

    /*
     * 使用浏览器声音 API 播放简单提示音。
     * 如果浏览器禁止声音，不影响网站其他功能。
     */
    try
    {
        let AudioContext=
            window.AudioContext ||
            window.webkitAudioContext;

        if(AudioContext)
        {
            let audioContext=new AudioContext();

            let oscillator=
                audioContext.createOscillator();

            let gain=
                audioContext.createGain();

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.frequency.value=880;
            gain.gain.value=0.08;

            oscillator.start();

            setTimeout(function()
            {
                oscillator.stop();
                audioContext.close();
            },500);
        }
    }
    catch(e)
    {
        console.log("提示音不可用");
    }
}


function resetTimer()
{
    clearInterval(timerInterval);

    timerInterval=null;
    timerRunning=false;
    timerEndTime=null;
    timerFinished=false;

    let input=document.getElementById("studyTime");

    if(!input)
        return;

    let time=parseInt(input.value);

    if(!time || time<1)
        time=1;

    if(time>600)
        time=600;

    input.value=time;

    timerInitialSeconds=time*60;
    timerSeconds=timerInitialSeconds;

    hideEvaluation();

    updateTimerDisplay();
    updateTimerStatus("准备开始学习");
}


function changeStudyTime()
{
    if(timerRunning)
    {
        showMessage("请先暂停倒计时，再修改学习时间");
        return;
    }

    resetTimer();
}


function changeStudyNode()
{
    if(timerRunning)
        pauseTimer();

    let id=parseInt(
        document.getElementById("studyId").value
    );

    let k=data.find(function(x)
    {
        return x.id==id;
    });

    if(!k)
        return;

    document.getElementById("studyTime").value=
        k.time || 30;

    resetTimer();
}


/*
 * 离开“开始学习”页面时使用。
 * 不记录本次学习，只把计时器恢复到初始状态。
 */
function resetStudyPage()
{
    clearInterval(timerInterval);

    timerInterval=null;
    timerRunning=false;
    timerEndTime=null;
    timerFinished=false;

    hideEvaluation();

    let select=document.getElementById("studyId");

    if(!select || data.length==0)
    {
        timerSeconds=0;
        timerInitialSeconds=0;

        updateTimerDisplay();
        updateTimerStatus("请先添加知识点");

        return;
    }

    let id=parseInt(select.value);

    let k=data.find(function(x)
    {
        return x.id==id;
    });

    if(!k)
    {
        k=data[0];
        select.value=String(k.id);
    }

    let time=k.time || 30;

    document.getElementById("studyTime").value=time;

    timerInitialSeconds=time*60;
    timerSeconds=timerInitialSeconds;

    updateTimerDisplay();
    updateTimerStatus("准备开始学习");
}


/*
 * 计算真正完成学习时应该记录的分钟数。
 */
function getActualStudyMinutes()
{
    let studiedSeconds=
        Math.max(
            0,
            timerInitialSeconds-timerSeconds
        );

    /*
     * 倒计时完整结束：
     * 记录完整的计划学习时间。
     */
    if(timerFinished)
    {
        studiedSeconds=timerInitialSeconds;
    }

    /*
     * 如果用户没有启动倒计时，
     * 仍然兼容原来的手动输入方式。
     */
    if(studiedSeconds<=0)
    {
        let input=
            parseInt(
                document.getElementById("studyTime").value
            );

        if(!input || input<1)
            input=1;

        return input;
    }

    return Math.max(
        1,
        Math.ceil(studiedSeconds/60)
    );
}


/* =========================
   完成学习
   ========================= */

function studyTime()
{
    if(data.length==0)
    {
        showMessage("现在还没有知识点");
        return;
    }

    /*
     * 没有开始倒计时就不能提交评价，
     * 防止用户直接跳过学习过程。
     */
    if(
        !timerRunning &&
        !timerFinished &&
        timerSeconds==timerInitialSeconds
    )
    {
        showMessage("请先点击“开始”进行学习");
        return;
    }

    let id=parseInt(
        document.getElementById("studyId").value
    );

    let resultInput=
        document.querySelector(
            'input[name="studyResult"]:checked'
        );

    if(!resultInput)
    {
        showMessage("请选择本次学习完成情况");
        return;
    }

    let result=parseInt(resultInput.value);

    let k=data.find(function(x)
    {
        return x.id==id;
    });

    if(!k)
    {
        showMessage("没有找到这个知识点");
        return;
    }

    if(timerRunning)
        pauseTimer();

    let time=getActualStudyMinutes();

    let proficiency=compute_Proficiency(result);

    compute_talent(k,result);

    update(k,proficiency,time);

    record(
        k.id,
        time,
        result,
        proficiency
    );

    saveData();

    /*
     * 完成后把计时器恢复到这个知识点的初始时间。
     */
    timerFinished=false;
    timerInitialSeconds=
        Math.max(1,k.time || 30)*60;

    timerSeconds=timerInitialSeconds;

    hideEvaluation();

    updateTimerDisplay();
    updateTimerStatus("本次学习已记录，可以开始下一次学习");

    showMessage(
        "本次学习已经记录！实际学习 "+
        time+
        " 分钟"
    );

    setTimeout(function()
    {
        showPage("knowledge");
    },800);
}


/* =========================
   复习
   ========================= */

function reviewNode(id)
{
    let k=data.find(function(x)
    {
        return x.id==id;
    });

    if(!k)
        return;

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

    let time=parseInt(
        prompt(
            "这次学习了多少分钟？",
            k.time
        )
    );

    if(!time || time<1)
        time=1;

    let proficiency=compute_Proficiency(result);

    compute_talent(k,result);

    update(k,proficiency,time);

    record(
        k.id,
        time,
        result,
        proficiency
    );

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


/* =========================
   页面数据显示
   ========================= */

function refresh()
{
    let today=getToday();

    document.getElementById("homeDate").innerText=today;
    document.getElementById("planDate").innerText=today;

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

    document.getElementById("planTime").innerText=total;

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
        select.innerHTML=
            '<option>暂无知识点</option>';

        clearInterval(timerInterval);

        timerInterval=null;
        timerRunning=false;
        timerEndTime=null;

        timerSeconds=0;
        timerInitialSeconds=0;
        timerFinished=false;

        hideEvaluation();

        updateTimerDisplay();
        updateTimerStatus("请先添加知识点");

        return;
    }

    let oldId=select.value;

    select.innerHTML=
        data.map(function(k)
        {
            return `
                <option value="${k.id}">
                    ${k.subject} - ${k.knowledge_point}
                </option>
            `;
        }).join("");

    /*
     * 保留之前选择的知识点。
     */
    if(
        oldId &&
        data.some(function(k)
        {
            return k.id==parseInt(oldId);
        })
    )
    {
        select.value=oldId;
    }
    else
    {
        select.value=String(data[0].id);
    }

    let current=
        data.find(function(k)
        {
            return k.id==parseInt(select.value);
        });

    if(current)
    {
        document.getElementById("studyTime").value=
            current.time || 30;

        /*
         * 正在计时的时候不要刷新倒计时。
         */
        if(!timerRunning)
        {
            timerInitialSeconds=
                (current.time || 30)*60;

            timerSeconds=timerInitialSeconds;

            timerFinished=false;

            updateTimerDisplay();
            updateTimerStatus("准备开始学习");
        }
    }
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

    document.getElementById("recentTime").innerText=total;

    document.getElementById("recentDays").innerText=days;

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


/* 页面第一次打开 */
refresh();
