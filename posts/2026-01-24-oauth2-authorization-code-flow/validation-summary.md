# Validation Summary: How to Handle OAuth2 Authorization Code Flow

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OAuth2 Authorization Code flow
- PKCE (Proof Key for Code Exchange, RFC 7636)
- Python (Flask, `requests`, `secrets`, `hashlib`, `base64`)
- Node.js (Express, `crypto`, `axios`, `querystring`)
- Redis-backed Flask sessions (`flask_session`)
- OpenID Connect scopes (`openid`, `profile`, `email`)

## Sources Consulted
- RFC 6749 — The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- RFC 7636 — Proof Key for Code Exchange by OAuth Public Clients: https://datatracker.ietf.org/doc/html/rfc7636
- OAuth 2.0 Security Best Current Practice (RFC 9700 / draft): https://datatracker.ietf.org/doc/html/rfc9700
- Python `secrets` module documentation: https://docs.python.org/3/library/secrets.html
- Python `hashlib` / `base64` documentation: https://docs.python.org/3/library/hashlib.html
- Node.js `crypto` documentation (`base64url` encoding, added v14.18): https://nodejs.org/api/crypto.html
- Flask / Flask-Session documentation: https://flask-session.readthedocs.io/

## Issues Found
- **Missing `import time` in the basic `auth.py` example.** The basic (non-PKCE) Flask example calls `time.time()` to compute `session['token_expires_at']` in the callback, but its import block did not import `time`, which would raise `NameError: name 'time' is not defined` at runtime. Added `import time` to the import block. (The PKCE variant `auth_pkce.py` already imported `time` correctly, confirming this was an omission specific to the first snippet.)

## Review Notes
- PKCE handling is correct per RFC 7636: `code_challenge = BASE64URL-ENCODE(SHA256(code_verifier))` with padding stripped, and `code_challenge_method=S256`. The verifier from `secrets.token_urlsafe(64)[:64]` yields 64 URL-safe characters, within the required 43–128 range and using only the allowed unreserved alphabet.
- The Node.js examples use `crypto.randomBytes(...).toString('base64url')` and `.digest('base64url')`, which are valid (the `base64url` encoding was added in Node.js v14.18+). Worth a version caveat for very old Node runtimes, but accurate for currently supported versions.
- State validation uses `secrets.compare_digest` in the dedicated validation helper, which is the correct constant-time comparison; the inline callbacks use plain `!=`/`!==` which is acceptable but slightly less robust — not an error.
- The token-binding example (fingerprinting on User-Agent / Accept-Language) is illustrative; such fingerprints are not strongly stable and should be treated as defense-in-depth only, as the post implies.
- Several snippets (e.g. `validate_callback_params`, token binding, error handler) are intentional fragments that rely on imports/globals defined elsewhere in the post (`secrets`, `hashlib`, `render_template`, `app`); this is normal for illustrative excerpts and not a defect.
- The `TokenManager` uses a `threading.Lock` around a request-scoped Flask `session`; this is harmless but provides limited real concurrency protection since session data is per-request — fine as a teaching example.
