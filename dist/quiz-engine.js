/* Test scoring is independent of topic self-assessment. */
const QuizLogic = {
 questions(course,topicId){return (course.quizzes||[]).filter(q=>!topicId||q.topicId===topicId);},
 key(courseId,questionId){return courseId+':'+questionId;},
 grade(question,choice){
  const option=question.options.find(o=>o.id===choice);
  if(!option)throw Error('Выберите один из предложенных ответов');
  return {correct:choice===question.correct,choice,explanation:option.why};
 },
 result(course,answers,topicId){
  const questions=this.questions(course,topicId);let answered=0,correct=0;
  for(const q of questions){const a=answers[this.key(course.id,q.id)];if(q.options.some(o=>o.id===a?.choice)){answered++;if(a.choice===q.correct)correct++;}}
  return {total:questions.length,answered,correct,complete:questions.length>0&&answered===questions.length};
 },
 validate(course){
  const ids=new Set();
  for(const q of course.quizzes||[]){
   const topic=course.topics.find(t=>t.id===q.topicId);
   if(!q.id||ids.has(q.id)||!topic||!q.question)throw Error('Invalid test question '+q.id);
   ids.add(q.id);
   if(q.options?.length!==4||new Set(q.options.map(o=>o.id)).size!==4||new Set(q.options.map(o=>o.text.trim())).size!==4)throw Error('Invalid test choices '+q.id);
   if(!q.options.some(o=>o.id===q.correct)||q.options.some(o=>!o.text||!o.why))throw Error('Missing feedback '+q.id);
   if(!Array.isArray(q.solution)||q.solution.length<3||q.solution.some(s=>typeof s!=='string'||!s.trim())||!Array.isArray(q.formulaIndices)||!q.formulaIndices.length||q.formulaIndices.some(i=>!Number.isInteger(i)||!topic.formulas[i]))throw Error('Missing solution or formula reference '+q.id);
  }
  for(const t of course.topics)if(this.questions(course,t.id).length<3)throw Error('Not enough test questions '+t.id);
  return ids.size;
 }
};
