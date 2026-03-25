import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export const api = axios.create({
  baseURL: baseURL || undefined,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!axios.isAxiosError(err)) return Promise.reject(err);
    const status = err.response?.status;
    const url = String(err.config?.url ?? "");
    const authRoutes = url.includes("/api/auth/login") || url.includes("/api/auth/register");
    const hadToken = Boolean(err.config?.headers?.Authorization);
    if (status === 401 && hadToken && !authRoutes) {
      setAuthToken(null);
      window.dispatchEvent(new CustomEvent("shoqnohu:auth-expired"));
    }
    return Promise.reject(err);
  }
);

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}
