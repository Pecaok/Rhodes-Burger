// Netlify Function
const mercadopago = require("mercadopago");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors(), body: JSON.stringify({ error: "Use POST" }) };
  }

  try {
    const { items = [], orderId, title = "Pedido Rhodes Burgers", total = 0 } = JSON.parse(event.body || "{}");
    if (!process.env.MP_ACCESS_TOKEN) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "Falta MP_ACCESS_TOKEN" }) };
    }
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "items vacío" }) };
    }

    mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

    const origin = event.headers.origin || `https://${event.headers.host}`;
    const back = `${origin}/gracias.html`;

    const pref = await mercadopago.preferences.create({
      items: items.map(it => ({
        title: it.title || it.name || title,
        quantity: Number(it.quantity || it.qty || 1),
        unit_price: Number(it.unit_price || it.price || 0),
        currency_id: "ARS",
      })),
      external_reference: String(orderId || ""),
      back_urls: {
        success: back,
        pending: back,
        failure: back
      },
      auto_return: "approved",
      statement_descriptor: "RHODES BURGERS",
    });

    const initPoint = pref?.body?.init_point || pref?.body?.sandbox_init_point;
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ init_point: initPoint }) };
  } catch (err) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message || "MP error" }) };
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
