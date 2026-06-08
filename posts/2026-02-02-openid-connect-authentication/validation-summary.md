# Validation Summary: How to Implement OIDC Authentication

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenID Connect (OIDC) 1.0
- OAuth 2.0 (RFC 6749)
- PKCE (RFC 7636)
- JSON Web Tokens (JWT) (RFC 7519)
- Node.js (`crypto`, `fetch`)
- `jsonwebtoken` library
- `jwks-rsa` library
- Express.js + `express-session`
- `connect-redis` and `redis` v4 client
- Token Revocation (RFC 7009)
- OIDC Discovery (`.well-known/openid-configuration`)
- OIDC RP-Initiated Logout 1.0

## Sources Consulted
- OpenID Connect Core 1.0 — https://openid.net/specs/openid-connect-core-1_0.html (esp. §3.1 Authorization Code Flow, §5.3 UserInfo Endpoint, §15 Discovery)
- OpenID Connect Discovery 1.0 — https://openid.net/specs/openid-connect-discovery-1_0.html
- OpenID Connect RP-Initiated Logout 1.0 — https://openid.net/specs/openid-connect-rpinitiated-1_0.html
- RFC 6749 (OAuth 2.0 Authorization Framework)
- RFC 7636 (PKCE) — code verifier length 43–128 chars after base64url; `S256` is `BASE64URL(SHA256(verifier))`
- RFC 7009 (OAuth 2.0 Token Revocation)
- RFC 7519 (JSON Web Token)
- Node.js `crypto` docs — `randomBytes().toString('base64url')` and `createHash('sha256').digest('base64url')` (added in Node 16)
- `jsonwebtoken` README — `jwt.verify(token, key, { issuer, audience, algorithms })` semantics
- `jwks-rsa` README — `jwksClient({ jwksUri, cache, cacheMaxAge, rateLimit, jwksRequestsPerMinute })` and `getSigningKey(kid)` API
- `connect-redis` v7+ docs — `require('connect-redis').default` import shape
- `express-session` docs — secure cookie options, `req.sessionID`

## Issues Found
- **UserInfo `sub` claim was not actually verified against the ID Token `sub`** in the `enrichUserProfile` example (`posts/2026-02-02-openid-connect-authentication/README.md`). The comment said "Ensure sub claim matches" but the code only overwrote `id` with `userInfo.sub` without comparing. Per OIDC Core 1.0 §5.3.2, this comparison is mandatory and the UserInfo response must be rejected on mismatch. Added an explicit equality check that throws when the values disagree, and updated the surrounding comments to reference the spec.

## Review Notes
- The `code_verifier` is derived from `crypto.randomBytes(64)` → base64url (~86 chars), comfortably within the RFC 7636 43–128 character range. ✓
- `code_challenge_method=S256` is correctly used instead of the discouraged `plain`. ✓
- ID Token validation correctly verifies signature (via JWKS), issuer, audience, expiration (implicit in `jwt.verify`), and nonce. Restricting to `RS256`/`RS384`/`RS512` is a sensible algorithm allowlist (defends against `alg=none` and HS256 confusion attacks). ✓
- The Redis v4 client requires `await redisClient.connect()` to be awaited before use; the example calls `redisClient.connect()` without `await`. In practice this can race with the first session read but is a very common pattern in introductory snippets — left as-is to avoid reshaping the example.
- The standalone `callback-handler.js` example uses `req.sessionId` (lowercase) while the integrated Express example correctly uses `req.sessionID`. The standalone file is presented as a framework-agnostic sketch with its own session store interface, so this was left as-is.
- `sessionStore.clearAuthState(...)` in the standalone callback example is a method not defined elsewhere in the post; it's clearly illustrative of "clear the temporary auth state" semantics, not a reference to a real API. Acceptable in context.
- The test snippet uses `await expect(...).to.be.rejectedWith(...)` which requires `chai-as-promised`, not imported in the example. The tests are illustrative of intent rather than runnable as-shown.
- The "CORS Issues" troubleshooting note ("OIDC token endpoints do not support CORS") is contextually fine for this post (a server-side confidential-client flow with `client_secret`). For SPAs many modern IdPs (Auth0, Okta, Azure AD) do enable CORS on token endpoints — but that's outside the post's scope.
- The `profile` scope row in the Common OIDC Scopes table lists `name`, `family_name`, `given_name`, `picture`. OIDC Core 1.0 §5.4 actually defines a longer set (also `middle_name`, `nickname`, `preferred_username`, `profile`, `website`, `gender`, `birthdate`, `zoneinfo`, `locale`, `updated_at`). The table is abbreviated but not incorrect.
- The `end_session_endpoint` parameters used (`id_token_hint`, `post_logout_redirect_uri`, `client_id`) all match the RP-Initiated Logout 1.0 spec. ✓
