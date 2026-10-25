import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const root=path.dirname(fileURLToPath(import.meta.url));
const dir=path.join(root,'dist');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const katex=require(path.join(dir,'vendor/katex.min.js'));
const sandbox={};vm.createContext(sandbox);vm.runInContext(read('content.js')+'\n'+read('learning.js')+'\n'+read('classroom.js')+'\nglobalThis.courses=COURSES;globalThis.classroom=CLASSROOM;',sandbox);
let formulas=0,steps=0,questions=0,practice=0,oralCriteria=0;
const ids=new Set();
for(const c of sandbox.courses){
 if(ids.has(c.id))throw Error('Duplicate course '+c.id);ids.add(c.id);
 const topics=new Set();
 for(const t of c.topics){
  if(topics.has(t.id))throw Error('Duplicate topic '+t.id);topics.add(t.id);
  for(const key of ['definitions','formulas','derivations','mistakes','questions'])if(!t[key]?.length)throw Error('Missing '+key+' in '+t.id);
  if(!c.groups[t.group]||!t.oral||!t.intro)throw Error('Incomplete topic '+t.id);
  if(c.id==='mechanics'){
   const learn=t.learning;
   const scene=sandbox.classroom[t.id];
   if(!scene?.diagram||!scene.caption||!scene.scene||!scene.bridge||!scene.takeaway||!scene.core?.length||scene.core.some(i=>!t.formulas[i]))throw Error('Missing visual lesson in '+t.id);
   if(!learn||learn.formulaGuides?.length!==t.formulas.length||learn.derivationIntros?.length!==t.derivations.length)throw Error('Unmapped explanations in '+t.id);
   if(learn.practice?.length<6||learn.oralAnswer?.length!==6)throw Error('Incomplete practice or oral model in '+t.id);
   for(const f of learn.formulaGuides)for(const key of ['title','meaning','why','symbols','when','example'])if(!f[key]?.length)throw Error('Missing '+key+' in '+t.id);
   for(const d of learn.derivationIntros)for(const key of ['goal','start','logic','check'])if(!d[key])throw Error('Missing derivation '+key+' in '+t.id);
   for(const p of learn.practice)if(!p.question||!p.answer||!p.solution?.length||!p.hint)throw Error('Missing worked solution in '+t.id);
   for(const a of learn.oralAnswer)if(!a.criterion||!a.answer||!a.check)throw Error('Missing expected oral response in '+t.id);
   practice+=learn.practice.length;oralCriteria+=learn.oralAnswer.length;
  }
  for(const [tex] of t.formulas){katex.renderToString(tex,{throwOnError:true,strict:'ignore',trust:false});formulas++;}
  const raw=JSON.stringify(t);
  for(const pair of raw.matchAll(/\\\\\(([\s\S]*?)\\\\\)/g)){const tex=JSON.parse('"'+pair[1]+'"');katex.renderToString(tex,{throwOnError:true,strict:'ignore',trust:false});}
  for(const [,list] of t.derivations)steps+=list.length;
  questions+=t.questions.length;
 }
}
let css=read('vendor/katex.min.css').replace(/url\((fonts\/[^)]+)\)/g,(_,name)=>{
 const file=path.join(dir,'vendor',name);const ext=path.extname(file).slice(1);const mime={woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf'}[ext];
 return `url(data:${mime};base64,${fs.readFileSync(file).toString('base64')})`;
});
const safeScript=s=>s.replace(/<\/script/gi,'<\\/script');
const bundle=['content.js','learning.js','classroom.js','lesson-ui.js','app.js'].map(f=>read(f)).join('\n;\n');
const digest=createHash('sha256').update(bundle).digest('hex').slice(0,12);
const bundleName=`study-${digest}.js`;
fs.writeFileSync(path.join(dir,bundleName),bundle);
let template=read('index.html').replace(/  <script defer src="[^"]+"><\/script>\r?\n/g,'').replace(/href="(style|warm)\.css(?:\?[^"]*)?"/g,'href="$1.css"');
const live=template.replace('href="style.css"',`href="style.css?v=${createHash('sha256').update(read('style.css')).digest('hex').slice(0,10)}"`).replace('href="warm.css"',`href="warm.css?v=${createHash('sha256').update(read('warm.css')).digest('hex').slice(0,10)}"`).replace('</head>',`  <script defer src="vendor/katex.min.js"></script>\n  <script defer src="${bundleName}"></script>\n</head>`);
fs.writeFileSync(path.join(dir,'index.html'),live);
let html=template;
const warm=read('warm.css').replace(/url\(['"]?(vendor\/nunito\/[^)'"\s]+)['"]?\)/g,(_,file)=>`url(data:font/woff2;base64,${fs.readFileSync(path.join(dir,file)).toString('base64')})`);
html=html.replace('<link rel="stylesheet" href="vendor/katex.min.css">',`<style>${css}</style>`).replace('<link rel="stylesheet" href="style.css">',`<style>${read('style.css')}</style>`).replace('<link rel="stylesheet" href="warm.css">',`<style>${warm}</style>`);
html=html.replace('</body>',`<script>window.OFFLINE_BUILD=true;</script><script>${safeScript(read('vendor/katex.min.js'))}</script><script>${safeScript(bundle)}</script></body>`);
fs.writeFileSync(path.join(dir,'Механика-офлайн.html'),html);
console.log(JSON.stringify({courses:sandbox.courses.length,topics:sandbox.courses.reduce((n,c)=>n+c.topics.length,0),diagrams:Object.keys(sandbox.classroom).length,formulas,derivationSteps:steps,originalQuestions:questions,newWorkedExercises:practice,totalQuestions:questions+practice,oralCriteria,bundle:bundleName,offlineBytes:Buffer.byteLength(html),result:'All explanations mapped, all KaTeX expressions passed'}));
