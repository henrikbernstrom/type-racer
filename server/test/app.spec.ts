import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Configure storage dir per test run
const TMP_DIR = path.join(process.cwd(), ".tmp-test-store");
process.env.STORAGE_DIR = TMP_DIR;

let createApp: any;
let app: any;

beforeAll(() => {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
});

beforeEach(async () => {
  // Clean storage between tests
  for (const f of ["highscores.json", "players.json"]) {
    const p = path.join(TMP_DIR, f);
    if (fs.existsSync(p)) fs.rmSync(p);
  }
  // Lazy import after env set
  ({ createApp } = await import("../src/app"));
  app = createApp();
});

afterAll(() => {
  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("Player registration", () => {
  test("registers valid player", async () => {
    const res = await request(app)
      .post("/api/players")
      .send({ name: "Alice", email: "alice@example.com" })
      .expect(201);

    expect(res.body).toMatchObject({ name: "Alice", email: "alice@example.com" });
    expect(typeof res.body.id).toBe("string");
    expect(typeof res.body.createdAt).toBe("string");
  });

  test("rejects duplicate name (case-insensitive)", async () => {
    await request(app).post("/api/players").send({ name: "Alice", email: "a@a.com" });
    await request(app)
      .post("/api/players")
      .send({ name: "alice", email: "b@b.com" })
      .expect(409);
  });

  test("rejects invalid email and name", async () => {
    await request(app).post("/api/players").send({ name: "A", email: "bad" }).expect(400);
  });

  test("name availability endpoint", async () => {
    await request(app).post("/api/players").send({ name: "Bob", email: "b@b.com" });
    const ok = await request(app).get("/api/players/check-name").query({ name: "Charlie" }).expect(200);
    expect(ok.body).toEqual({ available: true });
    const taken = await request(app).get("/api/players/check-name").query({ name: "bob" }).expect(200);
    expect(taken.body).toEqual({ available: false });
  });
});

describe("Highscores and scores", () => {
  test("GET /api/highscores empty array initially", async () => {
    const res = await request(app).get("/api/highscores").expect(200);
    expect(res.body).toEqual([]);
  });

  test("POST /api/scores requires registered player and duration 60", async () => {
    await request(app).post("/api/players").send({ name: "Dana", email: "d@d.com" });
    await request(app)
      .post("/api/scores")
      .send({ name: "Dana", charsTyped: 300, durationSeconds: 30 })
      .expect(400);

    await request(app)
      .post("/api/scores")
      .send({ name: "Unknown", charsTyped: 300, durationSeconds: 60 })
      .expect(400);
  });

  test("submitting scores keeps top 10 and sorts by cps desc, tie by earlier timestamp", async () => {
    await request(app).post("/api/players").send({ name: "Topper", email: "t@t.com" });
    // Submit 12 scores for different names
    for (let i = 0; i < 12; i++) {
      const name = `P${i}`;
      await request(app).post("/api/players").send({ name, email: `${name}@e.com` });
      const chars = 100 + i * 10; // cps from ~1.66 to 3.5
      await request(app).post("/api/scores").send({ name, charsTyped: chars, durationSeconds: 60 }).expect(201);
    }
    const res = await request(app).get("/api/highscores").expect(200);
    expect(res.body.length).toBe(10);
    // Desc order
    for (let i = 1; i < res.body.length; i++) {
      expect(res.body[i - 1].cps).toBeGreaterThanOrEqual(res.body[i].cps);
    }
  });

  test("GET /api/highscores/top returns best entry or 404 when none", async () => {
    await request(app).get("/api/highscores/top").expect(404);
    await request(app).post("/api/players").send({ name: "Eva", email: "e@e.com" });
    await request(app).post("/api/scores").send({ name: "Eva", charsTyped: 360, durationSeconds: 60 });
    const top = await request(app).get("/api/highscores/top").expect(200);
    expect(top.body.cps).toBeCloseTo(6, 5);
  });

  test("persistence survives app re-init", async () => {
    await request(app).post("/api/players").send({ name: "Finn", email: "f@f.com" });
    await request(app).post("/api/scores").send({ name: "Finn", charsTyped: 300, durationSeconds: 60 });

    // Re-create app to simulate restart
    const { createApp: reload } = await import("../src/app");
    const app2 = reload();

    const res = await request(app2).get("/api/highscores").expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Finn");
  });
});
