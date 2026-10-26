import {isAvatar} from './avatars.mjs';
import {validate as validateLegacy} from './ledger.mjs';
import {validateGames} from './games.mjs?v=3';
export const SCORE_KEY='qian-yibei.score.v2';
export const LEGACY_KEY='qian-yibei.v1';
export const validPoints=n=>Number.isSafeInteger(n)&&n!==0&&Math.abs(n)<=999999999;
export const score=(data,id)=>data.records.filter(r=>r.personId===id).reduce((sum,r)=>sum+r.points,0);
export const rankedPeople=data=>[...data.people].sort((a,b)=>score(data,b.id)-score(data,a.id)||a.createdAt.localeCompare(b.createdAt));
export function validateScore(data){
  const fail=()=>{throw Error('计分数据格式有误，请使用有效备份')};
  if(data?.version!==2||data.mode!=='shared-score'||!Array.isArray(data.people)||!Array.isArray(data.records))fail();
  if(data.profile!==undefined&&(!data.profile||typeof data.profile.name!=='string'||!data.profile.name.trim()||data.profile.name.length>30||(data.profile.avatar!==undefined&&!isAvatar(data.profile.avatar))))fail();
  if(data.legacy!==undefined)validateLegacy(data.legacy);
  if(data.games!==undefined)validateGames(data.games);
  if(data.removedPeople!==undefined&&!Array.isArray(data.removedPeople))fail();
  const ids=new Set(),recordIds=new Set(),names=new Set();let total=0;
  const timestamp=t=>typeof t==='string'&&Number.isFinite(Date.parse(t));
  const person=(p,active)=>{if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>30||!timestamp(p.createdAt)||!timestamp(p.updatedAt)||(p.avatar!==undefined&&!isAvatar(p.avatar))||(p.lastAdventure!==undefined&&(typeof p.lastAdventure!=='string'||p.lastAdventure.length>300)))fail();if(active&&names.has(p.name))fail();if(active)names.add(p.name);ids.add(p.id)};
  const records=(rows,personIds)=>{for(const r of rows){if(!r||!personIds.has(r.personId)||typeof r.id!=='string'||!r.id||recordIds.has(r.id)||!validPoints(r.points)||typeof r.reason!=='string'||r.reason.length>200||!timestamp(r.createdAt)||!timestamp(r.updatedAt)||typeof r.batchId!=='string'||!r.batchId)fail();recordIds.add(r.id);total+=Math.abs(r.points);if(!Number.isSafeInteger(total))fail()}};
  for(const p of data.people)person(p,true);records(data.records,new Set(data.people.map(p=>p.id)));
  for(const entry of data.removedPeople||[]){if(!entry||!Array.isArray(entry.records)||!timestamp(entry.removedAt))fail();person(entry.person,false);records(entry.records,new Set([entry.person.id]));}
  if(data.results!==undefined){if(!Array.isArray(data.results)||data.results.length>30)fail();const resultIds=new Set();for(const r of data.results){validateResult(r);if(resultIds.has(r.id))fail();resultIds.add(r.id)}}
  return data;
}
export function freshScore(){return {version:2,mode:'shared-score',people:[],records:[],removedPeople:[]}}
export function migrateLegacy(legacy){
  validateLegacy(legacy);const next=freshScore(),now=new Date().toISOString();
  next.legacy=structuredClone(legacy);
  if(legacy.profile)next.profile=structuredClone(legacy.profile);
  // Sample names are not silently presented as real participants.
  if(!legacy.demo)next.people=legacy.people.map(p=>({...p,createdAt:p.createdAt||now,updatedAt:now}));
  return validateScore(next);
}
export function addPoints(data,personId,points,reason,ids){
  if(!validPoints(points))throw Error('分数必须是非零整数，且不超过 999999999');
  const p=data.people.find(p=>p.id===personId);if(!p)throw Error('这位成员已不在名单中');
  const now=new Date().toISOString();data.records.push({id:ids.id,personId,points,reason,createdAt:now,updatedAt:now,batchId:ids.batchId});p.updatedAt=now;
}
export function resetScores(data,people,uid){
  const batchId=uid();for(const p of people){const n=score(data,p.id);if(!n)continue;
    // Large totals are split into valid entries in the same reversible operation.
    let remaining=-n;while(remaining){const points=Math.sign(remaining)*Math.min(Math.abs(remaining),999999999);addPoints(data,p.id,points,'积分归零',{id:uid(),batchId});remaining-=points;}
  }
}
export function undoLast(data,uid){
  const last=data.records.at(-1);if(!last)throw Error('还没有可撤销的记录');
  const rows=data.records.filter(r=>r.batchId===last.batchId),batchId=uid();
  for(const r of rows)addPoints(data,r.personId,-r.points,'撤销：'+r.reason.slice(0,195),{id:uid(),batchId});
}

export function addMemberRow(data, id, now = new Date().toISOString()) {
  const names = new Set([...data.people, ...(data.removedPeople || []).map(entry => entry.person)].map(p => p.name));
  let number = 1;
  while (names.has(`成员${number}`)) number++;
  const person = {id, name: `成员${number}`, createdAt: now, updatedAt: now};
  data.people.push(person);
  return person;
}

export function setCupCount(data, personId, value, uid) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 999999999) throw Error('杯数请填 0–999999999 的整数');
  if (!data.people.some(person => person.id === personId)) throw Error('这位成员已不在名单中');
  let delta = value - score(data, personId);
  const batchId = uid();
  while (delta) {
    const points = Math.sign(delta) * Math.min(Math.abs(delta), 999999999);
    addPoints(data, personId, points, value === 0 ? '杯数清空' : '调整杯数', {id: uid(), batchId});
    delta -= points;
  }
}

export function validateResult(result){
  if(result?.unit!==undefined&&!['杯','分'].includes(result.unit))throw Error('结果单位无效');
  if(!result||typeof result.id!=='string'||!result.id||typeof result.title!=='string'||!result.title.trim()||[...result.title].length>24||typeof result.createdAt!=='string'||!Number.isFinite(Date.parse(result.createdAt))||!Array.isArray(result.people)||!result.people.length||!Number.isSafeInteger(result.recordCount)||result.recordCount<0)throw Error('成绩单格式有误');
  const ids=new Set();let total=0,previous=Infinity;
  for(const p of result.people){if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>30||(!Number.isSafeInteger(p.points)||(p.avatar!==undefined&&!isAvatar(p.avatar))))throw Error('成绩单成员数据有误');if(p.points>previous)throw Error('成绩单排序有误');previous=p.points;ids.add(p.id);total+=Math.abs(p.points);if(!Number.isSafeInteger(total))throw Error('成绩单分数超过范围')}
  return result;
}
export function makeResult(data,title,id,createdAt=new Date().toISOString()){
  if(!data.people.length)throw Error('请先添加成员再保存结果');
  return validateResult({id,title:title.trim(),createdAt,recordCount:data.records.length,people:rankedPeople(data).map(p=>({id:p.id,name:p.name,points:score(data,p.id),...(p.avatar?{avatar:p.avatar}:{})}))});
}
