// netlify/functions/createPreference.js
// Requiere: npm i mercadopago
const mercadopago = require("mercadopago");

exports.handler = async (event) => {
  // --- CORS ---
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Use POST" }),
    };
  }

  try {
    // --- Credencial de MP desde Netlify (Settings > Environment variables) ---
    const ACCESS_TOKEN = process.env.NETLIFY_MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error:
            "Falta NETLIFY_MP_ACCESS_TOKEN en las variables de entorno de Netlify",
        }),
      };
    }
    mercadopago.configure({ access_token: ACCESS_TOKEN });

    // --- Parseo body ---
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {}
    const orderId = body.orderId || "";
    const nombre = body.nombre || "";
    const total = Number(body.total);
    let items = Array.isArray(body.items) ? body.items : [];

    if (!orderId) {
      return resp(400, { error: "Falta orderId" });
    }

    // Si no hay items válidos, creo uno por el total
    items = (items || [])
      .map((it) => ({
        title: String(it.title || it.name || "Item Rhodes Burgers"),
        quantity: Number(it.quantity || it.qty || 1),
        currency_id: String(it.currency_id || "ARS"),
        unit_price: Number(it.unit_price ?? it.price ?? 0),
      }))
      .filter(
        (it) =>
          Number.isFinite(it.unit_price) &&
          it.unit_price >= 0 &&
          Number.isFinite(it.quantity) &&
          it.quantity > 0
      );

    if (items.length === 0) {
      const amount = Number.isFinite(total) && total > 0 ? total : 0;
      if (amount <= 0) {
        return resp(400, {
          error:
            'items vacío y "total" inválido. Enviá items o un total > 0.',
        });
      }
      items = [
        {
          title: "Pedido Rhodes Burgers",
          quantity: 1,
          currency_id: "ARS",
          unit_price: amount,
        },
      ];
    }

    // --- Preferencia ---
    const preference = {
      items,
      payer: { name: nombre },
      metadata: { orderId },
      statement_descriptor: "RHODES BURGERS",
      auto_return: "approved",
      back_urls: {
        success: "https://rhodes-burgers.netlify.app/success.html",
        failure: "https://rhodes-burgers.netlify.app/failure.html",
        pending: "https://rhodes-burgers.netlify.app/pending.html",
      },
    };

    const mpRes = await mercadopago.preferences.create(preference);
    const pref = mpRes.body || {};
    return resp(200, {
      id: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
    });
  } catch (e) {
    console.error("MP createPreference error:", e);
    return resp(500, { error: e.message || "Error creando preferencia" });
  }
};

// Helper de respuesta
function resp(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(bodyObj),
  };
}
