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

// selo da seção Sobre mim: o fio cresce quando aparece na tela
{
  const k = document.querySelector('.about-kicker');
  if (k && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { k.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(k);
  } else if (k) k.classList.add('is-in');
}
// ---------- Rolagem suave leve (Lenis) ----------
// só no mouse/touchpad; inércia curta (lerp alto) para não "prender" entre seções.
// Celular segue com a rolagem nativa.
if (window.Lenis && !reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const lenis = new Lenis({ lerp: 0.16, wheelMultiplier: 1, smoothWheel: true, anchors: true, autoRaf: !window.gsap });
  if (window.gsap) {
    if (ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
  }
}

// "O que eu entrego": o fio laranja desce junto com a rolagem (a ponta fica a 60% da altura da tela),
// com um leve atraso para ficar macio; o item acende quando o fio passa do começo dele
{
  const list = document.querySelector('.about-areas ol');
  const items = list ? [...list.children] : [];
  if (list && reduceMotion) { list.style.setProperty('--p', 1); items.forEach((li) => li.classList.add('is-on')); }
  else if (list) {
    list.classList.add('is-live');
    let cur = 0, raf = 0;
    const target = () => { const r = list.getBoundingClientRect(); return Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height)); };
    const tick = () => {
      const t = target();
      cur += (t - cur) * 0.12;
      if (Math.abs(t - cur) < 0.0005) cur = t;
      list.style.setProperty('--p', cur.toFixed(4));
      const tip = cur * list.offsetHeight;
      for (const li of items) li.classList.toggle('is-on', tip >= li.offsetTop + li.offsetHeight * 0.3);
      raf = cur === t ? 0 : requestAnimationFrame(tick);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener('scroll', go, { passive: true });
    addEventListener('resize', go);
    go();
  }
}

// Projetos: carrossel de notebooks 3D (o desenho e as animações estão no css/style.css). O primeiro
// notebook abre quando aparece na tela; setas, teclado (← →) e arrastar para o lado trocam de projeto:
// o atual fecha e sai, o próximo entra pelo outro lado e abre. A tela só rola com a seção à vista.
{
  const pj = document.querySelector('.pj');
  const slides = pj ? [...pj.querySelectorAll('.pj-slide')] : [];
  if (slides.length) {
    const count = pj.querySelector('.pj-count b'), dots = [...pj.querySelectorAll('.pj-dots i')];
    let cur = -1, inView = false;
    // vídeo do site na tela: começa do início quando a tampa termina de abrir (css: 1.3s + 1.3s) e só toca
    // com a seção à vista; o do notebook que saiu para depois que ele some
    const vid = (s) => s && s.querySelector('.lp-screen video');
    // dois tamanhos de cada vídeo: 960px (PC e tablet) e 720px (notebook pequeno, no celular); só baixa quando for tocar
    const load = (v) => {
      if (!v || v.src) return;
      v.src = v.dataset.src + (v.parentElement.offsetWidth >= 420 ? '-960.mp4' : '-720.mp4');
      v.preload = 'auto';
    };
    const playVideo = (s, old) => {
      const o = vid(old);
      if (o) { o.canStart = false; setTimeout(() => { if (old !== slides[cur]) { o.pause(); o.classList.remove('is-on'); } }, 1300); }
      const v = vid(s);
      if (!v || reduceMotion) return;
      clearTimeout(v.startTimer);
      v.canStart = false;
      v.pause();
      v.classList.remove('is-on');
      load(v);
      v.startTimer = setTimeout(() => {
        if (s !== slides[cur]) return;
        v.canStart = true;
        v.currentTime = 0;
        if (inView) v.play().catch(() => {});
      }, 1900);
    };
    slides.forEach((s) => {
      const v = vid(s);
      if (v) v.addEventListener('playing', () => v.classList.add('is-on'));
    });
    const show = (i, dir = 1) => {
      i = (i + slides.length) % slides.length;
      if (i === cur) return;
      const old = slides[cur], next = slides[i];
      if (old) {
        old.style.setProperty('--x', -dir);
        old.classList.replace('is-active', 'is-leaving');
        old.inert = true;
        clearTimeout(old.leaveTimer);
        old.leaveTimer = setTimeout(() => old.classList.remove('is-leaving'), 1300);   // depois de sumir (css: visibility .. 1.2s)
      }
      // o próximo vai para o lado de onde vem sem animar, e só então entra
      clearTimeout(next.leaveTimer);
      next.classList.remove('is-leaving');
      next.style.transition = 'none'; next.style.setProperty('--x', dir); next.offsetWidth; next.style.transition = '';
      next.classList.add('is-active');
      next.inert = false;
      cur = i;
      playVideo(next, old);
      count.textContent = String(i + 1).padStart(2, '0');
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    };
    const step = (dir) => show(Math.max(cur, 0) + dir, dir);
    slides.forEach((s, k) => { s.inert = k > 0; });

    if ('IntersectionObserver' in window && !reduceMotion) {
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); if (cur < 0) show(0); } }, { threshold: 0.45 })
        .observe(slides[0].querySelector('.laptop'));
      new IntersectionObserver(([e]) => {
        inView = e.isIntersecting;
        pj.classList.toggle('is-paused', !inView);
        const v = vid(slides[cur]);
        if (v && v.canStart) { if (inView) v.play().catch(() => {}); else v.pause(); }
      }).observe(pj);
      // o vídeo do primeiro projeto começa a baixar quando a seção chega perto
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); const v = vid(slides[0]); load(v); } }, { rootMargin: '600px 0px' })
        .observe(pj);
    } else show(0);

    pj.querySelectorAll('.pj-arrow').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.dir))));
    pj.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
    });

    // arrastar para o lado (dedo ou mouse): mais de 50px na horizontal troca de projeto
    let sx = null, sy = 0;
    pj.querySelector('.pj-track').addEventListener('pointerdown', (e) => { if (e.button === 0) { sx = e.clientX; sy = e.clientY; } });
    addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
    });
    addEventListener('pointercancel', () => { sx = null; });

    // no PC o notebook inclina um pouco seguindo o mouse
    if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      pj.addEventListener('pointermove', (e) => {
        const r = pj.getBoundingClientRect();
        pj.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        pj.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
      pj.addEventListener('pointerleave', () => { pj.style.setProperty('--mx', 0); pj.style.setProperty('--my', 0); });
    }
  }
}
