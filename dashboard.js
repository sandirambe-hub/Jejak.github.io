'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pref(key,value){try{if(value!==undefined)localStorage.setItem(key,value);else return localStorage.getItem(key);}catch{}}
let lang=pref('jejak-language')||navigator.language.split('-')[0];if(!translations[lang])lang='en';
const t=k=>translations[lang][k]||k,n=v=>new Intl.NumberFormat(lang).format(v),link=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
let state=null,busy=false,paused=false,shown=100;
function localize(){document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';$('#language').value=lang;document.querySelectorAll('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));if(state){filters();render();}}
$('#language').onchange=e=>{lang=e.target.value;pref('jejak-language',lang);localize();};
document.documentElement.dataset.theme=pref('jejak-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
$('#theme').onclick=()=>{const mode=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=mode;pref('jejak-theme',mode);};
const today=new Date();$('#to').value=today.toISOString().slice(0,10);$('#from').value=new Date(today.getTime()-29*86400000).toISOString().slice(0,10);
function wikiInfo(w){try{const u=new URL(w.url);if(u.protocol!=='https:'||!/(^|\.)(wikipedia|wiktionary|wikibooks|wikiquote|wikisource|wikinews|wikiversity|wikivoyage|wikidata|wikimedia|mediawiki|wikifunctions)\.org$/.test(u.hostname))return null;const p=u.hostname.split('.');return{wiki:w.wiki,url:u.origin,host:u.hostname,family:p.at(-2)==='wikimedia'?({'commons':'Commons','meta':'Meta-Wiki','species':'Wikispecies','incubator':'Incubator'}[p[0]]||'Wikimedia'):p.at(-2),total:Number(w.editcount)||0};}catch{return null;}}
async function json(url){try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();if(d.error)throw Error(d.error.code||'API');return d;}catch(e){throw Error(t('network')+' ('+(e.message||e.name)+')');}}
const api=(root,p)=>json(root+'/w/api.php?'+new URLSearchParams({action:'query',format:'json',origin:'*',...p}));
function task(a,kind,w=null){return{account:a,kind,w,cont:null,page:1,status:'pending',error:'',attempts:0};}
async function processTask(q){const a=q.account;
 if(q.kind==='profile'){
   const d=await api('https://meta.wikimedia.org',{meta:'globaluserinfo',guiuser:a.input,guiprop:'merged|editcount|groups'}),u=d.query?.globaluserinfo;
   if(!u||!u.id||'missing'in u)throw Error(t('notfound'));
   a.name=u.name;a.total=Number(u.editcount)||0;a.url='https://meta.wikimedia.org/wiki/Special:CentralAuth/'+encodeURIComponent(u.name);a.registration=u.registration;
   const merged=u.merged||[];a.wikis=merged.map(wikiInfo).filter(Boolean).sort((x,y)=>y.total-x.total);a.unsupported=merged.length-a.wikis.length;
   // Include zero-edit accounts: their public logs may still contain actions.
   for(const w of a.wikis){w.rank=a.wikis.indexOf(w);state.tasks.push(task(a,'edits',w),task(a,'logs',w));}
  q.status='done';filters();return;
 }
 const edit=q.kind==='edits',p=edit?{list:'usercontribs',ucuser:a.name,uclimit:100,ucprop:'ids|title|timestamp|comment',ucdir:'older',ucstart:state.end,ucend:state.start}:{list:'logevents',leuser:a.name,lelimit:100,leprop:'ids|title|type|timestamp|comment',ledir:'older',lestart:state.end,leend:state.start};
 const d=await api(q.w.url,{...p,...(q.cont||{})}),items=edit?d.query?.usercontribs:d.query?.logevents;if(!Array.isArray(items))throw Error('API');
 for(const v of items)add({account:a.name,wiki:q.w.wiki,project:q.w.family,kind:q.kind,id:edit?v.revid:v.logid,title:v.title||'',type:edit?'edit':(v.type||'')+'/'+(v.action||''),time:v.timestamp||'',comment:v.comment||'',url:q.w.url+'/w/index.php?'+(edit?'diff='+Number(v.revid):'title=Special:Log&logid='+Number(v.logid))});
 q.cont=d.continue||null;q.status=q.cont?'pending':'done';
}
function add(row){const key=[row.account,row.wiki,row.kind,row.id].join('|');if(!state.seen.has(key)){state.seen.add(key);state.rows.push(row);}}
async function run(){if(busy||!state)return;busy=true;paused=false;$('#fields').disabled=true;$('#more').disabled=true;$('#stop').hidden=false;$('#message').textContent=t('loading');state.tasks.forEach(q=>{if(q.status==='error'){q.status='pending';q.error='';}});let count=0;
 try{while(!paused&&count<40){const batch=state.tasks.filter(q=>q.status==='pending').sort((a,b)=>a.attempts-b.attempts||(a.w?.rank||0)-(b.w?.rank||0)).slice(0,Math.min(3,40-count));if(!batch.length)break;count+=batch.length;await Promise.all(batch.map(async q=>{q.status='loading';q.attempts++;try{await processTask(q);state.requests++;}catch(e){q.status='error';q.error=e.message;}}));render();}}
 finally{busy=false;$('#fields').disabled=false;$('#more').disabled=false;$('#stop').hidden=true;$('#message').textContent='';render();}}
$('#stop').onclick=()=>{paused=true;$('#stop').disabled=true;};$('#more').onclick=()=>{$('#stop').disabled=false;run();};
$('#search').onsubmit=e=>{e.preventDefault();if(busy)return;const names=$('#names').value.split(/\n/).map(s=>s.trim().replaceAll('_',' ')).filter(Boolean),from=$('#from').value,to=$('#to').value;const unique=new Set(names.map(s=>s[0].toUpperCase()+s.slice(1)));
 if(!names.length||names.length>10||unique.size!==names.length||!from||!to||from>to||names.some(s=>s.length>85||s.includes('://'))){$('#message').textContent=t('invalid');return;}
 state={platform:'wikimedia',start:from+'T00:00:00Z',end:to+'T23:59:59Z',fetchedAt:new Date().toISOString(),accounts:names.map(input=>({input,name:input,total:null,wikis:[],unsupported:0})),tasks:[],rows:[],seen:new Set(),requests:0};state.tasks=state.accounts.map(a=>task(a,'profile'));shown=100;$('#find').value='';$('#accountFilter').innerHTML='';$('#projectFilter').innerHTML='';$('#results').hidden=false;$('#stop').disabled=false;filters();render();run();};
// Retire the previous report as soon as search criteria change.
function clearPreviousReport(){
 if(busy)return;
 state=null;shown=100;
 $('#results').hidden=true;$('#message').textContent='';
 for(const id of ['accountFilter','projectFilter','summary','wikis','activity','timeline','projectChart','gallery','errors'])$('#'+id).innerHTML='';
 $('#accountFilter').value='';$('#projectFilter').value='';$('#find').value='';
 $('#gallery').dataset.key='';
}
$('#names').oninput=clearPreviousReport;
$('#from').onchange=clearPreviousReport;
$('#to').onchange=clearPreviousReport;
function filters(){for(const [id,values]of [['accountFilter',state.accounts.map(a=>a.name)],['projectFilter',[...new Set(state.accounts.flatMap(a=>a.wikis.map(w=>w.family)))].sort()]]){const el=$('#'+id),value=el.value;el.innerHTML=`<option value="">${t('all')}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');el.value=values.includes(value)?value:'';}}
for(const id of ['accountFilter','projectFilter','group'])$('#'+id).onchange=()=>{shown=100;render();};$('#find').oninput=()=>{shown=100;render();};$('#showMore').onclick=()=>{shown+=100;render();};
function status(a,w){const ts=state.tasks.filter(q=>q.account===a&&(!w||q.w===w));return ts.some(q=>q.status==='error')?'failed':ts.some(q=>q.status!=='done')||a.unsupported?'pending':'complete';}
function table(headers,rows){return rows.length?'<table><thead><tr>'+headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</tbody></table>':`<p class="empty">${t('empty')}</p>`;}
function selected(r){const a=$('#accountFilter').value,p=$('#projectFilter').value,s=$('#find').value.toLowerCase();return(!a||r.account===a)&&(!p||r.project===p)&&(!s||[r.wiki,r.title,r.project].join(' ').toLowerCase().includes(s));}
function counts(rows){const out={edits:0,logs:0};rows.forEach(r=>out[r.kind]++);return out;}
function bars(el,rows){const max=Math.max(1,...rows.map(r=>r[1]));$(el).innerHTML=rows.length?rows.map(([label,value])=>`<div class="bar"><span>${esc(label)}</span><i style="width:${value/max*100}%" aria-hidden="true"></i><b>${n(value)}</b></div>`).join(''):`<p class="empty">${t('empty')}</p>`;}
function render(){if(!state)return;$('#progress').textContent=`${state.start.slice(0,10)} → ${state.end.slice(0,10)} UTC · ${t('done')}: ${n(state.requests)} · ${t('remaining')}: ${n(state.tasks.filter(q=>q.status!=='done').length)}`;$('#more').hidden=!state.tasks.some(q=>q.status!=='done');$('#more').disabled=busy;
 $('#summary').innerHTML=table([t('account'),t('global'),t('edits'),t('logs'),t('state')],state.accounts.map(a=>{const c=counts(state.rows.filter(r=>r.account===a.name));return[a.url?link(a.url,a.name):esc(a.name),a.total===null?'—':n(a.total),n(c.edits),n(c.logs),esc(t(status(a)))];}));
 const filtered=state.rows.filter(selected),chartRows=filtered.filter(r=>r.kind!=='logs'),groups={},projects={};for(const r of chartRows){const key=r.time.slice(0,$('#group').value==='month'?7:10);groups[key]=(groups[key]||0)+1;projects[r.project]=(projects[r.project]||0)+1;}bars('#timeline',Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)));bars('#projectChart',Object.entries(projects).sort((a,b)=>b[1]-a[1]));
 const wikiRows=[];for(const a of state.accounts)for(const w of a.wikis){if(!selected({account:a.name,project:w.family,wiki:w.wiki+' '+w.host,title:''}))continue;const c=counts(state.rows.filter(r=>r.account===a.name&&r.wiki===w.wiki));wikiRows.push([esc(a.name),link(w.url+'/wiki/Special:Contributions/'+encodeURIComponent(a.name),w.host),esc(w.family),n(w.total),n(c.edits),n(c.logs),esc(t(status(a,w)))]);}$('#wikis').innerHTML=table([t('account'),'Wiki',t('project'),t('total'),t('edits'),t('logs'),t('state')],wikiRows);
 filtered.sort((a,b)=>b.time.localeCompare(a.time));$('#activity').innerHTML=table([t('account'),'Wiki',t('title'),t('type'),t('time')],filtered.slice(0,shown).map(r=>[esc(r.account),esc(r.wiki),link(r.url,r.title||r.type)+(r.comment?`<small>${esc(r.comment)}</small>`:''),esc(r.type),esc(r.time.replace('T',' ').replace('Z',''))]));$('#activityCount').textContent=t('shown')+': '+n(Math.min(shown,filtered.length))+' / '+n(filtered.length);$('#showMore').hidden=shown>=filtered.length;
 const uploads=[...new Map(filtered.filter(r=>r.wiki==='commonswiki'&&r.type.startsWith('upload/')&&r.title.startsWith('File:')).map(r=>[r.title,r])).values()].slice(0,24);
 const galleryKey=uploads.map(r=>[r.account,r.title,r.id].join(':')).join('|')+lang;if($('#gallery').dataset.key!==galleryKey){$('#gallery').dataset.key=galleryKey;$('#gallery').innerHTML=uploads.length?uploads.map(r=>`<figure><a href="https://commons.wikimedia.org/wiki/${encodeURIComponent(r.title)}" target="_blank" rel="noopener"><img loading="lazy" src="https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(r.title.slice(5))}?width=240" alt="${esc(r.title)}"></a><figcaption>${link('https://commons.wikimedia.org/wiki/'+encodeURIComponent(r.title),r.title)}<br>${esc(r.account)}</figcaption></figure>`).join(''):`<p class="empty">${t('empty')}</p>`;}
 $('#errors').innerHTML=state.tasks.filter(q=>q.status==='error').map(q=>`<li>${esc(q.account.name)} · ${esc(q.w?.wiki||q.kind)}: ${esc(q.error)}</li>`).join('')||`<li>—</li>`;
}
function exportData(){return{schemaVersion:2,platform:state.platform,period:{from:state.start,to:state.end,timezone:'UTC'},fetchedAt:state.fetchedAt,exportedAt:new Date().toISOString(),scope:t('wikiNote'),notice:t('partial'),accounts:state.accounts.map(a=>({...a,status:status(a),counts:counts(state.rows.filter(r=>r.account===a.name))})),tasks:state.tasks.map(q=>({account:q.account.name,wiki:q.w?.wiki||'',kind:q.kind,status:q.status,error:q.error,continuation:q.cont,page:q.page})),activity:state.rows};}
function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function sheets(){const report=exportData();return{Metadata:[['Field','Value'],['Platform',report.platform],['From (UTC)',state.start],['To (UTC)',state.end],['Fetched at',state.fetchedAt],['Scope',report.scope],['Notice',report.notice]],Summary:[['Account','All-time edits','Period edits','Period logs','Status'],...report.accounts.map(a=>[a.name,a.total??'',a.counts.edits,a.counts.logs,t(a.status)])],Wikis:[['Account','Wiki','Project','All-time edits','Period edits','Period logs','Status'],...state.accounts.flatMap(a=>a.wikis.map(w=>{const c=counts(state.rows.filter(r=>r.account===a.name&&r.wiki===w.wiki));return[a.name,w.wiki,w.family,w.total,c.edits,c.logs,t(status(a,w))];}))],Activity:[['Account','Wiki','Project','Kind','Title','Time (UTC)','Comment','Source'],...state.rows.map(r=>[r.account,r.wiki,r.project,r.type,r.title,r.time,r.comment,r.url])],Coverage:[['Account','Wiki','Kind','Status','Error'],...report.tasks.map(q=>[q.account,q.wiki,q.kind,q.status,q.error])]};}
function download(content,type,ext){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download='jejak-'+state.platform+'-'+state.start.slice(0,10)+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>{if(!state)return;const kind=b.dataset.export;if(kind==='json'){download(JSON.stringify(exportData(),null,2),'application/json','json');return;}const data=sheets();if(kind==='csv'){const rows=[['Section','Field 1','Field 2','Field 3','Field 4','Field 5','Field 6','Field 7','Field 8'],...Object.entries(data).flatMap(([name,rows])=>rows.map(r=>[name,...r]))];download('\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8','csv');}else download(makeXlsx(data),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx');});
localize();
