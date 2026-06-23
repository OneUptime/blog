# Validation Summary: What is PKCE and Why Your OAuth Implementation Needs It

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OAuth 2.0 authorization code flow
- PKCE (Proof Key for Code Exchange)
- OAuth 2.0 Security Best Current Practice
- OAuth 2.1 draft
- JavaScript Web Crypto API
- Browser sessionStorage
- Node.js crypto randomBytes
- Base64url encoding

## Sources Consulted
- RFC 7636: Proof Key for Code Exchange by OAuth Public Clients - https://datatracker.ietf.org/doc/html/rfc7636
- RFC 9700: Best Current Practice for OAuth 2.0 Security - https://datatracker.ietf.org/doc/rfc9700/
- OAuth 2.1 draft-ietf-oauth-v2-1-15 - https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-15
- MDN: Crypto.getRandomValues() - https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
- MDN: SubtleCrypto.digest() - https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- Node.js Crypto API: randomBytes - https://nodejs.org/api/crypto.html#cryptorandombytessize-callback

## Issues Found
- The initial JavaScript verifier example called `base64URLEncode()` without defining it. Added a small helper so the example is self-contained and runnable.
- The common interception-vector diagram listed network interception. OAuth authorization-server communication is TLS-protected, while RFC 7636 focuses on redirect-path interception and request/response leakage. Changed this to OS or log leakage.
- The PKCE transformation diagram text used `SHA256(...)` without showing base64url encoding. Updated it to `BASE64URL(SHA256(...))`.
- The OAuth 2.1 and RFC 9700 guidance was imprecise. Updated the server-side application guidance, BCP language, timeline, and closing sentence to reflect RFC 9700's public-client requirement/confidential-client recommendation and the current OAuth 2.1 draft's default PKCE requirement for authorization code clients.
- The `plain` method was described as providing only minimal improvement. Clarified that it protects only the narrower response-observation case and is not adequate when the authorization request can be observed.
- The complete SPA example generated a `state` value but did not store or validate it. Updated the example to store state in `sessionStorage`, validate the returned state before token exchange, and clear both the verifier and state after use.

## Review Notes
The JavaScript examples were syntax-checked with Node.js and the verifier/challenge generation was exercised with Web Crypto-compatible APIs. The provider-support table is broadly accurate but links only to documentation home pages; future revisions could link directly to each provider's PKCE-specific documentation.
