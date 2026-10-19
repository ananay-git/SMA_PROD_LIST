"""Replace the catalog with the item master exported from the billing software.

Reads an Excel export (columns: SNO., COMPANY NAME, ITEM NAME), turns billing-software company
names into the names customers see using data/company-map.csv, and rewrites:
  - data/products.csv   (product, company)
  - data/companies.csv  (company, category, logo); logos already set for a company are kept

Usage:
  python tools/import-item-master.py path/to/item_master.xlsx
  node tools/build-data.js

Needs openpyxl:  pip install openpyxl
If a company in the export is missing from data/company-map.csv, the script stops and lists it,
so you can add a line for it (billing_name,company,category) and run it again.
"""
import csv
import os
import re
import sys

from openpyxl import load_workbook

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'data')


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def main():
    if len(sys.argv) != 2:
        sys.exit('Usage: python tools/import-item-master.py path/to/item_master.xlsx')

    # billing name -> (company, category); matching ignores case and extra spaces
    mapping = {}
    with open(os.path.join(DATA, 'company-map.csv'), encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh):
            mapping[norm(r['billing_name']).upper()] = (norm(r['company']), norm(r['category']) or 'Pharma')

    # find the header row ("COMPANY NAME" / "ITEM NAME"), then read items below it
    ws = load_workbook(sys.argv[1], read_only=True, data_only=True).worksheets[0]
    co_col = item_col = None
    items, unknown = [], {}
    for row in ws.iter_rows(values_only=True):
        cells = [norm(c) for c in row]
        if co_col is None:
            upper = [c.upper() for c in cells]
            if 'COMPANY NAME' in upper and 'ITEM NAME' in upper:
                co_col, item_col = upper.index('COMPANY NAME'), upper.index('ITEM NAME')
            continue
        billing, item = cells[co_col] if co_col < len(cells) else '', cells[item_col] if item_col < len(cells) else ''
        if not billing or not item or 'TOTAL' in billing.upper():
            continue
        key = billing.upper()
        if key not in mapping:
            unknown[billing] = unknown.get(billing, 0) + 1
            continue
        items.append((item.upper(), mapping[key][0]))

    if co_col is None:
        sys.exit('Could not find the "COMPANY NAME" and "ITEM NAME" header row in the sheet.')
    if unknown:
        print('These companies are not in data/company-map.csv. Add a line for each, then run again:')
        for b, n in sorted(unknown.items()):
            print(f'  {b}  ({n} items)')
        sys.exit(1)

    # companies: keep existing logo/category for known names; new ones take category from the map
    existing = {}
    path = os.path.join(DATA, 'companies.csv')
    if os.path.exists(path):
        with open(path, encoding='utf-8-sig', newline='') as fh:
            for r in csv.DictReader(fh):
                existing[r['company']] = r
    categories = {company: cat for company, cat in mapping.values()}
    used = sorted({c for _, c in items}, key=lambda c: c.lower())

    with open(path, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['company', 'category', 'logo'])
        for c in used:
            old = existing.get(c, {})
            w.writerow([c, categories.get(c) or old.get('category') or 'Pharma', old.get('logo', '')])

    seen, out = set(), []
    for item, company in items:
        if (item, company) not in seen:
            seen.add((item, company))
            out.append((item, company))
    out.sort(key=lambda r: (r[1].lower(), r[0]))
    with open(os.path.join(DATA, 'products.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['product', 'company'])
        w.writerows(out)

    dropped = [c for c in existing if c not in used]
    print(f'Imported {len(out)} products ({len(items) - len(out)} duplicates skipped) across {len(used)} companies.')
    if dropped:
        print('No longer in the list:', ', '.join(dropped))
    print('Now run: node tools/build-data.js')


if __name__ == '__main__':
    main()
