"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_KEY = "decision_sim_session";
const LAST_ACTIVE_KEY = "decision_sim_last_active";

function generateSessionId(): string {
  return crypto.randomUUID();
}

interface SessionContextValue {
  sessionId: string;
  resetSession: () => void;
  recordActivity: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export { SessionContext };

export function getOrCreateSession(): string {
  if (typeof window === "undefined") return generateSessionId();

  const stored = localStorage.getItem(SESSION_KEY);
  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
  const now = Date.now();

  if (stored && lastActive) {
    const elapsed = now - parseInt(lastActive, 10);
    if (elapsed < INACTIVITY_TIMEOUT_MS) {
      localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
      return stored;
    }
  }

  // New session
  const newId = generateSessionId();
  localStorage.setItem(SESSION_KEY, newId);
  localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
  return newId;
}

export function createSessionProvider() {
  return function SessionProvider({ children }: { children: ReactNode }) {
    const [sessionId, setSessionId] = useState<string>(() =>
      getOrCreateSession()
    );
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetSession = useCallback(() => {
      const newId = generateSessionId();
      localStorage.setItem(SESSION_KEY, newId);
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      setSessionId(newId);
    }, []);

    const recordActivity = useCallback(() => {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        resetSession();
      }, INACTIVITY_TIMEOUT_MS);
    }, [resetSession]);

    useEffect(() => {
      recordActivity();
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, [recordActivity]);

    return (
      <SessionContext.Provider
        value={{ sessionId, resetSession, recordActivity }}
      >
        {children}
      </SessionContext.Provider>
    );
  };
}

// Export the component
export const SessionProvider = createSessionProvider();
