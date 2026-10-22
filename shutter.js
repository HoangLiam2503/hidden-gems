// "Shutter" text reveal: each letter fades in from a blur while three colored
// slices sweep across it. Plain-DOM port of a React/framer-motion component;
// all motion is CSS (see .shutter in styles.css), this only builds the spans.

const STAGGER_S = 0.04;

export function shutter(el, text) {
  el.textContent = '';
  el.setAttribute('aria-label', text);
  el.classList.add('shutter');
  let i = 0;
  text.split(' ').forEach((word, w) => {
    if (w > 0) el.appendChild(document.createTextNode(' '));
    // Keep each word together so long names wrap between words, not letters.
    const wordEl = document.createElement('span');
    wordEl.className = 'sh-word';
    wordEl.setAttribute('aria-hidden', 'true');
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'sh-char';
      c.style.setProperty('--d', `${(i++ * STAGGER_S).toFixed(2)}s`);
      for (const part of ['main', 'top', 'mid', 'bot']) {
        const s = document.createElement('span');
        s.className = `sh-${part}`;
        s.textContent = ch;
        c.appendChild(s);
      }
      wordEl.appendChild(c);
    }
    el.appendChild(wordEl);
  });
}
