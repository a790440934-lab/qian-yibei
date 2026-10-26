import {isAvatar} from './avatars.mjs';
import {cupUnits,validCups,validateDrinks} from './drinks.mjs';
export {validCups} from './drinks.mjs';
const signedUnits=r=>(r.direction==='owed_to_me'?1:-1)*cupUnits(r.cups,r.rateUnits??1000);
export const delta=r=>signedUnits(r)/1000;
export const balance=(data,id)=>data.records.filter(r=>r.personId===id).reduce((s,r)=>s+signedUnits(r),0)/1000;
export const totals=data=>{const t=data.people.reduce((s,p)=>{const n=Math.round(balance(data,p.id)*1000);s[n>=0?'owed':'owe']+=Math.abs(n);return s},{owed:0,owe:0});return {owed:t.owed/1000,owe:t.owe/1000}};
export const repayment=(b,cups)=>{if(!validCups(cups)||Math.round(cups*1000)>Math.round(Math.abs(b)*1000))throw Error('还杯数不能超过当前欠杯数');return {direction:b>0?'i_owe':'owed_to_me',cups}};
export const sortedPeople=data=>[...data.people].sort((a,b)=>{const x=balance(data,a.id),y=balance(data,b.id);return Number(y!==0)-Number(x!==0)||Math.abs(y)-Math.abs(x)||b.updatedAt.localeCompare(a.updatedAt)});
export function validate(data){
  if(data?.version!==1||!Array.isArray(data.people)||!Array.isArray(data.records))throw Error('数据格式无法识别');
  validateDrinks(data);
  if(data.profile!==undefined){const p=data.profile;if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>30||(p.avatar!==undefined&&!isAvatar(p.avatar)))throw Error('我的资料有误')}
  const ids=new Set();for(const p of data.people){if(typeof p.id!=='string'||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||typeof p.updatedAt!=='string')throw Error('朋友数据有误');if(p.avatar!==undefined&&!isAvatar(p.avatar))throw Error('头像数据有误');ids.add(p.id)}
  const records=new Set();let absoluteUnits=0;
  for(const r of data.records){
    if(!ids.has(r.personId)||typeof r.id!=='string'||records.has(r.id)||!validCups(r.cups)||!['owed_to_me','i_owe'].includes(r.direction)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||typeof r.reason!=='string'||typeof r.note!=='string')throw Error('流水数据有误');
    if(r.rateUnits!==undefined&&(typeof r.drinkId!=='string'||typeof r.drinkName!=='string'||!r.drinkName.trim()||r.drinkName.length>20))throw Error('流水酒类有误');
    if(r.rateUnits===undefined&&(r.drinkId!==undefined||r.drinkName!==undefined))throw Error('流水缺少换算比例');
    absoluteUnits+=cupUnits(r.cups,r.rateUnits??1000);if(!Number.isSafeInteger(absoluteUnits))throw Error('累计杯数超过可计算范围');records.add(r.id);
  }
  if(data.removedPeople!==undefined){
    if(!Array.isArray(data.removedPeople))throw Error('已移出好友数据有误');
    for(const entry of data.removedPeople){
      if(!entry||!entry.person||!Array.isArray(entry.records)||typeof entry.removedAt!=='string'||!Number.isFinite(Date.parse(entry.removedAt)))throw Error('已移出好友数据有误');
      validate({version:1,people:[entry.person],records:entry.records});
      if(ids.has(entry.person.id))throw Error('好友身份重复');ids.add(entry.person.id);
      for(const r of entry.records){if(records.has(r.id))throw Error('历史记录重复');records.add(r.id);absoluteUnits+=cupUnits(r.cups,r.rateUnits??1000);if(!Number.isSafeInteger(absoluteUnits))throw Error('累计杯数超过可计算范围')}
    }
  }
  return data;
}
