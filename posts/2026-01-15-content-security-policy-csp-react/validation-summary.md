# Validation Summary: How to Implement Content Security Policy (CSP) for React Apps

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Content Security Policy (CSP) — directives, source values, delivery methods
- React (Create React App, Vite)
- Next.js (App Router, middleware, `next/headers`, `next/script`)
- Express.js / Node.js (`crypto`, header setting, report endpoint)
- Helmet.js
- styled-components and Emotion (CSS-in-JS nonce configuration)
- Nginx (`add_header`)
- CSP violation reporting (`report-uri`, `report-to`, Reporting API)

## Sources Consulted
- MDN Web Docs: Content Security Policy — https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- Next.js Guides: Content Security Policy — https://nextjs.org/docs/app/guides/content-security-policy
- Next.js Discussion #80997 (CSP headers / `await headers()` in production) — https://github.com/vercel/next.js/discussions/80997
- styled-components Advanced Usage / FAQs (nonce support) — https://styled-components.com/docs/advanced and https://styled-components.com/docs/faqs
- styled-components 6.4.0 release notes (StyleSheetManager `nonce` prop) — https://github.com/styled-components/styled-components/releases/tag/styled-components@6.4.0
- OWASP CSP Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

## Issues Found
- **Next.js `headers()` called synchronously (both `app/layout.tsx` examples).** In current Next.js (15+), `headers()` from `next/headers` is asynchronous and must be awaited; calling it synchronously returns a Promise (not the headers store), so `.get('x-nonce')` would fail, and per the Next.js team the CSP nonce is not applied correctly without awaiting. Fixed by making each `RootLayout` an `async function` and changing `headers().get(...)` to `(await headers()).get(...)` / `await headers()`. Both occurrences were corrected.

## Review Notes
- **styled-components `StyleSheetManager nonce` prop is correct.** Initially suspected to be wrong (older versions relied on the `__webpack_nonce__` global), but styled-components v6 (6.x) does support passing `nonce` directly to `StyleSheetManager` as well as `ServerStyleSheet`. The post's usage is accurate for current versions.
- **Emotion `createCache({ nonce })`** is correct and matches Emotion's documented API.
- **`X-XSS-Protection: 1; mode=block`** is technically valid but the header is deprecated and modern guidance (OWASP) often recommends `0`, since the legacy XSS auditor introduced its own vulnerabilities. Not changed — it is not incorrect, just dated — but worth revisiting in a future update.
- **`Report-To` header / `report-to` directive** is correct but being superseded by the `Reporting-Endpoints` header in newer browsers. The post's example still works; consider mentioning `Reporting-Endpoints` in a future revision.
- **Meta-tag limitation note** (`frame-ancestors` and `report-uri` ignored in `<meta>`) is accurate.
- **Vite dev `'unsafe-eval'`** claim is reasonable; Vite serves native ESM in dev but some dependencies/source-map setups can require it, so the permissive dev policy is a sensible default.
- The Next.js middleware nonce generation (`Buffer.from(crypto.randomUUID()).toString('base64')`) and the `'strict-dynamic'` + `https:`/`http:` fallback pattern both match the official Next.js CSP guide.
