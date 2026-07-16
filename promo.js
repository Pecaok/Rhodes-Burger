/* ════════════════════════════════════════════════════
   promo.js — Promo del día Rhodes Burgers
   - Un % de descuento sobre los productos que se eligen en el Admin.
   - Vigencia por fechas (desde / hasta).
   - Se aplica sobre el PRECIO BASE del producto, nunca sobre los extras.
   - Tiene prioridad sobre los sellos: si la promo agarra algún item del
     carrito, el 20% de sellos no se aplica y el sello queda sin consumir.
   Requiere: firebase-app-compat, firebase-firestore-compat ya cargados,
             y firebase.initializeApp() hecho.
   Expone: window.rbPromo
   ════════════════════════════════════════════════════ */
(function () {
  const DOC_PATH = ['config', 'dailyPromo'];

  let db = null;
  let promo = null;          // null = todavía no cargó o no existe
  let loaded = false;
  const listeners = [];

  function ensure() { if (!db) db = firebase.firestore(); }

  function notify() {
    listeners.forEach(fn => { try { fn(RB.isActive(), promo); } catch (e) { console.error(e); } });
  }

  function toDate(v) {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }

  const RB = {
    /* Escucha la promo en vivo. Llamar una vez por página, después de initializeApp. */
    init() {
      ensure();
      db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).onSnapshot(snap => {
        promo = snap.exists ? snap.data() : null;
        loaded = true;
        notify();
      }, err => {
        console.warn('promo:', err);
        promo = null;
        loaded = true;
        notify();
      });
    },

    /* Se llama con (isActive, promo) ante cada cambio, y una vez al suscribirse si ya cargó. */
    onChange(fn) {
      listeners.push(fn);
      if (loaded) { try { fn(RB.isActive(), promo); } catch (e) { console.error(e); } }
    },

    get raw() { return promo; },
    get loaded() { return loaded; },

    /* ¿Hay promo corriendo ahora mismo? */
    isActive(now) {
      if (!promo || promo.active !== true) return false;
      const pct = Number(promo.percent || 0);
      if (!(pct > 0)) return false;
      if (!Array.isArray(promo.productIds) || !promo.productIds.length) return false;
      const t = now || new Date();
      const from = toDate(promo.from), to = toDate(promo.to);
      if (from && t < from) return false;
      if (to && t > to) return false;
      return true;
    },

    label() {
      if (!RB.isActive()) return '';
      return String(promo.label || '').trim() || `Promo ${Number(promo.percent)}% off`;
    },

    percent() { return RB.isActive() ? Number(promo.percent || 0) : 0; },

    /* % que le toca a un producto puntual (0 si no entra en la promo). */
    pctFor(productId) {
      if (!RB.isActive() || !productId) return 0;
      return promo.productIds.indexOf(String(productId)) >= 0 ? Number(promo.percent || 0) : 0;
    },

    has(productId) { return RB.pctFor(productId) > 0; },

    /* Precio base ya con la promo aplicada. Si no entra, devuelve el mismo precio. */
    unitPrice(product) {
      if (!product) return 0;
      const base = Number(product.price || 0);
      const pct = RB.pctFor(product.id);
      if (!pct) return base;
      return base - Math.round(base * pct / 100);
    },

    /* Cuánto se le descuenta a UNA unidad de este producto (0 si no entra). */
    unitDiscount(product) {
      if (!product) return 0;
      const base = Number(product.price || 0);
      const pct = RB.pctFor(product.id);
      if (!pct) return 0;
      return Math.round(base * pct / 100);
    },

    /* Descuento total sobre una lista de items del carrito.
       Cada item: { id, qty, price }  (price = precio base, sin extras). */
    discountForItems(items) {
      if (!RB.isActive() || !Array.isArray(items)) return 0;
      let total = 0;
      items.forEach(i => {
        const pct = RB.pctFor(i.id);
        if (!pct) return;
        const base = Number(i.price || 0);
        total += Math.round(base * pct / 100) * (Number(i.qty) || 1);
      });
      return total;
    },

    /* ¿La promo agarra algún item del carrito? Si es true, los sellos no se aplican. */
    touchesCart(items) {
      return RB.discountForItems(items) > 0;
    },

    /* Datos para guardar en el pedido, para que Gerencia/Finanzas sepan qué pasó. */
    stampOnOrder(items) {
      const amount = RB.discountForItems(items);
      if (!amount) return { promoApplied: false, promoDiscount: 0, promoPct: 0, promoLabel: '' };
      return {
        promoApplied: true,
        promoDiscount: amount,
        promoPct: Number(promo.percent || 0),
        promoLabel: RB.label()
      };
    }
  };

  window.rbPromo = RB;
})();
