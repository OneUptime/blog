# Validation Summary: How to Understand OAuth 2.0 Flow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OAuth 2.0 (RFC 6749)
- PKCE (RFC 7636)
- OpenID Connect (OIDC)
- JSON Web Tokens (JWT, RFC 7519) / JWS base64url encoding (RFC 7515)
- Node.js / Express
- axios HTTP client
- Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`)
- Fetch API / `URLSearchParams`

## Sources Consulted
- RFC 6749 — The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- RFC 6750 — OAuth 2.0 Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750
- RFC 7636 — Proof Key for Code Exchange (PKCE): https://datatracker.ietf.org/doc/html/rfc7636
- RFC 7515 — JSON Web Signature (base64url encoding): https://datatracker.ietf.org/doc/html/rfc7515#section-2
- RFC 7519 — JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- RFC 8628 — OAuth 2.0 Device Authorization Grant: https://datatracker.ietf.org/doc/html/rfc8628
- OpenID Connect Core 1.0 (scopes, `offline_access`): https://openid.net/specs/openid-connect-core-1_0.html
- axios documentation on `application/x-www-form-urlencoded` requests: https://axios-http.com/docs/urlencoded
- MDN: `WindowOrWorkerGlobalScope.atob()` (standard base64 only): https://developer.mozilla.org/en-US/docs/Web/API/atob

## Issues Found

1. **Token exchange request would send JSON instead of form-urlencoded** (Authorization Code Flow, Node.js example).
   - The original code passed a plain JavaScript object to `axios.post()` with `Content-Type: application/x-www-form-urlencoded`. axios does not auto-convert objects to URL-encoded form data when this header is set — it still serializes the body as JSON, which violates RFC 6749 §4.1.3 (the token endpoint requires `application/x-www-form-urlencoded`).
   - Fix: Wrap the body in `new URLSearchParams({...})` so axios sends real form-encoded data matching the declared `Content-Type`. Added a brief comment explaining why.

2. **JWT decoder used `atob()` directly on base64url segments.**
   - Per RFC 7515 §2, JWS/JWT segments are base64url-encoded (uses `-` and `_` instead of `+` and `/`, padding stripped). Browser `atob()` only accepts standard base64 and rejects the `-`/`_` characters — the decoder would throw on many real-world JWTs.
   - Fix: Added a small `base64UrlDecode` helper that swaps `-`→`+` and `_`→`/` and re-adds padding before calling `atob`. Used it for both the header and payload segments.

## Review Notes
- The Authorization Code Flow example calls a `refreshAccessToken(req)` function that is referenced but not defined within the snippet. It reads as illustrative pseudocode within a larger example, so I left it as-is rather than expanding the snippet — but a future revision could either define the function or call it out as a placeholder for clarity.
- The PKCE code verifier is generated from 32 random bytes, which base64url-encodes to exactly 43 characters — the minimum length permitted by RFC 7636 §4.1. Technically valid, though using slightly more entropy (e.g., 48–64 bytes) would give more headroom.
- The post recommends `sameSite: 'lax'` for the access-token cookie. `'lax'` is reasonable for most apps, but `'strict'` is stronger when no cross-site navigation needs to carry the cookie; the choice is a deliberate trade-off and the current value is defensible.
- The Resource Owner Password Credentials grant and the Implicit grant are (correctly) omitted; both are discouraged in OAuth 2.0 Security Best Current Practice and OAuth 2.1.
- All listed OAuth error codes (`invalid_client`, `invalid_grant`, `invalid_scope`, `access_denied`, `invalid_request`) match RFC 6749 §5.2 / §4.1.2.1.
- All Mermaid diagrams accurately reflect the corresponding flows.
