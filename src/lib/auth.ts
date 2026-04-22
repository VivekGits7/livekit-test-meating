import { useCallback, useEffect, useRef, useState } from 'react';
import { getProfile, makeApiClient } from './api';
import type { AuthUser } from './api';

const TOKEN_KEY = 'medtech.token';
const USER_KEY = 'medtech.user';

export function loadStoredAuth(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? (JSON.parse(raw) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function persistAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  status: 'idle' | 'checking' | 'authed' | 'anonymous';
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

/**
 * Single source of truth for the current auth state.
 *
 * Lifecycle:
 *   - Mount with BOTH stored token + user    → status = 'authed' immediately, zero API calls
 *   - Mount with stored token but no user    → status = 'checking' → ONE call to /api/auth/profile
 *   - Mount with nothing                      → status = 'anonymous'
 *   - 401 from any protected request          → (caller) invokes logout() to clear state
 *
 * There's no server-side logout endpoint — logout is purely client-side.
 */
export function useAuth(): AuthState {
  // Lazy init — read localStorage ONCE, never on re-renders
  const [token, setToken] = useState<string | null>(() => loadStoredAuth().token);
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredAuth().user);
  const [status, setStatus] = useState<AuthState['status']>(() => {
    const s = loadStoredAuth();
    // If we already have both token AND user cached, trust them optimistically.
    // No /profile call on mount — reduces network traffic + removes the "continuous API hit" bug.
    if (s.token && s.user) return 'authed';
    if (s.token) return 'checking';
    return 'anonymous';
  });

  // Guard: ensure we verify at most once per token value.
  // Prevents any StrictMode double-invoke or re-render loop from firing /profile repeatedly.
  const verifiedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // Only fetch profile when status is explicitly 'checking' — i.e. we have a token
    // but no cached user. Authed/anonymous states do nothing.
    if (status !== 'checking' || !token) return;
    if (verifiedTokenRef.current === token) return;
    verifiedTokenRef.current = token;

    let cancelled = false;
    (async () => {
      try {
        const fresh = await getProfile(makeApiClient(token));
        if (cancelled) return;
        setUser(fresh);
        persistAuth(token, fresh);
        setStatus('authed');
      } catch {
        if (cancelled) return;
        clearAuth();
        setToken(null);
        setUser(null);
        setStatus('anonymous');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, token]);

  const setAuth = useCallback((t: string, u: AuthUser) => {
    persistAuth(t, u);
    verifiedTokenRef.current = t; // Mark this token as already verified (just logged in)
    setToken(t);
    setUser(u);
    setStatus('authed');
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    verifiedTokenRef.current = null;
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  return { token, user, status, setAuth, logout };
}
