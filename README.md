# Saraswati Medicine Agencies – Product Catalog

A static, mobile-first catalog site: search 6,600+ products across 36 companies, build an order list, and send it on WhatsApp. It has no backend. All data ships with the frontend.

## Structure

```
data/products.csv      ← product list (product, company). Edit this in Excel.
data/companies.csv     ← company list (company, category: Pharma | OTC | Vaccines)
tools/build-data.js    ← turns the CSVs into public/assets/products.js
public/                ← the website (this folder is what Netlify serves)
netlify.toml           ← Netlify config (publish = public, runs the build script)
```

## Updating products

1. Edit `data/products.csv` and/or `data/companies.csv`, then save as CSV (UTF-8).
2. Run `node tools/build-data.js`. It prints how many products were built.
3. Deploy again. Phones that installed the site get the new list on their next visit.

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
