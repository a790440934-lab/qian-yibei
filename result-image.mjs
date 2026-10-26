import {isAvatar} from './avatars.mjs';
// Canvas builds a local, self-contained PNG; no names or scores leave the device.
export const RESULT_PAGE_SIZE=8;
export function resultPages(result){return Math.ceil(result.people.length/RESULT_PAGE_SIZE)}
const signed=n=>(n>0?'+':'')+n;
function lines(ctx,text,maxWidth){const rows=[];let row='';for(const c of [...text]){if(row&&ctx.measureText(row+c).width>maxWidth){rows.push(row);row=''}row+=c}if(row)rows.push(row);return rows}
async function loadAvatar(value){
  if(!isAvatar(value))return null;
  const image=new Image();
  return new Promise(resolve=>{image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=value});
}
export async function resultImage(result,page=0){
  const pages=resultPages(result);if(page<0||page>=pages)throw Error('成绩单页码有误');
  const rows=result.people.slice(page*RESULT_PAGE_SIZE,(page+1)*RESULT_PAGE_SIZE);
  const photos=await Promise.all(rows.map(p=>loadAvatar(p.avatar)));
  const canvas=document.createElement('canvas'),width=540,height=440+rows.length*112;
  canvas.width=width*2;canvas.height=height*2;const ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器无法生成图片，请直接截图');ctx.scale(2,2);
  const font=(size,weight=400)=>{ctx.font=`${weight} ${size}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`};
  ctx.fillStyle='#f7f4ea';ctx.fillRect(0,0,width,height);ctx.fillStyle='#183e35';ctx.fillRect(0,0,width,260);
  ctx.fillStyle='#f1c677';font(22,700);ctx.fillText('欠一杯',32,48);font(12);ctx.textAlign='right';ctx.fillText('全员闲家 · 统一计分',508,46);ctx.textAlign='left';
  ctx.fillStyle='#f7f4ea';font(30,700);lines(ctx,result.title,470).forEach((line,i)=>ctx.fillText(line,32,106+i*42));
  font(13);ctx.fillStyle='#d0dfcc';ctx.fillText(new Date(result.createdAt).toLocaleString('zh-CN',{hour12:false}),32,207);ctx.fillText(`已保存结果 · ${result.people.length} 位成员 · ${result.recordCount} 笔计分`,32,233);
  font(12);ctx.fillStyle='#68745d';ctx.fillText('按积分从高到低 · 同分并列',32,293);ctx.textAlign='right';ctx.fillText(`第 ${page+1} / ${pages} 张`,508,293);ctx.textAlign='left';
  rows.forEach((p,i)=>{
    const y=320+i*112,index=page*RESULT_PAGE_SIZE+i,rank=result.people.findIndex(x=>x.points===p.points)+1;
    font(14,600);ctx.fillStyle='#526648';ctx.textAlign='center';ctx.fillText(String(rank),43,y+40);
    ctx.save();ctx.beginPath();ctx.arc(91,y+36,25,0,Math.PI*2);ctx.clip();ctx.fillStyle='#e8eadc';ctx.fillRect(66,y+11,50,50);
    if(photos[i])ctx.drawImage(photos[i],66,y+11,50,50);
    else{font(20,600);ctx.fillStyle='#526648';ctx.fillText([...p.name][0],91,y+44)}ctx.restore();ctx.textAlign='left';
    font(18,600);ctx.fillStyle='#243e35';let nameLines=lines(ctx,p.name,200);if(nameLines.length>3){font(14,600);nameLines=lines(ctx,p.name,200)}nameLines.forEach((line,n)=>ctx.fillText(line,128,y+27+n*24));
    const value=signed(p.points);font(30,650);while(ctx.measureText(value).width>152){const size=Number(ctx.font.match(/(\d+)px/)[1]);if(size<=12)break;font(size-1,650)}ctx.fillStyle=p.points<0?'#ac492f':p.points>0?'#34703e':'#6f796b';ctx.textAlign='right';ctx.fillText(value,508,y+39);font(11);ctx.fillText('分',508,y+61);ctx.textAlign='left';
    ctx.strokeStyle='#dedfd1';ctx.beginPath();ctx.moveTo(32,y+100);ctx.lineTo(508,y+100);ctx.stroke();
  });
  const footer=height-70;ctx.fillStyle='#183e35';font(17,600);ctx.fillText('分数记下来，相聚留个念想。',32,footer);font(11);ctx.fillStyle='#68745d';ctx.fillText('此图为保存时的结果，后续计分不会改变这份记录。',32,footer+27);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('图片生成失败，请直接截图')),'image/png'));
}
