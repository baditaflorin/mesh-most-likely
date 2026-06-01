import { describe, expect, it } from "vitest";
import { makeOrder, mostLikelyVerdict, neverVerdict, pct } from "../../src/logic";
import { DECKS, DECK_IDS } from "../../src/decks";

describe("makeOrder", () => {
  it("returns a permutation of [0, n)", () => {
    const order = makeOrder(20, 12345);
    expect(order).toHaveLength(20);
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it("is deterministic for the same seed (every phone agrees)", () => {
    expect(makeOrder(24, 999)).toEqual(makeOrder(24, 999));
  });

  it("differs for different seeds", () => {
    expect(makeOrder(24, 1)).not.toEqual(makeOrder(24, 2));
  });

  it("handles edge sizes", () => {
    expect(makeOrder(0, 7)).toEqual([]);
    expect(makeOrder(1, 7)).toEqual([0]);
  });
});

describe("pct", () => {
  it("computes clamped integer percentages", () => {
    expect(pct(1, 2)).toBe(50);
    expect(pct(1, 3)).toBe(33);
    expect(pct(0, 0)).toBe(0);
    expect(pct(5, 5)).toBe(100);
  });
});

describe("mostLikelyVerdict", () => {
  it("returns the clear winner", () => {
    const t = new Map([
      ["a", 3],
      ["b", 1],
    ]);
    const v = mostLikelyVerdict(t);
    expect(v.winnerId).toBe("a");
    expect(v.count).toBe(3);
    expect(v.tie).toBe(false);
  });

  it("flags a tie and lists all leaders", () => {
    const t = new Map([
      ["a", 2],
      ["b", 2],
      ["c", 1],
    ]);
    const v = mostLikelyVerdict(t);
    expect(v.tie).toBe(true);
    expect(v.leaders.sort()).toEqual(["a", "b"]);
  });

  it("handles no votes", () => {
    expect(mostLikelyVerdict(new Map())).toEqual({
      winnerId: null,
      count: 0,
      tie: false,
      leaders: [],
    });
  });
});

describe("neverVerdict", () => {
  it("covers the saints / sinners / tie branches", () => {
    expect(neverVerdict(0, 0)).toMatch(/waiting/i);
    expect(neverVerdict(0, 4)).toMatch(/saints/i);
    expect(neverVerdict(4, 0)).toMatch(/innocent/i);
    expect(neverVerdict(3, 1)).toMatch(/guilty/i);
    expect(neverVerdict(2, 2)).toMatch(/tie/i);
  });
});

describe("decks", () => {
  it("exposes three decks with non-empty cards", () => {
    expect(DECK_IDS).toHaveLength(3);
    for (const id of DECK_IDS) {
      expect(DECKS[id].cards.length).toBeGreaterThan(10);
    }
  });

  it("tags each card with the matching kind", () => {
    expect(DECKS["most-likely"].cards.every((c) => c.kind === "most-likely")).toBe(true);
    expect(DECKS["never"].cards.every((c) => c.kind === "never")).toBe(true);
    expect(DECKS["would-rather"].cards.every((c) => c.kind === "would-rather" && c.a && c.b)).toBe(
      true,
    );
  });
});
