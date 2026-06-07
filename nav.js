/* ═══════════════════════════════════════════════
   LUCKY SHOTS PADEL — shared nav + footer inject
═══════════════════════════════════════════════ */

(function () {

  /* ── Inject nav and footer from shared snippet files ── */
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

  loadSnippet('nav.html', 'nav-placeholder', function () {

    /* ── Logo fallback (runs after nav is injected) ── */
    const navImg = document.getElementById('navImg');
    if (navImg) {
      navImg.addEventListener('error', () => {
        navImg.style.display = 'none';
        const t = document.getElementById('navText');
        if (t) t.style.display = 'block';
      });
    }

    /* ── Nav solid on scroll ── */
    const nav = document.getElementById('nav');
    if (nav) {
      /* Pages that start on a light background need nav solid immediately */
      if (document.body.dataset.navSolid === 'true') {
        nav.classList.add('solid');
      }
      window.addEventListener('scroll', () => {
        nav.classList.toggle('solid', window.scrollY > 40);
      }, { passive: true });
    }

    /* ── Mobile menu ── */
    const burger = document.getElementById('burger');
    const menu   = document.getElementById('mobileMenu');
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

    /* ── Active nav link (highlight current page) ── */
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });

  });

  loadSnippet('footer.html', 'footer-placeholder');

  /* ── Scroll reveal (runs immediately, doesn't need nav) ── */
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        ro.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => ro.observe(el));

  /* ── Hero logo fallback (homepage only) ── */
  const heroImg = document.getElementById('heroImg');
  if (heroImg) {
    heroImg.addEventListener('error', () => {
      heroImg.style.display = 'none';
    });
  }

})();
