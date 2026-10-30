# Jejak — dashboard update

- Indonesian, English, Malay, Spanish, French and Arabic UI; Arabic RTL; language and theme saved locally.
- Up to 10 accounts per platform. Inclusive UTC date filters apply to public activity, not all-time profile counters.
- Wikimedia global account discovery covers every attached wiki, including zero-edit wikis with potential log actions. Edits and logs are separate counters. Hidden/private data and services outside CentralAuth are excluded.
- Three concurrent requests, 40 requests per batch, pause/continue and retry. First pages are prioritized across accounts before further pagination. Failed and pending sources are never labeled complete.
- Daily/monthly activity and project charts reflect loaded data and display filters.
- Commons gallery shows up to 24 unique files from loaded upload logs, with source/license links. Missing/deleted files may have no preview.
- CSV, real XLSX and JSON exports include all accounts, period, scope and coverage. XLSX has Metadata, Summary, Wikis, Activity and Coverage sheets. Text is escaped and CSV formula prefixes neutralized.
- GitHub displays at most 300 available public events, not complete historical contributions or commit counts. A date filter cannot extend API retention. Public API rate limits apply.
- Responsive layout, keyboard focus, labeled fields and light/dark themes.

## Usage

Enter one username per line, choose dates and search. Click Continue / retry while sources remain pending. Large global accounts may require many batches. Keep the page open: search results are held only in browser memory; export before leaving. A pending or failed result is incomplete. Filters affect the view, while exports retain the full loaded report.

## Validation

`node tests.cjs` checks date boundaries, continuation deduplication, failure/retry coverage, escaped source text, CSV formula safety, all translation keys, GitHub pagination and workbook generation. The generated XLSX was additionally parsed with openpyxl. Live browser checks exercised Wikimedia and GitHub API searches and language/theme controls.
