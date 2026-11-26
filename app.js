(() => {
const $=id=>document.getElementById(id);
const storeKey='universalRailDiagram_v05';
let data={stations:[],trains:[],vehicles:[],operations:[]};
try{const saved=JSON.parse(localStorage.getItem(storeKey)||'null');if(saved)data=saved;}catch(e){}
const save=()=>localStorage.setItem(storeKey,JSON.stringify(data));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function timeToMin(t){if(!t)return null;let [h,m,s]=t.split(':').map(Number);return h*60+(m||0)+(s||0)/60}
function timeFmt(t){return t||''}
function refresh(){
 renderStations();renderVehicleSelects();renderTimesEditor();renderTrains();renderVehicles();renderOperations();drawDiagram();save();
}
function renderStations(){$('stationList').innerHTML=data.stations.map((s,i)=>`<div class="item"><span><strong>${escapeHTML(s.name)}</strong><span class="meta">　${s.distance??''} km</span></span><button data-del-station="${i}">削除</button></div>`).join('')||'<p class="empty">駅が登録されていません</p>'}
function renderVehicleSelects(){
 const opts='<option value="">車両未指定</option>'+data.vehicles.map(v=>`<option value="${escapeHTML(v.id)}">${escapeHTML(v.name)}</option>`).join('');
 $('trainVehicle').innerHTML=opts;$('operationVehicle').innerHTML=opts;$('trainOperation').innerHTML='<option value="">運用未指定</option>'+data.operations.map(o=>`<option value="${escapeHTML(o.id)}">${escapeHTML(o.name)}</option>`).join('');
}
function renderTimesEditor(){
 $('timesEditor').innerHTML=data.stations.map((s,i)=>`<div class="time-row"><label>${escapeHTML(s.name)}</label><input type="time" step="1" data-arr="${i}" aria-label="${escapeHTML(s.name)} 到着"><input type="time" step="1" data-dep="${i}" aria-label="${escapeHTML(s.name)} 発車"></div>`).join('')||'<p class="empty">先に駅を登録してください</p>';
}
function renderTrains(){
 $('trainList').innerHTML=data.trains.map((t,i)=>`<div class="item train-card" style="--train-color:${t.color}"><span><strong>${escapeHTML(t.number)}</strong>　${escapeHTML(t.type)} <span class="meta"> ${escapeHTML(t.destination)} / ${escapeHTML(data.vehicles.find(v=>v.id===t.vehicleId)?.name||'車両未指定')}</span></span><button data-del-train="${i}">削除</button></div>`).join('')||'<p class="empty">列車が登録されていません</p>';
}
function renderVehicles(){
 $('vehicleList').innerHTML=data.vehicles.map((v,i)=>`<div class="item"><span><strong>${escapeHTML(v.name)}</strong><span class="meta"> ${escapeHTML(v.memo)}</span></span><button data-del-vehicle="${i}">削除</button></div>`).join('')||'<p class="empty">車両未登録</p>';
}
function renderOperations(){
 $('operationList').innerHTML=data.operations.map((o,i)=>`<div class="item"><span><strong>${escapeHTML(o.name)}</strong><span class="meta">　${escapeHTML(data.vehicles.find(v=>v.id===o.vehicleId)?.name||'車両未指定')}　|　列車: ${data.trains.filter(t=>t.operationId===o.id).map(t=>escapeHTML(t.number)).join(' → ')||'未割当'}</span></span><button data-del-operation="${i}">削除</button></div>`).join('')||'<p class="empty">運用未登録</p>';
}
function drawDiagram(){
 const el=$('diagramCanvas');if(!data.stations.length||!data.trains.length){el.innerHTML='<p class="empty">駅と列車を登録するとダイヤが表示されます。</p>';return}
 const W=Math.max(700,100+data.trains.length*65),H=Math.max(320,80+data.stations.length*65),left=130,top=45;
 const dist=data.stations.map(s=>Number(s.distance)||0),maxD=Math.max(1,...dist);
 const y=data.stations.map((s,i)=>top+i*(H-top-30)/Math.max(1,data.stations.length-1));
 const times=data.trains.flatMap(t=>t.events.flatMap(e=>[timeToMin(e.arr),timeToMin(e.dep)].filter(v=>v!==null))).filter(v=>v!==null);
 if(!times.length){el.innerHTML='<p class="empty">列車の時刻を設定してください。</p>';return}
 let min=Math.min(...times),max=Math.max(...times);if(max-min<20)max=min+20;
 const x=m=>left+(m-min)*(W-left-30)/(max-min);
 let svg=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="列車ダイヤ">`;
 data.stations.forEach((s,i)=>{svg+=`<line x1="${left}" y1="${y[i]}" x2="${W-20}" y2="${y[i]}" stroke="#dce4e2" stroke-width="1"/><text x="12" y="${y[i]+4}" class="station-label">${escapeHTML(s.name)}</text>`});
 for(let m=Math.ceil(min/10)*10;m<=max;m+=10){svg+=`<line x1="${x(m)}" y1="25" x2="${x(m)}" y2="${H-20}" stroke="#eef2f1"/><text x="${x(m)}" y="17" text-anchor="middle" class="time-label">${Math.floor(m/60)}:${String(Math.floor(m%60)).padStart(2,'0')}</text>`}
 data.trains.forEach(t=>{
  let pts=[];t.events.forEach((e,i)=>{const yy=y[i];if(e.arr)pts.push({x:x(timeToMin(e.arr)),y:yy});if(e.dep)pts.push({x:x(timeToMin(e.dep)),y:yy})});
  if(pts.length<2)return;
  svg+=`<polyline fill="none" stroke="${t.color}" stroke-width="2" points="${pts.map(p=>p.x+','+p.y).join(' ')}"/>`;
  pts.forEach(p=>svg+=`<circle cx="${p.x}" cy="${p.y}" r="2.3" fill="${t.color}"/>`);
  svg+=`<text x="${pts[0].x+4}" y="${pts[0].y-5}" class="train-label">${escapeHTML(t.number)}</text>`;
 });svg+='</svg>';el.innerHTML=svg;
}
$('stationForm').addEventListener('submit',e=>{e.preventDefault();data.stations.push({name:$('stationName').value.trim(),distance:$('stationDistance').value});$('stationForm').reset();refresh()});
$('trainForm').addEventListener('submit',e=>{e.preventDefault();const events=data.stations.map((s,i)=>({arr:document.querySelector(`[data-arr="${i}"]`)?.value||'',dep:document.querySelector(`[data-dep="${i}"]`)?.value||''}));data.trains.push({id:crypto.randomUUID(),number:$('trainNumber').value.trim(),type:$('trainType').value,destination:$('trainDestination').value,color:$('trainColor').value,vehicleId:$('trainVehicle').value,operationId:$('trainOperation').value||null,events});$('trainForm').reset();$('trainColor').value='#006d69';refresh()});
$('vehicleForm').addEventListener('submit',e=>{e.preventDefault();data.vehicles.push({id:crypto.randomUUID(),name:$('vehicleName').value.trim(),memo:$('vehicleMemo').value});$('vehicleForm').reset();refresh()});
$('operationForm').addEventListener('submit',e=>{e.preventDefault();const op={id:crypto.randomUUID(),name:$('operationName').value,vehicleId:$('operationVehicle').value};data.operations.push(op);$('operationForm').reset();refresh()});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.delStation!==undefined){data.stations.splice(+b.dataset.delStation,1);data.trains.forEach(t=>t.events.splice(+b.dataset.delStation,1));refresh()}
 if(b.dataset.delTrain!==undefined){data.trains.splice(+b.dataset.delTrain,1);refresh()}
 if(b.dataset.delVehicle!==undefined){const v=data.vehicles[+b.dataset.delVehicle];if(data.trains.some(t=>t.vehicleId===v.id)||data.operations.some(o=>o.vehicleId===v.id)){alert('列車または運用で使用中の車両は削除できません');return}data.vehicles.splice(+b.dataset.delVehicle,1);refresh()}
 if(b.dataset.delOperation!==undefined){data.operations.splice(+b.dataset.delOperation,1);refresh()}
 if(b.classList.contains('tab')){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===b.dataset.view))}
});
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rail-diagram.json';a.click();URL.revokeObjectURL(a.href)};
$('importFile').onchange=async e=>{try{const obj=JSON.parse(await e.target.files[0].text());if(!obj.stations||!obj.trains)throw Error('形式違い');data={stations:obj.stations,trains:obj.trains,vehicles:obj.vehicles||[],operations:obj.operations||[]};refresh()}catch(err){alert('読み込みに失敗しました: '+err.message)}e.target.value=''};
refresh();
})();