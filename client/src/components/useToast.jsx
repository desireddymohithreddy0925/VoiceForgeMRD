/**
 * useToast.jsx
 * Lightweight toast notification hook — no external dependency.
 * Returns { toasts, showToast } where showToast(message, type) queues an entry.
 * Type: "success" | "error" | "info"
 *
 * Usage:
 *   const { toasts, showToast } = useToast();
 *   showToast("Copied!", "success");
 *   // Render: <ToastContainer toasts={toasts} />
 */

import { useState, useCallback, useRef, useEffect } from "react";

let nextId = 0;

export function useToast(duration = 2200) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});
  useEffect(() => {
  return () => {
    Object.values(timers.current).forEach(clearTimeout);
  };
}, []);

  const showToast = useCallback(
    (message, type = "success") => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, type }]);

      timers.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, duration);
    },
    [duration]
  );

  return { toasts, showToast };
}

/**
 * ToastContainer
 * Renders all active toasts. Place once near the root of your app.
 *
 * Props:
 *   toasts – from useToast()
 */
export function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[
            "flex animate-fade-in-up items-center gap-2 rounded-full px-4 py-2 text-sm text-white shadow-lg",
            t.type === "error"
              ? "bg-red-700"
              : t.type === "info"
              ? "bg-neutral-700"
              : "bg-emerald-700",
          ].join(" ")}
        >
          {t.type === "success" && <span aria-hidden="true">✓</span>}
          {t.type === "error" && <span aria-hidden="true">⚠</span>}
          {t.message}
        </div>
      ))}
    </div>
  );
}