/* ═══════════════════════════════════════════════════════
   Shared API client — talks to the FastAPI backend.

   Resolution order for the API base URL:
   1. window.MCBD_API_BASE, if you set it manually before this script loads.
   2. Auto-detected Codespaces forwarded URL — if this page is being served
      from a "*-8080.app.github.dev" style URL, swap the port to 8000 to
      reach the backend's forwarded URL automatically.
   3. Fallback: http://localhost:8000/api (local, non-Codespaces dev).
   ═══════════════════════════════════════════════════════ */
function resolveApiBase() {
  if (window.MCBD_API_BASE) return window.MCBD_API_BASE;

  const host = window.location.hostname;
  // Codespaces forwarded hostnames look like: fuzzy-space-potato-abc123-8080.app.github.dev
  const codespacesMatch = host.match(/^(.*)-(\d+)\.((?:[\w-]+\.)*(?:app\.github\.dev|githubpreview\.dev))$/);
  if (codespacesMatch) {
    const [, namePrefix, , domain] = codespacesMatch;
    return `https://${namePrefix}-8000.${domain}/api`;
  }

  return 'http://localhost:8000/api';
}

const API_BASE = resolveApiBase();

async function apiGet(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `POST ${path} failed: ${res.status}`);
  return data;
}

async function apiPatch(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `PATCH ${path} failed: ${res.status}`);
  return data;
}

async function apiDelete(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `DELETE ${path} failed: ${res.status}`);
  }
}
