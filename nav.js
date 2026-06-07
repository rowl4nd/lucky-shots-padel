/* ═══════════════════════════════════════════════
   LUCKY SHOTS PADEL — shared nav script
═══════════════════════════════════════════════ */

(function () {

  /* ── Logo fallback ── */
  ['navImg','heroImg'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('error', () => {
      el.style.display = 'none';
      if (id === 'navImg') {
        const t = document.getElementById('navText');
        if (t) t.style.display = 'block';
      }
    });
  });

  /* ── Nav solid on scroll ── */
  const nav = document.getElementById('nav');
  if (nav) {
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

})();
