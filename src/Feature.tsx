import { useEffect, useState } from "react";
import {
  type MeshConfig,
  type YRoom,
  ConfettiLayer,
  Leaderboard,
  useConfetti,
  useNamedPeer,
  usePhase,
  useRoster,
  useVotes,
} from "@baditaflorin/mesh-common";
import { DECKS, DECK_IDS, type DeckId } from "./decks";
import { makeOrder, mostLikelyVerdict, neverVerdict, pct } from "./logic";

type Props = { room: YRoom | null; config: MeshConfig };
type Stage = "lobby" | "vote" | "reveal";

const GAME_KEY = "ml:game";

/** Shared game pointer: which deck, the shuffle seed, and the card index. */
function useGame(room: YRoom | null) {
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!room) return;
    const m = room.doc.getMap(GAME_KEY);
    const cb = () => rerender((n) => n + 1);
    m.observe(cb);
    return () => m.unobserve(cb);
  }, [room]);

  const m = room ? room.doc.getMap(GAME_KEY) : null;
  const deck = (m?.get("deck") as DeckId | undefined) ?? null;
  const seed = (m?.get("seed") as number | undefined) ?? 0;
  const idx = (m?.get("idx") as number | undefined) ?? 0;

  const start = (d: DeckId) => {
    if (!m || !room) return;
    room.doc.transact(() => {
      m.set("deck", d);
      m.set("seed", Math.floor(Math.random() * 0xffffffff));
      m.set("idx", 0);
    });
  };
  const setIdx = (i: number) => m?.set("idx", i);

  return { deck, seed, idx, start, setIdx };
}

export function Feature({ room, config }: Props) {
  const { myName, names, setName, name } = useNamedPeer(config, room);
  const roster = useRoster(room);
  const phase = usePhase<Stage>(room, "ml:phase", "lobby");
  const game = useGame(room);
  const { burst } = useConfetti();

  const deck = game.deck ? DECKS[game.deck] : null;
  const order = deck ? makeOrder(deck.cards.length, game.seed) : [];
  const cardNo = deck ? game.idx % deck.cards.length : 0;
  const card = deck ? deck.cards[order[cardNo]!] : null;
  const isLast = deck ? game.idx >= deck.cards.length - 1 : false;

  const voteKey = `ml:v:${game.deck ?? "x"}:${game.idx}`;
  const votes = useVotes<string>(room, voteKey, room?.peerId);

  // Fire confetti once when a "most likely" winner is revealed.
  useEffect(() => {
    if (phase.phase !== "reveal" || card?.kind !== "most-likely") return;
    if (votes.totalVotes === 0) return;
    burst({ origin: "top", count: 90, hueRange: [330, 350] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.phase, phase.epoch]);

  if (!room) {
    return (
      <div className="ml-wrap">
        <h1 className="ml-title">{config.appName}</h1>
        <p className="ml-status">Connecting to the room…</p>
      </div>
    );
  }

  const present = roster.present.length ? roster.present : [room.peerId];
  const nameFor = (id: string) =>
    names[id] || (id === room.peerId ? myName : `peer-${id.slice(0, 4)}`);

  // ---- Lobby ---------------------------------------------------------------
  if (phase.phase === "lobby") {
    return (
      <div className="ml-wrap">
        <ConfettiLayer />
        <h1 className="ml-title">{DECKS["most-likely"].emoji} mesh-most-likely</h1>
        <p className="ml-tagline">
          The universal icebreaker. Open this page on every phone in the room, pick a deck, and vote
          together.
        </p>

        {!name.trim() && (
          <label className="ml-name">
            Your name
            <input
              type="text"
              value={name}
              maxLength={24}
              placeholder="e.g. Alex"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}

        <p className="ml-roster">
          <strong>{present.length}</strong> phone{present.length === 1 ? "" : "s"} here
          {present.length > 0 ? ": " : ""}
          {present.map(nameFor).join(", ")}
        </p>

        <div className="ml-decks">
          {DECK_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="ml-deck-card"
              onClick={() => {
                game.start(id);
                phase.transition("vote");
              }}
            >
              <span className="ml-deck-emoji">{DECKS[id].emoji}</span>
              <span className="ml-deck-label">{DECKS[id].label}</span>
              <span className="ml-deck-blurb">{DECKS[id].blurb}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!deck || !card) {
    return (
      <div className="ml-wrap">
        <h1 className="ml-title">Loading deck…</h1>
        <button type="button" onClick={() => phase.transition("lobby")}>
          Back to decks
        </button>
      </div>
    );
  }

  const revealed = phase.phase === "reveal";
  const progress = `${votes.totalVotes} / ${present.length} voted`;

  const header = (
    <div className="ml-card-head">
      <div className="ml-hud">
        {deck.emoji} {deck.label} · card {cardNo + 1}/{deck.cards.length}
      </div>
      <h1 className="ml-prompt">
        {card.kind === "would-rather" ? "Would you rather…" : card.text}
      </h1>
    </div>
  );

  // ---- Vote stage ----------------------------------------------------------
  if (!revealed) {
    return (
      <div className="ml-wrap ml-stage-vote">
        <ConfettiLayer />
        {header}

        {card.kind === "most-likely" && (
          <div className="ml-options ml-options-people">
            {present.map((id) => (
              <button
                key={id}
                type="button"
                className={`ml-vote ${votes.myVote === id ? "is-picked" : ""}`}
                onClick={() => votes.vote(id)}
              >
                {nameFor(id)}
                {id === room.peerId ? " (you)" : ""}
              </button>
            ))}
          </div>
        )}

        {card.kind === "never" && (
          <div className="ml-options ml-options-two">
            <button
              type="button"
              className={`ml-vote ${votes.myVote === "have" ? "is-picked" : ""}`}
              onClick={() => votes.vote("have")}
            >
              🙋 I have
            </button>
            <button
              type="button"
              className={`ml-vote ${votes.myVote === "never" ? "is-picked" : ""}`}
              onClick={() => votes.vote("never")}
            >
              🙅 Never
            </button>
          </div>
        )}

        {card.kind === "would-rather" && (
          <div className="ml-options ml-options-two">
            <button
              type="button"
              className={`ml-vote ${votes.myVote === "a" ? "is-picked" : ""}`}
              onClick={() => votes.vote("a")}
            >
              {card.a}
            </button>
            <button
              type="button"
              className={`ml-vote ${votes.myVote === "b" ? "is-picked" : ""}`}
              onClick={() => votes.vote("b")}
            >
              {card.b}
            </button>
          </div>
        )}

        <div className="ml-controls">
          <span className="ml-progress">{progress}</span>
          <button type="button" className="ml-primary" onClick={() => phase.transition("reveal")}>
            Reveal
          </button>
        </div>
      </div>
    );
  }

  // ---- Reveal stage --------------------------------------------------------
  let results: React.ReactNode = null;

  if (card.kind === "most-likely") {
    const verdict = mostLikelyVerdict(votes.tally);
    const items = present
      .map((id) => ({
        id,
        name: nameFor(id),
        score: votes.tally.get(id) ?? 0,
        isMe: id === room.peerId,
      }))
      .sort((a, b) => b.score - a.score);
    results = (
      <>
        <p className="ml-verdict">
          {verdict.winnerId
            ? verdict.tie
              ? `Tie! ${verdict.leaders.map(nameFor).join(" & ")} 👑`
              : `${nameFor(verdict.winnerId)} — most likely to ${card.text} 👑`
            : "No votes yet."}
        </p>
        <Leaderboard items={items} highlightId={room.peerId} title={null} />
      </>
    );
  } else if (card.kind === "never") {
    const have = votes.tally.get("have") ?? 0;
    const never = votes.tally.get("never") ?? 0;
    results = (
      <div className="ml-split">
        <Bar label="🙋 I have" value={have} total={votes.totalVotes} />
        <Bar label="🙅 Never" value={never} total={votes.totalVotes} />
        <p className="ml-verdict">{neverVerdict(have, never)}</p>
      </div>
    );
  } else {
    const a = votes.tally.get("a") ?? 0;
    const b = votes.tally.get("b") ?? 0;
    results = (
      <div className="ml-split">
        <Bar label={card.a} value={a} total={votes.totalVotes} />
        <Bar label={card.b} value={b} total={votes.totalVotes} />
        <p className="ml-verdict">
          {a === b ? "Dead heat! 🤝" : `${a > b ? card.a : card.b} takes it.`}
        </p>
      </div>
    );
  }

  return (
    <div className="ml-wrap ml-stage-reveal">
      <ConfettiLayer />
      {header}
      <div className="ml-results">{results}</div>
      <div className="ml-controls">
        {isLast ? (
          <button type="button" className="ml-primary" onClick={() => phase.transition("lobby")}>
            Deck finished — pick another
          </button>
        ) : (
          <button
            type="button"
            className="ml-primary"
            onClick={() => {
              game.setIdx(game.idx + 1);
              phase.transition("vote");
            }}
          >
            Next card →
          </button>
        )}
        <button type="button" className="ml-ghost" onClick={() => phase.transition("lobby")}>
          Change deck
        </button>
      </div>
    </div>
  );
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const p = pct(value, total);
  return (
    <div className="ml-bar-row">
      <div className="ml-bar-label">
        {label} <span className="ml-bar-count">{value}</span>
      </div>
      <div className="ml-bar-track">
        <div className="ml-bar-fill" style={{ width: `${p}%` }} />
      </div>
      <div className="ml-bar-pct">{p}%</div>
    </div>
  );
}
