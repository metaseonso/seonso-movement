(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));

/* ---------- zones ---------- */
const ZONES=[
 {n:'Order',by:'the sanctuary · by initiation',t:'The innermost distance, and the smallest. Initiated, not enrolled. It is walked toward for years and then, on an ordinary day, entered.'},
 {n:'Society',by:'the third places · by joining',t:'Those who joined on purpose. Benefactors. They meet on a fixed rhythm and carry the practice into their own cities. The room stays small enough that it can still hear one person speak.'},
 {n:'Guild',by:'the safehouses · by admission',t:'Admitted rather than enrolled. Benefactors. Each is known by the others, and admission follows work already done.'},
 {n:'Community',by:'the broader ecology · by association',t:'The wider ecology of the collective. Patrons and guests. Nothing is asked and nothing is owed, and most who follow the movement never come nearer than this.'}
];
const rings=document.getElementById('rings'), zoneCopy=document.getElementById('zoneCopy');
function paintZone(i){
  const z=ZONES[i];
  zoneCopy.classList.add('swap');
  clearTimeout(paintZone._t);
  paintZone._t=setTimeout(()=>{
    zoneCopy.innerHTML=`<span class="count">${z.by}</span><h3>${z.n}</h3><p>${z.t}</p>`;
    rings.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.zone===String(i)));
    rings.querySelectorAll('.ringline').forEach(c=>c.classList.toggle('on', c.dataset.zone===String(i)));
    document.querySelectorAll('#proxemicFlank img').forEach(c=>c.classList.toggle('on', c.dataset.zone===String(i)));
    zoneCopy.classList.remove('swap');
  },160);
}
if(rings){
  rings.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click',()=>{ rings.classList.add('touched'); paintZone(+b.dataset.zone); });
  });
  paintZone(3);
}

/* ---------- object plates ---------- */
const OBJECTS=[
 {n:'Bamboo',k:'대',f:'bamboo-full',s:'the movement',t:'It grows faster than any wood and bends through weather that snaps harder timber. Bamboo is given where the movement has to move quickly, and it is jointed rather than solid, so it is never carried alone.'},
 {n:'Metal',k:'금',f:'metal-full',s:'stewardship',t:'Drawn out of ore under heat and cooled into a shape that holds. Metal marks custodianship. It is the gate a member passes when stewardship of something is handed to them, and it keeps the charge it was given.'},
 {n:'Heirloom',k:'가보',f:'heirloom-full',s:'inheritance',t:'It is what a member is given when a torch is passed, to steward what existed before them and what will exist after the torch is passed again.'},
 {n:'Taksu',k:'탁수',f:'taksu-full',s:'the landmark',t:'Stone, and fixed. Taksu marks the places the movement has crossed and blessed. It does not travel with a member; it stays where presence was given, so the ground keeps the record.'}
];
const plates=document.getElementById('plates');
if(plates) plates.innerHTML=OBJECTS.map((o,i)=>`<figure class="obj fade d${i+1}">
<span class="objart"><img src="assets/ink-${o.f}.png" alt=""></span>
<figcaption><span class="objkr">${o.k}</span><h3>${o.n}</h3><span class="objs">${o.s}</span><p>${o.t}</p></figcaption>
</figure>`).join('');

/* ---------- spiral geometry ---------- */
function spiralPath(cx,cy,turns,rMax,steps){
  let d='';
  for(let i=0;i<=steps;i++){
    const t=i/steps, a=t*turns*Math.PI*2, r=rMax*t;
    const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
    d+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);
  }
  return d;
}
const wmPath=document.getElementById('wmPath');
if(wmPath) wmPath.setAttribute('d',spiralPath(450,450,5.2,430,1400));
const prog=document.querySelector('.progress path');
if(prog){ prog.setAttribute('d',spiralPath(24,24,2.6,20,320)); const L=prog.getTotalLength(); prog.style.setProperty('--len',L); }

/* ---------- reveals ---------- */
let ioFired=false;
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting) return;
  ioFired=true;
  e.target.classList.add('in');
  io.unobserve(e.target);
}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.rev').forEach(s=>io.observe(s));
const ioFade=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting) return;
  e.target.classList.add('in');
  ioFade.unobserve(e.target);
}),{threshold:.14,rootMargin:'0px 0px -10% 0px'});
document.querySelectorAll('.fade,.seal').forEach(el=>ioFade.observe(el));
function revealAll(){
  document.querySelectorAll('.rev,.fade,.seal').forEach(s=>s.classList.add('in'));
  const e=document.querySelector('.enso img'); if(e) e.style.opacity='.92';
}
/* safety net: hidden tabs and blocked observers never tick */
setTimeout(()=>{ if(!ioFired) revealAll(); },3500);

/* ---------- scroll-linked ---------- */
const wm=document.querySelector('.watermark');
let target=0,cur=0;
function frame(){
  cur+=(target-cur)*0.12;
  const y=RM?target:cur;
  const doc=document.documentElement.scrollHeight-innerHeight;
  const p=clamp(y/Math.max(doc,1));
  if(wm) wm.style.transform=`translate(-50%,-50%) rotate(${y*0.02}deg) scale(${1+p*0.22})`;
  if(prog) prog.style.setProperty('--p',p.toFixed(4));
  requestAnimationFrame(frame);
}
addEventListener('scroll',()=>{target=scrollY},{passive:true});
target=cur=scrollY;
if(RM){ revealAll(); }
requestAnimationFrame(frame);

/* ---------- ink petals ---------- */

const cv=document.querySelector('canvas.petals');
if(cv && !RM){
  const ctx=cv.getContext('2d');
  let W,H,petals=[];
  const rs=()=>{W=cv.width=innerWidth*devicePixelRatio;H=cv.height=innerHeight*devicePixelRatio;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';};
  rs(); addEventListener('resize',rs);
  const mk=()=>({x:Math.random()*W,y:-Math.random()*H,s:(3.6+Math.random()*5.2)*devicePixelRatio,vy:(.14+Math.random()*.34)*devicePixelRatio,vx:(Math.random()-.5)*.28*devicePixelRatio,a:Math.random()*Math.PI*2,va:(Math.random()-.5)*.01,o:.16+Math.random()*.2});
  for(let i=0;i<22;i++) petals.push(mk());
  (function loop(){
    ctx.clearRect(0,0,W,H);
    for(const p of petals){
      p.y+=p.vy; p.x+=p.vx+Math.sin(p.y*0.004)*0.2*devicePixelRatio; p.a+=p.va;
      if(p.y>H+40){ Object.assign(p,mk()); p.y=-20; }
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
      ctx.shadowColor='rgba(34,26,22,'+p.o+')'; ctx.shadowBlur=6*devicePixelRatio;
      ctx.fillStyle='rgba(34,26,22,'+(p.o*0.85)+')';
      ctx.beginPath(); ctx.ellipse(0,0,p.s,p.s*0.34,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(loop);
  })();
}
})();
