import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { Loading } from "@/components/afora-ui";

export const Route = createFileRoute("/c/$handle")({ component: ClubPublicPage });

// ── helpers ───────────────────────────────────────────────────────────────────
const GRADS = [
  "linear-gradient(135deg,#FF4FA3,#FFD63A)",
  "linear-gradient(135deg,#3FD0FF,#B6F04C)",
  "linear-gradient(135deg,#FFD63A,#FF7A2A)",
  "linear-gradient(135deg,#B6F04C,#3FD0FF)",
  "linear-gradient(135deg,#1A1633,#FF4FA3)",
  "linear-gradient(135deg,#FF7A2A,#FFD63A)",
];
function clubGrad(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

// ── page ──────────────────────────────────────────────────────────────────────
function ClubPublicPage() {
  const { handle } = Route.useParams();
  const { session } = useSession();
  const me = session?.user.id;
  const nav = useNavigate();

  const [club, setClub] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [membership, setMembership] = useState<{ role: string } | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { load(); }, [handle]);

  async function load() {
    setLoading(true);
    setNotFound(false);

    // handle = club id for now (slug system can be added later)
    const { data: cl } = await supabase.from("clubs").select("*").eq("id", handle).maybeSingle();
    if (!cl) { setNotFound(true); setLoading(false); return; }
    setClub(cl);

    const [evRes, memRes, countRes] = await Promise.all([
      supabase
        .from("events")
        .select("id,title,starts_at,address_neighborhood,price")
        .eq("club_id", cl.id)
        .eq("status", "published")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(3),
      me
        ? supabase.from("memberships").select("role").eq("club_id", cl.id).eq("user_id", me).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("memberships").select("*", { count: "exact", head: true }).eq("club_id", cl.id),
    ]);

    setEvents(evRes.data || []);
    setMembership(memRes.data ?? null);
    setMemberCount(countRes.count ?? 0);

    // hosts/admins go straight to the panel
    if (memRes.data?.role === "host" || memRes.data?.role === "admin") {
      nav({ to: "/clube/$id", params: { id: cl.id } });
      return;
    }

    setLoading(false);
  }

  async function join() {
    if (!me) { nav({ to: "/" }); return; }
    setJoining(true);
    await supabase.from("memberships").insert({ user_id: me, club_id: club.id, role: "member" });
    setMembership({ role: "member" });
    setMemberCount(c => c + 1);
    setJoining(false);
  }

  // ── render states ─────────────────────────────────────────────────────────
  if (loading) return <Loading label="carregando clube…" />;

  if (notFound) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--cream)", padding: 24 }}>
      <span style={{ fontSize: 48 }}>🔍</span>
      <p style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 20, color: "var(--ink)", margin: 0, textAlign: "center" }}>clube não encontrado</p>
      <button className="btn ghost" onClick={() => nav({ to: "/home" })}>← voltar</button>
    </div>
  );

  const bg = clubGrad(club.id);
  const isMember = !!membership;

  // ── main view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: "var(--cream)" }}>

      {/* ── header ── */}
      <div style={{ background: bg, padding: "52px 24px 28px", position: "relative" }}>
        <button
          onClick={() => history.length > 1 ? history.back() : nav({ to: "/home" })}
          style={{ position: "absolute", top: 16, left: 16, width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,.22)", border: "2px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: "#fff" }}
        >←</button>

        <span style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.75)", textTransform: "uppercase" as const, letterSpacing: ".1em" }}>
          {club.category}
        </span>
        <h1 style={{ fontFamily: "'Lilita One',cursive", fontSize: 34, color: "#fff", margin: "4px 0 20px", lineHeight: 1.1 }}>
          {club.name}
        </h1>

        <div style={{ display: "flex", gap: 10 }}>
          <StatPill n={memberCount} label="membros" />
          <StatPill n={events.length} label={events.length === 1 ? "próximo rolê" : "próximos rolês"} />
          {club.type === "open"
            ? <span style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,.22)", color: "rgba(255,255,255,.9)", border: "1.5px solid rgba(255,255,255,.35)", alignSelf: "center" }}>aberto</span>
            : <span style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "rgba(26,22,51,.3)", color: "rgba(255,255,255,.9)", border: "1.5px solid rgba(255,255,255,.25)", alignSelf: "center" }}>por convite</span>
          }
        </div>
      </div>

      {/* ── body ── */}
      <div style={{ padding: "24px 20px 140px", maxWidth: 480, margin: "0 auto" }}>

        {/* description */}
        {club.description && (
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, color: "var(--ink)", margin: 0, lineHeight: 1.7 }}>{club.description}</p>
          </div>
        )}

        {/* upcoming events */}
        {events.length > 0 && (
          <>
            <h2 style={{ fontFamily: "'Lilita One',cursive", fontSize: 20, color: "var(--ink)", margin: "0 0 12px" }}>próximos rolês</h2>
            <div className="stack" style={{ gap: 10, marginBottom: 8 }}>
              {events.map(ev => (
                <div key={ev.id} className="card">
                  <div style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--fg3)", textTransform: "uppercase" as const, marginBottom: 4 }}>
                    {fmtDate(ev.starts_at)}
                  </div>
                  <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{ev.title}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" as const }}>
                    {ev.address_neighborhood && (
                      <span className="tag">{ev.address_neighborhood}</span>
                    )}
                    {ev.price != null && (
                      <span className="tag yellow">{ev.price === 0 ? "gratuito" : `R$ ${ev.price}`}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {events.length === 0 && !club.description && (
          <div className="card flat" style={{ borderStyle: "dashed", textAlign: "center", padding: "32px 20px" }}>
            <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, color: "var(--fg3)", margin: 0 }}>nenhum rolê marcado ainda — entra no clube pra ficar por dentro quando rolar.</p>
          </div>
        )}
      </div>

      {/* ── CTA fixo ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px 20px", background: "var(--cream)", borderTop: "2.5px solid var(--ink)" }}>
        {isMember ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => nav({ to: "/home" })}>← início</button>
            <button className="btn yellow" style={{ flex: 2, cursor: "default" }}>você já é membro ✓</button>
          </div>
        ) : (
          <button className="btn full" onClick={join} disabled={joining}>
            {joining ? "entrando…" : me ? "quero entrar →" : "entrar no afora para participar →"}
          </button>
        )}
      </div>
    </div>
  );
}

function StatPill({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.22)", border: "1.5px solid rgba(255,255,255,.35)", borderRadius: 12, padding: "8px 14px", textAlign: "center" as const, minWidth: 64 }}>
      <div style={{ fontFamily: "'Sometype Mono',monospace", fontWeight: 700, fontSize: 20, color: "#fff", lineHeight: 1 }}>{n}</div>
      <div style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 9, color: "rgba(255,255,255,.75)", textTransform: "uppercase" as const, letterSpacing: ".06em", marginTop: 3 }}>{label}</div>
    </div>
  );
}
