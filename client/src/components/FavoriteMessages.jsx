/**
 * FavoriteMessages.jsx
 * A compact "pinned phrases" strip displayed above the main composer.
 * Shows only the first FEW_SHOWN pinned messages inline for quick access.
 * Clicking a chip loads the phrase into the composer instantly.
 *
 * Props:
 *   history     – Message[]
 *   favorites   – Set<string>
 *   onReuse     – (text) => void
 *   onUnpin     – (id) => void
 */

import React, { useState } from "react";

const FEW_SHOWN = 5; // maximum chips shown before "Show more" link

export function FavoriteMessages({ history, favorites, onReuse, onUnpin }) {
  const [expanded, setExpanded] = useState(false);

  const pinned = history.filter((m) => favorites.has(m.id));
  if (pinned.length === 0) return null;

  const displayed = expanded ? pinned : pinned.slice(0, FEW_SHOWN);
  const hasMore = pinned.length > FEW_SHOWN;

  return (
    <section
      aria-labelledby="fav-heading"
      className="flex-shrink-0 border-b border-amber-100 bg-amber-50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/30" style={{color:"white"}}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span aria-hidden="true" className="text-amber-500">⭐</span>
        <h3
          id="fav-heading"
          className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400"
        >
          Pinned phrases
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Pinned phrases">
        {displayed.map((msg) => (
          <div
            key={msg.id}
            role="listitem"
            className="flex items-center gap-1 rounded-full border border-amber-200 bg-white pl-3 pr-1 py-1 text-xs text-amber-800 shadow-none dark:border-amber-800/50 dark:bg-neutral-900 dark:text-amber-300"
          >
            <button
              onClick={() => onReuse(msg.text)}
              className="max-w-[180px] truncate text-left focus:outline-none focus:underline"
              aria-label={`Load pinned phrase: ${msg.text}`}
              title={msg.text}
            >
              {msg.text}
            </button>
            <button
              onClick={() => onUnpin(msg.id)}
              className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-amber-400 transition hover:bg-amber-100 hover:text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:hover:bg-amber-900"
              aria-label={`Unpin: ${msg.text}`}
            >
              <CloseIcon />
            </button>
          </div>
        ))}

        {hasMore && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-amber-600 transition hover:bg-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label={expanded ? "Show fewer pinned phrases" : `Show ${pinned.length - FEW_SHOWN} more pinned phrases`}
          >
            {expanded ? "Show less" : `+${pinned.length - FEW_SHOWN} more`}
          </button>
        )}
      </div>
    </section>
  );
}

const CloseIcon = () => (
  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" />
  </svg>
);