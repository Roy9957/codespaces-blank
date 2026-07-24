/* ═══════════════════════════════════════════════════════
   MINECRAFT BANGLADESH (MCBD) SHARED SCRIPT
   Curtain Reveal, Dynamic Navigation, Footer,
   Scroll Progress, Toast, Discord Widget, Members Carousel,
   GSAP ScrollTrigger Animations (all inner pages).
   Tooltips: social links & data-tooltip ONLY, not global.
   ═══════════════════════════════════════════════════════ */

const NAV_LINKS = [
  { href: 'index.html', label: 'Home' },
  { href: 'stats.html', label: 'Stats' },
  { href: 'news.html', label: 'News' },
  { href: 'about.html', label: 'About & Rules' },
  { href: 'members.html', label: 'Members' },
  { href: 'join.html', label: 'Join Us' },
];

/* ── CURTAIN REVEAL (Homepage only) ── */
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
    setTimeout(() => { curtain.classList.add('done'); }, 800);
  };

  window.addEventListener('scroll', () => {
    if (window.scrollY > 15) openCurtain();
  });

  if (cue) {
    cue.addEventListener('click', () => {
      openCurtain();
      window.scrollTo({ top: 120, behavior: 'smooth' });
    });
  }

  /* Auto open after 2.8s fallback */
  setTimeout(openCurtain, 2800);
}

/* ── SCROLL PROGRESS BAR ── */
function initScrollProgress() {
  if (!document.getElementById('scroll-progress-track')) {
    const track = document.createElement('div');
    track.id = 'scroll-progress-track';
    track.innerHTML = '<div id="scroll-progress"></div>';
    document.body.prepend(track);
  }
  const bar = document.getElementById('scroll-progress');
  window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = height > 0 ? (winScroll / height) * 100 : 0;
    if (bar) bar.style.width = pct + '%';
  }, { passive: true });
}

/* ── PAGE LOADER (Inner pages — no curtain) ── */
function initPageLoader() {
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
  const hideLoader = () => loader.classList.add('done');
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 300);
  } else {
    window.addEventListener('load', () => setTimeout(hideLoader, 300));
  }
}

/* ── TOAST NOTIFICATIONS ── */
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

/* ── DISCORD LIVE PROFILE MODAL ── */
function initDiscordModal() {
  if (document.getElementById('dcModalOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'dcModalOverlay';
  overlay.className = 'dc-overlay';
  overlay.innerHTML = `
    <div class="card">
      <button class="card-close" id="dcModalClose">&times;</button>
      <div class="nameplate-strip">
        <div style="font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;">MINECRAFT BANGLADESH</div>
      </div>
      <div class="content-body">
        <div class="avatar-row">
          <div class="avatar-wrap">
            <img src="/logo.png" alt="Avatar" class="avatar" id="dcModalAvatar" onerror="this.src='/logo.jpeg'">
            <div class="avatar-status"></div>
          </div>
          <span class="dc-tag" id="dcModalTag">MINECRAFT BANGLADESH</span>
        </div>
        <div class="display-name" id="dcModalName">Minecraft BD</div>
        <div class="username" id="dcModalUser">@minecraftbd</div>
        <div style="margin-top:16px;padding:12px;background:#1a1b1e;border:2px solid #2a2b2e;">
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--gold);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">ROLE & BIO</div>
          <div id="dcModalRole" style="font-size:13px;color:#fff;font-weight:600;">Community Leader</div>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;">
          <a href="https://discord.gg/" target="_blank" class="mc-btn mc-btn--dc" style="flex:1;padding:10px;" data-tooltip="Join Discord Server"><i class="fab fa-discord"></i> Open Discord</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('dcModalClose').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
}

window.openDiscordWidget = function(name = 'Minecraft BD', role = 'Official Community', tag = '@minecraftbd') {
  initDiscordModal();
  const overlay = document.getElementById('dcModalOverlay');
  document.getElementById('dcModalName').textContent = name;
  document.getElementById('dcModalRole').textContent = role;
  document.getElementById('dcModalUser').textContent = tag;
  overlay.classList.add('open');
};

/* ── AUTO-SLIDING MEMBERS CAROUSEL ── */
window.loadHomeMembersCarousel = async function() {
  const track = document.getElementById('homeMembersTrack');
  if (!track) return;

  const GROUP_ICONS = {
    owner:   'fa-solid fa-crown',
    admin:   'fa-solid fa-user-tie',
    staff:   'fa-solid fa-user-tie',
    mod:     'fa-solid fa-user-shield',
    builder: 'fa-solid fa-hammer',
    creator: 'fa-solid fa-user-astronaut',
  };

  const ICON_COLORS = {
    owner:   'var(--gold)',
    admin:   'var(--teal)',
    staff:   'var(--teal)',
    mod:     'var(--grass)',
    builder: 'var(--grass)',
    creator: 'var(--red)',
  };

  try {
    let members = await apiGet('/members');
    if (!members || !members.length) return; /* Keep static fallback */

    const loopList = [...members, ...members];

    track.innerHTML = loopList.map(m => `
      <div class="carousel-member-card" onclick="openDiscordWidget('${escapeHtml(m.display_name)}', '${escapeHtml(m.role_title)}', '@${escapeHtml(m.display_name.toLowerCase().replace(/\s+/g, ''))}')">
        <i class="${escapeHtml(m.icon || GROUP_ICONS[m.role_group] || 'fa-solid fa-user')}" style="font-size:36px;margin-bottom:12px;display:block;color:${ICON_COLORS[m.role_group] || 'var(--grass)'};"></i>
        <h4 style="font-size:18px;font-weight:900;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(m.display_name)}</h4>
        <span class="role">${escapeHtml(m.role_title)}</span>
      </div>
    `).join('');
  } catch (err) {
    /* Leave static fallback HTML intact */
    console.info('Members carousel: using static fallback cards');
  }
};

/* ── GSAP SCROLL ANIMATIONS (All Pages) ── */
function initGSAPAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  /* Set initial hidden states ONLY when GSAP is confirmed available */
  gsap.set('.gsap-fade-up',  { opacity: 0, y: 48 });
  gsap.set('.gsap-scale-in', { opacity: 0, scale: 0.85, y: 28 });
  gsap.set('.gsap-slide-in', { opacity: 0 });

  /* Fade-up */
  gsap.utils.toArray('.gsap-fade-up').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.8, delay: i * 0.07,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none none' }
    });
  });

  /* Scale-in cards */
  gsap.utils.toArray('.gsap-scale-in').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1, scale: 1, y: 0, duration: 0.65, delay: i * 0.09,
      ease: 'back.out(1.5)',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
    });
  });

  /* Slide-in */
  gsap.utils.toArray('.gsap-slide-in').forEach((el, i) => {
    gsap.set(el, { x: i % 2 === 0 ? -36 : 36 });
    gsap.to(el, {
      opacity: 1, x: 0, duration: 0.65, delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
    });
  });

  /* Motion grid stagger */
  gsap.utils.toArray('.motion-grid').forEach(grid => {
    const children = [...grid.children].filter(
      el => !el.classList.contains('gsap-fade-up') &&
            !el.classList.contains('gsap-scale-in') &&
            !el.classList.contains('gsap-slide-in')
    );
    if (children.length) {
      gsap.set(children, { opacity: 0, y: 36 });
      gsap.to(children, {
        opacity: 1, y: 0, stagger: 0.1, duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: grid, start: 'top 85%', toggleActions: 'play none none none' }
      });
    }
  });

  /* Page header reveal */
  const pageHeader = document.querySelector('.page-header h1');
  if (pageHeader) {
    gsap.fromTo(pageHeader,
      { opacity: 0, y: 30, skewX: -4 },
      { opacity: 1, y: 0, skewX: 0, duration: 0.7, ease: 'power3.out', delay: 0.1 }
    );
  }
}


/* ── NAVBAR RENDER ── */
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
  const closeBtn  = document.getElementById('mobileMenuClose');
  const menu      = document.getElementById('mobileMenu');
  const overlay   = document.getElementById('mobileOverlay');

  const openMenu  = () => { menu.classList.add('open');    overlay.classList.add('open'); };
  const closeMenu = () => { menu.classList.remove('open'); overlay.classList.remove('open'); };

  if (toggleBtn) toggleBtn.addEventListener('click', openMenu);
  if (closeBtn)  closeBtn.addEventListener('click', closeMenu);
  if (overlay)   overlay.addEventListener('click', closeMenu);

  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) {
      if (window.scrollY > 20) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ── FOOTER RENDER ── */
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
              The largest Minecraft community in Bangladesh. 52,000+ builders, survivalists &amp; redstoners — one community, infinite worlds.
            </p>
          </div>
          <div class="footer-social">
            <a href="https://facebook.com" target="_blank" class="soc-btn" aria-label="Facebook" data-tooltip="Facebook Group"><i class="fab fa-facebook-f"></i></a>
            <a href="https://discord.gg/minecraftbd" target="_blank" rel="noopener" class="soc-btn" aria-label="Discord" data-tooltip="Discord Server"><i class="fab fa-discord"></i></a>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <ul class="footer-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="stats.html">Stats</a></li>
            <li><a href="news.html">News</a></li>
            <li><a href="about.html">Rules</a></li>
            <li><a href="members.html">Members</a></li>
            <li><a href="join.html">Contact</a></li>
          </ul>
          <div class="status-badge">
            <span class="dot-pulse"></span> COMMUNITY ACTIVE
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

/* ── UTILITY HELPERS ── */
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

/* ── INIT ALL ON DOM READY ── */
document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initCurtainReveal();
  initPageLoader();
  renderNavbar();
  renderFooter();
  initDiscordModal();
  initGSAPAnimations();
});