/* ═══════════════════════════════════════════════════════
   Admin dashboard shared logic: auth guard + fetch helpers
   ═══════════════════════════════════════════════════════ */

function getAdminToken() {
  return localStorage.getItem('mcbd_admin_token');
}

function requireAdminAuth() {
  const token = getAdminToken();
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  return token;
}

function adminLogout() {
  localStorage.removeItem('mcbd_admin_token');
  localStorage.removeItem('mcbd_admin_name');
  localStorage.removeItem('mcbd_admin_role');
  window.location.href = 'login.html';
}

/* wraps apiGet/Post/Patch/Delete, auto-attaches token, and redirects to login on 401 */
async function adminApi(method, path, body) {
  const token = requireAdminAuth();
  if (!token) return null;
  try {
    if (method === 'GET') return await apiGet(path, token);
    if (method === 'POST') return await apiPost(path, body, token);
    if (method === 'PATCH') return await apiPatch(path, body, token);
    if (method === 'DELETE') return await apiDelete(path, token);
  } catch (err) {
    if (String(err.message).includes('401') || String(err.message).toLowerCase().includes('not authenticated') || String(err.message).toLowerCase().includes('expired')) {
      adminLogout();
      return null;
    }
    throw err;
  }
}

function toast(message, type = 'success') {
  let el = document.getElementById('adminToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'adminToast';
    el.style.cssText = `
      position:fixed;bottom:1.5rem;right:1.5rem;z-index:999;
      font-family:var(--pixel);font-size:0.75rem;
      padding:1rem 1.4rem;border:3px solid var(--ink);
      box-shadow:5px 5px 0 var(--ink);max-width:320px;
    `;
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.background = type === 'error' ? 'var(--redstone)' : 'var(--grass)';
  el.style.color = type === 'error' ? '#fff' : 'var(--ink)';
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 3200);
}
