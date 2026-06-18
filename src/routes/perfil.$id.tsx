import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { Loading } from "@/components/afora-ui";

export const Route = createFileRoute("/perfil/$id")({
  component: PerfilPage,
});

// ─── tipos ────────────────────────────────────────────────────────────────────
type UserProfile = {
  id: string;
  name: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  city?: string;
  interests?: string[];
  identity_groups?: string[];
  created_at?: string;
};

type EventCard = {
  id: string;
  title: string;
  starts_at: string;
  cover_url?: string;
  address_neighborhood?: string;
  price?: number;
  club_name: string;
  accent_color?: string;
};

type ClubCard = {
  id: string;
  name: string;
  avatar_url?: string;
  accent_color?: string;
};

// ─── constantes ───────────────────────────────────────────────────────────────
const INTEREST_LABELS: Record<string, string> = {
  corrida: "corrida 🏃", leitura: "leitura 📚", cafe: "café ☕",
  yoga: "yoga 🧘", danca: "dança 💃", culinaria: "culinária 🍳",
  arte: "arte 🎨", musica: "música 🎵", fotografia: "fotografia 📸",
  teatro: "teatro 🎭", viagem: "viagem ✈️", games: "games 🎮",
  series: "séries 🎬", natureza: "natureza 🌿", ciclismo: "ciclismo 🚴",
  natacao: "natação 🏊", vinho: "vinho 🍷", tecnologia: "tecnologia 💻",
  meditacao: "meditação 🧘‍♀️", voluntariado: "voluntariado 🤝",
};

const HOBBIES = Object.entries(INTEREST_LABELS).map(([id, label]) => ({ id, label }));

const PRIVACY_LABELS: Record<string, string> = {
  feminino: "espaço feminino ♀️",
  lgbtqia: "LGBT+ 🏳️‍🌈",
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

async function uploadImage(file: File, bucket: string, path: string): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── subcomponentes ───────────────────────────────────────────────────────────

function StatBadge({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{
        fontFamily: "'Lilita One',cursive",
        fontSize: 22, color: "var(--ink)", lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontFamily: "'Sometype Mono',monospace",
        fontSize: 10, color: "var(--fg3)", marginTop: 2,
        textTransform: "uppercase", letterSpacing: ".06em",
      }}>{label}</div>
    </div>
  );
}

function SmallEventCard({ ev }: { ev: EventCard }) {
  return (
    <Link to="/evento/$id" params={{ id: ev.id }} style={{ textDecoration: "none" }}>
      <div style={{
        width: 160, flexShrink: 0,
        borderRadius: 14, overflow: "hidden",
        border: "2px solid var(--ink)",
        boxShadow: "3px 3px 0 var(--ink)",
        background: "#fff",
      }}>
        <div style={{
          height: 90, background: ev.cover_url
            ? `url(${ev.cover_url}) center/cover`
            : (ev.accent_color || "var(--pink)"),
        }} />
        <div style={{ padding: "8px 10px" }}>
          <div style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 700,
            fontSize: 12, color: "var(--ink)", lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>{ev.title}</div>
          <div style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 10, color: "var(--fg3)", marginTop: 4,
          }}>📅 {fmtDate(ev.starts_at)}</div>
        </div>
      </div>
    </Link>
  );
}

function ClubPill({ club }: { club: ClubCard }) {
  return (
    <Link to="/clube/$id" params={{ id: club.id }} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 999,
        border: "2px solid var(--ink)",
        background: "#fff",
        boxShadow: "2px 2px 0 var(--ink)",
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: club.accent_color || "var(--pink)",
          flexShrink: 0, overflow: "hidden",
        }}>
          {club.avatar_url
            ? <img src={club.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Poppins',sans-serif", fontWeight: 800,
                fontSize: 11, color: "#fff",
              }}>{initials(club.name)}</div>
          }
        </div>
        <span style={{
          fontFamily: "'Poppins',sans-serif", fontWeight: 700,
          fontSize: 12, color: "var(--ink)", whiteSpace: "nowrap",
        }}>{club.name}</span>
      </div>
    </Link>
  );
}

// ─── painel de edição ─────────────────────────────────────────────────────────
function EditPanel({ user, onClose, onSave }: {
  user: UserProfile;
  onClose: () => void;
  onSave: (updated: Partial<UserProfile>) => void;
}) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const [city, setCity] = useState(user.city || "");
  const [interests, setInterests] = useState<string[]>(user.interests || []);
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url);
  const [coverPreview, setCoverPreview] = useState(user.cover_url);

  function toggleInterest(id: string) {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadImage(file, "avatars", `users/${user.id}.${file.name.split(".").pop()}`);
    if (url) { setAvatarPreview(url); }
  }

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadImage(file, "avatars", `covers/${user.id}.${file.name.split(".").pop()}`);
    if (url) { setCoverPreview(url); }
  }

  async function save() {
    setSaving(true);
    const payload: Partial<UserProfile> = {
      name: name.trim(),
      bio: bio.trim() || undefined,
      city: city.trim() || undefined,
      interests,
      avatar_url: avatarPreview,
      cover_url: coverPreview,
    };
    await supabase.from("users").update(payload).eq("id", user.id);
    onSave(payload);
    setSaving(false);
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(26,22,51,.6)",
      display: "flex", alignItems: "flex-end",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxHeight: "92dvh",
        background: "var(--cream)",
        borderRadius: "20px 20px 0 0",
        border: "2.5px solid var(--ink)",
        overflowY: "auto",
        paddingBottom: "env(safe-area-inset-bottom, 20px)",
      }}>
        {/* handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 999,
          background: "rgba(26,22,51,.2)",
          margin: "12px auto 0",
        }} />

        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--ink)" }}>
              editar perfil
            </h2>
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 22, color: "var(--fg3)",
            }}>✕</button>
          </div>

          {/* fotos */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 11, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: ".08em" }}>fotos</label>
            <div style={{ position: "relative", marginTop: 8 }}>
              {/* cover */}
              <div
                onClick={() => coverRef.current?.click()}
                style={{
                  height: 100, borderRadius: 14,
                  background: coverPreview ? `url(${coverPreview}) center/cover` : "var(--yellow)",
                  border: "2px solid var(--ink)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {!coverPreview && <span style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 12, color: "var(--ink)", opacity: .6 }}>📷 trocar capa</span>}
                <div style={{
                  position: "absolute", bottom: 8, right: 8,
                  background: "rgba(255,255,255,.85)", borderRadius: 999,
                  padding: "4px 10px", border: "1.5px solid var(--ink)",
                  fontFamily: "'Sometype Mono',monospace", fontSize: 10,
                }}>trocar capa</div>
              </div>

              {/* avatar over cover */}
              <div
                onClick={() => avatarRef.current?.click()}
                style={{
                  position: "absolute", left: 16, bottom: -28,
                  width: 64, height: 64, borderRadius: "50%",
                  border: "3px solid var(--cream)",
                  background: avatarPreview ? `url(${avatarPreview}) center/cover` : "var(--pink)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 0 0 2px var(--ink)",
                }}
              >
                {!avatarPreview && <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 20, color: "#fff" }}>{initials(name || "U")}</span>}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 18 }}>📷</span>
                </div>
              </div>
            </div>
            <div style={{ height: 36 }} /> {/* espaço pro avatar sobressaindo */}
          </div>

          {/* campos */}
          <div className="stack" style={{ gap: 14, marginBottom: 20 }}>
            <div>
              <label className="fl">nome</label>
              <input className="in" value={name} onChange={e => setName(e.target.value)} placeholder="seu nome" />
            </div>
            <div>
              <label className="fl">bio</label>
              <textarea
                className="in"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="conta um pouco sobre você…"
                rows={3}
                style={{ resize: "none", fontFamily: "'Poppins',sans-serif" }}
              />
            </div>
            <div>
              <label className="fl">cidade</label>
              <input className="in" value={city} onChange={e => setCity(e.target.value)} placeholder="São Paulo" />
            </div>
          </div>

          {/* interesses */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 11, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: ".08em" }}>interesses</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {HOBBIES.map(h => (
                <button
                  key={h.id} type="button"
                  onClick={() => toggleInterest(h.id)}
                  style={{
                    padding: "6px 12px", borderRadius: 999,
                    border: "2px solid var(--ink)",
                    background: interests.includes(h.id) ? "var(--pink)" : "#fff",
                    color: interests.includes(h.id) ? "#fff" : "var(--ink)",
                    fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                    fontSize: 12, cursor: "pointer",
                    boxShadow: interests.includes(h.id) ? "2px 2px 0 var(--ink)" : "none",
                    transform: interests.includes(h.id) ? "translate(-1px,-1px)" : "none",
                  }}
                >{h.label}</button>
              ))}
            </div>
          </div>

          <button className="btn full" onClick={save} disabled={saving} style={{ marginBottom: 20 }}>
            {saving ? "salvando…" : "salvar perfil"}
          </button>
        </div>

        <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
        <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCover} />
      </div>
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────
function PerfilPage() {
  const { id: profileId } = Route.useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const isOwnProfile = session?.user.id === profileId;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventCard[]>([]);
  const [pastEvents, setPastEvents] = useState<EventCard[]>([]);
  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [stats, setStats] = useState({ events: 0, clubs: 0, followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [profileId, session]);

  async function load() {
    setLoading(true);

    // perfil
    const { data: u } = await supabase
      .from("users")
      .select("id,name,avatar_url,cover_url,bio,city,interests,identity_groups,created_at")
      .eq("id", profileId)
      .single();
    if (!u) { setLoading(false); return; }
    setUser(u);

    // followers / following
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
    ]);

    // já sigo?
    if (session && !isOwnProfile) {
      const { data: f } = await supabase.from("follows")
        .select("follower_id").eq("follower_id", session.user.id).eq("following_id", profileId).single();
      setIsFollowing(!!f);
    }

    // clubes do usuário
    const { data: membData } = await supabase
      .from("memberships")
      .select("club_id, clubs(id,name,avatar_url,accent_color)")
      .eq("user_id", profileId)
      .eq("status", "active");
    const clubList = (membData || []).map((m: any) => ({
      id: m.clubs?.id, name: m.clubs?.name || "clube",
      avatar_url: m.clubs?.avatar_url, accent_color: m.clubs?.accent_color,
    })).filter(c => c.id);
    setClubs(clubList);

    // eventos via rsvps
    const { data: rsvpData } = await supabase
      .from("rsvps")
      .select("status, events(id,title,starts_at,cover_url,address_neighborhood,price,clubs(name,accent_color))")
      .eq("user_id", profileId)
      .neq("status", "cancelled");

    const allEvents = (rsvpData || []).map((r: any) => {
      const ev = r.events;
      return {
        id: ev?.id, title: ev?.title, starts_at: ev?.starts_at,
        cover_url: ev?.cover_url, address_neighborhood: ev?.address_neighborhood,
        price: ev?.price,
        club_name: ev?.clubs?.name || "clube",
        accent_color: ev?.clubs?.accent_color,
      };
    }).filter(e => e.id);

    const now = new Date().toISOString();
    setUpcomingEvents(allEvents.filter(e => e.starts_at >= now).slice(0, 8));
    setPastEvents(allEvents.filter(e => e.starts_at < now));

    setStats({
      events: allEvents.length,
      clubs: clubList.length,
      followers: followers || 0,
      following: following || 0,
    });

    setLoading(false);
  }

  async function toggleFollow() {
    if (!session) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows")
        .delete().eq("follower_id", session.user.id).eq("following_id", profileId);
      setIsFollowing(false);
      setStats(s => ({ ...s, followers: s.followers - 1 }));
    } else {
      await supabase.from("follows")
        .insert({ follower_id: session.user.id, following_id: profileId });
      setIsFollowing(true);
      setStats(s => ({ ...s, followers: s.followers + 1 }));
    }
    setFollowLoading(false);
  }

  if (loading) return (
    <div style={{ background: "var(--cream)", minHeight: "100dvh" }}>
      <Loading label="carregando perfil…" />
    </div>
  );

  if (!user) return (
    <div style={{ background: "var(--cream)", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <p style={{ fontSize: 48 }}>🕵️</p>
      <p style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 18, color: "var(--ink)", marginTop: 12 }}>perfil não encontrado</p>
      <button className="btn ghost" onClick={() => navigate({ to: "/home" })} style={{ marginTop: 20 }}>voltar</button>
    </div>
  );

  const accent = "var(--pink)";

  return (
    <div style={{ background: "var(--cream)", minHeight: "100dvh", paddingBottom: 40 }}>

      {/* cover */}
      <div style={{
        height: 180, position: "relative",
        background: user.cover_url
          ? `url(${user.cover_url}) center/cover`
          : `linear-gradient(135deg, var(--pink), var(--purple))`,
      }}>
        {/* botão voltar */}
        <button
          onClick={() => navigate({ to: "/home" })}
          style={{
            position: "absolute", top: 16, left: 16,
            background: "rgba(255,255,255,.85)",
            border: "2px solid var(--ink)", borderRadius: 999,
            padding: "6px 14px", cursor: "pointer",
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 12, fontWeight: 700, color: "var(--ink)",
          }}
        >
          ← voltar
        </button>

        {/* avatar sobressaindo */}
        <div style={{
          position: "absolute", bottom: -36, left: 20,
          width: 80, height: 80, borderRadius: "50%",
          border: "4px solid var(--cream)",
          background: user.avatar_url ? `url(${user.avatar_url}) center/cover` : accent,
          boxShadow: "0 0 0 2.5px var(--ink)",
          overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {!user.avatar_url && (
            <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 28, color: "#fff" }}>
              {initials(user.name)}
            </span>
          )}
        </div>

        {/* botão editar / seguir — top right */}
        <div style={{ position: "absolute", bottom: -18, right: 20 }}>
          {isOwnProfile ? (
            <button
              className="btn ghost"
              onClick={() => setEditOpen(true)}
              style={{ height: 36, padding: "0 16px", fontSize: 13 }}
            >
              ✏️ editar perfil
            </button>
          ) : (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              style={{
                height: 36, padding: "0 20px",
                borderRadius: 999, border: "2.5px solid var(--ink)",
                background: isFollowing ? "#fff" : "var(--pink)",
                color: isFollowing ? "var(--ink)" : "#fff",
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 800, fontSize: 13, cursor: "pointer",
                boxShadow: "2px 2px 0 var(--ink)",
                transition: "background .15s",
              }}
            >
              {isFollowing ? "seguindo ✓" : "+ seguir"}
            </button>
          )}
        </div>
      </div>

      {/* info básica */}
      <div style={{ padding: "52px 20px 0" }}>
        <h1 style={{
          fontFamily: "'Poppins',sans-serif", fontWeight: 900,
          fontSize: 24, color: "var(--ink)", lineHeight: 1.1, marginBottom: 4,
        }}>
          {user.name}
        </h1>

        {user.city && (
          <p style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 12, color: "var(--fg3)", marginBottom: 8,
          }}>
            📍 {user.city}
          </p>
        )}

        {user.bio && (
          <p style={{
            fontFamily: "'Poppins',sans-serif",
            fontSize: 14, color: "var(--fg2)",
            lineHeight: 1.5, marginBottom: 8,
          }}>
            {user.bio}
          </p>
        )}

        {/* identity groups badges */}
        {(user.identity_groups || []).filter(g => PRIVACY_LABELS[g]).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {(user.identity_groups || []).filter(g => PRIVACY_LABELS[g]).map(g => (
              <span key={g} style={{
                padding: "3px 10px", borderRadius: 999,
                border: "2px solid var(--ink)", background: "#fff",
                fontFamily: "'Sometype Mono',monospace",
                fontSize: 10, fontWeight: 700, color: "var(--ink)",
              }}>
                {PRIVACY_LABELS[g]}
              </span>
            ))}
          </div>
        )}

        {/* membro desde */}
        {user.created_at && (
          <p style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 10, color: "var(--fg3)", letterSpacing: ".04em",
          }}>
            no afora desde {fmtMonthYear(user.created_at)}
          </p>
        )}
      </div>

      {/* stats */}
      <div style={{
        margin: "20px 20px 0",
        background: "#fff",
        border: "2.5px solid var(--ink)",
        borderRadius: 16,
        boxShadow: "3px 3px 0 var(--ink)",
        padding: "16px 8px",
        display: "flex", alignItems: "center",
      }}>
        <StatBadge value={stats.events} label="rolês" />
        <div style={{ width: 1, height: 32, background: "rgba(26,22,51,.12)" }} />
        <StatBadge value={stats.clubs} label="clubes" />
        <div style={{ width: 1, height: 32, background: "rgba(26,22,51,.12)" }} />
        <StatBadge value={stats.followers} label="seguidores" />
        <div style={{ width: 1, height: 32, background: "rgba(26,22,51,.12)" }} />
        <StatBadge value={stats.following} label="seguindo" />
      </div>

      {/* interesses */}
      {(user.interests || []).length > 0 && (
        <div style={{ padding: "24px 20px 0" }}>
          <h2 className="eyebrow" style={{ marginBottom: 10 }}>interesses</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(user.interests || []).map(id => (
              <span key={id} style={{
                padding: "5px 14px", borderRadius: 999,
                border: "2px solid var(--ink)", background: "#fff",
                fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                fontSize: 12, color: "var(--ink)",
                boxShadow: "2px 2px 0 var(--ink)",
              }}>
                {INTEREST_LABELS[id] || id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* próximos rolês */}
      {upcomingEvents.length > 0 && (
        <div style={{ padding: "24px 0 0" }}>
          <h2 className="eyebrow" style={{ padding: "0 20px", marginBottom: 12 }}>próximos rolês</h2>
          <div style={{
            display: "flex", gap: 12, overflowX: "auto",
            padding: "0 20px 4px", scrollbarWidth: "none",
          }}>
            {upcomingEvents.map(ev => <SmallEventCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {/* clubes */}
      {clubs.length > 0 && (
        <div style={{ padding: "24px 0 0" }}>
          <h2 className="eyebrow" style={{ padding: "0 20px", marginBottom: 12 }}>clubes</h2>
          <div style={{
            display: "flex", gap: 10, overflowX: "auto",
            padding: "0 20px 4px", scrollbarWidth: "none",
          }}>
            {clubs.map(c => <ClubPill key={c.id} club={c} />)}
          </div>
        </div>
      )}

      {/* histórico */}
      {pastEvents.length > 0 && (
        <div style={{ padding: "24px 20px 0" }}>
          <h2 className="eyebrow" style={{ marginBottom: 12 }}>histórico</h2>
          <div style={{
            background: "#fff", border: "2.5px solid var(--ink)",
            borderRadius: 16, boxShadow: "3px 3px 0 var(--ink)",
            padding: "14px 16px",
          }}>
            <p style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 700,
              fontSize: 15, color: "var(--ink)", marginBottom: 4,
            }}>
              {pastEvents.length} {pastEvents.length === 1 ? "rolê" : "rolês"} rolados
            </p>
            <p style={{
              fontFamily: "'Sometype Mono',monospace",
              fontSize: 12, color: "var(--fg3)",
            }}>
              em {clubs.length} {clubs.length === 1 ? "clube" : "clubes"} diferentes
            </p>
          </div>
        </div>
      )}

      {/* edit panel */}
      {editOpen && (
        <EditPanel
          user={user}
          onClose={() => setEditOpen(false)}
          onSave={(updated) => setUser(u => u ? { ...u, ...updated } : u)}
        />
      )}
    </div>
  );
}
