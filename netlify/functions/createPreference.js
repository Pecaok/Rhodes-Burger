// netlify/functions/createPreference.js
const mercadopago = require("mercadopago");

exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const { NETLIFY_MP_ACCESS_TOKEN } = process.env;
    if (!NETLIFY_MP_ACCESS_TOKEN) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Falta NETLIFY_MP_ACCESS_TOKEN en Netlify" }),
      };
    }
    mercadopago.configure({ access_token: NETLIFY_MP_ACCESS_TOKEN });

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch (_) {}
    const orderId = body.orderId;
    const nombre = body.nombre || "";
    const amount = Number(body.total);

    if (!orderId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Falta orderId" }),
      };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `total inválido: "${body.total}"` }),
      };
    }

    const preference = {
      items: [{ title: "Pedido Rhodes Burgers", quantity: 1, currency_id: "ARS", unit_price: amount }],
      payer: { name: nombre },
      back_urls: {
        success: "https://rhodes-burgers.netlify.app/success.html",
        failure: "https://rhodes-burgers.netlify.app/failure.html",
        pending: "https://rhodes-burgers.netlify.app/pending.html",
      },
      auto_return: "approved",
      statement_descriptor: "RHODES BURGERS",
      metadata: { orderId }
    };

    const resp = await mercadopago.preferences.create(preference);
    const pref = resp.body || {};
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        id: pref.id,
        init_point: pref.init_point,
        sandbox_init_point: pref.sandbox_init_point
      }),
    };
  } catch (e) {
    console.error("MP error:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: e.message || "Error creando preferencia" }),
    };
  }
};
