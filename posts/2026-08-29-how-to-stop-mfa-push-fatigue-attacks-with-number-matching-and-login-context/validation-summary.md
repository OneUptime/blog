# Validation Summary: How to Stop MFA Push-Fatigue Attacks with Number Matching and Login Context

## Status

validated

## Post Type

Technical security implementation guide

## Technologies Covered

- Push-notification multifactor authentication (MFA)
- Number matching and out-of-band authentication
- Server-side authentication transaction binding
- Device-bound cryptographic authentication and TLS
- Login context, throttling, and recovery controls
- WebAuthn, passkeys, and security keys

## Sources Consulted

- [NIST SP 800-63B-4 publication record](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- [NIST SP 800-63B-4: Out-of-Band Devices](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#out-of-band)
- [NIST SP 800-63B-4: Phishing Resistance](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#verifimpers)
- [NIST SP 800-63B-4: Authentication Assurance Levels](https://pages.nist.gov/800-63-4/sp800-63b/aal/)
- [CISA: Implementing Number Matching in MFA Applications](https://www.cisa.gov/sites/default/files/publications/fact-sheet-implement-number-matching-in-mfa-applications-508c.pdf)
- [CISA: Implementing Phishing-Resistant MFA](https://www.cisa.gov/sites/default/files/2023-01/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf)
- [IETF RFC 10027 / BCP 247: Best Current Practice for Security of Cross-Device Flows](https://www.rfc-editor.org/rfc/rfc10027.html)
- [W3C Web Authentication: An API for Accessing Public Key Credentials, Level 3](https://www.w3.org/TR/webauthn-3/)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Transaction Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Microsoft Entra: How number matching works in MFA push notifications](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-number-match)
- [Microsoft Entra: Use additional context in Authenticator notifications](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-additional-context)
- [Apple: Generating a remote notification](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification)
- [Firebase Cloud Messaging message types](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type)
- [Firebase: Secure message data with end-to-end encryption](https://firebase.google.com/docs/cloud-messaging/encryption)

## Issues Found

- The post required a challenge number to never recur across transactions. A bounded numeric space must eventually repeat, and NIST requires fresh random generation and one-time acceptance rather than lifetime-global uniqueness. The text now requires independent generation, transaction binding, and no ambiguous collision among live transactions for the same account.
- The NIST out-of-band conformance wording omitted mandatory account-based throttling when a secret is shorter than 64 bits and the rule that issuing a new secret must not reset the failed-attempt count. Both requirements are now stated, and the wording is scoped to NIST's out-of-band secret requirements rather than implying complete publication or AAL conformance.
- The app and checklist allowed selecting the matching value from a list. NIST SP 800-63B-4 explicitly says candidate-list comparison is insufficient for its out-of-band transfer requirement. Both occurrences now require entry of the browser-displayed number, and the NIST caveat identifies list-choice matching as outside that profile.
- The active-request limit was ambiguous between per-account and per-session enforcement. A per-session-only limit still permits bombardment through parallel sessions, so the text now makes the limit account-wide while retaining binding to one pre-authenticated session.
- The WebAuthn explanation attributed phishing resistance only to generic RP binding. It now accurately describes RP ID credential scope, signed caller-origin data, and the relying party's required RP ID and origin validation, while limiting the claim to unrelated phishing origins.
- The threat-model section said number matching should defend against real-time phishing relay even though the post correctly treats such relay as residual risk. “Defend against” was changed to “Threat-model” to remove that overclaim.
- The fallback text referred generically to a saved recovery code. It now specifies a securely stored, single-use recovery code, consistent with OWASP recovery guidance.

## Review Notes

- All external references in the post returned successful HTTP responses and point to the intended resources.
- The `push_transaction` block is explicitly fenced as `text` and is conceptual pseudocode, not executable JSON or a language-specific API example.
- Vendor number-matching challenges below NIST's six-decimal-digit-equivalent minimum can still mitigate push fatigue, but they do not satisfy NIST SP 800-63B-4's out-of-band secret profile. Number matching and login context remain vulnerable to real-time social engineering and do not become phishing-resistant.
- No deprecated APIs, CLI commands, or version-specific configuration snippets are present.
