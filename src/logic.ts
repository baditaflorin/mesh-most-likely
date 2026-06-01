// Pure, deterministic helpers — no React, no Yjs — so they can be unit-tested
// in isolation and produce an identical card order on every phone.

/** Mulberry32: tiny, fast, deterministic PRNG seeded by a 32-bit integer. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic shuffle of [0, n). Same (n, seed) → same permutation on every
 * peer, so the whole room walks the deck in lockstep without syncing the order.
 */
export function makeOrder(n: number, seed: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i);
  const rnd = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** Integer percentage of `part` out of `total`, clamped to [0, 100]. */
export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export type MostLikelyVerdict = {
  /** Winning option id (a peerId), or null when there are no votes. */
  winnerId: string | null;
  /** Vote count for the winner. */
  count: number;
  /** True when two or more options share the top count. */
  tie: boolean;
  /** All tied leader ids (length > 1 only when `tie`). */
  leaders: string[];
};

/** Resolve the leader(s) of a per-option tally into a presentable verdict. */
export function mostLikelyVerdict(tally: Map<string, number>): MostLikelyVerdict {
  let count = 0;
  for (const v of tally.values()) if (v > count) count = v;
  if (count === 0) return { winnerId: null, count: 0, tie: false, leaders: [] };
  const leaders: string[] = [];
  for (const [id, v] of tally) if (v === count) leaders.push(id);
  return { winnerId: leaders[0] ?? null, count, tie: leaders.length > 1, leaders };
}

/** Playful one-liner for a "never have I ever" split. */
export function neverVerdict(have: number, never: number): string {
  const total = have + never;
  if (total === 0) return "Waiting for confessions…";
  if (have === 0) return "A room full of saints. 😇";
  if (never === 0) return "Not one innocent among you. 😈";
  if (have > never) return "The guilty have it. 🍻";
  if (never > have) return "Mostly behaving… mostly. 😏";
  return "A perfect, suspicious tie. 🤨";
}
