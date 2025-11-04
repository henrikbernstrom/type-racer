import express from "express";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";

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
const playersPath = path.join(storageDir, "players.json");
const highscoresPath = path.join(storageDir, "highscores.json");

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

function getPlayers(): Player[] {
  return readJSON<Player[]>(playersPath, []);
}

function savePlayers(players: Player[]) {
  writeJSONAtomic(playersPath, players);
}

function getAllScores(): ScoreEntry[] {
  const arr = readJSON<ScoreEntry[]>(highscoresPath, []);
  return arr;
}

function saveAllScores(scores: ScoreEntry[]) {
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

function nameTaken(name: string): boolean {
  const n = name.toLowerCase();
  const players = getPlayers();
  const highs = getAllScores();
  return players.some(p => p.name.toLowerCase() === n) || highs.some(s => s.name.toLowerCase() === n);
}

export function createApp() {
  ensureDir();
  const app = express();
  app.use(express.json());

  // Players
  app.get("/api/players", (_req, res) => {
    return res.json(getPlayers());
  });

  app.delete("/api/players", (_req, res) => {
    // Clear players file by saving empty list
    savePlayers([]);
    return res.status(204).end();
  });

  app.post("/api/players", (req, res) => {
    const parse = playerCreateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
    const { name, email } = parse.data;

    const player: Player = { id: uid(), name, email, createdAt: nowISO() };
    const players = getPlayers();
    players.push(player);
    savePlayers(players);
    return res.status(201).json(player);
  });

  app.get("/api/players/check-name", (req, res) => {
    return res.json({ available: true });
  });

  // Highscores
  app.get("/api/highscores", (req, res) => {
    const limitRaw = req.query.limit as string | undefined;
    const uniqueEmailRaw = req.query.uniqueEmail as string | undefined;
    let limit = 10;
    if (typeof limitRaw === 'string') {
      const n = Number(limitRaw);
      if (!Number.isNaN(n)) limit = n;
    }
    const uniqueEmail = uniqueEmailRaw === '1' || uniqueEmailRaw === 'true';

    let list = getAllScores();
    if (uniqueEmail) list = uniqueBestByEmail(list);
    list = sortScores(list);
    if (limit > 0) list = list.slice(0, limit);
    return res.json(list);
  });

  app.delete("/api/highscores", (_req, res) => {
    // Clear highscores file by saving empty list
    saveAllScores([]);
    return res.status(204).end();
  });

  app.get("/api/highscores/top", (_req, res) => {
    const arr = sortScores(getAllScores());
    if (arr.length === 0) return res.status(404).end();
    return res.json(arr[0]);
  });

  app.post("/api/scores", (req, res) => {
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

    const scores = getAllScores();
    scores.push(entry);
    saveAllScores(scores);
    return res.status(201).json(entry);
  });

  return app;
}
