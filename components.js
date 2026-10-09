/* ============================================================
   LUCKY SHOTS PADEL: shared components and behaviour
   Loaded by every page (<script defer src="components.js"></script>)
   ============================================================ */

/* contact + social (edit here, applies everywhere) */
const SITE = {
  email:     "padel@luckyshots.co.uk",
  instagram: "https://instagram.com/luckyshotspadel",
  igHandle:  "@luckyshotspadel",
  opening:   "in 2027",
  // DECISION DAY SWITCH: change "teaser" to "approved" only once the planning
  // decision notice is in hand. This reveals the address, directions, the
  // planning-approved banner and the "It's happening" headlines.
  // Do not change it before then.
  stage:     "teaser"
};

/* nav definition: order shown in header and footer */
const NAV = [
  { label: "Padel",   href: "play.html"    },
  { label: "Social",  href: "social.html"  },
  { label: "Academy", href: "academy.html" },
  { label: "Events",  href: "events.html"  },
  { label: "Members", href: "members.html" },
  { label: "About",   href: "about.html"   },
];

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
      <div class="stage-banner" role="region" aria-label="Announcement">
        <p><strong>Planning approved.</strong> Lucky Shots is coming to Mochdre. <a href="index.html#join">Join the founding members list &rarr;</a></p>
      </div>
      <header class="hdr">
        <div class="wrap hdr-row">
          <a class="hdr-logo" href="index.html" aria-label="Lucky Shots Padel home"></a>
          <button class="hdr-burger" aria-label="Menu" aria-expanded="false" aria-controls="primary-nav">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
            </svg>
          </button>
          <nav class="hdr-nav" id="primary-nav" aria-label="Primary">
            ${links}
            <a class="hdr-cta" href="index.html#join">Join the list</a>
          </nav>
        </div>
      </header>`;

    const burger = this.querySelector(".hdr-burger");
    const nav = this.querySelector(".hdr-nav");
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false");
    }));

    // header floats over video heroes, then turns solid once scrolled
    const hdr = this.querySelector(".hdr");
    const update = () => hdr.classList.toggle("scrolled", window.scrollY > 40 || nav.classList.contains("open"));
    update();
    window.addEventListener("scroll", update, { passive: true });
    burger.addEventListener("click", update);
  }
}
customElements.define("site-header", SiteHeader);

/* ------------------------------------------------------------
   <site-join>  the founding members sign-up, used on every page
   Optional attributes: heading, script, text
   ------------------------------------------------------------ */
class SiteJoin extends HTMLElement {
  connectedCallback(){
    const script  = this.getAttribute("script")  || "Be first";
    const heading = this.getAttribute("heading") || "through the doors.";
    const text    = this.getAttribute("text")    || "Join the founding members list for build updates, opening news and founding member offers. No spam, just the milestones that matter.";
    const uid = "join-" + Math.random().toString(36).slice(2, 7);

    this.innerHTML = `
      <section class="band band-yellow" id="join">
        <div class="wrap join reveal">
          <div class="join-open">
            <span class="eyebrow">Opening</span>
            <span class="rule"></span>
            <span class="script script-xl">early</span>
            <span class="display">2027</span>
          </div>
          <div>
            <span class="eyebrow">Founding members</span>
            <span class="rule"></span>
            <h2 class="headline"><span class="script script-lg">${script}</span>${heading}</h2>
            <p class="lead">${text}</p>
            <form class="mc-form" novalidate>
              <div class="mc-field">
                <label for="${uid}-email" class="mc-hp">Email address</label>
                <input type="email" name="EMAIL" id="${uid}-email" placeholder="you@email.com" autocomplete="email" required />
                <button type="submit" class="btn btn-green">Join the list</button>
              </div>
              <div class="mc-hp" aria-hidden="true">
                <label for="${uid}-website">Website</label>
                <input type="text" name="website" id="${uid}-website" tabindex="-1" autocomplete="off" />
              </div>
              <p class="mc-note">We'll only email about Lucky Shots. Unsubscribe any time.</p>
              <p class="mc-success-msg" role="status">You're on the list. We'll be in touch 🎾</p>
            </form>
          </div>
        </div>
      </section>`;

    const form = this.querySelector("form");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const email = form.querySelector('input[type="email"]').value.trim();
      if (form.querySelector('input[name="website"]').value) return; // honeypot
      if (!email || !email.includes("@")) { form.querySelector('input[type="email"]').focus(); return; }
      button.disabled = true; button.textContent = "Joining…";
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      .then(res => { if (!res.ok) throw new Error("request failed"); })
      .then(() => form.classList.add("is-success"))
      .catch(() => {
        button.disabled = false; button.textContent = "Join the list";
        form.querySelector(".mc-note").textContent = `Something went wrong. Email ${SITE.email} instead and we'll add you.`;
      });
    });
  }
}
customElements.define("site-join", SiteJoin);

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
            <span class="ftr-logo-mark" role="img" aria-label="Lucky Shots Padel"></span>
            <p>North Wales' new home for padel. Four indoor courts, a proper social space and a club built for the area. Opening ${SITE.opening}.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <nav class="ftr-links" aria-label="Footer">${navLinks}</nav>
          </div>
          <div>
            <h4>Stay in touch</h4>
            <nav class="ftr-links">
              <a href="index.html#join">Join the founding members list</a>
              <a href="${SITE.instagram}" target="_blank" rel="noopener">Instagram ${SITE.igHandle}</a>
              <a href="mailto:${SITE.email}">${SITE.email}</a>
            </nav>
          </div>
        </div>
        <div class="wrap ftr-bottom">
          <span>&copy; ${year} Lucky Shots Padel · NW Sports Ventures Ltd</span>
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
   Stage, email links and scroll reveal once the DOM is ready
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  // stage (teaser | approved | live) drives .stage-* blocks and the banner
  document.body.dataset.stage = SITE.stage;
  const banner = document.querySelector(".stage-banner");
  const setBannerH = () => { if (banner) document.body.style.setProperty("--banner-h", banner.offsetHeight + "px"); };
  setBannerH(); window.addEventListener("resize", setBannerH);

  // any element with data-email becomes a mailto link to SITE.email
  document.querySelectorAll("[data-email]").forEach(a => {
    a.href = "mailto:" + SITE.email;
    if (!a.textContent.trim()) a.textContent = SITE.email;
  });

  // reveal on scroll
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches){
    els.forEach(e => e.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
  els.forEach(e => io.observe(e));
});
