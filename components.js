/* ============================================================
   LUCKY SHOTS PADEL — shared components & behaviour
   Loaded by every page (<script defer src="components.js"></script>)
   ============================================================ */

/* ------------------------------------------------------------
   LAUNCH STAGE SWITCH  — change ONE word to update the whole site.
     "teaser"   = pre-planning. "Coming October 2026", no location.
     "approved" = planning granted. Location reveal turns on.
     "live"     = open. Booking / launched messaging turns on.
   ------------------------------------------------------------ */
const STAGE = "teaser";

/* contact + social (edit here, applies everywhere) */
const SITE = {
  email:     "hello@luckyshots.co.uk",   // <-- confirm / create this inbox
  instagram: "https://instagram.com/luckyshotspadel",
  igHandle:  "@luckyshotspadel",
  opening:   "October 2026"
};

/* nav definition — order shown in header & footer */
const NAV = [
  { label: "Padel",    href: "play.html"    },
  { label: "Social",  href: "social.html"  },
  { label: "Academy", href: "academy.html" },
  { label: "Events",  href: "events.html"  },
  { label: "Members", href: "members.html" },
  { label: "About",   href: "about.html"   },
];

/* which page am I on? (for active nav state) */
function currentFile(){
  const p = location.pathname.split("/").pop();
  return (!p || p === "index.html") ? "index.html" : p;
}

/* ------------------------------------------------------------
   <site-header>
   ------------------------------------------------------------ */
class SiteHeader extends HTMLElement {
  connectedCallback(){
    const here = currentFile();
    const links = NAV.map(n => {
      const active = n.href === here ? ' aria-current="page"' : '';
      return `<a href="${n.href}"${active}>${n.label}</a>`;
    }).join("");

    this.innerHTML = `
      <header class="hdr">
        <div class="wrap hdr-row">
          <a class="hdr-logo" href="index.html" aria-label="Lucky Shots Padel — home">
            LuckyShots
          </a>

          <button class="hdr-burger" aria-label="Menu" aria-expanded="false" aria-controls="primary-nav">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
            </svg>
          </button>

          <nav class="hdr-nav" id="primary-nav" aria-label="Primary">
            ${links}
            <a class="btn btn-coral hdr-cta" href="index.html#join">Join the list</a>
          </nav>
        </div>
      </header>`;

    // mobile toggle
    const burger = this.querySelector(".hdr-burger");
    const nav = this.querySelector(".hdr-nav");
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(a =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }
}
customElements.define("site-header", SiteHeader);

/* ------------------------------------------------------------
   <site-footer>
   ------------------------------------------------------------ */
class SiteFooter extends HTMLElement {
  connectedCallback(){
    const navLinks = NAV.map(n => `<a href="${n.href}">${n.label}</a>`).join("");
    const year = new Date().getFullYear();
    this.innerHTML = `
      <footer class="ftr">
        <div class="wrap ftr-top">
          <div class="ftr-logo">
            <img src="assets/logo-cream.png" alt="Lucky Shots Padel" />
            <p>North Wales' new home for padel — four indoor courts, a proper bar, and a place worth staying. Opening ${SITE.opening}.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <nav class="ftr-links" aria-label="Footer">${navLinks}</nav>
          </div>
          <div>
            <h4>Stay in touch</h4>
            <nav class="ftr-links">
              <a href="index.html#join">Join the early-access list</a>
              <a href="${SITE.instagram}" target="_blank" rel="noopener">Instagram ${SITE.igHandle}</a>
              <a href="mailto:${SITE.email}">${SITE.email}</a>
            </nav>
          </div>
        </div>
        <div class="wrap ftr-bottom">
          <span>&copy; ${year} Lucky Shots Padel · North Wales</span>
          <a class="ig" href="${SITE.instagram}" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5"/>
              <circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>${SITE.igHandle}
          </a>
        </div>
      </footer>`;
  }
}
customElements.define("site-footer", SiteFooter);

/* ------------------------------------------------------------
   Apply stage + scroll reveal once DOM is ready
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  document.body.dataset.stage = STAGE;

  // reveal-on-scroll
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) ||
       matchMedia("(prefers-reduced-motion: reduce)").matches){
    els.forEach(e => e.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold:.14, rootMargin:"0px 0px -8% 0px" });
  els.forEach(e => io.observe(e));
});
