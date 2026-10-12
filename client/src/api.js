const TOKEN_KEY = 'portfolio_admin_token';

export const auth = {
  get token() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: stay logged in for this page only */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Is it running?', 0);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) auth.clear();
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.fields);
  }
  // Any write may change what the public pages show.
  if (method !== 'GET') portfolioRequest = null;
  return data;
}

let portfolioRequest = null;

/** Public portfolio data, fetched once and shared by the home and project pages. */
export function getPortfolio() {
  if (!portfolioRequest) {
    portfolioRequest = api('/portfolio').catch((err) => {
      portfolioRequest = null;
      throw err;
    });
  }
  return portfolioRequest;
}
