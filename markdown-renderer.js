/* AI 伴学 Markdown 渲染器（本地脚本，无远程依赖）
 * 所有用户/模型文本先 HTML 转义；禁止执行原始 HTML。
 * 支持标题、段落、粗斜体、链接、行内/围栏代码、列表、引用、表格和分隔线。
 */
(function(global){
  'use strict';
  const htmlEscape = (value) => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const safeHref = (raw) => {
    const value = String(raw).trim().replace(/&amp;/g,'&');
    if (!/^(https?:\/\/|mailto:)/i.test(value)) return null;
    try {
      const url = new URL(value);
      return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? htmlEscape(url.href) : null;
    } catch { return null; }
  };
  function mathHtml(tex, display) {
    const expression = (display ? '\\[' : '\\(') + htmlEscape(tex) + (display ? '\\]' : '\\)');
    return display ? '<div class="ai-math-display">' + expression + '</div>' : '<span class="ai-math-inline">' + expression + '</span>';
  }
  function inline(src) {
    const saved=[];
    const keep=(html) => { const key='\uE000'+saved.length+'\uE001';saved.push(html);return key; };
    let text=String(src);
    // 先隔离代码跨度，代码中的 markdown 不再二次解析。
    text=text.replace(/(`+)([\s\S]*?)\1/g,(_all,_ticks,code)=>keep('<code>'+htmlEscape(code.replace(/\n/g,' '))+'</code>'));
    // 防止公式里的 _、*、\\ 等被 Markdown 解析破坏。
    text=text.replace(/\\\[([^\n]*?)\\\]/g, (_m, tex) => keep(mathHtml(tex, true)));
    text=text.replace(/\\\(([^\n]*?)\\\)|(?<!\\)\$([^\n$]+?)\$/g, (_match, parens, dollars) =>
      keep(mathHtml(parens === undefined ? dollars : parens, false)));
    // 只允许 http(s) 和 mailto；过滤 javascript:、data: 等链接。
    text=text.replace(/\[([^\]\n]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,(all,label,url)=>{
      const safe=safeHref(url);
      return safe ? keep('<a href="'+safe+'" target="_blank" rel="noopener noreferrer">'+htmlEscape(label)+'</a>') : all;
    });
    text=htmlEscape(text);
    text=text.replace(/\*\*([^\n*][\s\S]*?)\*\*/g,'<strong>$1</strong>')
      .replace(/__([^\n_][\s\S]*?)__/g,'<strong>$1</strong>')
      .replace(/~~([^\n~][\s\S]*?)~~/g,'<del>$1</del>')
      .replace(/(?<!\*)\*([^\n*]+)\*(?!\*)/g,'<em>$1</em>')
      .replace(/(?<!_)_([^\n_]+)_(?!_)/g,'<em>$1</em>');
    return text.replace(/\uE000(\d+)\uE001/g,(_m,n)=>saved[Number(n)] || '');
  }
  function cells(line) {return line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());}
  const isFence = s => /^\s{0,3}(`{3,}|~{3,})/.test(s);
  const isTableBreak = s => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(s);
  const isBlock = s => /^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+|(?:---+|\*\*\*+|___+)\s*$)/.test(s) || isFence(s) || /^\s*(?:\\\[|\$\$)/.test(s);
  function render(src) {
    const lines=String(src??'').replace(/\r\n?/g,'\n').split('\n');
    const out=[];let i=0;
    while(i<lines.length){
      let line=lines[i];
      if(!line.trim()){i++;continue;}
      // AI 可能把展示公式起始标记放在中文冒号后面。
      // 将“例子：\\[”拆成段落 + 数学块，避免 <br> 阻断 MathJax。
      const prefixMath=line.match(/^(.*\S)\s+(\\\[|\$\$)\s*$/) || line.match(/^(.*[：:])\s*(\\\[|\$\$)\s*$/);
      if(prefixMath && prefixMath[1].trim()) {
        lines.splice(i,1,prefixMath[1],prefixMath[2]);
        line=lines[i];
      }

      const fence=line.match(/^\s{0,3}(`{3,}|~{3,})([a-zA-Z0-9_+.-]*)\s*$/);
      if(fence){
        const delim=fence[1], language=fence[2], code=[];i++;
        const close=new RegExp('^\\s{0,3}'+delim[0]+'{'+delim.length+',}\\s*$');
        while(i<lines.length&&!close.test(lines[i]))code.push(lines[i++]);
        if(i<lines.length)i++;
        out.push('<pre class="ai-code"><code'+(language?' data-language="'+htmlEscape(language)+'"':'')+'>'+htmlEscape(code.join('\n'))+'</code></pre>');
        continue;
      }
      const head=line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if(head){const n=head[1].length;out.push('<h'+n+'>'+inline(head[2])+'</h'+n+'>');i++;continue;}
      if(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)){out.push('<hr>');i++;continue;}
      if(i+1<lines.length && line.includes('|') && isTableBreak(lines[i+1])){
        const headers=cells(line);i+=2;const body=[];
        while(i<lines.length&&lines[i].trim()&&lines[i].includes('|')){body.push(cells(lines[i]));i++;}
        out.push('<div class="ai-table-scroll"><table><thead><tr>'+headers.map(x=>'<th>'+inline(x)+'</th>').join('')+'</tr></thead><tbody>'+body.map(row=>'<tr>'+headers.map((_x,j)=>'<td>'+inline(row[j]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
        continue;
      }
      if(/^\s{0,3}>/.test(line)){
        const quote=[];
        while(i<lines.length&&/^\s{0,3}>/.test(lines[i]))quote.push(lines[i++].replace(/^\s{0,3}>\s?/,''));
        out.push('<blockquote>'+render(quote.join('\n'))+'</blockquote>');continue;
      }
      const marker=line.match(/^(\s{0,3})([-*+]|\d+[.)])\s+(.+)$/);
      if(marker){
        const ordered=/^\d/.test(marker[2]), tag=ordered?'ol':'ul',items=[];
        while(i<lines.length){
          const m=lines[i].match(/^(\s{0,3})([-*+]|\d+[.)])\s+(.+)$/);
          if(!m || /^\d/.test(m[2])!==ordered)break;
          let body=m[3];i++;
          while(i<lines.length&&/^\s{2,}\S/.test(lines[i])&&!/^(\s{0,3})([-*+]|\d+[.)])\s+/.test(lines[i]))body+='\n'+lines[i++].trim();
          items.push('<li>'+body.split('\n').map(inline).join('<br>')+'</li>');
        }
        const start=ordered ? ' start="'+Number(marker[2].match(/^\d+/)[0])+'"' : '';
        out.push('<'+tag+start+'>'+items.join('')+'</'+tag+'>');continue;
      }
      // 独立行、多行、单行展示公式：\\[ ... \\] 或 $$ ... $$
      const stripped=line.trim();
      if(stripped.startsWith('\\[') || stripped.startsWith('$$')) {
        const opener=stripped.startsWith('\\[') ? '\\[' : '$$';
        const closer=opener==='$$' ? '$$' : '\\]';
        const after=stripped.slice(opener.length);
        const endPos=after.lastIndexOf(closer);
        if(endPos>=0 && !after.slice(endPos+closer.length).trim()) {
          out.push(mathHtml(after.slice(0,endPos),true));i++;continue;
        }
        if(endPos<0) {
          let body=[]; if(after)body.push(after);
          i++;let found=false;
          while(i<lines.length) {
            const at=lines[i].indexOf(closer);
            if(at>=0 && !lines[i].slice(at+closer.length).trim()) {
              body.push(lines[i].slice(0,at));i++;found=true;break;
            }
            body.push(lines[i++]);
          }
          if(found){out.push(mathHtml(body.join('\n'),true));continue;}
          out.push('<p>'+inline(opener+body.join('\n'))+'</p>');continue;
        }
      }
      const paragraph=[line.trim()];i++;
      while(i<lines.length && lines[i].trim() && !isBlock(lines[i]) && !(i+1<lines.length&&lines[i].includes('|')&&isTableBreak(lines[i+1])))paragraph.push(lines[i++].trim());
      out.push('<p>'+paragraph.map(inline).join('<br>')+'</p>');
    }
    return out.join('\n');
  }
  global.renderStudyMarkdown = render;
  if(typeof module!=='undefined'&&module.exports)module.exports={render,inline,htmlEscape};
})(typeof window!=='undefined'?window:globalThis);
