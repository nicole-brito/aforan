export default function Aforinha({
  size = 48,
  mood = "happy",
}: {
  size?: number;
  mood?: "happy" | "excited";
}) {
  const eyeY = mood === "excited" ? 28 : 30;
  const eyeH = mood === "excited" ? 14 : 12;
  return (
    <svg
      width={size}
      height={size * (100 / 84)}
      viewBox="0 0 84 100"
      shapeRendering="crispEdges"
      className="pixel"
      aria-label="aforinha"
    >
      <rect x="39" y="6" width="6" height="6" fill="#1A1633" />
      <rect x="36" y="0" width="12" height="6" fill="#FFD63A" />
      <g transform="translate(0,18)">
        <g fill="#FFF6E4">
          <rect x="30" y="6" width="24" height="6" />
          <rect x="18" y="12" width="48" height="6" />
          <rect x="12" y="18" width="60" height="6" />
          <rect x="6" y="24" width="72" height="36" />
          <rect x="12" y="60" width="60" height="6" />
          <rect x="18" y="66" width="48" height="6" />
        </g>
        <g fill="#1A1633">
          <rect x="30" y="0" width="24" height="6" />
          <rect x="18" y="6" width="12" height="6" />
          <rect x="54" y="6" width="12" height="6" />
          <rect x="12" y="12" width="6" height="6" />
          <rect x="66" y="12" width="6" height="6" />
          <rect x="6" y="18" width="6" height="6" />
          <rect x="72" y="18" width="6" height="6" />
          <rect x="0" y="24" width="6" height="36" />
          <rect x="78" y="24" width="6" height="36" />
          <rect x="6" y="60" width="6" height="6" />
          <rect x="72" y="60" width="6" height="6" />
          <rect x="12" y="66" width="6" height="6" />
          <rect x="66" y="66" width="6" height="6" />
          <rect x="18" y="72" width="18" height="6" />
          <rect x="48" y="72" width="18" height="6" />
          <rect x="18" y={eyeY} width="12" height={eyeH} />
          <rect x="48" y={eyeY} width="12" height={eyeH} />
          <rect x="30" y="48" width="12" height="6" />
          <rect x="42" y="48" width="6" height="6" />
          <rect x="36" y="54" width="12" height="6" />
        </g>
        <g fill="#FFF6E4">
          <rect x="24" y="30" width="6" height="6" />
          <rect x="54" y="30" width="6" height="6" />
        </g>
        <g fill={mood === "excited" ? "#FF4FA3" : "#FFD63A"}>
          <rect x="12" y="42" width="6" height="6" />
          <rect x="66" y="42" width="6" height="6" />
        </g>
        <g fill="#FF7A2A">
          <rect x="24" y="72" width="6" height="6" />
          <rect x="54" y="72" width="6" height="6" />
        </g>
      </g>
    </svg>
  );
}
