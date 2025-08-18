// netlify/functions/pedido.js
import { Firestore } from '@google-cloud/firestore';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function mkDb() {
  try {
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let   privateKey  = process.env.FIREBASE_PRIVATE_KEY || '';

    if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) throw new Error('Missing FIREBASE_* envs');

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
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Use POST' };
  if (!db) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error:'firestore_init_failed' }) };

  try {
    const data = JSON.parse(event.body || '{}');
    const safe = (v, d=null) => (v===undefined ? d : v);

    const payload = {
      cliente: { nombre:safe(data?.cliente?.nombre), apellido:safe(data?.cliente?.apellido), telefono:safe(data?.cliente?.telefono) },
      pago: safe(data?.pago), entrega: safe(data?.entrega), direccion: safe(data?.direccion),
      notas: safe(data?.notas), fries: safe(data?.fries),
      items: {
        burgers: Array.isArray(data?.items?.burgers) ? data.items.burgers : [],
        drinks:  Array.isArray(data?.items?.drinks)  ? data.items.drinks  : [],
      },
      total: Number.isFinite(data?.total) ? data.total : 0,
      createdAt: new Date().toISOString(),
      status: 'pendiente',
    };

    const ref = await db.collection('pedidos').add(payload);
    return { statusCode: 201, headers: { ...CORS, 'Content-Type':'application/json' }, body: JSON.stringify({ id: ref.id }) };
  } catch (err) {
    console.error('WRITE_FAILED:', err);
    return { statusCode: 500, headers: { ...CORS, 'Content-Type':'application/json' }, body: JSON.stringify({ error:'write_failed', detail:String(err?.message||err) }) };
  }
};
