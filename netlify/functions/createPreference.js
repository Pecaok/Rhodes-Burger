// netlify/functions/createPreference.js
// Crea preferencia de MP (REST). Devuelve { init_point }

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Use POST" }) };
  }

  try {
    const TOKEN =
      process.env.MP_ACCESS_TOKEN ||
      process.env.NETLIFY_MP_ACCESS_TOKEN ||
      process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!TOKEN) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Falta MP_ACCESS_TOKEN" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const total = Number(body.total) || 0;

    // Aceptamos items del cliente pero hacemos fallback si todos son $0
    let items = Array.isArray(body.items) ? body.items.filter(i => (i.quantity>0) && Number(i.unit_price)>0) : [];
    if (items.length === 0 && total > 0) {
      items = [{ title:"Pedido Rhodes Burgers", quantity:1, unit_price: total, currency_id:"ARS" }];
    }
    if (!items.length) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "items_vacios" }) };
    }

    // Back URL final: gracias.html (mp-success se encarga de guardar)
    const origin = event.headers.origin || `https://${event.headers.host}`;
    const back = `${origin}/gracias.html`;

    const payload = {
      items,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: "approved",
      statement_descriptor: "RHODES BURGERS",
      // datos extra para que mp-success recupere la orden:
      metadata: {
        orderB64: body.orderB64 || "",
      },
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("MP ERROR:", res.status, data);
      return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: data }) };
    }

    const init_point = data.init_point || data.sandbox_init_point;
    if (!init_point) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Sin init_point" }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ init_point }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message || "MP error" }) };
  }
};
