(function(){
'use strict';
const C = window.COURSE;
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='vikkypaedia-bf-v1';
let S;
try{S=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){S={}}
S=Object.assign({name:'',path:'',goal:'',units:{},quiz:{},cases:{},obs:{},tools:{},pre:null,post:null,cards:{},notes:{},missed:{},conf:{sureRight:0,sureWrong:0,unsureRight:0,unsureWrong:0,guessRight:0,guessWrong:0},theme:'',think:{},spot:{},seq:null,last:'',reflect:{}},S);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const toast=m=>{const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)};
const shuffle=(a,seed)=>{a=a.slice();let r=Math.random;for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const mod=id=>C.modules.find(m=>m.id===id);
const ptRange=(m)=>{const a=[];for(let i=m.pts[0];i<=m.pts[1];i++)a.push(i);return a};
const pct=(a,b)=>b?Math.round(100*a/b):0;
/* point -> teaching unit, so every "P26" reference becomes a remediation link */
const P2U={};C.modules.forEach(m=>m.units.forEach((u,k)=>u.pts.forEach(n=>{P2U[n]={h:`#/m/${m.id}/u/${k}`,m:m.id}})));
const refLinks=ref=>esc(ref).replace(/P(\d+)/g,(s,a)=>P2U[a]?`<a href="${P2U[a].h}" title="Review the unit that teaches point ${a}">${s}</a>`:s);
const modOfRef=ref=>{const x=String(ref||'').match(/P(\d+)/);return x&&P2U[x[1]]?P2U[x[1]].m:null};

/* ---------- progress ---------- */
function modProg(m){
  const u=m.units.filter((_,i)=>S.units[m.id+':'+i]).length;
  const q=S.quiz[m.id]?S.quiz[m.id].best:0;
  const qok=q>=80;
  const caseDone=!!S.cases[m.case.id];
  const total=m.units.length+1+(S.path==='deep'?1:0);
  const done=u+(qok?1:0)+(S.path==='deep'&&caseDone?1:0);
  return {u,q,qok,caseDone,done,total,complete:done===total,pct:pct(done,total)};
}
const allMods=()=>C.modules.every(m=>modProg(m).complete);
const overall=()=>pct(C.modules.reduce((s,m)=>s+modProg(m).done,0),C.modules.reduce((s,m)=>s+modProg(m).total,0));

/* ---------- theme ---------- */
function applyTheme(){document.documentElement.dataset.theme=S.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}
applyTheme();
$('#themeBtn').onclick=()=>{S.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';save();applyTheme()};
$('#menuBtn').onclick=()=>{const s=$('#side');const o=s.classList.toggle('open');$('#menuBtn').setAttribute('aria-expanded',o)};

/* ---------- nav ---------- */
function renderNav(){
  const r=location.hash||'#/home';
  const link=(h,ic,t,extra='')=>`<a href="${h}" class="${r===h||r.startsWith(h+'/')?'on':''} ${extra}"><span class="num">${ic}</span>${t}</a>`;
  let h='<h3>Start</h3>'+link('#/home','🏠','Course home')+link('#/pre','📝','Pre-test (diagnostic)')+link('#/map','🗺️','The 45 points map');
  h+='<h3>Learning modules</h3>';
  C.modules.forEach(m=>{const p=modProg(m);h+=`<a href="#/m/${m.id}" class="${r.startsWith('#/m/'+m.id)||r.startsWith('#/quiz/'+m.id)||r.startsWith('#/case/'+m.id)?'on':''} ${p.complete?'done':''}"><span class="num">${p.complete?'✓':m.n}</span>${esc(m.title)}<span class="pct">${p.pct}%</span></a>`});
  h+='<h3>Practice</h3>'+link('#/lab','🔬','Observation lab')+link('#/tools','🛠️','Interactive tools')+link('#/spot','🔍','Spot the problem')+link('#/flash','🃏','Flashcards')+link('#/review','🔁','Review queue');
  h+='<h3>Finish</h3>'+link('#/post','🎯','Final assessment')+link('#/progress','📊','My progress')+link('#/cert','🏅','Certificate')+link('#/sources','📚','Sources & credits');
  $('#side').innerHTML=h;
  const b=[['#/home','🏠','Home'],['#/m/'+C.modules[0].id,'📖','Learn'],['#/flash','🃏','Cards'],['#/tools','🛠️','Tools'],['#/progress','📊','Progress']];
  $('#bottom').innerHTML=b.map(x=>`<a href="${x[0]}" class="${r===x[0]?'on':''}"><b>${x[1]}</b>${x[2]}</a>`).join('');
  $('#side').classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false');
}

/* ---------- helpers: point block ---------- */
function ptBlock(n){
  const p=C.points[n];
  const imgs=p.imgs.map(i=>`<button data-zoom="img/${i.f}.jpg" data-alt="${esc(i.alt)}" aria-label="Enlarge: ${esc(i.alt)}"><img src="img/${i.f}.jpg" alt="${esc(i.alt)}" loading="lazy"></button>`).join('');
  return `<div class="pt"><div class="n" aria-label="Point ${n}">${n}</div><div>${esc(p.text)}</div><div class="imgs">${imgs}</div></div>`;
}
document.addEventListener('click',e=>{
  const z=e.target.closest('[data-zoom]');
  if(z){const d=$('#lb');$('#lbimg').src=z.dataset.zoom;$('#lbimg').alt=z.dataset.alt;d.showModal()}
});

/* ---------- router ---------- */
const routes=[];
const route=(re,fn)=>routes.push([re,fn]);
function go(){
  const h=(location.hash||'#/home').slice(1);
  for(const [re,fn] of routes){const m=h.match(re);if(m){renderNav();fn(...m.slice(1));if(/^\/(m|quiz|case)\//.test(h)){S.last='#'+h;save()}const mn=$('#main');mn.focus({preventScroll:true});window.scrollTo(0,0);return}}
  location.hash='#/home';
}
window.addEventListener('hashchange',go);

const footer=`<footer class="credit">Course design: Vikkypaedia (Kern six-step, backward design, Mayer multimedia principles, UDL 3.0, WCAG 2.2 AA targets). Source illustrations and the 45 counselling points: Spoken Tutorial Project, IIT Bombay (Mother and Infant Nutrition Campaign, funded by NMEICT, MHRD, Government of India). B-R-E-A-S-T-Feed Observation Form adapted from H.C. Armstrong, IBFAN/UNICEF 1992. This is an educational resource, not a substitute for clinical judgement or local protocols. <a href="#/sources">Sources & limitations</a></footer>`;
const setMain=h=>{$('#main').innerHTML=h+footer};

/* ---------- HOME ---------- */
route(/^\/home$/,()=>{
  const ov=overall();
  setMain(`
  <section class="hero">
   <div>
    <div class="eyebrow">Self-directed course · about 3 hours</div>
    <h1>Effective Counselling, Effective Breastfeeding</h1>
    <p>Learn to see, teach and correct the cross-cradle hold, the U-hold and the deep latch, using the 45 counselling points, a latch-assessment form and an observation lab. Learn at your own pace and your progress is saved on this device.</p>
    <div class="row"><a class="btn alt" href="${S.last||('#/'+(S.pre?'m/'+C.modules[0].id:'pre'))}">${S.last?'Continue where you left off':ov?'Continue learning':'Begin with the pre-test'}</a><a class="btn ghost" href="#/map">Browse the 45 points</a></div>
    <p style="margin-top:14px"><span class="pill">6 modules</span><span class="pill">30 practice questions</span><span class="pill">6 cases</span><span class="pill">${C.spot.length} image challenges</span><span class="pill">${C.cards.length} flashcards</span><span class="pill">4 simulators</span></p>
   </div>
   <img src="img/cover_hero.jpg" alt="Illustration of a seated mother breastfeeding her baby in the cross-cradle hold" class="hero-img">
  </section>

  <div class="card"><h2 style="margin-top:0">Who is this for?</h2><p>Nurses, doctors, community health workers, lactation counsellors and students who counsel mothers on breastfeeding technique. Mothers can use it too; the language stays plain.</p></div>

  <h2>1. Set your own path</h2>
  <div class="grid c2">
   <label class="card" style="cursor:pointer"><input type="radio" name="path" value="essentials" ${S.path==='essentials'?'checked':''}> <b>Essentials</b> (about 2 h)<br>Guided units and a practice quiz for each module. Case studies, simulators and the lab stay optional.</label>
   <label class="card" style="cursor:pointer"><input type="radio" name="path" value="deep" ${S.path==='deep'?'checked':''}> <b>Deep dive</b> (about 3 h)<br>Everything in Essentials plus every progressive case study counts toward module completion.</label>
  </div>
  <div class="card"><label for="goal"><b>My goal for this course</b> (optional)</label><input type="text" id="goal" placeholder="e.g. Counsel mothers on my postnatal ward with confidence" value="${esc(S.goal)}"><div style="margin-top:12px"><label for="nm"><b>My name</b> (for the certificate)</label><input type="text" id="nm" value="${esc(S.name)}" placeholder="Your name"></div></div>

  <h2>2. How the course works</h2>
  <div class="grid c3">
   <div class="card"><div class="ic" style="font-size:1.8rem">🧠</div><b>Think first</b><br>Each unit starts with a question. Commit to an answer, then compare it with the expert reasoning.</div>
   <div class="card"><div class="ic" style="font-size:1.8rem">🖼️</div><b>Look, then decide</b><br>Every point is paired with the original illustration so you learn what to <i>see</i>.</div>
   <div class="card"><div class="ic" style="font-size:1.8rem">🔁</div><b>Practice and retrieve</b><br>Questions with confidence ratings, cases, flashcards and a review queue for what you missed.</div>
  </div>

  <h2>3. The learning pathway</h2>
  <div class="grid c2">${C.modules.map(m=>{const p=modProg(m);return `<a class="card mod-card" href="#/m/${m.id}"><div class="ic">${m.icon}</div><b>Module ${m.n}: ${esc(m.title)}</b><div style="color:var(--muted)">${esc(m.sub)}</div><p style="margin:.4em 0"><span class="pill">${m.mins} min</span><span class="pill">${esc(m.level)}</span><span class="pill">P${m.pts[0]}–P${m.pts[1]}</span></p><div class="bar" aria-hidden="true"><i style="width:${p.pct}%"></i></div></a>`}).join('')}</div>

  <h2>Course outcomes</h2>
  <div class="card"><ul class="outcomes"><li>Recognise hunger cues and prepare the mother and baby for a feed.</li><li>Position the baby in the cross-cradle hold and verify alignment.</li><li>Shape the breast with the U-hold and attach the baby to the lower areola.</li><li>Check a latch with the three-point test and troubleshoot common problems.</li><li>Observe a feed with the B-R-E-A-S-T-Feed and breastfeeding assessment forms and give actionable counselling.</li></ul>
  <p style="color:var(--muted)">Assessment level: <b>Knows → Knows how</b> (Miller). Online quizzes show knowledge and judgement, they do not show that you can do it. Clinical competence needs observed practice with real mother-baby pairs.</p></div>
  `);
  $$('input[name=path]').forEach(r=>r.onchange=()=>{S.path=r.value;save();renderNav();toast('Path saved: '+(r.value==='deep'?'Deep dive':'Essentials'))});
  $('#goal').oninput=e=>{S.goal=e.target.value;save()};
  $('#nm').oninput=e=>{S.name=e.target.value;save()};
});

/* ---------- MAP of 45 points ---------- */
route(/^\/map$/,()=>{
  setMain(`<div class="crumbs">Reference</div><h1>The 45 points at a glance</h1><p>Search or tap a module to jump in. Each point links to its learning unit.</p>
  <input type="text" id="q" placeholder="Search points (e.g. dimple, clock, burp)…" aria-label="Search points">
  <div id="list"></div>`);
  const draw=()=>{const q=$('#q').value.toLowerCase();
    $('#list').innerHTML=C.modules.map(m=>{
      const items=ptRange(m).filter(n=>!q||C.points[n].text.toLowerCase().includes(q));
      if(!items.length)return '';
      return `<h2>${m.icon} Module ${m.n}: <a href="#/m/${m.id}">${esc(m.title)}</a></h2><div class="card">${items.map(ptBlock).join('')}</div>`}).join('')||'<p>No matches.</p>'};
  $('#q').oninput=draw;draw();
});

/* ---------- MODULE ---------- */
route(/^\/m\/(\w+)(?:\/u\/(\d+))?$/,(id,k)=>{
  const m=mod(id);if(!m){location.hash='#/home';return}
  const p=modProg(m);
  if(k===undefined){
    setMain(`<div class="crumbs">Module ${m.n} of ${C.modules.length}</div><h1>${m.icon} ${esc(m.title)}</h1><p style="font-size:1.1rem;color:var(--muted)">${esc(m.sub)}</p>
    <div class="card"><div class="eyebrow">Clinical hook</div><p style="font-size:1.1rem">${esc(m.hook)}</p></div>
    <div class="card"><h2 style="margin-top:0">By the end you will be able to</h2><ol class="outcomes">${m.outcomes.map(o=>`<li>${esc(o)}</li>`).join('')}</ol><p><span class="pill">${m.mins} min</span><span class="pill">${esc(m.level)}</span><span class="pill">Points ${m.pts[0]}–${m.pts[1]}</span></p></div>
    <h2>Your path through this module</h2>
    <div class="card">${m.units.map((u,i)=>`<div class="row" style="padding:6px 0"><span class="pill">${S.units[id+':'+i]?'✓ done':'Unit '+(i+1)}</span><a href="#/m/${id}/u/${i}">${esc(u.t)}</a></div>`).join('')}
    <div class="row" style="padding:6px 0"><span class="pill">${p.qok?'✓ '+p.q+'%':'Practice'}</span><a href="#/quiz/${id}">Practice quiz (5 questions, mastery 80%)</a></div>
    <div class="row" style="padding:6px 0"><span class="pill">${p.caseDone?'✓ done':(S.path==='deep'?'Required':'Optional')}</span><a href="#/case/${id}">Progressive case: ${esc(m.case.title)}</a></div></div>
    <div class="row"><a class="btn" href="#/m/${id}/u/0">Start unit 1</a></div>`);
    return;
  }
  k=+k;const u=m.units[k];
  if(!u){location.hash='#/m/'+id;return}
  const tk=id+':'+k;
  setMain(`<div class="crumbs"><a href="#/m/${id}">${esc(m.title)}</a> › Unit ${k+1} of ${m.units.length}</div>
  <div class="steps" role="tablist">${m.units.map((x,i)=>`<button class="${i===k?'on':''} ${S.units[id+':'+i]?'done':''}" onclick="location.hash='#/m/${id}/u/${i}'">${i+1}. ${esc(x.t.length>26?x.t.slice(0,25)+'…':x.t)}</button>`).join('')}</div>
  <h1>${esc(u.t)}</h1>
  <div class="think"><b>🧠 Think first</b><p>${esc(u.think)}</p>
   <label class="crumbs" for="tt">Your answer (saved on this device)</label>
   <textarea id="tt" rows="3">${esc(S.think[tk]||'')}</textarea>
   <div class="row" style="margin-top:10px"><button class="btn alt" id="rv">Reveal expert answer</button></div>
   <div id="rvbox" hidden class="reveal" aria-live="polite"><b>Expert answer.</b> ${esc(u.answer)}</div></div>
  <div class="card" id="src"><h2 style="margin-top:0">The source points, with illustrations</h2>${u.pts.map(ptBlock).join('')}</div>
  <div class="callout"><b>Why it matters.</b> ${esc(u.why)}</div>
  <div class="callout err"><b>Common error.</b> ${esc(u.err)}</div>
  <div class="card notes"><label for="nt"><b>My notes</b> for this unit</label><textarea id="nt" rows="2">${esc(S.notes[tk]||'')}</textarea></div>
  <div class="row noprint" style="margin-top:20px">
    ${k>0?`<a class="btn ghost" href="#/m/${id}/u/${k-1}">← Previous</a>`:`<a class="btn ghost" href="#/m/${id}">← Overview</a>`}
    <button class="btn" id="done">${S.units[tk]?'Completed ✓':'Mark unit complete'}</button>
    ${k<m.units.length-1?`<a class="btn" href="#/m/${id}/u/${k+1}">Next →</a>`:`<a class="btn alt" href="#/quiz/${id}">Practice quiz →</a>`}
  </div>
  ${k===m.units.length-1?`<div class="card" style="margin-top:20px"><h2 style="margin-top:0">Module takeaways</h2><ul>${m.take.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`:''}`);
  $('#tt').oninput=e=>{S.think[tk]=e.target.value;save()};
  $('#nt').oninput=e=>{S.notes[tk]=e.target.value;save()};
  $('#rv').onclick=()=>{$('#rvbox').hidden=false;$('#rv').disabled=true};
  $('#done').onclick=()=>{S.units[tk]=true;save();renderNav();$('#done').textContent='Completed ✓';toast('Unit completed')};
});

/* ---------- QUIZ ENGINE ---------- */
function quizEngine(opts){
  // opts: {title, items:[{id,q,o,a,why,ref,n}], mastery, onFinish(score,total,wrongIds,results), back}
  // n = option-specific notes in original order; they are re-ordered with the shuffled options.
  let items=shuffle(opts.items).map(it=>{const idx=shuffle(it.o.map((_,i)=>i));return Object.assign({},it,{o:idx.map(i=>it.o[i]),n:it.n?idx.map(i=>it.n[i]):null,a:idx.indexOf(it.a)})});
  let i=0,score=0,conf='unsure',wrong=[],res=[],locked=false;
  const root=$('#main');
  const draw=()=>{
    if(i>=items.length)return finish();
    const it=items[i];locked=false;
    root.innerHTML=`<div class="crumbs">${esc(opts.title)} · Question ${i+1} of ${items.length}</div>
    <div class="bar" style="margin:8px 0 18px" role="progressbar" aria-valuenow="${i}" aria-valuemin="0" aria-valuemax="${items.length}" aria-label="Quiz progress"><i style="width:${pct(i,items.length)}%"></i></div>
    <div class="card"><h2 style="margin-top:0;font-size:1.25rem">${esc(it.q)}</h2>
    <div class="crumbs">How sure are you? (pick before answering)</div>
    <div class="seg" role="group" aria-label="Confidence">${['sure','unsure','guess'].map(c=>`<button data-c="${c}" class="${conf===c?'on':''}" aria-pressed="${conf===c}">${{sure:'Sure',unsure:'Not sure',guess:'Guessing'}[c]}</button>`).join('')}</div>
    <div role="group" aria-label="Answer options">${it.o.map((o,j)=>`<button class="opt" data-j="${j}">${String.fromCharCode(65+j)}. ${esc(o)}</button>`).join('')}</div>
    <div id="fb" aria-live="polite"></div></div>`;
    $$('.seg button',root).forEach(b=>b.onclick=()=>{conf=b.dataset.c;$$('.seg button',root).forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)})});
    $$('.opt',root).forEach(b=>b.onclick=()=>pick(+b.dataset.j));
  };
  const pick=j=>{
    if(locked)return;locked=true;const it=items[i];const ok=j===it.a;
    res.push({id:it.id,ok,ref:it.ref,q:it.q});
    if(ok){score++;if(S.missed[it.id])S.missed[it.id]=Math.max(0,S.missed[it.id]-1)}
    else{wrong.push(it.id);S.missed[it.id]=(S.missed[it.id]||0)+1}
    const ck=conf+(ok?'Right':'Wrong');S.conf[ck]=(S.conf[ck]||0)+1;
    save();
    $$('.opt',root).forEach((b,x)=>{b.disabled=true;if(x===it.a){b.classList.add('ok');b.insertAdjacentHTML('beforeend',' <b>✓ best answer</b>')}else if(x===j){b.classList.add('no');b.insertAdjacentHTML('beforeend',' <b>✗ your choice</b>')}});
    let cal='';
    if(conf==='sure'&&!ok)cal='<p><b>Calibration:</b> you were sure but wrong. This is the most valuable kind of miss. Revisit the linked unit.</p>';
    if(conf==='guess'&&ok)cal='<p><b>Calibration:</b> a lucky guess. It has been noted; revisit the point so it sticks.</p>';
    const mine=(!ok&&it.n&&it.n[j])?`<p style="margin:.5em 0 0"><b>Why your choice is less appropriate:</b> ${refLinks(it.n[j])}</p>`:'';
    $('#fb').innerHTML=`<div class="fb ${ok?'ok':'no'}"><b>${ok?'Correct.':'Not quite.'}</b>${mine}<p style="margin:.5em 0 0"><b>Why the best answer is right:</b> ${refLinks(it.why)}</p><p style="margin:.4em 0 0">📖 Review: ${refLinks(it.ref||'')}</p>${cal}</div><div style="margin-top:14px"><button class="btn" id="nx">${i+1<items.length?'Next question →':'See results'}</button></div>`;
    if(!ok||conf==='guess'){S.missed[it.id]=Math.max(S.missed[it.id]||0,1);save()}
    $('#nx').focus();$('#nx').onclick=()=>{i++;conf='unsure';draw()};
  };
  const finish=()=>{
    const sc=pct(score,items.length);const ok=sc>=(opts.mastery||80);
    const miss=res.filter(r=>!r.ok);
    root.innerHTML=`<div class="crumbs">${esc(opts.title)} · Results</div><h1>${ok&&opts.mastery?'🎉 ':''}${score} / ${items.length} (${sc}%)</h1>
    <div class="card">${!opts.mastery?'<p>Diagnostic or warm-up only: this does not count toward completion.</p>':ok?`<p>Mastery reached (${opts.mastery}%+).</p>`:`<p>Mastery needs ${opts.mastery}%. Revisit the units below, then retry as often as you like. Options are reshuffled each time.</p>`}
    ${miss.length?`<h3>Your personal revision list</h3><ul>${miss.map(r=>`<li>${esc(r.q.length>90?r.q.slice(0,88)+'…':r.q)}: review ${refLinks(r.ref||'')}</li>`).join('')}</ul><p class="crumbs">These questions (and lucky guesses) are now in your <a href="#/review">Review queue</a> until you answer them correctly.</p>`:''}
    <div class="row"><button class="btn" id="again">Try again</button><a class="btn ghost" href="${opts.back||'#/home'}">Back</a></div></div>`;
    $('#again').onclick=()=>quizEngine(opts);
    opts.onFinish&&opts.onFinish(sc,items.length,wrong,res);
  };
  draw();
}
function poolItems(){const out=[];C.modules.forEach(m=>m.mcq.forEach((q,i)=>out.push(Object.assign({id:m.id+':'+i,mod:m.id},q))));return out}

route(/^\/quiz\/(\w+)$/,(id)=>{
  const m=mod(id);setMain('');
  quizEngine({title:`Module ${m.n}: ${m.title}`,items:m.mcq.map((q,i)=>Object.assign({id:id+':'+i},q)),mastery:80,back:'#/m/'+id,onFinish:(sc)=>{const prev=S.quiz[id]||{best:0,attempts:0};S.quiz[id]={best:Math.max(prev.best,sc),attempts:prev.attempts+1};save();renderNav()}});
});

/* ---------- PRE / POST ---------- */
route(/^\/pre$/,()=>{
  if(S.pre&&!S.preRetry){
    const mods=S.pre.mods||{};
    const rows=C.modules.map(m=>{const r=mods[m.id]||[0,0];return {m,r,p:r[1]?pct(r[0],r[1]):null}});
    const weakest=rows.filter(x=>x.p!==null).sort((a,b)=>a.p-b.p)[0];
    setMain(`<h1>📝 Your starting point</h1><div class="card"><div class="kpi">${S.pre.score}%</div><p>Pre-test taken ${new Date(S.pre.date).toLocaleDateString()}. This is a diagnostic only. Use it to decide where to spend your time.</p>
    <table class="tbl"><tr><th>Module</th><th>Pre-test</th><th>Suggestion</th></tr>${rows.map(x=>`<tr><td><a href="#/m/${x.m.id}">${x.m.icon} ${esc(x.m.title)}</a></td><td>${x.r[1]?`${x.r[0]}/${x.r[1]}`:'not sampled'}</td><td>${x.p===null?'Work through normally':x.p===100?'Strong: skim the units, then go straight to the quiz':x.p>=50?'Partly known: focus on the think-first questions':'Priority: work through every unit carefully'}</td></tr>`).join('')}</table>
    ${weakest&&weakest.p<100?`<div class="callout warn" style="margin-top:12px"><b>Recommended focus:</b> <a href="#/m/${weakest.m.id}">${esc(weakest.m.title)}</a>. Modules build on each other, so Module 1 is still the natural start.</div>`:''}
    <p class="crumbs">The pre-test samples 10 of the 30 practice questions, so you will meet these items again in module quizzes and the final assessment. Some improvement on repeat questions is expected and is not proof of learning gain.</p>
    <div class="row"><button class="btn ghost" id="rt">Retake</button><a class="btn" href="#/m/${C.modules[0].id}">Start module 1</a></div></div>`);
    $('#rt').onclick=()=>{S.preRetry=true;go()};return;
  }
  setMain(`<h1>📝 Pre-test: where are you starting from?</h1><div class="card"><p>10 questions, no pressure. This is a diagnostic only and does not count. Rate your confidence honestly; it tells you what you think you know.</p><div class="row"><button class="btn" id="st">Start</button></div></div>`);
  $('#st').onclick=()=>{const pool=poolItems();const items=C.preIds.map(i=>pool.find(x=>x.id===i)).filter(Boolean);
    quizEngine({title:'Pre-test',items,mastery:0,back:'#/pre',onFinish:(sc,t,w,res)=>{const mods={};res.forEach(r=>{const k=r.id.split(':')[0];mods[k]=mods[k]||[0,0];mods[k][1]++;if(r.ok)mods[k][0]++});
      S.pre={score:sc,date:Date.now(),mods};S.preRetry=false;save();
      $('#main').insertAdjacentHTML('beforeend',`<p><a class="btn alt" href="#/pre">See my personalised starting plan →</a></p>`)}})};
});
route(/^\/post$/,()=>{
  const ready=allMods();
  setMain(`<h1>🎯 Final assessment</h1><div class="card"><p>20 questions drawn from every module. Pass mark 80%. Take it when you feel ready, you can retry.</p>
  ${ready?'':'<div class="callout warn">You have not completed every module yet. You can still try it, but certification needs all modules complete.</div>'}
  ${S.post?`<p>Best so far: <b>${S.post.best}%</b></p>`:''}<div class="row"><button class="btn" id="st">Start final assessment</button></div></div>`);
  $('#st').onclick=()=>{const items=shuffle(poolItems()).slice(0,20);
    quizEngine({title:'Final assessment',items,mastery:80,back:'#/home',onFinish:(sc)=>{S.post={best:Math.max(sc,(S.post||{}).best||0),last:sc,date:Date.now()};save();
      if(sc>=80&&allMods())$('#main').insertAdjacentHTML('beforeend',`<p><a class="btn alt" href="#/cert">Claim certificate →</a></p>`)}})};
});

/* ---------- CASE ---------- */
route(/^\/case\/(\w+)$/,(id)=>{
  const m=mod(id),cs=m.case;let i=0,score=0;
  const draw=()=>{
    if(i>=cs.stages.length){S.cases[cs.id]=true;save();renderNav();
      setMain(`<div class="crumbs">Case: ${esc(cs.title)}</div><h1>Case complete</h1><div class="card"><p>${esc(cs.end)}</p><p>You chose the best option at ${score} of ${cs.stages.length} stages.</p><div class="row"><a class="btn" href="#/m/${id}">Back to module</a><a class="btn ghost" href="#/case/${id}">Replay</a></div></div>`);return}
    const st=cs.stages[i];
    setMain(`<div class="crumbs">${esc(m.title)} · Case: ${esc(cs.title)} · Stage ${i+1} of ${cs.stages.length}</div>
    <div class="card"><div class="eyebrow">Stage ${i+1}</div><p style="font-size:1.1rem">${esc(st.s)}</p>
    ${st.o.map((o,j)=>`<button class="opt" data-j="${j}">${esc(o)}</button>`).join('')}<div id="fb" aria-live="polite"></div></div>`);
    $$('.opt').forEach(b=>b.onclick=()=>{const j=+b.dataset.j;$$('.opt').forEach((x,y)=>{x.disabled=true;if(y===st.a)x.classList.add('ok');else if(y===j)x.classList.add('no')});
      if(j===st.a)score++;
      $('#fb').innerHTML=`<div class="fb ${j===st.a?'ok':'no'}">${refLinks(st.f[j])}${j!==st.a?`<br><b>Better:</b> ${refLinks(st.f[st.a])}`:''}</div><div style="margin-top:12px"><button class="btn" id="nx">${i+1<cs.stages.length?'Next stage →':'Finish case'}</button></div>`;
      $('#nx').focus();$('#nx').onclick=()=>{i++;draw()}});
  };
  draw();
});

/* ---------- FLASHCARDS (Leitner) ---------- */
route(/^\/flash$/,()=>{
  const now=Date.now(),day=864e5,ints=[0,day,3*day,7*day];
  const due=C.cards.map((c,i)=>({c,i,s:S.cards[i]||{box:0,due:0}})).filter(x=>x.s.due<=now);
  let queue=shuffle(due),flip=false;
  const mastered=C.cards.filter((_,i)=>(S.cards[i]||{box:0}).box>=3).length;
  const draw=()=>{
    if(!queue.length){
      setMain(`<h1>🃏 Flashcards</h1><div class="card"><p>No cards due right now 🎉</p><p>${mastered} of ${C.cards.length} cards at the top box.</p>
      <div class="row"><button class="btn" id="all">Practise all cards anyway</button><button class="btn ghost" id="anki">Export Anki TSV</button></div></div>`);
      $('#all').onclick=()=>{queue=shuffle(C.cards.map((c,i)=>({c,i,s:S.cards[i]||{box:0,due:0}})));draw()};
      $('#anki').onclick=exportAnki;return}
    const x=queue[0];
    setMain(`<h1>🃏 Flashcards</h1><p class="crumbs">${queue.length} left · ${mastered}/${C.cards.length} mastered · Space = flip, 1 = again, 2 = got it</p>
    <div class="flash ${flip?'flip':''}" id="fc" role="button" tabindex="0" aria-label="Flashcard. Press space to flip."><div class="in"><div class="f">${esc(x.c[0])}</div><div class="b">${esc(x.c[1])}</div></div></div>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="fl">Flip</button><button class="btn alt" id="ag">1 · Again</button><button class="btn" id="gt">2 · Got it</button></div>
    <div class="row" style="justify-content:center;margin-top:16px"><button class="btn ghost" id="anki">Export Anki TSV</button></div>`);
    const f=()=>{flip=!flip;$('#fc').classList.toggle('flip',flip)};
    $('#fc').onclick=f;$('#fl').onclick=f;
    const rate=ok=>{const s=S.cards[x.i]||{box:0,due:0};s.box=ok?Math.min(3,s.box+1):0;s.due=Date.now()+ints[s.box];S.cards[x.i]=s;save();queue.shift();if(!ok)queue.push(x);flip=false;draw()};
    $('#ag').onclick=()=>rate(false);$('#gt').onclick=()=>rate(true);$('#anki').onclick=exportAnki;
    $('#fc').onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();f()}};
    window.onkeydown=e=>{if(!location.hash.startsWith('#/flash')||['TEXTAREA','INPUT'].includes(document.activeElement.tagName))return;if(e.key===' '){e.preventDefault();f()}if(e.key==='1')rate(false);if(e.key==='2')rate(true)};
  };
  draw();
});
function exportAnki(){
  const t=C.cards.map(c=>c[0].replace(/\t/g,' ')+'\t'+c[1].replace(/\t/g,' ')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/tab-separated-values'}));a.download='breastfeeding-counselling-anki.tsv';a.click();toast('Anki file downloaded');
}

/* ---------- REVIEW QUEUE ---------- */
route(/^\/review$/,()=>{
  const pool=poolItems();const missed=pool.filter(q=>S.missed[q.id]>0);
  if(!missed.length){setMain(`<h1>🔁 Review queue</h1><div class="card"><p>Nothing to review. Missed practice or test questions will appear here until you answer them correctly.</p></div>`);return}
  setMain(`<h1>🔁 Review queue</h1><p>${missed.length} question(s) to revisit.</p><div id="rq"></div>`);
  $('#rq').innerHTML=`<div class="card"><button class="btn" id="go">Practise them now</button></div>`;
  $('#go').onclick=()=>quizEngine({title:'Review queue',items:missed,mastery:100,back:'#/review',onFinish:()=>{}});
});

/* ---------- SPOT THE PROBLEM ---------- */
route(/^\/spot$/,()=>{
  setMain(`<h1>🔍 Spot the problem</h1><p>Look, interpret, then decide: <i>image → observation → interpretation → what to do</i>. Challenge illustrations have point numbers and spoiler marks masked so you must use your own clinical judgement. Once you answer, the full original illustration and clinical reasoning are revealed.</p>
  ${C.spot.map((s,i)=>`<div class="card" data-i="${i}"><div class="grid c2"><div><div style="position:relative"><img class="spot-img" src="img/${s.img}_clean.jpg" alt="${esc(s.alt)}" style="max-width:100%;border-radius:12px;border:1px solid var(--line);display:block"><button class="iconbtn" data-zoom="img/${s.img}.jpg" data-alt="${esc(s.alt)}" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.65);color:#fff" aria-label="Enlarge image">🔍 Enlarge</button></div></div><div><b>${esc(s.q)}</b>${s.o.map((o,j)=>`<button class="opt" data-j="${j}">${String.fromCharCode(65+j)}. ${esc(o)}</button>`).join('')}<div class="fbx" aria-live="polite"></div></div></div></div>`).join('')}`);
  $$('.card[data-i]').forEach(card=>{const s=C.spot[+card.dataset.i];
    $$('.opt',card).forEach(b=>b.onclick=()=>{const j=+b.dataset.j;$$('.opt',card).forEach((x,y)=>{x.disabled=true;if(y===s.a)x.classList.add('ok');else if(y===j)x.classList.add('no')});
      const img=$('.spot-img',card);if(img)img.src=`img/${s.img}.jpg`;
      S.spot[s.img]=j===s.a;save();
      $('.fbx',card).innerHTML=`<div class="fb ${j===s.a?'ok':'no'}"><b>${j===s.a?'Correct.':'Not quite.'}</b> ${refLinks(s.why)}<p style="margin:.5em 0 0">📖 Review: ${refLinks(s.ref)}</p></div>`})});
});

/* ---------- OBSERVATION LAB ---------- */
route(/^\/lab$/,()=>{
  let tab=location.hash.includes('form')?'form':'obs';
  const draw=()=>{
    setMain(`<h1>🔬 Observation lab</h1><p>Practise what the B-R-E-A-S-T-Feed and breastfeeding assessment forms ask you to do: watch a feed, classify the signs, and plan counselling.</p>
    <div class="tabs" role="tablist"><button class="${tab==='obs'?'on':''}" data-t="obs">Observe a feed</button><button class="${tab==='form'?'on':''}" data-t="form">Interactive checklist</button><button class="${tab==='seq'?'on':''}" data-t="seq">Order the steps</button><button class="${tab==='doc'?'on':''}" data-t="doc">Primary source forms</button></div><div id="tabc"></div>`);
    $$('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;draw()});
    if(tab==='obs')labObs();else if(tab==='form')labForm();else if(tab==='seq')labSeq();else labDoc();
  };
  const labObs=()=>{
    $('#tabc').innerHTML=C.obs.map((o,oi)=>`<div class="card" data-oi="${oi}"><div class="eyebrow">${esc(o.t)}</div><p>${esc(o.scene)}</p>
      <p><b>For each sign below, is it present in this scenario?</b></p>
      ${o.items.map((it,ii)=>`<div class="row" style="margin:6px 0"><span style="flex:1;min-width:200px">${esc(it[0])} <span class="pill">${it[1]==='good'?'favourable':'unfavourable'}</span></span><button class="chip" data-v="1" data-ii="${ii}">Present</button><button class="chip" data-v="0" data-ii="${ii}">Absent</button></div>`).join('')}
      <button class="btn" data-check="${oi}">Check my answers</button><div class="fbo" aria-live="polite"></div></div>`).join('');
    $$('[data-oi]').forEach(card=>{const o=C.obs[+card.dataset.oi];const ans={};
      $$('.chip',card).forEach(c=>c.onclick=()=>{ans[c.dataset.ii]=c.dataset.v==='1';$$(`.chip[data-ii="${c.dataset.ii}"]`,card).forEach(x=>x.classList.toggle('sel',x===c))});
      $('[data-check]',card).onclick=()=>{let n=0;o.items.forEach((it,ii)=>{const ok=ans[ii]===o.present[ii];if(ok)n++;$$(`.chip[data-ii="${ii}"]`,card).forEach(x=>{x.classList.remove('sel','ok','no');if((x.dataset.v==='1')===o.present[ii])x.classList.add('ok');else if(ans[ii]!==undefined&&(x.dataset.v==='1')===ans[ii])x.classList.add('no')})});
        S.obs[o.id]=Math.max(S.obs[o.id]||0,pct(n,o.items.length));save();
        $('.fbo',card).innerHTML=`<div class="fb ${n===o.items.length?'ok':'no'}"><b>${n}/${o.items.length} correct.</b> ${esc(o.fb)}</div>`}});
  };
  const labForm=()=>{
    $('#tabc').innerHTML=`<div class="callout">Based on the <b>Breastfeeding Assessment Form</b> (04.08.2022). Use it as a coaching checklist while you watch a real or simulated feed. Tap an item to tick it.</div>`+C.assess.map((s,si)=>`<div class="card"><h3 style="margin-top:0">${esc(s.sec)}</h3><div class="grid c2"><div><b style="color:var(--ok)">Favourable behaviour</b>${s.good.map((g,i)=>`<label style="display:block;margin:6px 0"><input type="checkbox"> ${esc(g)}</label>`).join('')}</div><div><b style="color:var(--bad)">Unfavourable behaviour</b>${s.bad.map(g=>`<label style="display:block;margin:6px 0"><input type="checkbox"> ${esc(g)}</label>`).join('')}</div></div></div>`).join('')+`<div class="row noprint"><button class="btn ghost" onclick="window.print()">Print this checklist</button></div>`;
  };
  const labSeq=()=>{
    if(!S.seq||S.seq.length!==C.seq.length)S.seq=shuffle(C.seq.map((_,i)=>i));
    const d=()=>{ $('#tabc').innerHTML=`<p>Put the steps of a feed in the right order. Use the arrows.</p>${S.seq.map((v,i)=>`<div class="seqrow" data-i="${i}"><b>${i+1}.</b><span class="t">${esc(C.seq[v])}</span><button class="chip" data-up="${i}" aria-label="Move up">▲</button><button class="chip" data-dn="${i}" aria-label="Move down">▼</button></div>`).join('')}<div class="row"><button class="btn" id="cs">Check order</button><button class="btn ghost" id="sh">Shuffle</button></div><div id="fq" aria-live="polite"></div>`;
      $$('[data-up]').forEach(b=>b.onclick=()=>{const i=+b.dataset.up;if(i>0){[S.seq[i],S.seq[i-1]]=[S.seq[i-1],S.seq[i]];save();d()}});
      $$('[data-dn]').forEach(b=>b.onclick=()=>{const i=+b.dataset.dn;if(i<S.seq.length-1){[S.seq[i],S.seq[i+1]]=[S.seq[i+1],S.seq[i]];save();d()}});
      $('#sh').onclick=()=>{S.seq=shuffle(C.seq.map((_,i)=>i));save();d()};
      $('#cs').onclick=()=>{let n=0;$$('.seqrow').forEach((r,i)=>{const ok=S.seq[i]===i;if(ok)n++;r.classList.add(ok?'ok':'no')});$('#fq').innerHTML=`<div class="fb ${n===S.seq.length?'ok':'no'}"><b>${n}/${S.seq.length} in place.</b> ${n===S.seq.length?'Perfect: prepare, position, hold, attach, check, feed.':'Think: cues → prepare → position → shape breast → open wide → attach → check → feed.'}</div>`};
    };d();
  };
  draw();
});

/* ---------- TOOLS ---------- */
route(/^\/tools$/,()=>{
  setMain(`<h1>🛠️ Interactive tools</h1>
  <div class="card"><h2 style="margin-top:0">1. The breast clock (right breast, U-hold)</h2><p>The nipple is the centre. Tap where each part of the hand goes. (Source P18)</p><div id="clock"></div></div>
  <div class="card"><h2 style="margin-top:0">2. Mouth-opening meter</h2><p>Drag the slider to see when to attach. (Source P26, P31)</p><div id="gape"></div></div>
  <div class="card"><h2 style="margin-top:0">3. Three-point latch check</h2><p>Tick what you can see. (Source P30-P31, P41)</p><div id="latch"></div></div>
  <div class="card"><h2 style="margin-top:0">4. 24-hour feed rhythm</h2><p>Count feeds against the target (Source P42).</p><div id="rhythm"></div></div>`);
  /* clock */
  const parts=[['thumb','Thumb tip','9'],['fingers','Other fingertips','3'],['dip','Dip of the U','6']];
  let ci=0,cm={};
  const pos={12:[150,38],3:[262,150],6:[150,262],9:[38,150]};
  const clock=()=>{
    const cur=parts[ci];
    $('#clock').innerHTML=`<div class="grid c2"><svg viewBox="0 0 300 300" role="img" aria-label="Breast clock with 12, 3, 6 and 9 o'clock positions" style="max-width:340px;width:100%"><circle cx="150" cy="150" r="130" fill="#f6d1c1"/><circle cx="150" cy="150" r="62" fill="#a8546a"/><circle cx="150" cy="150" r="14" fill="#7a2e43"/>
    ${[12,3,6,9].map(n=>{const p=pos[n];const used=Object.entries(cm).filter(e=>e[1]===String(n)).map(e=>e[0]);return `<g tabindex="0" role="button" aria-label="${n} o'clock" data-n="${n}" style="cursor:pointer"><circle cx="${p[0]}" cy="${p[1]}" r="24" fill="${used.length?'#1b7f4b':'#0b5d6e'}"/><text x="${p[0]}" y="${p[1]+6}" fill="#fff" font-size="18" font-weight="700" text-anchor="middle">${n}</text></g>`}).join('')}</svg>
    <div>${ci<3?`<p><b>Where does the <u>${cur[1]}</u> go?</b></p><p class="crumbs">Tap a number on the clock.</p>`:`<div class="fb ok"><b>All placed.</b> Thumb tip 9 · other fingertips 3 · dip of the U at 6 (P18). Keep them at equal distance, three fingers from the nipple (P19-P20).</div><button class="btn" id="rc">Try again</button>`}<div id="cf" aria-live="polite"></div></div></div>`;
    $$('#clock [data-n]').forEach(g=>{const f=()=>{if(ci>=3)return;const ok=g.dataset.n===cur[2];$('#cf').innerHTML=`<div class="fb ${ok?'ok':'no'}">${ok?'Correct.':'Not quite — look at the clock again: thumb 9, fingers 3, dip 6.'}</div>`;if(ok){cm[cur[0]]=g.dataset.n;ci++;setTimeout(clock,500)}};g.onclick=f;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}});
    const r=$('#rc');if(r)r.onclick=()=>{ci=0;cm={};clock()};
  };clock();
  /* gape */
  $('#gape').innerHTML=`<label for="gr">Mouth opening: <b id="gv">90</b>°</label><input id="gr" class="range" type="range" min="0" max="180" value="90"><div class="grid c2"><svg viewBox="0 0 240 230" role="img" aria-label="Baby mouth opening wedge" style="max-width:300px;width:100%"><path id="gw" fill="#d9573a" opacity=".85"/><circle cx="30" cy="115" r="6" fill="#16252c"/></svg><div id="gt" aria-live="polite"></div></div>`;
  const gd=v=>{const a=v*Math.PI/360;const L=200;const x=30+L*Math.cos(a),y1=115-L*Math.sin(a),y2=115+L*Math.sin(a);$('#gw').setAttribute('d',`M30 115 L${x} ${y1} L${x} ${y2} Z`);$('#gv').textContent=v;
    $('#gt').innerHTML=v<120?`<div class="fb no"><b>Too narrow (&lt;120°).</b> Keep brushing the upper lip and wait, 2-3 minutes if needed. Do not push the nipple in (P26).</div>`:v<=160?`<div class="fb ok"><b>Ideal (120-160°).</b> Bring the baby to the breast, compress, and take the lower areola (P22, P26).</div>`:`<div class="fb ok"><b>Very wide (>160°).</b> This is beyond the source's quoted range; the principle is the same — attach with a wide open mouth.</div>`};
  $('#gr').oninput=e=>gd(+e.target.value);gd(90);
  /* latch */
  const L=[['Lower part of the areola is entirely inside the mouth','P30'],['Lower lip is curled outward','P28, P30'],['Mouth is open at least 120 degrees','P31'],['Lips and chin are embedded in the breast','P29'],['Cheeks are round and full, no dimple','P40']];
  $('#latch').innerHTML=L.map((l,i)=>`<label style="display:block;margin:8px 0"><input type="checkbox" data-l="${i}"> ${esc(l[0])} <span class="pill">${l[1]}</span></label>`).join('')+`<div id="lv" aria-live="polite"></div>`;
  const lv=()=>{const c=$$('[data-l]:checked').length;$('#lv').innerHTML=c===5?`<div class="fb ok"><b>Deep latch.</b> All signs present. Mother can release the breast hand to the baby's back (P32).</div>`:c>=3?`<div class="fb no"><b>Partly effective (${c}/5).</b> Find the missing sign and adjust: wide gape (P26), neck extension (P39), U-hold (P17-P24).</div>`:`<div class="fb no"><b>Shallow latch likely (${c}/5).</b> Detach with the little finger (P38), then reposition, wait for a wide mouth, and re-attach to the lower areola.</div>`};
  $$('[data-l]').forEach(x=>x.onchange=lv);lv();
  /* rhythm */
  let day=+S.tools.day||0,night=+S.tools.night||0;
  const rh=()=>{$('#rhythm').innerHTML=`<div class="grid c3"><div class="card"><b>Day feeds</b><div class="kpi">${day}</div><button class="btn ghost" data-r="d+">+1</button> <button class="btn ghost" data-r="d-">−1</button></div><div class="card"><b>Night feeds</b><div class="kpi">${night}</div><button class="btn ghost" data-r="n+">+1</button> <button class="btn ghost" data-r="n-">−1</button></div><div class="card"><b>Total / 24 h</b><div class="kpi">${day+night}</div><button class="btn ghost" data-r="x">Reset</button></div></div><div class="fb ${(day+night>=10&&night>=3)?'ok':'no'}" aria-live="polite">${(day+night>=10&&night>=3)?'Meets the source target: 10-12 feeds with at least 3-4 at night (P42).':'Target: 10-12 feeds in 24 hours with at least 3-4 at night (P42). '+(night<3?'Night feeds are below 3. ':'')+(day+night<10?'Total is below 10.':'')}</div>`;
    $$('[data-r]').forEach(b=>b.onclick=()=>{const r=b.dataset.r;if(r==='d+')day++;if(r==='d-'&&day>0)day--;if(r==='n+')night++;if(r==='n-'&&night>0)night--;if(r==='x'){day=0;night=0}S.tools.day=day;S.tools.night=night;save();rh()})};rh();
});

/* ---------- PROGRESS ---------- */
route(/^\/progress$/,()=>{
  const c=S.conf;const tot=Object.values(c).reduce((a,b)=>a+b,0);
  setMain(`<h1>📊 My progress</h1>
  <div class="grid c3"><div class="card"><div class="kpi">${overall()}%</div>course complete</div><div class="card"><div class="kpi">${S.pre?S.pre.score+'%':'—'}</div>pre-test</div><div class="card"><div class="kpi">${S.post?S.post.best+'%':'—'}</div>final assessment (best)</div></div>
  <div class="card"><h2 style="margin-top:0">Mastery by module</h2>${C.modules.map(m=>{const p=modProg(m);return `<div style="margin:10px 0"><a href="#/m/${m.id}">${m.icon} ${esc(m.title)}</a> <span class="pill">quiz ${p.q}%</span><span class="pill">${p.u}/${m.units.length} units</span><div class="bar"><i style="width:${p.pct}%"></i></div></div>`}).join('')}</div>
  <div class="card"><h2 style="margin-top:0">Confidence calibration</h2><p class="crumbs">Do you know what you know? ${tot} answers rated.</p>
  <table class="tbl"><tr><th></th><th>Right</th><th>Wrong</th></tr><tr><th>Sure</th><td>${c.sureRight}</td><td>${c.sureWrong}</td></tr><tr><th>Not sure</th><td>${c.unsureRight}</td><td>${c.unsureWrong}</td></tr><tr><th>Guessing</th><td>${c.guessRight}</td><td>${c.guessWrong}</td></tr></table>
  ${c.sureWrong>0?'<div class="callout err">"Sure but wrong" answers point to misconceptions. Check your Review queue.</div>':''}</div>
  <div class="card"><h2 style="margin-top:0">Your goal & self-remediation reflection</h2>
  <p><b>Learning Goal:</b> ${esc(S.goal)||'<i>No goal set yet.</i>'} (<a href="#/home">Edit</a>)</p>
  <div style="margin-top:12px">
    <label for="rf1"><b>What technique feels most solid for you now?</b></label>
    <textarea id="rf1" rows="2" placeholder="e.g. Recognizing the difference between U-hold and V-hold, checking the 120 degree gape...">${esc(S.reflect.solid||'')}</textarea>
  </div>
  <div style="margin-top:12px">
    <label for="rf2"><b>What specific point will you observe or coach next on the ward?</b></label>
    <textarea id="rf2" rows="2" placeholder="e.g. Checking for cheek dimples and using the little finger to detach...">${esc(S.reflect.practice||'')}</textarea>
  </div>
</div>
  <div class="card noprint"><div class="row"><button class="btn ghost" id="exp">Download my progress (JSON)</button><button class="btn ghost" id="rst">Reset all progress</button></div></div>`);
  $('#rf1').oninput=e=>{S.reflect.solid=e.target.value;save()};$('#rf2').oninput=e=>{S.reflect.practice=e.target.value;save()};$('#exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download='breastfeeding-course-progress.json';a.click()};
  $('#rst').onclick=()=>{if(confirm('Delete all saved progress on this device?')){localStorage.removeItem(KEY);location.hash='#/home';location.reload()}};
});

/* ---------- CERTIFICATE ---------- */
route(/^\/cert$/,()=>{
  const ok=allMods()&&S.post&&S.post.best>=80;
  if(!ok){setMain(`<h1>🏅 Certificate</h1><div class="card"><p>To earn the certificate of completion:</p><ul><li>${allMods()?'✓':'○'} Complete all 6 modules (units + 80% quiz${S.path==='deep'?' + cases':''})</li><li>${S.post&&S.post.best>=80?'✓':'○'} Score at least 80% on the final assessment</li></ul><p class="crumbs">Please note the certificate records completion of an online course. It does not certify clinical competence.</p></div>`);return}
  setMain(`<div class="cert"><div class="eyebrow">Vikkypaedia</div><h1>Certificate of Completion</h1><p>This certifies that</p><h2 style="font-size:2rem;margin:.2em 0">${esc(S.name)||'__________________'}</h2><p>has completed the self-directed online course</p><h2>Breastfeeding Counselling Masterclass</h2><p>Cross-cradle hold · U-hold · deep latch · observation and assessment</p><p>Final assessment: <b>${S.post.best}%</b> · ${new Date(S.post.date).toLocaleDateString()}</p><p style="font-size:.85rem;color:var(--muted)">Online knowledge assessment only. Not evidence of observed clinical competence.</p></div>
  <div class="row noprint" style="margin-top:16px"><button class="btn" onclick="window.print()">Print / save as PDF</button>${S.name?'':'<a class="btn ghost" href="#/home">Add your name</a>'}</div>`);
});

/* ---------- SOURCES ---------- */
route(/^\/sources$/,()=>{
  setMain(`<h1>📚 Sources, credits and limitations</h1>
  <div class="card"><h2 style="margin-top:0">Source documents</h2><ol>
  <li><b>Effective Counselling – Effective Breastfeeding: Cross Cradle Hold and 45 Counselling points for Breastfeeding.</b> Mother and Infant Nutrition Campaign by the Spoken Tutorial Project, IIT Bombay (Maa aur Shishu Poshan). Funded by the National Mission on Education through ICT, MHRD, Government of India. All 45 points and the illustrations in this course are from this booklet. Contact: health@spoken-tutorial.org · health.spoken-tutorial.org</li>
  <li><b>Breastfeeding Assessment Form</b> (version dated 04.08.2022): the assessment checklist in the Observation lab.</li>
  <li><b>B-R-E-A-S-T-Feed Observation Form</b>: adapted with permission from H.C. Armstrong, <i>Training Guide in Lactation Management</i>, New York, IBFAN and UNICEF, 1992.</li></ol></div>
  <div class="card"><h2 style="margin-top:0">How this course was built</h2><ul><li>Source-linked: statements are cited by point number (P1–P45).</li><li>Constructive alignment: every outcome maps to a teaching unit, an activity and a question (see the module blueprint).</li><li>Fictional cases, vignettes and question stems were authored for teaching and are not real patients.</li></ul></div>
  <div class="callout warn"><h3 style="margin-top:0">Limitations</h3><ul><li>The course reflects one booklet's technique. Some details (for example the 3-finger distance for the U-hold versus the 2-finger distance for hand expression, or the statement about not opening the mouth for 10 minutes) are the booklet's own and have not been independently checked against current WHO/UNICEF, national or professional guidance. Follow your local protocol.</li><li>Quiz performance is not clinical competence. Observe and be observed with real mother-baby pairs.</li><li>Left-breast hand positions are not described in the booklet; the course teaches the right-breast clock and notes mirror-image use for the lips only (P21).</li><li>Not reviewed by a specialist clinician; use as an educational aid.</li></ul></div>
  <div class="card"><h2 style="margin-top:0">Accessibility</h2><p>Targets WCAG 2.2 AA: keyboard operable, visible focus, text alternatives for illustrations, no meaning by colour alone (answers always have text), dark mode and reduced-motion support. A full audit has not been done.</p></div>`);
});

if(!location.hash)location.hash='#/home';
go();
})();

