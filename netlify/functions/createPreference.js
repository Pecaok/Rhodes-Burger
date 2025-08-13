// netlify/functions/create-preference.js

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ok  = (body) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const err = (code, body) => ({ statusCode: code, headers: CORS, body: JSON.stringify(body) });

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
    if (event.httpMethod !== 'POST') return err(405, { error: 'Use POST' });

    const token = process.env.MP_ACCESS_TOKEN; // <<<<< configurá esta variable en Netlify
    if (!token) return err(500, { error: 'Falta MP_ACCESS_TOKEN en Netlify' });

    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); }
    catch (e) { return err(400, { error: 'JSON inválido', details: String(e) }); }

    const { items = [], orderId = '', cliente = '' } = payload;
    if (!Array.isArray(items) || items.length === 0) {
      return err(400, { error: 'items vacío' });
    }

    // Adaptar a formato MP
    const mpItems = items.map(it => ({
      title: it.item || it.title || 'Producto',
      quantity: Number(it.quantity || 1),
      currency_id: 'ARS',
      unit_price: Number(it.price || it.unit_price || 0),
    }));

    // Sólo débito (excluye crédito, ticket y atm). Ajustá si querés permitir más.
    const payment_methods = {
      excluded_payment_types: [
        { id: 'credit_card' },
        { id: 'ticket' },
        { id: 'atm' },
      ],
    };

    const siteUrl = process.env.URL || 'https://rhodes-burgers.netlify.app';

    const bodyPref = {
      items: mpItems,
      payer: { name: cliente || 'Cliente' },
      external_reference: orderId || String(Date.now()),
      back_urls: {
        success: `${siteUrl}/success.html`,
        failure: `${siteUrl}/failure.html`,
        pending: `${siteUrl}/success.html`,
      },
      auto_return: 'approved',
      payment_methods,
    };

    // Llamada al API de Mercado Pago
    let r, txt, data;
    try {
      r = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPref),
      });
      txt = await r.text();
      try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    } catch (fetchErr) {
      return err(500, { error: 'Fallo llamando a MP', details: String(fetchErr) });
    }

    if (!r.ok) {
      return err(r.status, {
        error: data?.message || 'MP rechazó la preferencia',
        details: data,
      });
    }

    return ok({
      id: data.id,
      init_point: data.init_point || data.sandbox_init_point,
      sandbox_init_point: data.sandbox_init_point,
    });
  } catch (e) {
    return err(500, { error: 'Excepción en function', details: String(e) });
  }
};
