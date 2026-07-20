/* ===================================================================
   cjoftherosary — Portfolio Logic
   Handles: Firebase/Firestore, portfolio cards, modals,
            filters, welcome overlay, scroll-reveal, Flourish embeds
   =================================================================== */

/* ===== FLOURISH CONFIG ===== */
window.Flourish = { disable_autoload: true };

/* ===== FIREBASE INIT ===== */
firebase.initializeApp({
  apiKey: "AIzaSyDK4OmS0iG9O2Q2rrRGsEU3h6GKVnsRLPE",
  authDomain: "portfolio-89e48.firebaseapp.com",
  projectId: "portfolio-89e48",
  storageBucket: "portfolio-89e48.firebasestorage.app",
  messagingSenderId: "502772014035",
  appId: "1:502772014035:web:6887cf13d00f47a3e4ed26"
});
var db = firebase.firestore();

/* ===== IMAGE FALLBACK ===== */
// Global error listener: if any <img> fails, try the local pictures/ folder
window.addEventListener('error', function (e) {
  if (e.target && e.target.tagName === 'IMG') {
    var img = e.target;
    if (img.dataset.fallbackAttempted) return;
    img.dataset.fallbackAttempted = 'true';
    var src = img.getAttribute('src') || '';
    var filename = src.split('/').pop().split('?')[0];
    if (filename) {
      img.src = 'pictures/' + filename;
    }
  }
}, true);

/* ===== TEXT PARSING HELPERS ===== */
function applyInlineFormatting(str) {
  return str
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/**
 * Manually kick off any Flourish embeds inside a container.
 * Needed because Flourish's autoload only scans the page once at load time
 * and won't catch embeds added later (from async Firestore data, or copied
 * into a modal via innerHTML).
 */
function initFlourishEmbeds(container) {
  if (!container || !window.Flourish || typeof window.Flourish.loadEmbed !== 'function') return;
  container.querySelectorAll('.flourish-embed').forEach(function (el) {
    window.Flourish.loadEmbed(el);
  });
}

function parseBody(text) {
  return text.trim().split(/\n{2,}/).map(function (block) {
    var trimmed = block.trim();

    // [embed: <raw html> | caption]
    var embedMatch = trimmed.match(/^\[embed:\s*([\s\S]+)\]\s*$/i);
    if (embedMatch) {
      var inner = embedMatch[1];
      var caption = '';
      var lastPipe = inner.lastIndexOf('|');
      if (lastPipe !== -1) {
        caption = inner.slice(lastPipe + 1).trim();
        inner = inner.slice(0, lastPipe).trim();
      }
      if (caption) {
        return '<figure class="port-inline-img">' + inner + '<figcaption>' + applyInlineFormatting(caption) + '</figcaption></figure>';
      }
      return '<figure class="port-inline-img">' + inner + '</figure>';
    }

    // [img: url | caption or link]
    var imgMatch = trimmed.match(/^\[img:\s*([\s\S]+?)\s*\]\s*\]?$/i);
    if (imgMatch) {
      var parts = imgMatch[1].split('|').map(function (s) { return s.trim(); });
      var src = parts[0];
      var extra = parts[1] || '';
      extra = extra.replace(/^\[\s*/, '').replace(/\s*\]$/, '').trim();

      var imgTag = '<img src="' + src + '" alt="">';
      var linkMatch = extra.match(/^link:\s*(\S+)/i);

      if (linkMatch) {
        return '<figure class="port-inline-img"><a href="' + linkMatch[1] + '" target="_blank">' + imgTag + '</a></figure>';
      }
      if (extra) {
        return '<figure class="port-inline-img">' + imgTag + '<figcaption>' + applyInlineFormatting(extra) + '</figcaption></figure>';
      }
      return '<figure class="port-inline-img">' + imgTag + '</figure>';
    }
    return '<p>' + applyInlineFormatting(trimmed) + '</p>';
  }).join('');
}

/* ===== PORTFOLIO CARD BUILDER ===== */
function buildCard(e) {
  var card = document.createElement('div');
  card.className = 'port-card';
  card.dataset.cat = e.cat || 'articles';
  card.dataset.title = e.title || '';
  card.dataset.byline = e.byline || '';
  card.dataset.category = e.category || e.cat || '';
  card.dataset.date = e.date || '';
  card.dataset.image = e.image || '';
  card.dataset.skills = e.skills || '';
  card.dataset.link = e.link || '#';
  card.dataset.linkText = e.linkText || 'Open';
  var thumbHtml = e.image ? '<img src="' + e.image + '" alt="' + e.title + '">' : '<span>' + (e.category || e.cat || 'Work') + '</span>';
  var articleHtml = e.body && e.body.trim() ? parseBody(e.body) : '<p>' + (e.preview || '') + '</p>';
  var bylineHtml = e.byline ? '<p class="port-byline">' + e.byline + '</p>' : '';
  card.innerHTML =
    '<div class="port-article" style="display:none">' + articleHtml + '</div>' +
    '<div class="port-thumb">' + thumbHtml + '</div>' +
    '<div class="port-body">' +
      '<p class="port-cat">' + (e.category || e.cat || '') + '</p>' +
      '<h3 class="port-title">' + (e.title || '') + '</h3>' +
      bylineHtml +
      '<p class="port-desc">' + (e.preview || '') + '</p>' +
      '<button class="port-read-more">Read More →</button>' +
    '</div>';
  card.addEventListener('click', function (ev) { if (ev.target.tagName !== 'A') openModal(card); });
  return card;
}

/* ===== FIRESTORE FETCH (lazy — called on scroll) ===== */
var firestoreFetched = false;

function renderDynamicEntries() {
  if (firestoreFetched) return;
  firestoreFetched = true;

  db.collection('entries').get().then(function (snap) {
    var entries = [];
    snap.forEach(function (d) { entries.push(Object.assign({ id: d.id }, d.data())); });
    entries.sort(function (a, b) {
      return (a.order != null ? a.order : 9999) - (b.order != null ? b.order : 9999) || (b.createdAt || 0) - (a.createdAt || 0);
    });
    if (!entries.length) return;
    var grid = document.querySelector('.portfolio-grid');
    entries.forEach(function (e, i) {
      var card = buildCard(e);
      card.classList.add('card-enter');
      card.style.animationDelay = (i * 0.08) + 's';
      grid.appendChild(card);
    });
  });
}

/* ===== FILTER TABS ===== */
var FILTER_FADE_MS = 250;

document.querySelectorAll('.ftab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.ftab').forEach(function (t) { t.classList.remove('active'); });
    btn.classList.add('active');
    var f = btn.dataset.filter;
    var cards = Array.from(document.querySelectorAll('.port-card[data-cat]'));
    var currentlyVisible = cards.filter(function (c) { return !c.classList.contains('hidden'); });

    // Step 1: fade OUT every card that's currently on screen
    currentlyVisible.forEach(function (c) { c.classList.add('filter-out'); });

    setTimeout(function () {
      // Step 2: swap which cards are hidden vs shown for the new filter
      cards.forEach(function (c) {
        c.classList.remove('filter-out', 'card-enter');
        c.style.animation = 'none';
        c.classList.toggle('hidden', f !== 'all' && c.dataset.cat !== f);
      });

      var matching = cards.filter(function (c) { return !c.classList.contains('hidden'); });

      // Force reflow so the browser replays riseIn animation
      void document.querySelector('.portfolio-grid').offsetWidth;

      matching.forEach(function (c, i) {
        c.style.animation = '';
        c.style.animationDelay = (i * 0.06) + 's';
        c.classList.add('card-enter');
      });
    }, FILTER_FADE_MS);
  });
});

/* ===== PORTFOLIO MODAL ===== */
var overlay = document.getElementById('modalOverlay');
var modal = document.getElementById('modal');
var closeBtn = document.getElementById('modalClose');

function openModal(card) {
  var d = card.dataset;
  document.getElementById('modalCategory').textContent = d.category || '';
  document.getElementById('modalDate').textContent = d.date || '';
  document.getElementById('modalTitle').textContent = d.title || '';
  var bylineEl = document.getElementById('modalByline');
  bylineEl.textContent = d.byline || '';
  bylineEl.style.display = d.byline ? 'block' : 'none';
  var articleEl = card.querySelector('.port-article');
  var modalDescEl = document.getElementById('modalDesc');
  modalDescEl.innerHTML = articleEl ? articleEl.innerHTML : '';
  initFlourishEmbeds(modalDescEl);
  var skillsEl = document.getElementById('modalSkills');
  skillsEl.innerHTML = '';
  (d.skills || '').split(',').forEach(function (s) {
    if (!s.trim()) return;
    var tag = document.createElement('span');
    tag.className = 'modal-skill-tag';
    tag.textContent = s.trim();
    skillsEl.appendChild(tag);
  });
  var cover = document.getElementById('modalCover');
  cover.innerHTML = d.image ? '<img src="' + d.image + '" alt="' + d.title + '">' : '<span style="font-style:italic;color:var(--text-dim)">No image yet</span>';
  var link = document.getElementById('modalLink');
  var hasLink = d.link && d.link.trim() && d.link.trim() !== '#';
  link.style.display = hasLink ? 'inline-flex' : 'none';
  if (hasLink) { link.href = d.link; link.textContent = (d.linkText || 'Open') + ' ↗'; }
  overlay.classList.add('active');
  modal.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

document.querySelectorAll('.port-card[data-cat]').forEach(function (card) {
  card.addEventListener('click', function (e) { if (e.target.tagName !== 'A') openModal(card); });
});

closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

/* ===== HIGHLIGHT MODAL ===== */
var hOverlay = document.getElementById('highlightModalOverlay');
var hModal = document.getElementById('highlightModal');
var hCloseBtn = document.getElementById('highlightModalClose');
var hSeeMore = document.getElementById('highlightModalSeeMore');

function openHighlightModal(card) {
  var d = card.dataset;
  document.getElementById('highlightModalCategory').textContent = d.category || '';
  document.getElementById('highlightModalDate').textContent = d.date || '';
  document.getElementById('highlightModalTitle').textContent = d.title || '';
  var hBylineEl = document.getElementById('highlightModalByline');
  hBylineEl.textContent = d.byline || '';
  hBylineEl.style.display = d.byline ? 'block' : 'none';
  var articleEl = card.querySelector('.highlight-article');
  var highlightModalDescEl = document.getElementById('highlightModalDesc');
  highlightModalDescEl.innerHTML = articleEl ? articleEl.innerHTML : (d.desc ? '<p>' + d.desc + '</p>' : '');
  initFlourishEmbeds(highlightModalDescEl);
  var skillsEl = document.getElementById('highlightModalSkills');
  skillsEl.innerHTML = '';
  var skillsLabel = document.getElementById('highlightModalSkillsLabel');
  var skillsList = (d.skills || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  skillsLabel.style.display = skillsList.length ? 'block' : 'none';
  skillsList.forEach(function (s) {
    var tag = document.createElement('span');
    tag.className = 'modal-skill-tag';
    tag.textContent = s;
    skillsEl.appendChild(tag);
  });
  var cover = document.getElementById('highlightModalCover');
  cover.innerHTML = d.image ? '<img src="' + d.image + '" alt="' + d.title + '">' : '<span style="font-style:italic;color:var(--text-dim)">' + (d.category || 'Highlight') + '</span>';
  hOverlay.classList.add('active');
  hModal.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeHighlightModal() {
  hOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

document.querySelectorAll('.highlight-card').forEach(function (card) {
  card.addEventListener('click', function () { openHighlightModal(card); });
});

hCloseBtn.addEventListener('click', closeHighlightModal);
hOverlay.addEventListener('click', function (e) { if (e.target === hOverlay) closeHighlightModal(); });
hSeeMore.addEventListener('click', function () {
  closeHighlightModal();
  document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
});

// Single keydown handler for all modals
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeModal();
    closeHighlightModal();
    closeContactModal();
  }
});

/* ===== CONTACT POPUP MODAL LOGIC ===== */
var contactOverlay = document.getElementById('contactModalOverlay');
var contactModalClose = document.getElementById('contactModalClose');
var getInTouchBtn = document.getElementById('getInTouchBtn');

function openContactModal() {
  if (contactOverlay) {
    contactOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeContactModal() {
  if (contactOverlay) {
    contactOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

if (getInTouchBtn) {
  getInTouchBtn.addEventListener('click', openContactModal);
}
if (contactModalClose) {
  contactModalClose.addEventListener('click', closeContactModal);
}
if (contactOverlay) {
  contactOverlay.addEventListener('click', function (e) {
    if (e.target === contactOverlay) closeContactModal();
  });
}

/* ===== WELCOME INTRO OVERLAY ===== */
(function () {
  var welcomeOverlay = document.getElementById('welcomeOverlay');
  var FADE_MS = 400;
  var GAP_MS = 80;
  var SESSION_KEY = 'cjPortfolioWelcomeShown';

  // Elements sharing the same data-fade-group fade in together;
  // groups play one after another in order.
  var revealSectionsInSequence = function () {
    var groups = {};
    document.querySelectorAll('.fade-up[data-fade-group]').forEach(function (el) {
      var key = el.dataset.fadeGroup;
      (groups[key] = groups[key] || []).push(el);
    });
    var orderedKeys = Object.keys(groups).sort(function (a, b) { return a - b; });

    var i = 0;
    var revealNext = function () {
      if (i >= orderedKeys.length) return;
      groups[orderedKeys[i]].forEach(function (el) { el.classList.add('in-view'); });
      i++;
      setTimeout(revealNext, FADE_MS + GAP_MS);
    };
    revealNext();
  };

  // Already seen the welcome intro this session — skip straight to the content.
  var alreadyShown = false;
  try {
    alreadyShown = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch (e) {
    // sessionStorage unavailable (private browsing etc.)
  }

  if (!welcomeOverlay || alreadyShown) {
    if (welcomeOverlay) welcomeOverlay.remove();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        revealSectionsInSequence();
        setTimeout(startScrollReveal, 1000);
      });
    });
    return;
  }

  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { }

  document.body.style.overflow = 'hidden';
  var finishWelcome = function () {
    document.body.style.overflow = '';
    welcomeOverlay.remove();
    revealSectionsInSequence();
    setTimeout(startScrollReveal, 1000);
  };
  welcomeOverlay.addEventListener('animationend', finishWelcome, { once: true });
  // Fallback in case the animation never fires
  setTimeout(finishWelcome, 2200);
})();

/* ===== SCROLL-TRIGGERED REVEAL (Creative/Agency Approach: Animate Multiple Times) ===== */
function startScrollReveal() {
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      } else {
        entry.target.classList.remove('in-view');
      }
    });
  }, { threshold: 0.05 });

  document.querySelectorAll('.reveal-up, .fade-up').forEach(function (el) {
    revealObserver.observe(el);
  });
}

/* ===== BACK TO TOP BUTTON LOGIC ===== */
var backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
  window.addEventListener('scroll', function () {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });
  backToTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== LAZY FIRESTORE: fetch portfolio entries when section scrolls into view ===== */
var portfolioSection = document.getElementById('portfolio');
if (portfolioSection) {
  var portfolioObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        renderDynamicEntries();
        portfolioObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' }); // Start loading 200px before it's visible
  portfolioObserver.observe(portfolioSection);
}
