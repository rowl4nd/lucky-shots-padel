/* ═══════════════════════════════════════════════
   LUCKY SHOTS PADEL — shared nav + footer inject
═══════════════════════════════════════════════ */

(function () {

  /* ── Inject shared snippet into a placeholder div ── */
  function loadSnippet(url, placeholderId, callback) {
    fetch(url)
      .then(r => r.text())
      .then(html => {
        const el = document.getElementById(placeholderId);
        if (el) {
          el.outerHTML = html;
          if (callback) callback();
        }
      });
  }

  /* ── Pages with light hero backgrounds need a solid nav immediately
        so the logo and links don't disappear into a white/cream bg.
        data-nav="light" on <body> triggers this. ── */
  const needsSolidNav = document.body.dataset.nav === 'light';

  loadSnippet('nav.html', 'nav-placeholder', function () {

    const nav    = document.getElementById('nav');
    const burger = document.getElementById('burger');
    const menu   = document.getElementById('mobileMenu');
    const navImg = document.getElementById('navImg');

    /* Apply solid immediately if page has a light background */
    if (nav && needsSolidNav) nav.classList.add('solid');

    /* Once solid, stays solid — never toggle back to transparent.
       Prevents nav becoming unreadable over white/cream sections. */
    if (nav) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 40) nav.classList.add('solid');
      }, { passive: true });
    }

    /* Logo image fallback */
    if (navImg) {
      navImg.addEventListener('error', () => {
        navImg.style.display = 'none';
        const t = document.getElementById('navText');
        if (t) t.style.display = 'block';
      });
    }

    /* Mobile menu */
    if (burger && menu) {
      burger.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        burger.classList.toggle('open', open);
        document.body.style.overflow = open ? 'hidden' : '';
      });
      document.querySelectorAll('.mm').forEach(a => {
        a.addEventListener('click', () => {
          menu.classList.remove('open');
          burger.classList.remove('open');
          document.body.style.overflow = '';
        });
      });
    }

    /* Highlight current page in nav */
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });

  });

  loadSnippet('footer.html', 'footer-placeholder');

  /* ── Scroll reveal ── */
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        ro.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => ro.observe(el));

  /* ── Hero logo fallback (homepage) ── */
  const heroImg = document.getElementById('heroImg');
  if (heroImg) {
    heroImg.addEventListener('error', () => {
      heroImg.style.display = 'none';
    });
  }

})();
