import React from "react";
import { Card } from "./Card";
import { shuffleInPlace } from "../utils/shuffle";
import type { Deck } from "../utils/storage";

type StudyViewProps = {
  deck: Deck;
  onSave: (d: Deck, msg?: string) => void;
};

type Direction = "Q2A" | "A2Q";

function getActiveIndices(cards: Deck["cards"]): number[] {
  return cards
    .map((card, index) => {
      const isArchived = card.archived;
      const hasContent = (card.q.trim() + card.a.trim()).length > 0;
      return !isArchived && hasContent ? index : -1;
    })
    .filter((index) => index >= 0);
}

export function StudyView({ deck, onSave }: StudyViewProps) {
  const [direction, setDirection] = React.useState<Direction>(
    deck.defaults.direction
  );
  const [flipped, setFlipped] = React.useState(false);

  const activeIndices = React.useMemo(
    () => getActiveIndices(deck.cards),
    [deck.cards]
  );

  const [order, setOrder] = React.useState<number[]>(activeIndices);
  const [cursor, setCursor] = React.useState(0);

  React.useEffect(() => {
    const indices = getActiveIndices(deck.cards);

    if (deck.defaults.shuffle) {
      shuffleInPlace(indices, 0);
    }

    setOrder(indices);
    setCursor(0);
    setFlipped(false);
    setDirection(deck.defaults.direction);
  }, [deck]);

  const done = cursor >= order.length;
  const currentIndex = done ? null : order[cursor];
  const currentCard = currentIndex === null ? null : deck.cards[currentIndex];

  const flipCard = () => {
    setFlipped((previous) => !previous);
  };

  const goToNext = () => {
    if (done) return;

    setCursor((previous) => {
      const nextCursor = previous + 1;
      return nextCursor > order.length ? order.length : nextCursor;
    });
    setFlipped(false);
  };

  const goToPrevious = () => {
    setCursor((previous) => (previous <= 0 ? 0 : previous - 1));
    setFlipped(false);
  };

  const reshuffleAll = () => {
    const shuffled = [...order];
    shuffleInPlace(shuffled, 0);
    setOrder(shuffled);
    setCursor(0);
    setFlipped(false);
  };

  const archiveCurrentCard = () => {
    if (done || currentIndex === null) return;

    const updatedDeck: Deck = {
      ...deck,
      cards: deck.cards.map((card, index) =>
        index === currentIndex ? { ...card, archived: true } : card
      ),
    };

    onSave(updatedDeck, "Card archived");

    const updatedOrder = order.filter((index) => index !== currentIndex);
    setOrder(updatedOrder);
    setFlipped(false);

    if (cursor >= updatedOrder.length) {
      const nextCursor = Math.max(0, updatedOrder.length - 1);
      setCursor(nextCursor);
    }
  };

  const totalActive = activeIndices.length;
  const remaining = done ? 0 : order.length - cursor;
  const learned = totalActive - remaining;

  const progressPercent =
    totalActive === 0 ? 0 : Math.round((learned / totalActive) * 100);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;

      // Only ignore shortcuts when the user is typing in a field,
      // not when focus is on buttons/links.
      const isTypingContext =
        activeElement &&
        activeElement.closest(
          "input, textarea, select, [contenteditable='true']"
        );

      if (isTypingContext) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === " " && !event.repeat) {
        event.preventDefault();
        flipCard();
        return;
      }

      if (key === "g" && !event.repeat) {
        event.preventDefault();
        if (done) {
          reshuffleAll();
        } else {
          archiveCurrentCard();
        }
        return;
      }

      if (key === "arrowright") {
        event.preventDefault();
        goToNext();
        return;
      }

      if (key === "arrowleft") {
        event.preventDefault();
        goToPrevious();
        return;
      }

      if (key === "d") {
        event.preventDefault();
        setDirection((previous) => (previous === "Q2A" ? "A2Q" : "Q2A"));
        return;
      }

      if (key === "s") {
        event.preventDefault();
        reshuffleAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [done, order, cursor, deck, archiveCurrentCard]);

  const primaryButtonClass = "btn btn-lg btn-wide";

  return (
    <section aria-labelledby="study-title" className="grid gap-6">
      <header className="text-center">
        <h1 id="study-title" className="text-2xl font-semibold">
          {deck.name || "Untitled Set"}
        </h1>

        <div
          className="mx-auto mt-2 w-72 progress"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={totalActive}
          aria-valuenow={learned}
        >
          <div className="bar" style={{ width: `${progressPercent}%` }} />
        </div>

        <p className="text-sm mt-1 text-[var(--muted)]" aria-live="polite">
          Left: {remaining} / {totalActive}
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl">
        {done ? (
          <div
            className="aspect-[3/2] surface grid place-items-center text-center px-6"
            role="status"
            aria-live="polite"
          >
            <div>
              <p className="text-2xl mb-2">🎉 Done! Great work!</p>
              <p className="text-[var(--muted)]">
                Press <span className="kbd">G</span> to restart this session.
              </p>
            </div>
          </div>
        ) : (
          currentCard && (
            <Card
              front={direction === "Q2A" ? currentCard.q : currentCard.a}
              back={direction === "Q2A" ? currentCard.a : currentCard.q}
              flipped={flipped}
              onFlip={flipCard}
            />
          )
        )}
      </div>

      <div
        className="mx-auto max-w-2xl grid grid-cols-3 gap-1 sm:gap-2 justify-items-stretch"
        role="group"
        aria-label="Study controls"
      >
        <button
          type="button"
          onClick={goToPrevious}
          className={primaryButtonClass}
          aria-label="Previous card"
          disabled={done}
        >
          ← Prev
        </button>

        {done ? (
          <button
            type="button"
            onClick={reshuffleAll}
            className={`${primaryButtonClass} btn-cta`}
            aria-label="Restart session"
          >
            Restart
          </button>
        ) : (
          <button
            type="button"
            onClick={archiveCurrentCard}
            className={`${primaryButtonClass} btn-cta`}
            aria-label="Mark got it and archive"
          >
            Got it
          </button>
        )}

        <button
          type="button"
          onClick={goToNext}
          className={primaryButtonClass}
          aria-label="Next card"
          disabled={done}
        >
          Next →
        </button>
      </div>

      <div
        className="mx-auto max-w-2xl grid grid-cols-2 gap-1 sm:gap-2 justify-items-stretch"
        role="group"
        aria-label="Session options"
      >
        <button
          type="button"
          onClick={reshuffleAll}
          className={primaryButtonClass}
          aria-label="Shuffle all cards (S)"
        >
          Shuffle
        </button>

        <button
          type="button"
          onClick={() =>
            setDirection((previous) => (previous === "Q2A" ? "A2Q" : "Q2A"))
          }
          className={primaryButtonClass}
          aria-pressed={direction === "A2Q"}
          title="Toggle direction (D)"
        >
          {direction === "Q2A" ? "Q → A" : "A → Q"}
        </button>
      </div>
    </section>
  );
}
