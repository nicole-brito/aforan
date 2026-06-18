import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { AppBar, Stat, GapBar, Loading, Empty } from "@/components/afora-ui";
import { isPast, fmtDateTime, relDay, attendanceRate } from "@/lib/afora";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "afora · painel do clube" },
      { name: "description", content: "veja seus clubes, próximos rolês e taxa de presença." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useSession();
  const me = session!.user.id;
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<any[]>([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data: mem } = await supabase
      .from("memberships")
      .select("club_id, role")
      .eq("user_id", me)
      .in("role", ["host", "admin"]);
    const clubIds = (mem || []).map((m: any) => m.club_id);
    if (!clubIds.length) {
      setLoading(false);
      return;
    }

    const { data: cl } = await supabase.from("clubs").select("*").in("id", clubIds);
    const { data: ev } = await supabase.from("events").select("*").in("club_id", clubIds);
    const eventIds = (ev || []).map((e: any) => e.id);
    const { data: rs } = eventIds.length
      ? await supabase
          .from("rsvps")
          .select("user_id, event_id, status, checked_in_at")
          .in("event_id", eventIds)
      : { data: [] as any[] };

    setClubs(cl || []);
    setEvents(ev || []);
    setRsvps(rs || []);
    setLoading(false);
  }

  const model = useMemo(() => buildModel(clubs, events, rsvps), [clubs, events, rsvps]);

  if (loading) return <Loading label="puxando teus clubes…" />;

  return (
    <>
      <AppBar
        right={
          <button className="btn sm ghost" onClick={() => supabase.auth.signOut()}>
            sair
          </button>
        }
      />
      <div className="shell">
        {!clubs.length ? (
          <div style={{ marginTop: 24 }}>
            <Empty title="você ainda não cuida de nenhum clube">
              abre o seu primeiro clube e comece a marcar rolês.
            </Empty>
            <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
              <button className="btn yellow" onClick={() => nav({ to: "/clube/novo" })}>
                + novo clube
              </button>
            </div>
          </div>
        ) : (
          <>
            <section
              className="card reveal"
              style={{ marginTop: 16, background: "var(--ink)", color: "var(--cream)", border: "none" }}
            >
              <span className="eyebrow" style={{ color: "var(--yellow)" }}>
                o abismo da presença
              </span>
              <div className="row between" style={{ marginTop: 14, marginBottom: 14 }}>
                <Stat num={model.totals.confirmou} label="confirmaram" accent="var(--pink-soft)" />
                <span className="stat-num" style={{ color: "var(--cream)", opacity: 0.3 }}>→</span>
                <Stat num={model.totals.apareceu} label="apareceram" accent="var(--lime)" />
                <Stat
                  num={model.totals.taxa != null ? model.totals.taxa + "%" : "—"}
                  label="taxa real"
                  accent="var(--yellow)"
                />
              </div>
              <p className="lead" style={{ color: "rgba(255,246,228,.7)", fontSize: 13 }}>
                {model.totals.taxa != null
                  ? `entre quem confirmou em rolês que já passaram, ${model.totals.taxa}% apareceu de verdade. é esse número que a gente cuida.`
                  : "ainda não rolou nenhum evento passado pra medir. cria o primeiro e marca o check-in."}
              </p>
            </section>

            <div className="row between" style={{ marginTop: 28, marginBottom: 12 }}>
              <h2 className="title">próximos rolês</h2>
              <button className="btn sm yellow" onClick={() => nav({ to: "/evento/novo" })}>
                + novo rolê
              </button>
            </div>

            {model.upcoming.length === 0 && (
              <div className="card flat" style={{ borderStyle: "dashed" }}>
                <p className="lead">
                  nada marcado ainda. <b>+ novo rolê</b> pra abrir o próximo.
                </p>
              </div>
            )}

            <div className="stack" style={{ gap: 12 }}>
              {model.upcoming.map((ev: any) => (
                <div
                  key={ev.id}
                  className="card tap reveal"
                  onClick={() => nav({ to: "/evento/$id", params: { id: ev.id } })}
                >
                  <div className="row between wrap" style={{ gap: 8 }}>
                    <div className="stack" style={{ gap: 4 }}>
                      <span className="eyebrow">
                        {ev.clubName} · {relDay(ev.starts_at)}
                      </span>
                      <h2 className="title" style={{ fontSize: 20 }}>{ev.title}</h2>
                      <span className="mono" style={{ fontSize: 12, color: "var(--fg3)" }}>
                        {fmtDateTime(ev.starts_at)} · {ev.address_neighborhood}
                      </span>
                    </div>
                    <span className="tag pink">{ev.confirmou} confirmadas</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="row between" style={{ marginTop: 30, marginBottom: 12 }}>
              <h2 className="title">seus clubes</h2>
              <button className="btn sm" onClick={() => nav({ to: "/clube/novo" })}>
                + novo clube
              </button>
            </div>
            <div className="stack" style={{ gap: 12 }}>
              {model.clubCards.map((c: any) => (
                <div
                  key={c.id}
                  className="card tap reveal"
                  onClick={() => nav({ to: "/clube/$id", params: { id: c.id } })}
                >
                  <div className="row between" style={{ marginBottom: 10 }}>
                    <h2 className="title" style={{ fontSize: 20 }}>{c.name}</h2>
                    <span className="tag ghost">{c.category}</span>
                  </div>

                  {c.pastConfirmou > 0 ? (
                    <>
                      <GapBar confirmou={c.pastConfirmou} apareceu={c.pastApareceu} />
                      <div className="row between" style={{ marginTop: 14 }}>
                        <Stat num={c.taxa != null ? c.taxa + "%" : "—"} label="presença" accent="var(--pink-deep)" />
                        <Stat num={c.segundaVisita} label="2ª visita +" accent="var(--ink)" />
                        <Stat num={c.daCasa} label="da casa" accent="var(--orange)" />
                      </div>
                    </>
                  ) : (
                    <p className="lead">
                      sem rolê passado ainda — os números aparecem depois do primeiro check-in.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function buildModel(clubs: any[], events: any[], rsvps: any[]) {
  const byEvent: Record<string, any[]> = {};
  for (const r of rsvps) (byEvent[r.event_id] ||= []).push(r);
  const clubName = Object.fromEntries(clubs.map((c) => [c.id, c.name]));

  const upcoming = events
    .filter((e) => !isPast(e) && e.status !== "cancelled")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .map((e) => ({
      ...e,
      clubName: clubName[e.club_id],
      confirmou: (byEvent[e.id] || []).filter((r) => r.status === "confirmed").length,
    }));

  let tConf = 0;
  let tApp = 0;
  for (const e of events) {
    if (!isPast(e)) continue;
    for (const r of byEvent[e.id] || []) {
      if (r.status === "cancelled") continue;
      tConf++;
      if (r.checked_in_at) tApp++;
    }
  }

  const clubCards = clubs.map((c) => {
    const cEvents = events.filter((e) => e.club_id === c.id);
    const pastEvents = cEvents.filter(isPast);
    let pc = 0;
    let pa = 0;
    const appearancesByUser: Record<string, number> = {};
    for (const e of pastEvents) {
      for (const r of byEvent[e.id] || []) {
        if (r.status === "cancelled") continue;
        pc++;
        if (r.checked_in_at) {
          pa++;
          appearancesByUser[r.user_id] = (appearancesByUser[r.user_id] || 0) + 1;
        }
      }
    }
    const counts = Object.values(appearancesByUser);
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      pastConfirmou: pc,
      pastApareceu: pa,
      taxa: attendanceRate(pc, pa),
      segundaVisita: counts.filter((n) => n >= 2).length,
      daCasa: counts.filter((n) => n >= 3).length,
    };
  });

  return {
    upcoming,
    totals: { confirmou: tConf, apareceu: tApp, taxa: attendanceRate(tConf, tApp) },
    clubCards,
  };
}
