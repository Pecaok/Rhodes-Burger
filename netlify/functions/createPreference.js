// netlify/functions/createPreference.js
// Crea la preferencia de MP y redirige a mp-success SOLO si el pago queda aprobado

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
    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.NETLIFY_MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Falta MP_ACCESS_TOKEN" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const items = Array.isArray(body.items) ? body.items : [];
    const orderB64 = body.orderB64 || ""; // << recibimos la orden codificada
    if (!items.length || !orderB64) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "items u orderB64 faltantes" }),
      };
    }

    const origin = event.headers.origin || `https://${event.headers.host}`;

    // éxito (aprobado) => llama a la función que guarda en Firestore y luego redirige a gracias
    const success = `${origin}/.netlify/functions/mp-success?o=${encodeURIComponent(orderB64)}`;
    const pending = `${origin}/pago_pendiente.html`;
    const failure = `${origin}/pago_error.html`;

    const payload = {
      items: items.map((it) => ({
        title: it.title || it.name || "Producto",
        quantity: Number(it.quantity || it.qty || 1),
        unit_price: Number(it.unit_price || it.price || 0),
        currency_id: "ARS",
      })),
      // Podés guardar alguna referencia liviana extra si querés:
      external_reference: body.ref || "",
      back_urls: { success, pending, failure },
      auto_return: "approved",
      statement_descriptor: "RHODES BURGERS",
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
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
