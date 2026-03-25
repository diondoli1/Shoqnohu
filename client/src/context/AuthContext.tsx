import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setAuthToken } from "../api/client";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<AuthUser & { email: string }>("/api/users/me");
      setUser({
        id: data.id,
        username: data.username,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
      });
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("shoqnohu:auth-expired", onExpired);
    return () => window.removeEventListener("shoqnohu:auth-expired", onExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", {
      username,
      password,
    });
    setAuthToken(data.token);
    setUser(data.user);
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>("/api/auth/register", {
      username,
      email,
      password,
    });
    setAuthToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refreshMe }),
    [user, loading, login, signup, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
