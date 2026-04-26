import { useState, useRef, useCallback, useEffect } from “react”;

const STORAGE_KEY_CHEKI = “chekiLog_cheki_v1”;
const STORAGE_KEY_PROFILES = “chekiLog_profiles_v1”;

const DEFAULT_DATA = [];
const DEFAULT_PROFILES = [];

const BG = “#f0f0f0”, CARD = “#ffffff”, ACCENT = “#3a3a3a”, ACCENT2 = “#6c63ff”, MUTED = “#9e9e9e”, BORDER = “#e0e0e0”;

function getHistory(list, key) { return […new Set(list.map(c => c[key]).filter(Boolean))]; }
function formatDate(ds) {
if (!ds) return “”;
const d = new Date(ds + “T00:00:00”);
return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}
function getDaysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }

// ── Avatar ──
function Avatar({ name, color, size = 36 }) {
const char = name ? name[0] : “?”;
const hue = color ? 0 : name ? […name].reduce((a,c)=>a+c.charCodeAt(0),0)%360 : 200;
const bg = color || `hsl(${hue},55%,70%)`;
return <div style={{ width:size, height:size, borderRadius:“50%”, background:bg, display:“flex”, alignItems:“center”, justifyContent:“center”, fontWeight:900, fontSize:size*0.42, color:”#fff”, flexShrink:0 }}>{char}</div>;
}

function ChekiThumb({ image, idol, color, size=“sm” }) {
const w = size===“sm”?44:size===“md”?80:120, h = Math.round(w*1.4);
return <div style={{ width:w, height:h, borderRadius:8, background:”#e8e8e8”, overflow:“hidden”, display:“flex”, alignItems:“center”, justifyContent:“center”, flexShrink:0, border:`1px solid ${BORDER}`, boxShadow:“0 2px 6px #0001” }}>
{image ? <img src={image} alt=”” style={{width:“100%”,height:“100%”,objectFit:“cover”}}/> : <Avatar name={idol} color={color} size={w*0.6}/>}

  </div>;
}

function Tag({ label, color=”#eee”, text=”#555” }) {
return <span style={{ background:color, color:text, borderRadius:99, fontSize:10, padding:“2px 8px”, fontWeight:700, whiteSpace:“nowrap” }}>{label}</span>;
}
function Pill({ label, active, onClick }) {
return <button onClick={onClick} style={{ padding:“5px 13px”, borderRadius:99, border:`1.5px solid ${active?ACCENT2:BORDER}`, background:active?ACCENT2:CARD, color:active?”#fff”:”#666”, fontSize:12, fontWeight:700, cursor:“pointer”, whiteSpace:“nowrap”, transition:“all .15s” }}>{label}</button>;
}
function SegmentControl({ options, value, onChange }) {
return <div style={{ display:“flex”, background:”#e4e4e4”, borderRadius:10, padding:3, gap:2 }}>
{options.map(o=><button key={o} onClick={()=>onChange(o)} style={{ flex:1, padding:“6px 0”, borderRadius:8, border:“none”, fontSize:13, fontWeight:700, cursor:“pointer”, transition:“all .15s”, background:value===o?CARD:“transparent”, color:value===o?ACCENT:MUTED, boxShadow:value===o?“0 1px 4px #0001”:“none” }}>{o}</button>)}

  </div>;
}

function AutoInput({ label, value, onChange, suggestions=[], placeholder, type=“text” }) {
const [show, setShow] = useState(false);
const filtered = suggestions.filter(s=>s&&s.toLowerCase().includes((value||””).toLowerCase())&&s!==value);
return <div style={{ marginBottom:12, position:“relative” }}>
<div style={{ fontSize:11, color:MUTED, marginBottom:4, fontWeight:600 }}>{label}</div>
<input type={type} style={{ width:“100%”, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:“9px 12px”, fontSize:14, background:CARD, outline:“none”, boxSizing:“border-box”, color:ACCENT }}
value={value} placeholder={placeholder}
onChange={e=>{onChange(e.target.value);setShow(true);}}
onFocus={()=>setShow(true)} onBlur={()=>setTimeout(()=>setShow(false),150)}/>
{show&&filtered.length>0&&<div style={{ position:“absolute”, zIndex:30, width:“100%”, background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, boxShadow:“0 4px 16px #0002”, marginTop:2, maxHeight:140, overflowY:“auto” }}>
{filtered.map(s=><div key={s} onMouseDown={()=>{onChange(s);setShow(false);}} style={{ padding:“9px 14px”, fontSize:14, cursor:“pointer”, color:ACCENT }} onMouseEnter={e=>e.currentTarget.style.background=”#f5f5f5”} onMouseLeave={e=>e.currentTarget.style.background=“transparent”}>{s}</div>)}
</div>}

  </div>;
}

// ── MiniCard ──
function MiniCard({ c, profile, onClick }) {
const color = profile?.color;
return <div onClick={onClick} style={{ display:“flex”, gap:12, background:CARD, borderRadius:14, padding:12, marginBottom:8, cursor:“pointer”, border:`1px solid ${BORDER}` }}
onMouseEnter={e=>e.currentTarget.style.boxShadow=“0 4px 12px #0001”} onMouseLeave={e=>e.currentTarget.style.boxShadow=“none”}>
<ChekiThumb image={c.image} idol={c.idol} color={color} size="sm"/>
<div style={{ flex:1, minWidth:0 }}>
<div style={{ fontWeight:800, fontSize:14, color:ACCENT, marginBottom:2 }}>{c.idol||”—”}</div>
<div style={{ fontSize:11, color:MUTED, marginBottom:4 }}>{formatDate(c.date)}</div>
<div style={{ display:“flex”, flexWrap:“wrap”, gap:4 }}>
{c.group&&<Tag label={c.group} color="#ede9ff" text={ACCENT2}/>}
{c.event&&<Tag label={c.event} color="#f5f5f5" text="#666"/>}
</div>
{c.place&&<div style={{ fontSize:11, color:MUTED, marginTop:4 }}>📍 {c.place}</div>}
</div>
<div style={{ color:MUTED, fontSize:18, alignSelf:“center” }}>›</div>

  </div>;
}

// ══════════════════════════════
//  詳細 & 編集モーダル
// ══════════════════════════════
function DetailModal({ cheki, profile, chekiList, onClose, onDelete, onUpdate }) {
const [editing, setEditing] = useState(false);
const [form, setForm] = useState({ …cheki });
const fileRef = useRef();
if (!cheki) return null;

const f = k => v => setForm(p=>({…p,[k]:v}));

const handleSave = () => { onUpdate(form); setEditing(false); };
const handleFile = e => {
const file = e.target.files[0]; if (!file) return;
const r = new FileReader(); r.onload = ev => setForm(p=>({…p,image:ev.target.result})); r.readAsDataURL(file);
};

return <div style={{ position:“fixed”, inset:0, background:”#000a”, zIndex:100, display:“flex”, alignItems:“flex-end”, justifyContent:“center” }} onClick={onClose}>
<div onClick={e=>e.stopPropagation()} style={{ background:BG, borderRadius:“20px 20px 0 0”, width:“100%”, maxWidth:480, padding:24, paddingBottom:36, maxHeight:“85vh”, overflowY:“auto” }}>
<div style={{ width:36, height:4, background:BORDER, borderRadius:99, margin:“0 auto 16px” }}/>
<div style={{ display:“flex”, justifyContent:“space-between”, alignItems:“center”, marginBottom:16 }}>
<span style={{ fontWeight:900, fontSize:16, color:ACCENT }}>{editing?“編集”:“詳細”}</span>
<button onClick={()=>{setEditing(!editing);setForm({…cheki});}} style={{ border:`1px solid ${BORDER}`, borderRadius:8, padding:“4px 12px”, fontSize:12, fontWeight:700, background:editing?CARD:ACCENT, color:editing?ACCENT:”#fff”, cursor:“pointer” }}>
{editing?“キャンセル”:“✏️ 編集”}
</button>
</div>

```
  {editing ? <>
    <div onClick={()=>fileRef.current.click()} style={{ width:"100%", height:140, background:CARD, border:`2px dashed ${BORDER}`, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginBottom:16, overflow:"hidden" }}>
      {form.image ? <img src={form.image} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}/> : <span style={{fontSize:32}}>📷</span>}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
    </div>
    <div style={{ background:CARD, borderRadius:14, padding:"14px 14px 2px" }}>
      <AutoInput label="日付" value={form.date} onChange={f("date")} suggestions={getHistory(chekiList,"date")} type="date"/>
      <AutoInput label="アイドル名" value={form.idol} onChange={f("idol")} suggestions={getHistory(chekiList,"idol")} placeholder="例: 推宮ひかる"/>
      <AutoInput label="グループ名" value={form.group} onChange={f("group")} suggestions={getHistory(chekiList,"group")} placeholder="例: OSHICHE"/>
      <AutoInput label="イベント名" value={form.event} onChange={f("event")} suggestions={getHistory(chekiList,"event")} placeholder="例: Winter Live"/>
      <AutoInput label="場所" value={form.place} onChange={f("place")} suggestions={getHistory(chekiList,"place")} placeholder="例: Zepp Shinjuku"/>
    </div>
    <button onClick={handleSave} style={{ width:"100%", marginTop:14, padding:"13px 0", borderRadius:12, border:"none", background:ACCENT, color:"#fff", fontWeight:900, fontSize:14, cursor:"pointer" }}>保存する</button>
  </> : <>
    <div style={{ display:"flex", gap:16, alignItems:"flex-start", marginBottom:16 }}>
      <ChekiThumb image={cheki.image} idol={cheki.idol} color={profile?.color} size="lg"/>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:20, fontWeight:900, color:ACCENT, marginBottom:6 }}>{cheki.idol||"—"}</div>
        {cheki.group&&<Tag label={cheki.group} color="#ede9ff" text={ACCENT2}/>}
        <div style={{ fontSize:13, color:MUTED, marginTop:8 }}>{formatDate(cheki.date)}</div>
      </div>
    </div>
    {[["🎪 イベント",cheki.event],["📍 場所",cheki.place]].map(([lbl,val])=>val?<div key={lbl} style={{ display:"flex", gap:8, padding:"10px 0", borderBottom:`1px solid ${BORDER}`, fontSize:14 }}><span style={{ color:MUTED, minWidth:90 }}>{lbl}</span><span style={{ color:ACCENT, fontWeight:600 }}>{val}</span></div>:null)}
    <div style={{ display:"flex", gap:10, marginTop:20 }}>
      <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:12, border:`1.5px solid ${BORDER}`, background:CARD, color:ACCENT, fontWeight:700, fontSize:14, cursor:"pointer" }}>閉じる</button>
      <button onClick={()=>{onDelete(cheki.id);onClose();}} style={{ flex:1, padding:12, borderRadius:12, border:"none", background:"#ff5252", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>削除</button>
    </div>
  </>}
</div>
```

  </div>;
}

// ══════════════════════════════
//  登録タブ
// ══════════════════════════════
function RegisterTab({ chekiList, onAdd }) {
const [image, setImage] = useState(null);
const [date, setDate] = useState(””); const [event, setEvent] = useState(””); const [place, setPlace] = useState(””);
const [group, setGroup] = useState(””); const [idol, setIdol] = useState(””); const [done, setDone] = useState(false);
const fileRef = useRef();
const handleFile = e => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>setImage(ev.target.result); r.readAsDataURL(f); };
const handleSubmit = () => {
if(!date||!idol) return alert(“日付とアイドル名は必須です”);
onAdd({ date, event, place, group, idol, image });
setImage(null);setDate(””);setEvent(””);setPlace(””);setGroup(””);setIdol(””);
setDone(true); setTimeout(()=>setDone(false),2500);
};
return <div style={{ padding:“16px 16px 24px”, maxWidth:480, margin:“0 auto” }}>
<div style={{ fontSize:11, color:MUTED, fontWeight:700, letterSpacing:1, marginBottom:16 }}>NEW CHEKI</div>
<div onClick={()=>fileRef.current.click()} style={{ width:“100%”, height:180, background:CARD, border:`2px dashed ${BORDER}`, borderRadius:16, display:“flex”, flexDirection:“column”, alignItems:“center”, justifyContent:“center”, cursor:“pointer”, marginBottom:20, overflow:“hidden” }}>
{image?<img src={image} alt=”” style={{width:“100%”,height:“100%”,objectFit:“contain”}}/>:<><div style={{fontSize:36,marginBottom:8}}>📷</div><div style={{fontSize:13,color:MUTED}}>タップして写真を追加</div></>}
<input ref={fileRef} type=“file” accept=“image/*” style={{display:“none”}} onChange={handleFile}/>
</div>
<div style={{ background:CARD, borderRadius:16, padding:“16px 16px 8px” }}>
<AutoInput label=“日付” value={date} onChange={setDate} suggestions={getHistory(chekiList,“date”)} placeholder=”” type=“date”/>
<AutoInput label=“アイドル名 *” value={idol} onChange={setIdol} suggestions={getHistory(chekiList,“idol”)} placeholder=“例: 〇〇 〇〇”/>
<AutoInput label=“グループ名” value={group} onChange={setGroup} suggestions={getHistory(chekiList,“group”)} placeholder=“例: 〇〇グループ”/>
<AutoInput label=“イベント名” value={event} onChange={setEvent} suggestions={getHistory(chekiList,“event”)} placeholder=“例: 〇〇フェス”/>
<AutoInput label=“場所” value={place} onChange={setPlace} suggestions={getHistory(chekiList,“place”)} placeholder=“例: ライブハウス”/>
</div>
<button onClick={handleSubmit} style={{ width:“100%”, marginTop:16, padding:“14px 0”, borderRadius:14, border:“none”, background:done?”#4caf50”:ACCENT, color:”#fff”, fontWeight:900, fontSize:15, cursor:“pointer”, transition:“background .3s” }}>{done?“✓  保存しました！”:“登録する”}</button>

  </div>;
}

// ══════════════════════════════
//  カレンダータブ
// ══════════════════════════════
function CalendarTab({ chekiList, profiles, onDetail }) {
const today = new Date();
const [year, setYear] = useState(today.getFullYear());
const [month, setMonth] = useState(today.getMonth());
const [selected, setSelected] = useState(null);
const days=getDaysInMonth(year,month), firstDay=getFirstDay(year,month);
const WEEK=[“日”,“月”,“火”,“水”,“木”,“金”,“土”];
const byDate={};
chekiList.forEach(c=>{ if(!byDate[c.date])byDate[c.date]=[]; byDate[c.date].push(c); });
const prev=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);setSelected(null);};
const next=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);setSelected(null);};
const selKey=selected?`${year}-${String(month+1).padStart(2,"0")}-${String(selected).padStart(2,"0")}`:null;
const selList=selKey?(byDate[selKey]||[]):[];
const getProfile=c=>profiles.find(p=>p.idol===c.idol&&p.group===c.group);
return <div style={{ padding:“16px 16px 24px”, maxWidth:480, margin:“0 auto” }}>
<div style={{ display:“flex”, alignItems:“center”, justifyContent:“space-between”, marginBottom:16 }}>
<button onClick={prev} style={{ width:36,height:36,borderRadius:“50%”,border:`1px solid ${BORDER}`,background:CARD,cursor:“pointer”,fontSize:16,color:ACCENT }}>‹</button>
<span style={{ fontWeight:900,fontSize:17,color:ACCENT }}>{year}年 {month+1}月</span>
<button onClick={next} style={{ width:36,height:36,borderRadius:“50%”,border:`1px solid ${BORDER}`,background:CARD,cursor:“pointer”,fontSize:16,color:ACCENT }}>›</button>
</div>
<div style={{ background:CARD, borderRadius:16, padding:12, marginBottom:16 }}>
<div style={{ display:“grid”, gridTemplateColumns:“repeat(7,1fr)”, marginBottom:4 }}>
{WEEK.map((w,i)=><div key={w} style={{ textAlign:“center”,fontSize:11,fontWeight:700,color:i===0?”#e53935”:i===6?”#1e88e5”:MUTED,padding:“4px 0” }}>{w}</div>)}
</div>
<div style={{ display:“grid”, gridTemplateColumns:“repeat(7,1fr)”, gap:2 }}>
{Array(firstDay).fill(null).map((*,i)=><div key={“e”+i}/>)}
{Array(days).fill(null).map((*,i)=>{
const d=i+1, key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const items=byDate[key]||[], isSel=selected===d, dow=(firstDay+i)%7;
return <div key={d} onClick={()=>setSelected(isSel?null:d)} style={{ borderRadius:10,padding:“4px 2px”,cursor:“pointer”,background:isSel?ACCENT:“transparent”,display:“flex”,flexDirection:“column”,alignItems:“center”,minHeight:54,transition:“background .15s” }}>
<span style={{ fontSize:12,fontWeight:700,color:isSel?”#fff”:dow===0?”#e53935”:dow===6?”#1e88e5”:ACCENT }}>{d}</span>
{items.length>0&&<>
<div style={{ width:28,height:38,borderRadius:5,background:”#e0e0e0”,overflow:“hidden”,marginTop:2 }}>
{items[0].image?<img src={items[0].image} style={{width:“100%”,height:“100%”,objectFit:“cover”}} alt=””/>
:<div style={{width:“100%”,height:“100%”,display:“flex”,alignItems:“center”,justifyContent:“center”}}><Avatar name={items[0].idol} color={getProfile(items[0])?.color} size={22}/></div>}
</div>
{items.length>1&&<span style={{ fontSize:9,fontWeight:700,color:isSel?”#fff”:ACCENT2 }}>+{items.length}</span>}
</>}
</div>;
})}
</div>
</div>
{selected&&<>
<div style={{ fontSize:13,fontWeight:700,color:MUTED,marginBottom:10 }}>{month+1}月{selected}日 — {selList.length}枚</div>
{selList.length===0?<div style={{textAlign:“center”,color:MUTED,fontSize:13,padding:“20px 0”}}>この日のチェキはありません</div>
:selList.map(c=><MiniCard key={c.id} c={c} profile={getProfile(c)} onClick={()=>onDetail(c)}/>)}
</>}

  </div>;
}

// ══════════════════════════════
//  集計タブ
// ══════════════════════════════
function StatsTab({ chekiList }) {
const today=new Date();
const [period,setPeriod]=useState(“月別”);
const [year,setYear]=useState(today.getFullYear());
const [month,setMonth]=useState(today.getMonth()+1);
let filtered=chekiList;
if(period===“月別”) filtered=chekiList.filter(c=>{const d=new Date(c.date+“T00:00:00”);return d.getFullYear()===year&&d.getMonth()+1===month;});
else if(period===“年別”) filtered=chekiList.filter(c=>new Date(c.date+“T00:00:00”).getFullYear()===year);
const events=new Set(filtered.map(c=>c.event).filter(Boolean));
const idols=new Set(filtered.map(c=>c.idol).filter(Boolean));
const idolCount={};
filtered.forEach(c=>{if(c.idol)idolCount[c.idol]=(idolCount[c.idol]||0)+1;});
const ranking=Object.entries(idolCount).sort((a,b)=>b[1]-a[1]);
const max=ranking[0]?.[1]||1;
return <div style={{ padding:“16px 16px 24px”, maxWidth:480, margin:“0 auto” }}>
<div style={{ fontSize:11,color:MUTED,fontWeight:700,letterSpacing:1,marginBottom:12 }}>STATISTICS</div>
<SegmentControl options={[“月別”,“年別”,“全期間”]} value={period} onChange={setPeriod}/>
{period!==“全期間”&&<div style={{ display:“flex”,gap:8,alignItems:“center”,marginTop:12,background:CARD,borderRadius:12,padding:“8px 12px” }}>
<select value={year} onChange={e=>setYear(+e.target.value)} style={{ border:`1px solid ${BORDER}`,borderRadius:8,padding:“4px 8px”,fontSize:13,background:”#fafafa”,color:ACCENT }}>
{[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
</select>
<span style={{color:MUTED,fontSize:13}}>年</span>
{period===“月別”&&<><select value={month} onChange={e=>setMonth(+e.target.value)} style={{ border:`1px solid ${BORDER}`,borderRadius:8,padding:“4px 8px”,fontSize:13,background:”#fafafa”,color:ACCENT }}>
{Array(12).fill(0).map((_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
</select><span style={{color:MUTED,fontSize:13}}>月</span></>}
</div>}
<div style={{ display:“grid”,gridTemplateColumns:“repeat(3,1fr)”,gap:10,marginTop:16,marginBottom:20 }}>
{[[“📷”,“チェキ”,filtered.length],[“⭐”,“メンバー”,idols.size],[“🎪”,“イベント”,events.size]].map(([icon,label,val])=>(
<div key={label} style={{ background:CARD,borderRadius:16,padding:“14px 10px”,textAlign:“center” }}>
<div style={{fontSize:22,marginBottom:4}}>{icon}</div>
<div style={{fontSize:28,fontWeight:900,color:ACCENT}}>{val}</div>
<div style={{fontSize:11,color:MUTED,fontWeight:600}}>{label}</div>
</div>
))}
</div>
<div style={{ fontSize:11,fontWeight:700,color:MUTED,letterSpacing:1,marginBottom:10 }}>RANKING</div>
<div style={{ background:CARD,borderRadius:16,overflow:“hidden” }}>
{ranking.length===0?<div style={{textAlign:“center”,color:MUTED,fontSize:13,padding:“24px 0”}}>データがありません</div>
:ranking.map(([name,count],i)=>(
<div key={name} style={{ display:“flex”,alignItems:“center”,gap:12,padding:“12px 16px”,borderBottom:i<ranking.length-1?`1px solid ${BORDER}`:“none” }}>
<div style={{ width:24,height:24,borderRadius:“50%”,background:i===0?”#ffd54f”:i===1?”#cfd8dc”:i===2?”#ffab91”:”#eee”,display:“flex”,alignItems:“center”,justifyContent:“center”,fontSize:11,fontWeight:900,color:”#555”,flexShrink:0 }}>{i+1}</div>
<Avatar name={name} size={30}/>
<span style={{ flex:1,fontSize:14,fontWeight:700,color:ACCENT }}>{name}</span>
<div style={{ width:80,display:“flex”,alignItems:“center”,gap:6 }}>
<div style={{ flex:1,height:6,background:”#ececec”,borderRadius:99,overflow:“hidden” }}>
<div style={{ height:“100%”,width:(count/max*100)+”%”,background:ACCENT2,borderRadius:99 }}/>
</div>
<span style={{ fontSize:13,fontWeight:900,color:ACCENT,minWidth:20,textAlign:“right” }}>{count}</span>
</div>
</div>
))}
</div>

  </div>;
}

// ══════════════════════════════
//  一覧タブ
// ══════════════════════════════
function ListTab({ chekiList, profiles, onDetail, onExport }) {
const [search,setSearch]=useState(””);
const [groupF,setGroupF]=useState(“すべて”);
const [placeF,setPlaceF]=useState(“すべて”);
const groups=[“すべて”,…getHistory(chekiList,“group”)];
const places=[“すべて”,…getHistory(chekiList,“place”)];
const filtered=chekiList
.filter(c=>groupF===“すべて”||c.group===groupF)
.filter(c=>placeF===“すべて”||c.place===placeF)
.filter(c=>!search||[c.idol,c.event,c.place,c.group,c.date].some(v=>v&&v.includes(search)))
.sort((a,b)=>b.date.localeCompare(a.date));
const getProfile=c=>profiles.find(p=>p.idol===c.idol&&p.group===c.group);
return <div style={{ padding:“16px 16px 24px”, maxWidth:480, margin:“0 auto” }}>
<div style={{ display:“flex”,gap:8,marginBottom:12 }}>
<input style={{ flex:1,border:`1.5px solid ${BORDER}`,borderRadius:12,padding:“9px 14px”,fontSize:14,background:CARD,outline:“none”,color:ACCENT }}
placeholder=“🔍  名前・イベント・場所で検索” value={search} onChange={e=>setSearch(e.target.value)}/>
<button onClick={onExport} style={{ padding:“9px 14px”,borderRadius:12,border:`1.5px solid ${BORDER}`,background:CARD,cursor:“pointer”,fontSize:13,fontWeight:700,color:ACCENT,whiteSpace:“nowrap” }}>⬇ CSV</button>
</div>
<div style={{ marginBottom:8 }}>
<div style={{ fontSize:11,fontWeight:700,color:MUTED,marginBottom:6,letterSpacing:1 }}>グループ</div>
<div style={{ display:“flex”,gap:6,overflowX:“auto”,paddingBottom:4 }}>{groups.map(g=><Pill key={g} label={g} active={groupF===g} onClick={()=>setGroupF(g)}/>)}</div>
</div>
<div style={{ marginBottom:14 }}>
<div style={{ fontSize:11,fontWeight:700,color:MUTED,marginBottom:6,letterSpacing:1 }}>会場</div>
<div style={{ display:“flex”,gap:6,overflowX:“auto”,paddingBottom:4 }}>{places.map(p=><Pill key={p} label={p} active={placeF===p} onClick={()=>setPlaceF(p)}/>)}</div>
</div>
<div style={{ fontSize:12,color:MUTED,marginBottom:10 }}>{filtered.length}件</div>
{filtered.length===0?<div style={{textAlign:“center”,color:MUTED,fontSize:13,padding:“32px 0”}}>該当するチェキがありません</div>
:filtered.map(c=><MiniCard key={c.id} c={c} profile={getProfile(c)} onClick={()=>onDetail(c)}/>)}

  </div>;
}

// ══════════════════════════════
//  プロフィールタブ
// ══════════════════════════════
const COLORS=[”#9c6fde”,”#e9967a”,”#5ba87b”,”#e9c46a”,”#4ea8de”,”#e76f51”,”#adb5bd”,”#f4a261”];

function ProfileTab({ profiles, chekiList, onSave, onDelete }) {
const [editing, setEditing]=useState(null); // null | “new” | profile object
const [form, setForm]=useState({ idol:””, group:””, color:COLORS[0], memo:”” });

const startNew=()=>{ setForm({idol:””,group:””,color:COLORS[0],memo:””}); setEditing(“new”); };
const startEdit=p=>{ setForm({…p}); setEditing(p); };
const handleSave=()=>{ if(!form.idol) return alert(“アイドル名は必須です”); onSave(form, editing===“new”?null:editing.id); setEditing(null); };

const getCount=p=>chekiList.filter(c=>c.idol===p.idol&&c.group===p.group).length;

if(editing) return <div style={{ padding:“16px 16px 24px”, maxWidth:480, margin:“0 auto” }}>
<button onClick={()=>setEditing(null)} style={{ background:“none”,border:“none”,color:MUTED,fontSize:13,cursor:“pointer”,marginBottom:16,padding:0 }}>← 戻る</button>
<div style={{ fontSize:14,fontWeight:900,color:ACCENT,marginBottom:20 }}>{editing===“new”?“プロフィール追加”:“プロフィール編集”}</div>
<div style={{ background:CARD,borderRadius:16,padding:“16px 16px 8px” }}>
<div style={{ display:“flex”,justifyContent:“center”,marginBottom:16 }}><Avatar name={form.idol} color={form.color} size={72}/></div>
<AutoInput label=“アイドル名 *” value={form.idol} onChange={v=>setForm(p=>({…p,idol:v}))} suggestions={getHistory(chekiList,“idol”)} placeholder=“例: 推宮ひかる”/>
<AutoInput label=“グループ名” value={form.group} onChange={v=>setForm(p=>({…p,group:v}))} suggestions={getHistory(chekiList,“group”)} placeholder=“例: OSHICHE”/>
<div style={{ marginBottom:12 }}>
<div style={{ fontSize:11,color:MUTED,marginBottom:6,fontWeight:600 }}>カラー</div>
<div style={{ display:“flex”,gap:8,flexWrap:“wrap” }}>
{COLORS.map(c=><div key={c} onClick={()=>setForm(p=>({…p,color:c}))} style={{ width:32,height:32,borderRadius:“50%”,background:c,cursor:“pointer”,border:form.color===c?`3px solid ${ACCENT}`:“3px solid transparent”,transition:“border .15s” }}/>)}
</div>
</div>
<div style={{ marginBottom:12 }}>
<div style={{ fontSize:11,color:MUTED,marginBottom:4,fontWeight:600 }}>メモ</div>
<textarea value={form.memo} onChange={e=>setForm(p=>({…p,memo:e.target.value}))} style={{ width:“100%”,border:`1.5px solid ${BORDER}`,borderRadius:10,padding:“9px 12px”,fontSize:14,background:CARD,outline:“none”,boxSizing:“border-box”,color:ACCENT,resize:“none”,height:72 }} placeholder=“自由記入欄”/>
</div>
</div>
<button onClick={handleSave} style={{ width:“100%”,marginTop:14,padding:“13px 0”,borderRadius:12,border:“none”,background:ACCENT,color:”#fff”,fontWeight:900,fontSize:14,cursor:“pointer” }}>保存する</button>
{editing!==“new”&&<button onClick={()=>{onDelete(editing.id);setEditing(null);}} style={{ width:“100%”,marginTop:8,padding:“12px 0”,borderRadius:12,border:“none”,background:”#ff5252”,color:”#fff”,fontWeight:700,fontSize:14,cursor:“pointer” }}>削除</button>}

  </div>;

return <div style={{ padding:“16px 16px 24px”, maxWidth:480, margin:“0 auto” }}>
<div style={{ display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:16 }}>
<div style={{ fontSize:11,color:MUTED,fontWeight:700,letterSpacing:1 }}>PROFILES</div>
<button onClick={startNew} style={{ border:“none”,background:ACCENT,color:”#fff”,borderRadius:10,padding:“6px 14px”,fontSize:13,fontWeight:700,cursor:“pointer” }}>＋ 追加</button>
</div>
{profiles.length===0&&<div style={{textAlign:“center”,color:MUTED,fontSize:13,padding:“40px 0”}}>プロフィールがありません<br/>右上のボタンから追加してください</div>}
{profiles.map(p=>(
<div key={p.id} onClick={()=>startEdit(p)} style={{ display:“flex”,gap:14,background:CARD,borderRadius:14,padding:14,marginBottom:8,cursor:“pointer”,border:`1px solid ${BORDER}`,alignItems:“center” }}
onMouseEnter={e=>e.currentTarget.style.boxShadow=“0 4px 12px #0001”} onMouseLeave={e=>e.currentTarget.style.boxShadow=“none”}>
<Avatar name={p.idol} color={p.color} size={48}/>
<div style={{ flex:1 }}>
<div style={{ fontWeight:800,fontSize:15,color:ACCENT }}>{p.idol}</div>
{p.group&&<div style={{ fontSize:12,color:MUTED,marginBottom:4 }}>{p.group}</div>}
<div style={{ display:“flex”,gap:6 }}>
<Tag label={`📷 ${getCount(p)}枚`} color=”#f5f5f5” text=”#666”/>
{p.memo&&<Tag label={p.memo} color="#ede9ff" text={ACCENT2}/>}
</div>
</div>
<div style={{ color:MUTED,fontSize:18 }}>›</div>
</div>
))}

  </div>;
}

// ══════════════════════════════
//  MAIN
// ══════════════════════════════
export default function App() {
const [tab, setTab]=useState(0);
const [chekiList, setChekiList]=useState([]);
const [profiles, setProfiles]=useState([]);
const [detail, setDetail]=useState(null);
const nextId=useRef(100), nextPid=useRef(10);
const loaded=useRef(false);

useEffect(()=>{
if(loaded.current) return;
loaded.current=true;
(async()=>{
try {
const cr=await window.storage.get(STORAGE_KEY_CHEKI);
if(cr?.value){const d=JSON.parse(cr.value);if(d.length>0){setChekiList(d);nextId.current=Math.max(…d.map(c=>c.id))+1;return;}}
} catch {}
setChekiList(DEFAULT_DATA); nextId.current=DEFAULT_DATA.length+1;
})();
(async()=>{
try {
const pr=await window.storage.get(STORAGE_KEY_PROFILES);
if(pr?.value){const d=JSON.parse(pr.value);if(d.length>0){setProfiles(d);nextPid.current=d.length+1;return;}}
} catch {}
setProfiles(DEFAULT_PROFILES); nextPid.current=DEFAULT_PROFILES.length+1;
})();
},[]);

useEffect(()=>{ if(!loaded.current||chekiList.length===0)return; window.storage.set(STORAGE_KEY_CHEKI,JSON.stringify(chekiList)).catch(()=>{}); },[chekiList]);
useEffect(()=>{ if(!loaded.current)return; window.storage.set(STORAGE_KEY_PROFILES,JSON.stringify(profiles)).catch(()=>{}); },[profiles]);

const handleAdd=useCallback(item=>{setChekiList(p=>[…p,{…item,id:nextId.current++}]);},[]);
const handleDelete=useCallback(id=>{setChekiList(p=>p.filter(c=>c.id!==id));},[]);
const handleUpdate=useCallback(updated=>{setChekiList(p=>p.map(c=>c.id===updated.id?updated:c));setDetail(updated);},[]);

const handleSaveProfile=(form,existingId)=>{
if(existingId) setProfiles(p=>p.map(pr=>pr.id===existingId?{…form,id:existingId}:pr));
else setProfiles(p=>[…p,{…form,id:“p”+(nextPid.current++)}]);
};
const handleDeleteProfile=id=>setProfiles(p=>p.filter(pr=>pr.id!==id));

const handleExport=()=>{
const header=“日付,アイドル名,グループ名,イベント名,場所”;
const rows=chekiList.map(c=>[c.date,c.idol,c.group,c.event,c.place].map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(”,”));
const csv=”\uFEFF”+[header,…rows].join(”\n”);
const blob=new Blob([csv],{type:“text/csv;charset=utf-8;”});
const url=URL.createObjectURL(blob);
const a=document.createElement(“a”); a.href=url; a.download=“chekiLog.csv”; a.click(); URL.revokeObjectURL(url);
};

const detailProfile=detail?profiles.find(p=>p.idol===detail.idol&&p.group===detail.group):null;

const NAV=[{label:“登録”,icon:“＋”},{label:“カレンダー”,icon:“📅”},{label:“集計”,icon:“📊”},{label:“一覧”,icon:“🗂”},{label:“プロフィール”,icon:“⭐”}];

return <div style={{ minHeight:“100vh”, background:BG, fontFamily:”‘Hiragino Sans’,‘Noto Sans JP’,sans-serif”, maxWidth:480, margin:“0 auto”, position:“relative” }}>
<div style={{ padding:“16px 20px 12px”, background:BG, borderBottom:`1px solid ${BORDER}`, position:“sticky”, top:0, zIndex:10 }}>
<div style={{ fontSize:22,fontWeight:900,color:ACCENT,letterSpacing:-0.5 }}>チェキログ</div>
<div style={{ fontSize:11,color:MUTED }}>Total: {chekiList.length}枚 / {profiles.length}名</div>
</div>
<div style={{ paddingBottom:90, overflowY:“auto” }}>
{tab===0&&<RegisterTab chekiList={chekiList} onAdd={handleAdd}/>}
{tab===1&&<CalendarTab chekiList={chekiList} profiles={profiles} onDetail={setDetail}/>}
{tab===2&&<StatsTab chekiList={chekiList}/>}
{tab===3&&<ListTab chekiList={chekiList} profiles={profiles} onDetail={setDetail} onExport={handleExport}/>}
{tab===4&&<ProfileTab profiles={profiles} chekiList={chekiList} onSave={handleSaveProfile} onDelete={handleDeleteProfile}/>}
</div>
<div style={{ position:“fixed”, bottom:0, left:“50%”, transform:“translateX(-50%)”, width:“100%”, maxWidth:480, background:CARD, borderTop:`1px solid ${BORDER}`, display:“flex” }}>
{NAV.map((n,i)=>(
<button key={n.label} onClick={()=>setTab(i)} style={{ flex:1, padding:“8px 0 10px”, border:“none”, background:“transparent”, cursor:“pointer”, display:“flex”, flexDirection:“column”, alignItems:“center”, gap:1 }}>
<span style={{fontSize:16}}>{n.icon}</span>
<span style={{ fontSize:9,fontWeight:700,color:tab===i?ACCENT2:MUTED }}>{n.label}</span>
{tab===i&&<div style={{ width:16,height:2,background:ACCENT2,borderRadius:99,marginTop:2 }}/>}
</button>
))}
</div>
{detail&&<DetailModal cheki={detail} profile={detailProfile} chekiList={chekiList} onClose={()=>setDetail(null)} onDelete={id=>{handleDelete(id);setDetail(null);}} onUpdate={handleUpdate}/>}

  </div>;
}
