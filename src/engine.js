import {questions, VERSION} from './questions.js';
export function identity(name) {
  const display=String(name).trim();
  if(!/^[A-Za-z0-9 _-]{2,24}$/.test(display)) throw new Error('Use 2–24 letters (A–Z), numbers, spaces, hyphens or underscores.');
  return {id:display.toLowerCase(),name:display};
}
export function fresh(name){const i=identity(name);return {...i,version:VERSION,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),solved:[],misses:{},hints:{},points:0};}
export function checkProfile(p){if(!p||p.version!==VERSION||!Array.isArray(p.solved)||p.solved.length>64||p.solved.some((x,i)=>x!==questions[i].id))throw Error('This saved campaign needs a compatible game version. Your data has not been changed.');return p;}
export function applyAnswer(original,qid,choice){const p=structuredClone(checkProfile(original)),q=questions[p.solved.length];
  if(!q||q.id!==qid)throw Error('Progress changed in another tab. Reload your campaign to continue.');
  if(!Number.isInteger(choice)||choice<0||choice>=q.options.length)throw Error('Choose one of the four answers.');
  const wrong=p.misses[qid]||[];if(wrong.includes(choice))throw Error('You already tried this answer. Choose another.');
  const correct=choice===q.answer;const points=correct?Math.max(10,100-wrong.length*30-(p.hints[qid]?20:0)):0;
  if(correct){p.solved.push(qid);p.points+=points;}else p.misses[qid]=[...wrong,choice];
  p.updatedAt=new Date().toISOString();
  const event={profileId:p.id,version:VERSION,questionId:qid,level:q.level+1,choice,answerText:q.options[choice],correct,points,hintUsed:Boolean(p.hints[qid]),attemptNumber:wrong.length+1,answeredAt:p.updatedAt};
  return {profile:p,event};
}
export function applyHint(original,qid){const p=structuredClone(checkProfile(original));if(questions[p.solved.length]?.id!==qid)throw Error('Progress changed. Reload your campaign.');p.hints[qid]=true;p.updatedAt=new Date().toISOString();return p;}
export function summary(p){return {solved:p.solved.length,levels:Math.floor(p.solved.length/8),points:p.points,firstTry:p.solved.filter(id=>!(p.misses[id]?.length)).length};}

// The walking world is presentation only: question order and saved state stay above.
export const REGIONS=['Mosslight Hollow','Willowmere','Stonewatch Rise','Silverstream Way','Moonleaf Grove','Lanternfell','Emberwood','Starlit Sanctuary'];
export function woodland(level=0){
  const width=2500,height=1350;
  const houses=Array.from({length:8},(_,i)=>({x:290+i*270,y:[590,460,680,480,690,470,660,500][i],slot:i}));
  let seed=173+level*819;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const trees=[];
  for(let i=0;i<150;i++){const t={x:60+random()*2380,y:280+random()*960,size:0.65+random()*0.7,pine:random()>.5};
    if(houses.some(h=>Math.hypot(h.x-t.x,h.y-t.y)<170)||houses.some((h,j)=>j<7&&t.x>=h.x-50&&t.x<=houses[j+1].x+50&&Math.abs(t.y-(h.y+65+(houses[j+1].y-h.y)*(t.x-h.x)/270))<110)||Math.hypot(t.x-160,t.y-740)<120)continue;
    if(((t.x-1760)/320)**2+((t.y-1080)/150)**2<1.3)continue;
    trees.push(t);
  }
  function blocked(x,y){return x<35||x>width-35||y<300||y>height-45||houses.some(h=>Math.abs(x-h.x)<93&&y>h.y-140&&y<h.y+8)||trees.some(t=>Math.hypot(x-t.x,y-t.y)<22*t.size)||((x-1760)/305)**2+((y-1080)/138)**2<1;}
  return {width,height,houses,trees,blocked};
}
export function trailRoute(world,start,target){
  const cell=35,cols=Math.ceil(world.width/cell),rows=Math.ceil(world.height/cell);
  const grid=p=>({x:Math.round(p.x/cell),y:Math.round(p.y/cell)});
  const a=grid(start),b=grid(target),key=p=>p.y*cols+p.x;
  const clear=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&!world.blocked(x*cell,y*cell);
  if(!clear(b.x,b.y))return [];
  const nodes=new Map([[key(a),{...a,g:0,f:0,parent:null}]]),open=new Set([key(a)]),closed=new Set();
  while(open.size){let id=null;for(const v of open)if(id===null||nodes.get(v).f<nodes.get(id).f)id=v;
    const p=nodes.get(id);open.delete(id);if(p.x===b.x&&p.y===b.y){const path=[];let n=p;while(n.parent!==null){path.push({x:n.x*cell,y:n.y*cell});n=nodes.get(n.parent);}path.reverse();if(!world.blocked(target.x,target.y))path.push(target);return path;}
    closed.add(id);
    for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const x=p.x+dx,y=p.y+dy,k=key({x,y});if(closed.has(k)||!clear(x,y)||(dx&&dy&&(!clear(p.x+dx,p.y)||!clear(p.x,p.y+dy))))continue;
      if([.25,.5,.75].some(t=>world.blocked((p.x+dx*t)*cell,(p.y+dy*t)*cell)))continue;
      const g=p.g+Math.hypot(dx,dy),old=nodes.get(k);if(!old||g<old.g){nodes.set(k,{x,y,g,f:g+Math.hypot(x-b.x,y-b.y),parent:id});open.add(k);}
    }
  }return [];
}
export function createLandscape(canvas,{level=0,solved=0,position,onDoor,onNear,onMessage,controls}){
  const world=woodland(level),ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas graphics are unavailable. Use the door list below.');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),life=new AbortController(),signal=life.signal;
  const patch=position&&!world.blocked(position.x,position.y)?{...position}:{x:160,y:740};
  let w=1,h=1,dpr=1,zoom=1,camera={...patch},keys=new Set(),route=[],frame=0,last=0,time=0,step=0,near=-1,walking=false,dead=false,knockUntil=0;
  const colors=[['#214435','#346747','#547852'],['#193f42','#35665f','#639577'],['#303e39','#596252','#939474'],['#193e4a','#316777','#77a6a0'],['#2b334c','#47466a','#9692b1'],['#354637','#61634a','#a28e62'],['#443c32','#766043','#b17d50'],['#28384b','#455b73','#8998b9']][level];
  const land=document.createElement('canvas');land.width=world.width;land.height=world.height;const g=land.getContext('2d');
  function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  function round(c,x,y,ww,hh,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,ww,hh,r);c.fill();}
  const grad=g.createLinearGradient(0,0,0,world.height);grad.addColorStop(0,'#101e30');grad.addColorStop(.3,colors[0]);grad.addColorStop(1,colors[1]);g.fillStyle=grad;g.fillRect(0,0,world.width,world.height);
  oval(g,1970,90,42,42,'#c5d3b9');oval(g,1987,77,38,38,'#142638');
  for(let i=0;i<12;i++){const x=i*245;polygon(g,[[x-170,320],[x+90,75+(i%3)*35],[x+330,330]],'#253c49');polygon(g,[[x+25,133+(i%3)*35],[x+90,75+(i%3)*35],[x+142,138+(i%3)*35],[x+99,120+(i%3)*35]],'#6b8889');}
  for(let i=0;i<13;i++)oval(g,i*230,320+(i%2)*55,270,95,colors[0]);
  let seed=9823;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1900;i++){const x=rnd()*2500,y=350+rnd()*1000;g.globalAlpha=.14;oval(g,x,y,3+rnd()*15,2+rnd()*5,i%2?'#99bb78':'#09272c');}g.globalAlpha=1;
  // The broad winding lane connects all eight cottages.
  function road(stroke,width){g.strokeStyle=stroke;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(100,810);g.lineTo(160,740);for(const a of world.houses)g.lineTo(a.x,a.y+65);g.lineTo(2420,620);g.stroke();}
  road('#314736',92);road('#a89470',76);road('#c1aa7d',58);
  for(const a of world.houses){g.strokeStyle='#c1aa7d';g.lineWidth=40;g.beginPath();g.moveTo(a.x,a.y+70);g.lineTo(a.x,a.y+12);g.stroke();}
  oval(g,1760,1080,325,157,'#1e403e');oval(g,1760,1080,304,136,'#386978');oval(g,1760,1070,285,112,'#477c87');
  for(let i=0;i<30;i++){g.strokeStyle='#a2c6b844';g.lineWidth=2;const x=1520+rnd()*430,y=1000+rnd()*150;g.beginPath();g.moveTo(x,y);g.lineTo(x+20+rnd()*40,y);g.stroke();}
  for(let i=0;i<210;i++){const x=40+rnd()*2420,y=340+rnd()*950;if(world.blocked(x,y)||world.houses.some(a=>Math.hypot(x-a.x,y-a.y)<150))continue;g.fillStyle=i%4?'#c9c78b':'#a8a3e3';g.fillRect(x,y,3,3);g.fillStyle='#284831';g.fillRect(x+1,y+3,1,5);}
  // Weathered stones and a small wooden footbridge in the meadow.
  for(let i=0;i<30;i++){const x=50+rnd()*2380,y=900+rnd()*300;if(!world.blocked(x,y)){oval(g,x,y,12,7,'#243e3b');oval(g,x,y-3,10,6,'#83907a');}}
  round(g,2110,1080,160,40,8,'#574b36');for(let i=0;i<12;i++){g.fillStyle='#a59167';g.fillRect(2115+i*13,1082,10,36);}g.fillStyle='#ccb78a';g.fillRect(2108,1077,166,5);g.fillRect(2108,1118,166,5);
  function tree(t){const {x,y,size:s,pine}=t;ctx.save();if(Math.abs(patch.x-x)<65*s&&patch.y<y&&patch.y>y-145*s)ctx.globalAlpha=.4;ctx.translate(x,y);ctx.scale(s,s);oval(ctx,12,5,45,17,'#082a2855');round(ctx,-6,-55,13,60,4,'#64543d');if(pine){for(let i=0;i<3;i++)polygon(ctx,[[-49+i*8,-29-i*25],[0,-130-i*11],[49-i*8,-29-i*25]],i===1?'#33584b':'#274b40');}else{oval(ctx,0,-80,50,49,'#234737');oval(ctx,-23,-91,32,31,'#3b6549');oval(ctx,17,-111,35,33,colors[2]);oval(ctx,29,-76,29,28,'#446e4d');}ctx.restore();}
  function house(a){const {x,y,slot}=a,done=slot<solved,active=slot===solved;ctx.save();ctx.translate(x,y);oval(ctx,8,4,107,28,'#0b272860');
    round(ctx,-85,-110,170,108,10,'#ba9a72');round(ctx,-79,-99,158,90,5,'#c3aa80');
    ctx.fillStyle='#776345';ctx.fillRect(-77,-58,154,6);ctx.fillRect(-67,-103,7,99);ctx.fillRect(60,-103,7,99);ctx.fillRect(-83,-14,165,13);
    round(ctx,42,-169,21,55,3,'#867864');ctx.fillStyle='#b8aa8d';ctx.fillRect(39,-174,27,9);
    if(!reduced.matches){for(let i=0;i<3;i++){const p=(time*.25+i/3)%1;oval(ctx,54+Math.sin(time+p*5)*9,-180-p*60,7+p*13,5+p*9,`rgba(205,216,196,${.15*(1-p)})`);}}
    polygon(ctx,[[-103,-105],[0,-181],[103,-105],[86,-91],[0,-150],[-85,-91]],slot%2?'#555379':'#57615b');polygon(ctx,[[-103,-105],[0,-181],[4,-166],[-87,-101]],'#829085');
    ctx.strokeStyle='#292e3c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-103,-105);ctx.lineTo(0,-181);ctx.lineTo(103,-105);ctx.stroke();
    for(const wx of [-49,49]){round(ctx,wx-16,-83,32,31,5,'#5b4b3c');round(ctx,wx-12,-80,24,25,4,slot>solved?'#85918c':'#f3d991');ctx.fillStyle='#765a3e';ctx.fillRect(wx-2,-81,4,28);ctx.fillRect(wx-12,-69,25,3);}
    round(ctx,-24,-62,48,61,22,'#5d4e39');round(ctx,-18,-54,36,52,15,done?'#85945d':active?'#af8153':'#555c58');ctx.fillStyle='#d6c784';ctx.beginPath();ctx.arc(10,-25,3,0,Math.PI*2);ctx.fill();
    if(active){ctx.shadowBlur=18;ctx.shadowColor='#baff52';ctx.strokeStyle='#c9ec86';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-23,-61,46,61,21);ctx.stroke();ctx.shadowBlur=0;}
    round(ctx,-25,7,50,11,3,'#8e8a70');ctx.fillStyle=done?'#c6ec91':active?'#ffe4a3':'#a7bab1';ctx.textAlign='center';ctx.font='bold 16px system-ui';ctx.fillText(done?'✓':String(slot+1),0,-111);
    // Lantern, hanging sign and garden planters.
    ctx.strokeStyle='#4e4a34';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(81,-83);ctx.lineTo(102,-83);ctx.lineTo(102,-67);ctx.stroke();
    if(slot<=solved){const glow=ctx.createRadialGradient(102,-53,2,102,-53,33);glow.addColorStop(0,'#ffdc8660');glow.addColorStop(1,'#ffdc8600');ctx.fillStyle=glow;ctx.fillRect(65,-90,75,75);}round(ctx,96,-64,13,20,3,slot<=solved?'#f3cf83':'#58615a');
    for(const bx of [-73,67]){round(ctx,bx-15,-10,29,14,3,'#70503a');oval(ctx,bx,-12,18,8,'#598252');oval(ctx,bx+4,-17,4,4,'#b6a2d6');}
    if(active&&near===slot){ctx.fillStyle='#122624ed';ctx.beginPath();ctx.roundRect(-72,-222,144,29,12);ctx.fill();ctx.font='bold 12px system-ui';ctx.fillStyle='#e7f3cd';ctx.fillText(knockUntil>time?'Knock, knock…':'E / SPACE · KNOCK',0,-202);}
    ctx.restore();}
  function robot(){ctx.save();ctx.translate(patch.x,patch.y);const bob=walking&&!reduced.matches?Math.sin(step*2)*2:0,swing=walking&&!reduced.matches?Math.sin(step)*6:0;oval(ctx,1,3,22,9,'#0c202970');ctx.translate(0,bob);
    round(ctx,-16,-13+swing,12,16,5,'#202c38');round(ctx,4,-13-swing,12,16,5,'#202c38');
    polygon(ctx,[[-16,-40],[16,-40],[24,-9],[-23,-9]],'#555378');round(ctx,-15,-39,30,28,7,'#a0bfa1');round(ctx,-10,-35,20,20,4,'#263d43');round(ctx,-6,-31,12,7,2,'#baff52');
    round(ctx,-23,-37,9,23,4,'#a8ba99');round(ctx,16,-38,9,22,4,'#a8ba99');ctx.strokeStyle='#927d59';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(29,-2);ctx.lineTo(29,-48);ctx.stroke();oval(ctx,29,-49,4,6,'#c6e783');
    round(ctx,-21,-72,42,33,10,'#b0c7b2');round(ctx,-16,-66,32,20,7,'#142b36');oval(ctx,-7,-57,3,4,'#c1f889');oval(ctx,7,-57,3,4,'#c1f889');ctx.strokeStyle='#ccf2a3';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-54,6,.25,Math.PI-.25);ctx.stroke();
    ctx.strokeStyle='#809b82';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-72);ctx.lineTo(2,-82);ctx.stroke();oval(ctx,2,-83,4,4,'#baff52');round(ctx,-23,-44,45,6,3,'#9992c8');ctx.restore();}
  function resize(){const r=canvas.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);zoom=w<600?.83:1;}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function updateNear(){const found=world.houses.find(a=>Math.hypot(patch.x-a.x,patch.y-(a.y+30))<76);const v=found?.slot??-1;if(v!==near){near=v;onNear?.(v);}}
  function knock(){if(dead||knockUntil>time)return;updateNear();if(near<0){onMessage?.('Walk up to a cottage door first.');return;}if(near>solved){onMessage?.(`This door is asleep. Visit door ${solved+1} first.`);return;}route=[];keys.clear();knockUntil=time+.28;const selected=near;setTimeout(()=>{if(!dead)onDoor(selected);},reduced.matches?0:280);}
  function go(slot){const a=world.houses[slot];if(!a)return;route=trailRoute(world,patch,{x:a.x,y:a.y+35});keys.clear();onMessage?.(route.length?`Following the trail to door ${slot+1}. Knock when Patch arrives.`:'Use the arrow keys to move into the open, then try again.');}
  function key(e,down){if(document.querySelector('dialog[open]')||document.hidden)return;if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','e','E',' '].includes(e.key)||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.target!==canvas)return;e.preventDefault();if(['e','E',' '].includes(e.key)){if(down&&!e.repeat)knock();return;}if(down){keys.add(e.key.toLowerCase());route=[];}else keys.delete(e.key.toLowerCase());}
  canvas.addEventListener('keydown',e=>key(e,true),{signal});canvas.addEventListener('keyup',e=>key(e,false),{signal});canvas.addEventListener('blur',()=>keys.clear(),{signal});
  window.addEventListener('blur',()=>{keys.clear();route=[];},{signal});document.addEventListener('visibilitychange',()=>{keys.clear();route=[];last=0;},{signal});
  canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});const r=canvas.getBoundingClientRect(),x=camera.x+(e.clientX-r.left-w/2)/zoom,y=camera.y+(e.clientY-r.top-h/2)/zoom;const house=world.houses.find(a=>Math.abs(a.x-x)<102&&y>a.y-190&&y<a.y+45);if(house){if(near===house.slot)knock();else go(house.slot);}else if(!world.blocked(x,y)){keys.clear();route=trailRoute(world,patch,{x,y});}},{signal});
  for(const button of controls?.querySelectorAll('[data-walk]')||[]){button.addEventListener('pointerdown',e=>{e.preventDefault();route=[];keys.add(button.dataset.walk);button.setPointerCapture(e.pointerId);},{signal});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.walk),{signal});}
  function draw(now){if(dead)return;frame=requestAnimationFrame(draw);if(document.hidden){last=0;return;}const dt=last?Math.min((now-last)/1000,.04):0;last=now;time+=dt;
    let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
    if(!dx&&!dy&&route.length){const p=route[0],distance=Math.hypot(p.x-patch.x,p.y-patch.y);if(distance<5){route.shift();}else{dx=(p.x-patch.x)/distance;dy=(p.y-patch.y)/distance;}}
    walking=Boolean(dx||dy);if(walking){const length=Math.hypot(dx,dy),speed=Math.min(195*dt,route.length?Math.hypot(route[0].x-patch.x,route[0].y-patch.y):Infinity),nx=patch.x+dx/length*speed,ny=patch.y+dy/length*speed;let moved=false;
      if(!world.blocked(nx,patch.y)){patch.x=nx;moved=true;}if(!world.blocked(patch.x,ny)){patch.y=ny;moved=true;}if(!moved)route=[];step+=dt*10;}
    const follow=reduced.matches?1:1-Math.exp(-dt*7);camera.x+=(patch.x-camera.x)*follow;camera.y+=(patch.y-camera.y)*follow;camera.x=Math.max(w/zoom/2,Math.min(world.width-w/zoom/2,camera.x));camera.y=Math.max(h/zoom/2,Math.min(world.height-h/zoom/2,camera.y));updateNear();
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2,h/2);ctx.scale(zoom,zoom);ctx.translate(-camera.x,-camera.y);ctx.drawImage(land,0,0);
    if(route.length){const p=route.at(-1);ctx.strokeStyle='#e8dca2aa';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,13,7,0,0,Math.PI*2);ctx.stroke();}
    const entities=[...world.trees.map(t=>({y:t.y,draw:()=>tree(t)})),...world.houses.map(a=>({y:a.y,draw:()=>house(a)})),{y:patch.y,draw:robot}];entities.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
    if(!reduced.matches){for(let i=0;i<20;i++){const x=(i*137+Math.sin(time*.6+i)*18)%world.width,y=400+(i*97)%800+Math.sin(time+i)*9;oval(ctx,x,y,2,2,`rgba(217,239,153,${.25+Math.sin(time+i)*.2})`);}}
    ctx.restore();const vignette=ctx.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,w*.7);vignette.addColorStop(0,'#07172000');vignette.addColorStop(1,'#07172077');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    // Tiny route overview stays legible on narrow screens.
    const mw=Math.min(240,w*.42),mx=w-mw-18,my=20;round(ctx,mx-8,my-8,mw+16,72,12,'#10232bdb');ctx.strokeStyle='#9c9271';ctx.lineWidth=2;ctx.beginPath();world.houses.forEach((a,i)=>{const x=mx+a.x/world.width*mw,y=my+13+(a.y-450)/12;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();world.houses.forEach(a=>oval(ctx,mx+a.x/world.width*mw,my+13+(a.y-450)/12,4,4,a.slot<solved?'#baff52':a.slot===solved?'#ffe0a2':'#84948f'));oval(ctx,mx+patch.x/world.width*mw,my+13+(patch.y-450)/12,3,3,'#b8b2ff');
  }
  frame=requestAnimationFrame(draw);
  return {go,knock,get position(){return {...patch};},destroy(){dead=true;cancelAnimationFrame(frame);observer.disconnect();life.abort();keys.clear();}};
}
