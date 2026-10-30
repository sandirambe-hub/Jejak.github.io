const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map(),buttons=['csv','excel','json'].map(x=>({dataset:{export:x}}));
const el=s=>{if(!elements.has(s))elements.set(s,{value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,dataset:{},click(){}});return elements.get(s);};
let calls=[],failOnce=true,blobs=[];
const context=vm.createContext({console,TextEncoder,Uint8Array,DataView,URL,URLSearchParams,Intl,Date,Set,Map,AbortSignal,Error,navigator:{language:'id'},localStorage:{getItem(){return null},setItem(){}},matchMedia:()=>({matches:false}),setTimeout:()=>0,Blob:class{constructor(x){blobs.push(x.join(''));}},document:{documentElement:{dataset:{}},querySelector:el,querySelectorAll:s=>s==='[data-export]'?buttons:[],createElement:()=>({click(){}})},fetch:async url=>{calls.push(url);const u=new URL(url),p=u.searchParams;let d;
if(u.hostname==='api.github.com'){d=u.pathname.endsWith('/events/public')?Array.from({length:Number(p.get('page'))===3?1:100},(_,i)=>({id:p.get('page')+'-'+i,repo:{name:'user/repo'},type:'PushEvent',created_at:'2025-01-02T00:00:00Z'})):{login:'tester',public_repos:4};}
else if(p.get('meta'))d={query:{globaluserinfo:{id:1,name:p.get('guiuser'),editcount:100,merged:[{wiki:'idwiki',url:'https://id.wikipedia.org',editcount:99},{wiki:'commonswiki',url:'https://commons.wikimedia.org',editcount:1}]}}};
else{assert.equal(p.get('ucstart')||p.get('lestart'),'2025-01-03T23:59:59Z');assert.equal(p.get('ucend')||p.get('leend'),'2025-01-01T00:00:00Z');if(p.get('list')==='logevents'&&failOnce){failOnce=false;throw Error('fixture temporary failure');}const edit=p.get('list')==='usercontribs';d={query:{[edit?'usercontribs':'logevents']:[edit?{revid:1,title:'<img onerror=evil>',timestamp:'2025-01-02T00:00:00Z'}:{logid:1,type:'upload',action:'upload',title:'File:Example.svg',timestamp:'2025-01-02T00:00:00Z'}]}};if(edit&&!p.get('uccontinue'))d.continue={uccontinue:'next',continue:'-||'};}
return{ok:true,json:async()=>d};}});
vm.runInContext(fs.readFileSync(__dirname+'/xlsx.js','utf8')+fs.readFileSync(__dirname+'/translations.js','utf8')+fs.readFileSync(__dirname+'/dashboard.js','utf8'),context);
context.URL=class extends URL{static createObjectURL(){return '';}static revokeObjectURL(){}}; // fetch URL constructor kept outside context
(async()=>{
await vm.runInContext(`(async()=>{state={platform:'wikimedia',start:'2025-01-01T00:00:00Z',end:'2025-01-03T23:59:59Z',accounts:[{input:'Test',name:'Test',wikis:[],unsupported:0}],tasks:[],rows:[],seen:new Set(),requests:0};state.tasks=[task(state.accounts[0],'profile')];await run();})()`,context);
assert.equal(vm.runInContext("status(state.accounts[0])",context),'failed');
await vm.runInContext('run()',context);
assert.equal(vm.runInContext("status(state.accounts[0])",context),'complete');assert.equal(vm.runInContext('state.rows.length',context),4); // duplicate continuations deduplicated
assert.match(el('#activity').innerHTML,/&lt;img/);assert.doesNotMatch(el('#activity').innerHTML,/<img onerror/);assert.match(el('#gallery').innerHTML,/Special:Redirect/);
assert.equal(vm.runInContext(`csvCell('=HYPERLINK("bad")')`,context),'"\'=HYPERLINK(""bad"")"');
assert.equal(vm.runInContext(`Object.values(translations).every(v=>Object.keys(words).every(k=>v[k]))`,context),true);
await vm.runInContext(`(async()=>{state={platform:'github',start:'2025-01-01T00:00:00Z',end:'2025-01-03T23:59:59Z',accounts:[{input:'tester',name:'tester',wikis:[],unsupported:0}],tasks:[],rows:[],seen:new Set(),requests:0};state.tasks=[task(state.accounts[0],'profile')];await run();})()`,context);
assert.equal(vm.runInContext('state.rows.length',context),201);assert.equal(vm.runInContext('status(state.accounts[0])',context),'complete');
const xlsx=vm.runInContext('makeXlsx(sheets())',context);fs.writeFileSync('/tmp/jejak-test.xlsx',xlsx);
console.log('PASS: date bounds, continuation deduplication, failure/retry, coverage, escaping, CSV formula safety, six-language completeness, GitHub pagination, XLSX workbook');
})().catch(e=>{console.error(e);process.exitCode=1});
