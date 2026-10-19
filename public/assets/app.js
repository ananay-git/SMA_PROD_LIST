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
    return { i: i, name: c[0], cat: c[1], logo: c[2] || '', key: compact(c[0]), slug: slug(c[0]), count: 0 };
  });
  var products = CAT.products.map(function (p, i) {
    companies[p[1]].count++;
    return { i: i, name: p[0], co: p[1], photo: p[2] != null ? (CAT.photos || [])[p[2]] : '', key: compact(p[0]), words: p[0].toUpperCase().split(/[^A-Z0-9]+/) };
  });
  var bySlug = {};
  companies.forEach(function (c) { bySlug[c.slug] = c; });
  var coOrder = companies.slice().sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });

  // ---------- Helpers ----------
  var PALETTE = [['#fff1ef', '#e65a4d'], ['#e8f7f7', '#178f92'], ['#eef3ff', '#3b63d1'], ['#fff6e5', '#c27c0e'],
    ['#f3eefe', '#7a4fd1'], ['#eaf7ee', '#2b8a4b'], ['#fdeef6', '#c2407f'], ['#eef7fb', '#2b7fa8']];
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
  // company logo, or coloured initials when no logo is available / it fails to load
  function logoHtml(c, cls) {
    var col = colorFor(c.name);
    var fallback = '<span class="co-initials" style="background:' + col[0] + ';color:' + col[1] + '">' + esc(initials(c.name)) + '</span>';
    if (!c.logo) return '<span class="' + cls + ' no-logo">' + fallback + '</span>';
    return '<span class="' + cls + '"><img src="' + esc(c.logo) + '" alt="' + esc(c.name) + ' logo" loading="lazy" decoding="async" ' +
      'onerror="this.parentNode.classList.add(\'no-logo\');this.replaceWith(this.nextElementSibling.content.cloneNode(true))">' +
      '<template>' + fallback + '</template></span>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return n.toLocaleString('en-IN'); }
  function plural(n, one, many) { return fmt(n) + ' ' + (n === 1 ? one : many); }

  // dosage form -> label, icon, colour
  var ICONS = {
    tab: '<rect x="4.5" y="3" width="15" height="18" rx="3"/><circle cx="9.5" cy="8.5" r="2"/><circle cx="14.5" cy="8.5" r="2"/><circle cx="9.5" cy="15.5" r="2"/><circle cx="14.5" cy="15.5" r="2"/>',
    cap: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.6 8.6l4.8 6.8" transform="rotate(0)"/>',
    inj: '<path d="m18 2 4 4M17 7l-9.5 9.5M15 5l4 4M7.5 12.5l4 4M5 19l-3 3M9 14l-4 4 1 1 4-4"/>',
    syp: '<path d="M9 2h6v3H9zM8 5h8l1 3v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8z"/><path d="M7 12h10"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    inh: '<path d="M8 3h5v7H8zM6 10h9v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><path d="M15 13h4v4h-4"/>',
    crm: '<path d="M8 2h8l-1 4H9zM9 6h6l2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/>',
    pdr: '<path d="M5 7h14l-1.5 13a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z"/><path d="M4 7l2-4h12l2 4M9 13h6"/>',
    gen: '<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m7 10 7 7"/>'
  };
  var FORMS = [
    [/\b(TAB|TABS|TABLETS?|DT|ODT|MD)\b|\dTAB\b|TAB\.?$/, 'Tablet', 'tab', '#e65a4d'],
    [/\b(CAP|CAPS|CAPSULES?|SOFTGEL|SOFT GEL)\b|\dCAP\b/, 'Capsule', 'cap', '#7a4fd1'],
    [/\b(INJ|INJECTION|AMP|VIAL|PFS|IV|I\.V|INFUSION|PEN)\b/, 'Injection', 'inj', '#3b63d1'],
    [/\b(SYP|SYRUP|SUSP|SUS|SUSPENSION|ELIXIR|LIQ|LIQUID|ORAL|EXPEC|LINCTUS|TONIC)\b/, 'Syrup / Liquid', 'syp', '#c27c0e'],
    [/\b(DROPS?|DROP)\b/, 'Drops', 'drop', '#178f92'],
    [/\b(SPRAY|INHALER|RESPULES?|ROTACAPS?|RESPICAPS?|NASAL|MDI|NEBULISER)\b/, 'Inhaler / Spray', 'inh', '#2b7fa8'],
    [/\b(CREAM|GEL|OINT|OINTMENT|LOTION|BALM|SERUM|FACEWASH|FACE WASH|WASH|SHAMPOO|SOAP|OIL)\b/, 'Cream / Topical', 'crm', '#c2407f'],
    [/\b(SACHET|SACH|POWDER|PDR|GRANULES?|GM|KG|JAR|POUCH|REFILL)\b/, 'Powder / Sachet', 'pdr', '#2b8a4b'],
    [/\d\s?ML\b/, 'Syrup / Liquid', 'syp', '#c27c0e']
  ];
  function formOf(name) {
    for (var i = 0; i < FORMS.length; i++) if (FORMS[i][0].test(name)) return FORMS[i];
    return [null, '', 'gen', '#9aa0a6'];
  }

  // ---------- Auto-generated pack images ----------
  // Drawn per product from its name: brand, variant, strength and form on a pack in the company colour.
  var CO_COLORS = {
    'Abbott India': '#1a3fa0', 'Abbott (Consumer)': '#1a3fa0', 'Novo Nordisk': '#001965', "Dr. Reddy's Labs": '#5b2c83',
    'Glenmark Pharma': '#d7262e', 'Sun Pharma': '#ef7d1a', 'Sun Pharma (Ranbaxy)': '#ef7d1a', 'Torrent Pharma': '#3a2b6b',
    'Zydus Healthcare': '#1a9e98', 'Zydus Wellness': '#6b3fa0', 'Bayer Zydus': '#10384f', 'B.E. Ltd': '#1d5fae',
    'J.B. Chemicals': '#a0171d', 'MSD': '#00857c', 'Mankind Pharma': '#1b4f9c', 'Novartis': '#0460a9', 'Eris Oaknet': '#1c5aa8',
    'Galderma': '#3a3a3a', 'Procter & Gamble (Merck)': '#003da5', 'Wockhardt': '#e2231a', 'Danone': '#1e5aa8', 'GSK': '#f36633',
    'Johnson & Johnson': '#d51900', 'Fixderma': '#3a8f3e', 'Reckitt Benckiser': '#e6007e', 'Dabur India': '#0b7d3e',
    'Ghrelin Pharma': '#c8102e', 'Nouveau Medicament': '#0098d8', 'Franco Indian Pharma': '#1f4e9a',
    'Vaccines & Human Biologicals': '#2b7fa8'
  };
  var FORM_WORDS = /^(TAB|TABS|TABLETS?|CAP|CAPS|CAPSULES?|SYP|SYRUP|SUSP|SUS|SUSPENSION|INJ|INJECTION|AMP|VIAL|PFS|DROPS?|CREAM|GEL|OINT|OINTMENT|LOTION|SACHET|SACH|POWDER|PDR|SPRAY|INHALER|RESPULES?|ROTACAPS?|RESPICAPS?|MDI|ORAL|EXPEC|STRIP|PACK)\.?$/;
  var PACK_LABEL = { tab: 'TABLETS', cap: 'CAPSULES', inj: 'INJECTION', syp: 'ORAL LIQUID', drop: 'DROPS', inh: 'INHALATION', crm: 'TOPICAL', pdr: 'POWDER', gen: '' };
  var packCache = {};

  function unit(u) { return /^(IU|K|%)$/.test(u) ? u : u.toLowerCase().replace(/^gm$/, 'g'); }
  function packParts(name) {
    var toks = name.replace(/[()[\]{}]/g, ' ').split(/\s+/).filter(Boolean);
    var brand = toks.shift();
    var glued = brand.match(/^([A-Z][A-Z&+-]{2,}?)(\d[\d.\/]*(?:MG|MCG|ML|GM|G|IU|K)?)$/); // AMLODAC5 -> AMLODAC + 5
    if (glued) { brand = glued[1]; toks.unshift(glued[2]); }
    var strength = '', variant = [];
    toks.forEach(function (t) {
      var clean = t.replace(/[,]+$/, '');
      if (FORM_WORDS.test(clean) || /^\d+'?S$/.test(clean) || /^\*/.test(clean)) return;
      var m = clean.match(/^(\d[\d.\/+-]*)(MG|MCG|ML|GM|G|IU|K|KG|L|%|MCG\/ML)?(TAB|CAP)?$/);
      if (m && !strength) { strength = m[1] + (m[2] ? ' ' + unit(m[2]) : ''); return; }
      if (/^(MG|MCG|ML|GM|IU|%)$/.test(clean) && strength && strength.indexOf(' ') < 0) { strength += ' ' + unit(clean); return; }
      if (variant.length < 2 && /^[A-Z][A-Z0-9.&+-]*$/.test(clean) && clean.length <= 8) variant.push(clean);
    });
    return { brand: brand, variant: variant.join(' '), strength: strength };
  }

  function fitText(x, y, text, maxW, size, weight, fill, anchor) {
    var est = text.length * size * (weight >= 700 ? .64 : .58);
    var len = est > maxW ? ' textLength="' + maxW + '" lengthAdjust="spacingAndGlyphs"' : '';
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" font-weight="' + weight + '" fill="' + fill + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + len + '>' + esc(text) + '</text>';
  }

  function packSvg(p) {
    if (packCache[p.i]) return packCache[p.i];
    var f = formOf(p.name), kind = f[2], pp = packParts(p.name);
    var col = CO_COLORS[companies[p.co].name] || colorFor(companies[p.co].name)[1];
    var title = pp.brand + (pp.variant ? ' ' + pp.variant : '');
    var label = PACK_LABEL[kind] || '';
    var s = '<svg class="pack" viewBox="0 0 80 80" aria-hidden="true" font-family="Open Sans, Arial, sans-serif">' +
      '<ellipse cx="40" cy="74" rx="28" ry="3" fill="#000" opacity=".08"/>';
    if (kind === 'syp' || kind === 'drop') {
      // bottle
      s += '<rect x="31" y="6" width="18" height="9" rx="2" fill="' + col + '"/>' +
        '<path d="M33 15h14v5c7 2 11 6 11 12v36a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V32c0-6 4-10 11-12z" fill="#7a4a1c" opacity=".88"/>' +
        '<rect x="24" y="34" width="32" height="28" rx="2" fill="#fff"/>' +
        '<rect x="24" y="34" width="32" height="4" fill="' + col + '"/>' +
        fitText(40, 48, title, 29, 8, 800, '#222', 'middle') +
        (pp.strength ? fitText(40, 56, pp.strength, 29, 6, 700, col, 'middle') : '') +
        (label ? fitText(40, 60.5, label, 28, 3.6, 600, '#777', 'middle') : '');
    } else if (kind === 'inj') {
      // vial
      s += '<rect x="30" y="6" width="20" height="8" rx="2" fill="' + col + '"/>' +
        '<rect x="33" y="14" width="14" height="5" fill="#b9c2cc"/>' +
        '<path d="M28 19h24v47a5 5 0 0 1-5 5H33a5 5 0 0 1-5-5z" fill="#e9f1f8" stroke="#c9d6e2" stroke-width="1"/>' +
        '<rect x="28" y="30" width="24" height="30" fill="#fff"/>' +
        '<rect x="28" y="30" width="24" height="3.5" fill="' + col + '"/>' +
        fitText(40, 43, title, 21, 6.5, 800, '#222', 'middle') +
        (pp.strength ? fitText(40, 51, pp.strength, 21, 5.4, 700, col, 'middle') : '') +
        fitText(40, 57, 'INJECTION', 20, 3.4, 600, '#777', 'middle');
    } else if (kind === 'crm') {
      // tube
      s += '<path d="M14 26h46l6 4v20l-6 4H14z" fill="#fff" stroke="#dcdcdc" stroke-width="1"/>' +
        '<rect x="66" y="33" width="9" height="14" rx="1.5" fill="' + col + '"/>' +
        '<path d="M8 25h7v30H8z" fill="#e7e7e7"/>' +
        '<rect x="14" y="26" width="5" height="28" fill="' + col + '" opacity=".9"/>' +
        fitText(23, 39, title, 40, 8, 800, '#222') +
        fitText(23, 47, (pp.strength ? pp.strength + '  ' : '') + label, 40, 5, 600, col);
    } else {
      // carton (tablets, capsules, powders, inhalers, everything else)
      s += '<path d="M10 16l8-6h52l-8 6z" fill="#efefef"/>' +
        '<path d="M62 16l8-6v54l-8 6z" fill="' + col + '" opacity=".35"/>' +
        '<rect x="10" y="16" width="52" height="54" fill="#fff" stroke="#e2e2e2" stroke-width=".8"/>' +
        '<rect x="10" y="16" width="52" height="9" fill="' + col + '"/>' +
        '<rect x="10" y="64" width="52" height="6" fill="' + col + '" opacity=".85"/>' +
        fitText(14, 39, title, 44, 9.5, 800, '#222') +
        (pp.strength ? fitText(14, 50, pp.strength, 44, 7.5, 700, col) : '') +
        (label ? fitText(14, 59.5, label, 44, 4.6, 600, '#777') : '');
    }
    s += '</svg>';
    packCache[p.i] = s;
    return s;
  }

  // ---------- Search ----------
  function search(q) {
    var raw = q.toUpperCase().trim();
    var tokens = raw.split(/\s+/).map(compact).filter(Boolean);
    var full = compact(raw);
    if (!tokens.length) return products.slice();
    var out = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i], coKey = companies[p.co].key, ok = true, nameHits = 0;
      for (var t = 0; t < tokens.length; t++) {
        if (p.key.indexOf(tokens[t]) !== -1) nameHits++;
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
    var toks = q.toUpperCase().trim().split(/\s+/).filter(Boolean)
      .map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    if (!toks.length) return esc(name);
    var re = new RegExp('(' + toks.sort(function (a, b) { return b.length - a.length; }).join('|') + ')', 'gi');
    return name.split(re).map(function (part, i) { return i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part); }).join('');
  }

  // ---------- State & URL ----------
  var state = { q: '', co: null, cat: '' };
  var base = [], results = [], shown = 0, coCounts = {};
  var input = $('q'), clearQ = $('clearQ'), list = $('list'), sentinel = $('sentinel');
  var isResults = function () { return !!(state.q || state.co != null); };

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
    var url = urlFor();
    if (isResults() && !wasResults) history.pushState({ v: 'results' }, '', url);
    else history.replaceState(history.state, '', url);
    wasResults = isResults();
  }

  // ---------- Cart ----------
  var STORE = 'sma-cart-v1';
  var cart = new Map(); // product index -> qty
  function keyOf(p) { return p.name + '|' + companies[p.co].name; }
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || '[]'), idx = {};
    products.forEach(function (p) { idx[keyOf(p)] = p.i; });
    saved.forEach(function (s) { if (idx[s.k] != null) cart.set(idx[s.k], s.q); });
  } catch (e) {}
  function saveCart() {
    try {
      var arr = [];
      cart.forEach(function (q, i) { arr.push({ k: keyOf(products[i]), q: q }); });
      localStorage.setItem(STORE, JSON.stringify(arr));
    } catch (e) {}
  }

  function controlHtml(i) {
    var q = cart.get(i);
    if (!q) return '<button class="add" data-add="' + i + '" aria-label="Add ' + esc(products[i].name) + ' to list">ADD</button>';
    return '<div class="stepper" data-ctl="' + i + '">' +
      '<button data-dec="' + i + '" aria-label="Decrease">−</button>' +
      '<input type="number" inputmode="numeric" min="1" value="' + q + '" data-qty="' + i + '" aria-label="Quantity">' +
      '<button data-inc="' + i + '" aria-label="Increase">+</button></div>';
  }

  function setQty(i, q, silent) {
    var had = cart.has(i);
    if (q < 1) cart.delete(i); else cart.set(i, q);
    saveCart();
    // refresh every visible control for this product
    document.querySelectorAll('[data-slot="' + i + '"]').forEach(function (slot) { slot.innerHTML = controlHtml(i); });
    if (sheetOpen) renderCart();
    updateCartUi(!had && q >= 1);
    if (!silent) {
      if (!had && q >= 1) toast('Added to list');
      else if (had && q < 1) toast('Removed from list');
      if (navigator.vibrate) navigator.vibrate(8);
    }
  }

  function updateCartUi(bump) {
    var n = cart.size;
    [$('cartBadge'), $('headBadge')].forEach(function (b) {
      b.textContent = n; b.hidden = n === 0;
      if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
    var showBar = n > 0 && !sheetOpen;
    $('cartBar').hidden = !showBar;
    document.body.classList.toggle('has-cart-bar', showBar);
    $('cartBarCount').textContent = plural(n, 'item', 'items');
  }

  // ---------- Rendering ----------
  function renderCompanies() {
    var html = '';
    coOrder.forEach(function (c) {
      if (state.cat && c.cat !== state.cat) return;
      html += '<button class="co" data-co="' + c.i + '">' + logoHtml(c, 'co-logo') +
        '<span class="co-name">' + esc(c.name) + '</span>' +
        '<span class="co-count">' + plural(c.count, 'product', 'products') + '</span></button>';
    });
    $('companyGrid').innerHTML = html;
  }

  function filterEntries() {
    // companies ordered by matches for the current query
    return coOrder.filter(function (c) { return coCounts[c.i] || state.co === c.i; })
      .sort(function (a, b) { return (coCounts[b.i] || 0) - (coCounts[a.i] || 0) || a.name.localeCompare(b.name); });
  }

  function renderFilters() {
    var entries = filterEntries();
    // mobile chips
    var html = '<button class="chip' + (state.co == null ? ' on' : '') + '" data-co="">All<small>' + fmt(base.length) + '</small></button>';
    entries.forEach(function (c) {
      html += '<button class="chip' + (state.co === c.i ? ' on' : '') + '" data-co="' + c.i + '">' + logoHtml(c, 'chip-logo') + esc(c.name) + '<small>' + fmt(coCounts[c.i] || 0) + '</small></button>';
    });
    $('chips').innerHTML = html;
    var on = $('chips').querySelector('.chip.on');
    if (on && state.co != null) on.scrollIntoView({ inline: 'center', block: 'nearest' });

    // desktop sidebar
    var f = $('coSearch').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    var side = '<li><button class="' + (state.co == null ? 'on' : '') + '" data-co=""><span class="radio"></span>All companies<span class="n">' + fmt(base.length) + '</span></button></li>';
    entries.forEach(function (c) {
      if (f && c.key.indexOf(f) === -1) return;
      side += '<li><button class="' + (state.co === c.i ? 'on' : '') + '" data-co="' + c.i + '"><span class="radio"></span>' + logoHtml(c, 'f-logo') + esc(c.name) + '<span class="n">' + fmt(coCounts[c.i] || 0) + '</span></button></li>';
    });
    $('filterList').innerHTML = side;
    $('clearFilter').hidden = state.co == null;
  }

  function itemHtml(p) {
    var f = formOf(p.name), c = companies[p.co];
    var pack = packSvg(p);
    var thumb = '<button class="thumb photo" data-zoom="' + p.i + '" aria-label="View ' + esc(p.name) + '">' +
      (p.photo
        ? '<img src="' + esc(p.photo) + '" alt="" loading="lazy" decoding="async" onerror="this.replaceWith(this.nextElementSibling.content.cloneNode(true))"><template>' + pack + '</template>'
        : pack) + '</button>';
    return '<li class="item">' + thumb +
      '<div class="item-main"><div class="item-name">' + highlight(p.name, state.q) + '</div>' +
      (f[1] ? '<div class="item-form">' + f[1] + '</div>' : '') +
      '<div class="item-co">By <a href="?c=' + c.slug + '" data-co="' + c.i + '">' + esc(c.name) + '</a></div></div>' +
      '<div data-slot="' + p.i + '">' + controlHtml(p.i) + '</div></li>';
  }

  function renderMore() {
    if (shown >= results.length) return;
    var end = Math.min(shown + PAGE, results.length), html = '';
    for (var i = shown; i < end; i++) html += itemHtml(results[i]);
    list.insertAdjacentHTML('beforeend', html);
    shown = end;
  }

  function render() {
    var r = isResults();
    $('home').hidden = r;
    $('results').hidden = !r;
    $('chipsWrap').hidden = !r;
    clearQ.hidden = !state.q;
    document.querySelectorAll('.bottom-nav [data-nav]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.nav === (r ? 'search' : 'home'));
    });
    if (!r) return;

    base = search(state.q);
    coCounts = {};
    base.forEach(function (p) { coCounts[p.co] = (coCounts[p.co] || 0) + 1; });
    results = state.co == null ? base : base.filter(function (p) { return p.co === state.co; });
    if (!state.q) results.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    shown = 0;
    list.innerHTML = '';
    renderMore();
    renderFilters();

    var title;
    if (state.q && state.co != null) title = 'Results for “' + state.q + '” in ' + companies[state.co].name;
    else if (state.q) title = 'Results for “' + state.q + '”';
    else title = companies[state.co].name;
    $('resultsTitle').textContent = title;
    $('resultsLogo').innerHTML = state.co != null ? logoHtml(companies[state.co], 'head-logo') : '';
    var nCos = Object.keys(coCounts).length;
    $('resultsCount').textContent = 'Showing ' + plural(results.length, 'product', 'products') +
      (state.co == null && state.q ? ' from ' + plural(nCos, 'company', 'companies') : '');
    $('empty').hidden = results.length > 0;
    $('askWa').href = waLink('Hello, do you have "' + state.q + '" available?');
  }

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
      syncUrl(); render();
      window.scrollTo({ top: 0 });
    }, 120);
  });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
  clearQ.addEventListener('click', function () {
    input.value = ''; state.q = '';
    syncUrl(); render(); input.focus();
  });
  $('coSearch').addEventListener('input', renderFilters);
  $('clearFilter').addEventListener('click', function () { setCompany(null); });

  function setCompany(i) {
    state.co = i;
    syncUrl(); render();
    window.scrollTo({ top: 0 });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var zoom = t.closest('[data-zoom]');
    if (zoom) { openZoom(products[+zoom.dataset.zoom]); return; }
    var coBtn = t.closest('[data-co]');
    if (coBtn) { e.preventDefault(); setCompany(coBtn.dataset.co === '' ? null : +coBtn.dataset.co); return; }
    var add = t.closest('[data-add]');
    if (add) { setQty(+add.dataset.add, 1); return; }
    var inc = t.closest('[data-inc]');
    if (inc) { var i = +inc.dataset.inc; setQty(i, (cart.get(i) || 0) + 1, true); return; }
    var dec = t.closest('[data-dec]');
    if (dec) { var j = +dec.dataset.dec; setQty(j, (cart.get(j) || 0) - 1); }
  });
  document.addEventListener('change', function (e) {
    if (!e.target.dataset.qty) return;
    var q = parseInt(e.target.value, 10);
    setQty(+e.target.dataset.qty, isNaN(q) ? 1 : q);
  });

  $('catTabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.cat = b.dataset.cat;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
    renderCompanies();
  });

  window.addEventListener('popstate', function () {
    if (sheetOpen && location.hash !== '#list') { closeSheet(true); return; }
    var prevQ = state.q, prevCo = state.co;
    readUrl();
    if (prevQ === state.q && prevCo === state.co) return;
    wasResults = isResults();
    render();
  });

  function goHome() {
    input.value = ''; state.q = ''; state.co = null;
    history.replaceState(null, '', location.pathname); wasResults = false;
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelector('.brand').addEventListener('click', function (e) { e.preventDefault(); goHome(); });
  document.querySelector('.bottom-nav').addEventListener('click', function (e) {
    var b = e.target.closest('[data-nav]'); if (!b) return;
    if (b.dataset.nav === 'home') goHome();
    else if (b.dataset.nav === 'search') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      header.classList.remove('compact');
      input.focus();
    } else openSheet();
  });
  $('cartBtn').addEventListener('click', openSheet);
  $('cartBar').addEventListener('click', openSheet);

  // header height for sticky offsets + compact-on-scroll (mobile)
  var header = $('header'), lastY = 0, ticking = false, toTop = $('toTop');
  function syncHeaderH() { document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px'); }
  if (window.ResizeObserver) new ResizeObserver(syncHeaderH).observe(header);
  syncHeaderH();
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      header.classList.toggle('scrolled', y > 4);
      if (window.innerWidth < 900 && document.activeElement !== input) {
        if (y > lastY + 6 && y > 140) header.classList.add('compact');
        else if (y < lastY - 6 || y < 60) header.classList.remove('compact');
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

  // ---------- Order list sheet ----------
  function renderCart() {
    var items = [];
    cart.forEach(function (q, i) { items.push(products[i]); });
    items.sort(function (a, b) { return a.co - b.co || a.name.localeCompare(b.name); });
    $('cart').innerHTML = items.map(function (p) {
      return '<li><div class="item-main"><div class="item-name">' + esc(p.name) + '</div><div class="item-co">By ' + esc(companies[p.co].name) + '</div></div>' +
        '<div data-slot="' + p.i + '">' + controlHtml(p.i) + '</div></li>';
    }).join('');
    $('cartEmpty').hidden = items.length > 0;
    $('sheetFoot').hidden = items.length === 0;
    $('sheetCount').textContent = plural(items.length, 'item', 'items');
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

  try { $('party').value = localStorage.getItem('sma-party') || ''; } catch (e) {}
  $('party').addEventListener('input', function () {
    try { localStorage.setItem('sma-party', this.value); } catch (e) {}
    $('sendWa').href = waLink(orderText());
  });
  $('clearCart').addEventListener('click', function () {
    if (!confirm('Remove all items from your list?')) return;
    Array.from(cart.keys()).forEach(function (i) { setQty(i, 0, true); });
    renderCart();
  });

  var sheet = $('sheet'), backdrop = $('sheetBackdrop'), sheetOpen = false;
  function openSheet() {
    if (sheetOpen) return;
    sheetOpen = true;
    $('toast').classList.remove('show');
    renderCart();
    backdrop.hidden = false;
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    updateCartUi();
    history.pushState(history.state, '', urlFor() + '#list');
  }
  function closeSheet(fromPop) {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    document.body.style.overflow = '';
    updateCartUi();
    if (!fromPop && location.hash === '#list') history.back();
  }
  $('closeSheet').addEventListener('click', function () { closeSheet(); });
  backdrop.addEventListener('click', function () { closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  // swipe down to close (mobile)
  (function () {
    var startY = null, dy = 0, body = sheet.querySelector('.sheet-body');
    sheet.addEventListener('touchstart', function (e) {
      if (window.innerWidth >= 900) return;
      if (body.scrollTop > 0 && body.contains(e.target)) return;
      if (e.target.closest('input, button')) return;
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

  // ---------- Photo viewer ----------
  var zoomEl = $('zoom');
  function openZoom(p) {
    $('zoomArt').innerHTML = p.photo ? '<img src="' + esc(p.photo) + '" alt="">' : packSvg(p);
    $('zoomNote').textContent = p.photo ? 'Photo shows the brand; pack size or strength may differ.' : 'Illustration only, not the actual pack.';
    $('zoomName').textContent = p.name;
    $('zoomCo').textContent = 'By ' + companies[p.co].name;
    zoomEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeZoom() {
    if (zoomEl.hidden) return;
    zoomEl.hidden = true;
    $('zoomArt').innerHTML = '';
    if (!sheetOpen) document.body.style.overflow = '';
  }
  zoomEl.addEventListener('click', function (e) { if (e.target === zoomEl || e.target.closest('.zoom-close')) closeZoom(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeZoom(); });

  // ---------- Toast ----------
  var toastT;
  function toast(msg) {
    if (sheetOpen) return;
    var t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 1500);
  }

  // ---------- Init ----------
  $('statProducts').textContent = fmt(products.length);
  $('statCompanies').textContent = companies.length;
  $('uspProducts').textContent = fmt(products.length);
  $('uspCompanies').textContent = companies.length;
  $('heroWa').href = waLink('Hello Saraswati Medicine Agencies, I would like to place an order.');
  if (location.hash === '#list') history.replaceState(null, '', urlFor());
  readUrl();
  wasResults = isResults();
  renderCompanies();
  render();
  updateCartUi();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
