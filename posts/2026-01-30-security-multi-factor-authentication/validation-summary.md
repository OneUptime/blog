# Validation Summary: How to Implement Multi-Factor Authentication

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- TOTP (RFC 6238) — Time-based One-Time Passwords
- WebAuthn / Passkeys
- Node.js (server-side examples)
- `otplib` (npm) — TOTP generation/verification
- `qrcode` (npm) — QR code generation
- `bcrypt` (npm) — password/code hashing
- `@simplewebauthn/server` and `@simplewebauthn/browser` — WebAuthn implementation
- `ioredis` — Redis client for rate limiting and replay protection
- Node.js `crypto` module — AES-256-GCM encryption
- React (enrollment UI example)
- MongoDB-style queries (`db.collection().findOne/updateOne`)

## Sources Consulted
- RFC 6238 (TOTP: Time-Based One-Time Password Algorithm) — https://datatracker.ietf.org/doc/html/rfc6238
- RFC 4226 (HOTP) — https://datatracker.ietf.org/doc/html/rfc4226
- otplib documentation — https://github.com/yeombora/otplib (API for `authenticator.generateSecret`, `keyuri`, `verify`, `options`)
- node-qrcode documentation — https://github.com/soldair/node-qrcode (`toDataURL`, `toString` options)
- SimpleWebAuthn docs — https://simplewebauthn.dev/docs/ (API for `generateRegistrationOptions`, `verifyRegistrationResponse`, `generateAuthenticationOptions`, `verifyAuthenticationResponse`)
- Node.js crypto docs — https://nodejs.org/api/crypto.html (AES-GCM API)
- ioredis docs — https://github.com/redis/ioredis
- W3C WebAuthn spec — https://www.w3.org/TR/webauthn-2/
- COSE Algorithm Identifiers — IANA / RFC 9053 (ES256 = -7, RS256 = -257)
- Twilio Authy end-of-life announcement (consumer mobile apps sunset Aug 2024)

## Issues Found

1. **Outdated authenticator app reference (Authy).** The post listed "Google Authenticator, Authy, and 1Password" as example TOTP apps. Twilio discontinued the Authy consumer mobile apps in August 2024, so by the post's publication date the recommendation is inaccurate.
   - **Fix:** Replaced "Authy" with "Microsoft Authenticator" in the TOTP intro paragraph.

2. **`@simplewebauthn/server` API mismatch with latest releases.** The post's WebAuthn examples use the pre-v10 API shape (`verification.registrationInfo.credentialPublicKey` / `credentialID`, `userID` as a string, `authenticator` parameter on `verifyAuthenticationResponse`). SimpleWebAuthn v10+ restructured these (now `verification.registrationInfo.credential.{id,publicKey,counter}`, `userID` as `Uint8Array`, and `credential` parameter on `verifyAuthenticationResponse`). An installer running `npm install @simplewebauthn/server` today would pick up the newer major and the code would not work.
   - **Fix:** Pinned the install command to `@simplewebauthn/server@^9 @simplewebauthn/browser@^9` so the example matches a release line where the shown API is correct. Updating the code to the v10+ API would require restructuring multiple call sites; pinning is the minimal accurate change.

3. **Logic bug in `completeRecovery`.** The function looked up the recovery token with `db.collection('recovery_tokens').findOne({ expiry: { $gt: new Date() }, used: false })` and then `bcrypt.compare`d the user-supplied token against `recovery.tokenHash`. Because the hashed token cannot be queried directly, `findOne` returns an arbitrary active recovery (possibly belonging to a different user), so a legitimate user's token would frequently fail verification while another user's record happens to be returned.
   - **Fix:** Changed the query to fetch all active candidates with `.find(...).toArray()` and loop through them with `bcrypt.compare` until a match is found, then proceed with the matched recovery record.

## Review Notes

- **AES-GCM IV size:** The encryption example uses a 16-byte (128-bit) IV. NIST SP 800-38D recommends a 96-bit (12-byte) IV for GCM. Node's `createCipheriv` accepts non-standard IV sizes and the example is functionally correct, but a future revision should prefer `crypto.randomBytes(12)` for best-practice compliance.
- **Recovery token query scalability:** The fixed loop in `completeRecovery` iterates over all active recovery tokens. For a production system, a better pattern is to embed an opaque recovery-record ID in the email link alongside the token (e.g., `?id=<recordId>&token=<secret>`) so the lookup is `findOne({_id: recordId})` followed by a single `bcrypt.compare`. The blog's scope made the loop the smallest correct change.
- **TOTP replay key scoping:** The `verifyTotpCodeSecure` helper records `totp:${userId}:${cleanCode}` for 90 seconds. This blocks replay of the *same* code, but does not block sliding-window reuse across the 30s boundary if a code happens to be valid in two windows. Functionally adequate, and worth a follow-up note for production.
- **RFC 6238 simplification:** The `TOTP = HOTP(secret, floor(time / 30))` line is a simplification — the full formula includes a `T0` epoch (default 0). Acceptable for a tutorial-level explanation.
- **`completeRecovery` doesn't accept a `userId` parameter** — the design intentionally identifies the user via the bcrypt-matched token. That is fine for the flow shown, but worth noting that this pattern depends on a relatively small active-token set.
- The `userID` parameter in `getWebAuthnRegistrationOptions` passes `user.id` as a string — correct only for pinned v9 of `@simplewebauthn/server` (newer majors require `Uint8Array`).
