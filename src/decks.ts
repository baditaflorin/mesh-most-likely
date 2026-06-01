// Deck content for mesh-most-likely. Three party formats share one engine:
//   - "most-likely": the prompt is finished by voting for *a player*.
//   - "never":       each phone answers "I have" / "I never" about itself.
//   - "would-rather": each phone picks option A or B.
//
// All content is intentionally PG-13 and kept deterministic (plain arrays) so
// the shared seed produces the same card order on every phone.

export type DeckId = "most-likely" | "never" | "would-rather";

export type Card =
  | { kind: "most-likely"; text: string }
  | { kind: "never"; text: string }
  | { kind: "would-rather"; a: string; b: string };

export type Deck = {
  id: DeckId;
  label: string;
  emoji: string;
  blurb: string;
  /** Verb shown on the result line, e.g. "Most likely to". */
  cards: Card[];
};

const mostLikely: string[] = [
  "become internet famous",
  "survive a zombie apocalypse",
  "forget their own birthday",
  "cry at a wedding",
  "start a successful company",
  "move to another country on a whim",
  "get lost with GPS in hand",
  "adopt five cats",
  "win a reality TV show",
  "talk their way out of a ticket",
  "show up an hour early",
  "show up an hour late",
  "spend their last €20 on dessert",
  "become a millionaire and stay humble",
  "read the terms and conditions",
  "befriend a complete stranger on a train",
  "fall asleep during a movie",
  "run a marathon with zero training",
  "accidentally start a group chat war",
  "go viral for the wrong reason",
  "save the day in an emergency",
  "still be dancing at 3am",
  "send a risky text to the wrong person",
  "become everyone's therapist",
];

const never: string[] = [
  "pretended to be on the phone to avoid someone",
  "sent a text to the wrong person",
  "cried during a kids' movie",
  "googled myself",
  "stayed up all night and regretted nothing",
  "eaten food off the floor",
  "lied about my age",
  "ghosted a group project",
  "sung karaoke completely sober",
  "had a crush on a teacher",
  "fallen asleep in a meeting",
  "re-gifted a present",
  "stalked an ex online",
  "broken something and blamed someone else",
  "skipped a workout I posted about",
  "eaten an entire pizza alone",
  "pretended to read a book I never finished",
  "laughed at the wrong moment",
  "kept a library book too long on purpose",
  "snooped in a host's bathroom cabinet",
  "talked to myself and got caught",
  "danced like nobody was watching (someone was)",
];

const wouldRather: Array<{ a: string; b: string }> = [
  { a: "Always be 10 minutes late", b: "Always be 20 minutes early" },
  { a: "Have unlimited sushi for life", b: "Have unlimited tacos for life" },
  { a: "Be able to fly", b: "Be invisible" },
  { a: "Never use a touchscreen again", b: "Never use a keyboard again" },
  { a: "Live without music", b: "Live without movies" },
  { a: "Read minds", b: "See one week into the future" },
  { a: "Always be too hot", b: "Always be too cold" },
  { a: "Have a rewind button", b: "Have a pause button" },
  { a: "Fight one horse-sized duck", b: "Fight 100 duck-sized horses" },
  { a: "Be the funniest person alive", b: "Be the smartest person alive" },
  { a: "Only whisper for a year", b: "Only shout for a year" },
  { a: "Give up coffee forever", b: "Give up dessert forever" },
  { a: "Have a personal chef", b: "Have a personal chauffeur" },
  { a: "Vacation in space", b: "Vacation at the bottom of the ocean" },
  { a: "Always know when someone is lying", b: "Always get away with lying" },
  { a: "Lose all your photos", b: "Lose all your texts" },
  { a: "Be famous but broke", b: "Be rich but unknown" },
  { a: "Teleport anywhere instantly", b: "Never wait in a line again" },
  { a: "Have a third arm", b: "Have a third leg" },
  { a: "Speak every language", b: "Talk to animals" },
];

export const DECKS: Record<DeckId, Deck> = {
  "most-likely": {
    id: "most-likely",
    label: "Most likely to…",
    emoji: "👑",
    blurb: "Vote for the friend who fits the prompt. Loudest reactions guaranteed.",
    cards: mostLikely.map((text) => ({ kind: "most-likely", text })),
  },
  never: {
    id: "never",
    label: "Never have I ever…",
    emoji: "🍻",
    blurb: "Own up — tap “I have” or “Never”. Counts are shown, names stay yours.",
    cards: never.map((text) => ({ kind: "never", text })),
  },
  "would-rather": {
    id: "would-rather",
    label: "Would you rather…",
    emoji: "🤔",
    blurb: "Pick a side. Watch the room split.",
    cards: wouldRather.map(({ a, b }) => ({ kind: "would-rather", a, b })),
  },
};

export const DECK_IDS: DeckId[] = ["most-likely", "never", "would-rather"];
