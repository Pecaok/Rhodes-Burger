/* Promo de pago en efectivo — lógica compartida.
   Fuente única: config/promoEfectivo = {activo, percent, dias:[0..6]} con 0=domingo.
   La escribe admin.html · la aplica mostrador.html · la anuncian index.html y pedido_cliente.html. */
(function(){
  const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

  // Devuelve la promo lista para usar, o null si está apagada o mal cargada.
  function normalizar(d){
    if(!d||d.activo!==true)return null;
    const percent=Number(d.percent)||0;
    const dias=Array.isArray(d.dias)?d.dias.map(Number).filter(n=>n>=0&&n<=6):[];
    if(!(percent>0)||!dias.length)return null;
    return {percent,dias:[...new Set(dias)].sort((a,b)=>a-b)};
  }

  // ¿Corresponde hoy? Reloj local, igual que el resto del sistema (los equipos están en Argentina).
  function aplicaHoy(promo){
    return !!promo&&promo.dias.includes(new Date().getDay());
  }

  // "miércoles y jueves" · "lunes, martes y viernes"
  function textoDias(promo){
    if(!promo)return '';
    const n=promo.dias.map(i=>DIAS[i]);
    return n.length===1?n[0]:n.slice(0,-1).join(', ')+' y '+n[n.length-1];
  }

  function descuento(promo,monto){
    return promo?Math.round(Number(monto||0)*promo.percent/100):0;
  }

  // cb(promo|null) en cada cambio del doc, ya normalizada.
  function watch(db,cb){
    return db.collection('config').doc('promoEfectivo')
      .onSnapshot(snap=>cb(normalizar(snap.exists?snap.data():null)),()=>cb(null));
  }

  window.RBPromoEfectivo={watch,normalizar,aplicaHoy,textoDias,descuento};
})();
