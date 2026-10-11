"use client";
import { useEffect, useRef, useState } from "react";
import { Icon, Sprite, veggieFor } from "./sprites";
import { BOUNCY, GLIDE, SNAP, originTransform, rubber, run } from "./motion";

type Result = {
  vegetable: string; count: number; reference_found: boolean; confidence: string;
  dimensions_cm: { length: number; width: number; height: number };
  volume_cm3: number; density_g_cm3: number;
  weight_g: { min: number; best: number; max: number }; notes: string;
};
type Img = { preview: string; data: string };

const SLOTS = ["Top view", "Side view", "Extra angle"];
const CUSTOM = "Spoon or other object (I'll enter its size)";
const REFERENCES = [
  "Credit card (85.6 × 54 mm)",
  "Pakistan Rs 10 coin (25.5 mm diameter)",
  "Pakistan Rs 2 coin, 1998–2008 (22.5 mm diameter)",
  "UK 50p coin (27.3 mm across)",
  "US quarter coin (24.26 mm diameter)",
  "Euro 1 coin (23.25 mm diameter)",
  "A4 sheet of paper (210 × 297 mm)",
  "30 cm ruler",
  CUSTOM,
];

// Shrink photos before upload to keep requests small and fast.
async function toJpeg(file: File, max = 1280): Promise<Img> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { preview: url, data: url.split(",")[1] };
}

export default function Home() {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  const [imgs, setImgs] = useState<(Img | null)[]>([null, null, null]);
  const [multi, setMulti] = useState(false);
  const [reference, setReference] = useState(REFERENCES[0]);
  const [custom, setCustom] = useState("");
  const [optsOpen, setOptsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const slots = multi ? 3 : 1;
  const filled = imgs.slice(0, slots)
    .map((im, i) => (im ? { ...im, label: SLOTS[i] } : null))
    .filter(Boolean) as (Img & { label: string })[];
  const needsCustom = reference === CUSTOM && !custom.trim();
  const refShort = reference === CUSTOM ? custom || "custom" : reference.split(" (")[0];

  async function pick(i: number, file?: File) {
    if (!file) return;
    setResult(null); setError("");
    const next = [...imgs];
    next[i] = await toJpeg(file);
    setImgs(next);
  }
  function remove(i: number) {
    const next = [...imgs];
    next[i] = null;
    setImgs(next); setResult(null);
  }

  async function estimate() {
    if (!filled.length || busy || needsCustom) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: filled.map(({ data, label }) => ({ data, label })),
          reference: reference === CUSTOM ? custom.trim() : reference,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json);
      setSheetOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // Sheet pops out of the button, glides back into it.
  useEffect(() => {
    const el = sheetRef.current;
    if (!sheetOpen || !el) return;
    const from = btnRef.current ? originTransform(el, btnRef.current) : "translateY(40px)";
    run(el, [{ transform: from, opacity: 0 }, { transform: "none", opacity: 1 }], BOUNCY);
  }, [sheetOpen]);

  async function closeSheet() {
    const el = sheetRef.current;
    if (el) {
      const to = btnRef.current ? originTransform(el, btnRef.current) : "translateY(40px)";
      el.style.transform = "";
      await run(el, [{ transform: "none", opacity: 1 }, { transform: to, opacity: 0 }], GLIDE, { fill: "forwards" })
        .finished.catch(() => {});
    }
    setSheetOpen(false);
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag the handle to dismiss (rubber-bands upward).
  function onGrabDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, dy: 0 };
  }
  function onGrabMove(e: React.PointerEvent) {
    const d = drag.current, el = sheetRef.current;
    if (!d || !el) return;
    const raw = e.clientY - d.y;
    d.dy = raw;
    el.style.transform = `translateY(${raw < 0 ? -rubber(-raw) : raw}px)`;
  }
  function onGrabUp() {
    const d = drag.current, el = sheetRef.current;
    drag.current = null;
    if (!d || !el) return;
    if (d.dy > 100) { closeSheet(); return; }
    const from = el.style.transform || "none";
    el.style.transform = "";
    run(el, [{ transform: from }, { transform: "none" }], SNAP);
  }

  const r = result;
  const d = r?.dimensions_cm;
  return (
    <main>
      <header className="top">
        <div>
          <h1>Veggie Scale</h1>
          <p className="sub">Photo + something of known size = estimated weight.</p>
        </div>
        <div className="stickers" aria-hidden="true">
          <Sprite name="tomato" size={48} className="bob" />
          <Sprite name="carrot" size={48} className="bob" />
          <Sprite name="broccoli" size={48} className="bob" />
        </div>
      </header>

      <section className="panel glass">
        <div className={multi ? "slots" : ""}>
          {Array.from({ length: slots }, (_, i) => {
            const im = imgs[i];
            return (
              <div className="slot" key={i}>
                {multi && <div className="slot-label">{SLOTS[i]}{i === 2 ? " (optional)" : ""}</div>}
                <div className={`drop${im ? " has" : ""}`} role="button" tabIndex={0}
                  onClick={() => inputs.current[i]?.click()}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputs.current[i]?.click()}>
                  {im ? <img src={im.preview} alt={SLOTS[i]} /> : <span>{multi ? "Add photo" : "Tap to take or choose a photo"}</span>}
                </div>
                {im && (
                  <button className="x" aria-label={`Remove ${SLOTS[i]} photo`} onClick={() => remove(i)}>
                    <Icon name="x" size={14} />
                  </button>
                )}
                <input ref={(el) => { inputs.current[i] = el; }} type="file" accept="image/*" capture="environment" hidden
                  onChange={(e) => { pick(i, e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            );
          })}
        </div>
        {multi && <p className="hint">Shoot straight down for the top view, then at eye level for the side view. Keep the reference object flat next to the vegetable in each.</p>}

        <button className="row disc" aria-expanded={optsOpen} onClick={() => setOptsOpen(!optsOpen)}>
          <span>Options</span>
          <span className="val">{multi ? "3 photos · " : ""}{refShort}</span>
          <span className="chev"><Icon name="chev" size={14} /></span>
        </button>
        <div className="fold" data-open={optsOpen}>
          <div className="fold-in" inert={!optsOpen}>
            <label className="cap" htmlFor="ref">Reference object in the photo</label>
            <select id="ref" className="field" value={reference} onChange={(e) => setReference(e.target.value)}>
              {REFERENCES.map((x) => <option key={x}>{x}</option>)}
            </select>
            {reference === CUSTOM && (
              <input className="field" value={custom} onChange={(e) => setCustom(e.target.value)}
                placeholder="e.g. Teaspoon, 14 cm long" aria-label="Reference object name and size" />
            )}
            <button className="row" role="switch" aria-checked={multi}
              onClick={() => { setMulti(!multi); setResult(null); }}>
              <span className="sw" data-on={multi}><i /></span>
              <span>Multi-photo mode (more accurate)</span>
            </button>
          </div>
        </div>
      </section>

      <div className="float" aria-live="polite">
        {error && <p className="note err glass-strong" role="alert">{error}</p>}
        {r && !sheetOpen && (
          <button className="note chip glass-strong" onClick={() => setSheetOpen(true)}>
            Last: {Math.round(r.weight_g.best)} g · {r.vegetable} — view
          </button>
        )}
      </div>

      <div className="bar glass-strong">
        <div className="bar-in">
          <button ref={btnRef} className="btn" onClick={estimate} disabled={!filled.length || busy || needsCustom}>
            {busy && <Sprite name="tomato" size={24} className="hop" />}
            {busy ? "Estimating…" : `Estimate weight${filled.length > 1 ? ` (${filled.length} photos)` : ""}`}
          </button>
        </div>
      </div>

      {r && d && sheetOpen && (
        <>
          <div className="scrim" onClick={closeSheet} />
          <div className="sheet glass-strong" ref={sheetRef} role="dialog" aria-modal="true" aria-label="Weight estimate">
            <div className="grab" onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp}>
              <div className="grab-bar" />
            </div>
            <button className="x" aria-label="Close" onClick={closeSheet}><Icon name="x" size={14} /></button>
            <div className="hero">
              <Sprite name={veggieFor(r.vegetable)} size={72} className="hop" />
              <div>
                <div className="weight">{Math.round(r.weight_g.best)}<span>g</span></div>
                <p className="range">Likely {Math.round(r.weight_g.min)}–{Math.round(r.weight_g.max)} g · {r.confidence} confidence</p>
              </div>
            </div>
            <dl>
              <dt>Vegetable</dt><dd>{r.count} × {r.vegetable}</dd>
              <dt>Size (L × W × H)</dt><dd>{d.length} × {d.width} × {d.height} cm</dd>
              <dt>Volume</dt><dd>{Math.round(r.volume_cm3)} cm³</dd>
              <dt>Density used</dt><dd>{r.density_g_cm3} g/cm³</dd>
            </dl>
            {!r.reference_found && <div className="warn">Reference object not found, so this is a rough guess. Retake with it next to the vegetable.</div>}
            {r.notes && <p className="range">{r.notes}</p>}
          </div>
        </>
      )}
    </main>
  );
}
