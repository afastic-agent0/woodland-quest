import {fresh,identity,checkProfile,applyAnswer,applyHint} from './engine.js';
const NAME='cyber-signal-local';
let connection;
export function openDB(){if(connection)return Promise.resolve(connection);return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('This browser does not support the local database. Use a modern browser with site storage enabled.'));return;}
  const r=indexedDB.open(NAME,1);
  r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('profiles',{keyPath:'id'});const s=d.createObjectStore('answers',{keyPath:'id',autoIncrement:true});s.createIndex('profileId','profileId');};
  r.onerror=()=>reject(Error('Could not open local storage. Enable site storage and reload.'));
  r.onblocked=()=>reject(Error('Close other copies of this game, then reload to finish the database update.'));
  r.onsuccess=()=>{connection=r.result;connection.onversionchange=()=>{connection.close();connection=null;};resolve(connection);};
});}
function transaction(stores,mode,work){return openDB().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result,error;tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||Error('Could not save to the local database. Check available storage, then try again.'));tx.onerror=()=>{};try{work(tx,v=>{result=v;},e=>{error=e;tx.abort();});}catch(e){error=e;tx.abort();}}));}
export function loadPlayer(name){const {id}=identity(name);return transaction(['profiles'],'readwrite',(tx,set,fail)=>{const s=tx.objectStore('profiles');const r=s.get(id);r.onsuccess=()=>{try{const p=r.result?checkProfile(r.result):fresh(name);if(!r.result)s.add(p);set(p);}catch(e){fail(e);}};});}
export function answerPlayer(id,qid,choice){return transaction(['profiles','answers'],'readwrite',(tx,set,fail)=>{const s=tx.objectStore('profiles');const r=s.get(id);r.onsuccess=()=>{try{const result=applyAnswer(r.result,qid,choice);s.put(result.profile);tx.objectStore('answers').add(result.event);set(result);}catch(e){fail(e);}};});}
export function hintPlayer(id,qid){return transaction(['profiles'],'readwrite',(tx,set,fail)=>{const s=tx.objectStore('profiles');const r=s.get(id);r.onsuccess=()=>{try{const p=applyHint(r.result,qid);s.put(p);set(p);}catch(e){fail(e);}};});}
export function exportPlayer(id){return transaction(['profiles','answers'],'readonly',(tx,set)=>{const out={format:'cyber-signal-export-v1',exportedAt:new Date().toISOString()};const p=tx.objectStore('profiles').get(id);p.onsuccess=()=>{out.profile=p.result;set(out);};const a=tx.objectStore('answers').index('profileId').getAll(id);a.onsuccess=()=>{out.answers=a.result;set(out);};});}
