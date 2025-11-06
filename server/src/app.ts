import express from "express";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

// Types
interface Player {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface ScoreEntry {
  id: string;
  name: string;
  cps: number;
  charsTyped: number;
  durationSeconds: number;
  durationMs?: number;
  accuracy?: number;
  email?: string;
  timestamp: string;
}

// Storage helpers
const storageDir = process.env.STORAGE_DIR || path.join(process.cwd(), "data");
const eventsDir = path.join(storageDir, "events");
const eventsIndexPath = path.join(storageDir, "events.json");

type EventInfo = { id: string; name: string; description?: string; date?: string; createdAt: string; active?: boolean };

function ensureEventDir(id: string) {
  ensureDir();
  const dir = path.join(eventsDir, id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const playersPath = path.join(dir, "players.json");
  const highscoresPath = path.join(dir, "highscores.json");
  if (!fs.existsSync(playersPath)) writeJSONAtomic(playersPath, []);
  if (!fs.existsSync(highscoresPath)) writeJSONAtomic(highscoresPath, []);
}

function getEventPaths(eventId: string) {
  const id = eventId || "default";
  ensureEventDir(id);
  const dir = path.join(eventsDir, id);
  return {
    playersPath: path.join(dir, "players.json"),
    highscoresPath: path.join(dir, "highscores.json"),
  };
}

function ensureDir() {
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
}

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf-8");
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSONAtomic(file: string, data: any) {
  ensureDir();
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

function getPlayers(eventId: string): Player[] {
  const { playersPath } = getEventPaths(eventId);
  return readJSON<Player[]>(playersPath, []);
}

function savePlayers(eventId: string, players: Player[]) {
  const { playersPath } = getEventPaths(eventId);
  writeJSONAtomic(playersPath, players);
}

function getAllScores(eventId: string): ScoreEntry[] {
  const { highscoresPath } = getEventPaths(eventId);
  const arr = readJSON<ScoreEntry[]>(highscoresPath, []);
  return arr;
}

function saveAllScores(eventId: string, scores: ScoreEntry[]) {
  const { highscoresPath } = getEventPaths(eventId);
  writeJSONAtomic(highscoresPath, scores);
}

function sortScores(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores].sort((a, b) => (b.cps - a.cps) || (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
}

function uniqueBestByEmail(scores: ScoreEntry[]): ScoreEntry[] {
  // Pick best (highest cps, tie by earlier timestamp) per unique player email; fallback to name when email missing
  const bestMap = new Map<string, ScoreEntry>();
  for (const s of scores) {
    const key = (s.email && s.email.trim().toLowerCase()) || `name:${s.name.trim().toLowerCase()}`;
    const prev = bestMap.get(key);
    if (!prev) {
      bestMap.set(key, s);
      continue;
    }
    const better = (s.cps > prev.cps) || (Math.abs(s.cps - prev.cps) < 1e-9 && new Date(s.timestamp).getTime() < new Date(prev.timestamp).getTime());
    if (better) bestMap.set(key, s);
  }
  return Array.from(bestMap.values());
}

// Validation
const nameSchema = z.string();
const emailSchema = z.string();

const playerCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

const scoreCreateSchema = z.object({
  name: nameSchema,
  charsTyped: z.number().int().min(0),
  durationSeconds: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
  accuracy: z.number().min(0).max(1).optional(),
  email: z.string().optional(),
}).refine((v) => typeof v.durationMs === 'number' || typeof v.durationSeconds === 'number', {
  message: 'Either durationMs or durationSeconds must be provided',
});

// Utils
function uid() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function nowISO() { return new Date().toISOString(); }

function nameTaken(name: string, eventId: string): boolean {
  const n = name.toLowerCase();
  const players = getPlayers(eventId);
  const highs = getAllScores(eventId);
  return players.some(p => p.name.toLowerCase() === n) || highs.some(s => s.name.toLowerCase() === n);
}

export function createApp() {
  ensureDir();
  // Ensure default event & index
  ensureEventDir("default");
  if (!fs.existsSync(eventsIndexPath)) writeJSONAtomic(eventsIndexPath, [{ id: "default", name: "Default", createdAt: nowISO(), active: true }] as EventInfo[]);
  const app = express();
  app.use(express.json());

  // SSE subscribers for active event changes
  const activeSubscribers = new Set<import('express').Response>();
  function getActiveEvent(): EventInfo | null {
    const list = readJSON<EventInfo[]>(eventsIndexPath, []);
    return list.find(e => e.active) || null;
  }
  function broadcastActive() {
    const active = getActiveEvent();
    const payload = `data: ${JSON.stringify(active)}\n\n`;
    for (const res of activeSubscribers) {
      try { res.write(payload); } catch { /* ignore broken pipe */ }
    }
  }

  // Events
  app.get("/api/events", (_req, res) => {
    const list = readJSON<EventInfo[]>(eventsIndexPath, []);
    // ensure there is exactly one active; if none, set first to active
    if (Array.isArray(list) && list.length > 0 && !list.some(e => e.active)) {
      list[0].active = true;
      writeJSONAtomic(eventsIndexPath, list);
    }
    return res.json(list);
  });

  app.delete("/api/events/:id", (req, res) => {
    const id = req.params.id;
    if (id === 'default') return res.status(400).json({ error: 'Cannot delete default event' });
    const list = readJSON<EventInfo[]>(eventsIndexPath, []);
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const removed = list.splice(idx, 1)[0];
    // delete data folder
    try {
      const dir = path.join(eventsDir, id);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
    // if removed was active, set first remaining active
    if (removed.active) {
      for (let i = 0; i < list.length; i++) list[i].active = false;
      if (list.length > 0) list[0].active = true;
    }
    writeJSONAtomic(eventsIndexPath, list);
    broadcastActive();
    return res.json({ ok: true });
  });

  app.post("/api/events", (req, res) => {
    const name = (req.body?.name as string | undefined)?.trim();
    if (!name) return res.status(400).json({ error: "name is required" });
    const list = readJSON<EventInfo[]>(eventsIndexPath, []);
    const id = crypto.randomUUID();
    const info: EventInfo = { id, name, description: (req.body?.description as string | undefined)?.trim() || undefined, date: (req.body?.date as string | undefined) || undefined, createdAt: nowISO(), active: list.length === 0 };
    list.push(info);
    writeJSONAtomic(eventsIndexPath, list);
    ensureEventDir(id);
    return res.status(201).json(info);
  });

  app.put("/api/events/:id", (req, res) => {
    const id = req.params.id;
    const list = readJSON<EventInfo[]>(eventsIndexPath, []);
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const cur = list[idx];
    const name = (req.body?.name as string | undefined)?.trim();
    const description = (req.body?.description as string | undefined)?.trim();
    const date = (req.body?.date as string | undefined);
    if (name) cur.name = name;
    cur.description = description ?? cur.description;
    cur.date = date ?? cur.date;
    list[idx] = cur;
    writeJSONAtomic(eventsIndexPath, list);
    return res.json(cur);
  });

  app.post("/api/events/:id/activate", (req, res) => {
    const id = req.params.id;
    const list = readJSON<EventInfo[]>(eventsIndexPath, []);
    let found = false;
    for (const e of list) {
      if (e.id === id) { e.active = true; found = true } else { e.active = false }
    }
    if (!found) return res.status(404).json({ error: "Not found" });
    writeJSONAtomic(eventsIndexPath, list);
    // notify listeners
    broadcastActive();
    return res.json({ ok: true });
  });

  app.get("/api/events/active", (_req, res) => {
    const list = readJSON<EventInfo[]>(eventsIndexPath, []);
    const active = list.find(e => e.active) || null;
    return res.json(active);
  });

  // Server-Sent Events stream for active event
  app.get("/api/events/active/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // CORS is typically handled globally; if needed, uncomment below
    // res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();
    activeSubscribers.add(res);
    // send initial state
    const active = getActiveEvent();
    res.write(`data: ${JSON.stringify(active)}\n\n`);
    req.on('close', () => { activeSubscribers.delete(res); try { res.end(); } catch {} });
  });

  // Players
  app.get("/api/players", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    const list = getPlayers(eventId);
    const seen = new Map<string, Player>();
    for (const p of list) {
      const key = (p.email || '').trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, p);
        continue;
      }
      // prefer earliest createdAt
      const prev = seen.get(key)!;
      const prevTs = new Date(prev.createdAt).getTime();
      const curTs = new Date(p.createdAt).getTime();
      if (!Number.isNaN(curTs) && (Number.isNaN(prevTs) || curTs < prevTs)) {
        seen.set(key, p);
      }
    }
    const deduped = Array.from(seen.values());
    if (deduped.length !== list.length) {
      savePlayers(eventId, deduped);
    }
    return res.json(deduped);
  });

  app.delete("/api/players", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    // Clear players file by saving empty list
    savePlayers(eventId, []);
    return res.status(204).end();
  });

  app.delete("/api/players/batch", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
    const idSet = new Set<string>(ids.filter((v): v is string => typeof v === 'string'));
    if (idSet.size === 0) return res.status(400).json({ error: "ids must be a non-empty array of strings" });
    const before = getPlayers(eventId);
    const after = before.filter(p => !idSet.has(p.id));
    savePlayers(eventId, after);
    return res.status(200).json({ removed: before.length - after.length });
  });

  app.post("/api/players", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    const parse = playerCreateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
    const { name, email } = parse.data;

    const player: Player = { id: uid(), name, email, createdAt: nowISO() };
    const players = getPlayers(eventId);
    // enforce unique email per event
    if (players.some(p => p.email.trim().toLowerCase() === email.trim().toLowerCase())) {
      return res.status(409).json({ error: "Email already registered for this event" });
    }
    players.push(player);
    savePlayers(eventId, players);
    return res.status(201).json(player);
  });

  app.get("/api/players/check-name", (req, res) => {
    return res.json({ available: true });
  });

  // Highscores
  app.get("/api/highscores", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    const limitRaw = req.query.limit as string | undefined;
    const uniqueEmailRaw = req.query.uniqueEmail as string | undefined;
    let limit = 10;
    if (typeof limitRaw === 'string') {
      const n = Number(limitRaw);
      if (!Number.isNaN(n)) limit = n;
    }
    const uniqueEmail = uniqueEmailRaw === '1' || uniqueEmailRaw === 'true';

    let list = getAllScores(eventId);
    if (uniqueEmail) list = uniqueBestByEmail(list);
    list = sortScores(list);
    if (limit > 0) list = list.slice(0, limit);
    return res.json(list);
  });

  app.delete("/api/highscores", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    // Clear highscores file by saving empty list
    saveAllScores(eventId, []);
    return res.status(204).end();
  });

  app.delete("/api/highscores/batch", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
    const idSet = new Set<string>(ids.filter((v): v is string => typeof v === 'string'));
    if (idSet.size === 0) return res.status(400).json({ error: "ids must be a non-empty array of strings" });
    const before = getAllScores(eventId);
    const after = before.filter(s => !idSet.has(s.id));
    saveAllScores(eventId, after);
    return res.status(200).json({ removed: before.length - after.length });
  });

  app.get("/api/highscores/top", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    const arr = sortScores(getAllScores(eventId));
    if (arr.length === 0) return res.status(404).end();
    return res.json(arr[0]);
  });

  app.post("/api/scores", (req, res) => {
    const eventId = (req.query.eventId as string) || "default";
    const parsed = scoreCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    const { name, charsTyped, durationSeconds, durationMs, accuracy, email } = parsed.data;

    // Allow variable durations; support millisecond precision
    const durMs = typeof durationMs === 'number' ? durationMs : (durationSeconds! * 1000);
    const cps = charsTyped / (durMs / 1000);
    const entry: ScoreEntry = {
      id: uid(),
      name,
      cps,
      charsTyped,
      durationSeconds: Math.max(1, Math.round(durMs / 1000)),
      durationMs: durMs,
      accuracy,
      email,
      timestamp: nowISO(),
    };

    const scores = getAllScores(eventId);
    scores.push(entry);
    saveAllScores(eventId, scores);
    return res.status(201).json(entry);
  });

  return app;
}
