import { neon } from "@neondatabase/serverless";

/** CORS */
function allowCORS(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST,OPTIONS",
        "access-control-allow-headers": "content-type,authorization,x-admin-token"
      }
    });
  }
  return null;
}

/** Respuesta JSON */
function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
      "access-control-allow-origin": "*",
      ...extra
    }
  });
}

export default async (req) => {
  const pre = allowCORS(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return json({ ok: false, error: "POST only" }, 405);
  }

  try {
    // Seguridad simple: header con token del local
    const token = req.headers.get("x-admin-token");
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const { numero, estado } = await req.json();
    if (!numero || !estado) {
      return json({ ok: false, error: "numero y estado requeridos" }, 400);
    }

    // (opcional) validar estados permitidos
    const validos = new Set(["pending_payment","accepted","en_preparacion","listo","entregado","cancelado"]);
    if (!validos.has(String(estado))) {
      return json({ ok: false, error: "estado invalido" }, 400);
    }

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) return json({ ok: false, error: "DATABASE_URL no configurada" }, 500);
    const sql = neon(DATABASE_URL);

    const rows = await sql`
      UPDATE pedidos
      SET estado = ${estado}
      WHERE numero = ${numero}
      RETURNING id, numero, estado, updated_at
    `;

    if (rows.length === 0) return json({ ok: false, error: "no_encontrado" }, 404);

    return json({ ok: true, pedido: rows[0] });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e.message }, 500);
  }
};
