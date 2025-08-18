import { Firestore } from '@google-cloud/firestore';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getFirestoreClient() {
  try {
    // Opción A: todo el JSON de la service account en base64 (recomendado)
    if (process.env.GCP_SA_JSON_B64) {
      const jsonStr = Buffer.from(process.env.GCP_SA_JSON_B64, 'base64').toString('utf8');
      const sa = JSON.parse(jsonStr);
      return new Firestore({
        projectId: sa.project_id,
        credentials: { client_email: sa.client_email, private_key: sa.private_key },
      });
    }
    // Opción B: variables separadas (client_email / private_key / project_id)
    if (process.env.GCP_PROJECT_ID && process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
      return new Firestore({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          // Si pegaste el key con \n, esto los convierte en saltos reales
          private_key: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        },
      });
    }
  } catch (e) {
    console.error('FIRESTORE_INIT_ERROR', e);
  }
  return null;
}

const db = getFirestoreClient();

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  if (!db) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'firestore_init_failed', hint: 'Revisá variables de entorno' }),
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');

    // Saneo mínimo para evitar null/undefined raros
    const safe = (v, d = null) => (v === undefined ? d : v);
    const payload = {
      cliente: {
        nombre: safe(data?.cliente?.nombre),
        apellido: safe(data?.cliente?.apellido),
        telefono: safe(data?.cliente?.telefono),
      },
      pago: safe(data?.pago),
      entrega: safe(data?.entrega),
      direccion: safe(data?.direccion),
      notas: safe(data?.notas),
      fries: safe(data?.fries),
      items: {
        burgers: Array.isArray(data?.items?.burgers) ? data.items.burgers : [],
        drinks: Array.isArray(data?.items?.drinks) ? data.items.drinks : [],
      },
      total: Number.isFinite(data?.total) ? data.total : 0,
      createdAt: new Date().toISOString(),
      status: 'pendiente',
    };

    const ref = await db.collection('pedidos').add(payload);
    return {
      statusCode: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ref.id }),
    };
  } catch (err) {
    console.error('WRITE_FAILED', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'write_failed', detail: String(err?.message || err) }),
    };
  }
};
