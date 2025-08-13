// netlify/functions/createPreference.js
// No requiere npm install. Usa fetch nativo de Node 18 en Netlify.

exports.handler = async (event) => {
  // --- CORS preflight ---
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
    const nombre  = String(body.nombre || "").trim();
    const total   = Number(body.total);
    let items     = Array.isArray(body.items) ? body.items : [];

    if (!orderId) return json(400, { error: "Falta orderId" });

    // Normalizo ítems
    items = items
      .map(it => ({
        title: String(it.title || it.name || "Item Rhodes Burgers"),
        quantity: Number(it.quantity ?? it.qty ?? 1),
        currency_id: String(it.currency_id || "ARS"),
        unit_price: Number(it.unit_price ?? it.price ?? 0),
      }))
      .filter(it => it.quantity > 0 && Number.isFinite(it.unit_price) && it.unit_price > 0);

    // Si no hay ítems válidos, uso 1 por el total
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

    // Llamada directa a la API de Mercado Pago
    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringif
