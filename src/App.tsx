import React from "react";
import { StudyView } from "./components/StudyView";
import { EditView } from "./components/EditView";
import {
  loadDeck,
  saveDeck,
  loadTheme,
  saveTheme,
  type Deck,
  defaultDeck,
  hashDeck,
  loadExportedHash,
  saveExportedHash,
} from "./utils/storage";

type Mode = "study" | "edit";
type Theme = "auto" | "light" | "dark";

export default function App() {
  const [mode, setMode] = React.useState<Mode>("edit");
  const [deck, setDeck] = React.useState<Deck>(() => {
    return loadDeck() ?? defaultDeck();
  });
  const [theme, setTheme] = React.useState<Theme>(() => loadTheme());
  const [exportedHash, setExportedHash] = React.useState<string | null>(() =>
    loadExportedHash()
  );
  const [showHelp, setShowHelp] = React.useState(false);

  const liveRef = React.useRef<HTMLDivElement>(null);
  const helpRef = React.useRef<HTMLDivElement>(null);
  const helpTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

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

  const save = (updatedDeck: Deck, message?: string) => {
    setDeck(updatedDeck);
    saveDeck(updatedDeck);
    if (message) {
      announce(message);
    }
  };

  const onNew = () => {
    const isDirty = exportedHash !== hashDeck(deck);

    if (isDirty) {
      const confirmed = window.confirm(
        "You have unexported changes. Creating a new set will overwrite the current one. Continue?"
      );
      if (!confirmed) return;
    }

    const freshDeck = defaultDeck();
    save(freshDeck, "New set created");
    setExportedHash(null);
    setMode("edit");
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(deck, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${deck.name.replace(/\s+/g, "_") || "quick_cards"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    const currentHash = hashDeck(deck);
    saveExportedHash(currentHash);
    setExportedHash(currentHash);
    announce("Exported JSON");
  };

  const dirtySinceExport = exportedHash !== hashDeck(deck);

  const openHelp = () => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setShowHelp(true);
  };

  const closeHelp = () => {
    setShowHelp(false);

    const target = helpTriggerRef.current ?? lastFocusedRef.current ?? null;

    if (target) {
      window.setTimeout(() => target.focus(), 10);
    }
  };

  React.useEffect(() => {
    if (showHelp && helpRef.current) {
      const focusableSelectors =
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
      const focusables =
        helpRef.current.querySelectorAll<HTMLElement>(focusableSelectors);

      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }
  }, [showHelp]);

  const handleHelpKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!helpRef.current) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeHelp();
      return;
    }

    if (event.key === "Tab") {
      const focusableSelectors =
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
      const focusables =
        helpRef.current.querySelectorAll<HTMLElement>(focusableSelectors);

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      }
    }
  };

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto]">
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        ref={liveRef}
      />

      <header className="sticky top-0 z-40 border-b border-[var(--border)] app-shell">
        <div className="mx-auto max-w-4xl px-3 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <strong className="text-xl">Quick Cards</strong>
          </div>

          <nav className="mx-auto seg" aria-label="Mode">
            <button
              type="button"
              className="seg-btn"
              onClick={() => setMode("study")}
              aria-current={mode === "study" ? "page" : undefined}
            >
              Study
            </button>
            <button
              type="button"
              className="seg-btn"
              onClick={() => setMode("edit")}
              aria-current={mode === "edit" ? "page" : undefined}
            >
              Edit
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <label htmlFor="theme" className="text-sm text-[var(--muted)]">
              Theme
            </label>
            <select
              id="theme"
              className="btn"
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
              aria-label="Theme selector"
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>

            <button
              type="button"
              ref={helpTriggerRef}
              className="icon-btn"
              aria-label="Show help"
              aria-haspopup="dialog"
              aria-expanded={showHelp}
              onClick={openHelp}
            >
              ?
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-3 pb-2 text-xs text-[var(--muted)]">
          {dirtySinceExport ? "Changes not exported" : "All changes exported"}
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl px-3 py-4">
        {mode === "study" ? (
          <StudyView deck={deck} onSave={save} />
        ) : (
          <EditView
            key={hashDeck(deck)}
            deck={deck}
            onSave={save}
            onNew={onNew}
            onExportHeader={onExport}
          />
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-[var(--border)] app-shell">
        <div className="mx-auto max-w-4xl px-4 py-3 text-base text-[var(--muted)] flex flex-wrap gap-x-5 gap-y-2 justify-center">
          <span>
            <span className="kbd">Space</span> Flip
          </span>
          <span>
            <span className="kbd">G</span> Got it / Restart
          </span>
          <span>
            <span className="kbd">←</span>/<span className="kbd">→</span>{" "}
            Navigate
          </span>
          <span>
            <span className="kbd">S</span> Shuffle
          </span>
          <span>
            <span className="kbd">D</span> Switch direction
          </span>
        </div>
      </footer>

      {showHelp && (
        <div className="modal-backdrop" role="presentation">
          <div
            ref={helpRef}
            className="modal surface max-w-2xl w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            aria-describedby="help-desc"
            onKeyDown={handleHelpKeyDown}
          >
            <h2 id="help-title" className="text-xl font-semibold mb-2">
              Using Quick Cards
            </h2>

            <p id="help-desc" className="text-sm text-[var(--muted)] mb-4">
              A fast, simple flashcard app you can use with keyboard, mouse, or
              touch. Spend more time studying and less clicking!
            </p>

            <section>
              <h3 className="text-sm font-semibold mb-2">Help & Controls</h3>
              <ul className="text-left text-sm space-y-2">
                <li>
                  <strong>Keyboard shortcuts</strong> –{" "}
                  <span className="kbd">Space</span> flip,&nbsp;
                  <span className="kbd">G</span>/
                  <span className="kbd">Enter</span> got it / restart,&nbsp;
                  <span className="kbd">←</span>/<span className="kbd">→</span>{" "}
                  move,&nbsp;
                  <span className="kbd">S</span> shuffle,&nbsp;
                  <span className="kbd">D</span> switch Q/A.
                </li>

                <li>
                  <strong>Buttons</strong> – All of these actions also have
                  clear, clickable buttons if you prefer the mouse.
                </li>

                <li>
                  <strong>Local deck</strong> – Your current deck is saved
                  automatically in this browser as you edit. It stays on this
                  device and will be there next time you open the app.
                </li>

                <li>
                  <strong>Import / Export</strong> – Use <code>Export</code> to
                  download your deck as a <code>.json</code> file so you can
                  back it up or move it to another browser or device. Use{" "}
                  <code>Import</code> to load a deck from a<code>.json</code>{" "}
                  file into the app as your current deck.
                </li>

                <li>
                  <strong>Accessibility</strong> – Predictable tab order, large
                  click areas, readable text, high contrast, and screen-reader
                  friendly labels. Works well with browser zoom and
                  reduced-motion settings.
                </li>
              </ul>
            </section>

            <div className="mt-4 text-right">
              <button className="btn-cta" type="button" onClick={closeHelp}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
