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

window.siteSettingsCache = {
  'global.discord_url': 'https://discord.gg/minecraftbd',
  'global.facebook_url': 'https://facebook.com',
  'global.community_name': 'Minecraft Bangladesh',
  'global.server_ip': 'play.mcbd.gg'
};

window.getSiteSetting = function(key, fallback = '') {
  return window.siteSettingsCache[key] !== undefined ? window.siteSettingsCache[key] : fallback;
};

window.getDiscordUrl = function() {
  return window.getSiteSetting('global.discord_url', 'https://discord.gg/minecraftbd');
};

window.getFacebookUrl = function() {
  return window.getSiteSetting('global.facebook_url', 'https://facebook.com');
};

/* ── CMS SITE SETTINGS LOADER ── */
window.loadSiteCMS = async function() {
  try {
    const settings = await apiGet('/site-settings');
    if (Array.isArray(settings)) {
      settings.forEach(s => {
        window.siteSettingsCache[s.key] = s.value;
      });
    }

    // Apply to elements with data-cms-key
    document.querySelectorAll('[data-cms-key]').forEach(el => {
      const key = el.getAttribute('data-cms-key');
      const val = window.getSiteSetting(key);
      if (val) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = val;
        } else {
          el.textContent = val;
        }
      }
    });

    // Update all discord and facebook links across navbar/footer/buttons
    document.querySelectorAll('a[href*="discord.gg"], .mc-btn--dc-link').forEach(a => {
      a.href = window.getDiscordUrl();
      a.target = '_blank';
      a.rel = 'noopener';
    });
    document.querySelectorAll('a[href*="facebook.com"], .mc-btn--fb-link').forEach(a => {
      a.href = window.getFacebookUrl();
      a.target = '_blank';
      a.rel = 'noopener';
    });
  } catch (e) {
    console.info('CMS Settings: using defaults');
  }
};

/* ── MEMBER DETAILS MODAL (Clean Popup — No Discord Mockup) ── */
function initMemberModal() {
  if (document.getElementById('memberModalOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'memberModalOverlay';
  overlay.className = 'news-modal-overlay';
  overlay.innerHTML = `
    <div class="news-modal" style="max-width:520px;">
      <div style="background:var(--grass);padding:24px;border-bottom:4px solid var(--black);position:relative;display:flex;align-items:center;gap:18px;">
        <button class="news-modal-close" id="memberModalClose">&times;</button>
        <div id="memberModalAvatarWrap" style="width:72px;height:72px;border-radius:50%;border:3px solid var(--black);box-shadow:3px 3px 0 var(--black);background:var(--white);overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <img id="memberModalAvatar" src="logo.png" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">
          <i id="memberModalIcon" class="fa-solid fa-user" style="font-size:32px;color:var(--black);display:none;"></i>
        </div>
        <div>
          <h3 id="memberModalName" style="font-size:22px;font-weight:900;color:var(--white);text-transform:uppercase;margin:0 0 4px;">Member Name</h3>
          <span id="memberModalRole" style="font-size:11px;font-weight:800;font-family:var(--font-mono);background:var(--gold);color:var(--black);border:2px solid var(--black);padding:3px 8px;display:inline-block;text-transform:uppercase;">Role Title</span>
        </div>
      </div>
      <div class="news-modal-body" style="padding:24px;">
        <div style="font-size:11px;font-weight:900;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.1em;color:var(--black);margin-bottom:8px;">BIOGRAPHY / ABOUT</div>
        <p id="memberModalBio" style="font-size:14px;line-height:1.6;color:#3a3224;font-family:var(--font-body);margin-bottom:20px;">No bio provided.</p>
        <div id="memberModalTagBox" style="background:var(--cream);border:2px solid var(--black);padding:12px;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;font-weight:800;font-family:var(--font-mono);"><i class="fab fa-discord" style="color:#5865F2;"></i> Discord Tag:</span>
          <span id="memberModalTag" style="font-size:12px;font-weight:900;font-family:var(--font-mono);color:var(--black);">@user</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('memberModalClose').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
}

window.openMemberDetailsModal = function(member) {
  initMemberModal();
  const overlay = document.getElementById('memberModalOverlay');
  const avatar = document.getElementById('memberModalAvatar');
  const icon = document.getElementById('memberModalIcon');
  const name = document.getElementById('memberModalName');
  const role = document.getElementById('memberModalRole');
  const bio = document.getElementById('memberModalBio');
  const tag = document.getElementById('memberModalTag');

  name.textContent = member.display_name || member.name || 'Community Member';
  role.textContent = member.role_title || member.role || 'Member';
  bio.textContent = member.bio || 'Active leader and valued contributor to the Minecraft Bangladesh community.';
  tag.textContent = member.discord_tag || member.tag || `@${(member.display_name || 'user').toLowerCase().replace(/\s+/g, '')}`;

  if (member.image_url) {
    avatar.src = member.image_url;
    avatar.style.display = 'block';
    icon.style.display = 'none';
  } else {
    avatar.style.display = 'none';
    icon.className = member.icon || 'fa-solid fa-user';
    icon.style.display = 'block';
  }

  overlay.classList.add('open');
};

/* ── Direct Discord Button Handler (No Modal Popup) ── */
window.openDiscordWidget = function(name, role, tag) {
  window.open(window.getDiscordUrl(), '_blank');
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
  initMemberModal();
  initGSAPAnimations();
  loadSiteCMS();
});