/**
 * SpeechHistory.jsx
 * Collapsible sidebar showing all spoken messages.
 * Tabs: "All" history and "Pinned" favorites.
 * Includes search/filter, clear-all, and per-message actions (via MessageCard).
 *
 * Props:
 *   history        – Message[]                     from useSpeechHistory
 *   favorites      – Set<string>                   from useSpeechHistory
 *   onReuse        – (text) => void
 *   onReplay       – (text) => void
 *   onToggleFav    – (id) => void
 *   onDelete       – (id) => void
 *   onClearHistory – () => void
 *   onCopy         – (text) => void
 */

import React, { useState, useMemo } from "react";
import { MessageCard } from "./MessageCard";

export function SpeechHistory({
  history,
  favorites,
  onReuse,
  onReplay,
  onToggleFav,
  onDelete,
  onClearHistory,
  onCopy,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState("all"); // "all" | "pinned"
  const [search, setSearch] = useState("");

  // ── Derived list based on active tab + search query ───────────────────────
  const visible = useMemo(() => {
    let msgs =
      tab === "pinned" ? history.filter((m) => favorites.has(m.id)) : history;

    if (search.trim()) {
      const q = search.toLowerCase();
      msgs = msgs.filter((m) => m.text.toLowerCase().includes(q));
    }
    return msgs;
  }, [history, favorites, tab, search]);

  const handleClearHistory = () => {
    if (
      window.confirm("Clear all history? Pinned messages will also be removed.")
    ) {
      onClearHistory();
    }
    const tabs = ["all", "pinned"];

    const handleTabKeyDown = (event, currentIndex) => {
      let nextIndex = currentIndex;

      if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      }

      if (event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      if (nextIndex !== currentIndex) {
        setTab(tabs[nextIndex]);
      }
    };
  };

  return (
    <aside
      className={[
        "flex flex-shrink-0 flex-col border-r border-neutral-200 bg-neutral-50",
        "transition-all duration-200 dark:border-neutral-700 dark:bg-neutral-900",
        collapsed ? "w-12" : "w-80",
      ].join(" ")}
      aria-label="Speech history"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-neutral-200 px-3 py-3 dark:border-neutral-700">
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={
            collapsed ? "Expand history panel" : "Collapse history panel"
          }
          aria-expanded={!collapsed}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>

        {!collapsed && (
          <>
            <span className="flex-1 truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
              History
            </span>
            {history.length > 0 && (
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                {history.length}
              </span>
            )}
          </>
        )}
      </div>

      {/* ── Body (hidden when collapsed) ──────────────────────────────────── */}
      {!collapsed && (
        <>
          {/* Search */}
          <div className="flex-shrink-0 border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
            <label htmlFor="vf-search" className="sr-only">
              Search history
            </label>
            <input
              id="vf-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
          </div>

          {/* Tabs */}
          <div
            className="flex flex-shrink-0 gap-1 border-b border-neutral-200 px-3 pt-2 dark:border-neutral-700"
            role="tablist"
            aria-label="Speech history tabs"
          >
            {[
              { key: "all", label: "All" },
              { key: "pinned", label: "⭐ Pinned" },
            ].map(({ key, label }, index) => (
              <button
                key={key}
                id={`tab-${key}`}
                role="tab"
                aria-selected={tab === key}
                aria-controls={`panel-${key}`}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={[
                  "rounded-t-md px-3 py-1.5 text-xs font-medium transition",
                  "focus:outline-none focus:ring-2 focus:ring-blue-400",
                  tab === key
                    ? "border border-b-white border-neutral-200 bg-white text-blue-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-blue-400"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Message list */}
          <div
            id={`panel-${tab}`}
            className="flex-1 overflow-y-auto p-3 focus:outline-none"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            aria-label={tab === "pinned" ? "Pinned messages" : "All messages"}
            tabIndex={0}
          >
            {visible.length === 0 ? (
              <EmptyState tab={tab} hasSearch={!!search.trim()} />
            ) : (
              <ul className="space-y-2" aria-label="Message list">
                {visible.map((msg) => (
                  <li key={msg.id}>
                    <MessageCard
                      message={msg}
                      isPinned={favorites.has(msg.id)}
                      onReuse={onReuse}
                      onReplay={onReplay}
                      onToggleFav={onToggleFav}
                      onDelete={onDelete}
                      onCopy={onCopy}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer – clear all */}
          {history.length > 0 && (
            <div className="flex-shrink-0 border-t border-neutral-200 p-2 dark:border-neutral-700">
              <button
                onClick={handleClearHistory}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-neutral-700 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                <TrashIcon />
                Clear all history
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tab, hasSearch }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center py-10 text-center text-sm text-neutral-400">
        <span className="mb-2 text-3xl">🔍</span>
        <p>No messages match your search.</p>
      </div>
    );
  }
  if (tab === "pinned") {
    return (
      <div className="flex flex-col items-center py-10 text-center text-sm text-neutral-400">
        <span className="mb-2 text-3xl">⭐</span>
        <p>
          No pinned messages yet.
          <br />
          Star a message to pin it here.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center py-10 text-center text-sm text-neutral-400">
      <span className="mb-2 text-3xl">🎙️</span>
      <p>
        No history yet.
        <br />
        Speak a message to get started.
      </p>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────
const ChevronLeftIcon = () => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TrashIcon = () => (
  <svg
    viewBox="0 0 16 16"
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path
      d="M3 4h10M6 4V3h4v1M5 4l.5 8h5l.5-8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
