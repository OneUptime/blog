# Validation Summary: Create a Public Status Page with OneUptime

## Status
validated

## Post Type
Tutorial / Step-by-step product guide (OneUptime status pages)

## Technologies Covered
- OneUptime status pages (custom domains, branding, subscribers, embedded badge, webhooks)
- DNS (CNAME records for custom status page domains)
- SSL/TLS certificate provisioning (Let's Encrypt / HTTP-01)
- HTML embed (status badge image)
- JSON webhook payloads for status page subscribers

## Sources Consulted
Verified against the OneUptime source code in the monorepo (same repository the blog lives in):
- Custom domain CNAME handling: `Common/Server/EnvironmentConfig.ts` (`StatusPageCNameRecord` / `STATUS_PAGE_CNAME_RECORD`), `App/FeatureSet/Dashboard/src/Pages/StatusPages/View/Domains.tsx` ("add `${StatusPageCNameRecord}` as your CNAME")
- SSL provisioning: `Common/Server/Services/StatusPageDomainService.ts` (`isCnameValid()`, `orderCert()`), `Common/Server/Utils/Greenlock/Greenlock.ts` (`challengePriority: ["http-01"]`), `Common/Models/DatabaseModels/StatusPageDomain.ts` (`isCnameVerified`, `isSslOrdered`, `isSslProvisioned`)
- Embedded badge: `Common/Server/API/StatusPageAPI.ts` (route `/status-page/badge/:statusPageId?token=...`, returns SVG), `App/FeatureSet/Dashboard/src/Pages/StatusPages/View/EmbeddedStatus.tsx` (`<img src=".../status-page/badge/{id}?token={token}" />`)
- Subscriber webhooks: `Common/Server/Utils/StatusPageSubscriberWebhook.ts` (`StatusPageWebhookPayload` interface), `App/FeatureSet/Workers/Jobs/Incident/SendNotificationToSubscribers.ts` (`eventType: "IncidentCreated"` payload), plus IncidentStateChanged / ScheduledMaintenance / Announcement job equivalents

## Issues Found
1. **Fabricated CNAME target.** The post hardcoded `status.acmecloud.com. IN CNAME statuspage.oneuptime.com.`. OneUptime does not use a fixed `statuspage.oneuptime.com` target — the CNAME value is deployment-specific (`STATUS_PAGE_CNAME_RECORD`) and is displayed to the user on the **Domains** screen. Changed the example to a `<cname-target-from-oneuptime>` placeholder and instructed readers to copy the value shown in the UI.

2. **Fabricated A / AAAA record fallback.** The post claimed you can point a status page domain at "OneUptime's IP address" with an A record (plus AAAA for IPv6). OneUptime verifies custom status page domains via CNAME only (`isCnameValid()`), and SSL uses the HTTP-01 challenge against that CNAME; there is no published A/AAAA IP for status page hosting. Removed the A/AAAA block and replaced it with a note that the domain should be added as a CNAME-capable subdomain.

3. **Incorrect SSL flow.** The post implied SSL "automatically provisions" purely on DNS propagation. In reality the CNAME is verified first, then a free SSL certificate is ordered (Let's Encrypt) and auto-renewed. Adjusted step 3 to reflect verify → order free SSL → auto-renew.

4. **Wrong badge embed mechanism.** The post used an `<iframe>` pointing at `https://oneuptime.com/status-page/your-status-page-id/badge`. The real feature is an SVG image served at `/status-page/badge/<id>?token=<token>`, embedded with an `<img>` tag and requiring a security token generated in the Embedded Status Badge settings. Replaced the iframe snippet with the correct `<img>` (and Markdown) embed and added the token/enable step.

5. **Nonexistent JavaScript widget.** The post documented a `widget.js` script with a `window.oneuptimeStatusWidget` config object (`statusPageId`, `containerId`, `theme`, `showComponents`, `showIncidents`). No such widget, script, or config exists anywhere in the codebase. Removed this entire snippet.

6. **Incorrect webhook payload structure.** The post's payload used `event: "incident.created"`, `timestamp`, nested `statusPage` / `incident` objects, `state`, `severity`, `affectedComponents[]`, and `updates[]`. The actual `StatusPageWebhookPayload` is flat: `eventType` (e.g. `IncidentCreated`), `statusPageId`, `statusPageName`, `statusPageUrl`, `unsubscribeUrl`, and a `data` object with `incidentId`, `incidentNumber`, `incidentTitle`, `incidentDescription`, `incidentSeverity`, `resourcesAffected`, `detailsUrl`. Replaced the JSON with the real structure and noted the other event types.

## Review Notes
- The narrative/process steps (creating the page, modeling resources, branding, subscribers, announcements, operations) align with how OneUptime status pages work and required no changes.
- The badge and webhook URLs in the examples use the `oneuptime.com` host for illustration; on self-hosted installs the host/API URL will differ (the dashboard generates the exact URL for the user). This is acceptable for an example but worth keeping in mind.
- Webhook deliveries include retry-with-exponential-backoff and (when a secret is configured) an HMAC signature header — not mentioned in the post, but not incorrect to omit for an introductory guide.
