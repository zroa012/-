// Cloudflare Pages Function — keep DEEPSEEK_API_KEY only in Cloudflare's server-side environment.
const HEADERS = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:HEADERS});
export async function onRequestPost({request,env}) {
  if(!env.DEEPSEEK_API_KEY) return json({error:'站长尚未配置 DEEPSEEK_API_KEY，请在 Cloudflare Pages 环境变量中添加。'},503);
  const size=Number(request.headers.get('content-length')||0);
  if(size>40000) return json({error:'对话内容过长，请缩短问题。'},413);
  let data;try{data=await request.json();}catch{return json({error:'请求格式不正确'},400);}
  if(!Array.isArray(data.messages)||data.messages.length<1||data.messages.length>13) return json({error:'对话数量超出范围'},400);
  const messages=data.messages.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length>0&&m.content.length<=6000).map(m=>({role:m.role,content:m.content}));
  if(messages.length!==data.messages.length||messages.at(-1)?.role!=='user') return json({error:'对话内容不合法'},400);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
  try{
    const upstream=await fetch('https://api.deepseek.com/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.DEEPSEEK_API_KEY}`},signal:controller.signal,
      body:JSON.stringify({model:'deepseek-flash',stream:false,max_tokens:1800,temperature:0.7,messages:[{role:'system',content:'你是耐心、严谨的中文AI伴学老师。优先启发式教学，先讲思路再给答案，清楚分步骤。数学和代码要认真检查推理。对不确定的事实诚实说明，不编造引用。针对学生提问给出适度详细、易理解的解释。'},...messages]})
    });
    if(!upstream.ok){console.error('DeepSeek upstream status:',upstream.status);return json({error:upstream.status===429?'AI 请求频繁，请稍后重试。':'AI 服务暂时不可用，请检查 API 余额或稍后重试。'},502);}
    const body=await upstream.json();const answer=body?.choices?.[0]?.message?.content;
    if(typeof answer!=='string'||!answer.trim())return json({error:'AI 没有返回可显示的内容，请重试。'},502);
    return json({answer});
  }catch(error){console.error('DeepSeek request failed',error?.name);return json({error:'AI 请求超时或连接失败，请重试。'},504);}
  finally{clearTimeout(timeout);}
}
export function onRequestGet(){return json({error:'仅支持 POST 提问'},405);}
