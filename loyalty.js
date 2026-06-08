/* ════════════════════════════════════════════════════
   loyalty.js — Sistema de sellos Rhodes Burgers
   - Login con Google (Firebase Auth)
   - Cada pedido suma 1 sello. A los 10 -> 10% off el próximo.
   - Al usar el descuento, los sellos vuelven a 0.
   Requiere: firebase-app-compat, firebase-firestore-compat,
             firebase-auth-compat ya cargados, y firebase.initializeApp() hecho.
   Expone: window.rbLoyalty
   ════════════════════════════════════════════════════ */
(function () {
  const STAMPS_GOAL = 10;     // sellos necesarios
  const DISCOUNT_PCT = 0.20;  // 10%
  const MIN_FOR_STAMP = 20000; // subtotal mínimo (comida) para que el pedido sume sello

  let auth = null, db = null;
  let user = undefined;       // undefined = aún no resuelto; null = sin sesión
  let data = null;            // datos del cliente (sellos, etc.)
  const listeners = [];

  function ensure() {
    if (!auth) auth = firebase.auth();
    if (!db) db = firebase.firestore();
  }

  function notify() {
    listeners.forEach(fn => { try { fn(user, data); } catch (e) { console.error(e); } });
  }

  async function loadCustomer(u) {
    const ref = db.collection('customers').doc(u.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      const init = {
        name: u.displayName || '', email: u.email || '', photoURL: u.photoURL || '',
        stamps: 0, ordersCount: 0, rewardAvailable: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await ref.set(init);
      data = { name: init.name, email: init.email, photoURL: init.photoURL, stamps: 0, ordersCount: 0, rewardAvailable: false };
    } else {
      data = snap.data();
    }
    return data;
  }

  const RB = {
    STAMPS_GOAL, DISCOUNT_PCT, MIN_FOR_STAMP,

    /* Inicia el listener de sesión. Llamar una vez por página, después de initializeApp. */
    init() {
      ensure();
      // Recuperar resultado de signInWithRedirect (fallback móvil)
      auth.getRedirectResult().catch(() => {});
      auth.onAuthStateChanged(async u => {
        user = u || null;
        if (u) {
          try { await loadCustomer(u); } catch (e) { console.error('loyalty load', e); data = null; }
        } else {
          data = null;
        }
        notify();
      });
    },

    /* Suscribirse a cambios de sesión/sellos. Recibe (user, data). */
    onChange(fn) {
      listeners.push(fn);
      if (user !== undefined) fn(user, data);
    },

    async login() {
      ensure();
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await auth.signInWithPopup(provider);
      } catch (e) {
        if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request' ||
                  e.code === 'auth/operation-not-supported-in-this-environment')) {
          await auth.signInWithRedirect(provider);
        } else if (e && e.code === 'auth/popup-closed-by-user') {
          /* el usuario cerró el popup, no hacer nada */
        } else {
          console.error('login error', e);
          alert('No se pudo iniciar sesión: ' + (e.message || e.code || e));
        }
      }
    },

    async logout() { ensure(); await auth.signOut(); },

    get user() { return user; },
    get data() { return data; },
    isLoggedIn() { return !!user; },
    hasReward() { return !!(data && data.rewardAvailable); },
    stamps() { return data ? Number(data.stamps || 0) : 0; },
    remaining() { return Math.max(0, STAMPS_GOAL - this.stamps()); },

    /* Registrar un pedido recién confirmado.
       usedReward = true si este pedido aplicó el 10% de sellos.
       amount = subtotal de comida; solo suma sello si es >= MIN_FOR_STAMP.
       Devuelve el estado actualizado. */
    async registerOrder(usedReward, amount) {
      if (!user) return null;
      ensure();
      const sumaSello = Number(amount || 0) >= MIN_FOR_STAMP; // ¿alcanza el mínimo?
      const ref = db.collection('customers').doc(user.uid);
      const res = await db.runTransaction(async t => {
        const snap = await t.get(ref);
        const d = snap.exists ? snap.data() : { stamps: 0, ordersCount: 0, rewardAvailable: false };
        let stamps = Number(d.stamps || 0);
        const ordersCount = Number(d.ordersCount || 0) + 1;
        let rewardAvailable = !!d.rewardAvailable;

        if (usedReward) {
          // Canjeó el premio en este pedido -> reinicia el ciclo
          stamps = 0;
          rewardAvailable = false;
        } else if (sumaSello) {
          // Solo suma sello si el subtotal llega al mínimo
          stamps = stamps + 1;
          if (stamps >= STAMPS_GOAL) { stamps = STAMPS_GOAL; rewardAvailable = true; }
        }
        // si no llega al mínimo y no canjeó, no toca los sellos (solo ordersCount)

        const upd = {
          stamps, ordersCount, rewardAvailable,
          name: user.displayName || d.name || '',
          email: user.email || d.email || '',
          photoURL: user.photoURL || d.photoURL || '',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!snap.exists) upd.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        t.set(ref, upd, { merge: true });
        return upd;
      });
      data = Object.assign({}, data || {}, res);
      notify();
      return res;
    },

    /* Guardar datos editables del perfil (teléfono, nombre). */
    async updateProfile(fields) {
      if (!user) return null;
      ensure();
      const ref = db.collection('customers').doc(user.uid);
      const upd = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (typeof fields.phone === 'string') upd.phone = fields.phone.trim();
      if (typeof fields.name === 'string' && fields.name.trim()) upd.name = fields.name.trim();
      await ref.set(upd, { merge: true });
      data = Object.assign({}, data || {}, upd);
      notify();
      return data;
    },

    /* Traer los pedidos anteriores del cliente (orden cliente-side por fecha). */
    async getOrders() {
      if (!user) return [];
      ensure();
      const snap = await db.collection('orders').where('customerUid', '==', user.uid).get();
      const arr = snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
      arr.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return arr;
    }
  };

  window.rbLoyalty = RB;
})();
