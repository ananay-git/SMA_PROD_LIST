(function () {
  'use strict';

  var WHATSAPP = '919992011403';
  var PAGE = 60;
  var CAT = window.CATALOG || { companies: [], products: [] };
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Data prep ----------
  var compact = function (s) { return s.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  var slug = function (s) { return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };

  var companies = CAT.companies.map(function (c, i) {
    return { i: i, name: c[0], cat: c[1], key: compact(c[0]), slug: slug(c[0]), count: 0 };
  });
  var products = CAT.products.map(function (p, i) {
    companies[p[1]].count++;
    return { i: i, name: p[0], co: p[1], key: compact(p[0]), words: p[0].toUpperCase().split(/[^A-Z0-9]+/) };
  });
  var bySlug = {};
  companies.forEach(function (c) { bySlug[c.slug] = c; });
  var coOrder = companies.slice().sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });

  // ---------- Helpers ----------
  var PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#65a30d', '#b45309', '#4f46e5', '#be123c', '#047857', '#9333ea'];
  function colorFor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(h) % PALETTE.length];
  }
  function initials(name) {
    var w = name.replace(/[^A-Za-z& ]/g, ' ').split(/\s+/).filter(function (x) { return x && x !== '&' && !/^(ltd|pharma|india|labs)$/i.test(x); });
    if (!w.length) w = [name];
    return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return n.toLocaleString('en-IN'); }
  function catTag(cat) {
    var cls = cat === 'OTC' ? 'tag otc' : cat === 'Vaccines' ? 'tag vac' : 'tag';
    return '<span class="' + cls + '">' + esc(cat) + '</span>';
  }

  var FORMS = [
    [/\b(TAB|TABS|TABLETS?|DT|ODT|MD)\b|\dTAB\b|TAB\.?$/, 'TAB'],
    [/\b(CAP|CAPS|CAPSULES?|SOFTGEL|SOFT GEL)\b|\dCAP\b/, 'CAP'],
    [/\b(INJ|INJECTION|AMP|VIAL|PFS|IV|I\.V|INFUSION|PEN)\b/, 'INJ'],
    [/\b(SYP|SYRUP|SUSP|SUS|SUSPENSION|ELIXIR|LIQ|LIQUID|ORAL|EXPEC|LINCTUS|TONIC)\b/, 'SYP'],
    [/\b(DROPS?|DROP)\b/, 'DROP'],
    [/\b(SPRAY|INHALER|RESPULES?|ROTACAPS?|RESPICAPS?|NASAL|MDI|NEBULISER)\b/, 'INH'],
    [/\b(CREAM|GEL|OINT|OINTMENT|LOTION|BALM|SERUM|FACEWASH|FACE WASH|WASH|SHAMPOO|SOAP|OIL)\b/, 'CRM'],
    [/\b(SACHET|SACH|POWDER|PDR|GRANULES?|GM|KG|JAR|POUCH|REFILL)\b/, 'PDR'],
    [/\d\s?ML\b/, 'SYP']
  ];
  function formOf(name) {
    for (var i = 0; i < FORMS.length; i++) if (FORMS[i][0].test(name)) return FORMS[i][1];
    return 'Rx';
  }

  // ---------- Search ----------
  function search(q, coIdx) {
    var raw = q.toUpperCase().trim();
    var tokens = raw.split(/\s+/).map(compact).filter(Boolean);
    var full = compact(raw);
    var out = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (coIdx != null && p.co !== coIdx) continue;
      if (!tokens.length) { out.push({ p: p, s: 0 }); continue; }
      var coKey = companies[p.co].key;
      var ok = true, nameHits = 0;
      for (var t = 0; t < tokens.length; t++) {
        var inName = p.key.indexOf(tokens[t]) !== -1;
        if (inName) nameHits++;
        else if (coKey.indexOf(tokens[t]) === -1) { ok = false; break; }
      }
      if (!ok) continue;
      var s;
      if (p.key.indexOf(full) === 0) s = 0;
      else if (p.words.some(function (w) { return w.indexOf(tokens[0]) === 0; })) s = 1;
      else if (nameHits === tokens.length) s = 2;
      else s = 3;
      out.push({ p: p, s: s });
    }
    out.sort(function (a, b) { return a.s - b.s || (a.p.name < b.p.name ? -1 : a.p.name > b.p.name ? 1 : 0); });
    return out.map(function (x) { return x.p; });
  }

  function highlight(name, q) {
    var toks = q.toUpperCase().trim().split(/\s+/).filter(function (t) { return t.length > 0; })
      .map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    if (!toks.length) return esc(name);
    var re = new RegExp('(' + toks.sort(function (a, b) { return b.length - a.length; }).join('|') + ')', 'gi');
    return name.split(re).map(function (part, i) { return i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part); }).join('');
  }

  // ---------- State ----------
  var state = { q: '', co: null, cat: '' };
  var results = [], shown = 0;

  var input = $('q'), clearQ = $('clearQ'), list = $('list'), sentinel = $('sentinel');

  function readUrl() {
    var u = new URLSearchParams(location.search);
    state.q = u.get('q') || '';
    var c = bySlug[u.get('c') || ''];
    state.co = c ? c.i : null;
    input.value = state.q;
  }
  function urlFor() {
    var u = new URLSearchParams();
    if (state.q) u.set('q', state.q);
    if (state.co != null) u.set('c', companies[state.co].slug);
    var s = u.toString();
    return location.pathname + (s ? '?' + s : '');
  }
  var wasResults = false;
  function syncUrl() {
    var isResults = !!(state.q || state.co != null);
    var url = urlFor();
    if (isResults && !wasResults) history.pushState({ v: 'results' }, '', url);
    else history.replaceState(history.state, '', url);
    wasResults = isResults;
  }

  // ---------- Rendering ----------
  function renderChips() {
    var html = '<button class="chip' + (state.co == null ? ' on' : '') + '" data-co="">All companies</button>';
    coOrder.forEach(function (c) {
      html += '<button class="chip' + (state.co === c.i ? ' on' : '') + '" data-co="' + c.i + '">' + esc(c.name) + ' <small>' + c.count + '</small></button>';
    });
    $('chips').innerHTML = html;
    var on = $('chips').querySelector('.chip.on');
    if (on && state.co != null) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  function renderCompanies() {
    var html = '';
    coOrder.forEach(function (c) {
      if (state.cat && c.cat !== state.cat) return;
      html += '<button class="co" data-co="' + c.i + '">' +
        '<div class="co-top"><span class="avatar" style="background:' + colorFor(c.name) + '">' + esc(initials(c.name)) + '</span>' +
        '<span class="co-name">' + esc(c.name) + '</span></div>' +
        '<div class="co-meta"><span>' + fmt(c.count) + ' products</span>' + catTag(c.cat) + '</div></button>';
    });
    $('companyGrid').innerHTML = html;
  }

  function itemHtml(p) {
    var inCart = cart.has(p.i);
    var c = companies[p.co];
    return '<li class="item">' +
      '<span class="form-ico">' + formOf(p.name) + '</span>' +
      '<div class="item-main"><div class="item-name">' + highlight(p.name, state.q) + '</div>' +
      '<div class="item-co"><button data-co="' + c.i + '">' + esc(c.name) + '</button></div></div>' +
      '<button class="add' + (inCart ? ' on' : '') + '" data-add="' + p.i + '" aria-pressed="' + inCart + '" aria-label="' + (inCart ? 'Remove from' : 'Add to') + ' list">' +
      (inCart ? '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>') +
      '</button></li>';
  }

  function renderMore() {
    if (shown >= results.length) return;
    var end = Math.min(shown + PAGE, results.length), html = '';
    for (var i = shown; i < end; i++) html += itemHtml(results[i]);
    list.insertAdjacentHTML('beforeend', html);
    shown = end;
  }

  function render() {
    var isResults = !!(state.q || state.co != null);
    $('home').hidden = isResults;
    $('results').hidden = !isResults;
    clearQ.hidden = !state.q;
    document.querySelectorAll('.bottom-nav [data-nav]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.nav === (isResults ? 'search' : 'home'));
    });
    renderChips();
    if (!isResults) return;

    results = search(state.q, state.co);
    shown = 0;
    list.innerHTML = '';
    renderMore();

    var title = state.co != null ? companies[state.co].name : 'Search results';
    if (state.q && state.co != null) title = '“' + state.q + '” in ' + companies[state.co].name;
    else if (state.q) title = '“' + state.q + '”';
    $('resultsTitle').textContent = title;
    $('resultsCount').textContent = fmt(results.length) + (results.length === 1 ? ' product' : ' products') +
      (state.co == null && state.q ? (function (n) { return ' across ' + n + (n === 1 ? ' company' : ' companies'); })(new Set(results.map(function (p) { return p.co; })).size) : '');
    $('empty').hidden = results.length > 0;
    $('askWa').href = waLink('Hello, do you have "' + state.q + '" available?');
  }

  // infinite scroll
  new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) renderMore();
  }, { rootMargin: '800px 0px' }).observe(sentinel);

  // ---------- Events ----------
  var debounceT;
  input.addEventListener('input', function () {
    clearTimeout(debounceT);
    clearQ.hidden = !input.value;
    debounceT = setTimeout(function () {
      state.q = input.value.trim();
      syncUrl();
      render();
      window.scrollTo({ top: 0 });
    }, 120);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') input.blur();
  });
  clearQ.addEventListener('click', function () {
    input.value = ''; state.q = '';
    syncUrl(); render(); input.focus();
  });

  function setCompany(i) {
    state.co = i;
    syncUrl(); render();
    window.scrollTo({ top: 0 });
  }
  document.addEventListener('click', function (e) {
    var coBtn = e.target.closest('[data-co]');
    if (coBtn) {
      var v = coBtn.dataset.co;
      setCompany(v === '' ? null : (state.co === +v && coBtn.classList.contains('chip') ? null : +v));
      return;
    }
    var add = e.target.closest('[data-add]');
    if (add) {
      toggleCart(+add.dataset.add);
      var inCart = cart.has(+add.dataset.add);
      add.classList.toggle('on', inCart);
      add.setAttribute('aria-pressed', inCart);
      add.innerHTML = inCart ? '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
      if (navigator.vibrate) navigator.vibrate(10);
    }
  });

  $('catTabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.cat = b.dataset.cat;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
    renderCompanies();
  });

  window.addEventListener('popstate', function () {
    if (sheetOpen && !location.hash) { closeSheet(true); return; }
    var prevQ = state.q, prevCo = state.co;
    readUrl();
    if (prevQ === state.q && prevCo === state.co) return;
    wasResults = !!(state.q || state.co != null);
    render();
  });

  // bottom nav
  document.querySelector('.bottom-nav').addEventListener('click', function (e) {
    var b = e.target.closest('[data-nav]'); if (!b) return;
    var nav = b.dataset.nav;
    if (nav === 'home') {
      input.value = ''; state.q = ''; state.co = null;
      history.replaceState(null, '', location.pathname); wasResults = false;
      render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (nav === 'search') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      topbar.classList.remove('compact');
      input.focus();
    } else if (nav === 'cart') openSheet();
  });

  // compact header on scroll (mobile)
  var topbar = $('topbar'), lastY = 0, ticking = false, toTop = $('toTop');
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      topbar.classList.toggle('scrolled', y > 4);
      if (window.innerWidth < 900) {
        if (y > lastY + 6 && y > 120) topbar.classList.add('compact');
        else if (y < lastY - 6 || y < 60) topbar.classList.remove('compact');
      }
      toTop.hidden = y < 900;
      lastY = y; ticking = false;
    });
  }, { passive: true });
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // ---------- Share ----------
  $('shareBtn').addEventListener('click', function () {
    var url = location.origin + urlFor();
    var title = 'Saraswati Medicine Agencies – ' + $('resultsTitle').textContent;
    if (navigator.share) navigator.share({ title: title, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied'); });
    else window.open('https://wa.me/?text=' + encodeURIComponent(title + '\n' + url), '_blank');
  });

  // ---------- Order list ----------
  var STORE = 'sma-cart-v1';
  var cart = new Map(); // product index -> qty
  function keyOf(p) { return p.name + '|' + companies[p.co].name; }
  (function loadCart() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE) || '[]');
      var idx = {};
      products.forEach(function (p) { idx[keyOf(p)] = p.i; });
      saved.forEach(function (s) { if (idx[s.k] != null) cart.set(idx[s.k], s.q); });
      $('party').value = localStorage.getItem('sma-party') || '';
    } catch (e) {}
  })();
  function saveCart() {
    try {
      var arr = [];
      cart.forEach(function (q, i) { arr.push({ k: keyOf(products[i]), q: q }); });
      localStorage.setItem(STORE, JSON.stringify(arr));
    } catch (e) {}
  }
  function toggleCart(i) {
    if (cart.has(i)) { cart.delete(i); toast('Removed from list'); }
    else { cart.set(i, 1); toast('Added: ' + products[i].name); }
    saveCart(); updateBadge(true);
  }
  function updateBadge(bump) {
    var n = cart.size;
    [$('cartBadge'), $('fabBadge')].forEach(function (b) {
      b.textContent = n;
      if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
    $('cartBadge').hidden = n === 0;
    $('fab').hidden = n === 0;
  }
  function renderCart() {
    var items = [];
    cart.forEach(function (q, i) { items.push(products[i]); });
    items.sort(function (a, b) { return a.co - b.co || a.name.localeCompare(b.name); });
    $('cart').innerHTML = items.map(function (p) {
      return '<li><div class="item-main"><div class="item-name">' + esc(p.name) + '</div><div class="item-co">' + esc(companies[p.co].name) + '</div></div>' +
        '<div class="qty"><button data-dec="' + p.i + '" aria-label="Decrease">−</button>' +
        '<input type="number" inputmode="numeric" min="1" value="' + cart.get(p.i) + '" data-qty="' + p.i + '" aria-label="Quantity">' +
        '<button data-inc="' + p.i + '" aria-label="Increase">+</button></div></li>';
    }).join('');
    $('cartEmpty').hidden = items.length > 0;
    $('sheetFoot').hidden = items.length === 0;
    $('sendWa').href = waLink(orderText());
  }
  function orderText() {
    var party = $('party').value.trim();
    var lines = ['*Order – Saraswati Medicine Agencies*'];
    if (party) lines.push('From: ' + party);
    var groups = {};
    cart.forEach(function (q, i) {
      var c = companies[products[i].co].name;
      (groups[c] = groups[c] || []).push(products[i].name + ' — ' + q);
    });
    Object.keys(groups).sort().forEach(function (c) {
      lines.push('', '*' + c + '*');
      groups[c].sort().forEach(function (l, k) { lines.push((k + 1) + '. ' + l); });
    });
    lines.push('', 'Total items: ' + cart.size);
    return lines.join('\n');
  }
  function waLink(text) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text); }

  $('cart').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var i = +(b.dataset.inc || b.dataset.dec);
    var q = cart.get(i) + (b.dataset.inc ? 1 : -1);
    if (q < 1) { cart.delete(i); refreshListButton(i); updateBadge(); }
    else cart.set(i, q);
    saveCart(); renderCart();
  });
  $('cart').addEventListener('change', function (e) {
    var i = +e.target.dataset.qty;
    var q = Math.max(1, parseInt(e.target.value, 10) || 1);
    cart.set(i, q); saveCart(); renderCart();
  });
  $('party').addEventListener('input', function () {
    try { localStorage.setItem('sma-party', this.value); } catch (e) {}
    $('sendWa').href = waLink(orderText());
  });
  $('clearCart').addEventListener('click', function () {
    if (!confirm('Clear all items from your list?')) return;
    var ids = Array.from(cart.keys());
    cart.clear(); saveCart(); updateBadge(); renderCart();
    ids.forEach(refreshListButton);
  });
  function refreshListButton(i) {
    var b = list.querySelector('[data-add="' + i + '"]');
    if (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'; }
  }

  var sheet = $('sheet'), backdrop = $('sheetBackdrop'), sheetOpen = false;
  function openSheet() {
    renderCart();
    sheetOpen = true;
    backdrop.hidden = false;
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    history.pushState(history.state, '', urlFor() + '#list');
  }
  function closeSheet(fromPop) {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    document.body.style.overflow = '';
    if (!fromPop && location.hash === '#list') history.back();
  }
  $('fab').addEventListener('click', openSheet);
  $('closeSheet').addEventListener('click', function () { closeSheet(); });
  backdrop.addEventListener('click', function () { closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  // swipe down to close sheet
  (function () {
    var startY = null, dy = 0;
    sheet.addEventListener('touchstart', function (e) {
      if ($('cart').parentElement.scrollTop > 0 && !e.target.closest('.sheet-head, .sheet-grip')) return;
      startY = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none';
    }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (startY == null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    sheet.addEventListener('touchend', function () {
      if (startY == null) return;
      sheet.style.transition = ''; sheet.style.transform = '';
      if (dy > 110) closeSheet();
      startY = null;
    });
  })();

  // ---------- Toast ----------
  var toastT;
  function toast(msg) {
    var t = $('toast');
    if (sheetOpen) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }

  // ---------- Theme ----------
  var root = document.documentElement;
  try { var th = localStorage.getItem('sma-theme'); if (th) root.dataset.theme = th; } catch (e) {}
  $('themeBtn').addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('sma-theme', root.dataset.theme); } catch (e) {}
  });

  // ---------- Init ----------
  $('statProducts').textContent = fmt(products.length);
  $('statCompanies').textContent = companies.length;
  $('heroWa').href = waLink('Hello Saraswati Medicine Agencies, I would like to place an order.');
  if (location.hash === '#list') history.replaceState(null, '', urlFor());
  readUrl();
  wasResults = !!(state.q || state.co != null);
  renderCompanies();
  render();
  updateBadge();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
