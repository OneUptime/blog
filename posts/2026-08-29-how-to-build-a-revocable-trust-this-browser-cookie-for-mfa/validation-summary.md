# Validation Summary: How to Build a Revocable “Trust This Browser” Cookie for MFA

## Status
validated

## Post Type
Technical security implementation guide

## Technologies Covered
- Multi-factor authentication (MFA) and trusted-browser credentials
- HTTP cookies and `Set-Cookie` attributes (`Secure`, `HttpOnly`, `SameSite`, `Max-Age`, and `__Host-`)
- Cryptographically secure random token generation, HMAC verification, and constant-time comparison
- Server-side token storage, rotation, expiry, revocation, and security generations
- Session management, session fixation defenses, risk-based authentication, and step-up authentication
- NIST authentication assurance levels and session reauthentication
- WebAuthn single-device and syncable credentials

## Sources Consulted
- [NIST SP 800-63B-4 final publication](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- [NIST SP 800-63B-4: Authentication Assurance Levels](https://pages.nist.gov/800-63-4/sp800-63b/aal/)
- [NIST SP 800-63B-4: Authenticator Requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [NIST SP 800-63B-4: Session Management and Browser Cookies](https://pages.nist.gov/800-63-4/sp800-63b/session/)
- [NIST SP 800-63B-4: Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/syncable/)
- [RFC 6265: HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)
- [IETF draft-ietf-httpbis-rfc6265bis-22](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22)
- [W3C Web Authentication: An API for Accessing Public Key Credentials — Level 3](https://www.w3.org/TR/webauthn-3/)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Issues Found
- The NIST discussion omitted the narrow AAL2 reauthentication exception for an existing session after its inactivity timeout but before its overall timeout. The text now states that exception and clarifies that the long-lived trust token cannot be counted as an MFA factor or used to establish a new AAL2 session.
- The successful-login guidance did not explicitly constrain the new session's assurance level. It now states that the session cannot have higher assurance than the authentication event and that a password-plus-trust-cookie login must not be labeled AAL2.
- The WebAuthn sentence implied that all WebAuthn credentials are device-bound. It now distinguishes phishing resistance from device binding and requires an appropriate backup-eligibility and attestation policy when device binding is required.
- The self-contained-token revocation sentence said that every application request must check revocation state. Only each presentation of the trusted-browser token needs that check for future login revocation, so the wording now says “each token presentation.”
- “Interactive step-up” was ambiguous about whether MFA was required for sensitive actions. It now says “interactive MFA step-up.”
- The reference label called `draft-ietf-httpbis-rfc6265bis-22` an RFC even though it is still an Internet-Draft. The label now identifies it correctly as an IETF draft.

## Review Notes
The selector/validator construction, entropy, keyed verifier, authoritative user binding, and constant-time comparison are sound. The `Set-Cookie` example is syntactically valid; `Max-Age=1209600` is 14 days, and the documented `__Host-`, `Secure`, `HttpOnly`, and `SameSite` behavior is accurate. Server-side expiry, validator rotation, factor-generation revocation, session-ID rotation, XSS and CSRF caveats, and risk-signal guidance are also technically correct. The RFC6265bis draft is in the RFC publication process, so its citation should be updated to the published RFC after publication.
