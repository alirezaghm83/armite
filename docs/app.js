import {artifact, selectedApps, encodeSelection, decodeSelection, downloadLinks, aria2Input, matches} from './core.js';
const $ = selector => document.querySelector(selector);
const state = {apps:[], selection:new Map(), search:'', category:'All apps', onlySelected:false, showUnavailable:false, exportMode:'links'};
const categorySymbols = {'Web browsers':'◎','Messaging':'☏','Media':'▷','Design & images':'◇','Documents':'▤','Compression':'▱','Passwords & storage':'⌑','Network & remote':'⌁','Utilities':'⊞','Developer tools':'⌘','Runtimes':'{ }'};
const packs = {everyday:['chrome','vlc','7zip','bitwarden'],developer:['vscode','git','python','nodejs','docker','powershell'],homelab:['tailscale','putty','wireshark','rclone','syncthing']};
const shortNames = {chrome:'Ch',firefox:'Fx',edge:'e',brave:'Br',vivaldi:'V',opera:'O',zoom:'Z',discord:'D',teams:'T',slack:'#',telegram:'↗',thunderbird:'Tb',vlc:'▶',foobar2000:'fb',spotify:'≋',handbrake:'Hb',obs:'◉',audacity:'Au',blender:'Bl',gimp:'Gi',krita:'Kr',inkscape:'In',libreoffice:'Lo',sumatrapdf:'PDF','7zip':'7z',peazip:'Pz',winrar:'Ra',bitwarden:'Bw','1password':'1P',dropbox:'Db',googledrive:'△',onedrive:'☁',wireshark:'Ws',tailscale:'⠿',wireguard:'Wg',rustdesk:'Rd',teamviewer:'↔',putty:'>_',winscp:'Sc',powertoys:'Pt',everything:'⌕',windirstat:'Wd',python:'Py',git:'git',docker:'Dk',nodejs:'JS',notepadpp:'++',sublime:'S',vscode:'<>',cursor:'↖',winmerge:'Wm',dotnet8:'.N',dotnet9:'.N',dotnet10:'.N',vcredist:'C++',java:'J',powershell:'>_',terminal:'$_',go:'Go',uv:'uv',keepassxc:'Kx',localsend:'Ls',rclone:'Rc',syncthing:'Sy',mullvad:'M',hiddify:'H',netbird:'Nb','7zipnanazip':'Nz'};
function node(tag, className, text) {const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function link(text, url, className) {const a=node('a',className,text);try{if(new URL(url).protocol!=='https:')return node('span','',text);}catch{return node('span','',text);}a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function icon(app) {const i=node('span','app-icon',shortNames[app.id] || app.name.slice(0,2));i.style.setProperty('--app-color',/^#[a-f\d]{6}$/i.test(app.color)?app.color:'#557163');i.setAttribute('aria-hidden','true');return i;}
function toast(message) {$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function persist() {
  try {localStorage.setItem('armite-selection',encodeSelection(state.selection));}catch{}
  try {history.replaceState(null,'','#'+encodeSelection(state.selection));}catch{}
}
function getChosen() {return selectedApps(state.apps,state.selection);}
function shareUrl() {const url=new URL(location.href);url.hash=encodeSelection(state.selection);return url.href;}
function changeSelection(id, checked, index) {
  const focused=document.activeElement.id;
  if(checked)state.selection.set(id,index ?? 0);else state.selection.delete(id);
  persist();renderBasket();renderCatalog();
  if(focused.startsWith('app-'))(document.getElementById(focused) || $('#search')).focus({preventScroll:true});
}
function filtered() {return state.apps.filter(app=>matches(app,state));}
function renderCategories() {
  const fragment=document.createDocumentFragment();
  for(const category of ['All apps',...new Set(state.apps.map(a=>a.category))]) {
    const button=node('button','category-pill',category);button.setAttribute('aria-pressed',String(state.category===category));
    button.addEventListener('click',()=>{state.category=category;renderCategories();renderCatalog();});fragment.append(button);
  }
  $('#category-nav').replaceChildren(fragment);
}
function renderApp(app) {
  const available=!!artifact(app), index=state.selection.get(app.id) ?? 0, file=artifact(app,index);
  const row=node('article','app-row'+(available?'':' unavailable'));row.dataset.app=app.id;
  const top=node('div','app-top'), box=node('input','app-checkbox');box.type='checkbox';box.id='app-'+app.id;box.checked=state.selection.has(app.id);box.disabled=!available;box.setAttribute('aria-label','Select '+app.name);
  box.addEventListener('change',()=>changeSelection(app.id,box.checked,Number(row.querySelector('select')?.value || 0)));
  const name=node('label','app-name',app.name);name.htmlFor=box.id;top.append(box,icon(app),name);row.append(top);
  const info=node('div','app-info');info.append(node('p','app-description',app.description));
  if(!available) info.append(node('p','unavailable-note',app.status==='not-indexed'?'No ARM64 artifact in this manifest':'ARM64 download not yet verified'));
  const links=node('div','app-links');
  if(file)links.append(link('↓ '+file.format.toUpperCase(),file.url,'direct-link'),node('span','link-dot','·'));
  links.append(link('Download page ↗',app.page,'page-link'));info.append(links);
  if(available) {
    const meta=node('div','app-meta');meta.append(node('span','arch-tag',file.buildType==='arm64ec'?'ARM64EC':file.buildType==='universal'?'ARM64 · UNIVERSAL':'ARM64'),node('span','version-text','v'+app.version));info.append(meta);
    if(app.downloads.length>1) {
      const select=node('select','variant-select');select.setAttribute('aria-label',app.name+' download format');
      app.downloads.forEach((download,i)=>{const option=node('option','',download.label);option.value=String(i);option.selected=i===index;select.append(option);});
      select.addEventListener('change',()=>{const i=Number(select.value);if(state.selection.has(app.id)){state.selection.set(app.id,i);persist();renderBasket();}const direct=row.querySelector('.direct-link');direct.href=app.downloads[i].url;direct.textContent='↓ '+app.downloads[i].format.toUpperCase();});info.append(select);
    }
  }
  if(app.source) {
    const details=node('details','source-details');details.append(node('summary','','Source & details'));
    const p=node('p');p.append(link(app.sourceType==='publisher'?'Publisher ARM64 source ↗':'WinGet ARM64 manifest ↗',app.source,''));
    if(app.checkedAt)p.append(document.createTextNode('\nChecked '+new Date(app.checkedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})));
    if(file?.scope)p.append(document.createTextNode('\nScope: '+file.scope));
    if(app.note)p.append(document.createTextNode('\n'+app.note));
    details.append(p);info.append(details);
  }
  row.append(info);return row;
}
function renderCatalog() {
  const apps=filtered(), fragment=document.createDocumentFragment();
  for(const category of new Set(apps.map(a=>a.category))) {
    const members=apps.filter(a=>a.category===category), section=node('section','category-card');
    const head=node('div','category-heading');head.append(node('span','category-symbol',categorySymbols[category] || '◇'),node('h3','',category),node('span','count',members.length));section.append(head);
    members.forEach(a=>section.append(renderApp(a)));fragment.append(section);
  }
  if(!apps.length){const empty=node('div','empty-results');empty.append(node('h3','','Nothing here just yet.'),node('p','','Try another search, choose All apps, or switch off the Selected filter.'));fragment.append(empty);}
  $('#catalog').replaceChildren(fragment);$('#catalog').setAttribute('aria-busy','false');
  $('#results-message').textContent=state.search || state.category!=='All apps' || state.onlySelected ? `${apps.length} app${apps.length===1?'':'s'} shown` : '';
  $('#select-visible').disabled=!apps.some(a=>artifact(a));
}
function renderBasket() {
  const chosen=getChosen(), fragment=document.createDocumentFragment();
  if(!chosen.length){const empty=node('div','empty-basket');const tiles=node('div','empty-tiles');for(let i=0;i<3;i++)tiles.append(node('span','','+'));empty.append(tiles,node('p','','A few good apps make a great setup.'));fragment.append(empty);}
  for(const app of chosen){const row=node('div','selected-item');const name=node('span','selected-item-name',app.name);name.append(node('span','selected-variant',artifact(app,state.selection.get(app.id)).label));const remove=node('button','remove-app','×');remove.setAttribute('aria-label','Remove '+app.name);remove.addEventListener('click',()=>{changeSelection(app.id,false);const next=$('#selected-list .remove-app');(next || $('#search')).focus();});row.append(icon(app),name,remove);fragment.append(row);}
  $('#selected-list').replaceChildren(fragment);$('#selected-count').textContent=chosen.length;$('#filter-count').textContent=chosen.length;
  $('#mobile-review').hidden=!chosen.length;$('#mobile-count').textContent=chosen.length;
  for(const id of ['copy-links','share-selection','export-list','clear-selection'])$('#'+id).disabled=!chosen.length;
  if($('#export-dialog').open)renderExport();
}
function renderExport() {
  const mode=state.exportMode;
  $('#export-output').value=mode==='aria2'?aria2Input(state.apps,state.selection):mode==='share'?shareUrl():downloadLinks(state.apps,state.selection);
  $('#export-help').textContent=mode==='aria2'?'Save as armite-downloads.txt, then run: aria2c -c -x 8 -s 8 -i armite-downloads.txt. Published SHA-256 checksums are included when available.':mode==='share'?'This one link restores your selected apps and download formats in Armite. It is not a combined installer or an automatic download.':'One direct publisher URL per line. Paste the list into your download manager. Applications are not automatically installed.';
  $('#download-export').textContent=mode==='aria2'?'↓ Save aria2 .txt':'↓ Save .txt';
  document.querySelectorAll('[data-export]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.export===mode)));
}
function openExport(mode='links') {state.exportMode=mode;renderExport();if(!$('#export-dialog').open)$('#export-dialog').showModal();}
async function copy(text, success, mode) {
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);toast(success);}
  catch{openExport(mode);$('#export-output').focus();$('#export-output').select();toast('Clipboard unavailable. Your text is selected—copy it manually.');}
}
function bindEvents() {
  $('#search').addEventListener('input',event=>{state.search=event.target.value;renderCatalog();});
  $('#show-unavailable').addEventListener('change',event=>{state.showUnavailable=event.target.checked;renderCatalog();});
  $('#selected-filter').addEventListener('click',()=>{state.onlySelected=!state.onlySelected;$('#selected-filter').setAttribute('aria-pressed',String(state.onlySelected));renderCatalog();});
  $('#select-visible').addEventListener('click',()=>{filtered().filter(a=>artifact(a)).forEach(a=>{if(!state.selection.has(a.id))state.selection.set(a.id,0);});persist();renderBasket();renderCatalog();toast('Visible ARM64 apps added to your setup.');});
  $('#clear-selection').addEventListener('click',()=>{state.selection.clear();persist();renderBasket();renderCatalog();toast('Selection cleared. A fresh start.');});
  $('#mobile-review').addEventListener('click',()=>$('#setup').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
  $('#copy-links').addEventListener('click',()=>copy(downloadLinks(state.apps,state.selection),'Download links copied. Ready for your download manager.','links'));
  $('#share-selection').addEventListener('click',()=>copy(shareUrl(),'Selection link copied. Share your setup anywhere.','share'));
  $('#export-list').addEventListener('click',()=>openExport());
  document.querySelectorAll('[data-pack]').forEach(button=>button.addEventListener('click',()=>{let count=0;for(const id of packs[button.dataset.pack]){const app=state.apps.find(a=>a.id===id);if(artifact(app)&&!state.selection.has(id)){state.selection.set(id,0);count++;}}persist();renderBasket();renderCatalog();toast(count?`${count} native apps added to your setup.`:'Available apps in this pack are already selected.');}));
  document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>{state.exportMode=button.dataset.export;renderExport();}));
  $('#copy-export').addEventListener('click',()=>copy($('#export-output').value,'Copied to clipboard.',state.exportMode));
  $('#download-export').addEventListener('click',()=>{const blob=new Blob([$('#export-output').value+'\n'],{type:'text/plain;charset=utf-8'}), url=URL.createObjectURL(blob), a=node('a');a.href=url;a.download=state.exportMode==='aria2'?'armite-downloads.txt':state.exportMode==='share'?'armite-selection.txt':'armite-links.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  window.addEventListener('hashchange',()=>{if(!new URLSearchParams(location.hash.slice(1)).has('apps'))return;state.selection=decodeSelection(location.hash,state.apps);persist();renderBasket();renderCatalog();});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('#export-dialog').open){event.preventDefault();$('#search').focus();}});
}
async function init() {
  try {
    const response=await fetch('./data/catalog.json');if(!response.ok)throw Error('Catalog request failed');const data=await response.json();if(data.schemaVersion!==1||!Array.isArray(data.apps))throw Error('Unsupported catalog');state.apps=data.apps;
    let hash=location.hash;if(!new URLSearchParams(hash.slice(1)).has('apps')){try{hash=localStorage.getItem('armite-selection') || '';}catch{}}
    state.selection=decodeSelection(hash,state.apps);
    const native=state.apps.filter(a=>artifact(a)).length;$('#catalog-count').textContent=`${native} native apps · ${new Set(state.apps.filter(a=>artifact(a)).map(a=>a.category)).size} categories`;
    $('#updated-at').textContent='Catalog refreshed '+new Date(data.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})+'.';
    renderCategories();renderCatalog();renderBasket();bindEvents();
    if(location.hash && new URLSearchParams(location.hash.slice(1)).get('apps') && !state.selection.size)toast('This selection contains no currently available apps. Browse the catalog to create a new one.');
  }catch(error){$('#catalog').setAttribute('aria-busy','false');const box=node('div','empty-results');box.append(node('h3','','The catalog couldn’t load.'),node('p','','Check your connection and reload the page.'),link('View the catalog on GitHub ↗','https://github.com/alirezaghm83/armite/blob/main/data/catalog.json',''));$('#catalog').replaceChildren(box);$('#catalog-count').textContent='Catalog unavailable';console.error(error);}
}
init();
