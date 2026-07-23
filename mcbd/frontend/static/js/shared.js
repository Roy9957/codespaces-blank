/* ═══════════════════════════════════════════════════════
   MINECRAFT BANGLADESH (MCBD) SHARED SCRIPT
   Includes Curtain Reveal intro animation, dynamic navigation,
   footer, scroll progress, toast notifications, and Discord widget.
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

function initCurtainReveal() {
  const curtain = document.getElementById('curtain');
  const panelLeft = document.getElementById('curtainPanelLeft');
  const panelRight = document.getElementById('curtainPanelRight');
  const cue = document.getElementById('curtainCue');

  if (!curtain || !panelLeft || !panelRight) return;

  let opened = false;
  const openCurtain = () => {
    if (opened) return;
    opened = true;
    panelLeft.classList.add('open-left');
    panelRight.classList.add('open-right');
    setTimeout(() => {
      curtain.classList.add('done');
    }, 850);
  };

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      openCurtain();
    }
  });

  if (cue) {
    cue.addEventListener('click', () => {
      openCurtain();
      window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    });
  }

  /* Auto open fallback after 3 seconds if user hasn't scrolled */
  setTimeout(openCurtain, 3200);
}

function initScrollProgress() {
  if (!document.getElementById('scroll-progress-track')) {
    const track = document.createElement('div');
    track.id = 'scroll-progress-track';
    track.innerHTML = '<div id="scroll-progress"></div>';
    document.body.prepend(track);
  }

  const progressBar = document.getElementById('scroll-progress');
  window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    if (progressBar) progressBar.style.width = scrolled + '%';
  });
}

function initPageLoader() {
  /* Only display page loader on subpages if curtain reveal is not present */
  if (document.getElementById('curtain')) return;

  let loader = document.getElementById('page-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.innerHTML = `
      <div class="loader-logo">MC<span>BD</span></div>
      <div class="loader-bar"><div class="loader-bar-fill"></div></div>
    `;
    document.body.appendChild(loader);
  }

  const hideLoader = () => {
    loader.classList.add('done');
  };

  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 300);
  } else {
    window.addEventListener('load', () => setTimeout(hideLoader, 300));
  }
}

function initToastSystem() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
}

window.showToast = function(msg) {
  initToastSystem();
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2400);
};

function initDiscordModal() {
  if (document.getElementById('dcModalOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'dcModalOverlay';
  overlay.className = 'dc-overlay';
  overlay.innerHTML = `
    <div class="card">
      <button class="card-close" id="dcModalClose">&times;</button>
      <div class="nameplate-strip">
        <div style="font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;">MINECRAFT BANGLADESH</div>
      </div>
      <div class="content-body">
        <div class="avatar-row">
          <div class="avatar-wrap">
            <img src="logo.png" alt="Avatar" class="avatar" id="dcModalAvatar" onerror="this.src='logo.jpeg'">
            <div class="avatar-status"></div>
          </div>
          <span class="dc-tag" id="dcModalTag">MINECRAFT BANGLADESH</span>
        </div>
        <div class="display-name" id="dcModalName">Minecraft BD</div>
        <div class="username" id="dcModalUser">@minecraftbd</div>
        <div style="margin-top:16px;padding:12px;background:#1a1b1e;border:2px solid #2a2b2e;">
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--gold);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">ROLE & BIO</div>
          <div id="dcModalRole" style="font-size:13px;color:#fff;font-weight:600;">Community Admin</div>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;">
          <a href="#" class="mc-btn mc-btn--dc" style="flex:1;padding:10px;"><i class="fab fa-discord"></i> Open Discord</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('dcModalClose');
  closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
}

window.openDiscordWidget = function(name = 'Minecraft BD', role = 'Official Community', tag = '@minecraftbd') {
  initDiscordModal();
  const overlay = document.getElementById('dcModalOverlay');
  document.getElementById('dcModalName').textContent = name;
  document.getElementById('dcModalRole').textContent = role;
  document.getElementById('dcModalUser').textContent = tag;
  overlay.classList.add('open');
};

function renderNavbar() {
  const mount = document.getElementById('navbarMount');
  if (!mount) return;
  const current = window.location.pathname.split('/').pop() || 'index.html';

  const linksHtml = NAV_LINKS.map(
    (l) => `<li><a href="${l.href}" class="${l.href === current ? 'active' : ''}">${l.label}</a></li>`
  ).join('');

  mount.innerHTML = `
    <nav class="navbar" id="navbar">
      <a href="index.html" class="nav-logo">
        <img src="logo.png" alt="MCBD Logo" onerror="this.src='logo.jpeg';">
        MC<span>BD</span>
      </a>
      <ul class="nav-links">${linksHtml}</ul>
      <button class="nav-mobile-toggle" id="navToggleBtn" aria-label="Toggle Menu">
        <i class="fas fa-bars"></i>
      </button>
    </nav>
    <div class="mobile-overlay" id="mobileOverlay"></div>
    <div class="mobile-menu" id="mobileMenu">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <span style="font-weight:900;font-size:16px;text-transform:uppercase;">MENU</span>
        <button id="mobileMenuClose" style="background:none;border:none;font-size:20px;cursor:pointer;">&times;</button>
      </div>
      ${NAV_LINKS.map(l => `<a href="${l.href}" class="mobile-nav-link ${l.href === current ? 'active' : ''}">${l.label}</a>`).join('')}
    </div>
  `;

  const toggleBtn = document.getElementById('navToggleBtn');
  const closeBtn = document.getElementById('mobileMenuClose');
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileOverlay');

  const openMenu = () => { menu.classList.add('open'); overlay.classList.add('open'); };
  const closeMenu = () => { menu.classList.remove('open'); overlay.classList.remove('open'); };

  if (toggleBtn) toggleBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);

  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) {
      if (window.scrollY > 20) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }
  });
}

function renderFooter() {
  const mount = document.getElementById('footerMount');
  if (!mount) return;
  mount.innerHTML = `
    <footer>
      <div class="footer-wrap">
        <div class="footer-top">
          <div>
            <a href="index.html" class="footer-logo">MINECRAFT <span>BANGLADESH</span></a>
            <p style="margin-top:8px;font-size:13px;color:rgba(244,241,234,0.6);max-width:400px;font-family:var(--font-body);">
              The largest Minecraft community in Bangladesh. 52,000+ builders, survivalists & redstoners — one community, infinite worlds.
            </p>
          </div>
          <div class="footer-social">
            <a href="#" class="soc-btn" aria-label="Facebook" title="Facebook"><i class="fab fa-facebook-f"></i></a>
            <a href="#" class="soc-btn" aria-label="Discord" title="Discord" onclick="event.preventDefault(); openDiscordWidget('Minecraft BD Discord', '52,000+ Members', '@minecraftbd');"><i class="fab fa-discord"></i></a>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <ul class="footer-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="stats.html">Stats</a></li>
            <li><a href="servers.html">Servers</a></li>
            <li><a href="news.html">News</a></li>
            <li><a href="about.html">Rules</a></li>
            <li><a href="join.html">Contact</a></li>
          </ul>
          <div class="status-badge" style="cursor:pointer;" onclick="openDiscordWidget('Server Network', '24/7 Online', 'mcbd.net')">
            <span class="dot-pulse"></span> NETWORK ONLINE
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} Minecraft Bangladesh. All rights reserved.</p>
          <p>Crafted for MCBD Community ❤️</p>
        </div>
      </div>
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
  initScrollProgress();
  initCurtainReveal();
  initPageLoader();
  renderNavbar();
  renderFooter();
  initDiscordModal();
});