import assert from 'node:assert/strict';
import {questions,levels,sources} from './questions.js';
import {fresh,identity,applyAnswer,applyHint,summary} from './engine.js';
assert.equal(questions.length,64);assert.equal(levels.length,8);assert.equal(new Set(questions.map(q=>q.id)).size,64);
for(let l=0;l<8;l++){const qs=questions.filter(q=>q.level===l);assert.equal(qs.length,8);assert.equal(qs.filter(q=>q.ai).length,2);}
for(const q of questions){assert.equal(new Set(q.options).size,4);assert(q.answer>=0&&q.answer<4);assert(sources[q.source]);assert(q.hint&&q.explanation&&q.scenario);}
assert.equal(identity(' NightOwl ').id,'nightowl');assert.throws(()=>identity('<script>'));assert.throws(()=>identity('a'));
let p=fresh('Tester');assert.throws(()=>applyAnswer(p,questions[8].id,0));assert.throws(()=>applyAnswer(p,questions[0].id,4));
for(const q of questions){const before=p;const {profile,event}=applyAnswer(p,q.id,q.answer);p=profile;assert.equal(event.correct,true);assert.equal(event.points,100);assert.equal(before.solved.length,p.solved.length-1);assert.throws(()=>applyAnswer(p,q.id,q.answer));if(p.solved.length%8===0)assert.equal(summary(p).levels,(q.level+1));}
assert.equal(summary(p).solved,64);assert.equal(p.points,6400);assert.throws(()=>applyAnswer(p,'L9Q1',0));
p=fresh('Misses');const q=questions[0],wrong=[0,1,2,3].filter(i=>i!==q.answer);p=applyHint(p,q.id);for(const c of wrong){p=applyAnswer(p,q.id,c).profile;assert.equal(p.solved.length,0);assert.throws(()=>applyAnswer(p,q.id,c));}const last=applyAnswer(p,q.id,q.answer);assert.equal(last.event.points,10);assert.equal(last.event.attemptNumber,4);assert.equal(last.event.hintUsed,true);assert.equal(summary(last.profile).firstTry,0);
const restored=JSON.parse(JSON.stringify(last.profile));assert.equal(applyAnswer(restored,questions[1].id,questions[1].answer).profile.solved.length,2);
console.log('PASS: 64 unique questions; 8x8 domains; 16 AI missions; all level boundaries; scoring; wrong-answer retries; hints; immutable updates; sequential gates; restore; nickname validation.');
