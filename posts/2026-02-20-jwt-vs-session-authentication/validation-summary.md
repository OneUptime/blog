# Validation Summary: JWT vs Session-Based Authentication: When to Use Each

## Status
validated

## Post Type
Guide

## Technologies Covered
- JWT
- Session-based authentication
- FastAPI
- PyJWT
- Redis
- HTTP cookies
- CSRF protection
- XSS risk

## Sources Consulted
- FastAPI security tutorial for OAuth2, JWTs, and secure password hashing: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- FastAPI response cookies documentation: https://fastapi.tiangolo.com/advanced/response-cookies/
- PyJWT API and usage documentation: https://pyjwt.readthedocs.io/en/stable/api.html and https://pyjwt.readthedocs.io/en/latest/usage.html
- RFC 7519, JSON Web Token (JWT): https://datatracker.ietf.org/doc/rfc7519/
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Cross-Site Request Forgery Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- MDN SameSite cookies documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite

## Issues Found
- The session authentication example used salted SHA-256 for password hashing. That is not appropriate for password storage, so it was changed to use `pwdlib.PasswordHash.recommended()`, matching FastAPI's current security tutorial guidance.
- The JWT example used raw `time.time()` values for `iat` and `exp`. Those NumericDate values are valid under RFC 7519, but PyJWT's current examples use timezone-aware `datetime` values, so the snippet was updated to use `datetime.now(timezone.utc)` and `timedelta`.
- The session cookie comment described `SameSite=Lax` as "CSRF protection." That was too absolute, so it now says SameSite helps mitigate CSRF and that CSRF tokens should still be validated for state-changing requests.
- The comparison table said JWTs are "not vulnerable" to CSRF because they are not in cookies. That is only true for explicit Authorization header use, not cookie-stored JWTs, so the row now distinguishes those cases.
- The comparison table oversimplified XSS and cross-domain tradeoffs. It now clarifies that httpOnly cookies reduce token theft but do not neutralize XSS, local/session storage tokens are exposed to XSS, and cross-domain cookies are possible but more complex than Authorization headers.
- Removed an unused `hashlib` import from the shared security snippet.

## Review Notes
The example code still uses placeholder functions such as `lookup_user`, `authenticate_user`, and `get_user_by_id`, which is acceptable for a focused authentication-pattern guide. In a production article, refresh-token rotation and server-side refresh-token revocation could be expanded, but the current best-practice note is technically accurate.
