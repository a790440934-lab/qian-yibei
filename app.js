import {resultImage, resultPages} from './result-image.mjs?v=3';
import {compressAvatar, isAvatar} from './avatars.mjs';
import {SCORE_KEY, LEGACY_KEY, score, validateScore, freshScore, migrateLegacy,
  addMemberRow, setCupCount, undoLast, makeResult} from './scoring.mjs?v=3';
import {DEFAULT_GAMES, INTERACTION_GAMES, parseGames, pickGame} from './games.mjs?v=5';

const app = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scoreText = n => String(n);
let data = freshScore(), storageError = false;
let resultImageUrl = null, resultGeneration = 0;

function cleanupResult() {
  resultGeneration++;
  if (resultImageUrl) { URL.revokeObjectURL(resultImageUrl); resultImageUrl = null; }
}
sheet.addEventListener('close', cleanupResult);
try {
  const raw = localStorage.getItem(SCORE_KEY);
  if (raw) data = validateScore(JSON.parse(raw));
  else {
    const old = localStorage.getItem(LEGACY_KEY);
    data = old ? migrateLegacy(JSON.parse(old)) : freshScore();
    localStorage.setItem(SCORE_KEY, JSON.stringify(data));
  }
} catch { storageError = true; }

function toast(message) {
  document.querySelector('#toast').textContent = message;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { document.querySelector('#toast').textContent = ''; }, 2600);
}
function mutate(fn) {
  if (storageError) { toast('存储异常，请先到更多菜单导出备份'); return false; }
  try {
    const next = structuredClone(data);
    fn(next);
    validateScore(next);
    localStorage.setItem(SCORE_KEY, JSON.stringify(next));
    data = next;
    return true;
  } catch (error) { toast('未保存：' + error.message); return false; }
}
function modal(title, body) {
  cleanupResult();
  sheet.innerHTML = `<div class="modal-head"><h2 id="dialog-title">${esc(title)}</h2><button class="close" aria-label="关闭">×</button></div>${body}`;
  sheet.querySelector('.close').onclick = () => sheet.close();
  if (!sheet.open) sheet.showModal();
}
function confirmAction(title, message, action) {
  modal(title, `<p>${message}</p><div class="settings-actions"><button class="primary" id="confirm">确认</button><button class="secondary" id="cancel">取消</button></div>`);
  sheet.querySelector('#cancel').onclick = () => sheet.close();
  sheet.querySelector('#confirm').onclick = () => { if (action() !== false) { sheet.close(); render(); } };
}
const camera = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 6l1.5-2h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><circle cx="12" cy="12.5" r="3.5"/></svg>';
const dice = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><g fill="currentColor" stroke="none"><circle cx="8" cy="8" r="1.4"/><circle cx="16" cy="8" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="8" cy="16" r="1.4"/><circle cx="16" cy="16" r="1.4"/></g></svg>';
function avatarMarkup(person) {
  return isAvatar(person.avatar) ? `<img src="${esc(person.avatar)}" alt="${esc(person.name)}的头像" width="64" height="64">` : camera;
}
function memberRow(person) {
  const count = score(data, person.id), id = esc(person.id), name = esc(person.name);
  return `<article class="member-row" data-person="${id}" aria-label="${name}">
    <button class="avatar" data-action="avatar" data-id="${id}" aria-label="${name}：拍照或上传头像">${avatarMarkup(person)}</button>
    <div class="member-controls"><button class="member-name" data-action="member" data-id="${id}" aria-label="编辑${name}">${name}</button><div class="stepper" aria-label="${name}的杯数"><button class="step minus" data-action="minus" data-id="${id}" aria-label="${name}减一杯" ${count <= 0 || storageError ? 'disabled' : ''}><span class="step-face" aria-hidden="true">−</span></button><button class="step plus" data-action="plus" data-id="${id}" aria-label="${name}加一杯" ${count >= 999999999 || storageError ? 'disabled' : ''}><span class="step-face" aria-hidden="true">＋</span></button></div></div>
    <div class="cup-summary"><button class="cup-value ${String(count).length > 4 ? 'long-number' : ''}" data-action="amount" data-id="${id}" aria-label="修改${name}的杯数，当前${count}杯"><strong>${count}</strong><span>杯</span></button><button class="clear-row" data-action="clear" data-id="${id}" aria-label="清空${name}的杯数" ${count === 0 || storageError ? 'disabled' : ''}>清空</button></div>
    <div class="adventure-cell"><button class="dice-button" data-action="dice" data-id="${id}" aria-label="为${name}随机抽取大冒险" ${storageError ? 'disabled' : ''}>${dice}</button><span aria-hidden="true">冒险</span></div>
  </article>`;
}
function render() {
  app.innerHTML = `<header class="top"><div class="brand"><span class="brand-mark" aria-hidden="true">杯</span><h1>欠一杯</h1><span class="member-count">${data.people.length} 人</span></div><button class="menu-button" data-action="settings" aria-label="更多设置">•••</button></header>
    ${storageError ? '<p class="error">无法读取本地数据，已暂停编辑。请从更多菜单导出原始备份。</p>' : ''}
    <section class="member-list" aria-label="成员列表">${data.people.map(memberRow).join('') || '<div class="empty"><span class="empty-cup" aria-hidden="true">＋</span><p>添加一位朋友，开始记杯。</p></div>'}</section>
    <footer class="add-bar"><button class="add-button" data-action="add" ${storageError ? 'disabled' : ''}>＋ 添加一行</button></footer>`;
}
function addRow() {
  let id;
  if (mutate(next => { id = addMemberRow(next, uid()).id; })) {
    render();
    const row = [...app.querySelectorAll('[data-person]')].find(el => el.dataset.person === id);
    row?.scrollIntoView({block: 'nearest'});
  }
}
function changeCount(id, action) {
  const person = data.people.find(p => p.id === id);
  if (!person) return;
  const current = score(data, id);
  if (action === 'minus' && current <= 0) return;
  const next = action === 'clear' ? 0 : current + (action === 'plus' ? 1 : -1);
  if (next === current) return;
  if (mutate(draft => setCupCount(draft, id, next, uid))) {
    render();
    if (action === 'clear') toast(person.name + '已清空，可在更多菜单撤销');
  }
}
function editAmount(id) {
  const person = data.people.find(p => p.id === id);
  if (!person) return;
  modal(person.name + '的杯数', `<form><label class="field" for="amount">杯数</label><input class="input" id="amount" type="number" inputmode="numeric" min="0" max="999999999" step="1" value="${score(data,id)}" required><p class="error" role="alert"></p><button class="primary">保存</button></form>`);
  sheet.querySelector('form').onsubmit = event => {
    event.preventDefault();
    if (mutate(next => setCupCount(next, id, Number(sheet.querySelector('#amount').value), uid))) { sheet.close(); render(); }
    else sheet.querySelector('.error').textContent = '未保存，请检查杯数或导出备份后检查存储空间。';
  };
}
function editMember(id) {
  const person = data.people.find(p => p.id === id);
  if (!person) return;
  modal('成员设置', `<form><label class="field" for="member-name">称呼（可不改）</label><input class="input" id="member-name" maxlength="30" required value="${esc(person.name)}"><p class="error" role="alert"></p><button class="primary">保存称呼</button></form><button class="danger" id="remove-member">移出这一行</button>`);
  sheet.querySelector('form').onsubmit = event => {
    event.preventDefault();
    const name = sheet.querySelector('#member-name').value.trim();
    if (!name || data.people.some(p => p.id !== id && p.name === name)) { sheet.querySelector('.error').textContent = '称呼不能为空，也不能与其他成员重复'; return; }
    if (mutate(next => { const p = next.people.find(p => p.id === id); p.name = name; p.updatedAt = new Date().toISOString(); })) { sheet.close(); render(); }
  };
  sheet.querySelector('#remove-member').onclick = () => confirmAction('移出' + person.name + '？', '杯数、头像和记录将保留，可从更多菜单恢复。', () => mutate(next => {
    const p = next.people.find(p => p.id === id);
    next.removedPeople ??= [];
    next.removedPeople.push({person: p, records: next.records.filter(r => r.personId === id), removedAt: new Date().toISOString()});
    next.people = next.people.filter(p => p.id !== id);
    next.records = next.records.filter(r => r.personId !== id);
  }));
}
function editAvatar(id) {
  const person = data.people.find(p => p.id === id);
  if (!person) return;
  modal(person.name + '的头像', `<div class="avatar-preview" id="avatar-preview">${avatarMarkup(person)}</div><div class="photo-options"><label class="secondary photo-picker">拍照<input id="avatar-camera" type="file" accept="image/*" capture="environment" aria-label="拍照设置头像"></label><label class="secondary photo-picker">从相册选择<input id="avatar-album" type="file" accept="image/*" aria-label="从相册选择头像"></label></div><p id="avatar-error" class="error" role="alert"></p><p id="avatar-status" role="status"></p><div class="settings-actions"><button class="primary" id="avatar-save" disabled>使用这张头像</button><button class="secondary" id="avatar-cancel">取消</button></div>`);
  const preview = sheet.querySelector('#avatar-preview'), save = sheet.querySelector('#avatar-save'), error = sheet.querySelector('#avatar-error'), status = sheet.querySelector('#avatar-status');
  let pending = '', selection = 0;
  const active = () => sheet.open && sheet.querySelector('#avatar-preview') === preview;
  const select = async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    const token = ++selection; pending = ''; save.disabled = true; error.textContent = ''; status.textContent = '正在处理照片…';
    try {
      const photo = await compressAvatar(file);
      if (!active() || token !== selection) return;
      pending = photo; preview.innerHTML = `<img src="${esc(photo)}" alt="新头像预览" width="128" height="128">`;
      status.textContent = '预览满意后，点击下方保存'; save.disabled = false;
    } catch (e) { if (active() && token === selection) { status.textContent = ''; error.textContent = e.message; } }
  };
  sheet.querySelector('#avatar-camera').onchange = select;
  sheet.querySelector('#avatar-album').onchange = select;
  sheet.querySelector('#avatar-cancel').onclick = () => sheet.close();
  save.onclick = () => {
    if (!pending || save.disabled) return;
    if (mutate(next => { const p = next.people.find(p => p.id === id); if (!p) throw Error('成员已移出'); p.avatar = pending; })) { sheet.close(); render(); toast('头像已保存'); }
    else error.textContent = '头像未保存，请先导出备份并检查本地存储空间。';
  };
}
function roll(id) {
  const person = data.people.find(p => p.id === id);
  if (!person) return;
  let game;
  if (!mutate(next => { const p = next.people.find(p => p.id === id); game = pickGame(next.games || DEFAULT_GAMES, p.lastAdventure); p.lastAdventure = game; })) return;
  const [title, ...body] = game.split('｜');
  modal(person.name + '的大冒险', `<div class="adventure-card"><span class="adventure-icon">${dice}</span>${body.length ? `<h3>${esc(title)}</h3><p>${esc(body.join('｜'))}</p>` : `<p>${esc(game)}</p>`}</div><p class="hint">${INTERACTION_GAMES.includes(game) ? '双方愿意再参与，可换搭档或换题，拒绝不记杯。' : '杯数由你手动记录。'}</p><div class="two-actions"><button class="secondary" id="reroll">再摇一次</button><button class="primary" id="finish-game">完成</button></div>`);
  sheet.querySelector('#reroll').onclick = () => roll(id);
  sheet.querySelector('#finish-game').onclick = () => sheet.close();
}
function editGames() {
  modal('大冒险题库', `<form><label class="field" for="game-library">每行一个游戏，可以直接修改或添加</label><textarea class="input game-editor" id="game-library" rows="11" spellcheck="false">${esc((data.games || DEFAULT_GAMES).join('\n'))}</textarea><p class="hint">${(data.games || DEFAULT_GAMES).length} 个题目 · 每次随机抽一个</p><p class="error" role="alert"></p><div class="settings-actions"><button class="primary">保存题库</button><button class="secondary" type="button" id="interaction-games">添加 16 道互动题</button><button class="secondary" type="button" id="default-games">填入默认题库</button></div></form>`);
  sheet.querySelector('#interaction-games').onclick = () => {
    try {
      const editor = sheet.querySelector('#game-library');
      const games = parseGames(editor.value + '\n' + INTERACTION_GAMES.join('\n'));
      editor.value = games.join('\n');
      sheet.querySelector('.error').textContent = '';
      sheet.querySelector('.hint').textContent = `共 ${games.length} 个题目，原题保留且已去重，点击保存后生效`;
    } catch (error) { sheet.querySelector('.error').textContent = error.message; }
  };
  sheet.querySelector('#default-games').onclick = () => { sheet.querySelector('#game-library').value = DEFAULT_GAMES.join('\n'); sheet.querySelector('.hint').textContent = '已填入默认题库，点击保存后生效'; };
  sheet.querySelector('form').onsubmit = event => {
    event.preventDefault();
    try {
      const games = parseGames(sheet.querySelector('#game-library').value);
      if (mutate(next => { next.games = games; })) { sheet.close(); toast('已保存 ' + games.length + ' 个游戏'); }
      else sheet.querySelector('.error').textContent = '题库未保存，请检查存储空间。';
    } catch (error) { sheet.querySelector('.error').textContent = error.message; }
  };
}
function download(raw, name) {
  const url = URL.createObjectURL(new Blob([raw], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = name + '.json'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function removedMembers() {
  modal('已移出的成员', `<div>${(data.removedPeople || []).map(entry => `<div class="removed-person"><span>${esc(entry.person.name)}</span><button class="secondary" data-restore="${esc(entry.person.id)}">恢复</button></div>`).join('') || '<p>没有已移出的成员。</p>'}</div>`);
  sheet.querySelectorAll('[data-restore]').forEach(button => { button.onclick = () => {
    if (mutate(next => {
      const entry = next.removedPeople.find(e => e.person.id === button.dataset.restore);
      if (!entry) throw Error('成员已恢复');
      if (next.people.some(p => p.name === entry.person.name)) throw Error('存在同名称呼，请先修改在场成员的称呼');
      next.people.push(entry.person); next.records.push(...entry.records); next.records.sort((a,b) => a.createdAt.localeCompare(b.createdAt));
      next.removedPeople = next.removedPeople.filter(e => e.person.id !== entry.person.id);
    })) { render(); removedMembers(); }
  }; });
}
function settings() {
  modal('更多', `<div class="settings-actions"><button class="secondary" id="games">编辑大冒险题库</button><button class="secondary" id="undo" ${data.records.length && !storageError ? '' : 'disabled'}>撤销上次杯数操作</button><button class="secondary" id="save-result" ${data.people.length && !storageError ? '' : 'disabled'}>保存当前结果 / 生成图片</button><button class="secondary" id="saved-results">已保存结果（${data.results?.length || 0}）</button><button class="secondary" id="export">导出备份</button><label class="secondary photo-picker">导入备份<input id="import" type="file" accept=".json,application/json" aria-label="导入备份"></label><button class="secondary" id="removed">已移出成员（${data.removedPeople?.length || 0}）</button><button class="text-btn" id="legacy-export">导出旧版酒账</button></div><p class="hint">数据保存在此浏览器，换设备请先导出备份。</p>`);
  sheet.querySelector('#games').onclick = editGames;
  sheet.querySelector('#save-result').onclick = saveResultForm;
  sheet.querySelector('#saved-results').onclick = savedResults;
  sheet.querySelector('#removed').onclick = removedMembers;
  sheet.querySelector('#undo').onclick = () => { if (mutate(next => undoLast(next, uid))) { sheet.close(); render(); toast('已撤销上次杯数操作'); } };
  sheet.querySelector('#export').onclick = () => { try { download(storageError ? (localStorage.getItem(SCORE_KEY) || '{}') : JSON.stringify(data, null, 2), '欠一杯-记杯备份'); } catch { toast('无法读取备份'); } };
  sheet.querySelector('#legacy-export').onclick = () => { try { const raw = data.legacy ? JSON.stringify(data.legacy, null, 2) : localStorage.getItem(LEGACY_KEY); if (raw) download(raw, '欠一杯-旧酒账'); else toast('没有旧版酒账'); } catch { toast('无法读取旧版酒账'); } };
  sheet.querySelector('#import').onchange = async event => {
    try {
      const file = event.target.files[0]; if (!file) return;
      if (file.size > 10e6) throw Error('备份不能超过 10 MB');
      const parsed = JSON.parse(await file.text()), incoming = parsed.version === 1 ? migrateLegacy(parsed) : validateScore(parsed);
      confirmAction('导入并替换数据？', `将导入 ${incoming.people.length} 位成员，同时替换当前头像、记录、题库和已保存结果。请先导出当前备份。`, () => {
        try { localStorage.setItem(SCORE_KEY, JSON.stringify(incoming)); data = incoming; storageError = false; return true; }
        catch (error) { toast('未导入：' + error.message); return false; }
      });
    } catch (error) { toast('导入失败：' + error.message); }
  };
}
app.onclick = event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  const {action, id} = button.dataset;
  if (['minus', 'plus', 'clear'].includes(action)) { changeCount(id, action); return; }
  switch (action) {
    case 'add': addRow(); break;
    case 'avatar': editAvatar(id); break;
    case 'member': editMember(id); break;
    case 'amount': editAmount(id); break;
    case 'dice': roll(id); break;
    case 'settings': settings(); break;
  }
};
window.addEventListener('storage', event => {
  if (event.key !== SCORE_KEY && event.key !== null) return;
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    data = raw ? validateScore(JSON.parse(raw)) : freshScore(); storageError = false;
    sheet.close(); render(); toast('已同步此浏览器其他页面的修改');
  } catch { storageError = true; sheet.close(); render(); toast('读取数据失败，已暂停编辑'); }
});
render();

function saveResultForm(){
 if(storageError){toast('存储异常，请先处理数据备份');return}
 if(!data.people.length){toast('请先添加成员');return}
 if((data.results?.length||0)>=30){toast('最多保留 30 份成绩单，请先导出备份并删除旧结果');savedResults();return}
 modal('保存最终结果',`<form id="result-form"><label class="field" for="result-title">这次相聚的名字</label><input class="input" id="result-title" maxlength="24" required value="这次相聚的成绩单" placeholder="例如：周五老友局"><p class="notice">保存当前名单中 ${data.people.length} 人的杯数，不含已移出成员。保存不清零，之后继续计分或更换头像也不会改变这份成绩单。</p><p class="error" id="result-error" role="alert"></p><button class="primary">保存并生成图片</button></form>`);
 sheet.querySelector('form').onsubmit=e=>{e.preventDefault();try{const result={...makeResult(data,sheet.querySelector('#result-title').value,uid()),unit:'杯'};if(mutate(next=>{next.results??=[];next.results.push(result)})){render();viewResult(result.id)}else sheet.querySelector('#result-error').textContent='未能保存，原数据未改变，请先导出备份检查存储空间。'}catch(e){sheet.querySelector('#result-error').textContent=e.message}};
}
function savedResults(){
 const rows=(data.results||[]).slice().reverse();
 modal('已保存结果',`<p>每份结果固定保留保存时的头像、名字和数值，可随时重新生成图片。</p><div class="saved-results">${rows.map(r=>`<article class="saved-result"><button class="result-open" data-result="${esc(r.id)}"><strong>${esc(r.title)}</strong><small>${esc(new Date(r.createdAt).toLocaleString('zh-CN',{hour12:false}))} · ${r.people.length} 人</small><span>查看成绩单与图片 ›</span></button><button class="text-btn" data-remove-result="${esc(r.id)}">删除</button></article>`).join('')||'<div class="empty">还没有保存结果。在更多菜单点击“保存当前结果”。</div>'}</div>`);
 sheet.querySelectorAll('[data-result]').forEach(el=>el.onclick=()=>viewResult(el.dataset.result));
 sheet.querySelectorAll('[data-remove-result]').forEach(el=>el.onclick=()=>{const r=data.results.find(r=>r.id===el.dataset.removeResult);if(!r)return;confirmAction('删除这份成绩单？',`只删除「${esc(r.title)}」的保存副本，不影响当前杯数。已下载的图片仍保留。`,()=>mutate(next=>{next.results=next.results.filter(r=>r.id!==el.dataset.removeResult)}))});
}
async function viewResult(id,page=0){
 const result=data.results?.find(r=>r.id===id);if(!result){toast('这份结果已不存在');return}
 const pages=resultPages(result);if(page>=pages||page<0)return;
 modal('最终结果 · 已保存',`<div class="result-preview"><p id="image-status" role="status">正在生成分享图片…</p><img id="result-image" alt="${esc(result.title)}，第 ${page+1} 张成绩单" hidden></div>${pages>1?`<div class="result-pagination"><button class="secondary" id="result-prev" ${page===0?'disabled':''}>上一张</button><span>${page+1} / ${pages} 张</span><button class="secondary" id="result-next" ${page===pages-1?'disabled':''}>下一张</button></div>`:''}<p class="notice">${pages>1?`人数较多，已分为 ${pages} 张图，请逐张保存。`:''}可长按图片保存，或点击下载。分享到朋友圈由你在微信中完成。</p><div class="settings-actions"><button class="primary" id="result-download" disabled>下载${pages>1?'本张':'成绩单'}图片</button><button class="secondary" id="result-share" disabled>分享图片 / 存储到文件</button><button class="text-btn" id="result-list">查看已保存结果</button></div><details class="result-text"><summary>查看全部文字记录</summary><h3>${esc(result.title)}</h3><p>保存于 ${esc(new Date(result.createdAt).toLocaleString('zh-CN',{hour12:false}))}</p><table><thead><tr><th scope="col">成员</th><th scope="col">${result.unit || '分'}数</th></tr></thead><tbody>${result.people.map(p=>`<tr><td>${esc(p.name)}</td><td>${scoreText(p.points)} ${result.unit || '分'}</td></tr>`).join('')}</tbody></table></details>`);
 sheet.querySelector('#result-list').onclick=savedResults;
 if(pages>1){sheet.querySelector('#result-prev').onclick=()=>viewResult(id,page-1);sheet.querySelector('#result-next').onclick=()=>viewResult(id,page+1)}
 const generation=resultGeneration;
 try{
  const blob=await resultImage(result,page);if(generation!==resultGeneration||!sheet.open)return;
  resultImageUrl=URL.createObjectURL(blob);const url=resultImageUrl,img=sheet.querySelector('#result-image');img.src=url;img.hidden=false;sheet.querySelector('#image-status').textContent='图片已生成，可长按保存或截图';
  const filename=`欠一杯-最终结果-${result.createdAt.slice(0,10)}-${page+1}.png`;
  const save=()=>{const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();toast('已请求下载；也可长按图片保存')};
  const downloadButton=sheet.querySelector('#result-download'),shareButton=sheet.querySelector('#result-share');downloadButton.disabled=false;shareButton.disabled=false;downloadButton.onclick=save;
  shareButton.onclick=async()=>{try{const file=new File([blob],filename,{type:'image/png'});if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:result.title})}else save()}catch(e){if(e.name!=='AbortError')toast('分享未完成，请点击下载或长按图片保存')}};
 }catch{if(generation===resultGeneration&&sheet.open){sheet.querySelector('#image-status').textContent='图片暂时生成失败，成绩单已保存，可展开文字记录截图或稍后重试。';sheet.querySelector('.result-text').open=true}}
}
