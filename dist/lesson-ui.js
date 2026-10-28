/* Единый конспект; учебный текст хранится только в content.js. */
function lessonFormula(t,i){
 const [tex]=t.formulas[i],g=t.learning.formulaGuides[i];
 return `<section class="formula-card" id="formula-${t.id}-${i}"><h3 class="formula-name"><strong>${esc(g.title)}</strong></h3><div class="formula-display">${math(tex,true)}</div><p class="formula-meaning">${rich(g.meaning)}</p>${g.symbols?.length?`<dl class="symbol-grid">${g.symbols.map(([s,d])=>`<div><dt>${rich(s)}</dt><dd>${rich(d)}</dd></div>`).join('')}</dl>`:''}${g.when?`<p class="formula-condition"><strong>Условия.</strong> ${rich(g.when)}</p>`:''}${g.why?`<p class="formula-why"><strong>Почему.</strong> ${rich(g.why)}</p>`:''}${g.example?`<details class="formula-example"><summary>Пример применения</summary><p>${rich(g.example)}</p></details>`:''}</section>`;
}
function lessonDerivations(t){
 return `<section class="lesson-derivations" id="topic-derivations"><h2>Выводы формул</h2>${t.derivations.map(([name,steps],i)=>`<details class="lesson-derivation" ${route().section==='derive'&&i===0?'open':''}><summary>${esc(name.replace(/^Пошаговый /i,''))}</summary><ol class="steps">${steps.map(s=>`<li>${rich(s)}</li>`).join('')}</ol></details>`).join('')}</section>`;
}
function lessonBody(t){
 return `<section class="article-section"><h2>Определения и законы</h2><dl class="definitions">${t.definitions.map(([name,text])=>`<div class="definition"><dt>${rich(name)}</dt><dd>${rich(text)}</dd></div>`).join('')}</dl></section>${classroomScene(t)}<section class="article-section"><h2>Формулы</h2><div class="formulas">${t.formulas.map((_,i)=>lessonFormula(t,i)).join('')}</div></section>${lessonDerivations(t)}`;
}
const lessonDrafts={};let draftSaveTimer=null;
function restoreDrafts(){clearTimeout(draftSaveTimer);for(const key of Object.keys(lessonDrafts))delete lessonDrafts[key];Object.assign(lessonDrafts,state.drafts||{});}
document.addEventListener('input',e=>{if(!e.target.matches('[data-draft]'))return;const key=e.target.dataset.draft,value=e.target.value.slice(0,6000);lessonDrafts[key]=value;state.drafts[key]=value;clearTimeout(draftSaveTimer);draftSaveTimer=setTimeout(()=>{draftSaveTimer=null;save();},400);});
window.addEventListener('pagehide',()=>{if(draftSaveTimer){clearTimeout(draftSaveTimer);save();}});
document.addEventListener('click',e=>{const clear=e.target.closest('[data-clear-draft]');if(!clear)return;const key=clear.dataset.clearDraft;delete lessonDrafts[key];delete state.drafts[key];for(const input of document.querySelectorAll('[data-draft]'))if(input.dataset.draft===key){input.value='';input.focus();}save();});
