# Kegiatan & Proyek

Jejak keeps its contribution checker at `#kontribusi` and adds shared projects at `#kegiatan`.

Create an event with a UTC date range, campaign, organizer, wiki domains, participants and optional page titles. Save the management key immediately; it is stored only for the browser session, never in the public link, and has no recovery service. Public readers can see event descriptions, usernames and reports. Enrollment requests require organizer approval; account existence is checked, ownership is not verified through OAuth.

Reports are explicitly refreshed by organizers, with resumable API pagination. Scope is namespace 0 edits plus Commons upload log actions, not unique files. Up to 200 participants, 10 wikis and 200 target titles are supported. Recent activity is limited to 100 rows and the page list to 10,000 rows. Saving changed settings resets the report. CSV, XLSX, JSON and browser print/PDF exports are available.

Shared API: https://jejak-events-api.stillcalf15.chatgpt.site/api
Backend: managed Sites Worker with D1; authenticated mutations use per-event random management keys stored as SHA-256 hashes. Public reads omit keys. Optimistic revisions and scan leases protect concurrent edits. API rate limits apply. The API must be public for the GitHub Pages client to access it; CORS permits https://sandirambe-hub.github.io.

Validation: backend integration tests cover persistence, authorization, key exclusion, enrollment queues, date/scope validation, pagination/deduplication, retry, revision conflicts, scan leases and CORS. UI was exercised in the managed local preview. Wikimedia OAuth, scheduled background scans and key recovery are not implemented.
