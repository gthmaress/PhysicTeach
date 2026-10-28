/* Все режимы используют одни и те же материалы темы. */
const noteMath=tex=>'\\('+tex+'\\)';
const derivationQuestion=title=>/^Как /i.test(title)?title+'?':'Разберите по шагам: '+title.replace(/^Пошаговый /i,'')+'.';
for(const c of COURSES)for(const t of c.topics){
 const n=LESSON_DATA.find(n=>n.id===t.id);
 if(!n)continue;
 t.learning={intuition:n.intro,formulaGuides:n.formulas.map(f=>({title:f.title,meaning:f.meaning,symbols:f.symbols,when:f.when,why:f.why,example:f.example})),oralAnswer:n.oralAnswer,practice:[]};
 t.questions=[...n.definitions.map(([name,text])=>['Объясните: '+name+'.',text]),...n.formulas.map(f=>['Запишите и объясните: '+f.title+'.',noteMath(f.tex)+' '+f.meaning+' Условия: '+f.when]),...n.derivations.map(d=>[derivationQuestion(d.title),d.steps.join(' ')])];
 t.oral=n.oralAnswer.map(p=>p.answer).join(' ');
}
