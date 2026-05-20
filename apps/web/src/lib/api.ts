import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

type GetToken = () => string | null;
type SetToken = (token: string | null) => void;
type OnAuthFailure = () => void;

let getAccessToken: GetToken = () => null;
let setAccessToken: SetToken = () => undefined;
let onAuthFailure: OnAuthFailure = () => undefined;

export function configureApi(opts: {
  getAccessToken: GetToken;
  setAccessToken: SetToken;
  onAuthFailure: OnAuthFailure;
}) {
  getAccessToken = opts.getAccessToken;
  setAccessToken = opts.setAccessToken;
  onAuthFailure = opts.onAuthFailure;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post<{ accessToken: string }>(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then((res) => res.data.accessToken)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    if (!original || error.response?.status !== 401 || original._retried) {
      throw error;
    }

    const isAuthEndpoint = original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/register') ||
      original.url?.includes('/auth/refresh');
    if (isAuthEndpoint) {
      throw error;
    }

    original._retried = true;
    try {
      const newToken = await refreshAccessToken();
      setAccessToken(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api.request(original);
    } catch (refreshErr) {
      setAccessToken(null);
      onAuthFailure();
      throw refreshErr;
    }
  },
);
