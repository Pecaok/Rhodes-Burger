import { neon } from "@neondatabase/serverless";

/** Utilidad CORS */
function allowCORS(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
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

/** Handler principal */
export default async (req) => {
  const pre = allowCORS(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return json({ ok: false, error: "POST only" }, 405);
  }

  try {
    const { items, total, datosCliente } = await req.json();

    // Validaciones mínimas
    if (!Array.isArray(items) || items.length === 0) {
      return json({ ok: false, error: "Carrito vacío" }, 400);
    }
    const totalNum = Number(total || 0);
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      return json({ ok: false, error: "Total inválido" }, 400);
    }

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return json({ ok: false, error: "DATABASE_URL no configurada" }, 500);
    }
    const sql = neon(DATABASE_URL);

    // Asegurar columna cliente JSONB (idempotente)
    await sql`
      ALTER TABLE IF EXISTS pedidos
      ADD COLUMN IF NOT EXISTS cliente JSONB;
    `;

    // Estado inicial según medio de pago (si viene)
    const pago = (datosCliente?.pago || "").toString();
    const estadoInicial = pago === "mercado_pago" ? "pending_payment" : "accepted";

    // Transacción: crear pedido + items
    const result = await sql.begin(async (tx) => {
      // Insertar pedido con número autoincremental
      const [pedido] = await tx`
        INSERT INTO pedidos (total, estado, cliente)
        VALUES (${totalNum}, ${estadoInicial}, ${JSON.stringify(datosCliente || {})}::jsonb)
        RETURNING id, numero, estado, created_at
      `;

      // Insertar items
      for (const it of items) {
        // Campos esperados desde el front:
        // { type, id, name, qty, price, fries?, extras?, notes? }
        const nombre = String(it?.name || "Item");
        const cantidad = Number(it?.qty || 1);
        const precio_unit = Number(it?.price || 0);
        const extras = it?.extras || {};
        const extrasJSON = JSON.stringify({
          type: it?.type || null,
          id_ref: it?.id || null,
          fries: it?.fries || null,
          notes: it?.notes || null,
          extras
        });

        if (!Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(precio_unit)) {
          throw new Error("Ítem inválido");
        }

        await tx`
          INSERT INTO pedido_items (pedido_id, nombre, cantidad, precio_unit, extras)
          VALUES (
            ${pedido.id},
            ${nombre},
            ${cantidad},
            ${precio_unit},
            ${extrasJSON}::jsonb
          )
        `;
      }

      return pedido; // { id, numero, estado, created_at }
    });

    return json({ ok: true, pedido: result });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e.message }, 500);
  }
};
