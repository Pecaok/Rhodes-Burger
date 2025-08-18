// netlify/functions/createPreference.js
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };
  if (event.httpMethod !== "POST")  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Use POST" }) };

  try {
    const MP_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.NETLIFY_MP_ACCESS_TOKEN;
    if (!MP_TOKEN) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Falta MP_ACCESS_TOKEN" }) };
    }

    const body  = JSON.parse(event.body || "{}");
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "items vacío" }) };

    const origin = event.headers.origin || `https://${event.headers.host}`;
    const back   = `${origin}/gracias.html`;

    const payload = {
      items: items.map(it => ({ title: it.title || it.name || "Producto", quantity: Number(it.quantity || it.qty || 1), unit_price: Number(it.unit_price || it.price || 0), currency_id: "ARS" })),
      external_reference: String(body.orderId || ""),
      back_urls: { success: back, pending: back, failure: back },
      auto_return: "approved",
      statement_descriptor: "RHODES BURGERS",
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${MP_TOKEN}` },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("MP ERROR:", res.status, data);
      return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: data }) };
    }

    const init_point = data.init_point || data.sandbox_init_point;
    if (!init_point) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Sin init_point" }) };

    return { statusCode: 200, headers: cors, body: JSON.stringify({ init_point }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message || "MP error" }) };
  }
};
