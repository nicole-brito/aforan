import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Aforinha from "@/components/Aforinha";

export default function Login() {
  const [email, setEmail] = useState("teste@afora.app");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    setLoading(false);
    if (error) setErr("e-mail ou senha não bateram. tenta de novo?");
  }

  return (
    <div
      className="shell"
      style={{ maxWidth: 420, paddingTop: "12vh", minHeight: "100dvh" }}
    >
      <div
        className="center stack"
        style={{ alignItems: "center", gap: 8, marginBottom: 22 }}
      >
        <Aforinha size={72} mood="excited" />
        <h1 className="title" style={{ fontSize: 38 }}>oi de novo.</h1>
        <p className="lead">
          entra pra cuidar dos teus clubes e ver quem apareceu.
        </p>
      </div>

      <form
        className="card stack reveal"
        style={{ gap: 14 }}
        onSubmit={entrar}
      >
        <div>
          <label className="fl">e-mail</label>
          <input
            className="in"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            required
          />
        </div>
        <div>
          <label className="fl">senha</label>
          <input
            className="in"
            type="password"
            value={pass}
            autoComplete="current-password"
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        {err && (
          <p className="mono" style={{ color: "var(--warn)", fontSize: 13 }}>
            {err}
          </p>
        )}
        <button className="btn full" type="submit" disabled={loading}>
          {loading ? "entrando…" : "entrar"}
        </button>
      </form>

      <p
        className="mono center"
        style={{
          color: "var(--fg3)",
          fontSize: 12,
          marginTop: 16,
          letterSpacing: ".06em",
        }}
      >
        ★ demo · teste@afora.app · afora2026
      </p>
    </div>
  );
}
