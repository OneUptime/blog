# Validation Summary: How to Configure Content Security Policy (CSP)

## Status
validated

## Post Type
Tutorial / practical implementation guide

## Technologies Covered
- Content Security Policy (CSP)
- HTTP security headers
- Node.js / Express
- Helmet
- Nginx
- Apache httpd mod_headers
- CSP Reporting API
- Google Analytics / Google Tag Manager
- Stripe Checkout
- Google reCAPTCHA

## Sources Consulted
- MDN Web Docs: Content Security Policy guide - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- MDN Web Docs: Content-Security-Policy header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN Web Docs: Content-Security-Policy report-uri directive - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-uri
- MDN Web Docs: Content-Security-Policy report-to directive - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-to
- MDN Web Docs: Reporting-Endpoints header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Reporting-Endpoints
- MDN Web Docs: X-XSS-Protection header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- Helmet documentation: Content-Security-Policy middleware - https://helmetjs.github.io/
- Nginx documentation: ngx_http_headers_module - https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Apache HTTP Server documentation: mod_headers - https://httpd.apache.org/docs/current/mod/mod_headers.html
- Stripe documentation: Integration security guide / Content Security Policy - https://docs.stripe.com/security/guide
- Google Tag Platform documentation: Use Tag Manager with a Content Security Policy - https://developers.google.com/tag-platform/security/guides/csp
- Google reCAPTCHA documentation: FAQ / CSP guidance - https://developers.google.com/recaptcha/docs/faq
- OWASP Secure Headers Project - https://owasp.org/www-project-secure-headers/

## Issues Found
- The post described `default-src` as a fallback for all resource types. Updated the wording to "fetch directives" because directives such as `frame-ancestors`, `base-uri`, and `form-action` do not fall back to `default-src`.
- The post stated that inline scripts and styles are blocked by default in CSP. Clarified that this applies when a restrictive CSP is present and inline content is not allowed by nonce, hash, or `'unsafe-inline'`.
- The third-party integration example labeled Stripe sources as Stripe Checkout but used `js.stripe.com` and `api.stripe.com`. Updated the example to use the official Stripe Checkout CSP sources for `script-src`, `frame-src`, and `connect-src`.
- The Nginx example recommended `X-XSS-Protection: 1; mode=block`. Updated it to `X-XSS-Protection: 0` with a short comment because the header is deprecated and current OWASP guidance recommends disabling legacy browser XSS filters and relying on CSP instead.

## Review Notes
The CSP examples are intentionally illustrative and still need application-specific tuning before production use. The reporting section correctly covers both legacy `report-uri` and modern `report-to`; using both can improve compatibility with older browsers.
