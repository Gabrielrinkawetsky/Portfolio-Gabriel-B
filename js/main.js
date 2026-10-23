// Hero do portfólio: números contando e a foto (entrada + parallax, com GSAP).
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
  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = '0' + (el.dataset.suffix || '');   // já começa no zero, sem piscar o valor final
    io.observe(el);
  });
}

// ---------- Foto: entrada e parallax (GSAP) ----------
// Só a foto tem parallax. No PC ela segue o mouse; no celular (sem mouse) ela anda mais
// devagar que a página na rolagem. Na entrada, sobe de baixo para cima aparecendo.
const person = document.querySelector('.person');
const { gsap, ScrollTrigger } = window;

if (person && gsap && !reduceMotion) {
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  // a foto é centralizada com translateX(-50%) no CSS; o GSAP passa a cuidar do transform
  gsap.set(person, { xPercent: -50, x: 0, y: 0 });
  gsap.from(person, { yPercent: 40, autoAlpha: 0, duration: 1.3, ease: 'expo.out', delay: 0.15 });

  const mm = gsap.matchMedia();
  mm.add('(hover: hover) and (pointer: fine)', () => {
    const toX = gsap.quickTo(person, 'x', { duration: 0.9, ease: 'power3.out' });
    const toY = gsap.quickTo(person, 'y', { duration: 0.9, ease: 'power3.out' });
    const move = (e) => {
      const r = hero.getBoundingClientRect();
      toX((((e.clientX - r.left) / r.width) * 2 - 1) * 26);
      toY((((e.clientY - r.top) / r.height) * 2 - 1) * 16);
    };
    const reset = () => { toX(0); toY(0); };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', reset);
    return () => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', reset); };
  });
  mm.add('not ((hover: hover) and (pointer: fine))', () => {
    if (!ScrollTrigger) return;
    gsap.to(person, { y: () => innerHeight * 0.25, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
  });
}
document.documentElement.classList.remove('gsap-loading');   // mesmo sem GSAP, a foto aparece
