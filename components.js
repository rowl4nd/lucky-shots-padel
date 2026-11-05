/* ============================================================
   LUCKY SHOTS PADEL: shared components and behaviour
   Loaded by every page (<script defer src="components.js"></script>)

   Everything you are likely to edit lives in the four blocks below:
   SITE, FOUNDING, PROGRESS and NAV.
   ============================================================ */

/* contact, social and stage (edit here, applies everywhere) */
const SITE = {
  email:     "padel@luckyshots.co.uk",
  instagram: "https://instagram.com/luckyshotspadel",
  igHandle:  "@luckyshotspadel",
  opening:   "early 2027",
  town:      "Colwyn Bay",

  // DECISION DAY SWITCH: change "teaser" to "approved" only once the planning
  // decision notice is in hand. This shows the planning-approved banner, the
  // "It's happening" headlines and the address below. Do not change it before then.
  stage:     "teaser",

  // The address is deliberately NOT in this repo until planning is approved
  // (the repo is public, so anything written here can be read by anyone).
  // On decision day, fill both in at the same time as changing the stage:
  //   address:   "the street address, Colwyn Bay"
  //   mapsQuery: "the address as you would type it into Google Maps"
  address:   "",
  mapsQuery: ""
};

/* founding membership offer: shown in every sign-up block and on the members page.
   Only the number of places is public for now. The perks and price are kept OUT
   of this repo (it is public) until the planning-approved change over; they are
   in the decision-day note in the Claude project. With perks empty, the offer
   card says the details go to the list first. */
const FOUNDING = {
  spots: 50,
  price: "",   // added on decision day
  perks: []    // added on decision day
};

/* build progress shown on the home and about pages.
   status: "done", "now" or "next". Keep notes free of location detail. */
const PROGRESS = [
  { title: "The venue",  status: "done", note: "Found, measured and agreed." },
  { title: "Planning",   status: "now",  note: "With the council now." },
  { title: "The courts", status: "next", note: "Ordered the moment planning lands." },
  { title: "The build",  status: "next", note: "Courts, bar and clubhouse fit-out." },
  { title: "Opening",    status: "next", note: "Early 2027. List first." }
];

/* nav definition: order shown in header and footer */
const NAV = [
  { label: "Padel",   href: "play.html"    },
  { label: "Social",  href: "social.html"  },
  { label: "Academy", href: "academy.html" },
  { label: "Events",  href: "events.html"  },
  { label: "Members", href: "members.html" },
  { label: "About",   href: "about.html"   },
];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

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
        <p><strong>Planning approved.</strong> Lucky Shots is coming to ${esc(SITE.town)}. <a href="index.html#join">Join the founding members list &rarr;</a></p>
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
            <a class="hdr-cta" href="#join">Join the list</a>
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
   <site-join>  founding offer + sign-up, used on every page
   Optional attributes: heading, script, text
   ------------------------------------------------------------ */
const INTERESTS = [
  { value: "playing",    label: "Playing" },
  { value: "coaching",   label: "Coaching" },
  { value: "juniors",    label: "Juniors" },
  { value: "events",     label: "Events and team days" },
  { value: "membership", label: "Membership" }
];

function offerHTML(withLink){
  const perks = FOUNDING.perks.map((p, i) =>
    `<li><span class="count">0${i + 1}</span><span>${esc(p)}</span></li>`).join("");
  const price = FOUNDING.price ? `<p class="offer-price">${esc(FOUNDING.price)} for founding members.</p>` : "";
  const link = withLink && currentFile() !== "members.html"
    ? `<a class="offer-more" href="members.html">How founding membership works</a>` : "";
  return `
    <div class="offer">
      <span class="eyebrow">Founding membership</span>
      <span class="rule"></span>
      <p class="offer-title"><span class="script">Only</span>${FOUNDING.spots}.</p>
      ${price}
      ${FOUNDING.perks.length ? `<ul class="offer-perks">${perks}</ul>` : `<p class="offer-teaser">The founding offer goes to the list first. Join to hear it before anyone else.</p>`}
      ${link}
    </div>`;
}

class SiteJoin extends HTMLElement {
  connectedCallback(){
    const script  = this.getAttribute("script")  || "Be first";
    const heading = this.getAttribute("heading") || "through the doors.";
    const text    = this.getAttribute("text")    || `Founding membership opens to the list before anyone else. Join for first access, build updates and opening news. No spam, just the milestones that matter.`;
    const uid = "join-" + Math.random().toString(36).slice(2, 7);
    const pills = INTERESTS.map(i =>
      `<label class="pill"><input type="checkbox" name="interests" value="${i.value}" /><span>${i.label}</span></label>`).join("");

    this.innerHTML = `
      <section class="band band-mist" id="join">
        <div class="wrap join reveal">
          ${offerHTML(true)}
          <div>
            <span class="eyebrow">The founding members list</span>
            <span class="rule"></span>
            <h2 class="headline"><span class="script">${script}</span>${heading}</h2>
            <p class="lead">${text}</p>
            <form class="mc-form" novalidate>
              <div class="mc-fields">
                <div class="mc-row">
                  <label for="${uid}-name" class="sr-only">First name (optional)</label>
                  <input type="text" name="firstName" id="${uid}-name" placeholder="First name" autocomplete="given-name" maxlength="60" />
                  <label for="${uid}-email" class="sr-only">Email address</label>
                  <input type="email" name="email" id="${uid}-email" placeholder="you@email.com" autocomplete="email" required />
                </div>
                <fieldset class="mc-interests">
                  <legend>I'm interested in (optional)</legend>
                  <div class="pills">${pills}</div>
                </fieldset>
                <div class="mc-hp" aria-hidden="true">
                  <label for="${uid}-website">Website</label>
                  <input type="text" name="website" id="${uid}-website" tabindex="-1" autocomplete="off" />
                </div>
                <div class="mc-submit"><button type="submit" class="btn btn-ink">Join the list</button></div>
              </div>
              <p class="mc-note">We'll only email about Lucky Shots. Unsubscribe any time.</p>
              <p class="mc-success-msg" role="status">You're on the list. Check your inbox 🎾</p>
            </form>
          </div>
        </div>
      </section>`;

    const form = this.querySelector("form");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput.value.trim();
      const firstName = form.querySelector('input[name="firstName"]').value.trim();
      const interests = [...form.querySelectorAll('input[name="interests"]:checked')].map(i => i.value);
      if (form.querySelector('input[name="website"]').value) return; // honeypot
      if (!email || !email.includes("@")) { emailInput.focus(); return; }
      button.disabled = true; button.textContent = "Joining…";
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, interests })
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
   <site-progress>  the build timeline (edit PROGRESS above)
   ------------------------------------------------------------ */
class SiteProgress extends HTMLElement {
  connectedCallback(){
    const label = { done: "Done", now: "In progress", next: "Next" };
    const steps = PROGRESS.map(s => `
      <li class="${s.status}">
        <span class="dot" aria-hidden="true"></span>
        <span class="step-status">${label[s.status] || ""}</span>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.note)}</p>
      </li>`).join("");
    this.innerHTML = `<ol class="progress" aria-label="Build progress">${steps}</ol>`;
  }
}
customElements.define("site-progress", SiteProgress);

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
            <p>Padel, how it's supposed to be. Four indoor courts, a proper social space and one club for all, opening ${SITE.opening}.</p>
            <span class="ftr-croeso" lang="cy">Croeso.</span>
          </div>
          <div>
            <h4>Explore</h4>
            <nav class="ftr-links" aria-label="Footer">${navLinks}</nav>
          </div>
          <div>
            <h4>Stay in touch</h4>
            <nav class="ftr-links" aria-label="Contact">
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
   Hero videos: the poster frame shows straight away; the video
   only loads after the page has, and not at all for people on
   slow or data-saving connections or with reduced motion on.
   ------------------------------------------------------------ */
function loadHeroVideos(){
  const conn = navigator.connection || {};
  const slow = conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || "");
  if (slow || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll("video.hero-video[data-src]").forEach(v => {
    const s = document.createElement("source");
    s.src = v.dataset.src; s.type = "video/mp4";
    v.appendChild(s); v.load(); v.play().catch(() => {});
  });
}

/* ------------------------------------------------------------
   Events page: build an enquiry email from the planner
   ------------------------------------------------------------ */
function initPlanner(){
  const form = document.querySelector(".planner-form");
  if (!form) return;
  const summary = document.querySelector(".planner-summary");
  const read = () => {
    const pick = n => [...form.querySelectorAll(`input[name="${n}"]:checked`)].map(i => i.value);
    return {
      type: pick("type")[0] || "",
      courts: pick("courts")[0] || "",
      format: pick("format")[0] || "",
      extras: pick("extras"),
      size: form.querySelector('input[name="size"]').value.trim(),
      when: form.querySelector('input[name="when"]').value.trim()
    };
  };
  const render = () => {
    const d = read();
    const bits = [];
    const low = t => t.charAt(0).toLowerCase() + t.slice(1);   // "Team day" -> "team day", keeps "Americano"
    if (d.type) bits.push(`A <b>${esc(low(d.type))}</b>`);
    if (d.size) bits.push(`for <b>${esc(d.size)}</b> people`);
    if (d.courts) bits.push(`on <b>${esc(low(d.courts))}</b>`);
    if (d.format) bits.push(d.format === "Not sure yet" ? `format <b>to be decided</b>` : `playing <b>${esc(low(d.format))}</b>`);
    if (d.extras.length) bits.push(`with <b>${esc(d.extras.map(low).join(" and "))}</b>`);
    if (d.when) bits.push(`around <b>${esc(d.when)}</b>`);
    summary.innerHTML = bits.length ? bits.join(" ") + "." : "Pick a few options and your enquiry builds itself here.";
  };
  form.addEventListener("input", render);
  form.addEventListener("submit", e => {
    e.preventDefault();
    const d = read();
    const lines = [
      "Hi Lucky Shots,", "",
      "We'd like to plan an event with you.", "",
      `Type: ${d.type || "not sure yet"}`,
      `Group size: ${d.size || "not sure yet"}`,
      `Courts: ${d.courts || "not sure yet"}`,
      `Format: ${d.format || "not sure yet"}`,
      `Extras: ${d.extras.length ? d.extras.join(", ") : "none yet"}`,
      `Date or timing: ${d.when || "flexible"}`, "",
      "Thanks"
    ];
    const subject = `Event enquiry${d.type ? ": " + d.type : ""}`;
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  });
  render();
}

/* ------------------------------------------------------------
   Sticky "Join the list" button on phones
   ------------------------------------------------------------ */
function initStickyCta(){
  const join = document.getElementById("join");
  if (!join) return;
  const bar = document.createElement("div");
  bar.className = "sticky-cta";
  bar.innerHTML = `<a class="btn btn-lime" href="#join">Join the founding members list</a>`;
  document.body.appendChild(bar);
  let joinVisible = false;
  const update = () => bar.classList.toggle("show", window.scrollY > window.innerHeight * .6 && !joinVisible);
  if ("IntersectionObserver" in window){
    new IntersectionObserver(es => { joinVisible = es[0].isIntersecting; update(); }, { threshold: .05 }).observe(join);
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* ------------------------------------------------------------
   Stage, address, email links and scroll reveal once the DOM is ready
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  // stage (teaser | approved | live) drives .stage-* blocks and the banner
  document.body.dataset.stage = SITE.stage;
  const banner = document.querySelector(".stage-banner");
  const setBannerH = () => { if (banner) document.body.style.setProperty("--banner-h", banner.offsetHeight + "px"); };
  setBannerH(); window.addEventListener("resize", setBannerH);

  // address and directions only exist once SITE.address is filled in
  if (SITE.stage !== "teaser" && SITE.address){
    document.querySelectorAll("[data-address]").forEach(el => el.textContent = SITE.address);
    document.querySelectorAll("[data-directions]").forEach(a => {
      a.href = "https://maps.google.com/?q=" + encodeURIComponent(SITE.mapsQuery || SITE.address);
      a.hidden = false;
    });
  }

  // any element with data-email becomes a mailto link to SITE.email
  document.querySelectorAll("[data-email]").forEach(a => {
    a.href = "mailto:" + SITE.email;
    if (!a.textContent.trim()) a.textContent = SITE.email;
  });

  initPlanner();
  initStickyCta();
  if (document.readyState === "complete") loadHeroVideos();
  else window.addEventListener("load", loadHeroVideos, { once: true });

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
