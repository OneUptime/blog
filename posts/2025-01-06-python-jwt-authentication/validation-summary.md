# Validation Summary: How to Handle JWT Authentication Securely in Python

## Status
validated

## Post Type
Tutorial / Guide (production-oriented security how-to with code)

## Technologies Covered
- Python (3.x)
- JWT (JSON Web Tokens) — RFC 7519
- python-jose (`jose` library) with the `cryptography` backend
- FastAPI (OAuth2PasswordBearer, dependency injection, cookies, middleware)
- asyncpg / PostgreSQL (refresh-token persistence)
- `cryptography` (RSA key generation for RS256)
- slowapi (rate limiting)
- `secrets` standard-library module

## Sources Consulted
- RFC 7519 — JSON Web Token (registered claims `exp`, `iat`, `jti`, `sub`, `nbf`): https://datatracker.ietf.org/doc/html/rfc7519
- python-jose docs & source (datetime claim handling, RSA key acceptance in the cryptography backend, `jwt.decode` verifying signature/expiry by default): https://python-jose.readthedocs.io/
- FastAPI security docs (OAuth2PasswordBearer / OAuth2PasswordRequestForm, cookies, events/lifespan): https://fastapi.tiangolo.com/tutorial/security/
- Starlette `Response.set_cookie` signature (it owns the `path` parameter): https://www.starlette.io/responses/
- Python `secrets` docs (`token_urlsafe(n)` = `n` random bytes): https://docs.python.org/3/library/secrets.html
- Python `datetime` docs (`utcnow` vs `utcfromtimestamp` vs `fromtimestamp` semantics): https://docs.python.org/3/library/datetime.html
- OWASP JWT / Session Management cheat sheets (rotation, reuse detection, HttpOnly cookies): https://cheatsheetseries.owasp.org/

## Issues Found
1. **`TypeError` from duplicate `path` keyword in the cookie example (`cookie_auth.py`).**
   `COOKIE_SETTINGS` contained `"path": "/"`, and the refresh-token cookie also passed `path="/auth/refresh"` explicitly alongside `**COOKIE_SETTINGS`. Passing `path` both explicitly and via the unpacked dict raises `TypeError: set_cookie() got multiple values for keyword argument 'path'` — the code as written would not run.
   **Fix:** Removed `"path": "/"` from `COOKIE_SETTINGS` and set `path` explicitly per-cookie (`path="/"` on the access-token cookie, the existing `path="/auth/refresh"` on the refresh-token cookie). This preserves the author's intent (refresh cookie scoped to the refresh endpoint) while making the code runnable.

2. **Timezone bug: `datetime.fromtimestamp()` used for UTC epoch claims.**
   Tokens are created with `datetime.utcnow()` (naive UTC); python-jose encodes `exp`/`iat` as UTC epoch seconds (`timegm(dt.utctimetuple())`). Decoding them back with `datetime.fromtimestamp()` interprets the epoch in the server's **local** timezone, then the code compares the result against `datetime.utcnow()`. On any server not set to UTC, this produces an incorrect expiry/issued-at comparison (tokens treated as expired early/late, or "future" detection misfiring). Affected `revoke_access_token` (blacklist expiry) and `validate_token_claims` (both `exp` and `iat` checks).
   **Fix:** Changed the three occurrences to `datetime.utcfromtimestamp()`, which matches the UTC epoch encoding and the `datetime.utcnow()` comparisons used throughout the post.

## Review Notes
- **`datetime.utcnow()` deprecation:** `datetime.utcnow()` and `datetime.utcfromtimestamp()` are deprecated as of Python 3.12 in favor of timezone-aware objects (`datetime.now(timezone.utc)` / `datetime.fromtimestamp(ts, tz=timezone.utc)`). They still function and remain internally consistent here, so I left the pervasive `utcnow()` usage intact to preserve the author's style; the corrected `utcfromtimestamp()` calls match that existing convention. A future revision could migrate the whole post to aware datetimes.
- **`@app.on_event("startup")`:** Deprecated in favor of lifespan handlers in recent FastAPI. The post already flags this inline, which is accurate; no change needed.
- **Logout-by-access-token quirk (not changed):** `/auth/logout` decodes the *access* token and calls `revoke_token(payload["jti"])` against the `refresh_tokens` table. An access-token `jti` is never stored in that table, so the `UPDATE` matches no rows and the refresh token is not actually revoked. This is a design/logic gap rather than a syntax/API error (a real implementation would also receive and revoke the refresh-token `jti`), and fixing it would require adding content/restructuring the endpoint, so it was left as-is and noted here.
- **slowapi snippet is illustrative:** The example omits the required `app.state.limiter = limiter` assignment and the `RateLimitExceeded` exception handler registration needed for slowapi to function. It correctly includes `request: Request` in the signatures. Acceptable as a conceptual snippet but not copy-paste runnable on its own.
- **Verified-correct claims:** JWT structure description; `secrets.token_urlsafe(32)` = 256 bits of entropy; python-jose accepting `datetime` objects for `exp`/`iat`; `jwt.decode` verifying signature and expiration by default; python-jose's cryptography backend accepting native `cryptography` RSA key objects for RS256; RSA 2048-bit minimum guidance; `samesite="lax"` being a valid value; `delete_cookie` needing matching paths; install command `pip install python-jose[cryptography] passlib[bcrypt]`.
