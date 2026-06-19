# Validation Summary: How to Handle Security Headers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP security headers
- Content Security Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy, and Cross-Origin-Resource-Policy
- Node.js and Express middleware
- NGINX configuration
- CSP violation reporting

## Sources Consulted
- MDN Web Docs: Content-Security-Policy header, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN Web Docs: Content Security Policy guide, https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- MDN Web Docs: CSP report-to directive, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-to
- MDN Web Docs: CSP report-uri directive, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-uri
- MDN Web Docs: Reporting-Endpoints header, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Reporting-Endpoints
- MDN Web Docs: Strict-Transport-Security header, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- MDN Web Docs: X-Frame-Options header, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- MDN Web Docs: Permissions-Policy header, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- Express body-parser middleware documentation, https://expressjs.com/en/resources/middleware/body-parser/
- Node.js HTTP documentation, https://nodejs.org/api/http.html
- NGINX ngx_http_headers_module documentation, https://nginx.org/en/docs/http/ngx_http_headers_module.html

## Issues Found
- The X-Frame-Options helper listed `ALLOW-FROM uri` as an option. MDN documents `ALLOW-FROM` as obsolete and ignored by modern browsers, so the comment now lists only `DENY` and `SAMEORIGIN` and points readers to CSP `frame-ancestors` for allowed origins.
- The Permissions-Policy helper used quoted `"'self'"` values, which generated invalid header values like `payment=('self')`. Permissions-Policy HTTP allowlists use `self` without quotes, so the defaults now produce values such as `payment=(self)`.
- The CSP reporting example described `Report-To` as the modern reporting header and used the legacy JSON endpoint mapping. Current documentation prefers `Reporting-Endpoints`, so the example now uses `Reporting-Endpoints: csp-endpoint="..."`.
- The CSP report endpoint only parsed legacy `application/csp-report` payloads. Modern Reporting API CSP reports use `application/reports+json` and an array payload with camelCase field names, so the endpoint now accepts both legacy and modern report formats.

## Review Notes
- The NGINX `add_header ... always` examples are technically correct; deployments should still account for NGINX header inheritance when adding headers in nested `server` or `location` blocks.
- The `Cross-Origin-Embedder-Policy: require-corp` example is valid, but it can break pages that depend on cross-origin resources without CORS or CORP headers.
