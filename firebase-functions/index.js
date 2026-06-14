// Facturación electrónica ARCA (Factura C de monotributo, CbteTipo 11) como
// Firebase Cloud Function. Corre en Node, donde @afipsdk/afip.js funciona, y es
// independiente de dónde esté el sitio (Cloudflare). El panel la llama con
// firebase.functions().httpsCallable('facturar').
//
// Configuración:
//   Secrets (sensibles):  firebase functions:secrets:set AFIP_CUIT / AFIP_CERT / AFIP_KEY
//     - AFIP_CUIT: CUIT del titular del monotributo (solo números)
//     - AFIP_CERT: certificado .crt/.pem completo (con BEGIN/END)
//     - AFIP_KEY:  clave privada .key completa
//   No sensibles (firebase-functions/.env):
//     - AFIP_PRODUCTION=true  → facturas reales; ausente/false = homologación (prueba)
//     - AFIP_PUNTO_VENTA=1    → punto de venta habilitado para web services
//
// Mientras falten AFIP_CUIT/CERT/KEY devuelve {error:'arca_no_configurado'} para
// que el panel siga facturando por el flujo manual (WhatsApp) sin romperse.
const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Afip = require("@afipsdk/afip.js");

admin.initializeApp();

const AFIP_CUIT = defineSecret("AFIP_CUIT");
const AFIP_CERT = defineSecret("AFIP_CERT");
const AFIP_KEY = defineSecret("AFIP_KEY");

exports.facturar = onCall(
  { secrets: [AFIP_CUIT, AFIP_CERT, AFIP_KEY], cors: true },
  async (req) => {
    const cuit = AFIP_CUIT.value();
    const cert = AFIP_CERT.value();
    const key = AFIP_KEY.value();
    if (!cuit || !cert || !key) return { error: "arca_no_configurado" };

    const orderId = req.data && req.data.orderId;
    if (!orderId) return { error: "falta_orderId" };

    const db = admin.firestore();
    const ref = db.collection("orders").doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return { error: "pedido_no_encontrado" };

    const o = snap.data();
    // Anti-doble facturación: si ya tiene CAE, devolvemos esa factura.
    if (o.factura && o.factura.cae) return { ...o.factura, yaFacturado: true };

    const total = Math.round(Number(o.total || 0) * 100) / 100;
    if (!(total > 0)) return { error: "total_invalido" };

    try {
      const production = process.env.AFIP_PRODUCTION === "true";
      const ptoVta = Number(process.env.AFIP_PUNTO_VENTA || 1);
      const afip = new Afip({ CUIT: Number(cuit), cert, key, production });

      const hoy = new Date();
      const fch = Number(
        `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}`
      );

      // Factura C (monotributo): sin IVA discriminado → ImpNeto = ImpTotal.
      const data = {
        CantReg: 1,
        PtoVta: ptoVta,
        CbteTipo: 11, // Factura C
        Concepto: 1, // productos
        DocTipo: 99, // Consumidor Final
        DocNro: 0,
        CbteFch: fch,
        ImpTotal: total,
        ImpTotConc: 0,
        ImpNeto: total,
        ImpOpEx: 0,
        ImpIVA: 0,
        ImpTrib: 0,
        MonId: "PES",
        MonCotiz: 1,
      };

      const res = await afip.ElectronicBilling.createNextVoucher(data);
      const factura = {
        cae: res.CAE,
        vto: res.CAEFchVto,
        nro: res.voucher_number,
        ptoVta,
        tipo: 11,
        total,
        production,
        fecha: fch,
        creadoEn: new Date().toISOString(),
      };
      await ref.update({ factura });
      return factura;
    } catch (e) {
      console.error("FACTURAR_ERROR:", e);
      return { error: "arca_error", detalle: String((e && e.message) || e) };
    }
  }
);
