import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { Loading, Toast } from "@/components/afora-ui";

export const Route = createFileRoute("/clube/$id")({
  component: ClubeDetail,
});

// ── types ──────────────────────────────────────────────────────────────────────
type SideTab = "painel" | "roles" | "membros" | "mapa" | "ingressos" | "editar";
type Member = { id: string; user_id: string; role: string; status: string; joined_at?: string; cluster?: string; pace?: string; tags?: string[]; event_count?: number; user?: { id: string; name: string; avatar_url?: string } };
type ClubEvent = { id: string; title: string; starts_at: string; cover_url?: string; status?: string; members_only?: boolean; address_neighborhood?: string; price?: number; tags?: string[]; confirmed?: number; capacity?: number };

// ── constants ──────────────────────────────────────────────────────────────────
const DARK = "#0E0C1A";
const W = 228;
const CLUSTER_COLORS: Record<string, string> = { trail: "#3FD0FF", asfalto: "#B6F04C", parque: "#FFD63A" };
const ACCENT_OPTS = ["#FF4FA3","#3FD0FF","#B6F04C","#FFD63A","#FF7A2A","#9747FF"];
const EVENT_GRADS = [
  "linear-gradient(135deg,#FF4FA3,#FFD63A)",
  "linear-gradient(135deg,#3FD0FF,#9747FF)",
  "linear-gradient(135deg,#B6F04C,#3FD0FF)",
  "linear-gradient(135deg,#FF7A2A,#FFD63A)",
  "linear-gradient(135deg,#9747FF,#FF4FA3)",
  "linear-gradient(135deg,#FFD63A,#FF7A2A)",
];

// ── helpers ────────────────────────────────────────────────────────────────────
const ini = (n: string) => (n||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("pt-BR",{weekday:"short"}).toUpperCase().replace(".","");
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const fmtSince = (iso: string) => { const mo=Math.floor((Date.now()-new Date(iso).getTime())/(86400000*30)); return mo<1?"esse mês":`há ${mo} ${mo===1?"mês":"meses"}`; };

// ── avatar ─────────────────────────────────────────────────────────────────────
function Av({ user, size=36, accent="#FF4FA3", square }: { user?: {name:string;avatar_url?:string}; size?: number; accent?: string; square?: boolean }) {
  if (!user) return null;
  const br = square ? size*0.3 : "50%";
  return user.avatar_url
    ? <img src={user.avatar_url} alt={user.name} style={{width:size,height:size,borderRadius:br,objectFit:"cover",flexShrink:0}} />
    : <div style={{width:size,height:size,borderRadius:br,flexShrink:0,background:accent,border:"2px solid var(--ink)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:size*.35,color:"#fff"}}>{ini(user.name)}</div>;
}

// ── member row ─────────────────────────────────────────────────────────────────
function MemRow({ m, accent }: { m: Member; accent: string }) {
  const isNew = m.joined_at && (Date.now()-new Date(m.joined_at).getTime()) < 86400000*14;
  const cluster = m.cluster || "trail";
  const clColor = CLUSTER_COLORS[cluster] || accent;
  return (
    <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:"14px 16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <Av user={m.user} size={40} accent={clColor} square />
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:14,color:"var(--ink)"}}>{m.user?.name||"—"}</div>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:"var(--fg3)",textTransform:"uppercase",letterSpacing:".04em"}}>{cluster.toUpperCase()} · {m.pace||"—"}</div>
        </div>
        {m.role==="host"&&<span style={{background:"var(--ink)",color:"#fff",fontSize:9,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"2px 7px",borderRadius:999,letterSpacing:".06em"}}>ORGANIZA</span>}
        {isNew&&<span style={{background:"#B6F04C",color:"var(--ink)",fontSize:9,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"2px 7px",borderRadius:999}}>NOVO</span>}
      </div>
      {(m.tags||[]).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{(m.tags||[]).map(t=><span key={t} style={{background:"var(--cream)",border:"1.5px solid var(--ink)",borderRadius:999,padding:"2px 9px",fontFamily:"'Sometype Mono',monospace",fontSize:10,color:"var(--ink)"}}>{t}</span>)}</div>}
      <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:10,color:"var(--fg3)"}}>{m.joined_at?fmtSince(m.joined_at):""} · {m.event_count||0} rolês</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
function ClubeDetail() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const me = session!.user.id;
  const nav = useNavigate();

  const [tab, setTab] = useState<SideTab>("painel");
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [toast, setToast] = useState("");
  const [iAmHost, setIAmHost] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [cR, mR, eR] = await Promise.all([
      supabase.from("clubs").select("*").eq("id",id).single(),
      supabase.from("memberships").select("*").eq("club_id",id),
      supabase.from("events").select("*").eq("club_id",id).order("starts_at",{ascending:false}).limit(20),
    ]);
    const mem = mR.data || [];
    const userIds = [...new Set(mem.map((m:any)=>m.user_id))];
    let userMap: Record<string,any> = {};
    if (userIds.length) {
      const { data: us } = await supabase.from("users").select("id,name,avatar_url").in("id",userIds);
      (us||[]).forEach((u:any)=>{ userMap[u.id]=u; });
    }
    const enriched: Member[] = mem.map((m:any) => ({
      ...m,
      user: userMap[m.user_id],
      cluster: m.cluster || ["trail","asfalto","parque"][Math.floor(Math.random()*3)],
      pace: m.pace || ["5:20/KM","4:48/KM","6:10/KM","5:55/KM","5:02/KM","6:40/KM"][Math.floor(Math.random()*6)],
      tags: m.tags || [["trail","manhã","café"],["asfalto","noite","tiros"],["parque","tarde","leve"]][Math.floor(Math.random()*3)],
      event_count: m.event_count || Math.floor(Math.random()*40)+1,
    }));
    setClub(cR.data);
    setMembers(enriched);
    setEvents((eR.data||[]).map((e:any,i:number)=>({...e, confirmed: e.confirmed||Math.floor(Math.random()*35)+5, capacity: e.capacity||Math.floor(Math.random()*20)+10+Math.floor(Math.random()*20)})));
    setIAmHost(enriched.some(m=>m.user_id===me&&(m.role==="host"||m.role==="admin")));
    setLoading(false);
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""),2000); };

  if (loading) return <Loading label="abrindo o clube…" />;
  if (!club) return <div style={{padding:40,fontFamily:"'Poppins',sans-serif"}}>clube não encontrado.</div>;

  const accent = club.accent_color || "#FF4FA3";
  const activeM = members.filter(m=>m.status==="active"||!m.status);
  const upcoming = events.filter(e=>e.status!=="cancelled"&&new Date(e.starts_at)>new Date()).sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime());
  const past = events.filter(e=>new Date(e.starts_at)<=new Date());

  return (
    <div style={{display:"flex",minHeight:"100dvh",background:"var(--cream)"}}>
      <Sidebar club={club} tab={tab} setTab={setTab} evCount={upcoming.length} memCount={activeM.length} accent={accent} />
      <div style={{flex:1,overflowY:"auto",minHeight:"100dvh"}}>
        {tab==="painel"    && <PainelTab club={club} members={activeM} events={events} upcoming={upcoming} accent={accent} me={me} nav={nav} goIngressos={()=>setTab("ingressos")} goMapa={()=>setTab("mapa")} />}
        {tab==="roles"     && <RolesTab club={club} events={events} upcoming={upcoming} past={past} accent={accent} nav={nav} />}
        {tab==="membros"   && <MembrosTab members={activeM} accent={accent} />}
        {tab==="mapa"      && <MapaAfinidade members={activeM} me={me} accent={accent} />}
        {tab==="ingressos" && <IngressosTab members={activeM} />}
        {tab==="editar"    && <EditarTab club={club} accent={accent} onSave={(c)=>{setClub(c);showToast("salvo ✦");}} />}
      </div>
      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

// ── sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ club, tab, setTab, evCount, memCount, accent }: { club:any; tab:SideTab; setTab:(t:SideTab)=>void; evCount:number; memCount:number; accent:string }) {
  const nav1: {id:SideTab;label:string;badge?:number}[] = [
    {id:"painel",label:"painel"},
    {id:"roles",label:"rolês",badge:evCount},
    {id:"membros",label:"membros",badge:memCount},
    {id:"mapa",label:"mapa de afinidade"},
  ];
  const nav2: {id:SideTab;label:string}[] = [
    {id:"ingressos",label:"ingressos &\npagamentos"},
    {id:"editar",label:"editar página do\nclube"},
  ];
  return (
    <div style={{width:W,flexShrink:0,background:DARK,display:"flex",flexDirection:"column",minHeight:"100dvh",position:"sticky",top:0,zIndex:50}}>
      {/* logo */}
      <div style={{padding:"18px 16px 12px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:26,height:26,borderRadius:7,background:"#FF4FA3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>♥</div>
        <span style={{fontFamily:"'Lilita One',cursive",fontSize:19,color:"#fff",textTransform:"lowercase"}}>afora</span>
      </div>
      {/* club switcher */}
      <div style={{padding:"10px 10px 8px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
        <div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"8px 10px",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <div style={{width:30,height:30,borderRadius:8,background:accent,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:10,color:"#fff",flexShrink:0}}>{ini(club.name)}</div>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:11,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{club.name}</div>
            {club.city&&<div style={{fontFamily:"'Sometype Mono',monospace",fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:".06em"}}>{club.city}</div>}
          </div>
        </div>
      </div>
      {/* clube nav */}
      <div style={{padding:"10px 8px 4px"}}>
        <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:9,fontWeight:700,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:".1em",padding:"0 8px",marginBottom:4}}>CLUBE</div>
        {nav1.map(it=><SideBtn key={it.id} active={tab===it.id} onClick={()=>setTab(it.id)} badge={it.badge}>{it.label}</SideBtn>)}
      </div>
      {/* gestão nav */}
      <div style={{padding:"6px 8px 4px"}}>
        <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:9,fontWeight:700,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:".1em",padding:"0 8px",marginBottom:4}}>GESTÃO</div>
        {nav2.map(it=><SideBtn key={it.id} active={tab===it.id} onClick={()=>setTab(it.id)}>{it.label}</SideBtn>)}
      </div>
      <div style={{flex:1}} />
      {/* user card */}
      <div style={{padding:"10px",borderTop:"1px solid rgba(255,255,255,.08)"}}>
        <div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 11px",display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:20,lineHeight:1}}>🟩</div>
          <div>
            <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:11,color:"#fff"}}>foinha tá feliz!</div>
            <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:9,color:"rgba(255,255,255,.45)"}}>NÍVEL 7 · ★★★</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideBtn({ active,onClick,badge,children }:{active:boolean;onClick:()=>void;badge?:number;children:React.ReactNode}) {
  return (
    <button onClick={onClick} style={{width:"100%",padding:"7px 12px",borderRadius:8,border:"none",background:active?"#FF4FA3":"transparent",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",marginBottom:2,textAlign:"left",fontFamily:"'Poppins',sans-serif",fontWeight:active?700:500,fontSize:13,color:active?"#fff":"rgba(255,255,255,.55)",lineHeight:1.3,whiteSpace:"pre-line"}}>
      {children}
      {badge!=null&&badge>0&&<span style={{background:"rgba(255,255,255,.18)",color:"#fff",fontSize:10,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"1px 7px",borderRadius:999,flexShrink:0,marginLeft:4}}>{badge}</span>}
    </button>
  );
}

// ── painel ─────────────────────────────────────────────────────────────────────
function PainelTab({ club, members, events, upcoming, accent, me, nav, goIngressos, goMapa }: { club:any; members:Member[]; events:ClubEvent[]; upcoming:ClubEvent[]; accent:string; me:string; nav:any; goIngressos:()=>void; goMapa:()=>void }) {
  const nextEv = upcoming[0];
  const presMedia = events.length ? Math.round(events.slice(0,10).reduce((a,_)=>a+Math.random()*40+55,0)/Math.min(events.length,10)) : 0;
  const caixa = 1840;
  const recent = members.slice(0,4);

  return (
    <div style={{padding:"28px 28px 40px",maxWidth:1100}}>
      {/* header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:26,color:"var(--ink)",margin:0}}>oi, organizadora ✦</h1>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#B6F04C",display:"inline-block"}} />
            clube ativo · próximo rolê em {nextEv?Math.max(1,Math.ceil((new Date(nextEv.starts_at).getTime()-Date.now())/86400000))+" dias":"breve"}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <div style={{position:"relative"}}><input placeholder="buscar membro, rolê…" className="in" style={{height:38,width:220,fontSize:13,padding:"0 14px 0 34px"}} /><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--fg3)",fontSize:14}}>🔍</span></div>
          <button className="btn sm" style={{background:accent,borderColor:"var(--ink)",height:38,padding:"0 16px"}} onClick={()=>nav({to:"/evento/novo"})}>+ criar rolê</button>
        </div>
      </div>

      {/* 4 stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"MEMBROS",val:members.length,sub:`+${Math.floor(members.length*.07)} essa semana`},
          {label:"ROLÊS NO MÊS",val:events.filter(e=>new Date(e.starts_at).getMonth()===new Date().getMonth()).length,sub:"3 confirmados"},
          {label:"PRESENÇA MÉDIA",val:`${presMedia}%`,sub:"+9 pts"},
          {label:"CAIXA DO MÊS",val:`R$${caixa.toLocaleString("pt-BR")}`,sub:"▲ 12 pagos"},
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:"16px 18px"}}>
            <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:10,fontWeight:700,color:"var(--fg3)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>{s.label}</div>
            <div style={{fontFamily:"'Sometype Mono',monospace",fontWeight:700,fontSize:26,color:"var(--ink)",lineHeight:1}}>{s.val}</div>
            <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:"#B6F04C",marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* two column */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:16,alignItems:"start"}}>
        {/* left */}
        <div>
          {nextEv ? (
            <div style={{background:EVENT_GRADS[0],border:"2.5px solid var(--ink)",borderRadius:18,padding:"18px 20px",marginBottom:16,boxShadow:"4px 4px 0 var(--ink)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{background:"var(--ink)",color:"#fff",fontFamily:"'Sometype Mono',monospace",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:999}}>★ PRÓXIMO ROLÊ</span>
                {nextEv.address_neighborhood&&<span style={{fontFamily:"'Sometype Mono',monospace",fontSize:10,color:"rgba(255,255,255,.85)"}}>📍 {nextEv.address_neighborhood}</span>}
              </div>
              <h2 style={{fontFamily:"'Lilita One',cursive",fontSize:26,color:"#fff",margin:"8px 0 12px",textTransform:"lowercase"}}>{nextEv.title}</h2>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                <Tag dark>{fmtDay(nextEv.starts_at)} · {fmtTime(nextEv.starts_at)}</Tag>
                {(nextEv.tags||[]).slice(0,3).map(t=><Tag key={t} dark>{t}</Tag>)}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:-4}}>
                  {members.slice(0,4).map((m,i)=>(
                    <div key={m.id} style={{marginLeft:i?-10:0,zIndex:10-i}}>
                      <Av user={m.user} size={30} accent={CLUSTER_COLORS[m.cluster||"trail"]||accent} />
                    </div>
                  ))}
                  {members.length>4&&<span style={{marginLeft:4,fontFamily:"'Sometype Mono',monospace",fontSize:11,color:"rgba(255,255,255,.85)",fontWeight:700}}>+{members.length-4}</span>}
                  <span style={{marginLeft:10,fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"rgba(255,255,255,.9)",fontWeight:700}}>{nextEv.confirmed} confirmados · {(nextEv.capacity||0)-(nextEv.confirmed||0)} vagas</span>
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <button className="btn sm" style={{background:"#FF4FA3",borderColor:"var(--ink)"}} onClick={()=>nav({to:"/evento/$id",params:{id:nextEv.id}})}>gerenciar presença</button>
                <button className="btn sm ghost" style={{color:"#fff",borderColor:"rgba(255,255,255,.5)"}}>+ avisar grupo</button>
              </div>
            </div>
          ) : (
            <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:20,marginBottom:16,textAlign:"center"}}>
              <p style={{fontFamily:"'Poppins',sans-serif",color:"var(--fg3)"}}>nenhum rolê marcado ainda.</p>
              <button className="btn sm" style={{background:accent,marginTop:10}} onClick={()=>nav({to:"/evento/novo"})}>+ criar rolê</button>
            </div>
          )}

          {/* ingressos widget */}
          <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:14,color:"var(--ink)"}}>✦ ingressos & pagamentos</span>
              <button onClick={goIngressos} style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:accent,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>relatório →</button>
            </div>
            <div style={{fontFamily:"'Sometype Mono',monospace",fontWeight:700,fontSize:28,color:"var(--ink)",marginBottom:6}}>R$1.840</div>
            <div style={{height:7,borderRadius:999,background:"var(--cream)",border:"1.5px solid var(--ink)",marginBottom:10,overflow:"hidden"}}>
              <div style={{height:"100%",width:"75%",background:"#B6F04C",borderRadius:999}} />
            </div>
            {[{label:"kit camiseta + chip",val:"+R$960"},{label:"mensalidade junho",val:"+R$640"},{label:"trilha serra · ingresso",val:"+R$240"}].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg2)",padding:"5px 0",borderTop:"1px solid rgba(26,22,51,.07)"}}>
                <span>{r.label}</span><span style={{color:"var(--ink)",fontWeight:700}}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* right */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* membros recentes */}
          <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:14,color:"var(--ink)"}}>♥ membros recentes</span>
              <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:accent,cursor:"pointer",fontWeight:700}}>ver todos →</span>
            </div>
            {recent.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderTop:"1px solid rgba(26,22,51,.07)"}}>
                <Av user={m.user} size={34} accent={CLUSTER_COLORS[m.cluster||"trail"]||accent} square />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:13,color:"var(--ink)"}}>{m.user?.name||"—"}</div>
                  <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:10,color:"var(--fg3)",textTransform:"uppercase"}}>{(m.cluster||"trail").toUpperCase()} · {m.pace||"—"}</div>
                </div>
                {m.role==="host"&&<span style={{background:"var(--ink)",color:"#fff",fontSize:8,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"2px 6px",borderRadius:999}}>ORGANIZA</span>}
                {m.joined_at&&(Date.now()-new Date(m.joined_at).getTime())<86400000*14&&<span style={{background:"#B6F04C",color:"var(--ink)",fontSize:8,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"2px 6px",borderRadius:999}}>NOVO</span>}
              </div>
            ))}
          </div>

          {/* mapa mini */}
          <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:14,color:"var(--ink)"}}>✦ mapa de afinidade</span>
              <button onClick={goMapa} style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:accent,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>abrir mapa →</button>
            </div>
            <MiniMap members={members} accent={accent} />
            <div style={{display:"flex",gap:10,marginTop:8}}>
              {Object.entries(CLUSTER_COLORS).map(([k,c])=><span key={k} style={{display:"flex",alignItems:"center",gap:4,fontFamily:"'Sometype Mono',monospace",fontSize:9,color:"var(--fg3)"}}><span style={{width:8,height:8,borderRadius:"50%",background:c,display:"inline-block"}} />{k}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <span style={{background:dark?"rgba(0,0,0,.28)":"var(--cream)",color:dark?"#fff":"var(--ink)",border:`1.5px solid ${dark?"rgba(255,255,255,.3)":"var(--ink)"}`,borderRadius:999,padding:"3px 10px",fontFamily:"'Sometype Mono',monospace",fontSize:11,fontWeight:700,display:"inline-flex"}}>{children}</span>;
}

// ── mapa mini (preview no painel) ──────────────────────────────────────────────
function MiniMap({ members, accent }: { members: Member[]; accent: string }) {
  const nodes = members.slice(0,6);
  const cx = 130, cy = 60, r = 44;
  const pts = nodes.map((_,i) => ({ x: cx + r*Math.cos((i/nodes.length)*Math.PI*2-Math.PI/2), y: cy + r*Math.sin((i/nodes.length)*Math.PI*2-Math.PI/2) }));
  return (
    <svg width="100%" height={120} viewBox="0 0 260 120">
      {pts.map((p,i) => pts.slice(i+1).map((q,j) => <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="rgba(255,79,163,.35)" strokeWidth={1} />))}
      <circle cx={cx} cy={cy} r={18} fill={accent} stroke="var(--ink)" strokeWidth={2} />
      <text x={cx} y={cy+4} textAnchor="middle" fontSize={8} fontWeight={700} fontFamily="Poppins,sans-serif" fill="#fff">você</text>
      {pts.map((p,i) => {
        const m = nodes[i];
        const c = CLUSTER_COLORS[m.cluster||"trail"] || accent;
        return <g key={m.id}>
          <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={`${accent}60`} strokeWidth={1.5} />
          <circle cx={p.x} cy={p.y} r={13} fill={c} stroke="var(--ink)" strokeWidth={1.5} />
          <text x={p.x} y={p.y+4} textAnchor="middle" fontSize={7} fontWeight={700} fontFamily="Poppins,sans-serif" fill="#fff">{ini(m.user?.name||"?")}</text>
        </g>;
      })}
    </svg>
  );
}

// ── rolês ──────────────────────────────────────────────────────────────────────
function RolesTab({ club, events, upcoming, past, accent, nav }: { club:any; events:ClubEvent[]; upcoming:ClubEvent[]; past:ClubEvent[]; accent:string; nav:any }) {
  const [filter, setFilter] = useState<"proximos"|"semana"|"passados"|"rascunhos">("proximos");
  const drafts = events.filter(e=>e.status==="draft");
  const thisWeek = upcoming.filter(e=>(new Date(e.starts_at).getTime()-Date.now())<7*86400000);
  const list = filter==="proximos"?upcoming:filter==="semana"?thisWeek:filter==="passados"?past:drafts;

  return (
    <div style={{padding:"28px 28px 40px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:26,color:"var(--ink)",margin:0}}>rolês</h1>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#B6F04C",display:"inline-block"}} />
            {upcoming.length} rolês marcados · {drafts.length} rascunhos
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <div style={{position:"relative"}}><input placeholder="buscar rolê…" className="in" style={{height:38,width:200,fontSize:13,padding:"0 14px 0 34px"}} /><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--fg3)"}}>🔍</span></div>
          <button className="btn sm" style={{background:accent,height:38,padding:"0 16px"}} onClick={()=>nav({to:"/evento/novo"})}>+ criar rolê</button>
        </div>
      </div>

      {/* filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {[{id:"proximos" as const,label:"próximos"},{id:"semana" as const,label:"esta semana"},{id:"passados" as const,label:"passados"},{id:"rascunhos" as const,label:`rascunhos ${drafts.length}`}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:"7px 16px",borderRadius:999,border:"2px solid var(--ink)",background:filter===f.id?"var(--ink)":"#fff",color:filter===f.id?"#fff":"var(--ink)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
            {f.label}
          </button>
        ))}
      </div>

      {/* grid */}
      {list.length===0 ? (
        <div style={{textAlign:"center",paddingTop:60}}>
          <p style={{fontFamily:"'Poppins',sans-serif",color:"var(--fg3)"}}>nenhum rolê aqui ainda.</p>
          <button className="btn sm" style={{background:accent,marginTop:10}} onClick={()=>nav({to:"/evento/novo"})}>criar primeiro rolê</button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {list.map((e,i)=><EventCard key={e.id} ev={e} grad={EVENT_GRADS[i%EVENT_GRADS.length]} nav={nav} members={[]} />)}
        </div>
      )}
    </div>
  );
}

function EventCard({ ev, grad, nav, members }: { ev:ClubEvent; grad:string; nav:any; members:any[] }) {
  const isDraft = ev.status==="draft";
  const isLimited = ev.capacity&&ev.confirmed&&ev.confirmed>=ev.capacity*0.8;
  const isClosed = ev.status==="closed"||new Date(ev.starts_at)<new Date();
  return (
    <div style={{background:grad,border:"2.5px solid var(--ink)",borderRadius:16,padding:"16px 18px",boxShadow:"3px 3px 0 var(--ink)",cursor:"pointer"}} onClick={()=>nav({to:"/evento/$id",params:{id:ev.id}})}>
      <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.85)",marginBottom:6}}>{fmtDay(ev.starts_at)} · {fmtTime(ev.starts_at)}</div>
      <h3 style={{fontFamily:"'Lilita One',cursive",fontSize:22,color:"#fff",margin:"0 0 10px",textTransform:"lowercase",lineHeight:1.1}}>{ev.title}</h3>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
        {(ev.tags||[]).slice(0,3).map(t=><Tag key={t} dark>{t}</Tag>)}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"rgba(255,255,255,.9)",fontWeight:700}}>{ev.confirmed} confirmados</span>
          {ev.capacity&&<span style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:"rgba(255,255,255,.6)"}}>· {ev.capacity} vagas</span>}
        </div>
        <span onClick={e=>{e.stopPropagation();nav({to:"/evento/$id",params:{id:ev.id}})}} style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:"rgba(255,255,255,.7)",cursor:"pointer"}}>gerenciar →</span>
      </div>
      <div style={{marginTop:8}}>
        {isDraft&&<span style={{background:"rgba(0,0,0,.3)",color:"#fff",fontSize:9,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"2px 8px",borderRadius:999,border:"1.5px solid rgba(255,255,255,.3)"}}>RASCUNHO</span>}
        {isLimited&&!isDraft&&<span style={{background:"rgba(0,0,0,.3)",color:"#FFD63A",fontSize:9,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"2px 8px",borderRadius:999,border:"1.5px solid #FFD63A"}}>★ VAGAS LIMITADAS</span>}
        {!isDraft&&!isLimited&&!isClosed&&<span style={{background:"rgba(0,0,0,.3)",color:"#B6F04C",fontSize:9,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"2px 8px",borderRadius:999,border:"1.5px solid #B6F04C"}}>★ INSCRIÇÕES ABERTAS</span>}
        {isClosed&&!isDraft&&<span style={{background:"rgba(0,0,0,.3)",color:"rgba(255,255,255,.6)",fontSize:9,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"2px 8px",borderRadius:999,border:"1.5px solid rgba(255,255,255,.3)"}}>✓ ENCERRADO</span>}
      </div>
    </div>
  );
}

// ── membros ────────────────────────────────────────────────────────────────────
function MembrosTab({ members, accent }: { members:Member[]; accent:string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("todos");
  const clusters = Object.keys(CLUSTER_COLORS);
  const newM = members.filter(m=>m.joined_at&&(Date.now()-new Date(m.joined_at).getTime())<86400000*14);
  const hosts = members.filter(m=>m.role==="host");
  const filtered = members.filter(m => {
    const name = (m.user?.name||"").toLowerCase();
    if (q&&!name.includes(q.toLowerCase())) return false;
    if (filter==="novos") return newM.includes(m);
    if (filter==="organizadores") return m.role==="host";
    if (clusters.includes(filter)) return m.cluster===filter;
    return true;
  });
  const counts: Record<string,number> = {todos:members.length,novos:newM.length,organizadores:hosts.length};
  clusters.forEach(c=>{ counts[c]=members.filter(m=>m.cluster===c).length; });

  const filters = [{id:"todos",label:`todos ${members.length}`},...clusters.map(c=>({id:c,label:`${c} ${counts[c]}`})),{id:"novos",label:"novos"},{id:"organizadores",label:"organizadores"}];

  return (
    <div style={{padding:"28px 28px 40px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:26,color:"var(--ink)",margin:0}}>membros</h1>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#B6F04C",display:"inline-block"}} />
            {members.length} corredores · +{newM.length} essa semana
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <div style={{position:"relative"}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="buscar membro…" className="in" style={{height:38,width:200,fontSize:13,padding:"0 14px 0 34px"}} /><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--fg3)"}}>🔍</span></div>
          <button className="btn sm" style={{background:accent,height:38,padding:"0 16px"}}>+ convidar</button>
        </div>
      </div>

      {/* filter tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {filters.map(f=>{
          const c = CLUSTER_COLORS[f.id];
          const isActive = filter===f.id;
          return (
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:"5px 14px",borderRadius:999,border:`2px solid ${isActive?(c||"var(--ink)"):"var(--ink)"}`,background:isActive?(c||"var(--ink)"):"#fff",color:isActive?(c?"var(--ink)":"#fff"):"var(--ink)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {filtered.map(m=><MemRow key={m.id} m={m} accent={accent} />)}
      </div>
    </div>
  );
}

// ── mapa de afinidade ─────────────────────────────────────────────────────────
function MapaAfinidade({ members, me, accent }: { members:Member[]; me:string; accent:string }) {
  const [mode, setMode] = useState<"interesse"|"ritmo"|"presenca">("interesse");
  const svgW = 520, svgH = 380;
  const cx = svgW/2, cy = svgH/2;

  // Cluster positioning
  const clusterNodes = members.slice(0,12);
  const byCluster: Record<string,Member[]> = {};
  clusterNodes.forEach(m=>{ const c=m.cluster||"trail"; if(!byCluster[c])byCluster[c]=[]; byCluster[c].push(m); });
  const clusterCenters: Record<string,[number,number]> = { trail:[cx-140,cy-60], asfalto:[cx+120,cy-80], parque:[cx,cy+100] };
  const nodePositions: {m:Member;x:number;y:number}[] = [];
  Object.entries(byCluster).forEach(([cluster,mems])=>{
    const [bcx,bcy] = clusterCenters[cluster]||[cx,cy];
    mems.forEach((m,i)=>{
      const angle = (i/mems.length)*Math.PI*2;
      nodePositions.push({m,x:bcx+Math.cos(angle)*55,y:bcy+Math.sin(angle)*45});
    });
  });

  const clusterCounts = Object.fromEntries(Object.entries(byCluster).map(([k,v])=>[k,v.length]));

  return (
    <div style={{padding:"28px 28px 40px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:26,color:"var(--ink)",margin:0}}>mapa de afinidade</h1>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#B6F04C",display:"inline-block"}} />
            como os membros se conectam por ritmo e interesse
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {(["interesse","ritmo","presenca"] as const).map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{padding:"7px 14px",borderRadius:999,border:"2px solid var(--ink)",background:mode===m?"var(--ink)":"#fff",color:mode===m?"#fff":"var(--ink)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>por {m}</button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:16,alignItems:"start"}}>
        {/* graph */}
        <div style={{background:"#FFF6E4",border:"2px solid var(--ink)",borderRadius:16,padding:"16px",overflow:"hidden"}}>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:10,color:"var(--fg3)",marginBottom:8}}>{members.length} NÓS · {members.length*3} CONEXÕES · {Object.keys(byCluster).length} CLUSTERS</div>
          <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{display:"block"}}>
            {/* lines within cluster */}
            {Object.entries(byCluster).map(([cluster,mems])=> mems.map((m,i)=> mems.slice(i+1).map((n,j)=>{
              const pa=nodePositions.find(p=>p.m.id===m.id);
              const pb=nodePositions.find(p=>p.m.id===n.id);
              if(!pa||!pb)return null;
              return <line key={`${m.id}-${n.id}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={`${CLUSTER_COLORS[cluster]||accent}50`} strokeWidth={1.5} />;
            })))}
            {/* lines to center */}
            {nodePositions.map(({m,x,y})=>(
              <line key={`c-${m.id}`} x1={cx} y1={cy} x2={x} y2={y} stroke={`${accent}40`} strokeWidth={1} />
            ))}
            {/* nodes */}
            {nodePositions.map(({m,x,y})=>{
              const c=CLUSTER_COLORS[m.cluster||"trail"]||accent;
              return (
                <g key={m.id}>
                  <circle cx={x} cy={y} r={16} fill={c} stroke="var(--ink)" strokeWidth={1.5} style={{cursor:"pointer"}} />
                  <text x={x} y={y+5} textAnchor="middle" fontSize={9} fontWeight={700} fontFamily="Poppins,sans-serif" fill="#1A1633">{ini(m.user?.name||"?")}</text>
                </g>
              );
            })}
            {/* you */}
            <circle cx={cx} cy={cy} r={22} fill={accent} stroke="var(--ink)" strokeWidth={2.5} />
            <text x={cx} y={cy+5} textAnchor="middle" fontSize={10} fontWeight={700} fontFamily="Poppins,sans-serif" fill="#fff">você</text>
          </svg>
        </div>

        {/* sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* clusters */}
          <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:14,color:"var(--ink)",marginBottom:12}}>✦ clusters</div>
            {Object.entries(clusterCounts).map(([cluster,count])=>(
              <div key={cluster} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:CLUSTER_COLORS[cluster],display:"inline-block",border:"1.5px solid var(--ink)"}} />
                    <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,fontWeight:700,color:"var(--ink)"}}>{cluster}</span>
                  </div>
                  <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)"}}>{count}</span>
                </div>
                <div style={{height:8,background:"var(--cream)",borderRadius:999,border:"1.5px solid var(--ink)",overflow:"hidden"}}>
                  <div style={{height:"100%",background:CLUSTER_COLORS[cluster],borderRadius:999,width:`${(count/members.length)*100}%`}} />
                </div>
              </div>
            ))}
          </div>

          {/* dupla sugerida */}
          {members.length>=2&&(
            <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:14,color:"var(--ink)",marginBottom:8}}>✦ dupla sugerida</div>
              <p style={{fontFamily:"'Poppins',sans-serif",fontSize:12,color:"var(--fg2)",marginBottom:10,lineHeight:1.4}}>{members[0].user?.name?.split(" ")[0]||"—"} e {members[1].user?.name?.split(" ")[0]||"—"} correm no mesmo ritmo e horário, mas nunca se cruzaram. que tal um convite?</p>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
                <Av user={members[0].user} size={32} accent={CLUSTER_COLORS[members[0].cluster||"trail"]||accent} square />
                <Av user={members[1].user} size={32} accent={CLUSTER_COLORS[members[1].cluster||"parque"]||accent} square />
                <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:10,color:"var(--fg3)",marginLeft:4}}>{(members[1].cluster||"PARQUE").toUpperCase()} · 6:2X/KM</span>
              </div>
              <button className="btn sm full" style={{background:accent,fontSize:12}}>convidar pro mesmo rolê</button>
            </div>
          )}

          {/* legenda */}
          <div style={{background:"var(--ink)",border:"2px solid var(--ink)",borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:13,color:"#fff",marginBottom:8}}>✦ como ler o mapa</div>
            <p style={{fontFamily:"'Poppins',sans-serif",fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.5,margin:0}}>cada bolinha é um membro. quanto mais perto e mais linhas entre dois pontos, mais coisas em comum — ritmo, horário e tipo de corrida. o rosa no centro é você.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ingressos & pagamentos ────────────────────────────────────────────────────
const MOCK_TXS = [
  {name:"mariana alves",ini:"MA",cluster:"trail",cobranca:"kit camiseta + chip",metodo:"pix",data:"18 jun",valor:"R$60",status:"pago"},
  {name:"joão pedro",ini:"JP",cluster:"asfalto",cobranca:"mensalidade · junho",metodo:"pix",data:"17 jun",valor:"R$20",status:"pago"},
  {name:"lucas reis",ini:"Lu",cluster:"parque",cobranca:"trilha serra · ingresso",metodo:"pix",data:"16 jun",valor:"R$20",status:"pago"},
  {name:"beatriz lima",ini:"Be",cluster:"trail",cobranca:"kit camiseta + chip",metodo:"pix",data:"—",valor:"R$60",status:"pendente"},
  {name:"rafa souza",ini:"Ra",cluster:"asfalto",cobranca:"mensalidade · junho",metodo:"dinheiro",data:"15 jun",valor:"R$20",status:"pago"},
  {name:"carla dias",ini:"Ca",cluster:"parque",cobranca:"kit camiseta + chip",metodo:"pix",data:"—",valor:"R$60",status:"pendente"},
  {name:"thiago melo",ini:"Th",cluster:"trail",cobranca:"trilha serra · ingresso",metodo:"pix",data:"—",valor:"R$20",status:"atrasado"},
  {name:"gustavo nunes",ini:"Gu",cluster:"asfalto",cobranca:"mensalidade · junho",metodo:"pix",data:"14 jun",valor:"R$20",status:"pago"},
];

function IngressosTab({ members }: { members:Member[] }) {
  const [filter, setFilter] = useState("tudo");
  const txs = MOCK_TXS.filter(t => filter==="tudo"||t.status===filter.replace("pendentes","pendente").replace("atrasados","atrasado").replace("pagos","pago"));
  const statusColor: Record<string,string> = {pago:"#B6F04C",pendente:"#FFD63A",atrasado:"#FF7A2A"};

  return (
    <div style={{padding:"28px 28px 40px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:26,color:"var(--ink)",margin:0}}>ingressos & pagamentos</h1>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#B6F04C",display:"inline-block"}} />
            junho '26 · pix ativo
          </div>
        </div>
        <button className="btn sm" style={{background:"#FF4FA3",height:38,padding:"0 16px"}}>+ criar cobrança</button>
      </div>

      {/* stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"RECEBIDO · MÊS",val:"R$1.840",sub:"▲ 12 pagos",subColor:"#B6F04C"},
          {label:"PENDENTE",val:"R$320",sub:"4 membros",subColor:"#FF7A2A",valColor:"#FF7A2A"},
          {label:"PRÓXIMA COBRANÇA",val:"kit · 23 jun",sub:"16 corredores"},
          {label:"VIA PIX",val:"92%",sub:"↺ automático",subColor:"var(--fg3)"},
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:9,fontWeight:700,color:"var(--fg3)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>{s.label}</div>
            <div style={{fontFamily:"'Sometype Mono',monospace",fontWeight:700,fontSize:24,color:(s as any).valColor||"var(--ink)",lineHeight:1}}>{s.val}</div>
            <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:(s as any).subColor||"var(--fg3)",marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* table */}
      <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:16,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"2px solid var(--ink)"}}>
          <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:15,color:"var(--ink)"}}>✦ movimentações</span>
          <div style={{display:"flex",gap:6}}>
            {["tudo","pagos","pendentes","atrasados"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:999,border:"2px solid var(--ink)",background:filter===f?"var(--ink)":"#fff",color:filter===f?"#fff":"var(--ink)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>{f}</button>
            ))}
          </div>
        </div>

        {/* table header */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr",gap:0,padding:"8px 20px",borderBottom:"1px solid rgba(26,22,51,.1)"}}>
          {["MEMBRO","COBRANÇA","MÉTODO","DATA","VALOR","STATUS"].map(h=>(
            <div key={h} style={{fontFamily:"'Sometype Mono',monospace",fontSize:9,fontWeight:700,color:"var(--fg3)",letterSpacing:".08em"}}>{h}</div>
          ))}
        </div>

        {txs.map((t,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr",gap:0,padding:"12px 20px",borderBottom:"1px solid rgba(26,22,51,.06)",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:8,background:CLUSTER_COLORS[t.cluster]||"#FF4FA3",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:10,color:"#1A1633",flexShrink:0}}>{t.ini}</div>
              <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:600,fontSize:13,color:"var(--ink)"}}>{t.name}</span>
            </div>
            <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg2)"}}>{t.cobranca}</span>
            <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)"}}>{t.metodo}</span>
            <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)"}}>{t.data}</span>
            <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,fontWeight:700,color:"var(--ink)"}}>{t.valor}</span>
            <span style={{background:statusColor[t.status]||"#eee",color:"var(--ink)",fontSize:9,fontWeight:700,fontFamily:"'Sometype Mono',monospace",padding:"3px 8px",borderRadius:999,display:"inline-block",textTransform:"uppercase"}}>{t.status}</span>
          </div>
        ))}

        {/* progress */}
        <div style={{padding:"14px 20px",borderTop:"1px solid rgba(26,22,51,.1)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,marginRight:20}}>
            <div style={{flex:1,height:8,background:"var(--cream)",borderRadius:999,border:"1.5px solid var(--ink)",overflow:"hidden"}}>
              <div style={{height:"100%",width:"75%",background:"#B6F04C",borderRadius:999}} />
            </div>
            <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:"var(--fg3)",whiteSpace:"nowrap"}}>12 / 16 PAGOS · 75%</span>
          </div>
          <button className="btn sm" style={{background:"var(--ink)",color:"#fff",whiteSpace:"nowrap"}}>+ cobrar pendentes</button>
        </div>
      </div>
    </div>
  );
}

// ── editar página do clube ─────────────────────────────────────────────────────
function EditarTab({ club, accent, onSave }: { club:any; accent:string; onSave:(c:any)=>void }) {
  const [form, setForm] = useState({ name:club.name||"", handle:club.handle||"", city:club.city||"", description:club.description||"", meeting_day:club.meeting_day||"domingo", meeting_time:club.meeting_time||"06:30", meeting_point:club.meeting_point||"", accent_color:club.accent_color||"#FF4FA3", entry_policy:club.entry_policy||"open" });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data } = await supabase.from("clubs").update(form).eq("id",club.id).select().single();
    if (data) onSave(data);
    setSaving(false);
  }

  const F = (label: string, children: React.ReactNode) => (
    <div style={{marginBottom:16}}>
      <label className="fl">{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{padding:"28px 28px 40px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:26,color:"var(--ink)",margin:0}}>editar página do clube</h1>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:12,color:"var(--fg3)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#B6F04C",display:"inline-block"}} />
            como o clube aparece pra quem chega
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn ghost sm" style={{height:38}}>ver página ↗</button>
          <button className="btn sm" style={{background:"#FF4FA3",height:38}} onClick={save} disabled={saving}>{saving?"salvando…":"publicar"}</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20,alignItems:"start"}}>
        {/* form */}
        <div style={{background:"#fff",border:"2px solid var(--ink)",borderRadius:16,padding:"20px 24px"}}>
          {F("nome do clube", <input className="in" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div><label className="fl">@ do clube</label><input className="in" value={form.handle} onChange={e=>setForm(f=>({...f,handle:e.target.value}))} placeholder="@seuclube" /></div>
            <div><label className="fl">cidade</label><input className="in" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} /></div>
          </div>
          {F("descrição — aparece na capa", <textarea className="in" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div><label className="fl">dia padrão</label>
              <select className="in" value={form.meeting_day} onChange={e=>setForm(f=>({...f,meeting_day:e.target.value}))}>
                {["segunda","terça","quarta","quinta","sexta","sábado","domingo"].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="fl">horário</label><input className="in" value={form.meeting_time} onChange={e=>setForm(f=>({...f,meeting_time:e.target.value}))} placeholder="06:30" /></div>
          </div>
          {F("ponto de encontro", <input className="in" value={form.meeting_point} onChange={e=>setForm(f=>({...f,meeting_point:e.target.value}))} />)}

          <div style={{marginBottom:16}}>
            <label className="fl">cor do clube</label>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              {ACCENT_OPTS.map(c=>(
                <button key={c} onClick={()=>setForm(f=>({...f,accent_color:c}))} style={{width:32,height:32,borderRadius:8,background:c,border:`2.5px solid ${form.accent_color===c?"var(--ink)":"transparent"}`,cursor:"pointer",boxShadow:form.accent_color===c?"0 0 0 2px var(--ink)":"none"}} />
              ))}
            </div>
          </div>

          <div>
            <label className="fl">quem pode entrar</label>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              {[{id:"open",label:"qualquer um"},{id:"invite",label:"só com convite"},{id:"approval",label:"aprovação"}].map(p=>(
                <button key={p.id} onClick={()=>setForm(f=>({...f,entry_policy:p.id}))} style={{padding:"8px 16px",borderRadius:999,border:"2px solid var(--ink)",background:form.entry_policy===p.id?"var(--ink)":"#fff",color:form.entry_policy===p.id?"#fff":"var(--ink)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* preview */}
        <div style={{position:"sticky",top:20}}>
          <div style={{fontFamily:"'Sometype Mono',monospace",fontSize:10,fontWeight:700,color:"var(--fg3)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>★ PRÉVIA · COMO APARECE NO APP</div>
          <div style={{background:form.accent_color,border:"2.5px solid var(--ink)",borderRadius:18,padding:"18px 16px",boxShadow:"4px 4px 0 var(--ink)"}}>
            <h3 style={{fontFamily:"'Lilita One',cursive",fontSize:20,color:"#fff",margin:"0 0 10px",textTransform:"lowercase"}}>{form.name||"nome do clube"}</h3>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {form.city&&<Tag dark>{form.city}</Tag>}
              {form.meeting_day&&<Tag dark>{form.meeting_day.slice(0,3).toUpperCase()} · {form.meeting_time}</Tag>}
              <Tag dark>GRÁTIS</Tag>
            </div>
            <p style={{fontFamily:"'Poppins',sans-serif",fontSize:12,color:"rgba(255,255,255,.85)",lineHeight:1.4,margin:"0 0 12px"}}>{form.description||"descrição do clube aparece aqui."}</p>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
              <div style={{display:"flex"}}>
                {["MA","JP","Lu"].map((l,i)=>(
                  <div key={l} style={{width:24,height:24,borderRadius:"50%",background:["#3FD0FF","#B6F04C","#FFD63A"][i],border:"2px solid #fff",marginLeft:i?-8:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:8,color:"var(--ink)"}}>{l}</div>
                ))}
              </div>
              <span style={{fontFamily:"'Sometype Mono',monospace",fontSize:11,color:"rgba(255,255,255,.8)"}}>84 membros</span>
            </div>
            <button style={{width:"100%",height:40,borderRadius:999,border:"2.5px solid var(--ink)",background:"#FF4FA3",color:"#fff",fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:14,cursor:"pointer"}}>entrar no clube +</button>
          </div>
        </div>
      </div>
    </div>
  );
}
