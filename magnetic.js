// Magnetic buttons: when the pointer comes near, the button leans toward it and
// springs back when the pointer leaves. Mouse/trackpad only; phones and
// reduced-motion users get a normal button.

const REACH_PX = 80;   // how far outside the button the pull starts
const PULL = 0.3;      // fraction of the pointer offset the button follows

export function magnetize(elements) {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  window.addEventListener('pointermove', (e) => {
    if (!fine.matches || calm.matches) return;
    for (const el of elements) {
      if (el.hidden || !el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const near = e.clientX > r.left - REACH_PX && e.clientX < r.right + REACH_PX
        && e.clientY > r.top - REACH_PX && e.clientY < r.bottom + REACH_PX;
      el.style.transform = near ? `translate(${(e.clientX - cx) * PULL}px, ${(e.clientY - cy) * PULL}px)` : '';
    }
  }, { passive: true });
}
