import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=name=>fs.readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const content=['content.js','learning.js','quizzes.js'].map(source).join('\n');
const model=vm.createContext({});
vm.runInContext(content+'\n'+source('quiz-engine.js')+'\n'+source('progress-state.js')+'\nglobalThis.rules=StudyState;globalThis.courses=COURSES;globalThis.quiz=QuizLogic;',model);
const {rules,courses,quiz}=model;

test('previous curriculum answers cannot complete the new video curriculum',()=>{
 const old={version:1,course:'mechanics',progress:{'mechanics:m01':3},cards:{'mechanics:m01:q0':{streak:3,due:'2026-10-30'}},plans:{},last:{mechanics:'m01'},quizAnswers:{'mechanics:m01-q1':{choice:'a'}}};
 const clean=plain(rules.normalize(old,courses));
 assert.equal(clean.course,'mechanics-video');assert.deepEqual(clean.progress,{});assert.deepEqual(clean.cards,{});assert.deepEqual(clean.quizAnswers,{});
 assert.ok(source('app.js').includes("const KEY='colloquium.study.video.v1'"));
});

test('all lessons have complete explanations, applications and oral models without source metadata',()=>{
 vm.runInContext('globalThis.lessonData=LESSON_DATA;',model);
 const notes=model.lessonData,c=courses[0];
 assert.equal(notes.length,23);assert.equal(notes.reduce((n,t)=>n+t.formulas.length,0),102);
 for(const t of c.topics){
  const n=notes.find(n=>n.id===t.id);
  assert.deepEqual(plain(t.definitions),plain(n.definitions));
  assert.deepEqual(plain(t.formulas.map(f=>f[0])),plain(n.formulas.map(f=>f.tex)));
  assert.deepEqual(plain(t.derivations),plain(n.derivations.map(d=>[d.title,d.steps])));
  assert.equal(t.learning.oralAnswer.length,6);
  for(const g of t.learning.formulaGuides){for(const k of ['title','meaning','when','why','example'])assert.ok(g[k]?.length>10,t.id+' '+k);assert.ok(g.symbols.length);}
 }
 assert.doesNotMatch(JSON.stringify(notes),/видео|конспект|таймкод/i);
 assert.doesNotMatch(JSON.stringify(c.quizzes),/видео|конспект|таймкод/i);
 assert.doesNotMatch(source('app.js')+source('lesson-ui.js'),/<video|<iframe|<source[^>]+mp4/i);
 assert.ok(c.topics.find(t=>t.id==='m08').learning.formulaGuides.some(f=>/мощност/i.test(f.title)));
});

test('same-curriculum backups retain topic status, cards and plans',()=>{
 const old={version:1,course:'mechanics-video',progress:{'mechanics-video:m01':2},cards:{'mechanics-video:m01:q0':{streak:2,due:'2026-10-28',updated:'2026-10-25'}},plans:{'mechanics-video':{start:'2026-10-25',days:14}},last:{'mechanics-video':'m01'},practice:{'mechanics-video:m01:q1':'again'}};
 const clean=plain(rules.normalize(old,courses));
 for(const key of ['progress','cards','plans','last','practice'])assert.deepEqual(clean[key],old[key]);
 assert.equal(clean.lastSections['mechanics-video'],'theory');
 assert.deepEqual(clean.drafts,{});assert.deepEqual(clean.quizAnswers,{});
});

test('new backups round-trip test answers, drafts and legacy section links',()=>{
 const input=plain(rules.create(courses));
 input.last['mechanics-video']='m18';input.lastSections['mechanics-video']='check';input.drafts['mechanics-video:m18:q1']='Q ∝ R⁴/l; множитель 16/2 = 8.';
 input.drafts['mechanics-video:m18:quiz-m18-q1']='Подставляю данные в формулу расхода.';
 input.quizAnswers['mechanics-video:m18-q1']={choice:'a',answeredAt:'2026-10-25'};
 input.practice['mechanics-video:m18:q1']='done';input.progress['mechanics-video:m18']=1;
 assert.deepEqual(plain(rules.normalize(JSON.parse(JSON.stringify(input)),courses)),input);
});

test('normalization rejects impossible dates, invalid choices and unknown records',()=>{
 const input=plain(rules.create(courses));
 input.cards['mechanics-video:m01:q0']={streak:1,due:'2026-02-30'};
 input.cards['mechanics-video:missing:q0']={streak:3,due:'2026-10-25'};
 input.plans['mechanics-video']={start:'2026-02-31',days:14};
 input.practice['mechanics-video:missing:q1']='done';input.progress['mechanics-video:m01']=99;
 input.quizAnswers['mechanics-video:m01-q1']={choice:'nonexistent'};
 input.quizAnswers['mechanics-video:missing']={choice:'a'};
 input.quizAnswers['mechanics-video:m01-q2']={choice:'a',answeredAt:'2026-02-30',correct:true};
 const clean=plain(rules.normalize(input,courses));
 assert.deepEqual(clean.cards,{});assert.deepEqual(clean.plans,{});assert.deepEqual(clean.practice,{});assert.deepEqual(clean.progress,{});
 assert.deepEqual(clean.quizAnswers,{'mechanics-video:m01-q2':{choice:'a'}});
 assert.equal(rules.date('2024-02-29'),true);assert.equal(rules.date('2026-02-29'),false);
 assert.equal(rules.valid({...input,progress:[]}),false);
});

test('a full export keeps every legacy and test draft within the import limit',()=>{
 const input=plain(rules.create(courses));
 for(const c of courses)for(const t of c.topics){
  const ids=[...t.questions.map((_,i)=>'q'+i),...t.learning.practice.map((_,i)=>'p'+i),...c.quizzes.filter(q=>q.topicId===t.id).map(q=>'quiz-'+q.id)];
  for(const id of ids)input.drafts[`${c.id}:${t.id}:${id}`]='я'.repeat(6000);
 }
 const json=JSON.stringify(input);assert.ok(Buffer.byteLength(json)<5*1024*1024);
 assert.deepEqual(plain(rules.normalize(JSON.parse(json),courses)).drafts,input.drafts);
});

test('legacy completed practice recovers the mastered status',()=>{
 const input=plain(rules.create(courses));delete input.practiceRuleVersion;
 const t=courses[0].topics[0];
 t.questions.forEach((_,i)=>input.practice['mechanics-video:m01:q'+i]='done');
 t.learning.practice.forEach((_,i)=>input.practice['mechanics-video:m01:p'+i]='done');
 assert.equal(rules.normalize(input,courses).progress['mechanics-video:m01'],3);
});

test('correct early reviews cannot turn one day into seven days',()=>{
 let card=rules.review(null,'known','2026-10-25');assert.equal(card.due,'2026-10-26');
 for(let i=0;i<4;i++)card=rules.review(card,'known','2026-10-25');
 assert.equal(card.streak,1);assert.equal(card.due,'2026-10-26');
 card=rules.review(card,'known','2026-10-26');assert.equal(card.due,'2026-10-29');
 card=rules.review(card,'known','2026-10-29');assert.equal(card.due,'2026-11-05');
 card=rules.review(card,'again','2026-10-30');assert.equal(card.streak,0);assert.equal(card.due,'2026-10-30');
 card=rules.review(card,'known','2026-10-30');assert.equal(card.streak,1);assert.equal(card.due,'2026-10-31');
});

test('all 23 topics have at least three distinct tests with solutions and formula references',()=>{
 assert.equal(quiz.validate(courses[0]),71);
 for(const t of courses[0].topics)assert.equal(quiz.questions(courses[0],t.id).length,['m08','m21'].includes(t.id)?4:3);
 const broken=plain(courses[0]);broken.quizzes[0].formulaIndices=[999];
 assert.throws(()=>quiz.validate(broken),/formula reference/);
 broken.quizzes[0].formulaIndices=[0];delete broken.quizzes[0].solution;
 assert.throws(()=>quiz.validate(broken),/Missing solution/);
});

test('test scoring uses the actual answer key and rejects empty or forged choices',()=>{
 const c=courses[0],answers={};
 for(const q of c.quizzes){
  assert.equal(quiz.grade(q,q.correct).correct,true);
  const wrong=q.options.find(o=>o.id!==q.correct).id;
  assert.equal(quiz.grade(q,wrong).correct,false);
  answers[quiz.key(c.id,q.id)]={choice:q.correct,correct:false};
 }
 assert.throws(()=>quiz.grade(c.quizzes[0],''),/Выберите/);
 assert.deepEqual(plain(quiz.result(c,answers)),{total:71,answered:71,correct:71,complete:true});
 answers[quiz.key(c.id,c.quizzes[0].id)]={choice:'forged',correct:true};
 assert.equal(quiz.result(c,answers).answered,70);assert.equal(quiz.result(c,answers).correct,70);
});

function appFixture(){
 const elements=new Map(),events=new Map(),storage=new Map();
 const makeElement=()=>({innerHTML:'',textContent:'',value:'',dataset:{},attributes:{},disabled:false,
  classList:{values:new Set(),add(v){this.values.add(v);},remove(v){this.values.delete(v);},contains(v){return this.values.has(v);},toggle(v,on){on?this.add(v):this.remove(v);}},
  addEventListener(){},focus(){},scrollIntoView(){},querySelectorAll(){return [];},setAttribute(k,v){this.attributes[k]=v;}});
 const element=selector=>{if(!elements.has(selector))elements.set(selector,makeElement());return elements.get(selector);};
 const context=vm.createContext({console,location:{hash:'#home',protocol:'http:'},confirm:()=>true,Blob,URL,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  document:{body:makeElement(),querySelector:element,querySelectorAll:()=>[],getElementById:id=>element('#'+id),addEventListener:(event,fn)=>{const key='document:'+event;events.set(key,[...(events.get(key)||[]),fn]);}},
  window:{scrollTo(){},addEventListener:(event,fn)=>{const key='window:'+event;events.set(key,[...(events.get(key)||[]),fn]);}},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}});
 vm.runInContext(content+'\n'+['classroom.js','quiz-engine.js','progress-state.js','lesson-ui.js','quiz-ui.js','app.js'].map(source).join('\n'),context);
 const run=code=>vm.runInContext(code,context);
 const dispatch=(type,target)=>{for(const fn of events.get('document:'+type)||[])fn({target});};
 const click=(selector,dataset={})=>dispatch('click',{closest:s=>s===selector?{dataset}:null});
 const choice=value=>dispatch('change',{name:'quiz-choice',value,matches:()=>false});
 return {context,element,events,storage,run,click,choice};
}

test('navigation has four study modes, scoped links and no secondary topic tabs',()=>{
 const app=appFixture();app.context.location.hash='#topic/m18';app.run('render()');
 assert.equal(app.run('navItems.length'),4);
 const header=app.element('#app').innerHTML;
 for(const mode of ['tests','cards','oral'])assert.ok(header.includes(`href="#${mode}/m18"`));
 assert.doesNotMatch(header,/class="sidebar|data-action="menu"/);
 const lesson=app.element('#main').innerHTML;
 assert.doesNotMatch(lesson,/lesson-tabs|tablist|lesson-roadmap|data-practice-grade/);
 assert.equal((lesson.match(/class="formula-card"/g)||[]).length,app.run("course().topics.find(t=>t.id==='m18').formulas.length"));
 assert.match(lesson,/id="formula-m18-0"/);assert.match(lesson,/id="topic-derivations"/);
 app.context.location.hash='#topic/m18/check';assert.equal(app.run('route().page'),'tests');
 app.context.location.hash='#cards';assert.match(app.run('flashPage()'),/Карточки по темам/);
 app.context.location.hash='#tests';assert.match(app.run('testPage()'),/Тесты по темам/);
});

test('a checked test answer locks, persists, and resumes at the next unanswered task',()=>{
 const app=appFixture();app.context.location.hash='#tests/m18';app.run("startQuiz('m18');render()");
 app.click('[data-quiz-submit]');assert.equal(app.run('Object.keys(state.quizAnswers).length'),0);
 const correct=app.run("course().quizzes.find(q=>q.id===quizSession.ids[0]).correct");
 app.choice(correct);app.click('[data-quiz-submit]');
 assert.equal(app.run('Object.keys(state.quizAnswers).length'),1);
 assert.equal(app.run("state.progress['mechanics-video:m18']"),1);
 assert.match(app.element('#main').innerHTML,/<fieldset class="quiz-options" disabled/);
 assert.match(app.element('#main').innerHTML,/Правильный ответ/);
 assert.match(app.element('#main').innerHTML,/#topic\/m18\/formula-/);
 app.choice(correct==='a'?'b':'a');app.click('[data-quiz-submit]');
 assert.equal(app.run("state.quizAnswers['mechanics-video:m18-q1'].choice"),correct);
 assert.ok(app.storage.get('colloquium.study.video.v1').includes('quizAnswers'));
 app.run("quizSession=null;testPage('m18')");assert.equal(app.run('quizSession.index'),1);
});

test('retrying test errors preserves correct answers and leaves readiness as self-assessment',()=>{
 const app=appFixture();app.context.location.hash='#tests/m01';
 app.run("for(const q of QuizLogic.questions(course(),'m01'))state.quizAnswers[quizScopeKey(q.id)]={choice:q.correct};const first=course().quizzes[0];state.quizAnswers[quizScopeKey(first.id)]={choice:first.options.find(o=>o.id!==first.correct).id};startQuiz('m01');");
 assert.equal(app.run('quizSession.index'),3);assert.match(app.run("testPage('m01')"),/Верно 2 из 3/);
 app.run("startQuiz('m01','errors')");assert.equal(app.run('quizSession.ids.length'),1);assert.equal(app.run('Object.keys(state.quizAnswers).length'),2);
 app.choice(app.run('course().quizzes[0].correct'));app.click('[data-quiz-submit]');app.click('[data-quiz-next]');
 assert.match(app.element('#main').innerHTML,/Верно 3 из 3/);assert.notEqual(app.run("state.progress['mechanics-video:m01']"),3);
 app.run("startQuiz('m01','all')");assert.equal(app.run('Object.keys(state.quizAnswers).length'),0);
});

test('a test error marks the topic for review',()=>{
 const app=appFixture();app.context.location.hash='#tests/m02';app.run("startQuiz('m02');state.progress['mechanics-video:m02']=3;");
 app.choice(app.run("course().quizzes.find(q=>q.id===quizSession.ids[0]).options.find(o=>o.id!==course().quizzes.find(q=>q.id===quizSession.ids[0]).correct).id"));
 app.click('[data-quiz-submit]');assert.equal(app.run("state.progress['mechanics-video:m02']"),2);
});

test('short card sessions stay in the selected topic and retry only failed cards',()=>{
 const app=appFixture();app.context.location.hash='#cards/m18';app.run("makeDeck('all','m18',10)");
 assert.ok(app.run("flash.deck.every(c=>c.t.id==='m18')"));assert.equal(app.run('flash.deck.length'),Math.min(10,courses[0].topics.find(t=>t.id==='m18').questions.length));
 app.run("flash.deck=flash.deck.slice(0,2);globalThis.failedCard=flash.deck[0].id;flash.revealed=true;gradeCard('again');flash.revealed=true;gradeCard('known');retryCards();");
 assert.equal(app.run('flash.deck.length'),1);assert.equal(app.run('flash.deck[0].id'),app.context.failedCard);assert.equal(app.run('flash.index'),0);
});

test('a new oral attempt hides the model and clears old criteria',()=>{
 const app=appFixture();app.run("newOral('m18');oral.duration=180;oral.remaining=0;oral.show=true;oral.checks.fill(true);resetOralAttempt();");
 assert.equal(app.run('oral.remaining'),180);assert.equal(app.run('oral.topicId'),'m18');assert.equal(app.run('oral.show'),false);assert.equal(app.run('oral.checks.some(Boolean)'),false);
 app.run('oral=null;newOral()');assert.equal(app.run('oral.topicId'),'m01');
});

test('cancelled imports can select the same file; successful imports clear stale test sessions',async()=>{
 const app=appFixture();app.run("state.drafts['mechanics-video:m01:q0']='Мой ответ';restoreDrafts();globalThis.payload=JSON.stringify(state);startQuiz('m01');");
 app.context.confirm=()=>false;
 const target={files:[{size:100,text:async()=>app.context.payload}],value:'progress.json'};
 app.context.importEvent={target};await app.run('importProgress(importEvent)');
 assert.equal(target.value,'');assert.equal(app.run("lessonDrafts['mechanics-video:m01:q0']"),'Мой ответ');assert.ok(app.run('quizSession'));
 app.context.confirm=()=>true;target.value='progress.json';await app.run('importProgress(importEvent)');
 assert.equal(target.value,'');assert.equal(app.run("state.drafts['mechanics-video:m01:q0']"),'Мой ответ');assert.equal(app.run('quizSession'),null);
 app.run('state=baseState();restoreDrafts();');assert.equal(app.run('Object.keys(lessonDrafts).length'),0);
});
