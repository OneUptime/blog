# Validation Summary: How to Build Biometric Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- WebAuthn
- FIDO2
- CTAP
- Passkeys and platform authenticators
- Node.js
- SimpleWebAuthn `@simplewebauthn/server`
- SimpleWebAuthn `@simplewebauthn/browser`

## Sources Consulted
- SimpleWebAuthn server documentation: https://simplewebauthn.dev/docs/packages/server
- SimpleWebAuthn browser documentation: https://simplewebauthn.dev/docs/packages/browser
- SimpleWebAuthn custom user IDs guide: https://simplewebauthn.dev/docs/advanced/server/custom-user-ids
- SimpleWebAuthn passkeys guide: https://simplewebauthn.dev/docs/advanced/passkeys
- MDN Web Authentication API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
- MDN Secure Contexts documentation: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts
- W3C WebAuthn Level 2 Recommendation: https://www.w3.org/TR/webauthn-2/
- FIDO Alliance specifications overview: https://fidoalliance.org/specifications/
- FIDO Alliance passkeys overview: https://fidoalliance.org/passkeys/
- web.dev user verification deep dive: https://web.dev/articles/webauthn-user-verification

## Issues Found
- Updated the frontend `startRegistration()` and `startAuthentication()` examples to use the current SimpleWebAuthn v13 object argument form with `optionsJSON`. Passing options directly is the pre-v11 call structure and is documented as outdated.
- Updated server-side SimpleWebAuthn credential storage and authentication verification from the old `credentialID`/`credentialPublicKey` and `authenticator` fields to the current `credential.id`, `credential.publicKey`, and `credential` verification argument.
- Added `isoUint8Array.fromUTF8String(userId)` for `generateRegistrationOptions()` because current SimpleWebAuthn versions no longer support string values directly for `userID`.
- Added a missing `getAuthenticationOptions()` server example using `generateAuthenticationOptions()` because the frontend login flow depends on authentication options being generated before `startAuthentication()`.
- Removed client-submitted challenge values from the frontend verification requests. The post already states challenges should be stored server-side, and verification endpoints should compare against the server-side stored challenge rather than trusting a challenge echoed by the client.
- Clarified private key wording from "never leaves the device" to "is not sent to your server" because synced passkey implementations can involve provider-managed key sync while still keeping private keys away from the relying party server.
- Clarified signature-counter wording because some platform authenticators and synced passkeys can always report `0`; counters help with clone detection but are not guaranteed to increment for every authenticator.
- Clarified the production HTTPS checklist entry to say WebAuthn requires secure contexts, with localhost as a local-development exception.
- Adjusted wording that described "fingerprint or face recognition credentials" so it correctly describes public key credentials protected by biometric user verification.

## Review Notes
The browser/platform support table is intentionally high level and should be periodically refreshed because platform authenticator availability changes across operating systems, browsers, and passkey providers.
