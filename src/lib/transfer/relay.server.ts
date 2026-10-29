/**
 * Ephemeral mailbox for when a direct WebRTC link cannot open.
 * Rows are deleted as soon as the recipient polls, and anything left is pruned
 * within a couple of minutes. File bytes are not kept.
 */
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import { roomAllows } from "@/lib/multiplayer/signaling.server";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const sendSchema = z.object({
  op: z.literal("send"),
  room: ID,
  from: ID,
  to: ID,
  pin: z.string().regex(/^[0-9]{4}$/).optional(),
  payload: z.unknown().refine((v) => v !== undefined && JSON.stringify(v).length <= 80_000, {
    message: "payload too large",
  }),
});

const MAIL_TTL_SECONDS = 120;

const globalRef = globalThis as typeof globalThis & {
  __slipMailSchema__?: Promise<void>;
};

function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__slipMailSchema__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS slip_mail (
         id BIGSERIAL PRIMARY KEY,
         room TEXT NOT NULL,
         to_peer TEXT NOT NULL,
         from_peer TEXT NOT NULL,
         payload JSONB NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    await sql.query(
      `CREATE INDEX IF NOT EXISTS slip_mail_inbox ON slip_mail (room, to_peer, id)`,
    );
  })().catch((err) => {
    globalRef.__slipMailSchema__ = undefined;
    throw err;
  });
  return globalRef.__slipMailSchema__;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleGet(url: URL): Promise<Response> {
  const parsed = z
    .object({ room: ID, peer: ID, pin: z.string().regex(/^[0-9]{4}$/).optional() })
    .safeParse({
      room: url.searchParams.get("room"),
      peer: url.searchParams.get("peer"),
      pin: url.searchParams.get("pin") || undefined,
    });
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, pin } = parsed.data;
  if (!(await roomAllows(room, pin))) return json({ error: "pin" }, 403);
  const sql = await getSql();
  await ensureSchema(sql);
  await sql.query(`UPDATE slip_mail SET payload = '"wiped"'::jsonb WHERE created_at < now() - make_interval(secs => $1)`, [
    MAIL_TTL_SECONDS,
  ]);
  await sql.query(`DELETE FROM slip_mail WHERE created_at < now() - make_interval(secs => $1)`, [
    MAIL_TTL_SECONDS,
  ]);
  const rows = await sql.query<{ id: number; from_peer: string; payload: unknown }>(
    `SELECT id, from_peer, payload FROM slip_mail
     WHERE room = $1 AND to_peer = $2
     ORDER BY id LIMIT 80`,
    [room, peer],
  );
  if (rows.length) {
    const placeholders = rows.map((_, i) => `$${i + 1}`).join(", ");
    const ids = rows.map((row) => row.id);
    await sql.query(`UPDATE slip_mail SET payload = '"wiped"'::jsonb WHERE id IN (${placeholders})`, ids);
    await sql.query(`DELETE FROM slip_mail WHERE id IN (${placeholders})`, ids);
  }
  return json({
    messages: rows.map((row) => ({ id: row.id, from: row.from_peer, payload: row.payload })),
  });
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  if (!(await roomAllows(msg.room, msg.pin))) return json({ error: "pin" }, 403);
  const sql = await getSql();
  await ensureSchema(sql);
  await sql.query(
    `INSERT INTO slip_mail (room, to_peer, from_peer, payload) VALUES ($1, $2, $3, $4::jsonb)`,
    [msg.room, msg.to, msg.from, JSON.stringify(msg.payload)],
  );
  return json({ ok: true });
}

export async function handleSlipMail(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[slip] mail error:", error);
    return json({ error: "mail failed" }, 500);
  }
}
