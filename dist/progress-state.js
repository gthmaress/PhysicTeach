/* Progress compatibility and review scheduling. No browser dependencies. */
const StudyState = (() => {
 const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
 const date = value => {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value+'T12:00:00');
  return Number.isFinite(+d) && `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`===value;
 };
 const create = courses => ({version:1,course:courses[0].id,progress:{},cards:{},plans:{},last:{},lastSections:{},practice:{},practiceRuleVersion:1,drafts:{},largeText:false});
 const valid = s => record(s) && s.version===1 && ['progress','cards','plans','last'].every(key=>record(s[key]));
 function normalize(input,courses){
  const clean=create(courses);
  if(!valid(input))return clean;
  clean.course=courses.some(c=>c.id===input.course)?input.course:courses[0].id;
  clean.largeText=!!input.largeText;
  clean.practiceRuleVersion=input.practiceRuleVersion===1?1:0;
  for(const c of courses){
   for(const t of c.topics){
    const key=`${c.id}:${t.id}`,status=input.progress[key];
    if(Number.isInteger(status)&&status>=0&&status<=3)clean.progress[key]=status;
    const ids=[...t.questions.map((_,i)=>'q'+i),...(t.learning?.practice||[]).map((_,i)=>'p'+i)];
    for(const id of ids){
     const itemKey=`${key}:${id}`,card=input.cards[itemKey];
     if(record(card)&&Number.isInteger(card.streak)&&card.streak>=0&&card.streak<=3&&date(card.due)){
      clean.cards[itemKey]={streak:card.streak,due:card.due};
      if(date(card.updated))clean.cards[itemKey].updated=card.updated;
     }
     const grade=record(input.practice)?input.practice[itemKey]:null;
     if(grade==='done'||grade==='again')clean.practice[itemKey]=grade;
     const draft=record(input.drafts)?input.drafts[itemKey]:null;
     if(typeof draft==='string'){
      const text=draft.slice(0,6000);
      if(text)clean.drafts[itemKey]=text;
     }
    }
    if(input.practiceRuleVersion!==1&&ids.length&&ids.every(id=>clean.practice[`${key}:${id}`]==='done'))clean.progress[key]=3;
   }
   const p=input.plans[c.id];
   if(record(p)&&date(p.start)&&Number.isInteger(p.days)&&p.days>=3&&p.days<=60)clean.plans[c.id]={start:p.start,days:p.days};
   if(c.topics.some(t=>t.id===input.last[c.id])){
    clean.last[c.id]=input.last[c.id];
    const section=record(input.lastSections)?input.lastSections[c.id]:null;
    clean.lastSections[c.id]=['theory','derive','check'].includes(section)?section:'theory';
   }
  }
  clean.practiceRuleVersion=1;
  return clean;
 }
 function review(previous,value,day){
  if(value!=='known')return {streak:0,due:day,updated:day};
  if(previous?.streak>0&&date(previous.due)&&previous.due>day)return {...previous,updated:day};
  const streak=Math.min(Math.max(0,Number(previous?.streak)||0)+1,3);
  const next=new Date(day+'T12:00:00');next.setDate(next.getDate()+[0,1,3,7][streak]);
  return {streak,due:`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`,updated:day};
 }
 return {create,valid,normalize,review,date};
})();
