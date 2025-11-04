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
  accuracy?: number; // 0..1
  timestamp: string; // ISO
}

export type HighscoreResponse = ScoreEntry[];

export interface NameAvailability {
  available: boolean;
}
