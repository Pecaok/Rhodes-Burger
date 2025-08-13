// netlify/functions/createPreference.js
// SIN dependencias externas. Llama a la API de Mercado Pago vía https nativo.

const https = require("https");

exports.handler = async (event) => {
  // CORS preflight
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
    return json(405, { error: "Use POST" });
  }

  try {
    const ACCESS_TOKEN = process.env.NETLIFY_MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      return json(500, { error: "Falta NETLIFY_MP_ACCESS_TOKEN en Netlify" });
    }

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}
    const orderId = String(body.orderId || "").trim();
    const nombre  = String(body.nombre  || "").trim();
    const total   = Number(body.total);
    let items     = Array.isArray(body.items) ? body.items : [];

    if (!orderId) return json(400, { error: "Falta orderId" });

    // Normalizo ítems
    items = items.map(it => ({
      title: String(it.title || it.name || "Item Rhodes Burgers"),
      quantity: Number(it.quantity ?? it.qty ?? 1),
      currency_id: String(it.currency_id || "ARS"),
      unit_price: Number(it.unit_price ?? it.price ?? 0),
    })).filter(it => it.quantity > 0 && Number.isFinite(it.unit_price) && it.unit_price > 0);

    // Si no hay ítems válidos, uso uno con el total
    if (items.length === 0) {
      if (!Number.isFinite(total) || total <= 0) {
        return json(400, { error: 'items vacío y "total" inválido (> 0 requerido)' });
      }
      items = [{ title: "Pedido Rhodes Burgers", quantity: 1, currency_id: "ARS", unit_price: Number(total) }];
    }

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

    // Llamada HTTPS a Mercado Pago
    const data = await mpRequest("/checkout/preferences", "POST", ACCESS_TOKEN, preference);

    // Si MP devolvió error, lo propagamos
    if (data.error || data.status === 400 || data.message) {
      return json(400, { error: data.message || data.error || "Error MP", details: data });
    }

    return json(200, {
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    });

  } catch (e) {
    console.error("createPreference error:", e);
    return json(500, { error: e.message || "Error creando preferencia" });
  }
};

// ---- Helpers

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(obj),
  };
}

function mpRequest(path, method, token, payload) {
  const options = {
    hostname: "api.mercadopago.com",
    path,
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        try {
          const txt = Buffer.concat(chunks).toString("utf8");
          const json = JSON.parse(txt || "{}");
          if (res.statusCode && res.statusCode >= 400) {
            return resolve({ status: res.statusCode, ...json });
          }
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.write(JSON.stringify(payload || {}));
    req.end();
  });
}
