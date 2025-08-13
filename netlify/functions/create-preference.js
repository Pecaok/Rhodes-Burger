// netlify/functions/create-preference.js

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: "Method Not Allowed" };
  }

  try {
    const { items, cliente, orderId } = JSON.parse(event.body || "{}");

    const sanitizedItems = (items || []).map(i => ({
      title: String(i.item || "").slice(0, 255),
      quantity: Number(i.quantity) || 1,
      currency_id: "ARS",
      unit_price: Number(i.price) || 0
    }));

    const preference = {
      items: sanitizedItems,
      payer: { name: cliente || "Cliente" },

      // Solo débito / billetera. Excluimos efectivo, ATM y crédito.
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" },
          { id: "atm" },
          { id: "credit_card" }
        ],
        installments: 1
      },

      statement_descriptor: "RHODES BURGUERS",
      external_reference: String(orderId || Date.now()),

      back_urls: {
        success: "https://rhodes-burguers.netlify.app/success.html",
        pending: "https://rhodes-burguers.netlify.app/success.html",
        failure: "https://rhodes-burguers.netlify.app/failure.html"
      },
      auto_return: "approved",

      notification_url: "https://rhodes-burguers.netlify.app/.netlify/functions/webhook-mp"
    };

    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preference)
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("MP error:", data);
      return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: "Error al crear preferencia", details: data }) };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point
      })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: "Server error" }) };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
