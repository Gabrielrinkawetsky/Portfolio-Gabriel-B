// Hero do portfólio: entrada animada (letras, palavras, foto, cards), números contando e
// parallax da foto, com GSAP. Quem prefere menos movimento (prefers-reduced-motion) vê tudo
// parado e os números finais; se o GSAP não carregar, tudo aparece normalmente.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero = document.querySelector('.hero');
const person = document.querySelector('.person');
const { gsap, ScrollTrigger } = window;
const animate = Boolean(gsap && hero) && !reduceMotion;
// mesma condição do layout de celular no css/style.css
const MOBILE = '(max-width: 860px), (orientation: landscape) and (max-height: 500px) and (max-width: 1000px)';

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
  requestAnimationFrame(frame);
}
const resetCount = (el) => { el.textContent = '0' + (el.dataset.suffix || ''); };

// ---------- Quebra do texto em letras e palavras ----------
// Cada linha/palavra fica dentro de uma "máscara" (overflow: hidden) e o texto sobe de baixo
// dela, como se fosse revelado. Leitores de tela leem o título pelo aria-label.
function splitChars(heading) {
  const lines = heading.innerHTML.split(/<br\s*\/?>/i).map((l) => l.trim());
  heading.setAttribute('aria-label', lines.join(' '));
  heading.innerHTML = lines.map((line) =>
    `<span class="line-mask" aria-hidden="true"><span class="line">${
      [...line].map((c) => `<span class="char">${c}</span>`).join('')
    }</span></span>`).join('');
  return heading.querySelectorAll('.char');
}

function splitWords(root) {
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(part); continue; }
          const mask = document.createElement('span');
          mask.className = 'word-mask';
          mask.innerHTML = '<span class="word"></span>';
          mask.firstChild.textContent = part;
          frag.append(mask);
        }
        const prev = child.previousSibling, first = frag.firstChild;
        child.replaceWith(frag);
        // pontuação colada num <em> ("Gabriel" + "."): junta os dois para não quebrar a linha entre eles
        if (prev?.nodeType === Node.ELEMENT_NODE && first?.classList?.contains('word-mask') && /^[.,;:!?…”"')]+$/.test(first.textContent)) {
          const keep = document.createElement('span');
          keep.className = 'nowrap';
          prev.before(keep);
          keep.append(prev, first);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    }
  };
  walk(root);
  return root.querySelectorAll('.word');
}

// ---------- Entrada da hero (linha do tempo única, estilo awwwards) ----------
if (animate) {
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  const $ = (s) => hero.querySelector(s), $$ = (s) => hero.querySelectorAll(s);
  const isMobile = matchMedia(MOBILE).matches;

  const chars = splitChars($('.intro h1'));
  const pitchWords = splitWords($('.pitch-text'));
  const smallWords = splitWords($('.pitch-small'));
  const quoteWords = splitWords($('.quote-card blockquote'));
  const nums = $$('[data-count]');
  nums.forEach(resetCount);

  // a foto é centralizada com translateX(-50%) no CSS; o GSAP passa a cuidar do transform
  gsap.set(person, { xPercent: -50, x: 0, y: 0 });

  // clearProps devolve o controle ao CSS no fim (efeitos de hover usam transform)
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.snakes', { autoAlpha: 0, duration: 2.6, ease: 'power2.out', clearProps: 'opacity,visibility' }, 0)
    .from($('.logo'), { scale: 0, rotation: -120, duration: 1, ease: 'back.out(1.8)', clearProps: 'transform' }, 0.05);
  // painel claro desenrola de cima para baixo (no celular ele fica mais abaixo: entra na rolagem)
  if (!isMobile) {
    tl.from($('.panel'), { clipPath: 'inset(0% 0% 100% 0% round 16px)', duration: 1.25, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.05);
  }
  tl.from(chars, { yPercent: 115, rotation: 8, transformOrigin: '0% 100%', duration: 1.25, stagger: 0.035 }, 0.3)
    .from($('.tag'), { clipPath: 'inset(0% 100% 0% 0% round 999px)', duration: 1.1, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.3)
    .from(person, { yPercent: 40, autoAlpha: 0, duration: 1.4 }, 0.5)
    .from($$('.nav a'), { yPercent: -120, autoAlpha: 0, duration: 0.9, stagger: 0.06, clearProps: 'transform,opacity,visibility' }, 0.6)
    .from($('.btn-work'), { y: 30, scale: 0.9, autoAlpha: 0, duration: 1, clearProps: 'transform,opacity,visibility' }, 0.85)
    .from($$('.stat'), { y: 50, autoAlpha: 0, duration: 1.1, stagger: 0.1, clearProps: 'transform,opacity,visibility' }, 0.95)
    .call(() => nums.forEach(countUp), null, 1.05)
    .from($$('.socials a'), { scale: 0.3, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' }, 1.1);

  // conteúdo do painel: selo, apresentação palavra por palavra e card da citação
  const panelIn = (t, at) => t
    .from($('.badge'), { scale: 0.6, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' }, at)
    .from(pitchWords, { yPercent: 110, duration: 1, stagger: 0.025 }, at + 0.05)
    .from(smallWords, { yPercent: 110, duration: 0.8, stagger: 0.03 }, at + 0.4)
    .from($('.quote-card'), { y: 50, autoAlpha: 0, duration: 1.1, clearProps: 'transform,opacity,visibility' }, at + 0.3)
    .from(quoteWords, { yPercent: 110, duration: 0.9, stagger: 0.03 }, at + 0.5);
  if (!isMobile) {
    panelIn(tl, 0.7);
  } else {
    panelIn(gsap.timeline({
      defaults: { ease: 'expo.out' },
      scrollTrigger: ScrollTrigger ? { trigger: $('.panel'), start: 'top 85%', once: true } : undefined,
    }), 0);
  }
} else if (!reduceMotion) {
  // sem GSAP: os números contam quando aparecem na tela
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      countUp(entry.target);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => { resetCount(el); io.observe(el); });
}

// ---------- Parallax da foto (GSAP) ----------
// Só a foto tem parallax. No PC ela segue o mouse; no celular (sem mouse) ela anda mais
// devagar que a página na rolagem.
if (animate && person) {
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

document.documentElement.classList.remove('gsap-loading');   // mesmo sem GSAP, tudo aparece
