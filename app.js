(() => {
  const $ = id => document.getElementById(id);
  const state = { routeName: "新しいダイヤ", stations: [], trains: [] };
  let editingTrainId = null;

  const makeId = () => "id-" + Date.now() + "-" + Math.random().toString(16).slice(2,7);
  const parseTime = value => {
    if (!value) return null;
    const m = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
    if (!m || Number(m[1]) > 47) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const formatTime = n => `${String(Math.floor(n/60)%24).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;

  function showPanel(name) {
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${name}`));
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.panel === name));
    if (name === "trains") renderTimeInputs();
  }
  document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => showPanel(b.dataset.panel)));

  $("routeName").addEventListener("input", e => { state.routeName = e.target.value; });
  $("stationForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("stationName").value.trim();
    const distance = Number($("stationDistance").value);
    if (!name || !Number.isFinite(distance)) return;
    state.stations.push({ id:makeId(), name, distance, tracks:["1番線","2番線"] });
    state.stations.sort((a,b) => a.distance-b.distance);
    e.target.reset(); renderAll();
  });

  function renderStations() {
    $("stationList").innerHTML = "";
    state.stations.forEach(st => {
      const card = document.createElement("div"); card.className = "data-card";
      const info = document.createElement("div");
      info.innerHTML = `<strong>${escapeHtml(st.name)}</strong><small>起点から ${st.distance} km</small>`;
      const controls = document.createElement("div");
      const trackInput = document.createElement("input");
      trackInput.value = st.tracks.join(", "); trackInput.setAttribute("aria-label", `${st.name}の番線`);
      trackInput.placeholder = "番線をカンマ区切りで入力";
      trackInput.style.maxWidth = "260px";
      trackInput.addEventListener("change", () => { st.tracks = trackInput.value.split(",").map(x=>x.trim()).filter(Boolean); renderTimeInputs(); });
      const del = document.createElement("button"); del.textContent = "削除";
      del.addEventListener("click", () => {
        if (!confirm(`${st.name}を削除しますか？`)) return;
        state.stations = state.stations.filter(x=>x.id!==st.id);
        state.trains.forEach(t=>{ delete t.times[st.id]; delete t.platforms[st.id]; });
        renderAll();
      });
      controls.append(trackInput, del); card.append(info, controls); $("stationList").append(card);
    });
    if (!state.stations.length) $("stationList").innerHTML = '<p class="hint">駅がまだ登録されていません。</p>';
  }

  function renderTimeInputs(train = null) {
    const wrap = $("timeInputs"); wrap.innerHTML = "";
    state.stations.forEach(st => {
      const cell = document.createElement("label"); cell.className = "time-cell";
      cell.textContent = `${st.name}（時刻）`;
      const input = document.createElement("input"); input.placeholder = "HH:MM"; input.inputMode = "numeric";
      input.value = train?.times?.[st.id] || "";
      input.dataset.stationId = st.id;
      cell.append(input);
      const platform = document.createElement("select");
      platform.style.cssText = "padding:8px;border:1px solid #dce5e3;border-radius:8px;background:white";
      const blank = new Option("番線未指定","");
      platform.add(blank);
      (st.tracks || []).forEach(t => platform.add(new Option(t,t)));
      platform.value = train?.platforms?.[st.id] || "";
      platform.dataset.platformStationId = st.id;
      cell.append(platform); wrap.append(cell);
    });
    if (!state.stations.length) wrap.innerHTML = '<p class="hint">先に「駅・番線設定」から駅を登録してください。</p>';
  }

  $("trainForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!state.stations.length) return alert("先に駅を登録してください。");
    const times = {}, platforms = {};
    document.querySelectorAll("#timeInputs input").forEach(input => {
      const v = input.value.trim();
      if (v && parseTime(v) === null) throw new Error("時刻は HH:MM 形式で入力してください。");
      if (v) times[input.dataset.stationId] = v;
    });
    document.querySelectorAll("#timeInputs select").forEach(input => { if (input.value) platforms[input.dataset.platformStationId] = input.value; });
    if (Object.keys(times).length < 2) return alert("少なくとも2駅分の時刻を入力してください。");
    const train = {
      id: editingTrainId || makeId(), number:$("trainNumber").value.trim(),
      type:$("trainType").value.trim(), destination:$("trainDestination").value.trim(),
      color:$("trainColor").value, times, platforms
    };
    const index = state.trains.findIndex(t=>t.id===train.id);
    if (index >= 0) state.trains[index] = train; else state.trains.push(train);
    editingTrainId = null; e.target.reset(); $("trainColor").value="#006d69";
    e.target.querySelector("button[type=submit]").textContent = "列車を登録・更新";
    renderAll();
  });

  function renderTrains() {
    $("trainList").innerHTML = "";
    state.trains.forEach(t => {
      const card = document.createElement("div"); card.className="data-card";
      const info=document.createElement("div");
      info.innerHTML=`<strong>${escapeHtml(t.number)} ${escapeHtml(t.type)}</strong><small>${escapeHtml(t.destination || "行先未設定")} ／ ${Object.keys(t.times).length}駅入力</small>`;
      const controls=document.createElement("div");
      const edit=document.createElement("button"); edit.textContent="編集"; edit.style.background="#e7f2f0"; edit.style.color="#005550";
      edit.addEventListener("click",()=>{ editingTrainId=t.id; $("trainNumber").value=t.number; $("trainType").value=t.type; $("trainDestination").value=t.destination; $("trainColor").value=t.color; renderTimeInputs(t); $("trainForm").querySelector("button[type=submit]").textContent="変更を保存"; showPanel("trains"); window.scrollTo({top:0,behavior:"smooth"}); });
      const del=document.createElement("button"); del.textContent="削除"; del.addEventListener("click",()=>{state.trains=state.trains.filter(x=>x.id!==t.id);renderAll();});
      controls.append(edit,del);card.append(info,controls);$("trainList").append(card);
    });
    if (!state.trains.length) $("trainList").innerHTML='<p class="hint">列車がまだ登録されていません。</p>';
  }

  function renderDiagram() {
    const svg=$("diagram"), width=Math.max(700, state.stations.length*115+100), height=600;
    svg.setAttribute("viewBox",`0 0 ${width} ${height}`); svg.innerHTML="";
    const NS="http://www.w3.org/2000/svg";
    const add=(tag,attrs,parent=svg,text=null)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==null)el.textContent=text;parent.append(el);return el;};
    if(state.stations.length<2){add("text",{x:30,y:50,fill:"#687875","font-size":15},"駅を2つ以上登録するとダイヤを表示します。");$("diagramSummary").textContent="駅を登録してください";return;}
    const all=state.trains.flatMap(t=>Object.values(t.times).map(parseTime)).filter(v=>v!==null);
    const min=Math.floor((all.length?Math.min(...all):360)/60)*60;
    const max=Math.ceil((all.length?Math.max(...all):1320)/60)*60;
    const top=35,bottom=height-55,left=70,right=width-35;
    const x=i=>left+(right-left)*i/(state.stations.length-1);
    const y=t=>bottom-(t-min)/(Math.max(60,max-min))*(bottom-top);
    for(let h=Math.floor(min/60);h<=Math.ceil(max/60);h++){
      const yy=y(h*60);add("line",{x1:left,y1:yy,x2:right,y2:yy,stroke:"#e5ecea","stroke-width":1});
      add("text",{x:left-12,y:yy+4,"text-anchor":"end",fill:"#687875","font-size":11},`${String(h%24).padStart(2,"0")}:00`);
    }
    state.stations.forEach((st,i)=>{
      const xx=x(i);add("line",{x1:xx,y1:top,x2:xx,y2:bottom,stroke:"#cbd8d5","stroke-width":1});
      add("text",{x:xx,y:bottom+23,"text-anchor":"middle",fill:"#263936","font-size":12},st.name);
    });
    state.trains.forEach(t=>{
      const pts=[];
      state.stations.forEach((st,i)=>{const time=t.times[st.id];if(time && parseTime(time)!==null)pts.push(`${x(i)},${y(parseTime(time))}`);});
      if(pts.length>=2){add("polyline",{points:pts.join(" "),fill:"none",stroke:t.color,"stroke-width":2.5,"stroke-linejoin":"round","stroke-linecap":"round"});pts.forEach(p=>{const [cx,cy]=p.split(",");add("circle",{cx,cy,r:3.5,fill:t.color,stroke:"white","stroke-width":1});});}
    });
    $("diagramSummary").textContent=`${state.stations.length}駅・${state.trains.length}列車`;
  }

  function renderAll(){ $("routeName").value=state.routeName; renderStations(); renderTimeInputs(); renderTrains(); renderDiagram(); }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({...state,format:"universal-railway-diagram",version:1},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="railway-diagram.json";a.click();URL.revokeObjectURL(url);
  });
  $("importBtn").addEventListener("click",()=>$("importFile").click());
  $("importFile").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try{const data=JSON.parse(await file.text());if(!Array.isArray(data.stations)||!Array.isArray(data.trains))throw new Error("形式が違います");state.routeName=data.routeName||"読み込んだダイヤ";state.stations=data.stations;state.trains=data.trains;renderAll();}
    catch(err){alert("JSONを読み込めませんでした。ファイル形式を確認してください。");}
    e.target.value="";
  });
  $("newProjectBtn").addEventListener("click",()=>{
    if(!confirm("現在のデータを消去して新規作成しますか？ 先にJSON保存することをおすすめします。"))return;
    state.routeName="新しいダイヤ";state.stations=[];state.trains=[];editingTrainId=null;renderAll();
  });
  renderAll();
})();