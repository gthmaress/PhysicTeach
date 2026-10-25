let quizSession=null;
function quizScopeKey(id){return course().id+':'+id;}
function startQuiz(topicId,mode='continue'){
 const questions=QuizLogic.questions(course(),topicId);
 let ids=questions.map(q=>q.id);
 if(mode==='errors')ids=questions.filter(q=>{const a=state.quizAnswers[quizScopeKey(q.id)];return a&&a.choice!==q.correct;}).map(q=>q.id);
 if(mode!=='continue'){for(const id of ids)delete state.quizAnswers[quizScopeKey(id)];save();}
 const first=mode==='continue'?ids.findIndex(id=>!state.quizAnswers[quizScopeKey(id)]):0;
 quizSession={courseId:course().id,topicId,ids,index:first<0?ids.length:first,pending:null,errorsOnly:mode==='errors'};
}
function testHub(){
 const c=course();return `<h1 class="page-title">Тесты по темам</h1><p class="page-intro">Решите задачу, выберите ответ и проверьте ход решения.</p><div class="test-topic-list">${c.topics.map((t,i)=>{
  const result=QuizLogic.result(c,state.quizAnswers,t.id);
  return `<a class="test-topic" href="#tests/${t.id}"><span class="card-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(t.title)}</strong><small>${result.answered?`Верно ${result.correct} из ${result.total} · отвечено ${result.answered}`:result.total+' задачи'}</small></span><span aria-hidden="true">→</span></a>`;
 }).join('')}</div>${footer()}`;
}
function testPage(id){
 const c=course(),t=c.topics.find(t=>t.id===id);if(!t)return testHub();
 if(!quizSession||quizSession.courseId!==c.id||quizSession.topicId!==id)startQuiz(id);
 const session=quizSession,questions=QuizLogic.questions(c,id),q=(c.quizzes||[]).find(q=>q.id===session.ids[session.index]);
 const head=`<a class="topic-return" href="#tests">← Все тесты</a><h1 class="page-title">${esc(t.title)}</h1>`;
 if(!q){
  const result=QuizLogic.result(c,state.quizAnswers,id),wrong=questions.filter(q=>{const a=state.quizAnswers[quizScopeKey(q.id)];return a&&a.choice!==q.correct;});
  return `${head}<section class="test-result"><span class="eyebrow">${session.errorsOnly?'Повтор ошибок завершён':'Тест завершён'}</span><h2>Верно ${result.correct} из ${result.total}</h2><p>${result.correct===result.total?'Все задачи темы решены верно. Проверьте ещё, сможете ли объяснить формулы вслух.':'Разберите ошибки и попробуйте решить эти задачи ещё раз.'}</p><div class="test-result-links">${wrong.length?`<button class="btn" data-quiz-retry="errors" data-topic="${t.id}">Повторить ошибки (${wrong.length})</button>`:''}<button class="btn secondary" data-quiz-retry="all" data-topic="${t.id}">Пройти заново</button><a class="btn secondary" href="#topic/${t.id}">К теории</a><a class="btn text" href="#oral/${t.id}">Устный ответ →</a></div></section>${footer()}`;
 }
 const answer=state.quizAnswers[quizScopeKey(q.id)],checked=!!answer,selected=checked?answer.choice:session.pending;
 const correct=q.options.find(o=>o.id===q.correct),chosen=q.options.find(o=>o.id===selected);
 const draftKey=c.id+':'+t.id+':quiz-'+q.id;
 return `${head}<div class="quiz-position">${session.errorsOnly?'Повтор ошибок · ':''}Задача ${session.index+1} из ${session.ids.length}</div><section class="quiz-card"><h2>${rich(q.question)}</h2><fieldset class="quiz-options" ${checked?'disabled':''}><legend class="sr-only">Выберите ответ</legend>${q.options.map(o=>{
  const label=checked?(o.id===q.correct?'Правильный ответ':o.id===selected?'Ваш ответ':''):'';
  return `<label class="quiz-option ${checked&&o.id===q.correct?'correct':''} ${checked&&o.id===selected&&selected!==q.correct?'incorrect':''}"><input type="radio" name="quiz-choice" value="${o.id}" ${selected===o.id?'checked':''}><span>${rich(o.text)}${label?`<small>${label}</small>`:''}</span></label>`;
 }).join('')}</fieldset>${checked?`<section class="quiz-feedback" id="quiz-feedback" tabindex="-1"><h3>${selected===q.correct?'Верно':'Ответ неверный'}</h3><p>${rich(chosen?.why||'')}</p><p><strong>Правильный ответ:</strong> ${rich(correct.text)}</p><ol>${q.solution.map(s=>`<li>${rich(s)}</li>`).join('')}</ol><div class="quiz-theory-links">${q.formulaIndices.map(i=>`<a href="#topic/${t.id}/formula-${i}">${esc(t.learning?.formulaGuides?.[i]?.title||'Формула '+(i+1))} →</a>`).join('')}</div></section><button class="btn" data-quiz-next>${session.index+1===session.ids.length?'Посмотреть результат':'Следующая задача →'}</button>`:`<details class="quiz-draft"><summary>Черновик решения</summary><textarea data-draft="${draftKey}" rows="3" maxlength="6000" aria-label="Черновик решения" placeholder="Запишите формулу, подставьте данные…">${esc(lessonDrafts[draftKey]||'')}</textarea><button class="draft-clear" data-clear-draft="${draftKey}">Очистить черновик</button></details><button class="btn" data-quiz-submit ${selected?'':'disabled'}>Проверить ответ</button>`}</section>${footer()}`;
}
document.addEventListener('change',e=>{
 if(e.target.name!=='quiz-choice'||!quizSession)return;
 quizSession.pending=e.target.value;const button=$('[data-quiz-submit]');if(button)button.disabled=false;
});
document.addEventListener('click',e=>{
 const retry=e.target.closest('[data-quiz-retry]');if(retry){startQuiz(retry.dataset.topic,retry.dataset.quizRetry);render();return;}
 if(e.target.closest('[data-quiz-next]')){if(quizSession){quizSession.index++;quizSession.pending=null;render();}return;}
 if(!e.target.closest('[data-quiz-submit]')||!quizSession?.pending)return;
 const q=course().quizzes.find(q=>q.id===quizSession.ids[quizSession.index]);if(!q||state.quizAnswers[quizScopeKey(q.id)])return;
 const result=QuizLogic.grade(q,quizSession.pending);state.quizAnswers[quizScopeKey(q.id)]={choice:result.choice,answeredAt:today()};
 const t=course().topics.find(t=>t.id===q.topicId);if(!result.correct)state.progress[topicKey(t)]=2;else if(status(t)===0)state.progress[topicKey(t)]=1;
 save();render(false);$('#quiz-feedback')?.focus({preventScroll:true});$('#quiz-feedback')?.scrollIntoView({block:'nearest',behavior:'smooth'});
});
