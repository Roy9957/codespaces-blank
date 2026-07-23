/* ═══════════════════════════════════════════════════════
   Admin dashboard logic — tabs, tables, CRUD forms.
   Depends on api.js and admin-common.js being loaded first.
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const token = requireAdminAuth();
  if (!token) return;

  const role = (localStorage.getItem('mcbd_admin_role') || '').toLowerCase();
  document.getElementById('adminDisplayName').textContent = localStorage.getItem('mcbd_admin_name') || 'Admin';
  document.getElementById('adminRoleBadge').textContent = role.toUpperCase();

  if (role === 'super_admin' || role === 'owner') {
    const userTab = document.getElementById('tabUsers');
    if (userTab) userTab.style.display = 'inline-block';
    loadUsers();
  }

  initTabs();
  loadStats();
  loadPartnerships();
  loadServers();
  loadNews();
  loadMembers();
  loadRules();
  loadFormCategories();
  loadSubmissions();
});

/* ═══════════════ TABS ═══════════════ */
function initTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.getAttribute('data-panel')).classList.add('active');
    });
  });
}

/* ═══════════════ STATS ═══════════════ */
async function loadStats() {
  const tbody = document.getElementById('statsTableBody');
  tbody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;
  const stats = await adminApi('GET', '/stats');
  if (!stats) return;
  tbody.innerHTML = stats.map((s) => `
    <tr data-key="${escapeHtml(s.key)}">
      <td><code>${escapeHtml(s.key)}</code></td>
      <td><input value="${escapeHtml(s.label)}" data-field="label"></td>
      <td><input type="number" value="${s.value}" data-field="value" style="width:100px;"></td>
      <td><input value="${escapeHtml(s.suffix || '')}" data-field="suffix" style="width:60px;"></td>
      <td><input value="${escapeHtml(s.icon)}" data-field="icon" style="width:160px;"></td>
      <td><input type="number" value="${s.sort_order}" data-field="sort_order" style="width:70px;"></td>
      <td><button class="admin-btn small" onclick="saveStatRow(this)">Save</button></td>
    </tr>
  `).join('');
}

async function saveStatRow(btn) {
  const row = btn.closest('tr');
  const key = row.getAttribute('data-key');
  const payload = {};
  row.querySelectorAll('[data-field]').forEach((input) => {
    const field = input.getAttribute('data-field');
    payload[field] = field === 'value' || field === 'sort_order' ? parseInt(input.value, 10) : input.value;
  });
  const result = await adminApi('PATCH', `/admin/stats/${encodeURIComponent(key)}`, payload);
  if (result) toast(`Stat "${key}" updated.`);
}

/* ═══════════════ SERVERS ═══════════════ */
let serversCache = [];

async function loadServers() {
  const tbody = document.getElementById('serversTableBody');
  tbody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;
  const servers = await adminApi('GET', '/servers');
  if (!servers) return;
  serversCache = servers;
  tbody.innerHTML = servers.map((s) => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.server_type)}</td>
      <td>${escapeHtml(s.ip_address || '—')}</td>
      <td><span class="badge status-${escapeHtml(s.status)}">${escapeHtml(s.status)}</span></td>
      <td>${s.players_online} / ${s.players_max}</td>
      <td>${s.is_featured ? '<i class="fas fa-star" style="color:var(--gold);"></i>' : '—'}</td>
      <td class="row-actions">
        <button class="admin-btn small neutral" onclick="editServer(${s.id})">Edit</button>
        <button class="admin-btn small danger" onclick="deleteServer(${s.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openServerForm() {
  document.getElementById('serverFormTitle').textContent = 'Add Server';
  document.getElementById('serverId').value = '';
  document.getElementById('srvName').value = '';
  document.getElementById('srvType').value = 'survival';
  document.getElementById('srvIp').value = '';
  document.getElementById('srvPort').value = 25565;
  document.getElementById('srvEdition').value = 'both';
  document.getElementById('srvStatus').value = 'online';
  document.getElementById('srvPlayersOnline').value = 0;
  document.getElementById('srvPlayersMax').value = 100;
  document.getElementById('srvDesc').value = '';
  document.getElementById('srvSort').value = 0;
  document.getElementById('srvWhitelisted').checked = false;
  document.getElementById('srvFeatured').checked = false;
  document.getElementById('serverForm').classList.add('show');
}

function closeServerForm() {
  document.getElementById('serverForm').classList.remove('show');
}

function editServer(id) {
  const s = serversCache.find((x) => x.id === id);
  if (!s) return;
  document.getElementById('serverFormTitle').textContent = `Edit: ${s.name}`;
  document.getElementById('serverId').value = s.id;
  document.getElementById('srvName').value = s.name;
  document.getElementById('srvType').value = s.server_type;
  document.getElementById('srvIp').value = s.ip_address || '';
  document.getElementById('srvPort').value = s.port;
  document.getElementById('srvEdition').value = s.edition;
  document.getElementById('srvStatus').value = s.status;
  document.getElementById('srvPlayersOnline').value = s.players_online;
  document.getElementById('srvPlayersMax').value = s.players_max;
  document.getElementById('srvDesc').value = s.description || '';
  document.getElementById('srvSort').value = s.sort_order;
  document.getElementById('srvWhitelisted').checked = s.is_whitelisted;
  document.getElementById('srvFeatured').checked = s.is_featured;
  document.getElementById('serverForm').classList.add('show');
  document.getElementById('serverForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveServer() {
  const id = document.getElementById('serverId').value;
  const payload = {
    name: document.getElementById('srvName').value.trim(),
    server_type: document.getElementById('srvType').value,
    ip_address: document.getElementById('srvIp').value.trim() || null,
    port: parseInt(document.getElementById('srvPort').value, 10) || 25565,
    edition: document.getElementById('srvEdition').value,
    status: document.getElementById('srvStatus').value,
    players_online: parseInt(document.getElementById('srvPlayersOnline').value, 10) || 0,
    players_max: parseInt(document.getElementById('srvPlayersMax').value, 10) || 100,
    description: document.getElementById('srvDesc').value.trim() || null,
    sort_order: parseInt(document.getElementById('srvSort').value, 10) || 0,
    is_whitelisted: document.getElementById('srvWhitelisted').checked,
    is_featured: document.getElementById('srvFeatured').checked,
  };
  if (!payload.name) { toast('Server name is required.', 'error'); return; }

  const result = id
    ? await adminApi('PATCH', `/admin/servers/${id}`, payload)
    : await adminApi('POST', '/admin/servers', payload);
  if (result) {
    toast(`Server "${payload.name}" saved.`);
    closeServerForm();
    loadServers();
  }
}

async function deleteServer(id) {
  const s = serversCache.find((x) => x.id === id);
  if (!confirm(`Delete server "${s ? s.name : id}"? This cannot be undone.`)) return;
  await adminApi('DELETE', `/admin/servers/${id}`);
  toast('Server deleted.');
  loadServers();
}

/* ═══════════════ NEWS ═══════════════ */
let newsCache = [];

async function loadNews() {
  const tbody = document.getElementById('newsTableBody');
  tbody.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
  const posts = await adminApi('GET', '/admin/news');
  if (!posts) return;
  newsCache = posts;
  tbody.innerHTML = posts.map((p) => `
    <tr>
      <td style="display:flex;align-items:center;gap:10px;">
        ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" style="width:36px;height:36px;object-fit:cover;border:2px solid var(--black);" onerror="this.style.display='none';">` : `<i class="${escapeHtml(p.cover_icon || 'fa-solid fa-newspaper')}" style="font-size:18px;color:var(--grass);"></i>`}
        <strong>${escapeHtml(p.title)}</strong>
      </td>
      <td>${escapeHtml(p.category)}</td>
      <td>${p.is_pinned ? '<i class="fas fa-thumbtack" style="color:var(--gold);"></i>' : '—'}</td>
      <td>${p.is_published ? '<span class="badge status-online">Published</span>' : '<span class="badge status-offline">Draft</span>'}</td>
      <td>${timeAgo(p.published_at)}</td>
      <td class="row-actions">
        <button class="admin-btn small neutral" onclick="editNews(${p.id})">Edit</button>
        <button class="admin-btn small danger" onclick="deleteNews(${p.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openNewsForm() {
  document.getElementById('newsFormTitle').textContent = 'New Post';
  document.getElementById('newsId').value = '';
  document.getElementById('newsTitle').value = '';
  document.getElementById('newsCategory').value = 'announcement';
  document.getElementById('newsIcon').value = 'fa-solid fa-newspaper';
  document.getElementById('newsImageUrl').value = '';
  document.getElementById('newsExcerpt').value = '';
  document.getElementById('newsBody').value = '';
  document.getElementById('newsPublished').checked = true;
  document.getElementById('newsPinned').checked = false;
  document.getElementById('newsForm').classList.add('show');
}

function closeNewsForm() {
  document.getElementById('newsForm').classList.remove('show');
}

function editNews(id) {
  const p = newsCache.find((x) => x.id === id);
  if (!p) return;
  document.getElementById('newsFormTitle').textContent = `Edit: ${p.title}`;
  document.getElementById('newsId').value = p.id;
  document.getElementById('newsTitle').value = p.title;
  document.getElementById('newsCategory').value = p.category;
  document.getElementById('newsIcon').value = p.cover_icon || 'fa-solid fa-newspaper';
  document.getElementById('newsImageUrl').value = p.image_url || '';
  document.getElementById('newsExcerpt').value = p.excerpt || '';
  document.getElementById('newsBody').value = p.body;
  document.getElementById('newsPinned').checked = p.is_pinned;
  document.getElementById('newsPublished').checked = p.is_published;
  document.getElementById('newsForm').classList.add('show');
  document.getElementById('newsForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveNews() {
  const id = document.getElementById('newsId').value;
  const payload = {
    title: document.getElementById('newsTitle').value.trim(),
    category: document.getElementById('newsCategory').value,
    cover_icon: document.getElementById('newsIcon').value.trim() || 'fa-solid fa-newspaper',
    image_url: document.getElementById('newsImageUrl').value.trim() || null,
    excerpt: document.getElementById('newsExcerpt').value.trim() || null,
    body: document.getElementById('newsBody').value.trim(),
    is_published: document.getElementById('newsPublished').checked,
    is_pinned: document.getElementById('newsPinned').checked,
  };
  if (!payload.title || !payload.body) { toast('Title and body are required.', 'error'); return; }

  const result = id
    ? await adminApi('PATCH', `/admin/news/${id}`, payload)
    : await adminApi('POST', '/admin/news', payload);
  if (result) {
    toast(`Post "${payload.title}" saved.`);
    closeNewsForm();
    loadNews();
  }
}

async function deleteNews(id) {
  const p = newsCache.find((x) => x.id === id);
  if (!confirm(`Delete post "${p ? p.title : id}"? This cannot be undone.`)) return;
  await adminApi('DELETE', `/admin/news/${id}`);
  toast('Post deleted.');
  loadNews();
}

/* ═══════════════ MEMBERS ═══════════════ */
let membersCache = [];

async function loadMembers() {
  const tbody = document.getElementById('membersTableBody');
  tbody.innerHTML = `<tr><td colspan="5">Loading…</td></tr>`;
  const members = await adminApi('GET', '/members');
  if (!members) return;
  membersCache = members;
  tbody.innerHTML = members.map((m) => `
    <tr>
      <td>${escapeHtml(m.display_name)}</td>
      <td>${escapeHtml(m.role_title)}</td>
      <td>${escapeHtml(m.role_group)}</td>
      <td><i class="fas fa-check" style="color:var(--grass-dark);"></i></td>
      <td class="row-actions">
        <button class="admin-btn small neutral" onclick="editMember(${m.id})">Edit</button>
        <button class="admin-btn small danger" onclick="deleteMember(${m.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openMemberForm() {
  document.getElementById('memberFormTitle').textContent = 'Add Member';
  document.getElementById('memberId').value = '';
  document.getElementById('memName').value = '';
  document.getElementById('memRoleTitle').value = '';
  document.getElementById('memRoleGroup').value = 'staff';
  document.getElementById('memIcon').value = 'fa-solid fa-user';
  document.getElementById('memDiscord').value = '';
  document.getElementById('memSort').value = 0;
  document.getElementById('memBio').value = '';
  document.getElementById('memActive').checked = true;
  document.getElementById('memberForm').classList.add('show');
}

function closeMemberForm() {
  document.getElementById('memberForm').classList.remove('show');
}

function editMember(id) {
  const m = membersCache.find((x) => x.id === id);
  if (!m) return;
  document.getElementById('memberFormTitle').textContent = `Edit: ${m.display_name}`;
  document.getElementById('memberId').value = m.id;
  document.getElementById('memName').value = m.display_name;
  document.getElementById('memRoleTitle').value = m.role_title;
  document.getElementById('memRoleGroup').value = m.role_group;
  document.getElementById('memIcon').value = m.icon || 'fa-solid fa-user';
  document.getElementById('memDiscord').value = m.discord_tag || '';
  document.getElementById('memSort').value = m.sort_order;
  document.getElementById('memBio').value = m.bio || '';
  document.getElementById('memActive').checked = true;
  document.getElementById('memberForm').classList.add('show');
  document.getElementById('memberForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveMember() {
  const id = document.getElementById('memberId').value;
  const payload = {
    display_name: document.getElementById('memName').value.trim(),
    role_title: document.getElementById('memRoleTitle').value.trim(),
    role_group: document.getElementById('memRoleGroup').value,
    icon: document.getElementById('memIcon').value.trim() || 'fa-solid fa-user',
    discord_tag: document.getElementById('memDiscord').value.trim() || null,
    sort_order: parseInt(document.getElementById('memSort').value, 10) || 0,
    bio: document.getElementById('memBio').value.trim() || null,
    is_active: document.getElementById('memActive').checked,
  };
  if (!payload.display_name || !payload.role_title) { toast('Name and role title are required.', 'error'); return; }

  const result = id
    ? await adminApi('PATCH', `/admin/members/${id}`, payload)
    : await adminApi('POST', '/admin/members', payload);
  if (result) {
    toast(`Member "${payload.display_name}" saved.`);
    closeMemberForm();
    loadMembers();
  }
}

async function deleteMember(id) {
  const m = membersCache.find((x) => x.id === id);
  if (!confirm(`Remove member "${m ? m.display_name : id}"? This cannot be undone.`)) return;
  await adminApi('DELETE', `/admin/members/${id}`);
  toast('Member removed.');
  loadMembers();
}

/* ═══════════════ RULES ═══════════════ */
let rulesCache = [];

async function loadRules() {
  const tbody = document.getElementById('rulesTableBody');
  tbody.innerHTML = `<tr><td colspan="4">Loading…</td></tr>`;
  const rules = await adminApi('GET', '/rules');
  if (!rules) return;
  rulesCache = rules;
  tbody.innerHTML = rules.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.title)}</td>
      <td class="msg-preview truncated">${escapeHtml(r.body)}</td>
      <td class="row-actions">
        <button class="admin-btn small neutral" onclick="editRule(${r.id})">Edit</button>
        <button class="admin-btn small danger" onclick="deleteRule(${r.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openRuleForm() {
  document.getElementById('ruleFormTitle').textContent = 'Add Rule';
  document.getElementById('ruleId').value = '';
  document.getElementById('ruleTitle').value = '';
  document.getElementById('ruleBody').value = '';
  document.getElementById('ruleSort').value = 0;
  document.getElementById('ruleForm').classList.add('show');
}

function closeRuleForm() {
  document.getElementById('ruleForm').classList.remove('show');
}

function editRule(id) {
  const r = rulesCache.find((x) => x.id === id);
  if (!r) return;
  document.getElementById('ruleFormTitle').textContent = `Edit: ${r.title}`;
  document.getElementById('ruleId').value = r.id;
  document.getElementById('ruleTitle').value = r.title;
  document.getElementById('ruleBody').value = r.body;
  document.getElementById('ruleSort').value = r.sort_order;
  document.getElementById('ruleForm').classList.add('show');
  document.getElementById('ruleForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveRule() {
  const id = document.getElementById('ruleId').value;
  const payload = {
    title: document.getElementById('ruleTitle').value.trim(),
    body: document.getElementById('ruleBody').value.trim(),
    sort_order: parseInt(document.getElementById('ruleSort').value, 10) || 0,
  };
  if (!payload.title || !payload.body) { toast('Title and body are required.', 'error'); return; }

  const result = id
    ? await adminApi('PATCH', `/admin/rules/${id}`, payload)
    : await adminApi('POST', '/admin/rules', payload);
  if (result) {
    toast(`Rule "${payload.title}" saved.`);
    closeRuleForm();
    loadRules();
  }
}

async function deleteRule(id) {
  const r = rulesCache.find((x) => x.id === id);
  if (!confirm(`Delete rule "${r ? r.title : id}"? This cannot be undone.`)) return;
  await adminApi('DELETE', `/admin/rules/${id}`);
  toast('Rule deleted.');
  loadRules();
}

/* ═══════════════ SUBMISSIONS (categorized by admin) ═══════════════ */
let submissionsCache = [];

async function loadSubmissions() {
  const tbody = document.getElementById('submissionsTableBody');
  tbody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;
  const status = document.getElementById('subFilterStatus').value;
  const category = document.getElementById('subFilterCategory').value;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category_key', category);
  const query = params.toString() ? `?${params.toString()}` : '';

  const subs = await adminApi('GET', `/admin/submissions${query}`);
  if (!subs) return;
  submissionsCache = subs;

  if (!subs.length) {
    tbody.innerHTML = `<tr><td colspan="7">No submissions match this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = subs.map((s) => `
    <tr>
      <td>${escapeHtml(s.category_label || '—')}</td>
      <td>${escapeHtml(s.full_name)}</td>
      <td>${escapeHtml(s.contact)}</td>
      <td class="msg-preview truncated" title="${escapeHtml(s.message)}">${escapeHtml(s.subject ? s.subject + ': ' : '')}${escapeHtml(s.message)}</td>
      <td>
        <select onchange="updateSubmissionStatus('${s.id}', this.value)" style="padding:0.3rem 0.5rem;border:2px solid var(--ink);font-size:0.78rem;">
          <option value="new" ${s.status === 'new' ? 'selected' : ''}>New</option>
          <option value="in_review" ${s.status === 'in_review' ? 'selected' : ''}>In Review</option>
          <option value="resolved" ${s.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          <option value="rejected" ${s.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </td>
      <td>${timeAgo(s.created_at)}</td>
      <td class="row-actions">
        <button class="admin-btn small danger" onclick="deleteSubmission('${s.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function updateSubmissionStatus(id, status) {
  const result = await adminApi('PATCH', `/admin/submissions/${id}`, { status });
  if (result) toast('Submission status updated.');
}

async function deleteSubmission(id) {
  if (!confirm('Delete this submission? This cannot be undone.')) return;
  await adminApi('DELETE', `/admin/submissions/${id}`);
  toast('Submission deleted.');
  loadSubmissions();
}

/* ═══════════════ PARTNERSHIPS ═══════════════ */
let partnershipsCache = [];

async function loadPartnerships() {
  const tbody = document.getElementById('partnershipsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5">Loading…</td></tr>`;
  const items = await adminApi('GET', '/admin/partnerships');
  if (!items) return;
  partnershipsCache = items;

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5">No partnerships listed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map((p) => `
    <tr>
      <td style="display:flex;align-items:center;gap:10px;">
        ${p.logo_url ? `<img src="${escapeHtml(p.logo_url)}" style="width:32px;height:32px;object-fit:cover;border:2px solid var(--black);" onerror="this.src='../logo.png';">` : '<i class="fas fa-handshake" style="font-size:18px;color:var(--gold);"></i>'}
        <strong>${escapeHtml(p.title)}</strong>
      </td>
      <td><span class="badge" style="background:var(--teal);color:var(--black);">${escapeHtml(p.partner_type)}</span></td>
      <td>${p.is_featured ? '<i class="fas fa-star" style="color:var(--gold);"></i> Featured' : '—'}</td>
      <td>${p.is_active ? '<span class="badge status-online">Active</span>' : '<span class="badge status-offline">Hidden</span>'}</td>
      <td class="row-actions">
        <button class="admin-btn small neutral" onclick="editPartnership(${p.id})">Edit</button>
        <button class="admin-btn small danger" onclick="deletePartnership(${p.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openPartnershipForm() {
  document.getElementById('partnershipFormTitle').textContent = 'Add Partner';
  document.getElementById('partId').value = '';
  document.getElementById('partTitle').value = '';
  document.getElementById('partType').value = 'community';
  document.getElementById('partLogo').value = '';
  document.getElementById('partWeb').value = '';
  document.getElementById('partDiscord').value = '';
  document.getElementById('partSort').value = 0;
  document.getElementById('partDesc').value = '';
  document.getElementById('partFeatured').checked = false;
  document.getElementById('partActive').checked = true;
  document.getElementById('partnershipForm').classList.add('show');
}

function closePartnershipForm() {
  document.getElementById('partnershipForm').classList.remove('show');
}

function editPartnership(id) {
  const p = partnershipsCache.find((x) => x.id === id);
  if (!p) return;
  document.getElementById('partnershipFormTitle').textContent = `Edit: ${p.title}`;
  document.getElementById('partId').value = p.id;
  document.getElementById('partTitle').value = p.title;
  document.getElementById('partType').value = p.partner_type || 'community';
  document.getElementById('partLogo').value = p.logo_url || '';
  document.getElementById('partWeb').value = p.website_url || '';
  document.getElementById('partDiscord').value = p.discord_url || '';
  document.getElementById('partSort').value = p.sort_order || 0;
  document.getElementById('partDesc').value = p.description || '';
  document.getElementById('partFeatured').checked = p.is_featured;
  document.getElementById('partActive').checked = p.is_active;
  document.getElementById('partnershipForm').classList.add('show');
  document.getElementById('partnershipForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function savePartnership() {
  const id = document.getElementById('partId').value;
  const payload = {
    title: document.getElementById('partTitle').value.trim(),
    partner_type: document.getElementById('partType').value,
    logo_url: document.getElementById('partLogo').value.trim() || null,
    website_url: document.getElementById('partWeb').value.trim() || null,
    discord_url: document.getElementById('partDiscord').value.trim() || null,
    sort_order: parseInt(document.getElementById('partSort').value, 10) || 0,
    description: document.getElementById('partDesc').value.trim() || null,
    is_featured: document.getElementById('partFeatured').checked,
    is_active: document.getElementById('partActive').checked,
  };
  if (!payload.title) { toast('Partner name is required.', 'error'); return; }

  const result = id
    ? await adminApi('PATCH', `/admin/partnerships/${id}`, payload)
    : await adminApi('POST', '/admin/partnerships', payload);
  if (result) {
    toast(`Partner "${payload.title}" saved.`);
    closePartnershipForm();
    loadPartnerships();
  }
}

async function deletePartnership(id) {
  const p = partnershipsCache.find((x) => x.id === id);
  if (!confirm(`Delete partner "${p ? p.title : id}"? This cannot be undone.`)) return;
  await adminApi('DELETE', `/admin/partnerships/${id}`);
  toast('Partnership deleted.');
  loadPartnerships();
}

/* ═══════════════ FORM CATEGORIES ═══════════════ */
let categoriesCache = [];

async function loadFormCategories() {
  const tbody = document.getElementById('formCategoriesTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4">Loading…</td></tr>`;
  const items = await adminApi('GET', '/admin/form-categories');
  if (!items) return;
  categoriesCache = items;

  tbody.innerHTML = items.map((c) => `
    <tr>
      <td><code>${escapeHtml(c.key)}</code></td>
      <td><strong>${escapeHtml(c.label)}</strong></td>
      <td>${escapeHtml(c.description || '—')}</td>
      <td class="row-actions">
        <button class="admin-btn small neutral" onclick="editCat(${c.id})">Edit</button>
        <button class="admin-btn small danger" onclick="deleteCat(${c.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openCatForm() {
  document.getElementById('catFormTitle').textContent = 'Add Form Category';
  document.getElementById('catId').value = '';
  document.getElementById('catKey').value = '';
  document.getElementById('catLabel').value = '';
  document.getElementById('catSort').value = 0;
  document.getElementById('catDesc').value = '';
  document.getElementById('catActive').checked = true;
  document.getElementById('catForm').classList.add('show');
}

function closeCatForm() {
  document.getElementById('catForm').classList.remove('show');
}

function editCat(id) {
  const c = categoriesCache.find((x) => x.id === id);
  if (!c) return;
  document.getElementById('catFormTitle').textContent = `Edit: ${c.label}`;
  document.getElementById('catId').value = c.id;
  document.getElementById('catKey').value = c.key;
  document.getElementById('catLabel').value = c.label;
  document.getElementById('catSort').value = c.sort_order || 0;
  document.getElementById('catDesc').value = c.description || '';
  document.getElementById('catActive').checked = c.is_active ?? true;
  document.getElementById('catForm').classList.add('show');
}

async function saveCat() {
  const id = document.getElementById('catId').value;
  const payload = {
    key: document.getElementById('catKey').value.trim().toLowerCase().replace(/\s+/g, '_'),
    label: document.getElementById('catLabel').value.trim(),
    sort_order: parseInt(document.getElementById('catSort').value, 10) || 0,
    description: document.getElementById('catDesc').value.trim() || null,
    is_active: document.getElementById('catActive').checked,
  };
  if (!payload.key || !payload.label) { toast('Key and label are required.', 'error'); return; }

  const result = id
    ? await adminApi('PATCH', `/admin/form-categories/${id}`, payload)
    : await adminApi('POST', '/admin/form-categories', payload);
  if (result) {
    toast(`Form Category "${payload.label}" saved.`);
    closeCatForm();
    loadFormCategories();
  }
}

async function deleteCat(id) {
  const c = categoriesCache.find((x) => x.id === id);
  if (!confirm(`Delete category "${c ? c.label : id}"? This cannot be undone.`)) return;
  await adminApi('DELETE', `/admin/form-categories/${id}`);
  toast('Category deleted.');
  loadFormCategories();
}

/* ═══════════════ SUPER ADMIN USER MANAGEMENT ═══════════════ */
let usersCache = [];

async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;
  const users = await adminApi('GET', '/admin/users');
  if (!users) return;
  usersCache = users;

  tbody.innerHTML = users.map((u) => `
    <tr>
      <td><code>#${u.id}</code></td>
      <td><strong>@${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml(u.display_name)}</td>
      <td><span class="badge" style="background:${u.role === 'super_admin' || u.role === 'owner' ? 'var(--gold)' : 'var(--cream)'};color:var(--black);">${escapeHtml(u.role).toUpperCase()}</span></td>
      <td>${u.is_active ? '<span class="badge status-online">Active</span>' : '<span class="badge status-offline">Suspended</span>'}</td>
      <td>${timeAgo(u.last_login_at)}</td>
      <td class="row-actions">
        <button class="admin-btn small neutral" onclick="editUser(${u.id})">Edit Role/User</button>
        <button class="admin-btn small ${u.is_active ? 'danger' : 'teal'}" onclick="toggleUserActive(${u.id}, ${!u.is_active})">${u.is_active ? 'Suspend' : 'Unsuspend'}</button>
        <button class="admin-btn small danger" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openUserForm() {
  document.getElementById('userFormTitle').textContent = 'Add Staff User';
  document.getElementById('userId').value = '';
  document.getElementById('usrName').value = '';
  document.getElementById('usrName').disabled = false;
  document.getElementById('usrDisplayName').value = '';
  document.getElementById('usrRole').value = 'moderator';
  document.getElementById('usrPassword').value = '';
  document.getElementById('usrActive').checked = true;
  document.getElementById('userForm').classList.add('show');
}

function closeUserForm() {
  document.getElementById('userForm').classList.remove('show');
}

function editUser(id) {
  const u = usersCache.find((x) => x.id === id);
  if (!u) return;
  document.getElementById('userFormTitle').textContent = `Edit User: @${u.username}`;
  document.getElementById('userId').value = u.id;
  document.getElementById('usrName').value = u.username;
  document.getElementById('usrName').disabled = true;
  document.getElementById('usrDisplayName').value = u.display_name;
  document.getElementById('usrRole').value = u.role || 'moderator';
  document.getElementById('usrPassword').value = '';
  document.getElementById('usrActive').checked = u.is_active;
  document.getElementById('userForm').classList.add('show');
  document.getElementById('userForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function toggleUserActive(id, newStatus) {
  const u = usersCache.find((x) => x.id === id);
  const action = newStatus ? 'activate' : 'suspend';
  if (!confirm(`Are you sure you want to ${action} account "@${u ? u.username : id}"?`)) return;
  const result = await adminApi('PATCH', `/admin/users/${id}`, { is_active: newStatus });
  if (result) {
    toast(`User "@${u ? u.username : id}" ${action}d.`);
    loadUsers();
  }
}

async function saveUser() {
  const id = document.getElementById('userId').value;
  const payload = {
    display_name: document.getElementById('usrDisplayName').value.trim(),
    role: document.getElementById('usrRole').value,
    is_active: document.getElementById('usrActive').checked,
  };

  const password = document.getElementById('usrPassword').value.trim();
  if (password) payload.password = password;

  if (!id) {
    payload.username = document.getElementById('usrName').value.trim();
    if (!payload.username || !password) {
      toast('Username and password are required for new accounts.', 'error');
      return;
    }
  }

  if (!payload.display_name) { toast('Display name is required.', 'error'); return; }

  const result = id
    ? await adminApi('PATCH', `/admin/users/${id}`, payload)
    : await adminApi('POST', '/admin/users', payload);
  if (result) {
    toast(`User account saved.`);
    closeUserForm();
    loadUsers();
  }
}

async function deleteUser(id) {
  const u = usersCache.find((x) => x.id === id);
  if (!confirm(`Delete staff account "@${u ? u.username : id}"? This cannot be undone.`)) return;
  await adminApi('DELETE', `/admin/users/${id}`);
  toast('User account deleted.');
  loadUsers();
}

