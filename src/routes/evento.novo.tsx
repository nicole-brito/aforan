import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { AppBar, Loading } from "@/components/afora-ui";

export const Route = createFileRoute("/evento/novo")({
  head: () => ({
    meta: [
      { title: "novo rolê · afora" },
      { name: "description", content: "marca um novo rolê pro seu clube." },
    ],
  }),
  component: NovoEvento,
});

type Lote = {
  id: string;
  name: string;
  price: string;
  quantity: string;
  deadline: string;
};

function novoLote(index: number): Lote {
  return { id: crypto.randomUUID(), name: `${index}º lote`, price: "", quantity: "", deadline: "" };
}

function NovoEvento() {
  const { session } = useSession();
  const me = session!.user.id;
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // form state
  const [f, setF] = useState({
    club_id: "",
    title: "",
    description: "",
    date: "",
    start_time: "19:00",
    end_time: "21:00",
    neighborhood: "",
    address: "",
    capacity: "",
    price: "0",
    requires_approval: false,
    address_private: false,  // endereço visível só pra quem tem ingresso
    members_only: false,     // rolê visível só pra membros do clube
  });

  // lotes
  const [useLotes, setUseLotes] = useState(false);
  const [lotes, setLotes] = useState<Lote[]>([novoLote(1)]);

  // tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // opções expansíveis
  const [showPrice, setShowPrice] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: mem } = await supabase
        .from("memberships")
        .select("club_id, role")
        .eq("user_id", me)
        .in("role", ["host", "admin"]);
      const ids = (mem || []).map((m: any) => m.club_id);
      const { data: cl } = ids.length
        ? await supabase.from("clubs").select("id, name").in("id", ids)
        : { data: [] as any[] };
      setClubs(cl || []);
      setF((s) => ({ ...s, club_id: cl?.[0]?.id || "" }));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(k: string) {
    return (e: React.ChangeEvent<any>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));
  }

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  // ── lotes helpers ──
  function addLote() {
    setLotes((ls) => [...ls, novoLote(ls.length + 1)]);
  }
  function removeLote(id: string) {
    setLotes((ls) => ls.filter((l) => l.id !== id));
  }
  function setLote(id: string, key: keyof Lote, value: string) {
    setLotes((ls) => ls.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  }

  // ── tags helpers ──
  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9À-ú\s-]/g, "");
    if (!tag || tags.includes(tag)) return;
    setTags((t) => [...t, tag]);
    setTagInput("");
  }
  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((t) => t.slice(0, -1));
    }
  }
  function removeTag(t: string) {
    setTags((ts) => ts.filter((x) => x !== t));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!f.club_id || !f.title.trim() || !f.date || !f.neighborhood.trim()) {
      setErr("faltou clube, nome, data ou bairro.");
      return;
    }
    if (useLotes && lotes.some((l) => !l.name.trim() || !l.price)) {
      setErr("preenche nome e preço em todos os lotes.");
      return;
    }
    setSaving(true);

    let cover_url: string | null = null;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `event-covers/${crypto.randomUUID()}.${ext}`;
      const { data: upData } = await supabase.storage
        .from("events")
        .upload(path, coverFile, { upsert: true });
      if (upData) {
        const { data: pub } = supabase.storage.from("events").getPublicUrl(path);
        cover_url = pub.publicUrl;
      }
    }

    const starts_at = new Date(`${f.date}T${f.start_time || "19:00"}`).toISOString();
    const ends_at = f.end_time
      ? new Date(`${f.date}T${f.end_time}`).toISOString()
      : null;

    // tenta com campos novos; se falhar, faz fallback
    const basePayload = {
      club_id: f.club_id,
      title: f.title.trim(),
      description: f.description.trim() || null,
      address_neighborhood: f.neighborhood.trim(),
      address_full: f.address.trim() || f.neighborhood.trim(),
      starts_at,
      capacity: f.capacity ? Number(f.capacity) : null,
      host_id: me,
      status: "upcoming",
    };

    const richPayload = {
      ...basePayload,
      ends_at,
      cover_url,
      requires_approval: f.requires_approval,
      price: useLotes ? 0 : Number(f.price) || 0,
      tags: tags.length ? tags : null,
      address_private: f.address_private,
      members_only: f.members_only,
    };

    let eventId: string | null = null;

    const { data, error } = await supabase
      .from("events")
      .insert(richPayload)
      .select("id")
      .single();

    if (error) {
      const { data: data2, error: error2 } = await supabase
        .from("events")
        .insert(basePayload)
        .select("id")
        .single();
      if (error2) { setSaving(false); setErr("não rolou salvar: " + error2.message); return; }
      eventId = data2!.id;
    } else {
      eventId = data!.id;
    }

    // salva lotes se houver
    if (useLotes && lotes.length && eventId) {
      await supabase.from("event_batches").insert(
        lotes.map((l, i) => ({
          event_id: eventId,
          name: l.name.trim(),
          price: Number(l.price) || 0,
          quantity: l.quantity ? Number(l.quantity) : null,
          deadline: l.deadline || null,
          order: i + 1,
        }))
      );
    }

    setSaving(false);
    nav({ to: "/evento/$id", params: { id: eventId! } });
  }

  if (loading) return <Loading />;

  const isPago = !useLotes && Number(f.price) > 0;

  return (
    <>
      <AppBar
        sub="novo rolê"
        right={
          <button className="btn sm ghost" onClick={() => nav({ to: "/" })}>
            voltar
          </button>
        }
      />

      <div className="shell" style={{ maxWidth: 900 }}>
        {clubs.length === 0 ? (
          <div style={{ marginTop: 24 }}>
            <div className="card flat" style={{ borderStyle: "dashed" }}>
              <p className="lead">você precisa ser host de um clube pra marcar rolê.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={salvar} style={{ marginTop: 20 }}>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "300px 1fr",
                gap: 20,
                alignItems: "start",
              }}
              className="event-form-grid"
            >

              {/* ── esquerda: capa ── */}
              <div className="stack" style={{ gap: 12 }}>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: "100%",
                    aspectRatio: "4/3",
                    border: "2.5px dashed var(--ink)",
                    borderRadius: 18,
                    background: coverPreview
                      ? "none"
                      : "linear-gradient(135deg, var(--pink-soft) 0%, var(--cyan) 100%)",
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 10,
                    boxShadow: "var(--shadow)",
                    transition: "transform .12s var(--bounce), box-shadow .12s var(--bounce)",
                  }}
                >
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="capa"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: 36 }}>🖼️</span>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink)", fontWeight: 700, textAlign: "center", padding: "0 16px" }}>
                        adicionar capa
                      </span>
                    </>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCover} />
                {coverPreview && (
                  <button type="button" className="btn sm ghost" onClick={() => { setCoverPreview(null); setCoverFile(null); }}>
                    remover capa
                  </button>
                )}
              </div>

              {/* ── direita: campos ── */}
              <div className="card stack" style={{ gap: 0, padding: 0, overflow: "hidden" }}>

                {/* clube */}
                <div style={{ borderBottom: "2.5px solid var(--ink)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14 }}>📅</span>
                  <select
                    className="in"
                    value={f.club_id}
                    onChange={set("club_id")}
                    style={{ ...inlineInputStyle, fontWeight: 700, fontSize: 14, flex: 1 }}
                  >
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* nome */}
                <div style={{ borderBottom: "2.5px solid var(--ink)", padding: "14px 18px" }}>
                  <input
                    className="in"
                    value={f.title}
                    onChange={set("title")}
                    placeholder="nome do evento"
                    style={{
                      border: "none", boxShadow: "none", background: "transparent",
                      fontSize: 26, fontFamily: "'Lilita One', cursive", fontWeight: 400,
                      height: "auto", padding: 0, textTransform: "lowercase",
                      color: f.title ? "var(--ink)" : "rgba(26,22,51,.3)",
                    }}
                  />
                </div>

                {/* início */}
                <div style={{ borderBottom: "2px solid rgba(26,22,51,.1)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13 }}>🟢</span>
                  <span className="mono" style={{ fontSize: 12, width: 50, color: "var(--fg2)", fontWeight: 700 }}>início</span>
                  <input type="date" className="in" value={f.date} onChange={set("date")} style={inlineInputStyle} />
                  <input type="time" className="in" value={f.start_time} onChange={set("start_time")} style={{ ...inlineInputStyle, width: 90 }} />
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg3)", marginLeft: "auto" }}>GMT-03:00 · São Paulo</span>
                </div>

                {/* fim */}
                <div style={{ borderBottom: "2.5px solid var(--ink)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13 }}>⚪</span>
                  <span className="mono" style={{ fontSize: 12, width: 50, color: "var(--fg2)", fontWeight: 700 }}>fim</span>
                  <input type="date" className="in" value={f.date} onChange={set("date")} style={inlineInputStyle} />
                  <input type="time" className="in" value={f.end_time} onChange={set("end_time")} style={{ ...inlineInputStyle, width: 90 }} />
                </div>

                {/* localização */}
                <div style={{ borderBottom: "2.5px solid var(--ink)", padding: "14px 18px", display: "flex", gap: 10, flexDirection: "column" }}>
                  {/* bairro — sempre público */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>📍</span>
                    <input
                      className="in"
                      value={f.neighborhood}
                      onChange={set("neighborhood")}
                      placeholder="bairro / região (público)"
                      style={{ ...inlineInputStyle, flex: 1, fontWeight: 600 }}
                    />
                  </div>

                  {/* endereço completo + toggle privacidade */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, opacity: 0 }}>📍</span>
                    <input
                      className="in"
                      value={f.address}
                      onChange={set("address")}
                      placeholder="endereço completo (opcional)"
                      style={{ ...inlineInputStyle, flex: 1, color: "var(--fg2)" }}
                    />
                  </div>

                  {/* toggle: endereço privado */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: f.address_private ? "var(--ink)" : "rgba(26,22,51,.05)",
                      border: "2px solid " + (f.address_private ? "var(--ink)" : "rgba(26,22,51,.15)"),
                      marginLeft: 26,
                      transition: "background .15s, border-color .15s",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{f.address_private ? "🔒" : "👁️"}</span>
                    <div className="stack" style={{ gap: 1, flex: 1 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: f.address_private ? "var(--cream)" : "var(--ink)",
                        }}
                      >
                        {f.address_private
                          ? "endereço só pra quem tem ingresso"
                          : "endereço visível pra todo mundo"}
                      </span>
                      <span
                        className="mono"
                        style={{ fontSize: 10, color: f.address_private ? "rgba(255,246,228,.6)" : "var(--fg3)" }}
                      >
                        {f.address_private
                          ? "público vê só o bairro · endereço completo liberado após ingresso"
                          : "qualquer pessoa pode ver o endereço completo"}
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={f.address_private}
                      onChange={(v) => setF((s) => ({ ...s, address_private: v }))}
                    />
                  </div>
                </div>

                {/* descrição */}
                <div style={{ borderBottom: "2.5px solid var(--ink)", padding: "14px 18px", display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 16, marginTop: 2 }}>📝</span>
                  <textarea
                    className="in"
                    value={f.description}
                    onChange={set("description")}
                    placeholder="adicionar descrição"
                    style={{ border: "none", boxShadow: "none", background: "transparent", height: "auto", minHeight: 64, padding: 0, resize: "none", fontSize: 14 }}
                  />
                </div>

                {/* tags */}
                <div style={{ borderBottom: "2.5px solid var(--ink)", padding: "14px 18px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, marginTop: 6 }}>🏷️</span>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        alignItems: "center",
                        minHeight: 36,
                        cursor: "text",
                      }}
                      onClick={() => tagInputRef.current?.focus()}
                    >
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="tag cyan"
                          style={{ fontSize: 12, cursor: "pointer", userSelect: "none" }}
                          onClick={(e) => { e.stopPropagation(); removeTag(t); }}
                        >
                          {t} <span style={{ opacity: 0.5, marginLeft: 2 }}>×</span>
                        </span>
                      ))}
                      <input
                        ref={tagInputRef}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKey}
                        onBlur={() => tagInput && addTag(tagInput)}
                        placeholder={tags.length ? "" : "adicionar tags (enter para confirmar)"}
                        style={{
                          border: "none", outline: "none", background: "transparent",
                          fontSize: 13, color: "var(--ink)", minWidth: 160, flex: 1,
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                    </div>
                  </div>
                  {tags.length === 0 && (
                    <p className="mono" style={{ fontSize: 11, color: "var(--fg3)", marginTop: 4, paddingLeft: 30 }}>
                      ex: corrida · noturno · gratuito · ibirapuera
                    </p>
                  )}
                </div>

                {/* ── opções do evento ── */}
                <div style={{ padding: "14px 18px" }}>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>opções do evento</span>

                  <div className="stack" style={{ gap: 8 }}>

                    {/* ── preço / lotes ── */}
                    <div style={{ border: "2px solid var(--ink)", borderRadius: 12, overflow: "hidden" }}>

                      {/* header do preço */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          background: useLotes ? "var(--yellow)" : isPago ? "var(--yellow)" : "#fff",
                          borderBottom: (showPrice || useLotes) ? "2px solid var(--ink)" : "none",
                        }}
                      >
                        <span>🎫</span>
                        <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>preço do ingresso</span>
                        {/* toggle lotes */}
                        <button
                          type="button"
                          onClick={() => { setUseLotes((v) => !v); setShowPrice(false); }}
                          className="tag"
                          style={{
                            background: useLotes ? "var(--ink)" : "transparent",
                            color: useLotes ? "var(--cream)" : "var(--fg2)",
                            borderStyle: useLotes ? "solid" : "dashed",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          por lotes
                        </button>
                        {!useLotes && (
                          <button
                            type="button"
                            onClick={() => setShowPrice((v) => !v)}
                            style={{ fontSize: 12, color: "var(--fg3)", background: "none", border: "none", cursor: "pointer" }}
                          >
                            {showPrice ? "▲" : "✏️"}
                          </button>
                        )}
                      </div>

                      {/* preço único */}
                      {!useLotes && showPrice && (
                        <div style={{ padding: "12px 14px", background: "#fafafa", display: "flex", gap: 10, alignItems: "center" }}>
                          <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>R$</span>
                          <input
                            type="number"
                            className="in"
                            value={f.price}
                            onChange={set("price")}
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            style={{ height: 38, fontSize: 14 }}
                          />
                          {isPago && (
                            <button type="button" className="btn sm ghost" onClick={() => setF((s) => ({ ...s, price: "0" }))}>
                              gratuito
                            </button>
                          )}
                        </div>
                      )}

                      {/* lotes */}
                      {useLotes && (
                        <div style={{ background: "#fafafa", padding: "12px 14px" }}>
                          <div className="stack" style={{ gap: 10 }}>
                            {lotes.map((lote, i) => (
                              <LoteRow
                                key={lote.id}
                                lote={lote}
                                index={i}
                                onChange={(k, v) => setLote(lote.id, k, v)}
                                onRemove={() => removeLote(lote.id)}
                                canRemove={lotes.length > 1}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            className="btn sm ghost"
                            onClick={addLote}
                            style={{ marginTop: 10, width: "100%" }}
                          >
                            + adicionar lote
                          </button>
                        </div>
                      )}
                    </div>

                    {/* visibilidade: público ou só membros */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        border: "2px solid var(--ink)",
                        borderRadius: 12,
                        background: f.members_only ? "var(--ink)" : "#fff",
                        transition: "background .15s",
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{f.members_only ? "🔐" : "🌎"}</span>
                      <div className="stack" style={{ gap: 1, flex: 1 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: f.members_only ? "var(--cream)" : "var(--ink)" }}>
                          {f.members_only ? "só membros" : "rolê público"}
                        </span>
                        <span style={{ fontSize: 10, color: f.members_only ? "rgba(255,246,228,.6)" : "var(--fg3)" }}>
                          {f.members_only ? "visível somente para membros do clube" : "qualquer pessoa pode ver e se inscrever"}
                        </span>
                      </div>
                      <ToggleSwitch
                        checked={f.members_only}
                        onChange={(v) => setF((s) => ({ ...s, members_only: v }))}
                      />
                    </div>

                    {/* requer aprovação */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        border: "2px solid var(--ink)",
                        borderRadius: 12,
                        background: f.requires_approval ? "var(--pink-soft)" : "#fff",
                      }}
                    >
                      <span>👥</span>
                      <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>requer aprovação</span>
                      <ToggleSwitch
                        checked={f.requires_approval}
                        onChange={(v) => setF((s) => ({ ...s, requires_approval: v }))}
                      />
                    </div>

                    {/* capacidade */}
                    <div style={{ border: "2px solid var(--ink)", borderRadius: 12, overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => setShowCapacity((v) => !v)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          background: f.capacity ? "var(--lime)" : "#fff",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          borderBottom: showCapacity ? "2px solid var(--ink)" : "none",
                        }}
                      >
                        <span>🎟</span>
                        <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>capacidade</span>
                        <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>
                          {f.capacity ? `${f.capacity} vagas` : "ilimitado"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--fg3)" }}>{showCapacity ? "▲" : "✏️"}</span>
                      </button>
                      {showCapacity && (
                        <div style={{ padding: "12px 14px", background: "#fafafa", display: "flex", gap: 10, alignItems: "center" }}>
                          <input
                            type="number"
                            className="in"
                            value={f.capacity}
                            onChange={set("capacity")}
                            min="1"
                            placeholder="∞ ilimitado"
                            style={{ height: 38, fontSize: 14 }}
                          />
                          {f.capacity && (
                            <button type="button" className="btn sm ghost" onClick={() => setF((s) => ({ ...s, capacity: "" }))}>
                              ilimitado
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            </div>

            {err && (
              <p className="mono" style={{ color: "var(--warn)", fontSize: 13, marginTop: 12 }}>{err}</p>
            )}

            <button
              className="btn full"
              type="submit"
              disabled={saving}
              style={{ marginTop: 16, height: 56, fontSize: 17 }}
            >
              {saving ? "criando…" : "criar evento"}
            </button>

          </form>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .event-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

/* ── linha de lote ── */
function LoteRow({
  lote,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  lote: Lote;
  index: number;
  onChange: (k: keyof Lote, v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        border: "2px solid var(--ink)",
        borderRadius: 10,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* header do lote */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          background: "var(--yellow)",
          borderBottom: open ? "2px solid var(--ink)" : "none",
          cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", flex: 1 }}>
          lote {index + 1}
          {lote.name && lote.name !== `${index + 1}º lote` ? ` · ${lote.name}` : ""}
          {lote.price ? ` · R$ ${Number(lote.price).toFixed(2)}` : ""}
          {lote.quantity ? ` · ${lote.quantity} vagas` : " · vagas ilimitadas"}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 14, color: "var(--ink)", opacity: 0.5, padding: "0 4px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
        <span style={{ fontSize: 11, color: "var(--ink)", opacity: 0.4 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* campos do lote */}
      {open && (
        <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="fl" style={{ fontSize: 11 }}>nome</label>
              <input
                className="in"
                value={lote.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder={`${index + 1}º lote`}
                style={{ height: 36, fontSize: 13 }}
              />
            </div>
            <div style={{ width: 110 }}>
              <label className="fl" style={{ fontSize: 11 }}>preço (R$)</label>
              <input
                className="in"
                type="number"
                min="0"
                step="0.01"
                value={lote.price}
                onChange={(e) => onChange("price", e.target.value)}
                placeholder="0,00"
                style={{ height: 36, fontSize: 13 }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="fl" style={{ fontSize: 11 }}>vagas (opcional)</label>
              <input
                className="in"
                type="number"
                min="1"
                value={lote.quantity}
                onChange={(e) => onChange("quantity", e.target.value)}
                placeholder="∞ ilimitado"
                style={{ height: 36, fontSize: 13 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="fl" style={{ fontSize: 11 }}>válido até (opcional)</label>
              <input
                className="in"
                type="date"
                value={lote.deadline}
                onChange={(e) => onChange("deadline", e.target.value)}
                style={{ height: 36, fontSize: 13 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── toggle switch ── */
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ position: "relative", display: "inline-block", width: 44, height: 26, cursor: "pointer", flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
      <span style={{
        position: "absolute", inset: 0,
        background: checked ? "var(--ink)" : "rgba(26,22,51,.15)",
        borderRadius: 999, border: "2px solid var(--ink)", transition: "background .15s",
      }} />
      <span style={{
        position: "absolute", top: 3, left: checked ? 21 : 3, width: 16, height: 16,
        background: checked ? "var(--yellow)" : "#fff",
        borderRadius: 999, border: "2px solid var(--ink)", transition: "left .15s, background .15s",
      }} />
    </label>
  );
}

const inlineInputStyle: React.CSSProperties = {
  border: "none",
  boxShadow: "none",
  background: "transparent",
  height: 32,
  padding: "0 4px",
  fontSize: 13,
  fontWeight: 600,
};
