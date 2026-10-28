// ---------- Crachá 3D pendurado no "g" de "Código" (Sobre mim) ----------
// Estilo do Lanyard do React Bits: fita que dobra, cartão que gira em 3D, dá para arrastar
// (mouse ou dedo) e ele volta balançando. O three.js só carrega quando a seção chega perto da tela.
// Sem WebGL fica o <figure> estático do HTML (que também é o que os leitores de tela leem).
// ponytail: física própria (Verlet, pontos + distâncias) no lugar de React + Rapier, que o site não usa.
const about = document.querySelector('.about');
const slot = about && about.querySelector('.cracha-slot');
const title = about && about.querySelector('.about-title');
const fig = slot && slot.querySelector('.cracha');

if (fig && title) {
  about.classList.add('cracha-loading');
  new IntersectionObserver((e, o) => {
    if (!e[0].isIntersecting) return;
    o.disconnect();
    start().catch((err) => {
      console.warn('crachá 3D desligado:', err);
      about.classList.remove('cracha-loading', 'cracha-3d');
    });
  }, { rootMargin: '400px 0px' }).observe(slot);
}

async function start() {
  const THREE = await import('./vendor/three.module.min.js');
  await document.fonts.load('600 20px "Inter Tight"').catch(() => {});
  await document.fonts.load(getComputedStyle(title).font).catch(() => {});   // a do título, para medir o "g"
  const img = fig.querySelector('img');
  const photo = new Image(); photo.src = img.currentSrc || img.src; await photo.decode();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = matchMedia('(max-width: 860px)').matches ? 150 : 180;   // largura do cartão (o antigo tinha 260 e ficava grande)
  const H = Math.round(W * 1.54);
  const BAND = Math.round(W * 0.12);   // largura da fita
  const N = 12;                        // pontos da fita
  const G = 3000, DAMPING = 1.2, STEP = 1 / 120, ITER = 12;
  const KF = 0.004, TWIST = 0.12;      // mola que vira o cartão de frente / giro que o balanço dá

  // ----- cena -----
  const canvas = document.createElement('canvas');
  canvas.className = 'cracha-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.visibility = 'hidden';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  about.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a948d, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-0.5, 1, 1.2); scene.add(sun);
  // reflexos: as mesmas faixas de luz (Lightformers) do Lanyard do React Bits, num mapa de ambiente.
  // Com o verniz (clearcoat) do cartão, elas viram brilhos que correm pelo cartão quando ele gira.
  const env = new THREE.Scene(), strip = new THREE.PlaneGeometry(1, 1);
  for (const [i, p, r, sc] of [[2, [0, -1, 5], [0, 0, 1.047], [100, 0.1]], [3, [-1, -1, 1], [0, 0, 1.047], [100, 0.1]],
    [3, [1, 1, 1], [0, 0, 1.047], [100, 0.1]], [10, [-10, 0, 14], [0, 1.571, 1.047], [100, 10]]]) {
    const m = new THREE.Mesh(strip, new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide }));
    m.position.set(...p); m.rotation.set(...r); m.scale.set(sc[0], sc[1], 1); env.add(m);
  }
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, 0.04).texture;
  const gloss = (o) => new THREE.MeshPhysicalMaterial({ clearcoat: 1, clearcoatRoughness: 0.15, roughness: 0.9, metalness: 0.1, envMapIntensity: 0.35, ...o });
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

  // cartão: corpo com espessura + frente (foto e nome) + verso; a origem fica no meio da borda de cima
  const shape = new THREE.Shape(), r = W * 0.07, x0 = -W / 2, y0 = -H / 2;
  shape.moveTo(x0 + r, y0); shape.lineTo(x0 + W - r, y0); shape.quadraticCurveTo(x0 + W, y0, x0 + W, y0 + r);
  shape.lineTo(x0 + W, y0 + H - r); shape.quadraticCurveTo(x0 + W, y0 + H, x0 + W - r, y0 + H);
  shape.lineTo(x0 + r, y0 + H); shape.quadraticCurveTo(x0, y0 + H, x0, y0 + H - r);
  shape.lineTo(x0, y0 + r); shape.quadraticCurveTo(x0, y0, x0 + r, y0);
  const face = (z, back) => {
    const g = new THREE.ShapeGeometry(shape, 8), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / W + 0.5, p.getY(i) / H + 0.5);
    if (back) g.rotateY(Math.PI);
    return g.translate(0, 0, z);
  };
  const card = new THREE.Group(), inner = new THREE.Group();
  inner.position.y = -H / 2;
  inner.add(
    new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -1.2),
      gloss({ color: 0xeceae6 })),
    new THREE.Mesh(face(1.4), gloss({ map: tex(drawFront()) })),
    new THREE.Mesh(face(-1.4, true), gloss({ map: tex(drawBack()) })),
  );
  // brilho do vídeo: faixa de luz na diagonal sobre a frente, que desliza quando o cartão gira/balança.
  // O reflexo do mapa de ambiente sozinho fica um véu borrado num cartão desse tamanho, então a faixa é desenhada.
  const glintTex = tex(drawGlint()); glintTex.repeat.x = 1 / 3;
  const glint = new THREE.Mesh(face(1.5), new THREE.MeshBasicMaterial({ map: glintTex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  inner.add(glint);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W + 80, H + 80),   // sombra suave atrás (o cartão branco sumia no fundo claro)
    new THREE.MeshBasicMaterial({ map: tex(drawShadow()), transparent: true, depthWrite: false }));
  shadow.position.set(4, -12, -10);
  inner.add(shadow);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.2, 12, 5), new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: 0.25, roughness: 0.3, envMapIntensity: 0.25 }));
  clip.position.y = 2;
  card.add(inner, clip);
  scene.add(card);

  // fita: tira plana ao longo de uma curva pelos pontos do cordão, com o nome repetido
  const S = 64;
  const bandTex = tex(drawBand()); bandTex.wrapS = THREE.RepeatWrapping;
  const tile = BAND * bandTex.image.width / bandTex.image.height;   // quantos px da fita cada repetição ocupa
  const LEAD = BAND * 1.3;   // trecho liso logo abaixo da dobra, antes do nome começar
  const bandPos = new Float32Array(S * 6), bandUv = new Float32Array(S * 4), idx = [];
  for (let i = 0; i < S - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const bandGeo = new THREE.BufferGeometry();
  bandGeo.setAttribute('position', new THREE.BufferAttribute(bandPos, 3));
  bandGeo.setAttribute('uv', new THREE.BufferAttribute(bandUv, 2));
  bandGeo.setIndex(idx);
  const band = new THREE.Mesh(bandGeo, new THREE.MeshBasicMaterial({ map: bandTex, side: THREE.DoubleSide }));
  band.frustumCulled = false;
  scene.add(band);
  // gancho de metal: dá a volta no traço de baixo do "g" (por cima e por trás) e desce até uma argola achatada;
  // a fita passa pela argola e dobra (a "cap" é a dobra, atrás da barra de baixo da argola)
  const metal = new THREE.MeshStandardMaterial({ color: 0x8e8e8e, metalness: 0.75, roughness: 0.3 });
  const hook = new THREE.Group(), hookWire = new THREE.Mesh(new THREE.BufferGeometry(), metal), hookRing = new THREE.Mesh(new THREE.BufferGeometry(), metal);
  hook.add(hookWire, hookRing);
  const cap = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#111' }));
  for (const o of [hook, cap]) { o.frustumCulled = false; scene.add(o); }
  let hookLen = 0, hookAng = 0;   // do centro do traço até a barra de baixo da argola / quanto o gancho está virado
  const HOOK_MAX = 0.75;          // o gancho vira no máximo ~43° para cada lado (encosta na letra)

  // ----- física: pontos da fita (0 = preso no "g", N = topo do cartão) + 2 cantos de baixo do cartão -----
  const pts = Array.from({ length: N + 3 }, (_, i) => ({ x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, w: i === 0 ? 0 : i >= N ? 0.35 : 1, card: i >= N }));
  const A = pts[0], T = pts[N], BL = pts[N + 1], BR = pts[N + 2], cardPts = [T, BL, BR];
  const D = Math.hypot(W / 2, H);
  let cw = 0, ch = 0, L = 200, drag = null, shown = false;

  function anchor() {   // posição do "g" de "Código" (o título pode estar separado em palavras pelo GSAP)
    const tw = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      const i = n.data.indexOf('Código');
      if (i < 0) continue;
      const rg = document.createRange(); rg.setStart(n, i + 4); rg.setEnd(n, i + 5);
      return { r: rg.getBoundingClientRect(), el: n.parentElement };
    }
    return { r: title.getBoundingClientRect(), el: title };
  }
  // centro do traço de baixo do "g" e a grossura dele: desenha a letra num canvas com a mesma fonte e procura
  // a tinta mais baixa. Fica como fração da caixa da letra, que acompanha o tamanho da fonte.
  let tail = { x: 0.5, y: 0.88, th: 0.08 };
  function measureTail() {
    const { r, el } = anchor(), cs = getComputedStyle(el), k = 3;
    const c = document.createElement('canvas'); c.width = Math.ceil(r.width * k) + 16; c.height = Math.ceil(r.height * k) + 16;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.scale(k, k); x.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    x.fillText('g', 0, x.measureText('g').fontBoundingBoxAscent);
    const a = x.getImageData(0, 0, c.width, c.height).data, ink = (px, py) => a[(py * c.width + px) * 4 + 3] > 128;
    for (let py = c.height - 1; py >= 0; py--) {
      let lo = -1, hi = -1;
      for (let px = 0; px < c.width; px++) if (ink(px, py)) { if (lo < 0) lo = px; hi = px; }
      if (lo < 0) continue;
      const cx = Math.round((lo + hi) / 2);
      let top = py; while (top > 0 && ink(cx, top - 1)) top--;
      tail = { x: cx / k / r.width, y: (py + top) / 2 / k / r.height, th: (py - top + 1) / k / r.height };
      return;
    }
  }
  const P = { x: 0, y: 0 };   // centro do traço do "g", onde o gancho gira
  function pin() {
    const { r } = anchor(), ar = about.getBoundingClientRect();
    P.x = r.left + r.width * tail.x - ar.left;
    P.y = r.top + r.height * tail.y - ar.top;
    placeA();
  }
  function placeA() {   // a fita fica presa na barra de baixo da argola, que gira junto com o gancho
    A.x = A.px = P.x + Math.sin(hookAng) * hookLen;
    A.y = A.py = P.y + Math.cos(hookAng) * hookLen;
  }
  function buildHook() {   // medidas a partir da grossura do traço do "g" e da largura da fita
    const t = tail.th * anchor().r.height, rw = Math.max(1.4, t * 0.18), R = t / 2 + rw + 0.6;
    const sh = Math.max(6, BAND * 0.35), wb = BAND + rw * 2 + 3, hb = Math.max(7, BAND * 0.45), rr = hb * 0.45;
    const wire = [];   // por trás do traço, por cima, desce pela frente
    for (let a = 215; a >= 0; a -= 7.5) { const q = THREE.MathUtils.degToRad(a); wire.push(new THREE.Vector3(0, R * Math.sin(q), R * Math.cos(q))); }
    wire.push(new THREE.Vector3(0, -sh / 2, R), new THREE.Vector3(0, -sh, R));
    const ring = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 6; k++) { const q = a0 - k * Math.PI / 12; ring.push(new THREE.Vector3(cx + rr * Math.cos(q), cy + rr * Math.sin(q), R)); } };
    arc(wb / 2 - rr, -sh - rr, Math.PI / 2); arc(wb / 2 - rr, -sh - hb + rr, 0);   // argola: retângulo de cantos redondos
    arc(-wb / 2 + rr, -sh - hb + rr, -Math.PI / 2); arc(-wb / 2 + rr, -sh - rr, -Math.PI);
    hookWire.geometry.dispose(); hookWire.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wire), 64, rw, 8);
    hookRing.geometry.dispose(); hookRing.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true, 'centripetal'), 96, rw, 8, true);
    hookLen = sh + hb;
    // dobra da fita: sobe passando a barra e arredonda por cima; embaixo é meio círculo, para a fita sair lisa em qualquer ângulo
    const hw = BAND / 2, s = new THREE.Shape();
    s.moveTo(-hw, 0); s.absarc(0, 0, hw, Math.PI, Math.PI * 2, false); s.lineTo(hw, rw);
    s.absellipse(0, rw, hw, rw * 2.2, 0, Math.PI, false); s.lineTo(-hw, 0);
    cap.geometry.dispose(); cap.geometry = new THREE.ShapeGeometry(s, 12);
  }
  function layout() {
    measureTail(); buildHook(); pin();
    const ar = about.getBoundingClientRect(), sr = slot.getBoundingClientRect();
    L = Math.max(120, sr.top - ar.top + 40 - A.y);   // o cartão fica 40px abaixo do topo da coluna
    cw = about.clientWidth; ch = Math.min(about.clientHeight, Math.ceil(A.y + L + H + 120));
    renderer.setSize(cw, ch);
    camera.aspect = cw / ch;
    camera.position.z = ch / 2 / Math.tan(THREE.MathUtils.degToRad(15));   // 1 unidade = 1px no plano z = 0
    camera.near = camera.position.z * 0.5; camera.far = camera.position.z * 1.5;
    camera.updateProjectionMatrix();
  }
  function hang(angle) {   // fita esticada num ângulo, cartão reto na ponta, tudo parado
    hookAng = THREE.MathUtils.clamp(angle, -HOOK_MAX, HOOK_MAX); placeA();
    const sx = Math.sin(angle), sy = Math.cos(angle);
    for (let i = 1; i <= N; i++) Object.assign(pts[i], { x: A.x + sx * L * i / N, y: A.y + sy * L * i / N, z: 0 });
    Object.assign(BL, { x: T.x - W / 2, y: T.y + H, z: 0 });
    Object.assign(BR, { x: T.x + W / 2, y: T.y + H, z: 0 });
    for (const p of pts) { p.px = p.x; p.py = p.y; p.pz = p.z; }
  }
  function keep(a, b, len, rope) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1e-6, sw = a.w + b.w;
    if ((rope && d <= len) || sw === 0) return;
    const k = (d - len) / d / sw;
    a.x += dx * k * a.w; a.y += dy * k * a.w; a.z += dz * k * a.w;
    b.x -= dx * k * b.w; b.y -= dy * k * b.w; b.z -= dz * k * b.w;
  }
  function apart(a, b, min) {   // afasta dois pontos que chegaram perto demais
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1e-6, sw = a.w + b.w;
    if (d >= min || sw === 0) return;
    const k = (d - min) / d / sw * 0.5;
    a.x += dx * k * a.w; a.y += dy * k * a.w; a.z += dz * k * a.w;
    b.x -= dx * k * b.w; b.y -= dy * k * b.w; b.z -= dz * k * b.w;
  }
  function step() {
    const damp = Math.exp(-DAMPING * STEP);
    // o gancho vira devagar para o lado em que a fita puxa, e a argola (ponta da fita) vai junto
    const pull = Math.atan2(pts[1].x - P.x, pts[1].y - P.y);
    hookAng += (THREE.MathUtils.clamp(pull, -HOOK_MAX, HOOK_MAX) - hookAng) * 0.08; placeA();
    const cx = (T.x + BL.x + BR.x) / 3, cy = (T.y + BL.y + BR.y) / 3;
    const vcx = (cx - (T.px + BL.px + BR.px) / 3) / STEP;
    let moved = 0;
    for (const p of pts) {
      const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp, vz = (p.z - p.pz) * damp;
      p.px = p.x; p.py = p.y; p.pz = p.z;
      if (p === A) continue;
      if (drag && p.card) { p.x += (drag.x - cx) * 0.3; p.y += (drag.y - cy) * 0.3; p.z += vz; }
      else { p.x += vx; p.y += vy + G * STEP * STEP; p.z += vz; }
      p.z *= 0.998;
      moved = Math.max(moved, Math.abs(p.x - p.px) + Math.abs(p.y - p.py) + Math.abs(p.z - p.pz));
    }
    // o balanço gira o cartão; a mola o traz de volta de frente
    const tw = drag ? 0 : vcx * TWIST * STEP;
    BL.z += tw; BR.z -= tw;
    const yaw = (BR.z - BL.z) * KF, pitch = (T.z - (BL.z + BR.z) / 2) * KF;
    BR.z += pitch - yaw; BL.z += pitch + yaw;
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < N; i++) keep(pts[i], pts[i + 1], L / N, true);
      for (let i = 0; i < N - 1; i++) apart(pts[i], pts[i + 2], L / N * 1.75);   // fita de tecido: curva, mas não dobra em quina
      keep(T, BL, D); keep(T, BR, D); keep(BL, BR, W);
    }
    if (drag) {   // arrastando: o cartão não passa do comprimento da fita
      const dx = T.x - A.x, dy = T.y - A.y, d = Math.hypot(dx, dy), over = d - L * 1.02;
      if (over > 0) for (const p of cardPts) { p.x -= dx / d * over; p.y -= dy / d * over; }
    }
    return moved;
  }

  // ----- desenho -----
  const toW = (p, v) => v.set(p.x - cw / 2, ch / 2 - p.y, p.z);
  const vT = new THREE.Vector3(), vL = new THREE.Vector3(), vR = new THREE.Vector3();
  const up = new THREE.Vector3(), right = new THREE.Vector3(), nrm = new THREE.Vector3(), m = new THREE.Matrix4();
  const ctrl = Array.from({ length: N + 1 }, () => new THREE.Vector3());
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const smp = Array.from({ length: S }, () => new THREE.Vector3());
  const Z = new THREE.Vector3(0, 0, 1), tan = new THREE.Vector3(), side = new THREE.Vector3(), cr = new THREE.Vector3();
  function draw() {
    toW(T, vT); toW(BL, vL); toW(BR, vR);
    up.addVectors(vL, vR).multiplyScalar(0.5).subVectors(vT, up).normalize();
    right.subVectors(vR, vL); right.addScaledVector(up, -right.dot(up)).normalize();
    nrm.crossVectors(right, up);
    card.quaternion.setFromRotationMatrix(m.makeBasis(right, up, nrm));
    card.position.copy(vT);
    // parado, a faixa fica no alto à esquerda da foto; virar e inclinar o cartão a faz correr de lado
    glintTex.offset.x = THREE.MathUtils.clamp(0.47 - nrm.x * 1.6 - Math.atan2(right.y, right.x) * 0.45, 0, 2 / 3);

    for (let i = 0; i <= N; i++) toW(pts[i], ctrl[i]);
    for (let i = 0; i < S; i++) curve.getPoint(i / (S - 1), smp[i]);
    let u = 0;
    for (let i = 0; i < S; i++) {
      tan.subVectors(smp[Math.min(S - 1, i + 1)], smp[Math.max(0, i - 1)]).normalize();
      side.crossVectors(Z, tan).normalize();
      const k = THREE.MathUtils.smoothstep(i / (S - 1), 0.8, 1);   // perto do clipe a fita deita junto com o cartão
      cr.copy(right); if (cr.dot(side) < 0) cr.negate();
      side.lerp(cr, k).normalize().multiplyScalar(BAND / 2);
      if (i) u += smp[i].distanceTo(smp[i - 1]);
      const p = smp[i], o = i * 6, tu = u < LEAD ? -0.01 : (u - LEAD) / tile;   // -0.01 = fim da repetição, que é só fundo
      bandUv.set([tu, 0, tu, 1], i * 4);
      bandPos[o] = p.x - side.x; bandPos[o + 1] = p.y - side.y; bandPos[o + 2] = p.z - side.z;
      bandPos[o + 3] = p.x + side.x; bandPos[o + 4] = p.y + side.y; bandPos[o + 5] = p.z + side.z;
    }
    hook.position.set(P.x - cw / 2, ch / 2 - P.y, 0); hook.rotation.z = hookAng;
    cap.position.copy(smp[0]); cap.rotation.z = hookAng;
    bandGeo.attributes.position.needsUpdate = true;
    bandGeo.attributes.uv.needsUpdate = true;
    renderer.render(scene, camera);
  }

  // ----- laço: só roda enquanto a seção está na tela e algo se mexe -----
  let running = false, visible = true, last = 0, acc = 0, still = 0;
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 1 / 60); last = t; acc += dt;
    pin();   // o título pode estar animando: o "g" muda de lugar
    let moved = 0;
    while (acc >= STEP) { moved = Math.max(moved, step()); acc -= STEP; }
    draw();
    still = moved < 0.02 && !drag ? still + dt : 0;
    if (visible && still < 0.5) requestAnimationFrame(frame); else running = false;
  }
  const kick = () => { still = 0; if (!running && visible && shown) { running = true; last = performance.now(); acc = 0; requestAnimationFrame(frame); } };

  layout(); hang(0); draw();
  about.classList.add('cracha-3d'); about.classList.remove('cracha-loading');
  const show = () => { shown = true; canvas.style.visibility = ''; kick(); };
  if (reduce) show();
  else new IntersectionObserver((e, o) => {   // aparece balançando quando a coluna entra na tela
    if (!e[0].isIntersecting) return;
    o.disconnect(); pin(); hang(0.9); show();
  }, { threshold: 0.25 }).observe(slot);
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; kick(); }).observe(about);
  const relayout = () => { layout(); if (!running) draw(); kick(); };
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  setTimeout(relayout, 1800);   // depois da entrada do título

  // ----- arrastar: o canvas não recebe cliques (o texto embaixo continua clicável), então testa o cartão aqui -----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const local = (e) => { const ar = about.getBoundingClientRect(); return { x: e.clientX - ar.left, y: e.clientY - ar.top }; };
  function onCard(e) {
    if (!shown) return false;
    const p = local(e);
    if (p.x < 0 || p.y < 0 || p.x > cw || p.y > ch) return false;
    ndc.set(p.x / cw * 2 - 1, 1 - p.y / ch * 2);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(card, true).length > 0;
  }
  let off = null;
  about.addEventListener('touchstart', (e) => { if (onCard(e.touches[0])) e.preventDefault(); }, { passive: false });   // não rola a página
  about.addEventListener('pointerdown', (e) => {
    if (!onCard(e)) return;
    e.preventDefault();
    about.setPointerCapture(e.pointerId);
    const p = local(e);
    off = { x: p.x - (T.x + BL.x + BR.x) / 3, y: p.y - (T.y + BL.y + BR.y) / 3 };
    drag = { x: p.x - off.x, y: p.y - off.y };
    for (const c of cardPts) c.w = 0;
    about.style.cursor = 'grabbing';
    kick();
  });
  about.addEventListener('pointermove', (e) => {
    if (drag) { const p = local(e); drag.x = p.x - off.x; drag.y = p.y - off.y; kick(); }
    else if (e.pointerType === 'mouse') about.style.cursor = onCard(e) ? 'grab' : '';
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    for (const c of cardPts) {   // solta com a velocidade do arrasto (limitada)
      c.w = 0.35;
      const vx = c.x - c.px, vy = c.y - c.py, s = Math.min(1, 25 / (Math.hypot(vx, vy) || 1));
      c.px = c.x - vx * s; c.py = c.y - vy * s;
    }
    about.style.cursor = '';
    kick();
  };
  about.addEventListener('pointerup', release);
  about.addEventListener('pointercancel', release);

  // ----- texturas -----
  function drawFront() {
    const k = 4, c = document.createElement('canvas'); c.width = W * k; c.height = H * k;
    const x = c.getContext('2d'); x.scale(k, k);
    const u = W / 260, pad = 12 * u;   // mesmas medidas do crachá do HTML (260px), em escala
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    hole(x, u, pad);
    const iy = pad + 18 * u, iw = W - pad * 2, ih = iw * 4 / 3;
    x.save(); x.beginPath(); x.roundRect(pad, iy, iw, ih, 10 * u); x.clip();
    x.drawImage(grayCover(iw * k, ih * k), pad, iy, iw, ih);
    x.restore();
    x.textBaseline = 'top';
    x.fillStyle = '#111'; x.font = `600 ${15 * u}px "Inter Tight", sans-serif`;
    x.fillText(fig.querySelector('figcaption strong').textContent, pad, iy + ih + 11 * u);
    x.fillStyle = '#6b6b6b'; x.font = `400 ${11.5 * u}px "Inter Tight", sans-serif`;
    x.fillText(fig.querySelector('figcaption span').textContent, pad, iy + ih + 31 * u);
    return c;
  }
  function drawBack() {
    const k = 4, c = document.createElement('canvas'); c.width = W * k; c.height = H * k;
    const x = c.getContext('2d'); x.scale(k, k);
    const u = W / 260;
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    hole(x, u, 12 * u);
    x.fillStyle = '#111'; x.font = `600 ${64 * u}px "Inter Tight", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('GR', W / 2, H / 2);
    x.fillStyle = '#f26b1d'; x.beginPath(); x.arc(W / 2 + 52 * u, H / 2 + 18 * u, 6 * u, 0, Math.PI * 2); x.fill();
    return c;
  }
  function hole(x, u, top) {
    x.fillStyle = '#e4e1dc'; x.beginPath(); x.roundRect((W - 46 * u) / 2, top, 46 * u, 8 * u, 4 * u); x.fill();
  }
  function grayCover(w, h) {   // foto P&B cortada em 3:4 (object-fit: cover)
    const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h);
    const x = c.getContext('2d'), s = Math.max(c.width / photo.naturalWidth, c.height / photo.naturalHeight);
    const dw = photo.naturalWidth * s, dh = photo.naturalHeight * s;
    x.drawImage(photo, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) a[i] = a[i + 1] = a[i + 2] = a[i] * 0.299 + a[i + 1] * 0.587 + a[i + 2] * 0.114;
    x.putImageData(d, 0, 0);
    return c;
  }
  function drawGlint() {   // 3 cartões de largura; a faixa fica no do meio: borda nítida à direita, some aos poucos à esquerda
    const k = 2, c = document.createElement('canvas'); c.width = W * 3 * k; c.height = H * k;
    const x = c.getContext('2d'); x.scale(k, k);
    x.translate(W * 1.5, H / 2); x.rotate(0.6);   // inclina para "/"
    const bw = W * 0.55, g = x.createLinearGradient(-bw, 0, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,.38)');
    x.fillStyle = g; x.fillRect(-bw, -H * 2, bw + 1.5, H * 4);
    return c;
  }
  function drawShadow() {
    const k = 2, m = 40, c = document.createElement('canvas'); c.width = (W + m * 2) * k; c.height = (H + m * 2) * k;
    const x = c.getContext('2d'); x.scale(k, k);
    x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 22 * k; x.shadowOffsetX = 10000 * k;   // só a sombra fica dentro do canvas
    x.fillStyle = '#000'; x.beginPath(); x.roundRect(m - 10000, m, W, H, W * 0.07); x.fill();
    return c;
  }
  function drawBand() {   // uma repetição do texto; a textura se repete ao longo da fita
    const text = 'GABRIEL RIBEIRO   •   FULL STACK   •   ', hpx = 64, font = `600 ${hpx * 0.42}px "Inter Tight", sans-serif`;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = font; c.width = Math.ceil(x.measureText(text).width); c.height = hpx;
    x.fillStyle = '#111'; x.fillRect(0, 0, c.width, hpx);
    x.font = font; x.fillStyle = 'rgba(255,255,255,.8)'; x.textBaseline = 'middle';
    x.fillText(text, 0, hpx / 2 + 1);
    return c;
  }
}
