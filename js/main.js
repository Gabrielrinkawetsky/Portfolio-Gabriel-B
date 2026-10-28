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
  // &nbsp; vira o caractere de verdade: espaço comum some numa letra solta ("com IA" virava "comIA")
  const lines = heading.innerHTML.split(/<br\s*\/?>/i).map((l) => l.trim().replace(/&nbsp;/g, ' '));
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

// ---------- Foto pronta (baixada e decodificada) ----------
// O molde da luz laranja (mask-image) é a mesma foto, já no cache quando ela termina de baixar.
// Trava de 6 s: nunca fica escondida.
function photoReady() {
  const img = person && person.querySelector('img');
  return new Promise((resolve) => {
    if (!img) return resolve();
    const done = () => (img.decode ? img.decode() : Promise.resolve()).then(resolve, resolve);
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', resolve, { once: true }); }
    setTimeout(resolve, 6000);
  });
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
    .from($$('.nav a'), { yPercent: -120, autoAlpha: 0, duration: 0.9, stagger: 0.06, clearProps: 'transform,opacity,visibility' }, 0.6)
    .from($('.btn-work'), { y: 30, scale: 0.9, autoAlpha: 0, duration: 1, clearProps: 'transform,opacity,visibility' }, 0.85)
    .from($$('.stat'), { y: 50, autoAlpha: 0, duration: 1.1, stagger: 0.1, clearProps: 'transform,opacity,visibility' }, 0.95)
    .call(() => nums.forEach(countUp), null, 1.05)
    .from($$('.socials a'), { scale: 0.3, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' }, 1.1);

  // Foto: entra subindo e sendo descoberta de baixo para cima, sempre OPACA, e só depois de
  // baixada e decodificada inteira. Antes ela entrava esmaecendo (autoAlpha 0 → 1) no tempo
  // fixo de 0,5 s: o painel claro aparecia através dela ("branco por cima da foto, depois
  // atrás") e, com internet lenta, ela surgia pela metade. Se demorar, entra assim que chegar.
  gsap.set(person, { autoAlpha: 0 });
  photoReady().then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    gsap.fromTo(person,
      // sobe de baixo da moldura, inteira e opaca (sem efeito de aparecer)
      // começa inteira abaixo da moldura (nada à vista enquanto espera)
      { autoAlpha: 1, yPercent: 100 },
      { yPercent: 0, duration: 1.4, ease: 'expo.out',
        delay: Math.max(0, 0.5 - tl.time()) });
  })));

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
    // 1,8 s para alcançar o mouse (antes 0,9 s): o usuário pediu a foto mais lenta
    const toX = gsap.quickTo(person, 'x', { duration: 1.8, ease: 'power3.out' });
    const toY = gsap.quickTo(person, 'y', { duration: 1.8, ease: 'power3.out' });
    const move = (e) => {
      const r = hero.getBoundingClientRect();
      toX((((e.clientX - r.left) / r.width) * 2 - 1) * 18);   // antes 26 px: o usuário pediu menos parallax
      toY((((e.clientY - r.top) / r.height) * 2 - 1) * 11);   // antes 16 px
    };
    const reset = () => { toX(0); toY(0); };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', reset);
    return () => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', reset); };
  });
  mm.add('not ((hover: hover) and (pointer: fine))', () => {
    if (!ScrollTrigger) return;
    gsap.to(person, { y: () => innerHeight * 0.18, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
  });
  // PC: descendo a página, a foto desce junto (30% da altura dela até a hero sair da tela);
  // subindo, volta. Usa yPercent: o y fica com o parallax do mouse. (No celular já existe o
  // mesmo efeito acima, com y.)
  mm.add('(hover: hover) and (pointer: fine)', () => {
    if (!ScrollTrigger) return;
    gsap.to(person, { yPercent: 30, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
  });
}

document.documentElement.classList.remove('gsap-loading');   // mesmo sem GSAP, tudo aparece

// ---------- Sobre mim: revelação ao rolar ----------
// Título palavra por palavra (mesmas máscaras da hero), foto descoberta de baixo para cima e
// os blocos subindo em sequência, uma vez só. Sem GSAP ou com "reduzir movimento", tudo já
// está visível (nada fica escondido por CSS).
if (animate && ScrollTrigger) {
  const about = document.querySelector('.about');
  if (about) {
    const words = splitWords(about.querySelector('.about-title'));
    gsap.from(words, { yPercent: 110, duration: 1.1, stagger: 0.04, ease: 'expo.out',
      scrollTrigger: { trigger: about.querySelector('.about-title'), start: 'top 85%', once: true } });
    ScrollTrigger.batch(about.querySelectorAll('[data-ab]'), {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.from(els, { y: 40, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }),
    });
  }
}
// selo da seção Sobre mim: o fio cresce quando aparece na tela
{
  const k = document.querySelector('.about-kicker');
  if (k && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { k.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(k);
  } else if (k) k.classList.add('is-in');
}
// ---------- Crachá pendurado no "g" de "Código" (Sobre mim) ----------
// Pêndulo simples: o cordão sai do "g" do título e o crachá fica na ponta. Ao aparecer
// na tela ele cai de cima balançando; dá para arrastar (mouse ou dedo) e ele volta a balançar.
// ponytail: física 2D de um pêndulo só (sem 3D); trocar por react-three-fiber se quiser o cordão dobrando.
(() => {
  const about = document.querySelector('.about');
  const slot = about && about.querySelector('.cracha-slot');
  const lan = slot && slot.querySelector('.lanyard');
  const title = about && about.querySelector('.about-title');
  if (!lan || !title) return;
  const strap = lan.querySelector('.strap');
  const REST = -0.05;                 // leve inclinação parada, como no vídeo
  let ax = 0, ay = 0, L = 200, a = REST, v = 0, drag = null, running = false, last = 0, drop = 1;

  // posição do "g" de "Código" (o título pode estar separado em palavras pelo GSAP)
  function anchor() {
    const tw = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      const i = n.data.indexOf('Código');
      if (i < 0) continue;
      const r = document.createRange(); r.setStart(n, i + 4); r.setEnd(n, i + 5);
      return r.getBoundingClientRect();
    }
    return title.getBoundingClientRect();
  }
  function place() {
    const g = anchor(), ar = about.getBoundingClientRect(), sr = slot.getBoundingClientRect();
    ax = g.left + g.width / 2 - ar.left;
    ay = g.bottom - g.height * 0.12 - ar.top;           // na curvinha de baixo do "g"
    L = Math.max(140, sr.top - ar.top + 70 - ay);
    lan.style.left = ax + 'px'; lan.style.top = ay + 'px';
    strap.style.height = L + 'px';
    lan.style.setProperty('--L', L + 'px');
  }
  function draw() {
    lan.style.transform = `translateY(${-drop * (L + 420)}px) rotate(${a}rad)`;
    lan.style.visibility = drop >= 1 ? 'hidden' : '';   // antes de cair ficava aparecendo no pé da hero
    lan.style.setProperty('--tilt', (v * 0.06).toFixed(3) + 'rad');   // o cartão gira um pouco com a velocidade
  }
  function step(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
    if (!drag) { v += (-16 * Math.sin(a - REST) - 1.4 * v) * dt; a += v * dt; }
    drop = Math.max(0, drop - dt * 2.2);
    place();   // o título ainda pode estar animando: o "g" muda de lugar
    draw();
    if (drag || drop > 0 || Math.abs(v) > 0.002 || Math.abs(a - REST) > 0.002) requestAnimationFrame(step);
    else running = false;
  }
  const kick = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } };

  place();
  if (reduceMotion) { drop = 0; draw(); }
  else {
    drop = 1; draw();
    new IntersectionObserver((e, o) => {
      if (!e[0].isIntersecting) return;
      o.disconnect(); place(); a = 0.9; v = 0; kick();
    }, { threshold: 0.25 }).observe(slot);
  }
  addEventListener('resize', () => { place(); draw(); });
  addEventListener('load', () => { place(); draw(); });
  setTimeout(() => { place(); draw(); }, 1800);   // depois da entrada do título

  // arrastar: o ângulo segue o ponteiro em volta do "g"
  const badge = lan.querySelector('.cracha');
  badge.addEventListener('pointerdown', (e) => {
    badge.setPointerCapture(e.pointerId); drag = { a, t: performance.now() }; drop = 0; kick();
  });
  badge.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const ar = about.getBoundingClientRect();
    const na = Math.max(-1.3, Math.min(1.3, Math.atan2(-(e.clientX - ar.left - ax), e.clientY - ar.top - ay)));
    const now = performance.now();
    v = (na - drag.a) / Math.max(0.008, (now - drag.t) / 1000); drag = { a: na, t: now }; a = na;
  });
  const up = () => { drag = null; v = Math.max(-6, Math.min(6, v)); kick(); };
  badge.addEventListener('pointerup', up); badge.addEventListener('pointercancel', up);
})();
