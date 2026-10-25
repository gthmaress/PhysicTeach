import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=name=>fs.readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const content=source('content.js')+'\n'+source('learning.js');
const model=vm.createContext({});
vm.runInContext(content+'\n'+source('progress-state.js')+'\nglobalThis.rules=StudyState;globalThis.courses=COURSES;',model);
const {rules,courses}=model;

test('old backups retain topic status, practice, cards and plans',()=>{
 const old={version:1,course:'mechanics',progress:{'mechanics:m01':2},cards:{'mechanics:m01:q0':{streak:2,due:'2026-10-28',updated:'2026-10-25'}},plans:{mechanics:{start:'2026-10-25',days:14}},last:{mechanics:'m01'},practice:{'mechanics:m01:p0':'again'}};
 const clean=plain(rules.normalize(old,courses));
 for(const key of ['progress','cards','plans','last','practice'])assert.deepEqual(clean[key],old[key]);
 assert.equal(clean.lastSections.mechanics,'theory');
 assert.deepEqual(clean.drafts,{});
});

test('new backups round-trip drafts and the last study section',()=>{
 const input=plain(rules.create(courses));
 input.last.mechanics='m18';input.lastSections.mechanics='check';input.drafts['mechanics:m18:p0']='qV ∝ R⁴/l; множитель 16/2 = 8.';
 input.practice['mechanics:m18:p0']='done';input.progress['mechanics:m18']=1;
 assert.deepEqual(plain(rules.normalize(JSON.parse(JSON.stringify(input)),courses)),input);
});

test('normalization rejects nonexistent dates and out-of-course records',()=>{
 const input=plain(rules.create(courses));
 input.cards['mechanics:m01:q0']={streak:1,due:'2026-02-30'};
 input.cards['mechanics:missing:q0']={streak:3,due:'2026-10-25'};
 input.plans.mechanics={start:'2026-02-31',days:14};
 input.practice['mechanics:missing:p0']='done';input.progress['mechanics:m01']=99;
 const clean=plain(rules.normalize(input,courses));
 assert.deepEqual(clean.cards,{});assert.deepEqual(clean.plans,{});assert.deepEqual(clean.practice,{});assert.deepEqual(clean.progress,{});
 assert.equal(rules.date('2024-02-29'),true);assert.equal(rules.date('2026-02-29'),false);
 assert.equal(rules.valid({...input,progress:[]}),false);
});

test('a full export keeps every draft the interface can create',()=>{
 const input=plain(rules.create(courses));
 for(const c of courses)for(const t of c.topics){
  const ids=[...t.questions.map((_,i)=>'q'+i),...t.learning.practice.map((_,i)=>'p'+i)];
  for(const id of ids)input.drafts[`${c.id}:${t.id}:${id}`]='я'.repeat(6000);
 }
 const json=JSON.stringify(input);assert.ok(Buffer.byteLength(json)<5*1024*1024);
 assert.deepEqual(plain(rules.normalize(JSON.parse(json),courses)).drafts,input.drafts);
});

test('legacy completed practice recovers the mastered status',()=>{
 const input=plain(rules.create(courses));delete input.practiceRuleVersion;
 const t=courses[0].topics[0];
 t.questions.forEach((_,i)=>input.practice['mechanics:m01:q'+i]='done');
 t.learning.practice.forEach((_,i)=>input.practice['mechanics:m01:p'+i]='done');
 assert.equal(rules.normalize(input,courses).progress['mechanics:m01'],3);
});

test('correct early reviews cannot turn one day into seven days',()=>{
 let card=rules.review(null,'known','2026-10-25');
 assert.equal(card.due,'2026-10-26');
 for(let i=0;i<4;i++)card=rules.review(card,'known','2026-10-25');
 assert.equal(card.streak,1);assert.equal(card.due,'2026-10-26');
 card=rules.review(card,'known','2026-10-26');assert.equal(card.due,'2026-10-29');
 card=rules.review(card,'known','2026-10-29');assert.equal(card.due,'2026-11-05');
 card=rules.review(card,'again','2026-10-30');assert.equal(card.streak,0);assert.equal(card.due,'2026-10-30');
 card=rules.review(card,'known','2026-10-30');assert.equal(card.streak,1);assert.equal(card.due,'2026-10-31');
});

function appFixture(){
 const elements=new Map(),events=new Map(),storage=new Map();
 const makeElement=()=>({innerHTML:'',textContent:'',value:'',inert:false,dataset:{},attributes:{},
  classList:{values:new Set(),add(v){this.values.add(v);},remove(v){this.values.delete(v);},contains(v){return this.values.has(v);},toggle(v,on){on?this.add(v):this.remove(v);}},
  addEventListener(){},focus(){},scrollIntoView(){},getClientRects(){return [1];},querySelectorAll(){return [];},setAttribute(k,v){this.attributes[k]=v;}});
 const element=selector=>{if(selector==='.sidebar.open')return element('.sidebar').classList.contains('open')?element('.sidebar'):null;if(!elements.has(selector))elements.set(selector,makeElement());return elements.get(selector);};
 const body=makeElement(),location={hash:'#home',protocol:'http:'};
 const context=vm.createContext({console,location,confirm:()=>true,Blob,URL,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  document:{body,querySelector:element,querySelectorAll:()=>[],getElementById:id=>element('#'+id),addEventListener:(event,fn)=>{const key='document:'+event;events.set(key,[...(events.get(key)||[]),fn]);}},
  window:{matchMedia:()=>({matches:false}),scrollTo(){},addEventListener:(event,fn)=>events.set('window:'+event,[fn])},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}});
 vm.runInContext(content+'\n'+source('classroom.js')+'\n'+source('progress-state.js')+'\n'+source('lesson-ui.js')+'\n'+source('app.js'),context);
 return {context,element,events,storage,run:code=>vm.runInContext(code,context)};
}

test('short card sessions stay in the selected topic and retry only failed cards',()=>{
 const app=appFixture();app.context.location.hash='#cards/m18';
 app.run("makeDeck('all','m18',10)");
 assert.ok(app.run("flash.deck.every(c=>c.t.id==='m18')"));
 assert.equal(app.run('flash.deck.length'),8);
 app.context.location.hash='#cards';app.run("makeDeck('all',null,10)");assert.equal(app.run('flash.deck.length'),10);
 app.run("flash.deck=flash.deck.slice(0,2);globalThis.failedCard=flash.deck[0].id;flash.revealed=true;gradeCard('again');flash.revealed=true;gradeCard('known');retryCards();");
 assert.equal(app.run('flash.deck.length'),1);assert.equal(app.run('flash.deck[0].id'),app.context.failedCard);assert.equal(app.run('flash.index'),0);
});

test('a new oral attempt hides the model and clears old criteria',()=>{
 const app=appFixture();app.run("newOral('m18');oral.duration=180;oral.remaining=0;oral.show=true;oral.checks.fill(true);resetOralAttempt();");
 assert.equal(app.run('oral.remaining'),180);assert.equal(app.run('oral.topicId'),'m18');assert.equal(app.run('oral.show'),false);assert.equal(app.run('oral.checks.some(Boolean)'),false);
});

test('closing or widening the mobile drawer restores the workspace',()=>{
 const app=appFixture();app.element('.workspace').inert=true;app.element('.sidebar').classList.add('open');
 app.events.get('window:resize')[0]();
 assert.equal(app.element('.workspace').inert,false);assert.equal(app.element('.sidebar').classList.contains('open'),false);
});

test('cancelled imports can select the same file again and keep current drafts',async()=>{
 const app=appFixture();app.run("state.drafts['mechanics:m01:q0']='Мой ответ';restoreDrafts();globalThis.payload=JSON.stringify(state);");
 app.context.confirm=()=>false;
 const target={files:[{size:100,text:async()=>app.context.payload}],value:'progress.json'};
 app.context.importEvent={target};await app.run('importProgress(importEvent)');
 assert.equal(target.value,'');assert.equal(app.run("lessonDrafts['mechanics:m01:q0']"),'Мой ответ');
 app.context.confirm=()=>true;
 target.value='progress.json';await app.run('importProgress(importEvent)');
 assert.equal(target.value,'');assert.equal(app.run("state.drafts['mechanics:m01:q0']"),'Мой ответ');
 app.run('state=baseState();restoreDrafts();');assert.equal(app.run('Object.keys(lessonDrafts).length'),0);
});

test('practice navigation keeps the right target when a task group is absent',()=>{
 const app=appFixture();
 const html=app.run("lessonPractice({id:'sample',questions:[],learning:{practice:[{kind:'Вывод',question:'q',answer:'a',hint:'h',solution:['s']}]}})");
 assert.match(html,/data-practice-jump="2"/);assert.match(html,/id="practice-section-2"/);
});

test('completing every task marks the topic mastered; an error marks it for review',()=>{
 const app=appFixture();app.context.location.hash='#topic/m18/check';
 app.run("globalThis.taskKeys=practiceItems(course().topics.find(t=>t.id==='m18')).map(p=>'mechanics:m18:'+p.id);for(const key of taskKeys.slice(0,-1))state.practice[key]='done';");
 const key=app.context.taskKeys.at(-1);
 function grade(value){
  const button={dataset:{practiceKey:key,practiceGrade:value}};
  const event={target:{closest:selector=>selector==='[data-practice-grade]'?button:null}};
  app.events.get('document:click')[0](event);
 }
 grade('done');assert.equal(app.run("state.progress['mechanics:m18']"),3);assert.equal(app.element('#topic-status').value,'3');
 grade('again');assert.equal(app.run("state.progress['mechanics:m18']"),2);assert.equal(app.element('#topic-status').value,'2');
});
