export const BASE_DRINK = {id:'__base__',name:'基准杯',rateUnits:1000};
export const defaultDrinks = () => [{id:'beer',name:'啤酒',rateUnits:1000},{id:'baijiu',name:'白酒',rateUnits:1000},{id:'rice',name:'米酒',rateUnits:1000}];
export const drinkList = data => data.drinks || defaultDrinks();
export const selectedDrink = data => drinkList(data).find(d=>d.id===data.selectedDrinkId) || drinkList(data)[0];
export const findDrink = (data,id) => id===BASE_DRINK.id?BASE_DRINK:drinkList(data).find(d=>d.id===id);
export const formatCups = n => String(Number(n.toFixed(3)));
export const validCups = n => Number.isFinite(n)&&n>0&&n<=999999999&&Math.abs(n*1000-Math.round(n*1000))<0.00001;
export function cupUnits(cups,rateUnits=1000){
  const value=cups*rateUnits;
  if(!validCups(cups)||!Number.isSafeInteger(rateUnits)||rateUnits<1||rateUnits>1000000||!Number.isSafeInteger(Math.round(value)))throw Error('杯数或换算比例无效');
  if(Math.abs(value-Math.round(value))>0.00001)throw Error('换算结果请保留到 0.001 基准杯，请调整杯数或比例');
  return Math.round(value);
}
export function convertedFields(drink,cups){if(!drink)throw Error('请选择酒类');cupUnits(cups,drink.rateUnits);return {cups,drinkId:drink.id,drinkName:drink.name,rateUnits:drink.rateUnits};}
export function ruleRate(drinks,fromId,toId,multiplier){
  const from=drinks.find(d=>d.id===fromId),to=toId===BASE_DRINK.id?BASE_DRINK:drinks.find(d=>d.id===toId);
  if(!from||!to)throw Error('请选择两种酒');
  if(from.id===to.id)throw Error('请使用不同的酒类设置换算');
  if(!Number.isFinite(multiplier)||multiplier<=0||multiplier>1000)throw Error('换算杯数需大于 0，且不超过 1000');
  const value=to.rateUnits*multiplier;
  if(Math.abs(value-Math.round(value))>0.00001||value<1||value>1000000)throw Error('比例需能精确到 0.001 基准杯，且不超过 1000 基准杯');
  return Math.round(value);
}
export function validateDrinks(data){
  if(data.drinks!==undefined){if(!Array.isArray(data.drinks)||!data.drinks.length)throw Error('酒类数据有误');const ids=new Set(),names=new Set();for(const d of data.drinks){if(typeof d.id!=='string'||!d.id||d.id===BASE_DRINK.id||ids.has(d.id)||typeof d.name!=='string'||!d.name.trim()||d.name.length>20||names.has(d.name)||!Number.isSafeInteger(d.rateUnits)||d.rateUnits<1||d.rateUnits>1000000)throw Error('酒类或规则数据有误');ids.add(d.id);names.add(d.name)}}
  if(data.selectedDrinkId!==undefined&&!drinkList(data).some(d=>d.id===data.selectedDrinkId))throw Error('当前酒类不存在');
}
