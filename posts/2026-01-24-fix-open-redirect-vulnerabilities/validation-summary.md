# Validation Summary: How to Fix 'Open Redirect' Vulnerabilities

## Status
validated

## Post Type
Tutorial / security guide

## Technologies Covered
- Node.js
- Express
- Python
- Flask
- OAuth callback handling
- URL parsing and validation
- HTTP redirects and security headers
- curl

## Sources Consulted
- OWASP Unvalidated Redirects and Forwards Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
- OWASP Open Redirect attack page: https://owasp.org/www-community/attacks/open_redirect
- Express 5.x API Reference: https://expressjs.com/en/5x/api/
- Flask 3.1 API documentation for `flask.redirect`: https://flask.palletsprojects.com/en/stable/api/
- Node.js URL API documentation: https://nodejs.org/api/url.html
- Python `urllib.parse` documentation: https://docs.python.org/3/library/urllib.parse.html
- WHATWG URL Standard: https://url.spec.whatwg.org/
- MDN `URL.hostname` documentation: https://developer.mozilla.org/en-US/docs/Web/API/URL/hostname

## Issues Found
- The fixed redirect validation examples accepted relative URLs containing backslashes, such as `/\evil.com`. In WHATWG URL parsing for special schemes like HTTP(S), backslashes are treated as URL separators in several states, so this can resolve differently than a simple path string and may become an external redirect in user agents. I updated the JavaScript and Python validation snippets to reject backslashes after decoding.
- The standalone `sanitizeUrl` example used `decodeURIComponent` in a loop without handling malformed percent encodings. That could throw and interrupt request handling instead of failing safely. I changed it to catch decoding errors and return an empty string.
- The test payload list included a backslash bypass but the comprehensive validator did not reject it before the fix. I added an encoded backslash variant (`%2F%5Cevil.com`) to the test list to match the corrected validation behavior.

## Review Notes
The remaining examples are intentionally illustrative rather than complete applications. The OAuth state example signs the redirect target, which prevents tampering, but a production OAuth implementation should also bind and verify state/nonces according to the OAuth client library or identity provider guidance. The security headers section is valid as defense in depth, but headers do not fix open redirects by themselves.
