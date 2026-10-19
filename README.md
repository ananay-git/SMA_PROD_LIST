# Saraswati Medicine Agencies – Product Catalog

A static, mobile-first catalog site: search 6,600+ products across 36 companies, build an order list, and send it on WhatsApp. It has no backend. All data ships with the frontend.

## Structure

```
data/products.csv      ← product list (product, company). Edit this in Excel.
data/companies.csv     ← company list (company, category: Pharma | OTC | Vaccines, logo)
public/assets/logos/   ← company logo files referenced by the "logo" column (blank = coloured initials)
tools/build-data.js    ← turns the CSVs into public/assets/products.js
public/                ← the website (this folder is what Netlify serves)
netlify.toml           ← Netlify config (publish = public, runs the build script)
```

## Updating products

1. Edit `data/products.csv` and/or `data/companies.csv`, then save as CSV (UTF-8).
2. Run `node tools/build-data.js`. It prints how many products were built.
3. Deploy again. Phones that installed the site get the new list on their next visit.

## Adding product photos (one photo per brand)

Products are grouped into brands automatically. For example, every AMLODAC item from Zydus shares one photo.

1. Open `data/brand-photo-checklist.csv` in Excel. It lists every brand, how many products it covers, and the exact file name to use (`photo_file_name`). Start with the brands that have the most products.
2. Save the photo in `public/assets/photos/` with that name, e.g. `amlodac.jpg`. If two companies have a brand with the same name, put the company in front: `zydus-healthcare--amlodac.jpg`.
3. Shrink the photos: `python tools/optimize-photos.py`. Phone photos are several MB; this brings them to about 50 KB.
4. Rebuild: `node tools/build-data.js` (it reports how many brands have photos), then redeploy.

Products without a photo keep their dosage-form icon. Use photos you took yourself or got from the company (e.g. from the MR). Don't copy them from pharmacy websites.

## Deploying on Netlify

- **Git (recommended):** push this folder to GitHub, then in Netlify use *Add new site → Import from Git*. `netlify.toml` already sets the build command and publish folder.
- **Drag & drop:** run `node tools/build-data.js`, then drag the `public` folder onto app.netlify.com/drop.

## Preview locally

```
cd public
python -m http.server 8000
```

Then open http://localhost:8000.

## Settings

- WhatsApp order number: `WHATSAPP` at the top of `public/assets/app.js`.
- Phone numbers and address: `public/index.html`.
