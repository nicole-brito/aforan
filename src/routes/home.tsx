import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { Loading } from "@/components/afora-ui";

export const Route = createFileRoute("/home")({
  component: HomePage,
});

// ─── tipos ────────────────────────────────────────────────────────────────────
type UserProfile = {
  id: string;
  name: string;
  avatar_url?: string;
  city?: string;
  interests?: string[];
};

type EventCard = {
  id: string;
  title: string;
  starts_at: string;
  cover_url?: string;
  address_neighborhood?: string;
  price?: number;
  tags?: string[];
  club_id: string;
  club_name: string;
  club_avatar?: string;
  accent_color?: string;
};

type ClubCard = {
  id: string;
  name: string;
  avatar_url?: string;
  accent_color?: string;
  category?: string;
};

type Tab = "home" | "explorar" | "ingressos" | "perfil";

// ─── helpers ──────────────────────────────────────────────────────────────────
const INTEREST_LABELS: Record<string, string> = {
  corrida: "corrida 🏃",
  leitura: "leitura 📚",
  cafe: "café ☕",
  yoga: "yoga 🧘",
  danca: "dança 💃",
  culinaria: "culinária 🍳",
  arte: "arte 🎨",
  musica: "música 🎵",
  fotografia: "fotografia 📸",
  teatro: "teatro 🎭",
  viagem: "viagem ✈️",
  games: "games 🎮",
  series: "séries 🎬",
  natureza: "natureza 🌿",
  ciclismo: "ciclismo 🚴",
  natacao: "natação 🏊",
  vinho: "vinho 🍷",
  tecnologia: "tecnologia 💻",
  meditacao: "meditação 🧘‍♀️",
  voluntariado: "voluntariado 🤝",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);

  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "amanhã";

  const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("pt-BR", { month: "short" });
  return `${weekday} ${day} ${month}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── componentes ──────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 36, accent }: {
  url?: string; name: string; size?: number; accent?: string;
}) {
  if (url) return (
    <img
      src={url} alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: accent || "var(--pink)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Poppins',sans-serif", fontWeight: 800,
      fontSize: size * 0.35, color: "#fff",
    }}>
      {initials(name)}
    </div>
  );
}

function EventBigCard({ ev }: { ev: EventCard }) {
  const accent = ev.accent_color || "var(--pink)";
  return (
    <Link to="/evento/$id" params={{ id: ev.id }} style={{ textDecoration: "none" }}>
      <div style={{
        borderRadius: 20, overflow: "hidden",
        border: "2.5px solid var(--ink)",
        boxShadow: "4px 4px 0 var(--ink)",
        background: "#fff",
        flexShrink: 0,
        width: "min(320px, 82vw)",
      }}>
        {/* cover */}
        <div style={{
          height: 160, position: "relative",
          background: ev.cover_url ? `url(${ev.cover_url}) center/cover` : accent,
        }}>
          {/* preço badge */}
          {ev.price != null && (
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(255,255,255,.92)",
              border: "2px solid var(--ink)",
              borderRadius: 999, padding: "3px 10px",
              fontFamily: "'Sometype Mono',monospace",
              fontWeight: 700, fontSize: 12, color: "var(--ink)",
            }}>
              {ev.price === 0 ? "grátis" : `R$${Number(ev.price).toFixed(0)}`}
            </div>
          )}
        </div>

        {/* info */}
        <div style={{ padding: "12px 14px" }}>
          <div style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 800,
            fontSize: 15, color: "var(--ink)", marginBottom: 6,
            lineHeight: 1.2,
          }}>
            {ev.title}
          </div>

          <div style={{
            display: "flex", gap: 10, alignItems: "center",
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 11, color: "var(--fg2)",
          }}>
            <span>📅 {fmtDate(ev.starts_at)} · {fmtTime(ev.starts_at)}</span>
          </div>

          {ev.address_neighborhood && (
            <div style={{
              fontFamily: "'Sometype Mono',monospace",
              fontSize: 11, color: "var(--fg2)", marginTop: 3,
            }}>
              📍 {ev.address_neighborhood}
            </div>
          )}

          {/* club chip */}
          <div style={{
            marginTop: 10, display: "flex", alignItems: "center", gap: 6,
          }}>
            <Avatar url={ev.club_avatar} name={ev.club_name} size={20} accent={accent} />
            <span style={{
              fontFamily: "'Sometype Mono',monospace",
              fontSize: 10, color: "var(--fg3)", letterSpacing: ".04em",
            }}>
              {ev.club_name}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EventSmallCard({ ev }: { ev: EventCard }) {
  const accent = ev.accent_color || "var(--pink)";
  return (
    <Link to="/evento/$id" params={{ id: ev.id }} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", gap: 12, alignItems: "flex-start",
        padding: "12px 0",
        borderBottom: "1.5px solid rgba(26,22,51,.08)",
      }}>
        {/* cover thumb */}
        <div style={{
          width: 64, height: 64, borderRadius: 12, flexShrink: 0,
          background: ev.cover_url ? `url(${ev.cover_url}) center/cover` : accent,
          border: "2px solid var(--ink)",
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 700,
            fontSize: 14, color: "var(--ink)", lineHeight: 1.2,
            marginBottom: 4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {ev.title}
          </div>
          <div style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 11, color: "var(--fg2)",
          }}>
            📅 {fmtDate(ev.starts_at)}
            {ev.address_neighborhood ? ` · 📍 ${ev.address_neighborhood}` : ""}
          </div>
          <div style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 10, color: "var(--fg3)", marginTop: 3,
          }}>
            {ev.club_name}
            {ev.price != null && ` · ${ev.price === 0 ? "grátis" : `R$${Number(ev.price).toFixed(0)}`}`}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ClubChip({ club }: { club: ClubCard }) {
  const accent = club.accent_color || "var(--pink)";
  return (
    <Link to="/clube/$id" params={{ id: club.id }} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, width: 72,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: accent,
          border: "2.5px solid var(--ink)",
          boxShadow: "2px 2px 0 var(--ink)",
          overflow: "hidden",
        }}>
          {club.avatar_url
            ? <img src={club.avatar_url} alt={club.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Poppins',sans-serif", fontWeight: 800,
                fontSize: 20, color: "#fff",
              }}>{initials(club.name)}</div>
          }
        </div>
        <span style={{
          fontFamily: "'Sometype Mono',monospace",
          fontSize: 10, color: "var(--ink)", fontWeight: 700,
          textAlign: "center", lineHeight: 1.2,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          width: "100%",
        }}>
          {club.name}
        </span>
      </div>
    </Link>
  );
}

// ─── tabs ─────────────────────────────────────────────────────────────────────

function HomeTab({ user, events, clubs, activeFilter, onFilter }: {
  user: UserProfile;
  events: EventCard[];
  clubs: ClubCard[];
  activeFilter: string | null;
  onFilter: (id: string | null) => void;
}) {
  const firstName = user.name.split(" ")[0];

  const filtered = activeFilter
    ? events.filter(e => e.tags?.includes(activeFilter) || e.club_name.toLowerCase().includes(activeFilter))
    : events;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* greeting */}
      <div style={{ padding: "20px 20px 0" }}>
        <h1 style={{
          fontFamily: "'Lilita One',cursive",
          fontSize: 28, color: "var(--ink)",
          marginBottom: 4, textTransform: "lowercase",
        }}>
          oi, {firstName}! 👋
        </h1>
        {user.city && (
          <p style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 12, color: "var(--fg3)", letterSpacing: ".04em",
          }}>
            📍 {user.city}
          </p>
        )}
      </div>

      {/* filtros de interesse */}
      {user.interests && user.interests.length > 0 && (
        <div style={{
          padding: "16px 20px 0",
          display: "flex", gap: 8, overflowX: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          <button
            onClick={() => onFilter(null)}
            style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 999,
              border: "2px solid var(--ink)",
              background: activeFilter === null ? "var(--ink)" : "#fff",
              color: activeFilter === null ? "#fff" : "var(--ink)",
              fontFamily: "'Poppins',sans-serif",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            todos
          </button>
          {user.interests.map(id => (
            <button
              key={id}
              onClick={() => onFilter(activeFilter === id ? null : id)}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 999,
                border: "2px solid var(--ink)",
                background: activeFilter === id ? "var(--pink)" : "#fff",
                color: activeFilter === id ? "#fff" : "var(--ink)",
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {INTEREST_LABELS[id] || id}
            </button>
          ))}
        </div>
      )}

      {/* eventos — scroll horizontal */}
      {filtered.length > 0 ? (
        <>
          <div style={{ padding: "20px 20px 8px" }}>
            <h2 style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 800,
              fontSize: 18, color: "var(--ink)", marginBottom: 0,
            }}>
              próximos rolês
            </h2>
          </div>
          <div style={{
            padding: "0 20px",
            display: "flex", gap: 12,
            overflowX: "auto",
            scrollbarWidth: "none", msOverflowStyle: "none",
            paddingBottom: 4,
          }}>
            {filtered.slice(0, 6).map(ev => (
              <EventBigCard key={ev.id} ev={ev} />
            ))}
          </div>

          {/* lista dos próximos */}
          {filtered.length > 6 && (
            <div style={{ padding: "20px 20px 0" }}>
              <h2 style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 800,
                fontSize: 16, color: "var(--ink)", marginBottom: 0,
              }}>
                mais rolês
              </h2>
              <div>
                {filtered.slice(6, 15).map(ev => (
                  <EventSmallCard key={ev.id} ev={ev} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{
          padding: "40px 20px", textAlign: "center",
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🌵</p>
          <p style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 700,
            fontSize: 16, color: "var(--ink)", marginBottom: 6,
          }}>
            nenhum rolê por aqui ainda
          </p>
          <p style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 12, color: "var(--fg3)",
          }}>
            tenta outro filtro ou volta mais tarde
          </p>
        </div>
      )}

      {/* seus clubes */}
      {clubs.length > 0 && (
        <div style={{ padding: "24px 20px 0" }}>
          <h2 style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 800,
            fontSize: 18, color: "var(--ink)", marginBottom: 16,
          }}>
            seus clubes
          </h2>
          <div style={{
            display: "flex", gap: 16,
            overflowX: "auto", scrollbarWidth: "none",
            paddingBottom: 4,
          }}>
            {clubs.map(c => <ClubChip key={c.id} club={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { id: "tecnologia", label: "Tecnologia", emoji: "💻" },
  { id: "ia", label: "IA", emoji: "🤖" },
  { id: "fitness", label: "Fitness", emoji: "🏃" },
  { id: "musica", label: "Música", emoji: "🎵" },
  { id: "arte", label: "Arte & Cultura", emoji: "🎨" },
  { id: "gastronomia", label: "Comida & Bebida", emoji: "🍽️" },
  { id: "bem_estar", label: "Bem-estar", emoji: "🧘" },
  { id: "natureza", label: "Natureza", emoji: "🌿" },
];

const CITIES = [
  { name: "São Paulo", grad: ["#FF4FA3", "#C8176A"] },
  { name: "Rio de Janeiro", grad: ["#3FD0FF", "#0099CC"] },
  { name: "Belo Horizonte", grad: ["#FFD63A", "#E0A800"] },
  { name: "Curitiba", grad: ["#9747FF", "#6B1FCC"] },
  { name: "Salvador", grad: ["#FF7A2A", "#CC4A00"] },
  { name: "Florianópolis", grad: ["#3FD0FF", "#9747FF"] },
];

type ClubFull = ClubCard & { description?: string; member_count?: number };

function ExplorarTab({ events, user }: { events: EventCard[]; user: UserProfile }) {
  const [q, setQ] = useState("");
  const [featuredClubs, setFeaturedClubs] = useState<ClubFull[]>([]);

  useEffect(() => {
    supabase
      .from("clubs")
      .select("id,name,avatar_url,accent_color,category,description")
      .limit(10)
      .then(({ data }) => setFeaturedClubs(data || []));
  }, []);

  const isSearching = q.length > 0;
  const searchResults = events.filter(e =>
    e.title.toLowerCase().includes(q.toLowerCase()) ||
    e.club_name.toLowerCase().includes(q.toLowerCase()) ||
    (e.address_neighborhood || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* search */}
      <div style={{ padding: "16px 20px 12px" }}>
        <input
          className="in"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="busca por nome, clube ou bairro…"
        />
      </div>

      {isSearching ? (
        <div style={{ padding: "0 20px" }}>
          {searchResults.length === 0
            ? <p style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 12, color: "var(--fg3)" }}>nenhum resultado</p>
            : searchResults.map(ev => <EventSmallCard key={ev.id} ev={ev} />)
          }
        </div>
      ) : (
        <>
          {/* ── Eventos Populares ── */}
          <div style={{ padding: "4px 20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
              <div>
                {user.city && (
                  <div style={{
                    fontFamily: "'Sometype Mono',monospace",
                    fontSize: 11, color: "var(--fg3)",
                    textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2,
                  }}>
                    {user.city}
                  </div>
                )}
                <div style={{
                  fontFamily: "'Poppins',sans-serif",
                  fontWeight: 800, fontSize: 18, color: "var(--ink)",
                }}>
                  Eventos Populares
                </div>
              </div>
              <span style={{
                fontFamily: "'Sometype Mono',monospace",
                fontSize: 11, color: "var(--fg3)", cursor: "pointer",
              }}>
                Ver Todos &gt;
              </span>
            </div>
            {events.slice(0, 5).map(ev => <EventSmallCard key={ev.id} ev={ev} />)}
          </div>

          {/* ── Navegar por Categoria ── */}
          <div style={{ padding: "24px 20px 0" }}>
            <div style={{
              fontFamily: "'Poppins',sans-serif",
              fontWeight: 800, fontSize: 18, color: "var(--ink)", marginBottom: 14,
            }}>
              Navegar por Categoria
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 999,
                  border: "2px solid var(--ink)", background: "#fff",
                  fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                  fontSize: 13, color: "var(--ink)", cursor: "pointer",
                  boxShadow: "2px 2px 0 var(--ink)",
                }}>
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Cidades ── */}
          <div style={{ padding: "24px 0 0" }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "0 20px", marginBottom: 14,
            }}>
              <div style={{
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 800, fontSize: 18, color: "var(--ink)",
              }}>
                Cidades
              </div>
              <span style={{
                fontFamily: "'Sometype Mono',monospace",
                fontSize: 11, color: "var(--fg3)", cursor: "pointer",
              }}>
                Ver Todos &gt;
              </span>
            </div>
            <div style={{
              display: "flex", gap: 10, overflowX: "auto",
              scrollbarWidth: "none", padding: "0 20px 4px",
            }}>
              {CITIES.map(city => (
                <div key={city.name} style={{
                  flexShrink: 0, width: 130, height: 86, borderRadius: 18,
                  background: `linear-gradient(135deg, ${city.grad[0]}, ${city.grad[1]})`,
                  border: "2.5px solid var(--ink)",
                  boxShadow: "3px 3px 0 var(--ink)",
                  position: "relative", overflow: "hidden",
                  display: "flex", alignItems: "flex-end", cursor: "pointer",
                }}>
                  <div style={{
                    width: "100%", padding: "8px 10px",
                    background: "linear-gradient(transparent, rgba(0,0,0,.45))",
                    fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                    fontSize: 12, color: "#fff", lineHeight: 1.3,
                  }}>
                    {city.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Clubes em Destaque ── */}
          <div style={{ padding: "24px 20px 0" }}>
            <div style={{
              fontFamily: "'Poppins',sans-serif",
              fontWeight: 800, fontSize: 18, color: "var(--ink)", marginBottom: 14,
            }}>
              Clubes em Destaque
            </div>
            {featuredClubs.length === 0 ? (
              <p style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 12, color: "var(--fg3)" }}>
                nenhum clube ainda
              </p>
            ) : (
              featuredClubs.map(club => (
                <Link key={club.id} to="/clube/$id" params={{ id: club.id }} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", gap: 12, alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1.5px solid rgba(26,22,51,.08)",
                  }}>
                    {/* avatar */}
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: club.accent_color || "var(--pink)",
                      border: "2px solid var(--ink)", overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {club.avatar_url
                        ? <img src={club.avatar_url} alt={club.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>
                            {initials(club.name)}
                          </span>
                      }
                    </div>
                    {/* info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                        fontSize: 15, color: "var(--ink)", marginBottom: 3,
                      }}>
                        {club.name}
                      </div>
                      {club.description && (
                        <div style={{
                          fontFamily: "'Sometype Mono',monospace",
                          fontSize: 11, color: "var(--fg3)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {club.description}
                        </div>
                      )}
                      {club.category && (
                        <div style={{
                          fontFamily: "'Sometype Mono',monospace",
                          fontSize: 10, color: "var(--fg3)", marginTop: 2,
                          textTransform: "uppercase", letterSpacing: ".04em",
                        }}>
                          {club.category}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function IngressosTab({ userId }: { userId: string }) {
  const [rsvps, setRsvps] = useState<(EventCard & { rsvp_status: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("status, event_id, events(id,title,starts_at,cover_url,address_neighborhood,price,tags,club_id,clubs(name,avatar_url,accent_color))")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      const mapped = (data || []).map((r: any) => {
        const ev = r.events;
        const club = ev?.clubs;
        return {
          id: ev?.id, title: ev?.title, starts_at: ev?.starts_at,
          cover_url: ev?.cover_url, address_neighborhood: ev?.address_neighborhood,
          price: ev?.price, tags: ev?.tags, club_id: ev?.club_id,
          club_name: club?.name || "clube",
          club_avatar: club?.avatar_url, accent_color: club?.accent_color,
          rsvp_status: r.status,
        };
      }).filter(r => r.id);

      setRsvps(mapped);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <Loading label="carregando ingressos…" />;

  return (
    <div style={{ padding: "20px", paddingBottom: 80 }}>
      <h2 style={{
        fontFamily: "'Lilita One',cursive",
        fontSize: 24, color: "var(--ink)",
        marginBottom: 20, textTransform: "lowercase",
      }}>
        meus rolês
      </h2>
      {rsvps.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🎟️</p>
          <p style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 700,
            fontSize: 16, color: "var(--ink)", marginBottom: 6,
          }}>
            você ainda não confirmou em nenhum rolê
          </p>
          <p style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 12, color: "var(--fg3)",
          }}>
            encontra um evento na home e confirma presença
          </p>
        </div>
      ) : (
        rsvps.map(ev => (
          <div key={ev.id} style={{ position: "relative" }}>
            <EventSmallCard ev={ev} />
            <span style={{
              position: "absolute", top: 16, right: 0,
              fontFamily: "'Sometype Mono',monospace",
              fontSize: 10, fontWeight: 700,
              color: ev.rsvp_status === "confirmed" ? "#16a34a" : "var(--fg3)",
              background: ev.rsvp_status === "confirmed" ? "#dcfce7" : "#f1f5f9",
              padding: "2px 8px", borderRadius: 999,
            }}>
              {ev.rsvp_status === "confirmed" ? "✓ confirmado" : ev.rsvp_status}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function PerfilTab({ user, onSignOut }: { user: UserProfile; onSignOut: () => void }) {
  return (
    <div style={{ padding: "20px", paddingBottom: 80 }}>
      <Link to="/perfil/$id" params={{ id: user.id }} style={{ textDecoration: "none" }}>
        <div style={{
          background: "#fff", border: "2.5px solid var(--ink)",
          borderRadius: 20, boxShadow: "4px 4px 0 var(--ink)",
          overflow: "hidden", marginBottom: 16,
        }}>
          <div style={{
            height: 80,
            background: "linear-gradient(135deg, var(--pink), var(--purple))",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", bottom: -24, left: 16,
              width: 56, height: 56, borderRadius: "50%",
              border: "3px solid #fff",
              background: user.avatar_url ? `url(${user.avatar_url}) center/cover` : "var(--pink)",
              boxShadow: "0 0 0 2px var(--ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {!user.avatar_url && (
                <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 20, color: "#fff" }}>
                  {user.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div style={{ padding: "32px 16px 16px" }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>{user.name}</div>
            {user.city && <div style={{ fontFamily: "'Sometype Mono',monospace", fontSize: 11, color: "var(--fg3)", marginTop: 2 }}>📍 {user.city}</div>}
            <div style={{ marginTop: 10, fontFamily: "'Sometype Mono',monospace", fontSize: 11, color: "var(--pink)", fontWeight: 700 }}>
              ver perfil completo →
            </div>
          </div>
        </div>
      </Link>
      <div className="stack" style={{ gap: 10 }}>
        <button className="btn ghost full" onClick={onSignOut}>sair da conta</button>
      </div>
    </div>
  );
}

// ─── bottom nav ───────────────────────────────────────────────────────────────
function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: string }[] = [
    { id: "home", label: "início", icon: "🏠" },
    { id: "explorar", label: "explorar", icon: "🔍" },
    { id: "ingressos", label: "ingressos", icon: "🎟️" },
    { id: "perfil", label: "perfil", icon: "👤" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: 64, background: "#fff",
      borderTop: "2px solid var(--ink)",
      display: "flex", alignItems: "center",
      zIndex: 100,
    }}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          style={{
            flex: 1, height: "100%", border: "none",
            background: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
          }}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{
            fontFamily: "'Sometype Mono',monospace",
            fontSize: 9, letterSpacing: ".06em",
            color: tab === item.id ? "var(--pink)" : "var(--fg3)",
            fontWeight: tab === item.id ? 700 : 400,
            textTransform: "uppercase",
          }}>
            {item.label}
          </span>
          {tab === item.id && (
            <div style={{
              position: "absolute", bottom: 0,
              width: 32, height: 3, borderRadius: "3px 3px 0 0",
              background: "var(--pink)",
            }} />
          )}
        </button>
      ))}
    </nav>
  );
}

// ─── top bar ──────────────────────────────────────────────────────────────────
function TopBar({ user }: { user: UserProfile }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "var(--cream)",
      borderBottom: "2px solid var(--ink)",
      padding: "12px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{
        fontFamily: "'Lilita One',cursive",
        fontSize: 26, color: "var(--pink)", lineHeight: 1,
        textTransform: "lowercase",
      }}>
        afora
      </span>
      <Avatar url={user.avatar_url} name={user.name} size={34} />
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
function HomePage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data: u } = await supabase
        .from("users")
        .select("id,name,avatar_url,city,interests")
        .eq("id", uid)
        .single();
      if (u) setUser(u);

      const { data: evData } = await supabase
        .from("events")
        .select("id,title,starts_at,cover_url,address_neighborhood,price,tags,club_id,clubs(name,avatar_url,accent_color)")
        .neq("status", "cancelled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(30);

      setEvents((evData || []).map((e: any) => ({
        id: e.id, title: e.title, starts_at: e.starts_at,
        cover_url: e.cover_url, address_neighborhood: e.address_neighborhood,
        price: e.price, tags: e.tags, club_id: e.club_id,
        club_name: e.clubs?.name || "clube",
        club_avatar: e.clubs?.avatar_url,
        accent_color: e.clubs?.accent_color,
      })));

      const { data: membData } = await supabase
        .from("memberships")
        .select("club_id,clubs(id,name,avatar_url,accent_color,category)")
        .eq("user_id", uid)
        .eq("status", "active");

      setClubs((membData || []).map((m: any) => ({
        id: m.clubs?.id, name: m.clubs?.name || "clube",
        avatar_url: m.clubs?.avatar_url,
        accent_color: m.clubs?.accent_color,
        category: m.clubs?.category,
      })).filter(c => c.id));

      setLoading(false);
    })();
  }, [uid]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading || !user) {
    return (
      <div style={{ background: "var(--cream)", minHeight: "100dvh" }}>
        <Loading label="carregando rolês…" />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--cream)", minHeight: "100dvh" }}>
      <TopBar user={user} />

      {tab === "home" && (
        <HomeTab
          user={user}
          events={events}
          clubs={clubs}
          activeFilter={filter}
          onFilter={setFilter}
        />
      )}
      {tab === "explorar" && <ExplorarTab events={events} user={user} />}
      {tab === "ingressos" && <IngressosTab userId={uid!} />}
      {tab === "perfil" && <PerfilTab user={user} onSignOut={signOut} />}

      <BottomNav tab={tab} onChange={(t) => {
        if (t === "perfil" && uid) { navigate({ to: "/perfil/$id", params: { id: uid } }); return; }
        setTab(t);
      }} />
    </div>
  );
}