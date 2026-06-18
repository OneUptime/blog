# Validation Summary: How to Use Helmet for Security in Express.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express.js
- Helmet
- HTTP security headers
- Content Security Policy
- Strict-Transport-Security

## Sources Consulted
- Helmet official documentation: https://helmetjs.github.io/
- Helmet 8.2.0 npm package types and implementation: https://registry.npmjs.org/helmet/-/helmet-8.2.0.tgz
- Express 5 API reference: https://expressjs.com/en/5x/api/
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- MDN Content-Security-Policy documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN Content-Security-Policy report-uri documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-uri
- MDN X-Frame-Options documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- Security Headers scanner: https://securityheaders.com/
- MDN HTTP Observatory: https://observatory.mozilla.org/

## Issues Found
- The post said `app.use(helmet())` sets 15 security headers. Helmet's current official documentation says it sets 13 HTTP response headers, so this was corrected to 13.
- The X-Frame-Options example used the older `frameguard` option name. Helmet 8.2.0 still supports it as a compatibility alias, but the current documented option is `xFrameOptions`, so the example was updated.
- The X-Frame-Options example was missing a comma after `frameAncestors: ["'self'"]`, making the JavaScript snippet syntactically invalid. The comma was added.
- The API configuration example used the older `hidePoweredBy` option name. Helmet 8.2.0 still supports it as a compatibility alias, but the current documented option is `xPoweredBy`, so the example was updated.
- The Cross-Origin-Opener-Policy comment omitted the current `noopener-allow-popups` policy value. The comment was updated.
- The Cross-Origin-Embedder-Policy comment listed `false` as a `policy` value and described the header as controlling who can embed the page. `false` disables the Helmet middleware option, not the `policy` value; the documented policy values include `require-corp`, `credentialless`, and `unsafe-none`. The comment and description were corrected.

## Review Notes
The examples are written for current Helmet behavior as of Helmet 8.2.0. `report-uri` is still supported for CSP reporting but is deprecated in CSP Level 3 in favor of `report-to`; the existing example remains technically valid.
