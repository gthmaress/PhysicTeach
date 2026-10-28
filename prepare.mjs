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
const sandbox={};vm.createContext(sandbox);vm.runInContext(read('content.js')+'\n'+read('learning.js')+'\n'+read('classroom.js')+'\n'+read('quizzes.js')+'\n'+read('quiz-engine.js')+'\nglobalThis.courses=COURSES;globalThis.classroom=CLASSROOM;globalThis.quizLogic=QuizLogic;',sandbox);
let formulas=0,steps=0,questions=0,definitions=0;
const ids=new Set();
for(const c of sandbox.courses){
 sandbox.quizLogic.validate(c);
 if(ids.has(c.id))throw Error('Duplicate course '+c.id);ids.add(c.id);
 const topics=new Set();
 for(const t of c.topics){
  if(topics.has(t.id))throw Error('Duplicate topic '+t.id);topics.add(t.id);
  for(const key of ['definitions','formulas','derivations','questions'])if(!t[key]?.length)throw Error('Missing '+key+' in '+t.id);
  if(!c.groups[t.group]||!t.oral||!t.intro)throw Error('Incomplete lesson '+t.id);
  for(const g of t.learning.formulaGuides)for(const key of ['title','meaning','symbols','when','why','example'])if(!g[key]?.length)throw Error('Missing formula '+key+' in '+t.id);
  if(t.learning.formulaGuides.length!==t.formulas.length||t.learning.oralAnswer.length<4)throw Error('Incomplete learning modes in '+t.id);
  for(const [tex] of t.formulas){katex.renderToString(tex,{throwOnError:true,strict:'ignore',trust:false});formulas++;}
  for(const a of t.learning.oralAnswer)if(!a.criterion||!a.answer||!a.check)throw Error('Missing oral response in '+t.id);
  for(const [,list] of t.derivations){if(!list.length)throw Error('Empty derivation');steps+=list.length;}
  questions+=t.questions.length;definitions+=t.definitions.length;
 }
}
for(const raw of [JSON.stringify(sandbox.courses)])for(const pair of raw.matchAll(/\\\\\(([\s\S]*?)\\\\\)/g)){const tex=JSON.parse('"'+pair[1]+'"');katex.renderToString(tex,{throwOnError:true,strict:'ignore',trust:false});}
function rejectVideo(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())rejectVideo(file);else if(/\.(mp4|webm|mov|m4v)$/i.test(entry.name))throw Error('Video must not be published: '+file);}}
rejectVideo(dir);
let css=read('vendor/katex.min.css').replace(/url\((fonts\/[^)]+)\)/g,(_,name)=>{
 const file=path.join(dir,'vendor',name);const ext=path.extname(file).slice(1);const mime={woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf'}[ext];
 return `url(data:${mime};base64,${fs.readFileSync(file).toString('base64')})`;
});
const safeScript=s=>s.replace(/<\/script/gi,'<\\/script');
const bundle=['content.js','learning.js','classroom.js','quizzes.js','quiz-engine.js','progress-state.js','lesson-ui.js','quiz-ui.js','app.js'].map(f=>read(f)).join('\n;\n');
const digest=createHash('sha256').update(bundle).digest('hex').slice(0,12);
const bundleName=`study-${digest}.js`;
fs.writeFileSync(path.join(dir,bundleName),bundle);
for(const name of fs.readdirSync(dir))if(/^study-[a-f0-9]+\.js$/.test(name)&&name!==bundleName)fs.unlinkSync(path.join(dir,name));
let template=read('index.html').replace(/  <script defer src="[^"]+"><\/script>\r?\n/g,'').replace(/href="(style|warm|comfort)\.css(?:\?[^"]*)?"/g,'href="$1.css"');
if(!template.includes('href="comfort.css"'))template=template.replace('</head>','  <link rel="stylesheet" href="comfort.css">\n</head>');
const live=template.replace(/href="(style|warm|comfort)\.css"/g,(_,name)=>`href="${name}.css?v=${createHash('sha256').update(read(name+'.css')).digest('hex').slice(0,10)}"`).replace('</head>',`  <script defer src="vendor/katex.min.js"></script>\n  <script defer src="${bundleName}"></script>\n</head>`);
fs.writeFileSync(path.join(dir,'index.html'),live);
let html=template;
const warm=read('warm.css').replace(/url\(['"]?(vendor\/nunito\/[^)'"\s]+)['"]?\)/g,(_,file)=>`url(data:font/woff2;base64,${fs.readFileSync(path.join(dir,file)).toString('base64')})`);
html=html.replace('<link rel="stylesheet" href="vendor/katex.min.css">',`<style>${css}</style>`).replace('<link rel="stylesheet" href="style.css">',`<style>${read('style.css')}</style>`).replace('<link rel="stylesheet" href="warm.css">',`<style>${warm}</style>`).replace('<link rel="stylesheet" href="comfort.css">',`<style>${read('comfort.css')}</style>`);
html=html.replace('</body>',`<script>window.OFFLINE_BUILD=true;</script><script>${safeScript(read('vendor/katex.min.js'))}</script><script>${safeScript(bundle)}</script></body>`);
fs.writeFileSync(path.join(dir,'Механика-офлайн.html'),html);
console.log(JSON.stringify({courses:sandbox.courses.length,topics:sandbox.courses.reduce((n,c)=>n+c.topics.length,0),testQuestions:sandbox.courses.reduce((n,c)=>n+c.quizzes.length,0),diagrams:Object.keys(sandbox.classroom).length,formulaCards:formulas,definitions,derivationSteps:steps,cards:questions,bundle:bundleName,offlineBytes:Buffer.byteLength(html),result:'Curriculum validated; no video assets included'}));
