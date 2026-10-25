/* Parallax da foto (só no computador, com mouse): a foto acompanha o mouse devagar,
   poucos pixels, dando profundidade sobre o fundo. No celular e com "reduzir movimento",
   a foto fica parada. Velocidade: a foto anda 4,5% do caminho que falta a cada quadro. */
(function () {
  var hero = document.querySelector('.hero');
  var person = document.querySelector('.person');
  if (!hero || !person) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return;

  var SPEED = 0.045;      // menor = mais lento
  var RANGE_X = 10;       // deslocamento máximo, em px
  var RANGE_Y = 6;
  var tx = 0, ty = 0, x = 0, y = 0, raf = 0;

  function tick() {
    x += (tx - x) * SPEED;
    y += (ty - y) * SPEED;
    person.style.setProperty('--px', (x * RANGE_X).toFixed(2) + 'px');
    person.style.setProperty('--py', (y * RANGE_Y).toFixed(2) + 'px');
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
  }
  function go() { if (!raf) raf = requestAnimationFrame(tick); }

  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width * 2 - 1;
    ty = (e.clientY - r.top) / r.height * 2 - 1;
    go();
  });
  hero.addEventListener('pointerleave', function () { tx = ty = 0; go(); });
})();
