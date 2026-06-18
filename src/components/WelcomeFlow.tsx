import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── tipos ────────────────────────────────────────────────────────────────────
type View = "splash" | "auth" | "login" | "register" | "onboarding";

// ─── constantes de conteúdo ───────────────────────────────────────────────────
const SPLASH_SLIDES = [
  {
    emoji: "🗓️",
    title: "encontre rolês perto de você",
    sub: "festas, corridas, clubes de leitura — tudo numa só timeline.",
    bg: "var(--pink)",
    textColor: "#fff",
  },
  {
    emoji: "🏃‍♀️",
    title: "entre em clubes que combinam",
    sub: "comunidades de pessoas com os mesmos interesses. sem chat lotado.",
    bg: "var(--yellow)",
    textColor: "var(--ink)",
  },
  {
    emoji: "👯‍♀️",
    title: "veja quem vai",
    sub: "saiba com quem você vai se encontrar antes mesmo de confirmar presença.",
    bg: "var(--cyan)",
    textColor: "var(--ink)",
  },
  {
    emoji: "🔒",
    title: "sua segurança, suas regras",
    sub: "filtros de espaço seguro, controle do que fica visível no seu perfil.",
    bg: "var(--purple)",
    textColor: "#fff",
  },
];

const HOBBIES = [
  { id: "corrida", label: "corrida 🏃" },
  { id: "leitura", label: "leitura 📚" },
  { id: "cafe", label: "café ☕" },
  { id: "yoga", label: "yoga 🧘" },
  { id: "danca", label: "dança 💃" },
  { id: "culinaria", label: "culinária 🍳" },
  { id: "arte", label: "arte 🎨" },
  { id: "musica", label: "música 🎵" },
  { id: "fotografia", label: "fotografia 📸" },
  { id: "teatro", label: "teatro 🎭" },
  { id: "viagem", label: "viagem ✈️" },
  { id: "games", label: "games 🎮" },
  { id: "series", label: "séries 🎬" },
  { id: "natureza", label: "natureza 🌿" },
  { id: "ciclismo", label: "ciclismo 🚴" },
  { id: "natacao", label: "natação 🏊" },
  { id: "vinho", label: "vinho 🍷" },
  { id: "tecnologia", label: "tecnologia 💻" },
  { id: "meditacao", label: "meditação 🧘‍♀️" },
  { id: "voluntariado", label: "voluntariado 🤝" },
];

const SAFETY_OPTIONS = [
  {
    id: "feminino",
    label: "espaços exclusivamente femininos",
    sub: "quero ver e participar de clubes só pra mulheres",
    emoji: "♀️",
  },
  {
    id: "lgbtqia",
    label: "clubes LGBT+ e aliados",
    sub: "quero ver eventos com curadoria pra comunidade LGBTQIA+",
    emoji: "🏳️‍🌈",
  },
];

const PRIVACY_OPTIONS = [
  {
    id: "show_city",
    label: "mostrar minha cidade",
    sub: "aparece no seu perfil público",
    default: true,
  },
  {
    id: "show_lastname",
    label: "mostrar meu sobrenome",
    sub: "outros membros podem ver seu nome completo",
    default: false,
  },
  {
    id: "show_photo_nonmember",
    label: "foto visível para não-membros",
    sub: "quem não está no clube pode ver sua foto",
    default: true,
  },
];

// ─── utilitários ──────────────────────────────────────────────────────────────
function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(dx) > 40) dx < 0 ? onLeft() : onRight();
      startX.current = null;
    },
  };
}

// ─── componentes internos ─────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 22 : 7,
            height: 7,
            borderRadius: 999,
            background: i === current ? "currentColor" : "rgba(0,0,0,.25)",
            transition: "width .25s",
          }}
        />
      ))}
    </div>
  );
}

function OnboardingBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: 4, borderRadius: 999,
            background: i <= step ? "var(--pink)" : "rgba(26,22,51,.12)",
            transition: "background .3s",
          }}
        />
      ))}
    </div>
  );
}

function HobbyChip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "2px solid var(--ink)",
        background: selected ? "var(--pink)" : "#fff",
        color: selected ? "#fff" : "var(--ink)",
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        transition: "background .12s, color .12s, transform .1s",
        transform: selected ? "translate(-1px,-1px)" : "none",
        boxShadow: selected ? "2px 2px 0 var(--ink)" : "1px 1px 0 rgba(26,22,51,.15)",
      }}
    >
      {label}
    </button>
  );
}

function Toggle({
  checked, onChange, label, sub, emoji,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; emoji?: string }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        border: "2px solid var(--ink)",
        borderRadius: 14,
        background: checked ? "var(--pink)" : "#fff",
        cursor: "pointer",
        transition: "background .15s",
      }}
    >
      {emoji && <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>}
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 700, fontSize: 14,
          color: checked ? "#fff" : "var(--ink)",
        }}>{label}</div>
        {sub && (
          <div style={{
            fontSize: 11, marginTop: 2,
            color: checked ? "rgba(255,255,255,.75)" : "var(--fg3)",
          }}>{sub}</div>
        )}
      </div>
      <div style={{
        width: 40, height: 22, borderRadius: 999,
        border: "2px solid " + (checked ? "rgba(255,255,255,.5)" : "var(--ink)"),
        background: checked ? "rgba(255,255,255,.3)" : "rgba(26,22,51,.08)",
        position: "relative", flexShrink: 0, transition: "all .15s",
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: 999,
          background: checked ? "#fff" : "var(--ink)",
          position: "absolute", top: 2,
          left: checked ? 20 : 2,
          transition: "left .15s",
        }} />
      </div>
    </div>
  );
}

// ─── SPLASH ───────────────────────────────────────────────────────────────────
function SplashScreens({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SPLASH_SLIDES[step];
  const swipe = useSwipe(
    () => step < SPLASH_SLIDES.length - 1 ? setStep(s => s + 1) : onDone(),
    () => step > 0 && setStep(s => s - 1),
  );

  return (
    <div
      {...swipe}
      style={{
        minHeight: "100dvh",
        background: slide.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
        textAlign: "center",
        transition: "background .4s",
        position: "relative",
      }}
    >
      {/* skip */}
      <button
        onClick={onDone}
        style={{
          position: "absolute", top: 20, right: 20,
          background: "rgba(0,0,0,.15)", border: "none",
          borderRadius: 999, padding: "6px 14px",
          color: slide.textColor, fontWeight: 700,
          fontSize: 12, cursor: "pointer",
          fontFamily: "'Sometype Mono', monospace",
          letterSpacing: ".08em",
        }}
      >
        PULAR
      </button>

      {/* ilustração */}
      <div style={{
        fontSize: 96, lineHeight: 1, marginBottom: 32,
        filter: "drop-shadow(0 4px 16px rgba(0,0,0,.15))",
        animation: "floatEmoji 3s ease-in-out infinite",
      }}>
        {slide.emoji}
      </div>

      {/* texto */}
      <h1
        style={{
          fontFamily: "'Lilita One', cursive",
          fontSize: "clamp(28px, 7vw, 40px)",
          lineHeight: 1.1,
          color: slide.textColor,
          marginBottom: 14,
          textTransform: "lowercase",
        }}
      >
        {slide.title}
      </h1>
      <p
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: 16, lineHeight: 1.5,
          color: slide.textColor,
          opacity: .85,
          maxWidth: 320,
          marginBottom: 48,
        }}
      >
        {slide.sub}
      </p>

      {/* dots */}
      <div style={{ color: slide.textColor, marginBottom: 32 }}>
        <ProgressDots total={SPLASH_SLIDES.length} current={step} />
      </div>

      {/* botão */}
      {step < SPLASH_SLIDES.length - 1 ? (
        <button
          onClick={() => setStep(s => s + 1)}
          style={{
            background: slide.textColor === "#fff" ? "rgba(255,255,255,.25)" : "var(--ink)",
            color: slide.textColor === "#fff" ? "#fff" : "#fff",
            border: "2.5px solid " + (slide.textColor === "#fff" ? "rgba(255,255,255,.5)" : "var(--ink)"),
            borderRadius: 999, padding: "14px 36px",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800, fontSize: 16,
            cursor: "pointer",
            transition: "transform .1s",
          }}
        >
          próximo →
        </button>
      ) : (
        <button
          onClick={onDone}
          style={{
            background: "#fff",
            color: "var(--ink)",
            border: "2.5px solid rgba(255,255,255,.5)",
            borderRadius: 999, padding: "14px 36px",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800, fontSize: 16,
            cursor: "pointer",
            boxShadow: "3px 3px 0 rgba(0,0,0,.2)",
          }}
        >
          vamos lá ✨
        </button>
      )}

      <style>{`
        @keyframes floatEmoji {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}

// ─── AUTH CHOICE ──────────────────────────────────────────────────────────────
function AuthChoice({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1
          style={{
            fontFamily: "'Lilita One', cursive",
            fontSize: 52, lineHeight: 1,
            color: "var(--pink)",
            textTransform: "lowercase",
            marginBottom: 8,
          }}
        >
          afora
        </h1>
        <p style={{
          fontFamily: "'Sometype Mono', monospace",
          fontSize: 12, letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--fg3)",
        }}>
          os rolês que você merece
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          className="btn full"
          onClick={onRegister}
          style={{ height: 52, fontSize: 16 }}
        >
          criar conta
        </button>
        <button
          className="btn ghost full"
          onClick={onLogin}
          style={{ height: 52, fontSize: 16 }}
        >
          já tenho conta
        </button>
      </div>

      <p style={{
        marginTop: 32, fontSize: 11,
        color: "var(--fg3)",
        fontFamily: "'Sometype Mono', monospace",
        textAlign: "center",
        maxWidth: 300,
        lineHeight: 1.6,
      }}>
        ao entrar você concorda com nossos termos e política de privacidade.
      </p>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginForm({ onBack, onNeedOnboarding }: {
  onBack: () => void;
  onNeedOnboarding: (id: string, name: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setErr("e-mail ou senha não bateram. tenta de novo?"); setLoading(false); return; }
    // verifica se onboarding completo
    const uid = data.session?.user.id;
    if (uid) {
      const { data: u } = await supabase
        .from("users")
        .select("id,name,onboarding_completed")
        .eq("id", uid)
        .single();
      if (!u) {
        // usuário existe no auth mas não tem linha em public.users — cria e vai pra home
        await supabase.from("users").upsert({ id: uid, name: email.split("@")[0], onboarding_completed: false });
        onNeedOnboarding(uid, email.split("@")[0]);
        return;
      }
      if (!u.onboarding_completed) {
        onNeedOnboarding(uid, u.name || email.split("@")[0]);
        return;
      }
    }
    setLoading(false);
    window.location.href = "/home";
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--fg3)", fontFamily: "'Sometype Mono', monospace",
            fontSize: 12, letterSpacing: ".06em", marginBottom: 28,
            padding: 0,
          }}
        >
          ← voltar
        </button>

        <h1 className="title" style={{ fontSize: 32, marginBottom: 6 }}>oi de novo.</h1>
        <p className="lead" style={{ marginBottom: 28, fontSize: 14 }}>entra pra continuar.</p>

        <form className="card stack reveal" style={{ gap: 14 }} onSubmit={entrar}>
          <div>
            <label className="fl">e-mail</label>
            <input className="in" type="email" value={email} autoComplete="email"
              onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" required />
          </div>
          <div>
            <label className="fl">senha</label>
            <input className="in" type="password" value={pass} autoComplete="current-password"
              onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
          </div>
          {err && <p className="mono" style={{ color: "var(--warn)", fontSize: 13 }}>{err}</p>}
          <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "entrando…" : "entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── CADASTRO ─────────────────────────────────────────────────────────────────
function RegisterForm({ onBack, onSuccess }: {
  onBack: () => void;
  onSuccess: (userId: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (pass.length < 6) { setErr("senha precisa ter pelo menos 6 caracteres."); return; }
    setErr(""); setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (error) { setErr(error.message); setLoading(false); return; }
    const uid = data.user?.id;
    if (uid) {
      await supabase.from("users").upsert({ id: uid, name: name.trim(), onboarding_completed: false });
      onSuccess(uid, name.trim());
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--fg3)", fontFamily: "'Sometype Mono', monospace",
            fontSize: 12, letterSpacing: ".06em", marginBottom: 28, padding: 0,
          }}
        >
          ← voltar
        </button>

        <h1 className="title" style={{ fontSize: 32, marginBottom: 6 }}>cria sua conta.</h1>
        <p className="lead" style={{ marginBottom: 28, fontSize: 14 }}>demora menos de 2 minutos.</p>

        <form className="card stack reveal" style={{ gap: 14 }} onSubmit={criar}>
          <div>
            <label className="fl">como você se chama?</label>
            <input className="in" type="text" value={name} autoComplete="name"
              onChange={e => setName(e.target.value)} placeholder="seu nome" required />
          </div>
          <div>
            <label className="fl">e-mail</label>
            <input className="in" type="email" value={email} autoComplete="email"
              onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" required />
          </div>
          <div>
            <label className="fl">senha</label>
            <input className="in" type="password" value={pass} autoComplete="new-password"
              onChange={e => setPass(e.target.value)} placeholder="mínimo 6 caracteres" required />
          </div>
          {err && <p className="mono" style={{ color: "var(--warn)", fontSize: 13 }}>{err}</p>}
          <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "criando conta…" : "criar conta →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ userId, userName }: { userId: string; userName: string }) {
  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 4;

  // step 0 — hobbies
  const [interests, setInterests] = useState<string[]>([]);
  // step 1 — cidade
  const [city, setCity] = useState("");
  // step 2 — segurança
  const [safetyFlags, setSafetyFlags] = useState<Record<string, boolean>>({});
  // step 3 — privacidade
  const [privacy, setPrivacy] = useState<Record<string, boolean>>(
    Object.fromEntries(PRIVACY_OPTIONS.map(p => [p.id, p.default]))
  );
  const [saving, setSaving] = useState(false);

  function toggleInterest(id: string) {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function finalize() {
    setSaving(true);
    const identityGroups = Object.entries(safetyFlags).filter(([, v]) => v).map(([k]) => k);
    await supabase.from("users").update({
      interests,
      city: city.trim() || null,
      identity_groups: identityGroups,
      onboarding_completed: true,
    }).eq("id", userId);
    setSaving(false);
    window.location.href = "/home";
  }

  function nextStep() {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else finalize();
  }

  const canAdvance = () => {
    if (step === 0) return interests.length >= 1;
    if (step === 1) return city.trim().length >= 2;
    return true;
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "40px 24px" }}>
      <div style={{ maxWidth: 440, width: "100%", margin: "0 auto", flex: 1, display: "flex", flexDirection: "column" }}>

        <OnboardingBar step={step} total={TOTAL_STEPS} />

        {/* step 0 — interesses */}
        {step === 0 && (
          <div className="stack reveal" style={{ gap: 16, flex: 1 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>passo 1 de {TOTAL_STEPS}</p>
              <h2 className="title" style={{ fontSize: 28, marginBottom: 8 }}>o que você curte?</h2>
              <p className="lead" style={{ fontSize: 14 }}>escolhe pelo menos 1. vamos usar pra sugerir clubes e eventos.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {HOBBIES.map(h => (
                <HobbyChip
                  key={h.id}
                  label={h.label}
                  selected={interests.includes(h.id)}
                  onClick={() => toggleInterest(h.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* step 1 — cidade */}
        {step === 1 && (
          <div className="stack reveal" style={{ gap: 16, flex: 1 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>passo 2 de {TOTAL_STEPS}</p>
              <h2 className="title" style={{ fontSize: 28, marginBottom: 8 }}>onde você anda?</h2>
              <p className="lead" style={{ fontSize: 14 }}>pra mostrar rolês perto de você.</p>
            </div>
            <div>
              <label className="fl">sua cidade</label>
              <input
                className="in"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="ex: São Paulo"
                autoFocus
              />
            </div>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4,
            }}>
              {["São Paulo", "Rio de Janeiro", "Curitiba", "Belo Horizonte", "Porto Alegre", "Campinas", "Florianópolis"].map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setCity(c)}
                  style={{
                    padding: "6px 12px", borderRadius: 999,
                    border: "2px solid " + (city === c ? "var(--ink)" : "rgba(26,22,51,.2)"),
                    background: city === c ? "var(--ink)" : "#fff",
                    color: city === c ? "#fff" : "var(--fg2)",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}
                >{c}</button>
              ))}
            </div>
          </div>
        )}

        {/* step 2 — segurança */}
        {step === 2 && (
          <div className="stack reveal" style={{ gap: 16, flex: 1 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>passo 3 de {TOTAL_STEPS}</p>
              <h2 className="title" style={{ fontSize: 28, marginBottom: 8 }}>filtros de segurança</h2>
              <p className="lead" style={{ fontSize: 14 }}>
                ative o que faz sentido pra você. você pode mudar a qualquer hora nas configurações.
              </p>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {SAFETY_OPTIONS.map(opt => (
                <Toggle
                  key={opt.id}
                  checked={!!safetyFlags[opt.id]}
                  onChange={v => setSafetyFlags(prev => ({ ...prev, [opt.id]: v }))}
                  label={opt.label}
                  sub={opt.sub}
                  emoji={opt.emoji}
                />
              ))}
            </div>
          </div>
        )}

        {/* step 3 — privacidade */}
        {step === 3 && (
          <div className="stack reveal" style={{ gap: 16, flex: 1 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>passo 4 de {TOTAL_STEPS}</p>
              <h2 className="title" style={{ fontSize: 28, marginBottom: 8 }}>
                o que fica visível no seu perfil?
              </h2>
              <p className="lead" style={{ fontSize: 14 }}>só membros de um clube onde você está podem ver seu perfil.</p>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {PRIVACY_OPTIONS.map(opt => (
                <Toggle
                  key={opt.id}
                  checked={privacy[opt.id]}
                  onChange={v => setPrivacy(prev => ({ ...prev, [opt.id]: v }))}
                  label={opt.label}
                  sub={opt.sub}
                />
              ))}
            </div>
          </div>
        )}

        {/* botão de avançar */}
        <div style={{ paddingTop: 24 }}>
          <button
            className="btn full"
            onClick={nextStep}
            disabled={!canAdvance() || saving}
            style={{ height: 52, fontSize: 16 }}
          >
            {saving ? "salvando…" : step === TOTAL_STEPS - 1 ? "entrar no afora ✨" : "continuar →"}
          </button>
          {step >= 2 && (
            <button
              type="button"
              onClick={nextStep}
              style={{
                display: "block", width: "100%", marginTop: 10,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--fg3)", fontFamily: "'Sometype Mono', monospace",
                fontSize: 12, letterSpacing: ".06em",
              }}
            >
              pular por agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WELCOME FLOW (export principal) ─────────────────────────────────────────
export default function WelcomeFlow() {
  const [view, setView] = useState<View>("splash");
  const [onboardUser, setOnboardUser] = useState<{ id: string; name: string } | null>(null);

  // se voltou de outro lugar sem onboarding completo
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const uid = data.session.user.id;
      supabase.from("users").select("onboarding_completed,name").eq("id", uid).single()
        .then(({ data: u }) => {
          if (!u || !u.onboarding_completed) {
            setOnboardUser({ id: uid, name: u?.name || "" });
            setView("onboarding");
          }
          // se onboarding completo, AuthGate vai redirecionar — não faz nada
        });
    });
  }, []);

  if (view === "splash") return <SplashScreens onDone={() => setView("auth")} />;
  if (view === "auth") return (
    <AuthChoice
      onLogin={() => setView("login")}
      onRegister={() => setView("register")}
    />
  );
  if (view === "login") return (
    <LoginForm
      onBack={() => setView("auth")}
      onNeedOnboarding={(id, name) => { setOnboardUser({ id, name }); setView("onboarding"); }}
    />
  );
  if (view === "register") return (
    <RegisterForm
      onBack={() => setView("auth")}
      onSuccess={(id, name) => { setOnboardUser({ id, name }); setView("onboarding"); }}
    />
  );
  if (view === "onboarding" && onboardUser) return (
    <Onboarding userId={onboardUser.id} userName={onboardUser.name} />
  );
  return null;
}
