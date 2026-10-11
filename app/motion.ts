// Spring physics -> CSS `linear()` easing, so WAAPI animations get real mass/stiffness/damping.
export type Spring = { easing: string; duration: number };

export function springEasing(stiffness: number, damping: number, mass = 1): Spring {
  const w0 = Math.sqrt(stiffness / mass);
  const z = damping / (2 * Math.sqrt(stiffness * mass));
  const x = (t: number) => {
    if (z >= 0.999) return 1 - (1 + w0 * t) * Math.exp(-w0 * t); // critically damped: no overshoot
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  };
  let last = 0;
  for (let t = 0; t < 3; t += 0.01) if (Math.abs(1 - x(t)) > 0.002) last = t;
  const T = last + 0.01;
  const pts = Array.from({ length: 41 }, (_, i) => x((T * i) / 40).toFixed(4));
  return { easing: `linear(${pts.join(", ")})`, duration: Math.round(T * 1000) };
}

export const SNAP = springEasing(380, 26);                    // buttons, small things: quick, tiny overshoot
export const BOUNCY = springEasing(300, 17);                  // sheets popping out / settling back
export const GLIDE = springEasing(420, 2 * Math.sqrt(420));   // retreating into the button: no overshoot

const supportsLinear = () =>
  typeof CSS !== "undefined" && CSS.supports("animation-timing-function", "linear(0, 1)");
export const reduced = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function run(el: HTMLElement, frames: Keyframe[], s: Spring, extra: KeyframeAnimationOptions = {}) {
  return el.animate(frames, {
    duration: reduced() ? 1 : s.duration,
    easing: supportsLinear() ? s.easing : "cubic-bezier(0.34, 1.4, 0.64, 1)",
    ...extra,
  });
}

// Transform that squeezes `el` into the rectangle of `from` (its physical origin).
export function originTransform(el: HTMLElement, from: HTMLElement) {
  const a = el.getBoundingClientRect();
  const b = from.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${b.width / a.width}, ${Math.max(b.height / a.height, 0.02)})`;
}

// Resistance when dragging past a boundary (springy rubber band).
export const rubber = (d: number) => 24 * Math.log1p(d / 24);
