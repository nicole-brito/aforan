import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { AppBar } from "@/components/afora-ui";

export const Route = createFileRoute("/clube/novo")({
  head: () => ({
    meta: [
      { title: "novo clube · afora" },
      { name: "description", content: "abre um clube novo e vira host." },
    ],
  }),
  component: NovoClube,
});

function NovoClube() {
  const { session } = useSession();
  const me = session!.user.id;
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    name: "",
    category: "",
    description: "",
    type: "open",
  });

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!f.name.trim() || !f.category.trim()) {
      setErr("faltou nome ou categoria.");
      return;
    }
    setSaving(true);
    const clubId = crypto.randomUUID();
    const { error } = await supabase
      .from("clubs")
      .insert({
        id: clubId,
        name: f.name.trim(),
        category: f.category.trim(),
        description: f.description.trim() || null,
        type: f.type,
        access_groups: ["all"],
        created_by: me,
        is_branded: false,
      });
    if (error) {
      setSaving(false);
      setErr("não rolou criar: " + error.message);
      return;
    }
    const { error: mErr } = await supabase
      .from("memberships")
      .insert({ user_id: me, club_id: clubId, role: "host", status: "active" });
    setSaving(false);
    if (mErr) {
      setErr("clube criado mas falhou virar host: " + mErr.message);
      return;
    }
    nav({ to: "/" });
  }

  return (
    <>
      <AppBar
        sub="novo clube"
        right={
          <button className="btn sm ghost" onClick={() => nav({ to: "/" })}>
            voltar
          </button>
        }
      />
      <div className="shell" style={{ maxWidth: 560 }}>
        <h1 className="title" style={{ marginTop: 16, marginBottom: 4 }}>abre um clube.</h1>
        <p className="lead" style={{ marginBottom: 18 }}>
          dá um nome, escolhe a vibe. depois você marca o primeiro rolê.
        </p>

        <form className="card stack" style={{ gap: 16 }} onSubmit={salvar}>
          <div>
            <label className="fl">nome do clube</label>
            <input
              className="in"
              value={f.name}
              onChange={set("name")}
              placeholder="ex: clube de corrida ibirapuera"
            />
          </div>
          <div>
            <label className="fl">categoria</label>
            <input
              className="in"
              value={f.category}
              onChange={set("category")}
              placeholder="corrida, leitura, cinema…"
            />
          </div>
          <div>
            <label className="fl">tipo</label>
            <select className="in" value={f.type} onChange={set("type")}>
              <option value="open">aberto · qualquer um entra</option>
              <option value="curated">curado · você aprova entrada</option>
            </select>
          </div>
          <div>
            <label className="fl">descrição (opcional)</label>
            <textarea
              className="in"
              value={f.description}
              onChange={set("description")}
              placeholder="qual a do clube?"
            />
          </div>
          {err && (
            <p className="mono" style={{ color: "var(--warn)", fontSize: 13 }}>{err}</p>
          )}
          <button className="btn full" type="submit" disabled={saving}>
            {saving ? "abrindo…" : "abrir clube"}
          </button>
        </form>
      </div>
    </>
  );
}
