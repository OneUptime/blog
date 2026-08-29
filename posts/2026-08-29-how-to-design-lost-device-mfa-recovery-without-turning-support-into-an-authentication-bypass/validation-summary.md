# Validation Summary: How to Design Lost-Device MFA Recovery Without Turning Support into an Authentication Bypass

## Status

validated

## Post Type

Technical security architecture and implementation guide

## Technologies Covered

- Multi-factor authentication (MFA) and account recovery
- NIST SP 800-63B-4 identity and authentication assurance requirements
- WebAuthn authenticators and passkeys
- Saved and issued recovery codes
- TOTP/OTP authenticators
- Recovery state machines, constrained sessions, session revocation, and audit controls

## Sources Consulted

- [NIST SP 800-63B-4 final publication record](https://csrc.nist.gov/pubs/sp/800/63/B/4/final)
- [NIST SP 800-63B-4: Account Recovery](https://pages.nist.gov/800-63-4/sp800-63b.html#recovery)
- [NIST SP 800-63B-4: Recovery at AAL2](https://pages.nist.gov/800-63-4/sp800-63b.html#recovery-at-aal2)
- [NIST SP 800-63B-4: Loss, Theft, Damage, and Compromise](https://pages.nist.gov/800-63-4/sp800-63b.html#loss-theft-damage-and-compromise)
- [NIST SP 800-63B-4: Account Notifications](https://pages.nist.gov/800-63-4/sp800-63b.html#notification)
- [OWASP Multifactor Authentication Cheat Sheet: Resetting MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html#resetting-mfa)
- [OWASP Multifactor Authentication Cheat Sheet: Changing MFA Factors](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html#changing-mfa-factors)
- [OWASP Choosing and Using Security Questions Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Choosing_and_Using_Security_Questions_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [W3C Web Authentication: An API for Accessing Public Key Credentials Level 3](https://www.w3.org/TR/webauthn-3/)
- [RFC 6238: TOTP](https://www.rfc-editor.org/rfc/rfc6238.html)

## Issues Found

- The opening described recovery as another authentication ceremony, while NIST treats account recovery as a distinct process. It now calls recovery a separate, authentication-like ceremony.
- The recovery terminology conflated a subscriber's recovery address with a recovery contact. The issued-code definition now refers to a claimant-chosen, previously established recovery address, and a recovery contact is correctly defined as a trusted associate whose address receives an issued code for the subscriber.
- The NIST applicability sentence referred only to the account's assurance level. It now states that recovery requirements depend on the account's identity assurance level (IAL) and maximum AAL, and it scopes the listed AAL2 combinations to accounts whose maximum AAL is AAL2.
- The wrapped state-machine diagram made the source of the replacement, denial, expiry, and cancellation transitions ambiguous. It now explicitly shows the approved-to-replacement transition and terminal outcomes from any nonterminal state.
- The phrase “rotate the factor generation” was undefined and could imply waiting until recovery completion to address a lost authenticator. The post now requires prompt suspension or invalidation after a loss report is authenticated under policy, followed by final invalidation and related session, trusted-device, and transaction cleanup on completion.
- The notification wording could have made the mandatory recovery notification appear policy-optional. It now separates the NIST-required notification from optional additional notices at request and material state changes.

## Review Notes

- The post has no executable code, commands, or configuration, but it contains concrete technical implementation guidance and an illustrative recovery state machine, so it was reviewed as a technical guide rather than classified as `not-code-blog`.
- Cooling-off periods, separation of duties, constrained recovery sessions, and progress notifications are risk-based hardening recommendations; NIST does not mandate every one of these controls for every service.
- Rotating a complete set of saved recovery codes is additional implementation guidance. NIST specifically requires a used saved recovery code to be invalidated and a new saved recovery code to be issued.
- Whether a passkey survives loss of one device depends on the credential's backup or synchronization state; the post's recommendation to register multiple authenticators remains correct.
