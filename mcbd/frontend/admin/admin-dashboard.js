/* ═══════════════════════════════════════════════════════
   Admin dashboard logic — tabs, tables, CRUD forms.
   Depends on api.js and admin-common.js being loaded first.
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const token = requireAdminAuth();
  if (!token) return;

  document.getElementById('adminDisplayName').textContent = localStorage.getItem('mcbd_admin_name') || 'Admin';
  document.getElementById('adminRoleBadge').textContent = (localStorage.getItem('mcbd_admin_role') || '').toUpperCase();

  initTabs();
  loadStats();
  loadServers();
  loadNews();
  loadMembers();
  loadRules();
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
  tbody.innerHTML = `<tr><td colspan="5">Loading…</td></tr>`;
  const posts = await adminApi('GET', '/admin/news');
  if (!posts) return;
  newsCache = posts;
  tbody.innerHTML = posts.map((p) => `
    <tr>
      <td>${escapeHtml(p.title)}</td>
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
