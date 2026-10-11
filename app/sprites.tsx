// 12x12 pixel-art vegetables. Each character is one pixel; "." is transparent.
const PAL: Record<string, string> = {
  o: "#2b1a2e", h: "#fff4ee",
  r: "#e8412f", R: "#b02a24",
  g: "#58b947", G: "#2f7d32", L: "#9be07a",
  y: "#f59a23", Y: "#c96a10",
  p: "#8a4fc0", P: "#5b2f8a",
};

const SPRITES = {
  tomato: [
    "....oGGo....",
    "...oGggGo...",
    "..ooGgGoo...",
    ".orrrrrrrro.",
    "orrhhrrrrrro",
    "orhrrrrrrrro",
    "orrrrrrrrrRo",
    "orrrrrrrrrRo",
    "orrrrrrrrRRo",
    ".orrrrrrRRo.",
    "..ooRRRRoo..",
    "....oooo....",
  ],
  carrot: [
    "...oGoGo....",
    "..oGgGgGo...",
    "...ooGoo....",
    "..oyyyyyo...",
    "..oyhyyyo...",
    "..oyhyyYo...",
    "...oyyyYo...",
    "...oyyyYo...",
    "....oyYYo...",
    "....oyYo....",
    ".....oYo....",
    "......o.....",
  ],
  broccoli: [
    "..ooo..ooo..",
    ".oGggoogGgo.",
    "oGgggGgggGgo",
    "oGgGgggGgggo",
    "oggggGgggGgo",
    ".oGgggGgggo.",
    "..ooGgGGoo..",
    "....oLLo....",
    "....oLLo....",
    "....oLLo....",
    "...oLLLLo...",
    "...oooooo...",
  ],
  eggplant: [
    "....oGGo....",
    "...oGGGGo...",
    "..ooPPPPoo..",
    "..oppppppPo.",
    "..opphpppPo.",
    "..ophppppPo.",
    "..opppppppPo",
    ".opppppppPPo",
    ".opppppppPPo",
    ".oppppppPPo.",
    "..oppppPPo..",
    "...oooooo...",
  ],
} as const;

const ICONS = {
  x: ["x.....x", ".x...x.", "..x.x..", "...x...", "..x.x..", ".x...x.", "x.....x"],
  chev: ["x.....x", ".x...x.", "..x.x..", "...x..."],
} as const;

export type SpriteName = keyof typeof SPRITES;

export function veggieFor(name: string): SpriteName {
  const n = name.toLowerCase();
  if (/tomato/.test(n)) return "tomato";
  if (/carrot/.test(n)) return "carrot";
  if (/eggplant|aubergine|brinjal|baingan/.test(n)) return "eggplant";
  return "broccoli";
}

function paths(rows: readonly string[], pal: Record<string, string>) {
  const byColor: Record<string, string> = {};
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== "." && pal[c]) byColor[c] = (byColor[c] ?? "") + `M${x} ${y}h1v1h-1z`;
    })
  );
  return Object.entries(byColor).map(([c, d]) => <path key={c} d={d} fill={pal[c]} />);
}

// Use sizes that are multiples of 12 (24, 36, 48, 72) so every pixel lands on a whole screen pixel.
export function Sprite({ name, size = 48, className = "", style }: {
  name: SpriteName; size?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <svg className={`sticker ${className}`} style={style} viewBox="0 0 12 12" width={size} height={size}
      shapeRendering="crispEdges" aria-hidden="true">
      {paths(SPRITES[name], PAL)}
    </svg>
  );
}

export function Icon({ name, size = 14 }: { name: keyof typeof ICONS; size?: number }) {
  const rows = ICONS[name];
  const w = rows[0].length;
  return (
    <svg viewBox={`0 0 ${w} ${rows.length}`} width={size} height={(size * rows.length) / w}
      shapeRendering="crispEdges" aria-hidden="true">
      {paths(rows, { x: "currentColor" })}
    </svg>
  );
}
