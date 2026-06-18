// ── AFORA · regras de domínio ────────────────────────────────────
export function presenceState(rsvp: any, event: any) {
  if (rsvp.checked_in_at) return "apareceu";
  if (rsvp.status === "cancelled") return "cancelou";
  const past =
    (event && new Date(event.starts_at) < new Date()) ||
    event?.status === "completed";
  if (rsvp.status === "confirmed" && past) return "faltou";
  return "confirmou";
}

export const STATE_LABEL: Record<string, string> = {
  apareceu: "apareceu",
  confirmou: "confirmou",
  faltou: "faltou",
  cancelou: "cancelou",
};

export const DA_CASA_MIN = 3;

export function isPast(event: any) {
  return (
    event?.status === "completed" || new Date(event?.starts_at) < new Date()
  );
}

export function attendanceRate(confirmou: number, apareceu: number) {
  if (!confirmou) return null;
  return Math.round((apareceu / confirmou) * 100);
}

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const DIAS = ["dom","seg","ter","qua","qui","sex","sáb"];

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}
export function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
export function fmtDateTime(iso: string) {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}
export function relDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  if (diff > 1) return `em ${diff} dias`;
  return `há ${Math.abs(diff)} dias`;
}

const AV_COLORS = ["#FFB8DB","#FFD63A","#B6F04C","#3FD0FF","#FF7A2A","#9747FF"];
export function avatarFor(name = "?") {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return { initial, color: AV_COLORS[Math.abs(h) % AV_COLORS.length] };
}
