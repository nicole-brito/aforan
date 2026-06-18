import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppBar, GapBar, Avatar, Loading, Toast } from "@/components/afora-ui";
import { isPast, fmtDateTime, DA_CASA_MIN } from "@/lib/afora";

export const Route = createFileRoute("/evento/$id")({
  head: () => ({
    meta: [
      { title: "check-in · afora" },
      { name: "description", content: "marca quem apareceu no rolê." },
    ],
  }),
  component: CheckIn,
});

function CheckIn() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [daCasa, setDaCasa] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    const { data: ev } = await supabase.from("events").select("*").eq("id", id).single();
    if (!ev) {
      setLoading(false);
      return;
    }
    const { data: cl } = await supabase
      .from("clubs")
      .select("id, name, category")
      .eq("id", ev.club_id)
      .single();

    const { data: rs } = await supabase
      .from("rsvps")
      .select("user_id, status, checked_in_at, created_at, users(name)")
      .eq("event_id", id);

    const { data: clubEvents } = await supabase.from("events").select("id").eq("club_id", ev.club_id);
    const ids = (clubEvents || []).map((e: any) => e.id);
    const { data: clubRsvps } = ids.length
      ? await supabase.from("rsvps").select("user_id, checked_in_at").in("event_id", ids)
      : { data: [] as any[] };
    const counts: Record<string, number> = {};
    for (const r of clubRsvps || [])
      if (r.checked_in_at) counts[r.user_id] = (counts[r.user_id] || 0) + 1;

    setEvent(ev);
    setClub(cl);
    setDaCasa(counts);
    setRows((rs || []).filter((r: any) => r.status !== "cancelled"));
    setLoading(false);
  }

  async function toggle(row: any) {
    if (busy[row.user_id]) return;
    const turningOn = !row.checked_in_at;
    setBusy((b) => ({ ...b, [row.user_id]: true }));
    const next = turningOn ? new Date().toISOString() : null;
    setRows((rs) =>
      rs.map((r) => (r.user_id === row.user_id ? { ...r, checked_in_at: next } : r)),
    );

    const { error } = await supabase
      .from("rsvps")
      .update({ checked_in_at: next })
      .eq("event_id", id)
      .eq("user_id", row.user_id);

    setBusy((b) => ({ ...b, [row.user_id]: false }));
    if (error) {
      setRows((rs) =>
        rs.map((r) =>
          r.user_id === row.user_id ? { ...r, checked_in_at: row.checked_in_at } : r,
        ),
      );
      setToast("não deu pra salvar — tenta de novo");
    } else if (turningOn) {
      const nome = row.users?.name || "alguém";
      setDaCasa((c) => ({ ...c, [row.user_id]: (c[row.user_id] || 0) + 1 }));
      setToast(`${nome} apareceu ✦`);
    } else {
      setDaCasa((c) => ({
        ...c,
        [row.user_id]: Math.max(0, (c[row.user_id] || 1) - 1),
      }));
    }
    setTimeout(() => setToast(""), 1800);
  }

  const counts = useMemo(() => {
    const apareceu = rows.filter((r) => r.checked_in_at).length;
    return { confirmou: rows.length, apareceu };
  }, [rows]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (!!a.checked_in_at !== !!b.checked_in_at) return a.checked_in_at ? 1 : -1;
        return (a.users?.name || "").localeCompare(b.users?.name || "");
      }),
    [rows],
  );

  if (loading) return <Loading label="abrindo o rolê…" />;
  if (!event)
    return (
      <>
        <AppBar />
        <div className="shell">
          <p className="lead" style={{ marginTop: 24 }}>rolê não encontrado.</p>
        </div>
      </>
    );

  const past = isPast(event);

  return (
    <>
      <AppBar
        sub="check-in"
        right={
          <button className="btn sm ghost" onClick={() => nav({ to: "/" })}>
            voltar
          </button>
        }
      />
      <div className="shell" style={{ maxWidth: 620 }}>
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <span className="eyebrow">
            {club?.name} · {past ? "já rolou" : "vem aí"}
          </span>
          <h1 className="title" style={{ fontSize: 30, marginTop: 4 }}>{event.title}</h1>
          <span className="mono" style={{ fontSize: 13, color: "var(--fg3)" }}>
            {fmtDateTime(event.starts_at)} · {event.address_neighborhood}
          </span>
        </div>

        <div className="card" style={{ marginBottom: 8 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <div className="stack">
              <span className="stat-num" style={{ color: "var(--lime)" }}>{counts.apareceu}</span>
              <span className="stat-label">apareceram</span>
            </div>
            <div className="stack center">
              <span className="stat-num" style={{ color: "var(--ink)" }}>
                {counts.confirmou
                  ? Math.round((counts.apareceu / counts.confirmou) * 100)
                  : 0}
                %
              </span>
              <span className="stat-label">presença</span>
            </div>
            <div className="stack" style={{ alignItems: "flex-end" }}>
              <span className="stat-num" style={{ color: "var(--pink-deep)" }}>{counts.confirmou}</span>
              <span className="stat-label">confirmaram</span>
            </div>
          </div>
          <GapBar confirmou={counts.confirmou} apareceu={counts.apareceu} />
        </div>

        <p className="lead center" style={{ margin: "14px 0 18px", fontSize: 13 }}>
          toca no nome conforme a galera chega. {past && "quem ficar sem marcar conta como faltou."}
        </p>

        <div className="stack" style={{ gap: 10 }}>
          {sorted.length === 0 && (
            <p className="lead center">ninguém confirmou ainda.</p>
          )}
          {sorted.map((row) => {
            const here = !!row.checked_in_at;
            const nome = row.users?.name || "sem nome";
            const casa = (daCasa[row.user_id] || 0) >= DA_CASA_MIN;
            return (
              <button
                key={row.user_id}
                onClick={() => toggle(row)}
                className="member"
                style={{
                  textAlign: "left",
                  width: "100%",
                  background: here ? "var(--lime)" : "#fff",
                  opacity: busy[row.user_id] ? 0.6 : 1,
                }}
              >
                <Avatar name={nome} />
                <div className="grow stack" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{nome}</span>
                  <span className="state">
                    <span className={`dot ${here ? "apareceu" : past ? "faltou" : "confirmou"}`} />
                    {here ? "apareceu" : past ? "faltou" : "confirmou"}
                  </span>
                </div>
                {casa && <span className="tag yellow">★ da casa</span>}
                <span
                  className="tag"
                  style={{
                    background: here ? "var(--ink)" : "var(--pink-soft)",
                    color: here ? "var(--cream)" : "var(--ink)",
                  }}
                >
                  {here ? "tá aqui" : "marcar"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {toast && <Toast>{toast}</Toast>}
    </>
  );
}
