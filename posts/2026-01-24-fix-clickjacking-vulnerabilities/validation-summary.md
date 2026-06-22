# Validation Summary: How to Fix 'Clickjacking' Vulnerabilities

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Clickjacking defenses
- HTTP security headers
- X-Frame-Options
- Content-Security-Policy frame-ancestors
- Node.js/Express
- Helmet
- Nginx
- Apache
- Python/Flask
- React
- reCAPTCHA
- curl

## Sources Consulted
- MDN Web Docs: X-Frame-Options header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- MDN Web Docs: Content-Security-Policy frame-ancestors directive - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- MDN Web Docs: Clickjacking - https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking
- OWASP Cheat Sheet Series: Clickjacking Defense Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
- OWASP Secure Headers Project - https://owasp.org/www-project-secure-headers/
- Helmet.js documentation - https://helmetjs.github.io/
- Nginx ngx_http_headers_module documentation - https://nginx.org/en/docs/http/ngx_http_headers_module.html
- MDN Web Docs: X-XSS-Protection header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- MDN Web Docs: Sec-Fetch-Dest header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Dest
- W3C Fetch Metadata Request Headers - https://www.w3.org/TR/fetch-metadata/
- Google Developers: Verifying the user's reCAPTCHA response - https://developers.google.com/recaptcha/docs/verify

## Issues Found
- Corrected the opening clickjacking description to describe the target site being loaded in an invisible iframe under deceptive page content, instead of saying attackers place malicious buttons over the protected site's UI.
- Replaced the obsolete Helmet `frameguard` option with the current `xFrameOptions` option.
- Marked `X-Frame-Options: ALLOW-FROM` as obsolete in the comparison diagram and removed it from the Nginx partner embedding example. Modern browsers ignore `ALLOW-FROM`; CSP `frame-ancestors` is the correct way to allow specific external embedding origins.
- Changed `X-XSS-Protection "1; mode=block"` to `X-XSS-Protection "0"` in Nginx examples because the header is deprecated and OWASP/MDN recommend using CSP instead of enabling legacy XSS filters.
- Fixed the JavaScript frame-busting example so it redirects using `location.href` and no longer hides `document.body` before appending the warning UI.
- Updated the Flask example to tolerate missing or invalid JSON with `request.get_json(silent=True) or {}`.
- Removed the misleading `Sec-Fetch-Dest == 'iframe'` API check as a clickjacking defense for same-origin framed page actions, and replaced it with a note to use `frame-ancestors` plus normal CSRF and authorization checks.
- Fixed the clickjacking test page overlay so the decoy layer does not intercept clicks before they reach the iframe.

## Review Notes
The main defense guidance is technically sound: use CSP `frame-ancestors` for modern browsers and `X-Frame-Options` for legacy coverage. The JavaScript frame-busting examples are acceptable as defense in depth, but headers remain the primary protection. The CAPTCHA and confirmation examples are illustrative hardening measures and should not be treated as replacements for correct frame protection headers.
