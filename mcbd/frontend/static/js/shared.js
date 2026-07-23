/* ═══════════════════════════════════════════════════════
   Shared chrome: navbar + footer, injected into every page so
   markup/behavior only needs to live in one place.
   ═══════════════════════════════════════════════════════ */

const NAV_LINKS = [
  { href: 'index.html', label: 'Home' },
  { href: 'stats.html', label: 'Stats' },
  { href: 'servers.html', label: 'Servers' },
  { href: 'news.html', label: 'News' },
  { href: 'about.html', label: 'About & Rules' },
  { href: 'members.html', label: 'Members' },
  { href: 'join.html', label: 'Join Us' },
];

function renderNavbar() {
  const mount = document.getElementById('navbarMount');
  if (!mount) return;
  const current = window.location.pathname.split('/').pop() || 'index.html';

  const links = NAV_LINKS.map(
    (l) => `<li><a href="${l.href}" class="${l.href === current ? 'active' : ''}">${l.label}</a></li>`
  ).join('');

  mount.innerHTML = `
    <nav class="navbar" id="navbar" style="transform:translateY(0);">
      <a href="index.html" class="nav-logo" style="text-decoration:none;"><img src="logo.png" alt="" class="block" onerror="this.style.background='var(--grass)';this.src='';"> MINECRAFT BANGLADESH</a>
      <ul class="nav-links">${links}</ul>
      <button class="nav-mobile-toggle"><i class="fas fa-bars"></i></button>
    </nav>
  `;

  const toggleBtn = mount.querySelector('.nav-mobile-toggle');
  const navLinksEl = mount.querySelector('.nav-links');
  toggleBtn.addEventListener('click', () => {
    const isOpen = navLinksEl.style.display === 'flex';
    navLinksEl.style.display = isOpen ? 'none' : 'flex';
    navLinksEl.style.cssText += isOpen
      ? ''
      : `position:fixed;top:56px;left:0;right:0;background:${getComputedStyle(document.documentElement).getPropertyValue('--ink')};flex-direction:column;padding:1.2rem;border-bottom:4px solid var(--grass);gap:1rem;`;
  });
}

function renderFooter() {
  const mount = document.getElementById('footerMount');
  if (!mount) return;
  mount.innerHTML = `
    <footer class="footer">
      <div class="footer-social">
        <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
        <a href="#" aria-label="Discord"><i class="fab fa-discord"></i></a>
      </div>
      <p>&copy; ${new Date().getFullYear()} Minecraft Bangladesh · Built with ❤️ for the community</p>
    </footer>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function timeAgo(isoString) {
  const date = new Date(isoString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units = [
    ['year', 31536000], ['month', 2592000], ['day', 86400],
    ['hour', 3600], ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const val = Math.floor(seconds / secs);
    if (val >= 1) return `${val} ${name}${val > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
});