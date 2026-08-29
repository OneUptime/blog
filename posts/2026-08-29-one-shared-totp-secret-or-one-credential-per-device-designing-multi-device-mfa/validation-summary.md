# Validation Summary: One Shared TOTP Secret or One Credential per Device? Designing Multi-Device MFA

## Status

validated

## Post Type

Technical security design guide

## Technologies Covered

- Time-Based One-Time Passwords (TOTP) and HOTP security properties
- Multi-factor authentication and authenticator lifecycle management
- WebAuthn public-key credentials
- Device-bound credentials and synchronized passkeys
- Credential recovery, revocation, replay prevention, and rate limiting

## Sources Consulted

- [RFC 6238: TOTP: Time-Based One-Time Password Algorithm](https://datatracker.ietf.org/doc/html/rfc6238)
- [RFC 4226: HOTP: An HMAC-Based One-Time Password Algorithm](https://datatracker.ietf.org/doc/html/rfc4226)
- [NIST SP 800-63B-4: Authenticator and Verifier Requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [NIST SP 800-63B-4: Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/syncable/)
- [NIST SP 800-63B-4: Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- [W3C Web Authentication Level 3: Credential Record](https://www.w3.org/TR/webauthn-3/#credential-record)
- [W3C Web Authentication Level 3: Verifying an Authentication Assertion](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)
- [W3C Web Authentication Level 3: Credential Backup State](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)
- [FIDO Alliance Passkey Resources](https://fidoalliance.org/passkeys/)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Issues Found

- The post used “factor” for individual TOTP registrations. Multiple TOTP registrations are separate authenticators or credentials, but they all prove the same possession-factor type and do not by themselves constitute MFA. The affected wording and identifiers were changed to distinguish authenticators from factor types.
- The shared-TOTP model called its replay protection a “replay counter,” which could be confused with HOTP's moving counter. It now describes shared replay state and gives `last_accepted_step` as the TOTP example.
- Comparing one six-digit code against several independent TOTP secrets can produce a rare multi-match, making attribution and replay-state selection ambiguous. The lookup guidance now requires rejecting an ambiguous multi-match.
- The WebAuthn overview said the technology was designed around per-device credentials even though Level 3 explicitly supports both single-device and multi-device credentials. It now says that WebAuthn supports the model through independently registered single-device credentials.
- The WebAuthn assertion summary did not explicitly say to compare the returned challenge with the issued challenge and referred imprecisely to validating the RP ID. It now includes returned-challenge validation and the RP ID hash, along with the signature, expected origin, user-presence flag, and required user-verification flag.
- The credential inventory stored a WebAuthn credential ID but omitted the credential public key required to verify assertions. It now includes `credential_public_key` and the recommended `webauthn_sign_count` state.
- The synchronized-passkey revocation wording could imply that RP-side revocation deletes synced private-key copies. It now states that disabling or deleting the RP credential record prevents service authentication but does not by itself remove synchronized copies or enable per-copy revocation.
- The factor-management and recovery wording could imply that one remaining credential or one recovery method is always sufficient. It now requires fresh reauthentication and recovery-method combinations at the assurance level required by policy.
- The NIST syncable-authenticator reference pointed to a short subsection rather than the normative appendix containing the cited requirements and risks. The link now points directly to the appendix.

## Review Notes

- The post contains no executable code or terminal commands; the text block is an illustrative credential-record field list.
- WebAuthn Level 3 was checked against the W3C Recommendation published on 2026-08-25, so the post is current as of validation.
- In an implementation, update TOTP replay state atomically to prevent concurrent reuse, and retain the latest WebAuthn backup-state value because the BS flag can change across ceremonies.
- NIST and OWASP also call for user notification when authenticators are added or changed. This is a useful future addition but does not invalidate the post's current device-lifecycle analysis.
- All reference URLs and the author link resolved successfully during validation.
