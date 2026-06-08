# Validation Summary: How to Understand Passkeys and WebAuthn

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- WebAuthn (W3C Web Authentication API)
- Passkeys (FIDO2)
- `fido2-lib` (Node.js library)
- `navigator.credentials` browser API (`create`, `get`)
- `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable`
- `PublicKeyCredential.isConditionalMediationAvailable`
- Conditional UI / `mediation: 'conditional'`
- COSE algorithm identifiers (ES256 / RS256)
- Base64URL encoding (browser `atob`/`btoa` + Node.js `Buffer`)
- Cross-device authentication / hybrid transport

## Sources Consulted
- W3C WebAuthn Level 2/3 specification — https://www.w3.org/TR/webauthn-2/ and https://w3c.github.io/webauthn/
- MDN — Web Authentication API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
- MDN — `PublicKeyCredential.isConditionalMediationAvailable` — https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/isConditionalMediationAvailable_static
- fido2-lib source on GitHub — https://github.com/webauthn-open-source/fido2-lib (`lib/main.js`)
- fido2-lib JSDoc — https://webauthn-open-source.github.io/fido2-lib/Fido2Lib.html
- IANA COSE Algorithms registry — https://www.iana.org/assignments/cose/cose.xhtml#algorithms (verified `-7` = ES256, `-257` = RS256)
- WebAuthn `autocomplete="webauthn"` token — https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill

## Issues Found
1. **Invalid `Fido2Lib` constructor option `authenticatorRequirement: "preferred"`.**
   - What was wrong: `authenticatorRequirement` is not a valid Fido2Lib option. The closest valid option is `authenticatorAttachment`, which only accepts `"platform"` or `"cross-platform"` (not `"preferred"`). Passing `authenticatorRequirement` to the constructor would either be silently ignored or throw, depending on the validation pass — the code as written does not match the documented API.
   - What was changed: Removed the `authenticatorRequirement: "preferred"` line from the Fido2Lib initialization. Omitting this lets fido2-lib default to allowing any authenticator, which matches the surrounding intent of the snippet (a general-purpose setup).
   - Why: Verified against fido2-lib's source (`lib/main.js`) and JSDoc — only `authenticatorAttachment`, `authenticatorRequireResidentKey`, and `authenticatorUserVerification` are valid authenticator-related constructor keys. The value `"preferred"` is also not accepted for `authenticatorAttachment`.

## Review Notes
- **Counter check (`newCounter <= storedCounter`)**: Technically correct per WebAuthn Level 2 §7.2, but in practice many modern authenticators — notably Apple's iCloud-synced passkeys and most resident-key implementations — always return a signCount of `0`. The spec (W3C WebAuthn §6.1.1) explicitly states that if signCount is zero, the RP SHOULD perform no further checks. The post's logic would incorrectly reject every authentication from such authenticators. This is a real-world caveat worth noting in a future revision, but the code as shown is consistent with the literal reading of the spec.
- **Firefox platform-authenticator support**: The browser-support table lists "Firefox 60+ — Platform Auth: Yes". Firefox 60 (2018) added the WebAuthn API but only with USB security keys. Full platform-authenticator/passkey support (Windows Hello, macOS Touch ID, synced passkeys) didn't arrive until Firefox 122 (Jan 2024). The table is technically ambiguous (it could be read as "WebAuthn supported" rather than "platform auth supported"), so it has been left as-is, but readers targeting Firefox should verify their minimum version.
- **`userHandle` encoding in `assertionExpectations`**: The server-side `verifyAuthentication` passes `userHandle: userId` (a plain string), while the client base64url-encodes the authenticator's returned `userHandle`. fido2-lib normalizes these comparisons internally, so this works, but the asymmetry could trip up readers porting the code to other libraries (e.g., `@simplewebauthn/server`).
- **COSE algorithm IDs `[-7, -257]`**: Verified against the IANA COSE Algorithms registry — `-7` is ES256, `-257` is RS256. Correct.
- **`autocomplete="username webauthn"`**: Correct token combination per the HTML spec; required for conditional UI to surface passkeys in the autofill dropdown.
