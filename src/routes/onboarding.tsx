import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

// ── types ─────────────────────────────────────────────────────────────────────
type ProfileDraft = {
  step: number; display_name: string;
  social_energy: number; group_size: string;
  current_obsession: string; unfulfilled_wish: string;
  interests: string[]; custom_interests: string[];
  hot_takes: Record<string, string>; hot_takes_why: Record<string, string>;
  avoid_types: string[]; accessibility_note: string;
};
const EMPTY: ProfileDraft = {
  step: 1, display_name: "", social_energy: 50, group_size: "",
  current_obsession: "", unfulfilled_wish: "", interests: [], custom_interests: [],
  hot_takes: {}, hot_takes_why: {}, avoid_types: [], accessibility_note: "",
};
const KEY = "afora_onboarding_draft";

const INTERESTS = [
  "corrida","caminhada","leitura","cinema","séries","cozinhar","comer fora",
  "plantas","cerâmica","pintura","escrita","política","dança","jogos",
  "música ao vivo","museu","bordado","crochê","fotografia","astrologia",
  "terapia","feminismo","arquitetura","moda","skate","yoga","pilates",
  "boulder","natação","bike",
];
const AVOID = [
  "termina muito tarde","envolve álcool","muito grande","muito íntimo",
  "competitivo","muito caro","precisa de roupa específica","lugar barulhento",
  "nada disso, topo tudo",
];
const HOT: { id: string; a: string; b: string }[] = [
  { id: "cafe",   a: "café",          b: "matcha" },
  { id: "midia",  a: "livro",         b: "podcast" },
  { id: "plan",   a: "planejar",      b: "improvisar" },
  { id: "hora",   a: "10 min antes",  b: "na hora certa" },
  { id: "conv",   a: "conversa\nprofunda com 1", b: "papo solto\ncom vários" },
];

// ── design tokens ─────────────────────────────────────────────────────────────
const S = {
  pill: (on: boolean, color = "#FF4FA3"): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 999,
    border: `2px solid ${on ? color : "var(--ink)"}`,
    background: on ? color : "#fff",
    color: on ? (color === "#FFD63A" || color === "#B6F04C" ? "var(--ink)" : "#fff") : "var(--ink)",
    fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 13,
    cursor: "pointer", transition: "all .15s",
  }),
  mono: (size = 11): React.CSSProperties => ({
    fontFamily: "'Sometype Mono',monospace", fontSize: size,
  }),
  pop: "'Poppins',sans-serif",
  ink: "var(--ink)",
};

// ── atoms ─────────────────────────────────────────────────────────────────────
function PixelBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 5, background: "rgba(26,22,51,.1)" }}>
      <div style={{ height: "100%", width: `${Math.min(100, ((step - 1) / total) * 100)}%`, background: "linear-gradient(90deg,#FF4FA3,#FFD63A)", transition: "width .4s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={S.pill(on)}>{label}</button>;
}

function Wrap({ children, title, sub }: { children: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px 32px" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <h1 style={{ fontFamily: S.pop, fontWeight: 800, fontSize: 28, color: S.ink, margin: "0 0 6px", lineHeight: 1.2 }}>{title}</h1>
        {sub && <p style={{ fontFamily: S.pop, fontSize: 14, color: "rgba(26,22,51,.5)", margin: "0 0 24px", lineHeight: 1.5 }}>{sub}</p>}
        {children}
      </div>
    </div>
  );
}

function TextArea({ value, onChange, placeholder, max }: { value: string; onChange: (v: string) => void; placeholder?: string; max?: number }) {
  return (
    <div style={{ position: "relative" }}>
      <textarea value={value} onChange={e => onChange(e.target.value.slice(0, max || 9999))}
        placeholder={placeholder} rows={3}
        className="in" style={{ resize: "none", lineHeight: 1.5, boxSizing: "border-box" as const }} />
      {max && <div style={{ position: "absolute", bottom: 10, right: 12, ...S.mono(10), color: max - value.length < 20 ? "#FF7A2A" : "rgba(26,22,51,.35)" }}>{max - value.length}</div>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ ...S.mono(11), fontWeight: 700, color: "rgba(26,22,51,.45)", textTransform: "uppercase" as const, letterSpacing: ".08em", display: "block", marginBottom: 8 }}>{children}</label>;
}

// ── main ──────────────────────────────────────────────────────────────────────
function OnboardingPage() {
  const { session } = useSession();
  const nav = useNavigate();
  const [draft, setDraftRaw] = useState<ProfileDraft>(() => {
    try { const s = localStorage.getItem(KEY); return s ? { ...EMPTY, ...JSON.parse(s) } : EMPTY; }
    catch { return EMPTY; }
  });
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const _timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set(fn: (d: ProfileDraft) => ProfileDraft) {
    setDraftRaw(prev => { const next = fn(prev); localStorage.setItem(KEY, JSON.stringify(next)); return next; });
  }
  function go(step: number) { set(d => ({ ...d, step })); window.scrollTo({ top: 0, behavior: "smooth" }); }

  const TOTAL = 6;

  async function finish() {
    setSaving(true);
    const profile = { display_name: draft.display_name, social_energy: draft.social_energy, group_size: draft.group_size, current_obsession: draft.current_obsession, unfulfilled_wish: draft.unfulfilled_wish, interests: [...draft.interests, ...draft.custom_interests], hot_takes: draft.hot_takes, hot_takes_why: draft.hot_takes_why, avoid_types: draft.avoid_types, accessibility_note: draft.accessibility_note, onboarding_done: true };
    await supabase.from("users").update({ name: draft.display_name, profile }).eq("id", session!.user.id);
    localStorage.removeItem(KEY);
    setSaving(false);
    nav({ to: "/home" });
  }

  // ── step 1 ─────────────────────────────────────────────────────────────────
  if (draft.step === 1) return (
    <>
      <PixelBar step={1} total={TOTAL} />
      <Wrap title="como a gente te chama?" sub="nome ou apelido, o que for. depois você muda se quiser.">
        <div style={{ marginBottom: 20 }}>
          <Label>seu nome ou apelido</Label>
          <input value={draft.display_name} onChange={e => set(d => ({ ...d, display_name: e.target.value }))}
            placeholder="meu nome é [x] mas pode me chamar de [y]" autoFocus
            className="in" />
        </div>
        <button disabled={!draft.display_name.trim()} onClick={() => go(2)} className="btn full">
          próximo →
        </button>
      </Wrap>
    </>
  );

  // ── step 2 ─────────────────────────────────────────────────────────────────
  if (draft.step === 2) return (
    <>
      <PixelBar step={2} total={TOTAL} />
      <Wrap title="como você tá hoje">
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontFamily: S.pop, fontWeight: 700, fontSize: 15, color: S.ink, margin: "0 0 16px" }}>energia social agora</p>
          <input type="range" min={0} max={100} value={draft.social_energy}
            onChange={e => set(d => ({ ...d, social_energy: Number(e.target.value) }))}
            style={{ width: "100%", accentColor: "#FF4FA3", cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ ...S.mono(11), color: "rgba(26,22,51,.45)" }}>recolhida</span>
            <span style={{ ...S.mono(11), color: "#FF4FA3", fontWeight: 700 }}>
              {draft.social_energy < 30 ? "recolhida hoje" : draft.social_energy > 70 ? "tô afim de gente!" : "no meio-campo"}
            </span>
            <span style={{ ...S.mono(11), color: "rgba(26,22,51,.45)" }}>querendo gente</span>
          </div>
          <p style={{ fontFamily: S.pop, fontSize: 12, color: "rgba(26,22,51,.4)", margin: "8px 0 0", textAlign: "center" }}>captura o estado de hoje, não quem você é. pode mudar.</p>
        </div>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontFamily: S.pop, fontWeight: 700, fontSize: 15, color: S.ink, margin: "0 0 14px" }}>tamanho de rolê que te deixa confortável</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[{ id: "2-3", l: "2 a 3 pessoas", s: "bem íntimo" }, { id: "4-6", l: "4 a 6 pessoas", s: "grupo pequeno" }, { id: "7-12", l: "7 a 12 pessoas", s: "grupo médio" }, { id: "qualquer", l: "tanto faz", s: "depende do dia" }].map(o => (
              <button key={o.id} onClick={() => set(d => ({ ...d, group_size: o.id }))}
                style={{ padding: "14px 18px", border: `2px solid ${draft.group_size === o.id ? "#FF4FA3" : "var(--ink)"}`, borderRadius: 14, background: draft.group_size === o.id ? "#FF4FA3" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all .15s" }}>
                <span style={{ fontFamily: S.pop, fontWeight: 700, fontSize: 15, color: draft.group_size === o.id ? "#fff" : S.ink }}>{o.l}</span>
                <span style={{ ...S.mono(11), color: draft.group_size === o.id ? "rgba(255,255,255,.75)" : "rgba(26,22,51,.4)" }}>{o.s}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => go(1)} className="btn ghost" style={{ flex: 1 }}>← voltar</button>
          <button disabled={!draft.group_size} onClick={() => go(3)} className="btn" style={{ flex: 1 }}>próximo →</button>
        </div>
      </Wrap>
    </>
  );

  // ── step 3 ─────────────────────────────────────────────────────────────────
  if (draft.step === 3) {
    const ok = !!(draft.current_obsession.trim() || draft.unfulfilled_wish.trim());
    return (
      <>
        <PixelBar step={3} total={TOTAL} />
        <Wrap title="o que tá rolando na sua cabeça">
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: S.pop, fontWeight: 700, fontSize: 15, color: S.ink, margin: "0 0 6px" }}>o que você não consegue calar a boca sobre agora?</p>
            <p style={{ fontFamily: S.pop, fontSize: 13, color: "rgba(26,22,51,.45)", margin: "0 0 12px" }}>pode ser série, livro, esporte, uma teoria maluca, uma fixação aleatória.</p>
            <TextArea value={draft.current_obsession} onChange={v => set(d => ({ ...d, current_obsession: v }))} max={140} placeholder="tô obcecada com…" />
          </div>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: S.pop, fontWeight: 700, fontSize: 15, color: S.ink, margin: "0 0 6px" }}>uma coisa que você quer fazer e ainda não fez</p>
            <p style={{ fontFamily: S.pop, fontSize: 13, color: "rgba(26,22,51,.45)", margin: "0 0 12px" }}>pequena ou grande, qualquer escala.</p>
            <TextArea value={draft.unfulfilled_wish} onChange={v => set(d => ({ ...d, unfulfilled_wish: v }))} max={140} placeholder="um dia eu quero…" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => go(2)} className="btn ghost" style={{ flex: 1 }}>← voltar</button>
            <button onClick={() => go(4)} className="btn" style={{ flex: 1 }}>próximo →</button>
          </div>
        </Wrap>
      </>
    );
  }

  // ── step 4 ─────────────────────────────────────────────────────────────────
  if (draft.step === 4) {
    const all = [...INTERESTS, ...draft.custom_interests];
    const toggle = (t: string) => set(d => ({ ...d, interests: d.interests.includes(t) ? d.interests.filter(x => x !== t) : [...d.interests, t] }));
    const addCustom = () => {
      const v = customInput.trim().toLowerCase();
      if (v && !all.includes(v)) { set(d => ({ ...d, custom_interests: [...d.custom_interests, v], interests: [...d.interests, v] })); setCustomInput(""); setShowCustom(false); }
    };
    const ok = draft.interests.length >= 3;
    return (
      <>
        <PixelBar step={4} total={TOTAL} />
        <Wrap title="o que te interessa" sub="escolhe quantas quiser — ou adiciona o seu. mínimo 3.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {all.map(t => <Chip key={t} label={t} on={draft.interests.includes(t)} onClick={() => toggle(t)} />)}
            {showCustom ? (
              <div style={{ display: "flex", gap: 6, width: "100%", marginTop: 4 }}>
                <input autoFocus value={customInput} onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustom()} placeholder="seu interesse…"
                  style={{ flex: 1, padding: "7px 14px", border: "2px solid #FF4FA3", borderRadius: 999, fontFamily: S.pop, fontSize: 13, outline: "none" }} />
                <button onClick={addCustom} style={{ ...S.pill(true), whiteSpace: "nowrap" }}>ok</button>
              </div>
            ) : (
              <button onClick={() => setShowCustom(true)} style={{ padding: "7px 14px", borderRadius: 999, border: "2px dashed var(--ink)", background: "transparent", color: S.ink, fontFamily: S.pop, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ adicionar</button>
            )}
          </div>
          <div style={{ ...S.mono(11), fontWeight: 700, color: ok ? "#B6F04C" : "rgba(26,22,51,.35)", textAlign: "center", marginBottom: 16 }}>
            {draft.interests.length} selecionados {ok ? "✓" : `· seleciona mais ${3 - draft.interests.length}`}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => go(3)} className="btn ghost" style={{ flex: 1 }}>← voltar</button>
            <button disabled={!ok} onClick={() => go(5)} className="btn" style={{ flex: 1 }}>próximo →</button>
          </div>
        </Wrap>
      </>
    );
  }

  // ── step 5 ─────────────────────────────────────────────────────────────────
  if (draft.step === 5) return (
    <>
      <PixelBar step={5} total={TOTAL} />
      <Wrap title="hot takes" sub="5 escolhas rápidas. toca em 'por quê?' pra elaborar — opcional.">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {HOT.map(ht => {
            const chosen = draft.hot_takes[ht.id];
            const whyOpen = draft.hot_takes_why[ht.id + "_open"] === "1";
            return (
              <div key={ht.id} style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  {(["a", "b"] as const).map((side, i) => (
                    <>
                      {i === 1 && <span style={{ ...S.mono(11), color: "rgba(26,22,51,.3)", fontWeight: 700, textAlign: "center" }}>ou</span>}
                      <button key={side} onClick={() => set(d => ({ ...d, hot_takes: { ...d.hot_takes, [ht.id]: side } }))}
                        style={{ padding: "10px 8px", borderRadius: 10, border: `2px solid ${chosen === side ? "#FF4FA3" : "var(--ink)"}`, background: chosen === side ? "#FF4FA3" : "#fff", color: chosen === side ? "#fff" : S.ink, fontFamily: S.pop, fontWeight: 700, fontSize: 13, cursor: "pointer", lineHeight: 1.3, whiteSpace: "pre-line" as const, textAlign: "center" as const, transition: "all .15s" }}>
                        {ht[side]}
                      </button>
                    </>
                  ))}
                </div>
                {chosen && (
                  !whyOpen
                    ? <button onClick={() => set(d => ({ ...d, hot_takes_why: { ...d.hot_takes_why, [ht.id + "_open"]: "1" } }))} style={{ background: "none", border: "none", ...S.mono(11), color: "rgba(26,22,51,.4)", cursor: "pointer", padding: 0, fontWeight: 700 }}>por quê? +</button>
                    : <input value={draft.hot_takes_why[ht.id] || ""} onChange={e => set(d => ({ ...d, hot_takes_why: { ...d.hot_takes_why, [ht.id]: e.target.value } }))}
                        placeholder="elabora…" autoFocus
                        style={{ width: "100%", padding: "8px 10px", border: "1.5px solid rgba(26,22,51,.2)", borderRadius: 8, fontFamily: S.pop, fontSize: 13, color: S.ink, outline: "none", boxSizing: "border-box" }} />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => go(4)} className="btn ghost" style={{ flex: 1 }}>← voltar</button>
          <button onClick={() => go(6)} className="btn" style={{ flex: 1 }}>
            {HOT.every(h => draft.hot_takes[h.id]) ? "próximo →" : "pular →"}
          </button>
        </div>
      </Wrap>
    </>
  );

  // ── step 6 ─────────────────────────────────────────────────────────────────
  if (draft.step === 6) {
    const toggleAvoid = (opt: string) => {
      if (opt === "nada disso, topo tudo") { set(d => ({ ...d, avoid_types: d.avoid_types.includes(opt) ? [] : [opt] })); return; }
      set(d => ({ ...d, avoid_types: d.avoid_types.includes(opt) ? d.avoid_types.filter(t => t !== opt) : [...d.avoid_types.filter(t => t !== "nada disso, topo tudo"), opt] }));
    };
    return (
      <>
        <PixelBar step={6} total={TOTAL} />
        <Wrap title="o que não rola">
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: S.pop, fontWeight: 700, fontSize: 15, color: S.ink, margin: "0 0 8px" }}>tipo de rolê que não é pra você</p>
            <p style={{ fontFamily: S.pop, fontSize: 13, color: "rgba(26,22,51,.45)", margin: "0 0 14px" }}>opcional. mas nos ajuda a não te mandar coisa que não faz sentido.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AVOID.map(o => <Chip key={o} label={o} on={draft.avoid_types.includes(o)} onClick={() => toggleAvoid(o)} />)}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: S.pop, fontWeight: 700, fontSize: 15, color: S.ink, margin: "0 0 6px" }}>alguma coisa prática que a gente precisa saber?</p>
            <p style={{ fontFamily: S.pop, fontSize: 13, color: "rgba(26,22,51,.45)", margin: "0 0 12px" }}>alimentar, mobilidade, sensorial. fica só com a gente e com o organizador.</p>
            <TextArea value={draft.accessibility_note} onChange={v => set(d => ({ ...d, accessibility_note: v }))} max={200} placeholder="opcional…" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => go(5)} className="btn ghost" style={{ flex: 1 }}>← voltar</button>
            <button onClick={() => go(7)} className="btn" style={{ flex: 1 }}>ver meu perfil →</button>
          </div>
        </Wrap>
      </>
    );
  }

  // ── step 7: preview ────────────────────────────────────────────────────────
  const allTags = [...draft.interests, ...draft.custom_interests];
  const hotAnswered = HOT.filter(h => draft.hot_takes[h.id]);
  const groupLabel: Record<string, string> = { "2-3": "2–3 pessoas", "4-6": "4–6 pessoas", "7-12": "7–12 pessoas", "qualquer": "qualquer tamanho" };
  const energyLabel = draft.social_energy > 70 ? "querendo gente" : draft.social_energy < 30 ? "recolhida" : "no meio-campo";

  return (
    <>
      <PixelBar step={7} total={TOTAL} />
      <div style={{ minHeight: "100dvh", background: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px 40px" }}>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ fontFamily: S.pop, fontWeight: 800, fontSize: 26, color: S.ink, margin: "0 0 6px" }}>é você! ✦</h1>
            <p style={{ fontFamily: S.pop, fontSize: 14, color: "rgba(26,22,51,.5)", margin: 0 }}>esse é o cartão que os seus futuros companheiros de clube vão ver.</p>
          </div>

          {/* card */}
          <div style={{ background: "#fff", border: "3px solid var(--ink)", borderRadius: 20, overflow: "hidden", boxShadow: "6px 6px 0 var(--ink)", marginBottom: 20 }}>
            {/* header gradient */}
            <div style={{ background: "linear-gradient(135deg,#FF4FA3,#FFD63A)", padding: "24px 20px 20px", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,.25)", border: "2.5px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Lilita One',cursive", fontSize: 30, color: "#fff" }}>
                  {draft.display_name.trim()[0]?.toUpperCase() || "✦"}
                </div>
                <div>
                  <h2 style={{ fontFamily: S.pop, fontWeight: 800, fontSize: 22, color: "#fff", margin: 0 }}>{draft.display_name || "você"}</h2>
                </div>
              </div>
              <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#B6F04C", border: "1.5px solid #fff" }} />
                <span style={{ ...S.mono(10), color: "rgba(255,255,255,.85)", fontWeight: 700 }}>{energyLabel}</span>
              </div>
            </div>

            {/* body */}
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {draft.current_obsession && (
                <div>
                  <div style={{ ...S.mono(9), fontWeight: 700, color: "rgba(26,22,51,.4)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>obcecada com</div>
                  <p style={{ fontFamily: S.pop, fontSize: 13, color: S.ink, margin: 0, lineHeight: 1.4 }}>&#8220;{draft.current_obsession}&#8221;</p>
                </div>
              )}
              {draft.unfulfilled_wish && (
                <div>
                  <div style={{ ...S.mono(9), fontWeight: 700, color: "rgba(26,22,51,.4)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>quer fazer</div>
                  <p style={{ fontFamily: S.pop, fontSize: 13, color: S.ink, margin: 0, lineHeight: 1.4 }}>&#8220;{draft.unfulfilled_wish}&#8221;</p>
                </div>
              )}
              {allTags.length > 0 && (
                <div>
                  <div style={{ ...S.mono(9), fontWeight: 700, color: "rgba(26,22,51,.4)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>interesses</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {allTags.slice(0, 8).map(t => <span key={t} style={{ background: "var(--cream)", border: "1.5px solid var(--ink)", borderRadius: 999, padding: "3px 10px", ...S.mono(11), color: S.ink, fontWeight: 700 }}>{t}</span>)}
                    {allTags.length > 8 && <span style={{ ...S.mono(11), color: "rgba(26,22,51,.4)" }}>+{allTags.length - 8}</span>}
                  </div>
                </div>
              )}
              {hotAnswered.length > 0 && (
                <div>
                  <div style={{ ...S.mono(9), fontWeight: 700, color: "rgba(26,22,51,.4)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>hot takes</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {hotAnswered.map(h => {
                      const val = draft.hot_takes[h.id] === "a" ? h.a : h.b;
                      return <span key={h.id} style={{ background: "#FF4FA3", color: "#fff", border: "1.5px solid var(--ink)", borderRadius: 999, padding: "3px 10px", ...S.mono(11), fontWeight: 700 }}>{val.replace("\n", " ")}</span>;
                    })}
                  </div>
                </div>
              )}
              {draft.group_size && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4, borderTop: "1px solid rgba(26,22,51,.07)" }}>
                  <span style={{ ...S.mono(10), fontWeight: 700, color: "rgba(26,22,51,.4)", textTransform: "uppercase" }}>melhor em grupo de</span>
                  <span style={{ background: "#FFD63A", color: S.ink, ...S.mono(11), fontWeight: 700, padding: "2px 10px", borderRadius: 999, border: "1.5px solid var(--ink)" }}>{groupLabel[draft.group_size]}</span>
                </div>
              )}
            </div>
          </div>

          <p style={{ fontFamily: S.pop, fontSize: 12, color: "rgba(26,22,51,.4)", textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
            tudo aqui é editável no perfil, qualquer hora.
          </p>
          <button onClick={finish} disabled={saving} className="btn full" style={{ fontSize: 18 }}>
            {saving ? "salvando…" : "entrar no afora ✦"}
          </button>
        </div>
      </div>
    </>
  );
}
