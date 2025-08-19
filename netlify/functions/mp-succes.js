// netlify/functions/mp-success.js
// Lee el resultado de MP, verifica aprobado, guarda la orden en Firestore y redirige al "gracias"

const admin = require("firebase-admin");
let app;
function getFirestore() {
  if (!app) {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
  return admin.firestore();
}

exports.handler = async (event) => {
  try {
    const q = new URLSearchParams(event.rawQuery || "");
    const status =
      (q.get("status") || q.get("collection_status") || "").toLowerCase();
    const paymentId = q.get("payment_id") || q.get("collection_id") || "";
    const orderB64 = q.get("o") || "";

    // Solo seguimos si MP nos devuelve aprobado
    if (status !== "approved") {
      return redirect("/pago_pendiente.html"); // o a donde prefieras
    }

    // (Opcional) doble verificación con la API de MP:
    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.NETLIFY_MP_ACCESS_TOKEN;
    if (ACCESS_TOKEN && paymentId) {
      try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });
        const pay = await res.json();
        if (!res.ok || (pay.status || "").toLowerCase() !== "approved") {
          return redirect("/pago_pendiente.html");
        }
      } catch (_) {
        // si falla la consulta, no bloqueamos; ya tenemos status=approved del redirect
      }
    }

    if (!orderB64) {
      return redirect("/pago_error.html");
    }

    // Decodificar orden que mandamos desde el cliente
    let order;
    try {
      order = JSON.parse(Buffer.from(orderB64, "base64").toString("utf8"));
    } catch {
      return redirect("/pago_error.html");
    }

    // Guardar en Firestore con número correlativo
    const db = getFirestore();

    // Usamos doc config/counters {orderLast: N}
    const countersRef = db.collection("config").doc("counters");
    const newNro = await db.runTransaction(async (tx) => {
      const snap = await tx.get(countersRef);
      const last = snap.exists ? Number(snap.data().orderLast || 0) : 0;
      const next = last + 1;
      tx.set(countersRef, { orderLast: next }, { merge: true });
      return next;
    });

    const toSave = {
      ...order,                 // lo que vos mandaste
      nro: newNro,              // número de pedido
      status: "paid",           // ya pagado
      mp: {
        paymentId: paymentId || null,
        status: "approved",
        ts: admin.firestore.FieldValue.serverTimestamp(),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("orders").add(toSave);

    // Redirigir al cliente a "gracias" (no ve pedido_local)
    return redirect(`/gracias.html?n=${newNro}`);
  } catch (e) {
    console.error(e);
    return redirect("/pago_error.html");
  }
};

function redirect(url) {
  return {
    statusCode: 302,
    headers: { Location: url },
    body: "",
  };
}
