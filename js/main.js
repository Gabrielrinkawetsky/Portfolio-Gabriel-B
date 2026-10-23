// Hero do portfólio: números contando, parallax (mouse no PC, rolagem no celular).
// Quem prefere menos movimento (prefers-reduced-motion) vê tudo parado e os números finais.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero = document.querySelector('.hero');

// ---------- Números contando (0 → valor final) ----------
function countUp(el) {
  const end = Number(el.dataset.count), suffix = el.dataset.suffix || '';
  const duration = 1600;
  let start;
  const frame = (t) => {
    start ??= t;
    const p = Math.min((t - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);   // desacelera no fim
    el.textContent = Math.round(end * eased) + suffix;
    if (p < 1) requestAnimationFrame(frame);
  };
  el.textContent = '0' + suffix;
  setTimeout(() => requestAnimationFrame(frame), 350);
}

if (!reduceMotion) {
  // começa quando o card aparece na tela (no celular pode estar mais abaixo)
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      countUp(entry.target);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => io.observe(el));
}

// ---------- Parallax ----------
// O CSS move cada camada com --mx/--my (mouse, de -1 a 1) e --sy (rolagem, em px),
// cada uma com uma intensidade diferente, o que dá a sensação de profundidade.
if (hero && !reduceMotion) {
  let targetX = 0, targetY = 0, x = 0, y = 0, raf = 0;

  const render = () => {
    // aproxima suavemente do alvo, para o movimento não ficar duro
    x += (targetX - x) * 0.08;
    y += (targetY - y) * 0.08;
    hero.style.setProperty('--mx', x.toFixed(4));
    hero.style.setProperty('--my', y.toFixed(4));
    raf = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.001 ? requestAnimationFrame(render) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(render); };

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
      targetY = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    });
    hero.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; kick(); });
  }

  let scrollRaf = 0;
  addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      hero.style.setProperty('--sy', Math.min(scrollY, innerHeight * 1.5).toFixed(1));
    });
  }, { passive: true });
}
