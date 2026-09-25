# Validation Summary: How to Validate FIDO2 Factors for PCI DSS Remote and Admin Access

## Status

validated

## Post Type

Technical validation guide. The post contains authentication implementation details, a WebAuthn policy setting, and security test expectations, so it qualifies for technical review despite having no executable examples or terminal commands.

## Technologies Covered

- PCI DSS v4.0.1 authentication requirements, including 8.4.1, 8.4.2, 8.4.3, and 8.5.1.
- FIDO2 authenticators and synced passkeys.
- W3C WebAuthn Level 3, user presence, user verification, and relying-party validation.
- Multi-factor authentication, PINs, biometrics, enrollment, recovery, and identity-provider policies.
- Remote access, administrative access, session enforcement, and audit evidence.

## Sources Consulted

- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — verified the post's official standards-library destination. The direct v4.0.1 PDF could not be retrieved by the browsing tool; a follow-up review checked the cached v4.0.1 standard text for Requirement 8.4.2's scope and applicability notes.
- [PCI SSC FAQ 1595](https://www.pcisecuritystandards.org/faqs/1595/) — verified the treatment of FIDO2-compliant synced passkeys under Requirement 8.4.2.
- [PCI SSC FAQ 1596](https://www.pcisecuritystandards.org/faqs/1596/) — verified the additional-factor requirement for 8.4.1 and 8.4.3.
- [PCI SSC: Passwords Versus Passkeys, with the FIDO Alliance](https://blog.pcisecuritystandards.org/coffee-with-the-council-podcast-passwords-versus-passkeys-a-discussion-with-the-fido-alliance) — checked the Council's explanation of access categories and combining passkeys with another factor.
- [PCI SSC PCI DSS v4.0 SAQ C](https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-C.pdf) — inspected the published requirement text for administrative and remote access and the four MFA controls in 8.5.1. This older official document was used alongside the newer Council FAQs, not as a substitute for v4.0.1-specific passkey guidance.
- [PCI SSC FAQ 1577](https://www.pcisecuritystandards.org/faqs/1577/) — consulted the Council's console-access clarification.
- [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/) — checked authentication factor capability (§6.2.3), the user-verification requirement enumeration, credential registration (§7.1), authentication verification (§7.2), and initial user-verification trust (`uvInitialized`).
- [Author's GitHub profile](https://github.com/nawazdhandala) — verified that the author link resolves to the intended profile.

## Issues Found

- The requirement table described 8.4.2 as covering access into the CDE without explicitly limiting it to non-console access. Added that qualifier to match v4.0.1 while retaining the applicability notes.

## Review Notes

- The requirement mapping now explicitly states Requirement 8.4.2's non-console scope and preserves its applicability notes and exceptions.
- The synced-passkey exception is correctly limited to 8.4.2. The post does not incorrectly extend that exception to administrative or external remote access.
- WebAuthn supports possession plus local PIN or biometric verification within one authenticator. Presence alone does not supply the extra factor. Server validation must check the signed response, expected challenge, origin, relying-party identity, and required UV result; requesting `userVerification: "required"` in the browser is insufficient by itself.
- The enrollment caveat is appropriate: initial UV trust requires special handling. Shared authenticator access can also weaken individual attribution. The post appropriately reviews enrollment, synchronization, recovery, and fallback alongside the primary login flow.
- The bypass discussion accurately covers management approval, documentation, a limited exception period, distinct factor types, replay resistance, and completion before access.
- The test matrix and evidence collection are review recommendations, not claims that a specific product has passed testing. No identity-provider tenant, authenticator, or deployed relying party was available for runtime testing.
- There are no executable code blocks, CLI commands, complete configuration files, or library versions to test. The inline WebAuthn setting is valid. The linked WebAuthn Level 3 document identifies itself as a W3C Recommendation dated 25 August 2026.
- The post's external links resolved to the intended resources. Direct-standard PDF retrieval was unavailable during the review; the follow-up scope check used cached v4.0.1 text and live Council guidance.
