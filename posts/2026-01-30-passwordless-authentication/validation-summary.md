# Validation Summary: How to Create Passwordless Authentication Details

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Magic Link authentication (Node.js, crypto module, nodemailer, express-rate-limit)
- WebAuthn / FIDO2 (W3C Web Authentication API)
- Passkeys (discoverable / resident credentials, conditional UI / autofill)
- `@simplewebauthn/server` library (server-side WebAuthn ceremony helpers)
- `navigator.credentials.create()` / `navigator.credentials.get()` browser APIs
- `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` and `PublicKeyCredential.isConditionalMediationAvailable()`
- PostgreSQL (database schema with UUID, BYTEA, TEXT[])
- Express.js (route handlers and rate limiting)

## Sources Consulted
- W3C Web Authentication Level 3 spec — https://www.w3.org/TR/webauthn-3/
- SimpleWebAuthn documentation — https://simplewebauthn.dev/docs/packages/server
- SimpleWebAuthn server source on GitHub — https://github.com/MasterKale/SimpleWebAuthn (verifyRegistrationResponse, verifyAuthenticationResponse, generateRegistrationOptions)
- MDN: Web Authentication API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
- MDN: PublicKeyCredential — https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential
- MDN: CredentialsContainer.get() (mediation values) — https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/get
- WHATWG HTML: autocomplete attribute (`username webauthn` token)
- passkeys.dev developer guidance for conditional UI and discoverable credentials

## Issues Found
The post's `@simplewebauthn/server` examples used the pre-v10 API, which has been replaced by a substantially different shape in current releases. The following corrections were applied to the post:

1. **`verifyRegistrationResponse` return shape (`registrationInfo`).**
   - Before: destructured `{ credentialPublicKey, credentialID, counter }` directly off `registrationInfo`.
   - After: now destructures `{ credential }` and reads `credential.id` (base64url string), `credential.publicKey` (Uint8Array), `credential.counter`, and `credential.transports`, matching the current `RegistrationInfo` type.

2. **`verifyAuthenticationResponse` parameter rename.**
   - Before: passed an `authenticator: { credentialPublicKey, credentialID, counter }` object.
   - After: now passes `credential: { id, publicKey, counter, transports }`, which is the current parameter name and field shape.

3. **`generateRegistrationOptions` `userID` type.**
   - Before: passed `userID: user.id` (a string), which is rejected by v11+ ("String values for `userID` are no longer supported").
   - After: encodes via `new TextEncoder().encode(user.id)` to produce a `Uint8Array`. The passkey-specific registration example was updated the same way.

4. **Module import style.**
   - Before: `const { ... } = require('@simplewebauthn/server')`. The package is ESM-only in current versions, so `require()` fails.
   - After: switched to `import { ... } from '@simplewebauthn/server'`.

5. **Deprecated `requireResidentKey` flag in passkey options.**
   - Before: set both `residentKey: 'required'` and the legacy `requireResidentKey: true`.
   - After: removed `requireResidentKey`; `residentKey: 'required'` is the modern field and is what SimpleWebAuthn forwards to the authenticator. A clarifying comment notes that "resident" and "discoverable" are the same thing.

6. **`excludeCredentials` / `allowCredentials` entry shape.**
   - Before: each entry included `type: 'public-key'`.
   - After: removed `type`, which is no longer required by the SimpleWebAuthn types (the library injects it). Kept `id` and `transports`.

7. **Credential ID storage/lookup consistency.**
   - The new API surfaces `credential.id` as a base64url string. Previously the code converted it to a `Buffer` for storage but then looked it up the same way during authentication. To keep the example internally consistent, the post now stores the base64url string and looks it up directly with `response.id` (which is also base64url). The SQL schema was updated to match: `credential_id TEXT UNIQUE NOT NULL` (with an inline comment) instead of `BYTEA`.

8. **Counter column width.**
   - Changed `counter INTEGER` to `counter BIGINT` in the SQL schema. The WebAuthn `signCount` is a `uint32`, which can exceed PostgreSQL's signed `INTEGER` range (2^31 − 1). `BIGINT` is the safe choice.

9. **Passkey verification user handle decoding.**
   - The passkey verification example treated `userHandle` as if `.toString()` on a Buffer would yield the original UUID. That happens to produce a UTF-8 decode, but is implicit. Replaced with `new TextDecoder().decode(Buffer.from(userId, 'base64url'))` so the round-trip from `TextEncoder().encode(user.id)` at registration time is explicit and symmetric.

Conceptual claims about the protocols themselves (challenge–response flow, public-key cryptography, replay-prevention via signature counter, discoverable credentials, conditional mediation/autofill, RP ID origin binding, HTTPS requirement except for localhost, magic-link token entropy/expiry/one-time-use guidance) were verified against the W3C WebAuthn spec, MDN, and passkeys.dev and are accurate.

## Review Notes
- The post is library-version-agnostic in tone but pins itself to `@simplewebauthn/server` v10+ now that the API has been updated. If a future major release of SimpleWebAuthn changes shapes again, this section will need another pass.
- `assertion.response.userHandle` can in principle be `null` for non-discoverable authentication; the regular WebAuthn client example correctly guards for this, while the passkey example does not. For passkeys this is fine in practice (discoverable credentials always set the user handle), so it was left as-is.
- The `verifyPasskeyAuthentication` example deliberately stops at "Verify and create session..." with a "Same as regular WebAuthn verification" comment. That is presentational, not a technical defect.
- The `keyGenerator` in `express-rate-limit` v7+ may need to return a string consistently (and `req.body.email` could be undefined for malformed requests). The examples assume a body parser is mounted earlier in the middleware chain; this is a typical Express assumption and was not changed.
- Browser-side base64url helpers (`atob`/`btoa` based) work but cannot handle very large credential blobs efficiently. Modern alternatives (`Uint8Array.fromBase64`) are now Stage 4 in TC39 but are not yet universally available, so the polyfill-style helpers in the post remain the safer choice for now.
- `autocomplete="username webauthn"` is the correct token for conditional UI; the `webauthn` token is defined by the WebAuthn spec and accepted by all major browsers that support conditional mediation.
