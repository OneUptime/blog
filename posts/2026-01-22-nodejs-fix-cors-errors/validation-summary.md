# Validation Summary: How to Fix CORS Errors in Node.js Express

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- Express `cors` middleware
- Browser CORS / Fetch behavior
- HTTP CORS headers
- curl

## Sources Consulted
- Express `cors` middleware documentation: https://expressjs.com/en/resources/middleware/cors/
- Express 5 migration guide, path route matching syntax: https://expressjs.com/en/guide/migrating-5/
- MDN Web Docs, Cross-Origin Resource Sharing: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs, CORS-safelisted request header: https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header
- WHATWG Fetch Standard: https://fetch.spec.whatwg.org/

## Issues Found
- The explanation of why CORS exists overstated CORS as preventing malicious sites from making requests to an API. CORS is enforced by browsers and primarily controls whether frontend JavaScript can read cross-origin responses; it is not API access control. Updated the wording to clarify this.
- The preflight explanation omitted `Range` from the CORS-safelisted request headers. Added `Range` to match current Fetch/MDN documentation.
- The catch-all `app.options('*', ...)` example is outdated for current Express 5 string route matching, where wildcard `*` must be named. Updated it to `app.options('/{*splat}', ...)`.
- The production-only CORS issue claimed localhost works without CORS because it is same-origin. That is only true in some development setups, since different localhost ports are different origins. Updated the wording to mention same-origin proxies and non-browser tools.

## Review Notes
The `cors` middleware examples use supported option names (`origin`, `methods`, `allowedHeaders`, `exposedHeaders`, `credentials`, and `maxAge`) and match the official middleware documentation. The security guidance correctly warns against wildcard origins with credentials. Future improvements could mention that CORS does not protect APIs from direct server-to-server requests and should be paired with authentication, authorization, CSRF protections where applicable, and cookie `SameSite` settings.
