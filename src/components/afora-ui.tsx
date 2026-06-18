import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import Aforinha from "./Aforinha";
import { avatarFor } from "@/lib/afora";

export function AppBar({
  sub = "painel do clube",
  right,
}: {
  sub?: string;
  right?: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <header className="appbar">
      <div
        className="brand"
        onClick={() => nav({ to: "/" })}
        style={{ cursor: "pointer" }}
      >
        <Aforinha size={34} />
        <div className="stack">
          <span className="brand-name">afora</span>
          <span className="brand-sub">{sub}</span>
        </div>
      </div>
      {right}
    </header>
  );
}

export function Stat({
  num,
  label,
  accent = "var(--ink)",
}: {
  num: ReactNode;
  label: string;
  accent?: string;
}) {
  return (
    <div className="stack center" style={{ flex: 1 }}>
      <span className="stat-num" style={{ color: accent }}>
        {num}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function GapBar({
  confirmou,
  apareceu,
}: {
  confirmou: number;
  apareceu: number;
}) {
  const pct = confirmou ? Math.round((apareceu / confirmou) * 100) : 0;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="gapbar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div
        className="row between mono"
        style={{ fontSize: 12, color: "var(--fg2)" }}
      >
        <span>{apareceu} apareceram</span>
        <span>de {confirmou} confirmadas</span>
      </div>
    </div>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { initial, color } = avatarFor(name);
  return (
    <div
      className="avatar"
      style={{
        background: color,
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        fontSize: size * 0.45,
      }}
    >
      {initial}
    </div>
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return <div className="toast">{children}</div>;
}

export function Loading({ label = "carregando…" }: { label?: string }) {
  return (
    <div
      className="stack center"
      style={{ gap: 14, padding: "80px 0", alignItems: "center" }}
    >
      <div className="spin" />
      <span className="mono" style={{ color: "var(--fg3)", fontSize: 13 }}>
        {label}
      </span>
    </div>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="card flat center"
      style={{ borderStyle: "dashed", padding: "32px 20px" }}
    >
      <Aforinha size={52} mood="happy" />
      <h2 className="title" style={{ marginTop: 12 }}>
        {title}
      </h2>
      {children && <p className="lead" style={{ marginTop: 6 }}>{children}</p>}
    </div>
  );
}
