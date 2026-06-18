import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { AppBar, Stat, GapBar, Avatar, Loading, Empty, Toast } from "@/components/afora-ui";
import { isPast, fmtDateTime, relDay, attendanceRate, DA_CASA_MIN } from "@/lib/afora";

export const Route = createFileRoute("/clube/$id")({
  head: () => ({
    meta: [
      { title: "clube · afora" },
      { name: "description", content: "página do clube." },
    ],
  }),
  component: ClubeDetail,
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "pagina" | "painel";
type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  pinned?: boolean;
  userName?: string;
  comments?: Comment[];
};
type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  userName?: string;
};

const ACCENT_PALETTE = [
  { label: "pink",   value: "#FF4FA3" },
  { label: "yellow", value: "#FFD63A" },
  { label: "cyan",   value: "#3FD0FF" },
  { label: "cyan",   value: "#3FD0FF" },
  { label: "orange", value: "#FF7A2A" },
  { label: "purple", value: "#9747FF" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function ClubeDetail() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const me = session!.user.id;
  const nav = useNavigate();

  const [tab, setTab] = useState<Tab>("pagina");
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [iAmHost, setIAmHost] = useState(false);
  const [iAmMember, setIAmMember] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [clubR, memR, evR] = await Promise.all([
      supabase.from("clubs").select("*").eq("id", id).single(),
      supabase.from("memberships").select("*").eq("club_id", id),
      supabase.from("events").select("*").eq("club_id", id),
    ]);
    const cl = clubR.data;
    const mem = memR.data || [];
    const ev = evR.data || [];
    const eventIds = ev.map((e: any) => e.id);
    const { data: rs } = eventIds.length
      ? await supabase.from("rsvps").select("user_id,event_id,status,checked_in_at").in("event_id", eventIds)
      : { data: [] as any[] };

    const userIds = Array.from(new Set([...mem.map((m: any) => m.user_id), ...(rs || []).map((r: any) => r.user_id)]));
    let usersMap: Record<string, any> = {};
    if (userIds.length) {
      const t1 = await supabase.from("users_public").select("id,name,avatar_url").in("id", userIds);
      const list = t1.data || (await supabase.from("users").select("id,name,avatar_url").in("id", userIds)).data || [];
      usersMap = Object.fromEntries(list.map((u: any) => [u.id, u]));
    }

    setClub(cl);
    setMembers(mem);
    setEvents(ev);
    setRsvps(rs || []);
    setUsers(usersMap);
    const isHost = mem.some((m: any) => m.user_id === me && (m.role === "host" || m.role === "admin"));
    setIAmHost(isHost);
    setIAmMember(mem.some((m: any) => m.user_id === me));
    setLoading(false);
  }

  const model = useMemo(() => buildAdminModel(members, events, rsvps), [members, events, rsvps]);

  if (loading) return <Loading label="abrindo o clube…" />;
  if (!club) return (
    <>
      <AppBar sub="clube" right={<button className="btn sm ghost" onClick={() => nav({ to: "/" })}>voltar</button>} />
      <div className="shell"><Empty title="clube não encontrado">talvez tenha sido apagado.</Empty></div>
    </>
  );

  const accent = club.accent_color || "#FF4FA3";

  return (
    <>
      <AppBar
        sub={club.name}
        right={<button className="btn sm ghost" onClick={() => nav({ to: "/" })}>voltar</button>}
      />

      {/* tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "0 18px 0",
          borderBottom: "2.5px solid var(--ink)",
          background: "rgba(255,246,228,.9)",
          backdropFilter: "blur(8px)",
        }}
      >
        <TabBtn active={tab === "pagina"} accent={accent} onClick={() => setTab("pagina")}>página</TabBtn>
        {iAmHost && (
          <TabBtn active={tab === "painel"} accent={accent} onClick={() => setTab("painel")}>painel</TabBtn>
        )}
      </div>

      {tab === "pagina" && (
        <ClubPage
          club={club}
          iAmHost={iAmHost}
          iAmMember={iAmMember}
          me={me}
          users={users}
          model={model}
          accent={accent}
          onClubUpdate={(c) => { setClub(c); setToast("salvo ✦"); setTimeout(() => setToast(""), 1500); }}
          nav={nav}
        />
      )}

      {tab === "painel" && iAmHost && (
        <AdminPanel club={club} model={model} users={users} events={events} rsvps={rsvps} iAmHost={iAmHost} nav={nav} />
      )}

      {toast && <Toast>{toast}</Toast>}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function TabBtn({ active, accent, onClick, children }: { active: boolean; accent: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mono"
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "10px 14px 8px",
        fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
        color: active ? accent : "var(--fg3)",
        borderBottom: active ? `3px solid ${accent}` : "3px solid transparent",
        transition: "color .15s, border-color .15s",
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUB PAGE (PUBLIC VIEW)
// ─────────────────────────────────────────────────────────────────────────────

function ClubPage({ club, iAmHost, iAmMember, me, users, model, accent, onClubUpdate, nav }: {
  club: any; iAmHost: boolean; iAmMember: boolean; me: string;
  users: Record<string, any>; model: any; accent: string;
  onClubUpdate: (c: any) => void; nav: any;
}) {
  const [editMode, setEditMode] = useState(false);

  return (
    <div style={{ "--accent": accent } as React.CSSProperties}>
      {/* ── cover + profile ── */}
      <ClubHero
        club={club}
        iAmHost={iAmHost}
        editMode={editMode}
        accent={accent}
        onToggleEdit={() => setEditMode((v) => !v)}
        onUpdate={onClubUpdate}
      />

      <div className="shell" style={{ paddingTop: 0 }}>
        {/* ── two column ── */}
        <div
          className="club-page-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 20,
            marginTop: 24,
            alignItems: "start",
          }}
        >
          {/* mural */}
          <Mural clubId={club.id} me={me} users={users} isMember={iAmMember} isHost={iAmHost} accent={accent} />

          {/* sidebar */}
          <div className="stack" style={{ gap: 14 }}>
            {/* próximos rolês */}
            <div className="card" style={{ borderColor: "var(--ink)" }}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <span className="eyebrow" style={{ color: accent }}>próximos rolês</span>
                {iAmHost && (
                  <button className="btn sm" style={{ background: accent, borderColor: "var(--ink)" }} onClick={() => nav({ to: "/evento/novo" })}>
                    + novo
                  </button>
                )}
              </div>
              {model.upcomingEvents.length === 0 ? (
                <p className="lead" style={{ fontSize: 13 }}>nada marcado ainda.</p>
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  {model.upcomingEvents.slice(0, 4).map((e: any) => (
                    <button
                      key={e.id}
                      onClick={() => nav({ to: "/evento/$id", params: { id: e.id } })}
                      style={{
                        textAlign: "left", width: "100%", background: "#fff",
                        border: "2px solid var(--ink)", borderRadius: 10,
                        padding: "9px 12px", cursor: "pointer",
                        boxShadow: "2px 2px 0 var(--ink)",
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                      }}
                    >
                      <div className="stack" style={{ gap: 1 }}>
                        <strong style={{ fontSize: 13 }}>{e.title}</strong>
                        <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>
                          {relDay(e.starts_at)} · {e.address_neighborhood}
                        </span>
                      </div>
                      <span className="tag" style={{ background: accent, borderColor: "var(--ink)", fontSize: 11, flexShrink: 0 }}>
                        {e.confirmou}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* membros destaque */}
            <div className="card">
              <span className="eyebrow" style={{ color: accent, display: "block", marginBottom: 10 }}>membros</span>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className="tag" style={{ background: accent, borderColor: "var(--ink)" }}>{model.members.total} total</span>
                <span className="tag yellow">{model.members.daCasa} da casa</span>
                <span className="tag ghost">{model.members.novos} novos</span>
              </div>
              {model.totals.confirmou > 0 && (
                <div style={{ marginTop: 12 }}>
                  <GapBar confirmou={model.totals.confirmou} apareceu={model.totals.apareceu} />
                  <p className="mono" style={{ fontSize: 11, color: "var(--fg3)", marginTop: 6 }}>
                    {model.totals.taxa}% de presença real
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .club-page-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO (cover + avatar + info + edit)
// ─────────────────────────────────────────────────────────────────────────────

function ClubHero({ club, iAmHost, editMode, accent, onToggleEdit, onUpdate }: {
  club: any; iAmHost: boolean; editMode: boolean; accent: string;
  onToggleEdit: () => void; onUpdate: (c: any) => void;
}) {
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    name: club.name || "",
    category: club.category || "",
    description: club.description || "",
    type: club.type || "open",
    accent_color: club.accent_color || "#FF4FA3",
  });

  async function uploadImage(file: File, bucket: string, path: string) {
    const { data } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (!data) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setSaving(true);
    const url = await uploadImage(file, "clubs", `covers/${club.id}.${file.name.split(".").pop()}`);
    if (url) {
      const { data } = await supabase.from("clubs").update({ cover_url: url }).eq("id", club.id).select().single();
      if (data) onUpdate(data);
    }
    setSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setSaving(true);
    const url = await uploadImage(file, "clubs", `avatars/${club.id}.${file.name.split(".").pop()}`);
    if (url) {
      const { data } = await supabase.from("clubs").update({ avatar_url: url }).eq("id", club.id).select().single();
      if (data) onUpdate(data);
    }
    setSaving(false);
  }

  async function saveEdit() {
    setSaving(true);
    const { data } = await supabase.from("clubs").update({
      name: editFields.name.trim(),
      category: editFields.category.trim(),
      description: editFields.description.trim() || null,
      type: editFields.type,
      accent_color: editFields.accent_color,
    }).eq("id", club.id).select().single();
    setSaving(false);
    if (data) { onUpdate(data); onToggleEdit(); }
  }

  const coverBg = club.cover_url
    ? `url(${club.cover_url}) center/cover`
    : `linear-gradient(135deg, ${accent}55 0%, ${accent}22 50%, var(--ink) 100%)`;

  return (
    <div>
      {/* cover */}
      <div
        style={{
          height: 200,
          background: coverBg,
          position: "relative",
          borderBottom: "2.5px solid var(--ink)",
        }}
      >
        {iAmHost && (
          <>
            <div
              style={{
                position: "absolute", top: 12, right: 12,
                display: "flex", gap: 8,
              }}
            >
              <button
                onClick={() => coverRef.current?.click()}
                style={{
                  background: "rgba(26,22,51,.55)", border: "2px solid rgba(255,246,228,.4)",
                  borderRadius: 999, color: "#fff", padding: "6px 12px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)",
                }}
              >
                {saving ? "…" : "trocar capa"}
              </button>
              <button
                onClick={onToggleEdit}
                style={{
                  background: editMode ? accent : "rgba(26,22,51,.55)",
                  border: "2px solid " + (editMode ? "var(--ink)" : "rgba(255,246,228,.4)"),
                  borderRadius: 999,
                  color: editMode ? "var(--ink)" : "#fff",
                  padding: "6px 12px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)",
                }}
              >
                {editMode ? "✕ fechar" : "✏️ editar"}
              </button>
            </div>
            <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverUpload} />
          </>
        )}
      </div>

      {/* avatar + info */}
      <div className="shell" style={{ paddingBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -44, marginBottom: 16, flexWrap: "wrap" }}>
          {/* avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 88, height: 88, borderRadius: 20,
                border: "3px solid var(--ink)",
                boxShadow: "3px 3px 0 var(--ink)",
                background: club.avatar_url ? "none" : accent,
                overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {club.avatar_url
                ? <img src={club.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: "'Lilita One',cursive", fontSize: 36, color: "var(--ink)" }}>
                    {club.name?.charAt(0).toUpperCase()}
                  </span>
              }
            </div>
          </div>

          {/* nome + tags */}
          <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
            <div className="row wrap" style={{ gap: 6, marginBottom: 2 }}>
              <span className="tag" style={{ background: accent, borderColor: "var(--ink)", fontSize: 11 }}>{club.category}</span>
              <span className="tag ghost" style={{ fontSize: 11 }}>{club.type === "open" ? "aberto" : "curado"}</span>
            </div>
            <h1 className="title" style={{ fontSize: 24, lineHeight: 1.1 }}>{club.name}</h1>
            {club.description && <p className="lead" style={{ fontSize: 13, color: "var(--fg2)" }}>{club.description}</p>}
          </div>
        </div>

        {/* painel de edição */}
        {editMode && iAmHost && (
          <div className="card" style={{ marginBottom: 20, borderStyle: "dashed" }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>personalizar clube</span>
            <div className="stack" style={{ gap: 12 }}>
              {/* foto de perfil */}
              <div>
                <label className="fl">foto de perfil</label>
                <div className="row" style={{ gap: 12, alignItems: "center", marginTop: 4 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, border: "2.5px solid var(--ink)",
                    overflow: "hidden", background: accent, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {club.avatar_url
                      ? <img src={club.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontFamily: "'Lilita One',cursive", fontSize: 24, color: "var(--ink)" }}>{club.name?.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <button className="btn ghost sm" type="button" onClick={() => avatarRef.current?.click()} disabled={saving}>
                    {saving ? "…" : "trocar foto"}
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
                </div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <div className="stack" style={{ gap: 6, flex: 1 }}>
                  <label className="fl">nome</label>
                  <input className="in" value={editFields.name} onChange={(e) => setEditFields(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="stack" style={{ gap: 6, width: 160 }}>
                  <label className="fl">categoria</label>
                  <input className="in" value={editFields.category} onChange={(e) => setEditFields(f => ({ ...f, category: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="fl">tipo</label>
                <select className="in" value={editFields.type} onChange={(e) => setEditFields(f => ({ ...f, type: e.target.value }))}>
                  <option value="open">aberto · qualquer um entra</option>
                  <option value="curated">curado · você aprova entrada</option>
                </select>
              </div>
              <div>
                <label className="fl">descrição</label>
                <textarea className="in" value={editFields.description} onChange={(e) => setEditFields(f => ({ ...f, description: e.target.value }))} />
              </div>
              {/* cor de destaque */}
              <div>
                <label className="fl">cor de destaque</label>
                <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
                  {ACCENT_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setEditFields(f => ({ ...f, accent_color: c.value }))}
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: c.value,
                        border: editFields.accent_color === c.value ? "3px solid var(--ink)" : "2px solid rgba(26,22,51,.2)",
                        boxShadow: editFields.accent_color === c.value ? "2px 2px 0 var(--ink)" : "none",
                        cursor: "pointer", transform: editFields.accent_color === c.value ? "scale(1.15)" : "scale(1)",
                        transition: "transform .1s, border .1s",
                      }}
                    />
                  ))}
                  {/* custom hex */}
                  <input
                    type="color"
                    value={editFields.accent_color}
                    onChange={(e) => setEditFields(f => ({ ...f, accent_color: e.target.value }))}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      border: "2px solid var(--ink)", cursor: "pointer", padding: 2,
                    }}
                    title="cor personalizada"
                  />
                </div>
              </div>
              <button className="btn full" onClick={saveEdit} disabled={saving} style={{ background: editFields.accent_color }}>
                {saving ? "salvando…" : "salvar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGHLIGHTS (removido)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MURAL
// ─────────────────────────────────────────────────────────────────────────────

function Mural({ clubId, me, users, isMember, isHost, accent }: {
  clubId: string; me: string; users: Record<string, any>; isMember: boolean; isHost: boolean; accent: string;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [unavailable, setUnavailable] = useState<string | false>(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const myName = users[me]?.name || "você";

  useEffect(() => { loadPosts(); }, [clubId]);

  async function loadPosts() {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from("club_posts")
      .select("id, club_id, user_id, content, pinned, created_at")
      .eq("club_id", clubId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) { setUnavailable(error.message || error.code || "erro desconhecido"); setLoadingPosts(false); return; }

    const rawPosts = (data || []).map((p: any) => ({
      id: p.id, user_id: p.user_id, content: p.content,
      created_at: p.created_at, pinned: p.pinned,
      userName: users[p.user_id]?.name || "membro",
      comments: [] as Comment[],
    }));
    // load comments for all posts
    if (rawPosts.length) {
      const { data: comms } = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, content, created_at")
        .in("post_id", rawPosts.map((p) => p.id))
        .order("created_at", { ascending: true });
      const byPost: Record<string, Comment[]> = {};
      for (const c of (comms || [])) {
        (byPost[c.post_id] ||= []).push({
          id: c.id, user_id: c.user_id, content: c.content,
          created_at: c.created_at, userName: users[c.user_id]?.name || "membro",
        });
      }
      rawPosts.forEach((p) => { p.comments = byPost[p.id] || []; });
    }
    setPosts(rawPosts);
    setLoadingPosts(false);
  }

  async function submitPost() {
    if (!newPost.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("club_posts")
      .insert({ club_id: clubId, user_id: me, content: newPost.trim(), pinned: false })
      .select("*")
      .single();
    setSubmitting(false);
    if (error) return;
    const post: Post = {
      id: data.id, user_id: data.user_id, content: data.content,
      created_at: data.created_at, pinned: false,
      userName: myName, comments: [],
    };
    setPosts((ps) => [post, ...ps]);
    setNewPost("");
  }

  if (loadingPosts) return <div className="card" style={{ padding: 24, textAlign: "center" }}><div className="spin" style={{ margin: "0 auto" }} /></div>;

  if (unavailable) return (
    <div className="card" style={{ borderStyle: "dashed", textAlign: "center", padding: "32px 20px" }}>
      <span style={{ fontSize: 32, display: "block", marginBottom: 10 }}>💬</span>
      <h2 className="title" style={{ fontSize: 18 }}>erro no mural</h2>
      <p className="lead" style={{ fontSize: 13, marginTop: 6 }}>
        <code>{unavailable}</code>
      </p>
    </div>
  );

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* input de novo post */}
      {isHost && (
        <div className="card" style={{ padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Avatar name={myName} size={38} />
          <div className="stack" style={{ flex: 1, gap: 8 }}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="escreve algo pro clube…"
              className="in"
              style={{ minHeight: 72, fontSize: 14, resize: "none" }}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) submitPost(); }}
            />
            <div className="row between">
              <span />
              <button
                className="btn sm"
                style={{ background: accent, borderColor: "var(--ink)" }}
                onClick={submitPost}
                disabled={submitting || !newPost.trim()}
              >
                {submitting ? "…" : "publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* posts */}
      {posts.length === 0 && (
        <div className="card flat" style={{ borderStyle: "dashed", textAlign: "center", padding: "28px 20px" }}>
          <p className="lead" style={{ fontSize: 14 }}>
            nenhum recado ainda.
          </p>
        </div>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} me={me} myName={myName} accent={accent} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST CARD
// ─────────────────────────────────────────────────────────────────────────────

function PostCard({ post, me, myName, accent }: { post: Post; me: string; myName: string; accent: string }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [submitting, setSubmitting] = useState(false);

  function timeAgo(iso: string) {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 1) return "agora";
    if (d < 60) return `${d}min`;
    if (d < 1440) return `${Math.round(d / 60)}h`;
    return `${Math.round(d / 1440)}d`;
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: post.id, user_id: me, content: newComment.trim() })
      .select("*").single();
    setSubmitting(false);
    if (error) return;
    setComments((cs) => [...cs, { id: data.id, user_id: data.user_id, content: data.content, created_at: data.created_at, userName: myName }]);
    setNewComment("");
  }

  return (
    <div className="card reveal" style={{ padding: 14 }}>
      {/* cabeçalho */}
      <div className="row" style={{ gap: 10, marginBottom: 10 }}>
        <Avatar name={post.userName || "?"} size={36} />
        <div className="stack" style={{ gap: 1 }}>
          <strong style={{ fontSize: 13 }}>{post.userName}</strong>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>{timeAgo(post.created_at)}</span>
        </div>
        {post.pinned && <span className="tag yellow" style={{ marginLeft: "auto", fontSize: 10 }}>📌 fixado</span>}
      </div>

      {/* conteúdo */}
      <p style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{post.content}</p>

      {/* rodapé */}
      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="tag ghost"
          style={{ cursor: "pointer", fontSize: 12 }}
        >
          💬 Comentários{comments.length > 0 ? ` (${comments.length})` : ""}
        </button>
      </div>

      {/* comentários */}
      {showComments && (
        <div className="stack" style={{ marginTop: 12, gap: 10, paddingLeft: 12, borderLeft: `3px solid ${accent}55` }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Avatar name={c.userName || "?"} size={28} />
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 6, marginBottom: 2 }}>
                  <strong style={{ fontSize: 12 }}>{c.userName}</strong>
                  <span className="mono" style={{ fontSize: 10, color: "var(--fg3)" }}>{timeAgo(c.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.45 }}>{c.content}</p>
              </div>
            </div>
          ))}
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <Avatar name={myName} size={28} />
            <input
              className="in"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="responder…"
              style={{ height: 34, fontSize: 13, flex: 1 }}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
            <button
              className="btn sm"
              style={{ background: accent, borderColor: "var(--ink)", height: 34, padding: "0 12px" }}
              onClick={submitComment}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? "…" : "↵"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PANEL (painel tab)
// ─────────────────────────────────────────────────────────────────────────────

function AdminPanel({ club, model, users, events, rsvps, iAmHost, nav }: any) {
  const [showAllMembers, setShowAllMembers] = useState(false);

  return (
    <div className="shell">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginTop: 20 }}>

        {/* visão geral do clube */}
        <div className="card reveal" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <span className="eyebrow">visão geral</span>
            <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>do clube</h2>
          </div>
          <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
            <Stat num={model.members.total} label="membros" accent="var(--ink)" />
            <Stat num={model.totals.eventos} label="rolês totais" accent="var(--pink-deep)" />
            <Stat num={model.totals.proximos} label="próximos" accent="var(--cyan)" />
          </div>
          <div className="divider" />
          {model.totals.confirmou > 0 ? (
            <>
              <GapBar confirmou={model.totals.confirmou} apareceu={model.totals.apareceu} />
              <div className="row between" style={{ marginTop: 4 }}>
                <Stat num={model.totals.taxa != null ? model.totals.taxa + "%" : "—"} label="presença real" accent="var(--yellow)" />
                <Stat num={model.members.daCasa} label="da casa" accent="var(--yellow)" />
                <Stat num={model.members.recorrentes} label="recorrentes" accent="var(--orange)" />
              </div>
            </>
          ) : (
            <p className="lead" style={{ fontSize: 13 }}>sem rolê passado ainda. os números aparecem após o primeiro check-in.</p>
          )}
        </div>

        {/* membros */}
        <div className="card reveal" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div>
              <span className="eyebrow">visão geral</span>
              <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>dos membros</h2>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span className="tag ghost">{model.members.novos} novos</span>
              <span className="tag yellow">{model.members.recorrentes} recorr.</span>
              <span className="tag yellow">{model.members.daCasa} da casa</span>
            </div>
          </div>
          {model.memberRows.length === 0 ? (
            <p className="lead" style={{ fontSize: 13 }}>sem membros ainda.</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {(showAllMembers ? model.memberRows : model.memberRows.slice(0, 5)).map((m: any) => {
                const u = users[m.user_id];
                const nome = u?.name || ("membro " + m.user_id.slice(0, 4));
                return (
                  <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={nome} size={36} />
                    <div className="stack" style={{ gap: 1, flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13 }}>{nome}</strong>
                        {m.role === "host" && <span className="tag pink" style={{ fontSize: 10, padding: "1px 7px" }}>host</span>}
                        {m.tier === "daCasa" && <span className="tag yellow" style={{ fontSize: 10, padding: "1px 7px" }}>★</span>}
                        {m.tier === "novo" && <span className="tag ghost" style={{ fontSize: 10, padding: "1px 7px" }}>novo</span>}
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>{m.apareceu} presenças · entrou {relDay(m.joined_at)}</span>
                    </div>
                  </div>
                );
              })}
              {model.memberRows.length > 5 && (
                <button className="btn sm ghost" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={() => setShowAllMembers((v) => !v)}>
                  {showAllMembers ? "ver menos" : `+ ${model.memberRows.length - 5} membros`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* calendário */}
        <div className="card reveal" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div>
              <span className="eyebrow">visão geral</span>
              <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>do calendário</h2>
            </div>
            {iAmHost && <button className="btn sm yellow" onClick={() => nav({ to: "/evento/novo" })}>+ novo rolê</button>}
          </div>
          {model.upcomingEvents.length === 0 && model.recentPast.length === 0 ? (
            <p className="lead" style={{ fontSize: 13 }}>nenhum rolê ainda.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {model.upcomingEvents.length > 0 && <>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg3)", letterSpacing: ".08em", textTransform: "uppercase" }}>próximos</span>
                {model.upcomingEvents.map((e: any) => <AdminEventRow key={e.id} event={e} nav={nav} />)}
              </>}
              {model.recentPast.length > 0 && <>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg3)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>passados</span>
                {model.recentPast.map((e: any) => <AdminEventRow key={e.id} event={e} nav={nav} past />)}
              </>}
            </div>
          )}
        </div>

        {/* financeiro placeholder */}
        <div className="card reveal" style={{ display: "flex", flexDirection: "column", gap: 14, opacity: 0.6, background: "repeating-linear-gradient(135deg,#fff 0px,#fff 12px,rgba(26,22,51,.03) 12px,rgba(26,22,51,.03) 24px)" }}>
          <div>
            <span className="eyebrow">visão geral</span>
            <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>do financeiro</h2>
          </div>
          <div className="stack" style={{ alignItems: "center", gap: 10, padding: "20px 0" }}>
            <span style={{ fontSize: 32 }}>🔒</span>
            <p className="lead" style={{ fontSize: 13, textAlign: "center" }}>em breve. pagamentos e receita do clube aparecem aqui.</p>
            <span className="tag ghost">em desenvolvimento</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminEventRow({ event, nav, past = false }: { event: any; nav: any; past?: boolean }) {
  return (
    <button
      onClick={() => nav({ to: "/evento/$id", params: { id: event.id } })}
      style={{
        textAlign: "left", width: "100%",
        background: past ? "rgba(26,22,51,.04)" : "#fff",
        border: "2px solid var(--ink)", borderRadius: 12, padding: "10px 12px",
        boxShadow: past ? "none" : "2px 2px 0 var(--ink)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer",
      }}
    >
      <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg3)" }}>{fmtDateTime(event.starts_at)} · {event.address_neighborhood}</span>
      </div>
      <div className="stack" style={{ alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        {past
          ? <span className="tag" style={{ fontSize: 10, padding: "1px 7px", background: "var(--yellow)" }}>{event.apareceu} aparec.</span>
          : <span className="tag pink" style={{ fontSize: 10, padding: "1px 7px" }}>{event.confirmou} conf.</span>
        }
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL
// ─────────────────────────────────────────────────────────────────────────────

function buildAdminModel(members: any[], events: any[], rsvps: any[]) {
  const past = events.filter(isPast);
  const upcoming = events.filter((e) => !isPast(e) && e.status !== "cancelled");
  const byEvent: Record<string, any[]> = {};
  for (const r of rsvps) (byEvent[r.event_id] ||= []).push(r);

  const byUser: Record<string, { confirmou: number; apareceu: number }> = {};
  let confirmou = 0; let apareceu = 0;
  for (const e of past) {
    for (const r of (byEvent[e.id] || [])) {
      if (r.status === "cancelled") continue;
      byUser[r.user_id] ||= { confirmou: 0, apareceu: 0 };
      byUser[r.user_id].confirmou++; confirmou++;
      if (r.checked_in_at) { byUser[r.user_id].apareceu++; apareceu++; }
    }
  }

  const memberRows = members.map((m) => {
    const s = byUser[m.user_id] || { confirmou: 0, apareceu: 0 };
    const tier = s.apareceu >= DA_CASA_MIN ? "daCasa" : s.apareceu >= 2 ? "recorrente" : s.apareceu === 0 ? "novo" : "ok";
    return { ...m, confirmou: s.confirmou, apareceu: s.apareceu, tier };
  }).sort((a, b) => b.apareceu - a.apareceu);

  const upcomingEvents = upcoming
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .map((e) => ({ ...e, confirmou: (byEvent[e.id] || []).filter((r) => r.status !== "cancelled").length }));

  const recentPast = [...past]
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
    .slice(0, 3)
    .map((e) => {
      const ev = (byEvent[e.id] || []).filter((r) => r.status !== "cancelled");
      return { ...e, confirmou: ev.length, apareceu: ev.filter((r) => r.checked_in_at).length };
    });

  return {
    memberRows,
    members: {
      total: members.length,
      novos: memberRows.filter((m) => m.tier === "novo").length,
      recorrentes: memberRows.filter((m) => m.apareceu >= 2).length,
      daCasa: memberRows.filter((m) => m.apareceu >= DA_CASA_MIN).length,
    },
    totals: {
      confirmou, apareceu, taxa: attendanceRate(confirmou, apareceu),
      eventos: events.length, proximos: upcoming.length,
    },
    upcomingEvents,
    recentPast,
  };
}
