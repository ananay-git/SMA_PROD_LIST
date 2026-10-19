// Converts data/products.csv + data/companies.csv into public/assets/products.js.
// Run: node tools/build-data.js   (Netlify runs this automatically on every deploy)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function read(name) {
  const text = fs.readFileSync(path.join(root, 'data', name), 'utf8').replace(/^﻿/, '');
  const [header, ...rows] = parseCsv(text);
  const cols = header.map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] || '').trim()])));
}

const companyRows = read('companies.csv');
const productRows = read('products.csv');

const companies = [];
const index = new Map();
for (const c of companyRows) {
  if (!c.company || index.has(c.company.toLowerCase())) continue;
  index.set(c.company.toLowerCase(), companies.length);
  const logo = c.logo && fs.existsSync(path.join(root, 'public', c.logo)) ? c.logo : '';
  if (c.logo && !logo) console.warn(`warning: logo file not found for ${c.company}: ${c.logo}`);
  companies.push([c.company, c.category || 'Pharma', logo]);
}

const seen = new Set();
const products = [];
const problems = [];
productRows.forEach((p, n) => {
  const name = p.product.replace(/\s+/g, ' ').toUpperCase();
  if (!name) return;
  let ci = index.get(p.company.toLowerCase());
  if (ci === undefined) {
    problems.push(`row ${n + 2}: company "${p.company}" not in companies.csv – added as Pharma`);
    ci = companies.length;
    index.set(p.company.toLowerCase(), ci);
    companies.push([p.company, 'Pharma']);
  }
  const key = name + '|' + ci;
  if (seen.has(key)) return;
  seen.add(key);
  products.push([name, ci]);
});

products.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

// ---------- Brand photos ----------
// One photo per brand family: "AMLODAC 5 TAB", "AMLODAC AT TAB" ... all share the AMLODAC photo.
// Drop files into public/assets/photos/ named after the brand, e.g. amlodac.jpg.
// If two companies have a brand with the same name, prefix the company: zydus-healthcare--amlodac.jpg
function brandOf(name) {
  const toks = name.replace(/[()[\]{}]/g, ' ').split(/[\s\-/]+/).filter(Boolean);
  let b = toks[0].replace(/[^A-Z0-9&+.]/g, '');
  const stripped = b.replace(/[\d.]+[A-Z]*$/, ''); // AMLODAC5 -> AMLODAC
  if (stripped.replace(/[^A-Z]/g, '').length >= 3) b = stripped;
  b = b.replace(/\.+$/, '');
  if (b.replace(/[^A-Z]/g, '').length < 4 && toks[1] && /^[A-Z]{3,}/.test(toks[1])) b += ' ' + toks[1].replace(/[^A-Z]/g, '');
  return b;
}
const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const photoDir = path.join(root, 'public', 'assets', 'photos');
const photoFiles = new Map(); // basename (lowercase, no extension) -> published path
if (fs.existsSync(photoDir)) {
  for (const f of fs.readdirSync(photoDir)) {
    const m = f.match(/^(.+)\.(jpe?g|png|webp|avif)$/i);
    if (!m) continue;
    photoFiles.set(m[1].toLowerCase(), 'assets/photos/' + f);
    const kb = fs.statSync(path.join(photoDir, f)).size / 1024;
    if (kb > 300) problems.push(`photo ${f} is ${Math.round(kb)} KB – run "python tools/optimize-photos.py" to shrink it`);
  }
}

const photos = [];
const photoIndex = new Map();
const brands = new Map(); // company|brand -> { company, brand, products: [], photo }
for (const p of products) {
  const co = companies[p[1]][0];
  const brand = brandOf(p[0]);
  const key = co + '|' + brand;
  if (!brands.has(key)) {
    const file = photoFiles.get(slug(co) + '--' + slug(brand)) || photoFiles.get(slug(brand)) || '';
    brands.set(key, { company: co, brand, products: [], photo: file });
  }
  const b = brands.get(key);
  b.products.push(p[0]);
  if (b.photo) {
    if (!photoIndex.has(b.photo)) { photoIndex.set(b.photo, photos.length); photos.push(b.photo); }
    p.push(photoIndex.get(b.photo));
  }
}

// Checklist of every brand and the file name its photo should have (regenerated on every build).
const csvCell = (v) => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
const checklist = [['company', 'brand', 'products', 'photo_file_name', 'has_photo', 'example_products']];
[...brands.values()]
  .sort((a, b) => a.company.localeCompare(b.company) || b.products.length - a.products.length || a.brand.localeCompare(b.brand))
  .forEach((b) => checklist.push([b.company, b.brand, String(b.products.length), slug(b.brand) + '.jpg',
    b.photo ? 'yes' : 'no', b.products.slice(0, 3).join(' | ')]));
fs.writeFileSync(path.join(root, 'data', 'brand-photo-checklist.csv'),
  '﻿' + checklist.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n');

const out = '/* Generated by tools/build-data.js from data/*.csv – do not edit by hand. */\n' +
  'window.CATALOG=' + JSON.stringify({ companies, products, photos }) + ';\n';
fs.writeFileSync(path.join(root, 'public', 'assets', 'products.js'), out);

// Stamp a content hash on the CSS/JS links in index.html (e.g. app.js?v=3f9a1c2b) so browsers
// fetch a file again the moment it changes, while unchanged files stay cached.
const sha = (s) => require('crypto').createHash('sha1').update(s).digest('hex').slice(0, 10);
const indexPath = path.join(root, 'public', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');
for (const f of ['assets/style.css', 'assets/app.js', 'assets/products.js']) {
  const v = sha(fs.readFileSync(path.join(root, 'public', f)));
  const re = new RegExp('(["\'])' + f.replace(/[.]/g, '\\.') + '(\\?v=[a-z0-9]+)?(["\'])', 'g');
  indexHtml = indexHtml.replace(re, `$1${f}?v=${v}$3`);
}
fs.writeFileSync(indexPath, indexHtml);

// Bump the offline-cache version so phones pick up the new version.
const hash = sha(indexHtml);
const swPath = path.join(root, 'public', 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(/const CACHE = '[^']*';/, `const CACHE = 'sma-catalog-${hash}';`));

problems.forEach((p) => console.warn('warning:', p));
const withPhoto = [...brands.values()].filter((b) => b.photo).length;
console.log(`Built ${products.length} products across ${companies.length} companies.`);
console.log(`Brand photos: ${withPhoto} of ${brands.size} brands (${products.filter((p) => p.length > 2).length} products). Checklist: data/brand-photo-checklist.csv`);
