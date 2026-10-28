'use strict';
const $ = (s, root=document) => root.querySelector(s);
const esc = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topicCount=n=>n+' '+(n%100>=11&&n%100<=14?'тем':n%10===1?'тема':n%10>=2&&n%10<=4?'темы':'тем');
const cardCount=n=>n+' '+(n%100>=11&&n%100<=14?'карточек':n%10===1?'карточка':n%10>=2&&n%10<=4?'карточки':'карточек');
const ICONS={arrow:'M4 12h16m-6-6 6 6-6 6',book:'M4 4h6a2 2 0 0 1 2 2v14a3 3 0 0 0-3-2H4V4Zm16 0h-6a2 2 0 0 0-2 2m0 14a3 3 0 0 1 3-2h5V4Z',formula:'M5 5h14M9 5l6 14M5 19h14',cards:'M7 7h13v14H7zM3 16V3h13',mic:'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V5Zm-3 5v1a6 6 0 0 0 12 0v-1m-6 7v5m-4 0h8',calendar:'M4 5h16v16H4zM8 2v6m8-6v6M4 10h16',search:'m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',menu:'M4 6h16M4 12h16M4 18h16',check:'m5 12 4 4L19 6',download:'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6',bulb:'M8 17c0-3-3-4-3-8a7 7 0 0 1 14 0c0 4-3 5-3 8H8Zm1 3h6m-5 3h4',close:'m5 5 14 14M5 19 19 5',clock:'M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'};
const icon=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]||ICONS.book}"/></svg>`;
let mathFailures=[];
function math(tex,display=false){try{if(!window.katex)throw new Error('KaTeX unavailable');return katex.renderToString(tex,{displayMode:display,throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml'});}catch(e){mathFailures.push({tex,error:e.message});return `<span class="math-error">${esc(tex)}</span>`;}}
const vectorLetters={'ω':'\\omega','ε':'\\varepsilon','φ':'\\varphi'};
function rich(text){return String(text).split(/(\\\([\s\S]*?\\\))/g).map(s=>s.startsWith('\\(')?`<span class="inline-math">${math(s.slice(2,-2))}</span>`:s.split(/([A-Za-zА-Яа-яωεφ]⃗)/g).map(part=>/^[A-Za-zА-Яа-яωεφ]⃗$/.test(part)?`<span class="inline-math">${math('\\vec{'+(vectorLetters[part[0]]||part[0])+'}')}</span>`:esc(part)).join('')).join('');}
const KEY='colloquium.study.video.v1';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const localDate=s=>new Date(s+'T12:00:00');
const plusDays=(s,n)=>{const d=localDate(s);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const dayDifference=(a,b)=>Math.round((localDate(b)-localDate(a))/86400000);
const baseState=()=>StudyState.create(COURSES);
function validState(s){return StudyState.valid(s);}
let storageOK=true,state;
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');state=validState(s)?StudyState.normalize(s,COURSES):baseState();}catch(e){state=baseState();storageOK=false;}
Object.assign(lessonDrafts,state.drafts);
if(!COURSES.some(c=>c.id===state.course))state.course=COURSES[0].id;
const course=()=>COURSES.find(c=>c.id===state.course)||COURSES[0];
const topicKey=t=>`${course().id}:${t.id}`;
const status=t=>Math.max(0,Math.min(3,Number(state.progress[topicKey(t)])||0));
const statusNames=['Не начинал','Изучаю','Повторить','Могу объяснить'];
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;toast('Не удалось сохранить на устройстве. Экспортируйте прогресс в настройках.');}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>el.classList.remove('visible'),4500);}
let viewStatus='all',query='',flash=null,oral=null,timerId=null,cardSettingsOpen=false;
function route(){const [page,id,section]=location.hash.slice(1).split('/');if(page==='topic'&&section==='check')return {page:'tests',id};if(page==='plan'||page==='formulas')return {page:'home'};return {page:page||'home',id,section};}
function link(page,id){return `#${page}${id?'/'+id:''}`;}
const navItems=[['home','book','Темы'],['tests','check','Тесты'],['cards','cards','Карточки'],['oral','mic','Устный ответ']];
function shell(){
 const c=course(),r=route(),t=c.topics.find(t=>t.id===r.id);
 document.title=(t?t.title:navItems.find(item=>item[0]===r.page)?.[2]||'Физика')+' · Физика';
 document.body.classList.remove('drawer-open');document.body.classList.toggle('large-text',!!state.largeText);
 $('#app').innerHTML=`<div class="shell"><div class="workspace"><header class="topbar"><a class="brand" href="#home"><span class="brand-mark">φ</span><span><strong>Физика</strong><small>${esc(c.title)}</small></span></a><nav class="topnav" aria-label="Основная навигация">${navItems.map(([p,i,name])=>{const href=p==='home'?'#home':'#'+p+(t?'/'+t.id:'');const active=r.page===p||(p==='home'&&r.page==='topic');return `<a href="${href}" class="${active?'active':''}" ${active?'aria-current="page"':''}>${name}</a>`;}).join('')}</nav><details class="utility-menu"><summary>Сохранение</summary><div class="utility-options"><button data-action="export">Экспорт прогресса</button><button data-action="import">Импорт прогресса</button><a href="Механика-офлайн.html" download="Физика.html" data-action="offline">Скачать офлайн</a><button data-action="large-text" aria-pressed="${!!state.largeText}">Увеличенный текст</button><a href="#settings">Данные и сброс</a></div></details><input type="file" id="progress-file" accept="application/json,.json" hidden></header><main id="main" tabindex="-1" class="content"></main></div></div>`;
}
const context=(label,badge='')=>`<div class="context"><div class="breadcrumbs"><a href="#home">${esc(course().subtitle||course().title)}</a><span>/</span><span>${esc(label)}</span></div>${badge}</div>`;
const footer=()=>'<footer class="footer"><a href="#settings">Данные и сохранение</a></footer>';
const searchField=(placeholder='Найти тему или понятие')=>`<label class="searchbox">${icon('search',15)}<span class="sr-only">${placeholder}</span><input type="search" id="search" placeholder="${placeholder}" value="${esc(query)}" autocomplete="off"></label>`;

const matches=(t,q)=>JSON.stringify([t.title,t.intro,t.definitions,t.formulas,t.derivations,t.questions,t.learning]).toLocaleLowerCase('ru').includes(q.toLocaleLowerCase('ru'));
const filtered=()=>course().topics.filter(t=>(viewStatus==='all'||status(t)===Number(viewStatus))&&matches(t,query));
function home(){
 const c=course(),learned=c.topics.filter(t=>status(t)===3).length,last=c.topics.find(t=>t.id===state.last[c.id]);
 return `<section class="home-head"><div><h1>${esc(c.title)}</h1><p>${topicCount(c.topics.length)} · могу объяснить ${learned} из ${c.topics.length}</p></div>${last?`<a class="btn secondary" href="#topic/${last.id}">Продолжить</a>`:''}</section>${COURSES.length>1?`<label class="course-picker">Курс<select id="course-select">${COURSES.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></label>`:''}<div class="home-filters">${searchField()}<label class="readiness-filter">Готовность<select id="topic-filter"><option value="all" ${viewStatus==='all'?'selected':''}>Все темы</option>${statusNames.map((name,i)=>`<option value="${i}" ${viewStatus===String(i)?'selected':''}>${esc(name)}</option>`).join('')}</select></label></div><div id="topic-results">${topicCards()}</div>${footer()}`;
}
function topicCards(){
 const list=filtered();if(!list.length)return '<div class="empty"><p>Темы не найдены.</p><button class="btn secondary" data-action="clear-filters">Сбросить фильтры</button></div>';
 return course().groups.map((group,i)=>{const topics=list.filter(t=>t.group===i);return topics.length?`<section class="topic-group"><h2>${esc(group)}</h2><div class="topic-grid">${topics.map(t=>`<a class="topic-card" href="#topic/${t.id}"><span class="card-number">${String(course().topics.indexOf(t)+1).padStart(2,'0')}</span><span><strong>${esc(t.title)}</strong><small>${statusNames[status(t)]}</small></span></a>`).join('')}</div></section>`:'';}).join('');
}
const oralSummary=t=>'<p>'+rich(t.oral)+'</p>';
const mistakes=t=>`<aside class="warning-box"><h3>Частые ошибки</h3><ul>${t.mistakes.map(m=>`<li>${rich(m)}</li>`).join('')}</ul></aside>`;
function topicPage(id){
 const c=course(),t=c.topics.find(t=>t.id===id);if(!t)return '<h1>Тема не найдена</h1><a href="#home">К темам</a>';
 state.last[c.id]=t.id;state.lastSections[c.id]='theory';save();const index=c.topics.indexOf(t);
 return `<a class="topic-return" href="#home">← Все темы</a><div class="lesson-heading"><span class="eyebrow">Тема ${index+1} · ${esc(c.groups[t.group])}</span><label class="status-control">Готовность<select id="topic-status" data-topic="${t.id}">${statusNames.map((s,i)=>`<option value="${i}" ${status(t)===i?'selected':''}>${s}</option>`).join('')}</select></label></div><h1 class="page-title">${esc(t.title)}</h1><p class="page-intro">${rich(t.learning?.intuition||t.definitions[0][1])}</p><a class="derivation-jump" href="#topic/${t.id}/derive">К выводам формул ↓</a><article class="article-body">${lessonBody(t)}</article><div class="lesson-modes"><a class="btn" href="#tests/${t.id}">Решить тест</a><a class="btn secondary" href="#cards/${t.id}">Карточки</a><a class="btn secondary" href="#oral/${t.id}">Устный ответ</a></div><div class="topic-pagination">${index>0?`<a href="#topic/${c.topics[index-1].id}">← Предыдущая тема</a>`:''}${index<c.topics.length-1?`<a class="next" href="#topic/${c.topics[index+1].id}">Следующая тема →</a>`:''}</div>${footer()}`;
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeDeck(filter='all',topicId=null,limit=10){
 const deck=[];for(const t of course().topics){
  if(topicId&&t.id!==topicId)continue;
  const all=[...t.questions.map(([q,a],i)=>({q,a,suffix:'q'+i})),...(t.learning?.practice||[]).map((p,i)=>({q:p.question,a:p.answer,suffix:'p'+i}))];
  for(const {q,a,suffix} of all){const id=topicKey(t)+':'+suffix,review=state.cards[id];
   if(filter==='due'&&review?.due&&review.due>today())continue;
   deck.push({id,t,q,a});
  }
 }
 const shuffled=shuffle(deck),size=[10,20,0].includes(limit)?limit:10;
 flash={filter,topicId,limit:size,available:shuffled.length,deck:size?shuffled.slice(0,size):shuffled,index:0,revealed:false,known:0,again:0,againIds:[]};
}
function retryCards(){
 if(!flash?.againIds.length)return;
 const failed=new Set(flash.againIds),deck=flash.deck.filter(card=>failed.has(card.id));
 flash={...flash,deck:shuffle(deck),index:0,revealed:false,known:0,again:0,againIds:[],retry:true};render(false);
}
function cardHub(){return '<h1 class="page-title">Карточки по темам</h1><div class="test-topic-list">'+course().topics.map((t,i)=>'<a class="test-topic" href="#cards/'+t.id+'"><span class="card-number">'+String(i+1).padStart(2,'0')+'</span><span><strong>'+esc(t.title)+'</strong><small>'+(t.questions.length+(t.learning?.practice?.length||0))+' карточек</small></span><span>→</span></a>').join('')+'</div>'+footer();}
function flashPage(id){
 const topic=course().topics.find(t=>t.id===id);if(!topic)return cardHub();const scope=topic.id;
 if(!flash||flash.topicId!==scope)makeDeck('due',scope);
 const f=flash,current=f.deck[f.index];
 const scopeOptions=course().topics.map((t,i)=>'<option value="'+t.id+'" '+(scope===t.id?'selected':'')+'>'+String(i+1)+'. '+esc(t.title)+'</option>').join('');
 return '<a class="topic-return" href="#cards">← Все темы карточек</a>'+ '<h1 class="page-title">Карточки для самопроверки</h1><p class="page-intro">Вспомните ответ, затем откройте образец и оцените себя.</p>'+
 '<details class="card-settings" id="card-settings" '+(cardSettingsOpen?'open':'')+'><summary>Настроить набор · '+(topic?'Билет '+(course().topics.indexOf(topic)+1):'Весь коллоквиум')+' · '+cardCount(f.deck.length)+'</summary><div class="card-controls"><label>Тема<select id="deck-topic">'+scopeOptions+'</select></label><label>Набор<select id="deck-filter"><option value="due" '+(f.filter==='due'?'selected':'')+'>Новые и пора повторить</option><option value="all" '+(f.filter==='all'?'selected':'')+'>Все вопросы</option></select></label><label>За одно занятие<select id="deck-size">'+[10,20,0].map(n=>'<option value="'+n+'" '+(f.limit===n?'selected':'')+'>'+(n?'До '+n+' карточек':'Без ограничения')+'</option>').join('')+'</select></label><button class="btn secondary" data-action="shuffle">Новый набор</button></div>'+
 '<p class="tip">«Помню» назначает повторение через 1, 3 или 7 дней. Дополнительный правильный ответ до назначенного срока не увеличивает интервал. «Нужно повторить» возвращает карточку на сегодня.</p></details><div class="flash-wrap">'+
 (current?'<div class="flash-progress"><span>'+(f.retry?'Повтор ошибок · ':'')+'Карточка '+(f.index+1)+' из '+f.deck.length+'</span><a href="#tests/'+current.t.id+'">К тесту темы →</a></div><div class="progress-track"><div class="progress-fill" style="width:'+f.index/f.deck.length*100+'%"></div></div><div class="flash-card" style="margin-top:17px"><div class="eyebrow">Билет '+(course().topics.indexOf(current.t)+1)+' · '+esc(current.t.title)+'</div><h2>'+rich(current.q)+'</h2>'+(f.revealed?'<div class="flash-answer">'+rich(current.a)+'</div>':'<p class="small muted">Сначала сформулируйте свой ответ.</p>')+'</div><div class="flash-actions">'+(f.revealed?'<button class="btn secondary" data-grade="again">Нужно повторить</button><button class="btn" data-grade="known">Помню</button>':'<button class="btn" data-action="reveal">Показать ответ</button>')+'</div>':
 '<div class="flash-card"><div class="eyebrow">'+(f.deck.length?'Итоги занятия':'Набор пуст')+'</div><h2>'+(f.deck.length?'Сессия завершена':'В этом наборе пока нет карточек')+'</h2><p class="muted">'+(f.deck.length?'Помню: '+f.known+' · Повторить: '+f.again+'.<br>Это результат карточек, а не оценка всей темы.':'Карточки ещё не подошли к сроку или их нет в выбранной теме. Можно выбрать все вопросы.')+'</p><div class="flash-actions">'+(f.againIds.length?'<button class="btn" data-action="retry-cards">Повторить ошибки ('+f.againIds.length+')</button>':'')+'<button class="btn secondary" data-action="shuffle">Следующий набор</button><button class="btn secondary" data-action="all-cards">Все вопросы</button><a class="btn text" href="'+(scope?'#topic/'+scope:'#home')+'">К теории темы</a></div></div>')+'</div>'+footer();
}
function gradeCard(value){
 if(!flash?.revealed)return;const card=flash.deck[flash.index];if(!card)return;
 if(value==='known')flash.known++;else{flash.again++;flash.againIds.push(card.id);state.progress[topicKey(card.t)]=2;}
 state.cards[card.id]=StudyState.review(state.cards[card.id],value,today());
 flash.index++;flash.revealed=false;save();render(false);
}
function stopTimer(){if(timerId){clearInterval(timerId);timerId=null;}if(oral)oral.running=false;}
function newOral(id){stopTimer();const all=course().topics,t=id?all.find(t=>t.id===id):null;const chosen=t||all[0];oral={topicId:chosen.id,remaining:120,duration:120,running:false,show:false,checks:Array(chosen.learning?.oralAnswer?.length||6).fill(false)};}
function resetOralAttempt(){stopTimer();if(!oral)return;oral.remaining=oral.duration;oral.show=false;oral.checks=Array(course().topics.find(t=>t.id===oral.topicId)?.learning?.oralAnswer?.length||6).fill(false);}
const timeString=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function oralPage(id){if(!oral||(id&&oral.topicId!==id))newOral(id);const t=course().topics.find(t=>t.id===oral.topicId);return `<h1 class="page-title">Устный ответ по билету</h1><p class="page-intro">Расскажите тему, затем сравните с образцом.</p><label class="oral-ticket-label">Выбрать билет<select id="oral-ticket" ${oral.running?'disabled':''}>${course().topics.map((x,i)=>`<option value="${x.id}" ${x.id===t.id?'selected':''}>${i+1}. ${esc(x.title)}</option>`).join('')}</select></label><section class="oral-card"><div class="oral-top"><span class="badge green">Билет ${String(course().topics.indexOf(t)+1).padStart(2,'0')}</span><output class="timer" id="timer" aria-label="Осталось времени" aria-live="off">${timeString(oral.remaining)}</output></div><h2>${esc(t.title)}</h2><div class="mode-toolbar"><label class="small muted">Время &nbsp;<select id="oral-duration" ${oral.running?'disabled':''}>${[60,120,180].map(s=>`<option value="${s}" ${oral.duration===s?'selected':''}>${s/60} мин</option>`).join('')}</select></label><div class="flash-actions" style="margin:0"><button class="btn" data-action="timer">${oral.running?'Пауза':oral.remaining===0?'Начать заново':oral.remaining<oral.duration?'Продолжить':'Начать ответ'}</button><button class="btn secondary" data-action="new-ticket">Случайный билет</button>${oral.remaining<oral.duration||oral.show?'<button class="btn text" data-action="oral-retry">Новая попытка</button>':''}</div></div><button class="btn secondary" data-action="oral-reveal">${oral.show?'Скрыть пример ответа':'Завершить и сравнить с примером'}</button>${oral.show?oralReference(t):''}</section>${footer()}`;}
function oralReference(t){const model=t.learning?.oralAnswer;if(!model)return '<div style="margin-top:20px">'+oralSummary(t)+'</div>';return `<section class="oral-reference"><h2>Пример правильного ответа</h2><div class="oral-model-answer">${model.map((p,i)=>`<p><span class="oral-paragraph-number">${i+1}</span>${rich(p.answer)}</p>`).join('')}</div><h2 style="margin-top:28px">Проверка своего ответа</h2><p>Отметьте то, что объяснили без подсказки.</p><div class="oral-score" id="oral-score">Объяснил самостоятельно: ${oral.checks.filter(Boolean).length} из ${model.length} пунктов</div>${model.map((p,i)=>`<article class="oral-criterion"><h3>${i+1}. ${esc(p.criterion)}</h3><label><input type="checkbox" data-oral-check="${i}" ${oral.checks[i]?'checked':''}>${esc(p.check)}</label></article>`).join('')}<div class="lesson-next"><div class="flash-actions" style="justify-content:flex-start"><a class="btn secondary" href="#topic/${t.id}/derive">Открыть выводы формул</a><a class="btn secondary" href="#tests/${t.id}">Решить тест</a><button class="btn" data-oral-status="3">Тему могу объяснить</button><button class="btn secondary" data-oral-status="2">Тему нужно повторить</button></div></div></section>`;}
function toggleTimer(){if(oral.running){stopTimer();render(false);return;}if(oral.remaining<=0||oral.show)resetOralAttempt();oral.running=true;oral.deadline=Date.now()+oral.remaining*1000;render(false);timerId=setInterval(()=>{oral.remaining=Math.max(0,Math.ceil((oral.deadline-Date.now())/1000));const output=$('#timer');if(output)output.textContent=timeString(oral.remaining);if(!oral.remaining){stopTimer();toast('Время вышло. Закончите мысль и проверьте ответ.');render(false);}},250);}

function settingsPage(){return `<h1 class="page-title">Сохранение прогресса</h1><p class="page-intro">Экспортируйте JSON, передайте файл на другое устройство и импортируйте его там. Импорт заменит местные данные после подтверждения.</p><div class="settings-actions"><button class="btn" data-action="export">Экспорт прогресса</button><button class="btn secondary" data-action="import">Импорт прогресса</button><a class="btn secondary" href="Механика-офлайн.html" download="Физика.html" data-action="offline">Скачать офлайн</a></div><p class="tip">${storageOK?'Данные сохраняются в этом браузере.':'Хранилище недоступно — сохраните экспорт перед закрытием.'}</p><button class="btn text" data-action="reset">Сбросить весь прогресс</button>${footer()}`;}
function render(scroll=true){
 const r=route();if(r.page!=='oral')stopTimer();shell();const main=$('#main');
 if(r.page==='topic')main.innerHTML=topicPage(r.id);else if(r.page==='tests')main.innerHTML=testPage(r.id);else if(r.page==='cards')main.innerHTML=flashPage(r.id);else if(r.page==='oral')main.innerHTML=oralPage(r.id);else if(r.page==='settings')main.innerHTML=settingsPage();else main.innerHTML=home();
 bindPage();if(scroll){window.scrollTo(0,0);main.focus({preventScroll:true});}
 if(r.page==='topic'&&r.section){const target=r.section==='derive'?'topic-derivations':r.section.startsWith('formula-')?'formula-'+r.id+'-'+r.section.slice(8):null;if(target)document.getElementById(target)?.scrollIntoView({block:'start'});}
}
function updateSearch(){if(route().page==='home')$('#topic-results').innerHTML=topicCards();}
function bindPage(){$('#course-select')?.addEventListener('change',e=>{state.course=e.target.value;save();flash=null;oral=null;quizSession=null;query='';viewStatus='all';stopTimer();location.hash='home';render();});$('#card-settings')?.addEventListener('toggle',e=>{cardSettingsOpen=e.target.open;});$('#topic-filter')?.addEventListener('change',e=>{viewStatus=e.target.value;updateSearch();});$('#deck-topic')?.addEventListener('change',e=>{location.hash=e.target.value?'cards/'+e.target.value:'cards';});$('#deck-size')?.addEventListener('change',e=>{makeDeck(flash.filter,flash.topicId,Number(e.target.value));render(false);});$('#oral-ticket')?.addEventListener('change',e=>{newOral(e.target.value);location.hash='oral/'+e.target.value;});$('#search')?.addEventListener('input',e=>{query=e.target.value;updateSearch();});$('#topic-status')?.addEventListener('change',e=>{const t=course().topics.find(t=>t.id===e.target.dataset.topic);state.progress[topicKey(t)]=Number(e.target.value);save();});$('#deck-filter')?.addEventListener('change',e=>{makeDeck(e.target.value,flash.topicId,flash.limit);render(false);});$('#oral-duration')?.addEventListener('change',e=>{oral.duration=Number(e.target.value);resetOralAttempt();render(false);});$('#progress-file')?.addEventListener('change',importProgress);}
document.addEventListener('click',e=>{const skip=e.target.closest('.skip');if(skip){e.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});return;}const grade=e.target.closest('[data-grade]');if(grade){gradeCard(grade.dataset.grade);return;}const os=e.target.closest('[data-oral-status]');if(os){const t=course().topics.find(t=>t.id===oral.topicId);state.progress[topicKey(t)]=Number(os.dataset.oralStatus);save();toast('Самооценка сохранена');return;}const action=e.target.closest('[data-action]');if(!action)return;switch(action.dataset.action){case'clear-filters':query='';viewStatus='all';render(false);break;case'large-text':state.largeText=!state.largeText;save();document.body.classList.toggle('large-text',state.largeText);action.setAttribute('aria-pressed',String(state.largeText));break;case'reveal':flash.revealed=true;render(false);break;case'shuffle':makeDeck(flash?.filter||'all',flash?.topicId,flash?.limit);render(false);break;case'all-cards':makeDeck('all',flash?.topicId,flash?.limit);render(false);break;case'retry-cards':retryCards();break;case'oral-retry':resetOralAttempt();render(false);break;case'timer':toggleTimer();break;case'new-ticket':{const old=oral.topicId;const choices=course().topics.filter(t=>t.id!==old);newOral(choices[Math.floor(Math.random()*choices.length)]?.id);if(route().id){location.hash='oral';}else render(false);break;}case'oral-reveal':stopTimer();oral.show=!oral.show;render(false);break;case'export':download(JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'Прогресс-коллоквиум.json','application/json');break;case'import':$('#progress-file').click();break;case'reset':if(confirm('Удалить все отметки, результаты тестов, карточки и черновики на этом устройстве? Сначала можно экспортировать прогресс.')){state=baseState();restoreDrafts();save();flash=null;oral=null;quizSession=null;render(false);toast('Прогресс сброшен');}break;case'offline':if(location.protocol==='file:'||window.OFFLINE_BUILD){e.preventDefault();download('<!doctype html>\n'+document.documentElement.outerHTML,'Физика.html','text/html');}break;}});
document.addEventListener('change',e=>{if(e.target.matches('[data-oral-check]')&&oral){oral.checks[Number(e.target.dataset.oralCheck)]=e.target.checked;if($('#oral-score'))$('#oral-score').textContent='Объяснил самостоятельно: '+oral.checks.filter(Boolean).length+' из '+oral.checks.length+' пунктов';}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const menu of document.querySelectorAll('.utility-menu[open]'))menu.open=false;});
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type:type+';charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function importProgress(e){
 const file=e.target.files[0];e.target.value='';if(!file)return;
 if(file.size>5*1024*1024){toast('Файл слишком большой. Выберите экспорт прогресса JSON.');return;}
 try{
  const s=JSON.parse(await file.text());if(!validState(s))throw Error('Неверный формат');
  const clean=StudyState.normalize(s,COURSES);
  if(!confirm('Заменить прогресс и черновики этого браузера данными из файла?'))return;
  stopTimer();state=clean;restoreDrafts();save();flash=null;oral=null;quizSession=null;render(false);toast('Прогресс импортирован');
 }catch(err){toast('Не удалось импортировать. Нужен JSON-файл экспорта этого приложения.');}
}
window.addEventListener('hashchange',()=>{query='';render();});

if(!state.practiceRuleVersion){for(const c of COURSES){for(const t of c.topics){const keys=[...t.questions.map((_,i)=>`q${i}`),...(t.learning?.practice||[]).map((_,i)=>`p${i}`)];if(keys.length&&keys.every(k=>state.practice?.[`${c.id}:${t.id}:${k}`]==='done'))state.progress[`${c.id}:${t.id}`]=3;}}state.practiceRuleVersion=1;save();}
render(false);
if(!storageOK)toast('Локальное сохранение недоступно. Пользуйтесь экспортом прогресса.');




