export type CardItem = { q: string; a: string; archived?: boolean };

export type Deck = {
  schemaVersion: 1;
  name: string;
  cards: CardItem[];
  defaults: {
    direction: "Q2A" | "A2Q";
    shuffle: boolean;
  };
};

const KEY = "quick-cards/deck";
const THEME_KEY = "quick-cards/theme";
const EXPORTED_HASH_KEY = "quick-cards/exported-hash";

export const defaultDeck = (): Deck => ({
  schemaVersion: 1,
  name: "Sample Set",
  cards: [
    { q: "Question", a: "Answer" }
  ],
  defaults: { direction: "Q2A", shuffle: true },
});

export function loadDeck(): Deck | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj.schemaVersion !== 1) return null;
    return obj as Deck;
  } catch {
    return null;
  }
}

export function saveDeck(deck: Deck) {
  localStorage.setItem(KEY, JSON.stringify(deck));
}

export type Theme = "auto" | "light" | "dark";
export function loadTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) || "auto";
}
export function saveTheme(t: Theme) {
  localStorage.setItem(THEME_KEY, t);
}

/** Lightweight hash for export-awareness. */
export function hashDeck(deck: Deck): string {
  const json = JSON.stringify(deck);
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = ((h << 5) + h) ^ json.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function loadExportedHash(): string | null {
  return localStorage.getItem(EXPORTED_HASH_KEY);
}
export function saveExportedHash(hash: string) {
  localStorage.setItem(EXPORTED_HASH_KEY, hash);
}
