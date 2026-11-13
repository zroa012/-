// 智能学习助手 AI 伴学：Cloudflare Pages advanced mode Worker
// 严格要求绑定 D1 数据库 AI_USAGE_DB；未绑定或不可用时拒绝付费请求。
const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: HEADERS });
const LIMIT_MICRO = 1_000_000; // ¥1, stored as millionths of RMB
const MODEL = 'deepseek-flash';
const OUTPUT_MAX = 4096; // 足够容纳较长讲解；按此上限预留每日预算
const SYSTEM = '你是耐心、严谨的中文AI伴学老师。优先启发式教学，先讲思路再给答案，清楚分步骤。数学和代码要认真检查推理。对不确定的事实诚实说明，不编造引用。针对学生提问给出适度详细、易理解的解释。';
// 最高费率 (RMB per 1M tokens): input uncached ¥2; output ¥8.
// 账本记录保守费用上界；实际 DeepSeek 账单可能更低（缓存命中、非高峰）。
const priceInput = 2, priceOutput = 8;
const todayCST = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const money = micro => Number((Math.max(0, micro) / 1_000_000).toFixed(6));
const usageInfo = (row, day) => ({
  date: day, serverTime: new Date().toISOString(), timeZone: 'Asia/Shanghai', limit: 1, estimatedSpent: money(row?.spent_micro || 0),
  remaining: money(LIMIT_MICRO - (row?.spent_micro || 0)),
  requests: row?.requests || 0, inputTokens: row?.input_tokens || 0,
  outputTokens: row?.output_tokens || 0,
  note: '按 DeepSeek Flash 高峰期未缓存输入及输出费率估算，为保守上界；以官方账单为准。',
});

async function database(env) {
  if (!env.AI_USAGE_DB) throw new Error('数据库未绑定：请在 Cloudflare Pages 为生产环境绑定 D1 AI_USAGE_DB');
  await env.AI_USAGE_DB.prepare(`CREATE TABLE IF NOT EXISTS ai_daily_usage (
    day TEXT PRIMARY KEY,
    spent_micro INTEGER NOT NULL DEFAULT 0,
    requests INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0
  )`).run();
  return env.AI_USAGE_DB;
}
async function getUsage(db, day) {
  const row = await db.prepare('SELECT spent_micro,requests,input_tokens,output_tokens FROM ai_daily_usage WHERE day=?').bind(day).first();
  return usageInfo(row, day);
}
function parseMessages(data) {
  if (!data || !Array.isArray(data.messages) || data.messages.length < 1 || data.messages.length > 13) return null;
  let length = SYSTEM.length;
  const list = [];
  for (const m of data.messages) {
    if (!m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 6000) return null;
    length += m.content.length;
    list.push({role:m.role, content:m.content});
  }
  if (list.at(-1)?.role !== 'user' || length > 16000) return null;
  return {list, length};
}
// 使用高于通常 token 化比例的预估作为请求额度预留；限幅防止大型请求。
function reserveMicro(chars) {
  const worstInput = 4 * chars + 2048;
  return Math.ceil(worstInput * priceInput + OUTPUT_MAX * priceOutput);
}
async function reserveBudget(db, day, amount) {
  await db.prepare('INSERT OR IGNORE INTO ai_daily_usage(day) VALUES (?)').bind(day).run();
  const result = await db.prepare('UPDATE ai_daily_usage SET spent_micro=spent_micro+? WHERE day=? AND spent_micro+?<=?')
    .bind(amount, day, amount, LIMIT_MICRO).run();
  return Number(result?.meta?.changes || 0) === 1;
}
async function settleBudget(db, day, reserved, actual, input, output, success) {
  // 在单条原子 SQL 中释放预留金额并写入统计，避免并发请求相互覆盖。
  await db.prepare(`UPDATE ai_daily_usage
    SET spent_micro=MAX(0,spent_micro-?+?),
        requests=requests+?, input_tokens=input_tokens+?, output_tokens=output_tokens+?
    WHERE day=?`).bind(reserved, actual, success?1:0, input, output, day).run();
}
async function handleUsage(env) {
  try {
    const db=await database(env);
    return json({usage: await getUsage(db,todayCST())});
  } catch(e) {
    console.error('AI budget DB error', e);
    return json({error:'AI 额度数据库尚未配置或暂不可用，请检查 D1 绑定 AI_USAGE_DB。'},503);
  }
}
async function handleAI(request, env) {
  if (!env.DEEPSEEK_API_KEY) return json({error:'尚未设置 DEEPSEEK_API_KEY，请在 Cloudflare Pages 配置 Secret。'},503);
  const size=Number(request.headers.get('content-length')||0);
  if(size>40000) return json({error:'对话内容太长，请缩短问题。'},413);
  let data; try{data=await request.json();}catch{return json({error:'请求格式不正确'},400);}
  const parsed = parseMessages(data);
  if (!parsed) return json({error:'对话不符合要求：最多13条消息，总长度不得超过16000字。'},400);
  let db, day, reserved;
  try {
    db=await database(env); day=todayCST(); reserved=reserveMicro(parsed.length);
    if (!await reserveBudget(db,day,reserved)) return json({error:'今日 AI 预算不足，已暂停付费提问。北京时间明天零点重置。',code:'DAILY_LIMIT',usage:await getUsage(db,day)},429);
  }catch(e){console.error('Budget reservation failed',e);return json({error:'AI 额度数据库未就绪，已停止付费请求以保护余额。'},503);}
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),90000);
  let actual=0, input=0, output=0, success=false;
  try {
    const upstream=await fetch('https://api.deepseek.com/chat/completions', {
      method:'POST',signal:controller.signal,
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.DEEPSEEK_API_KEY}`},
      body:JSON.stringify({model:MODEL,stream:false,max_tokens:OUTPUT_MAX,temperature:0.7,
        messages:[{role:'system',content:SYSTEM},...parsed.list]})
    });
    if(!upstream.ok){
      const errors={400:'模型请求参数错误（400）',401:'API Key 无效（401）',402:'DeepSeek API 余额不足（402）',403:'账户无访问权限（403）',404:'模型或接口不存在（404）',429:'DeepSeek 请求限流（429）',500:'DeepSeek 服务异常（500）',503:'DeepSeek 服务繁忙（503）'};
      console.error('DeepSeek error status',upstream.status);
      return json({error:errors[upstream.status]||`DeepSeek 请求失败（HTTP ${upstream.status}）`},502);
    }
    const body=await upstream.json();
    const finishReason=body?.choices?.[0]?.finish_reason || 'unknown';
    const answer=body?.choices?.[0]?.message?.content;
    if(typeof answer!=='string'||!answer.trim())return json({error:'AI 未返回有效回答，请重试。'},502);
    const u=body?.usage;
    if(!u || !Number.isFinite(Number(u.prompt_tokens)) || !Number.isFinite(Number(u.completion_tokens))) {
      // 缺失 usage 时扣除预留额度，不冒险少记账。
      actual=reserved;
      success=true;
      return json({answer,finishReason,truncated:finishReason==='length',warning:'本次未收到 Token 统计，已按预留金额计入预算。'});
    }
    input=Math.max(0,Math.ceil(Number(u.prompt_tokens)));
    output=Math.max(0,Math.ceil(Number(u.completion_tokens)));
    const measured=Math.ceil(input*priceInput+output*priceOutput);
    actual=Math.min(LIMIT_MICRO,measured); // measured bill upper bound at peak-time non-cache prices
    success=true;
    return json({answer,finishReason,truncated:finishReason==='length'});
  }catch(e){console.error('AI request failed',e?.name);return json({error:'AI 请求超时或连接失败，请稍后重试。'},504);}
  finally{
    clearTimeout(timeout);
    try{await settleBudget(db,day,reserved,actual,input,output,success);}
    catch(e){console.error('CRITICAL: AI usage settlement failed',e);}
  }
}
export default {
  async fetch(request,env) {
    const path=new URL(request.url).pathname.replace(/\/$/,'');
    if(path==='/api/ai/usage'){
      if(request.method!=='GET')return json({error:'仅支持 GET'},405);
      return handleUsage(env);
    }
    if(path==='/api/ai'){
      if(request.method==='GET')return json({error:'仅支持 POST 提问；使用 /api/ai/usage 查看当日额度'},405);
      if(request.method!=='POST')return json({error:'仅支持 POST'},405);
      return handleAI(request,env);
    }
    return env.ASSETS.fetch(request);
  }
};
