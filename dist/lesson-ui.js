/* One lesson: definitions, formulas, examples and derivations. */
function lessonFormula(t,i){
 const [tex,note]=t.formulas[i],g=t.learning?.formulaGuides?.[i];
 if(!g)return `<section class="formula-card" id="formula-${t.id}-${i}"><div class="formula-display">${math(tex,true)}</div><p>${rich(note)}</p></section>`;
 return `<section class="formula-card" id="formula-${t.id}-${i}"><h3 class="formula-name"><strong>${esc(g.title)}</strong></h3><div class="formula-display">${math(tex,true)}</div><p class="formula-meaning">${rich(g.meaning)}</p><dl class="symbol-grid">${g.symbols.map(([s,d])=>`<div><dt>${rich(s)}</dt><dd>${rich(d)}</dd></div>`).join('')}</dl><p class="formula-condition"><strong>Условия.</strong> ${rich(g.when)}</p><p class="formula-why"><strong>Почему.</strong> ${rich(g.why)}</p><details class="formula-example"><summary>Пример применения</summary><p>${rich(g.example)}</p></details></section>`;
}
function lessonDerivations(t){
 return `<section class="lesson-derivations" id="topic-derivations"><h2>Выводы формул</h2>${t.derivations.map(([name,steps],i)=>{const g=t.learning?.derivationIntros?.[i];return `<details class="lesson-derivation" ${route().section==='derive'&&i===0?'open':''}><summary>${esc(name)}</summary>${g?`<p><strong>Получим:</strong> ${rich(g.goal)}</p><p><strong>Исходные условия:</strong> ${rich(g.start)}</p><p>${rich(g.logic)}</p>`:''}<ol class="steps">${steps.map(s=>`<li>${rich(s)}</li>`).join('')}</ol>${g?`<p class="derive-check">${rich(g.check)}</p>`:''}</details>`;}).join('')}</section>`;
}
function lessonBody(t){
 return `<section class="article-section"><h2>Определения</h2><dl class="definitions">${t.definitions.map(([name,text])=>`<div class="definition"><dt>${esc(name)}</dt><dd>${rich(text)}</dd></div>`).join('')}</dl></section><section class="article-section"><h2>Формулы</h2><div class="formulas">${t.formulas.map((_,i)=>lessonFormula(t,i)).join('')}</div></section>${classroomScene(t)}${classroomExample(t)}${lessonDerivations(t)}${mistakes(t)}`;
}
const lessonDrafts={};let draftSaveTimer=null;
function restoreDrafts(){clearTimeout(draftSaveTimer);for(const key of Object.keys(lessonDrafts))delete lessonDrafts[key];Object.assign(lessonDrafts,state.drafts||{});}
document.addEventListener('input',e=>{if(!e.target.matches('[data-draft]'))return;const key=e.target.dataset.draft,value=e.target.value.slice(0,6000);lessonDrafts[key]=value;state.drafts[key]=value;clearTimeout(draftSaveTimer);draftSaveTimer=setTimeout(()=>{draftSaveTimer=null;save();},400);});
window.addEventListener('pagehide',()=>{if(draftSaveTimer){clearTimeout(draftSaveTimer);save();}});
document.addEventListener('click',e=>{const clear=e.target.closest('[data-clear-draft]');if(!clear)return;const key=clear.dataset.clearDraft;delete lessonDrafts[key];delete state.drafts[key];for(const input of document.querySelectorAll('[data-draft]'))if(input.dataset.draft===key){input.value='';input.focus();}save();});
