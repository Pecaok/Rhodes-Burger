import { Firestore } from '@google-cloud/firestore';

const db = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');

    // saneo mínimo para que no fallen campos faltantes
    const safe = (v, d) => (v === undefined ? d : v);
    const payload = {
      cliente: {
        nombre: safe(data?.cliente?.nombre, null),
        apellido: safe(data?.cliente?.apellido, null),
        telefono: safe(data?.cliente?.telefono, null),
      },
      pago: safe(data?.pago, null),
      entrega: safe(data?.entrega, null),
      direccion: safe(data?.direccion, null),
      notas: safe(data?.notas, null),
      fries: safe(data?.fries, null),
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
    console.error(err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'write_failed' }),
    };
  }
};
