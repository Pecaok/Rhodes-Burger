// netlify/functions/facturar.js
// Factura electrónica ARCA (ex-AFIP): Factura C de monotributo (CbteTipo 11),
// sin IVA, a Consumidor Final. Se dispara desde el botón 🧾 del panel del local.
//
// Variables de entorno en Netlify (Site config → Environment variables):
//   AFIP_CUIT          CUIT del titular del monotributo (sin guiones)
//   AFIP_CERT          certificado .crt/.pem (texto completo, incluí BEGIN/END)
//   AFIP_KEY           clave privada .key (texto completo)
//   AFIP_PRODUCTION    "true" para facturas reales; ausente/"false" = homologación (prueba)
//   AFIP_PUNTO_VENTA   nº de punto de venta habilitado para web services (default 1)
//   AFIP_ACCESS_TOKEN  (opcional) token de afipsdk.com
//   FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY  (ya usados por otras functions)
//
// Mientras falten AFIP_CUIT/CERT/KEY, devuelve {error:'arca_no_configurado'}
// para que el panel siga facturando por el flujo manual (WhatsApp) sin romperse.
import { Firestore } from '@google-cloud/firestore';
import Afip from '@afipsdk/afip.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (statusCode, obj) => ({
  statusCode,
  headers: { ...CORS, 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

function mkDb() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return null;
    return new Firestore({
      projectId,
      credentials: { client_email: clientEmail, private_key: privateKey },
    });
  } catch (e) {
    console.error('FIRESTORE_INIT_ERROR:', e);
    return null;
  }
}
const db = mkDb();

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!db) return json(500, { error: 'firestore_init_failed' });

  const CUIT = process.env.AFIP_CUIT;
  const cert = process.env.AFIP_CERT;
  const key = process.env.AFIP_KEY;
  if (!CUIT || !cert || !key) return json(200, { error: 'arca_no_configurado' });

  try {
    const { orderId } = JSON.parse(event.body || '{}');
    if (!orderId) return json(400, { error: 'falta_orderId' });

    const ref = db.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return json(404, { error: 'pedido_no_encontrado' });
    const o = snap.data();

    // Anti-doble facturación: si ya tiene CAE, devolvemos esa factura.
    if (o.factura && o.factura.cae) return json(200, { ...o.factura, yaFacturado: true });

    const total = Math.round(Number(o.total || 0) * 100) / 100;
    if (!(total > 0)) return json(400, { error: 'total_invalido' });

    const production = process.env.AFIP_PRODUCTION === 'true';
    const ptoVta = Number(process.env.AFIP_PUNTO_VENTA || 1);
    const afip = new Afip({
      CUIT: Number(CUIT),
      cert,
      key,
      production,
      ...(process.env.AFIP_ACCESS_TOKEN ? { access_token: process.env.AFIP_ACCESS_TOKEN } : {}),
    });

    const hoy = new Date();
    const fch = Number(
      `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`
    );

    // Factura C (monotributo): sin discriminación de IVA → ImpNeto = ImpTotal.
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
      MonId: 'PES',
      MonCotiz: 1,
    };

    // createNextVoucher numera solo (último + 1) y emite el comprobante.
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
    return json(200, factura);
  } catch (e) {
    console.error('FACTURAR_ERROR:', e);
    return json(500, { error: 'arca_error', detalle: String(e?.message || e) });
  }
};
