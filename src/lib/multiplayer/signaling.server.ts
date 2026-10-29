/**
 * WebRTC signaling over the app database (Neon deployed, PGLite in preview).
 * Only rendezvous traffic passes through here — roster + SDP/ICE relay while a
 * mesh forms; file bytes then flow peer-to-peer. Mounted at /api/rtc.
 */
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import type { PeerRow, RtcPollResponse, SignalRow } from "./p2p";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["offer", "answer", "ice"]),
  pin: z.string().regex(/^[0-9]{4}$/).optional(),
  payload: z.unknown().refine((v) => v !== undefined && JSON.stringify(v).length <= 32_768, {
    message: "payload too large",
  }),
});
const leaveSchema = z.object({
  op: z.literal("leave"),
  room: ID,
  peer: ID,
  pin: z.string().regex(/^[0-9]{4}$/).optional(),
});
const lockSchema = z.object({
  op: z.literal("lock"),
  room: ID,
  peer: ID,
  pin: z.string().regex(/^$|^[0-9]{4}$/),
});
const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema, lockSchema]);

const PEER_TTL_SECONDS = 30;
const SIGNAL_TTL_SECONDS = 60;

const globalRef = globalThis as typeof globalThis & {
  __rtcSchemaPromise__?: Promise<void>;
};

function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__rtcSchemaPromise__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_peers (
         room TEXT NOT NULL,
         peer_id TEXT NOT NULL,
         name TEXT NOT NULL DEFAULT '',
         last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (room, peer_id)
       )`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_signals (
         id BIGSERIAL PRIMARY KEY,
         room TEXT NOT NULL,
         to_peer TEXT NOT NULL,
         from_peer TEXT NOT NULL,
         kind TEXT NOT NULL,
         payload JSONB NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    await sql.query(
      `CREATE INDEX IF NOT EXISTS webrtc_signals_inbox
         ON webrtc_signals (room, to_peer, id)`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS slip_locks (
         room TEXT PRIMARY KEY,
         pin TEXT NOT NULL,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
  })().catch((err) => {
    globalRef.__rtcSchemaPromise__ = undefined;
    throw err;
  });
  return globalRef.__rtcSchemaPromise__;
}

async function roster(sql: Sql, room: string): Promise<PeerRow[]> {
  const rows = await sql.query<{ peer_id: string; name: string }>(
    `SELECT peer_id, name FROM webrtc_peers
     WHERE room = $1 AND last_seen > now() - make_interval(secs => $2)
     ORDER BY peer_id LIMIT 32`,
    [room, PEER_TTL_SECONDS],
  );
  return rows.map((r) => ({ id: r.peer_id, name: r.name }));
}

export async function roomPin(sql: Sql, room: string): Promise<string | null> {
  await sql.query(
    `CREATE TABLE IF NOT EXISTS slip_locks (
       room TEXT PRIMARY KEY,
       pin TEXT NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  const rows = await sql.query<{ pin: string }>(`SELECT pin FROM slip_locks WHERE room = $1`, [room]);
  return rows[0]?.pin || null;
}

export async function roomAllows(room: string, pin: string | undefined): Promise<boolean> {
  const sql = await getSql();
  await ensureSchema(sql);
  const expected = await roomPin(sql, room);
  if (!expected) return true;
  return expected === pin;
}

async function touchPeer(sql: Sql, room: string, peer: string, name: string) {
  await sql.query(
    `INSERT INTO webrtc_peers (room, peer_id, name, last_seen)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (room, peer_id)
     DO UPDATE SET last_seen = now(), name = EXCLUDED.name`,
    [room, peer, name],
  );
}

async function prune(sql: Sql) {
  await Promise.all([
    sql.query(`DELETE FROM webrtc_signals WHERE created_at < now() - make_interval(secs => $1)`, [
      SIGNAL_TTL_SECONDS,
    ]),
    sql.query(`DELETE FROM webrtc_peers WHERE last_seen < now() - make_interval(secs => $1)`, [
      PEER_TTL_SECONDS,
    ]),
  ]);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleGet(url: URL): Promise<Response> {
  const parsed = z
    .object({
      room: ID,
      peer: ID,
      name: z.string().max(64).default(""),
      since: z.coerce.number().int().min(0).default(0),
      pin: z.string().regex(/^[0-9]{4}$/).optional(),
    })
    .safeParse({
      room: url.searchParams.get("room"),
      peer: url.searchParams.get("peer"),
      name: url.searchParams.get("name") ?? "",
      since: url.searchParams.get("since") ?? 0,
      pin: url.searchParams.get("pin") || undefined,
    });
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, name, since, pin } = parsed.data;

  const sql = await getSql();
  await ensureSchema(sql);
  const expected = await roomPin(sql, room);
  if (expected && expected !== pin) return json({ error: "pin" }, 403);
  if (since === 0 || Math.random() < 0.02) await prune(sql);
  await touchPeer(sql, room, peer, name);
  const rows = await sql.query<{
    id: number;
    from_peer: string;
    kind: SignalRow["kind"];
    payload: unknown;
  }>(
    `SELECT id, from_peer, kind, payload FROM webrtc_signals
     WHERE room = $1 AND to_peer = $2 AND id > $3
     ORDER BY id LIMIT 200`,
    [room, peer, since],
  );
  const body: RtcPollResponse = {
    peers: await roster(sql, room),
    signals: rows.map((r) => ({
      id: r.id,
      from: r.from_peer,
      kind: r.kind,
      payload: r.payload,
    })),
    locked: Boolean(expected),
  };
  return json(body);
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  const sql = await getSql();
  await ensureSchema(sql);
  const pin = "pin" in msg ? msg.pin : undefined;
  if (msg.op !== "lock") {
    const expected = await roomPin(sql, msg.room);
    if (expected && expected !== pin) return json({ error: "pin" }, 403);
  }

  if (msg.op === "signal") {
    await sql.query(
      `INSERT INTO webrtc_signals (room, to_peer, from_peer, kind, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [msg.room, msg.to, msg.from, msg.kind, JSON.stringify(msg.payload)],
    );
  } else if (msg.op === "lock") {
    await roomPin(sql, msg.room);
    const member = await sql.query<{ peer_id: string }>(
      `SELECT peer_id FROM webrtc_peers
       WHERE room = $1 AND peer_id = $2 AND last_seen > now() - make_interval(secs => $3)`,
      [msg.room, msg.peer, PEER_TTL_SECONDS],
    );
    if (!member.length) return json({ error: "not in room" }, 403);
    if (!msg.pin) {
      await sql.query(`DELETE FROM slip_locks WHERE room = $1`, [msg.room]);
    } else {
      await sql.query(
        `INSERT INTO slip_locks (room, pin, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (room) DO UPDATE SET pin = EXCLUDED.pin, updated_at = now()`,
        [msg.room, msg.pin],
      );
    }
  } else {
    await sql.query(`DELETE FROM webrtc_peers WHERE room = $1 AND peer_id = $2`, [msg.room, msg.peer]);
  }
  return json({ ok: true });
}

export async function handleSignaling(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[rtc] signaling error:", error);
    return json({ error: "signaling failed" }, 500);
  }
}
