import React from "react";
import type { Deck, CardItem } from "../utils/storage";


type EditViewProps = {
  deck: Deck;
  onSave: (d: Deck, msg?: string) => void;
  onNew: () => void;
  onExportHeader?: () => void;
};

function useDebounced<T extends (...args: any[]) => void>(
  callback: T,
  delay = 400
) {
  const timerRef = React.useRef<number | null>(null);

  const trigger = (...args: Parameters<T>) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };

  const cancel = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => cancel();
  }, []);

  return { trigger, cancel };
}

export function EditView({
  deck,
  onSave,
  onNew,
  onExportHeader,
}: EditViewProps) {
  const [name, setName] = React.useState(deck.name);
  const [cards, setCards] = React.useState<CardItem[]>(deck.cards);
  const [direction, setDirection] = React.useState<"Q2A" | "A2Q">(
    deck.defaults.direction
  );
  const [shuffle, setShuffle] = React.useState<boolean>(deck.defaults.shuffle);

  const liveRef = React.useRef<HTMLDivElement>(null);
  const newCardRef = React.useRef<HTMLLIElement>(null);
  const newCardInputRef = React.useRef<HTMLTextAreaElement>(null)

  const announce = (message: string) => {
    const region = liveRef.current;
    if (!region) return;

    region.textContent = "";
    window.setTimeout(() => {
      if (liveRef.current) {
        liveRef.current.textContent = message;
      }
    }, 30);
  };

  const { trigger: scheduleSave, cancel: cancelSave } = useDebounced(() => {
    const updatedDeck: Deck = {
      schemaVersion: 1,
      name,
      cards,
      defaults: { direction, shuffle },
    };
    onSave(updatedDeck);
    announce("Set saved");
  }, 500);

  React.useEffect(() => {
    scheduleSave();
  }, [name, direction, shuffle, scheduleSave]);

  React.useEffect(() => {
    setName(deck.name);
    setCards(deck.cards);
    setDirection(deck.defaults.direction);
    setShuffle(deck.defaults.shuffle);
  }, [deck]);

  const addCard = () => {
    setCards((previousCards) => [...previousCards, { q: "", a: "" }]);

    setTimeout(() => {
      newCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    
      newCardInputRef.current?.focus();}, 
    50);

    
  };

  const deleteCard = (index: number) => {
    setCards((previousCards) =>
      previousCards.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const updateCard = (index: number, patch: Partial<CardItem>) => {
    setCards((previousCards) =>
      previousCards.map((card, currentIndex) =>
        currentIndex === index ? { ...card, ...patch } : card
      )
    );
  };

  const setArchivedState = (index: number, archived: boolean) => {
    updateCard(index, { archived });
  };

  const importJSON = () => {
    cancelSave();

    const confirmed = window.confirm(
      "Importing will replace your current set. If you have unsaved changes, they will be lost. Continue?"
    );

    if (!confirmed) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const raw = await file.text();
        const json = JSON.parse(raw);

        if (json.schemaVersion !== 1 || !Array.isArray(json.cards)) {
          throw new Error("Invalid schema");
        }

        const importedCards: CardItem[] = json.cards.map((card: any) => ({
          q: String(card.q ?? ""),
          a: String(card.a ?? ""),
          archived: Boolean(card.archived),
        }));

        setName(json.name || "Imported Set");
        setCards(importedCards);
        setDirection(json.defaults?.direction === "A2Q" ? "A2Q" : "Q2A");
        setShuffle(Boolean(json.defaults?.shuffle));
        announce("Set imported");
      } catch {
        announce("Import failed");
      }
    };

    input.click();
  };

  const exportJSON = () => {
    if (onExportHeader) {
      onExportHeader();
      return;
    }

    const data: Deck = {
      schemaVersion: 1,
      name,
      cards,
      defaults: { direction, shuffle },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name.replace(/\s+/g, "_") || "quick_cards"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleNewClick = () => {
    cancelSave();
    onNew();
  };

  const activeCards = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !card.archived);

  const archivedCards = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => Boolean(card.archived));

  return (
    <section
      aria-labelledby="edit-title"
      aria-describedby="edit-desc"
      className="grid gap-6"
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        ref={liveRef}
      />

      <header className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div>
          <h1 id="edit-title" className="text-2xl font-semibold text-left">
            Edit Set
          </h1>
          <p
            id="edit-desc"
            className="text-sm text-[var(--muted)] text-left stable-block"
          >
            Edit questions and answers. Changes are saved automatically as you
            type.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleNewClick}
            className="btn"
            aria-label="Create new set"
          >
            New
          </button>
          <button
            type="button"
            onClick={importJSON}
            className="btn"
            aria-label="Import JSON"
          >
            Import
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="btn"
            aria-label="Export JSON"
          >
            Export
          </button>
        </div>
      </header>

      <div className="grid gap-4">
        <label className="grid gap-1 text-left">
          <span className="text-sm">Set name</span>
          <input
            className="btn"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <fieldset className="surface p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <legend className="sr-only">Study defaults</legend>

          <label className="flex items-center gap-2 text-sm">
            <span>Direction</span>
            <select
              className="btn"
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as "Q2A" | "A2Q")
              }
            >
              <option value="Q2A">Question → Answer</option>
              <option value="A2Q">Answer → Question</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span>Shuffle on start</span>
            <select
              className="btn"
              value={String(shuffle)}
              onChange={(event) => setShuffle(event.target.value === "true")}
            >
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </label>
        </fieldset>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-left">
          Cards{" "}
          <span className="text-sm font-normal text-[var(--muted)]">
            ({cards.length} total)
          </span>
        </h2>
        <button
          type="button"
          onClick={addCard}
          className="btn-cta"
          aria-label="Add a new card"
        >
          Add Card
        </button>
      </div>

      <ul className="grid gap-4" aria-label="Active cards">
        {activeCards.map(({ card, index }) => (
          <li 
          key={index}
          ref={index === activeCards.length - 1 ? newCardRef : null}
          className="surface p-3"
          >
            <div className="grid md:grid-cols-2 gap-2">
              <label className="grid gap-1 text-left">
                <span className="text-sm">Question</span>
                <textarea
                  rows={3}
                  className="btn"
                  value={card.q}
                  ref={index === activeCards.length - 1 ? newCardInputRef : null}
                  onChange={(event) =>
                    updateCard(index, { q: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-1 text-left">
                <span className="text-sm">Answer</span>
                <textarea
                  rows={3}
                  className="btn"
                  value={card.a}
                  onChange={(event) =>
                    updateCard(index, { a: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setArchivedState(index, true)}
                className="btn"
                aria-label={`Archive card ${index + 1}`}
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => deleteCard(index)}
                className="btn"
                aria-label={`Delete card ${index + 1}`}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {archivedCards.length > 0 && (
        <section aria-labelledby="archived-title" className="grid gap-2">
          <h3
            id="archived-title"
            className="text-md font-semibold text-[var(--muted)] text-left"
          >
            Archived (learned)
          </h3>

          <ul className="grid gap-3" aria-label="Archived cards">
            {archivedCards.map(({ card, index }) => (
              <li key={index} className="surface p-3">
                <div className="grid md:grid-cols-2 gap-2 opacity-80">
                  <label className="grid gap-1 text-left">
                    <span className="text-sm">Question</span>
                    <textarea
                      rows={2}
                      className="btn"
                      value={card.q}
                      onChange={(event) =>
                        updateCard(index, { q: event.target.value })
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-left">
                    <span className="text-sm">Answer</span>
                    <textarea
                      rows={2}
                      className="btn"
                      value={card.a}
                      onChange={(event) =>
                        updateCard(index, { a: event.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="pt-3 text-right">
                  <button
                    type="button"
                    onClick={() => setArchivedState(index, false)}
                    className="btn-cta"
                    aria-label={`Restore card ${index + 1}`}
                  >
                    Restore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
