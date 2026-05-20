import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { api, configureApi } from '../lib/api';

export type User = { id: string; email: string };

type AuthState = {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function decodeJwtPayload(token: string): { sub: string; email: string } | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const accessTokenRef = useRef<string | null>(null);

  const applyToken = useCallback((token: string | null, userOverride?: User | null) => {
    accessTokenRef.current = token;
    if (token) {
      const next = userOverride ?? (() => {
        const payload = decodeJwtPayload(token);
        return payload ? { id: payload.sub, email: payload.email } : null;
      })();
      setUser(next);
      setStatus(next ? 'authenticated' : 'unauthenticated');
    } else {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    configureApi({
      getAccessToken: () => accessTokenRef.current,
      setAccessToken: (token) => applyToken(token),
      onAuthFailure: () => applyToken(null),
    });
  }, [applyToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.post<{ accessToken: string }>(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        if (!cancelled) applyToken(res.data.accessToken);
      } catch {
        if (!cancelled) applyToken(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ accessToken: string; user: User }>('/auth/login', {
        email,
        password,
      });
      applyToken(res.data.accessToken, res.data.user);
    },
    [applyToken],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ accessToken: string; user: User }>('/auth/register', {
        email,
        password,
      });
      applyToken(res.data.accessToken, res.data.user);
    },
    [applyToken],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      applyToken(null);
    }
  }, [applyToken]);

  const value = useMemo<AuthState>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
