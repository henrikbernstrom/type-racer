export interface Player {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO
}

export interface ScoreEntry {
  id: string;
  name: string;
  cps: number;
  charsTyped: number;
  durationSeconds: number; // expected 60
  durationMs?: number; // precise duration used for cps
  accuracy?: number; // 0..1
  email?: string; // optional player email
  timestamp: string; // ISO
}

export type HighscoreResponse = ScoreEntry[];

export interface NameAvailability {
  available: boolean;
}
