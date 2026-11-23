(() => {
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = "universal-railway-diagram-v02";
  const state = { routeName:"新しいダイヤ", stations:[], trains:[], operations:[] };
  let editingTrainId = null;

  const makeId = () => "id-" + Date.now() + "-" + Math.random().toString(16).slice(2,7);
  const parseTime = value => {
    if (!value) return null;
    const m = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(value.trim());
    if (!m || Number(m[1]) > 47) return null;
    return Number(m[1])*3600 + Number(m[2])*60 + Number(m[3] || 0);
  };
  const fmt = s => `${String(Math.floor(s/3600)%24).padStart(2,"0")}:${String(Math.floor(s/60)%60).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const saveLocal = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e) { console.warn("自動保存できませんでした",e); }
  };
  const loadLocal = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (data && Array.isArray(data.stations) && Array.isArray(data.trains)) {
        state.routeName=data.routeName||"新しいダイヤ";
        state.stations=data.stations; state.trains=data.trains;
        state.operations=Array.isArray(data.operations)?data.operations:[];
      }
    } catch(e) { console.warn("保存データを読み込めませんでした",e); }
  };
  const setDirty = () => { saveLocal(); renderAll(); };

  function showPanel(name) {
    document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active",p.id===`panel-${name}`));
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));
    if(name==="trains") renderTimeInputs();
  }
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPanel(b.dataset.panel)));
  $("routeName").addEventListener("input",e=>{state.routeName=e.target.value;saveLocal();});

  $("stationForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("stationName").value.trim(), distance=Number($("stationDistance").value);
    if(!name||!Number.isFinite(distance)||distance<0)return;
    state.stations.push({id:makeId(),name,distance,tracks:["1番線","2番線"]});
    state.stations.sort((a,b)=>a.distance-b.distance);
    e.target.reset(); setDirty();
  });

  function renderStations(){
    const list=$("stationList"); list.innerHTML="";
    state.stations.forEach(st=>{
      const card=document.createElement("div");card.className="data-card";
      const info=document.createElement("div");
      info.innerHTML=`<strong>${escapeHtml(st.name)}</strong><small>起点から ${st.distance} km</small>`;
      const controls=document.createElement("div");controls.className="actions";
      const input=document.createElement("input");input.value=(st.tracks||[]).join(", ");input.placeholder="番線をカンマ区切り";input.style.maxWidth="260px";
      input.addEventListener("change",()=>{st.tracks=input.value.split(",").map(x=>x.trim()).filter(Boolean);setDirty();});
      const del=document.createElement("button");del.textContent="削除";
      del.addEventListener("click",()=>{if(!confirm(`${st.name}を削除しますか？`))return;state.stations=state.stations.filter(x=>x.id!==st.id);state.trains.forEach(t=>{delete t.times[st.id];delete t.platforms[st.id];});setDirty();});
      controls.append(input,del);card.append(info,controls);list.append(card);
    });
    if(!state.stations.length)list.innerHTML='<p class="hint">駅がまだ登録されていません。</p>';
  }

  function renderTimeInputs(train=null){
    const wrap=$("timeInputs");wrap.innerHTML="";
    state.stations.forEach(st=>{
      const cell=document.createElement("label");cell.className="time-cell";cell.textContent=`${st.name}（時刻）`;
      const input=document.createElement("input");input.placeholder="HH:MM:SS";input.inputMode="decimal";input.value=train?.times?.[st.id]||"";input.dataset.stationId=st.id;
      cell.append(input);
      const platform=document.createElement("select");platform.add(new Option("番線未指定",""));
      (st.tracks||[]).forEach(t=>platform.add(new Option(t,t)));
      platform.value=train?.platforms?.[st.id]||"";platform.dataset.platformStationId=st.id;
      cell.append(platform);wrap.append(cell);
    });
    if(!state.stations.length)wrap.innerHTML='<p class="hint">先に「駅・番線設定」から駅を登録してください。</p>';
    renderOperationSelect(train?.operationId||"");
  }

  function renderOperationSelect(selected=""){
    const select=$("trainOperation");if(!select)return;
    select.innerHTML="";select.add(new Option("未割当",""));
    state.operations.forEach(op=>select.add(new Option(`${op.number}${op.vehicle?" / "+op.vehicle:""}`,op.id)));
    select.value=selected;
  }

  $("trainForm").addEventListener("submit",e=>{
    e.preventDefault();
    if(!state.stations.length)return alert("先に駅を登録してください。");
    const times={},platforms={};
    for(const input of document.querySelectorAll("#timeInputs input")){
      const v=input.value.trim();
      if(v&&parseTime(v)===null)return alert("時刻は HH:MM または HH:MM:SS 形式で入力してください。");
      if(v)times[input.dataset.stationId]=v.length===5?v+":00":v;
    }
    document.querySelectorAll("#timeInputs select").forEach(input=>{if(input.value)platforms[input.dataset.platformStationId]=input.value;});
    if(Object.keys(times).length<2)return alert("少なくとも2駅分の時刻を入力してください。");
    const train={id:editingTrainId||makeId(),number:$("trainNumber").value.trim(),type:$("trainType").value.trim(),destination:$("trainDestination").value.trim(),color:$("trainColor").value,times,platforms,operationId:$("trainOperation").value};
    const index=state.trains.findIndex(t=>t.id===train.id);
    if(index>=0)state.trains[index]=train;else state.trains.push(train);
    editingTrainId=null;e.target.reset();$("trainColor").value="#006d69";e.target.querySelector('button[type="submit"]').textContent="列車を登録・更新";setDirty();
  });

  function renderTrains(){
    const list=$("trainList");list.innerHTML="";
    state.trains.forEach(t=>{
      const op=state.operations.find(o=>o.id===t.operationId);
      const card=document.createElement("div");card.className="data-card";
      const info=document.createElement("div");
      info.innerHTML=`<strong>${escapeHtml(t.number)} ${escapeHtml(t.type)}</strong><small>${escapeHtml(t.destination||"行先未設定")} ／ ${Object.keys(t.times||{}).length}駅入力 ／ 運用：${escapeHtml(op?.number||"未割当")}</small>`;
      const controls=document.createElement("div");controls.className="actions";
      const edit=document.createElement("button");edit.textContent="編集";edit.style.background="#e7f2f0";edit.style.color="#005550";
      edit.addEventListener("click",()=>{editingTrainId=t.id;$("trainNumber").value=t.number;$("trainType").value=t.type;$("trainDestination").value=t.destination;$("trainColor").value=t.color;renderTimeInputs(t);$("trainForm").querySelector('button[type="submit"]').textContent="変更を保存";showPanel("trains");window.scrollTo({top:0,behavior:"smooth"});});
      const del=document.createElement("button");del.textContent="削除";del.addEventListener("click",()=>{state.trains=state.trains.filter(x=>x.id!==t.id);setDirty();});
      controls.append(edit,del);card.append(info,controls);list.append(card);
    });
    if(!state.trains.length)list.innerHTML='<p class="hint">列車がまだ登録されていません。</p>';
  }

  $("operationForm").addEventListener("submit",e=>{
    e.preventDefault();
    const number=$("operationNumber").value.trim();if(!number)return;
    if(state.operations.some(o=>o.number===number))return alert("同じ運用番号が既に登録されています。");
    state.operations.push({id:makeId(),number,vehicle:$("operationVehicle").value.trim()});
    e.target.reset();setDirty();
  });

  function renderOperations(){
    const list=$("operationList");list.innerHTML="";
    state.operations.forEach(op=>{
      const trains=state.trains.filter(t=>t.operationId===op.id);
      const details=trains.map(t=>t.number).join(" → ")||"割当列車なし";
      const card=document.createElement("div");card.className="data-card";
      const info=document.createElement("div");
      info.innerHTML=`<strong>運用 ${escapeHtml(op.number)}</strong><small>${escapeHtml(op.vehicle||"車両未設定")} ／ ${escapeHtml(details)}</small>`;
      const del=document.createElement("button");del.textContent="削除";
      del.addEventListener("click",()=>{if(!confirm(`運用 ${op.number}を削除しますか？`))return;state.operations=state.operations.filter(x=>x.id!==op.id);state.trains.forEach(t=>{if(t.operationId===op.id)t.operationId="";});setDirty();});
      card.append(info,del);list.append(card);
    });
    if(!state.operations.length)list.innerHTML='<p class="hint">運用がまだ登録されていません。</p>';
  }

  function renderDiagram(){
    const svg=$("diagram"),width=Math.max(700,state.stations.length*125+100),height=600;
    svg.setAttribute("viewBox",`0 0 ${width} ${height}`);svg.innerHTML="";
    const NS="http://www.w3.org/2000/svg";
    const add=(tag,attrs,parent=svg,text=null)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==null)el.textContent=text;parent.append(el);return el;};
    if(state.stations.length<2){add("text",{x:30,y:50,fill:"#687875","font-size":15},"駅を2つ以上登録するとダイヤを表示します。");$("diagramSummary").textContent="駅を登録してください";return;}
    const vals=state.trains.flatMap(t=>Object.values(t.times||{}).map(parseTime)).filter(v=>v!==null);
    const min=Math.floor((vals.length?Math.min(...vals):21600)/3600)*3600,max=Math.ceil((vals.length?Math.max(...vals):79200)/3600)*3600;
    const top=35,bottom=height-55,left=70,right=width-35;
    const x=i=>left+(right-left)*i/(state.stations.length-1),y=t=>bottom-(t-min)/(Math.max(3600,max-min))*(bottom-top);
    for(let h=Math.floor(min/3600);h<=Math.ceil(max/3600);h++){const yy=y(h*3600);add("line",{x1:left,y1:yy,x2:right,y2:yy,stroke:"#e5ecea","stroke-width":1});add("text",{x:left-12,y:yy+4,"text-anchor":"end",fill:"#687875","font-size":11},`${String(Math.floor(h)%24).padStart(2,"0")}:00`);}
    state.stations.forEach((st,i)=>{const xx=x(i);add("line",{x1:xx,y1:top,x2:xx,y2:bottom,stroke:"#cbd8d5","stroke-width":1});add("text",{x:xx,y:bottom+23,"text-anchor":"middle",fill:"#263936","font-size":12},st.name);});
    state.trains.forEach(t=>{
      const pts=[];state.stations.forEach((st,i)=>{const time=t.times?.[st.id];if(time&&parseTime(time)!==null)pts.push(`${x(i)},${y(parseTime(time))}`);});
      if(pts.length>=2){add("polyline",{points:pts.join(" "),fill:"none",stroke:t.color||"#006d69","stroke-width":2.5,"stroke-linejoin":"round","stroke-linecap":"round"});pts.forEach(p=>{const[cx,cy]=p.split(",");add("circle",{cx,cy,r:3.5,fill:t.color||"#006d69",stroke:"white","stroke-width":1});});}
    });
    $("diagramSummary").textContent=`${state.stations.length}駅・${state.trains.length}列車・秒単位`;
  }

  function renderAll(){
    $("routeName").value=state.routeName;renderStations();renderTimeInputs();renderTrains();renderOperations();renderDiagram();saveLocal();
  }

  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({...state,format:"universal-railway-diagram",version:2},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="railway-diagram-v02.json";a.click();URL.revokeObjectURL(url);
  });
  $("importBtn").addEventListener("click",()=>$("importFile").click());
  $("importFile").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try{const data=JSON.parse(await file.text());if(!Array.isArray(data.stations)||!Array.isArray(data.trains))throw new Error("形式違い");state.routeName=data.routeName||"読み込んだダイヤ";state.stations=data.stations;state.trains=data.trains;state.operations=Array.isArray(data.operations)?data.operations:[];setDirty();}
    catch(err){alert("JSONを読み込めませんでした。ファイル形式を確認してください。");}
    e.target.value="";
  });
  $("newProjectBtn").addEventListener("click",()=>{
    if(!confirm("現在のデータを消去して新規作成しますか？先にJSON保存することをおすすめします。"))return;
    state.routeName="新しいダイヤ";state.stations=[];state.trains=[];state.operations=[];editingTrainId=null;setDirty();
  });

  loadLocal();renderAll();
})();