import { neon } from "@neondatabase/serverless";

/** CORS */
function allowCORS(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-headers": "content-type,authorization"
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

  if (req.method !== "GET") {
    return json({ ok: false, error: "GET only" }, 405);
  }

  try {
    const url = new URL(req.url);
    const numero = parseInt(url.searchParams.get("numero") || "0", 10);
    if (!numero) return json({ ok: false, error: "numero requerido" }, 400);

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) return json({ ok: false, error: "DATABASE_URL no configurada" }, 500);
    const sql = neon(DATABASE_URL);

    const [pedido] = await sql`
      SELECT id, numero, total, estado, created_at, updated_at, cliente
      FROM pedidos
      WHERE numero = ${numero}
      LIMIT 1
    `;
    if (!pedido) return json({ ok: false, error: "no_encontrado" }, 404);

    const items = await sql`
      SELECT nombre, cantidad, precio_unit, extras
      FROM pedido_items
      WHERE pedido_id = ${pedido.id}
      ORDER BY id
    `;

    return json({ ok: true, pedido, items });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e.message }, 500);
  }
};
