/* ============================================================
   RHODES BURGERS — SELECTOR DE TEMA (claro / oscuro)
   ------------------------------------------------------------
   Va en el <head>, antes del primer pintado, para que no haya
   un parpadeo de tema al cargar. La eleccion se guarda una sola
   vez y vale para todo el sitio.
   ============================================================ */
(function () {
  'use strict';

  var KEY  = 'rb_theme';
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* modo privado: no persiste */ }
  }
  function apply(t) {
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
  }

  // 1) Aplicar YA, sincronico, antes de que se pinte la pagina.
  apply(read());

  /* Tema que se esta viendo ahora mismo. Si el usuario nunca eligio,
     se deduce del fondo real: las paginas de cliente y paneles son
     oscuras, las administrativas viejas son claras. */
  function current() {
    var attr = root.getAttribute('data-theme');
    if (attr) return attr;
    try {
      var bg = getComputedStyle(document.body).backgroundColor || '';
      var n  = bg.match(/\d+(\.\d+)?/g);
      if (n && n.length >= 3) {
        var lum = (0.2126 * +n[0] + 0.7152 * +n[1] + 0.0722 * +n[2]) / 255;
        return lum > 0.5 ? 'light' : 'dark';
      }
    } catch (e) { /* ignorar */ }
    return 'dark';
  }

  // 2) Boton flotante.
  function mount() {
    if (document.getElementById('rbThemeBtn') || !document.body) return;

    var btn = document.createElement('button');
    btn.id = 'rbThemeBtn';
    btn.type = 'button';

    function paint() {
      var light = current() === 'light';
      btn.textContent = light ? '🌙' : '☀️';
      var label = light ? 'Pasar a modo oscuro' : 'Pasar a modo claro';
      btn.title = label;
      btn.setAttribute('aria-label', label);
    }

    btn.addEventListener('click', function () {
      var next = current() === 'light' ? 'dark' : 'light';
      apply(next);
      write(next);
      paint();
      // La barra del navegador acompana al tema.
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'light' ? '#F6F2EA' : '#1C1810');
    });

    paint();
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // 3) Si se cambia el tema en otra pestana, esta se acomoda sola.
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    apply(e.newValue);
    var btn = document.getElementById('rbThemeBtn');
    if (btn) {
      var light = current() === 'light';
      btn.textContent = light ? '🌙' : '☀️';
    }
  });
})();
