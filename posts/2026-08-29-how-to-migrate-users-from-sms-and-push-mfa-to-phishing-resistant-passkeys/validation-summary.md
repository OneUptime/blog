# Validation Summary: How to Migrate Users from SMS and Push MFA to Phishing-Resistant Passkeys

## Status

validated

## Post Type

Technical security migration guide

## Technologies Covered

- Passkeys
- WebAuthn Level 3
- FIDO2 and FIDO security keys
- SMS one-time passwords and push MFA
- User presence, user verification, and authenticator attestation
- Device-bound and synchronized credentials
- Authenticator enrollment, fallback policy, and account recovery

## Sources Consulted

- [W3C Web Authentication: An API for Accessing Public Key Credentials — Level 3](https://www.w3.org/TR/webauthn-3/), especially the RP registration procedure, cryptographic-challenge requirements, origin validation, error handling, credential backup state, and biometric-privacy sections.
- [NIST SP 800-63B-4: Authenticator and Verifier Requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/), including out-of-band authenticators, multi-factor cryptographic authentication, phishing resistance, and restricted PSTN authenticators.
- [NIST SP 800-63B-4: Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/syncable/).
- [NIST SP 800-63B-4: Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/), including post-enrollment binding, saved recovery codes, recovery requirements, and account notifications.
- [FIDO Alliance: Passkeys](https://fidoalliance.org/passkeys/).
- [FIDO Alliance: Passkey User Experience Guidelines](https://fidoalliance.org/ux-guidelines/).
- [FIDO Alliance: Recommended Account Recovery Practices](https://fidoalliance.org/recommended-account-recovery-practices/).
- [CISA: Implementing Phishing-Resistant MFA](https://www.cisa.gov/sites/default/files/2023-01/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf).

## Issues Found

- The registration challenge was described only as short-lived. WebAuthn requires an RP-generated random, unguessable challenge and recommends at least 16 bytes. The enrollment step now states those requirements explicitly.
- The registration-response checklist omitted security-critical parts of the normative WebAuthn RP procedure. It now calls for the complete procedure and explicitly covers cross-origin context, applicable user presence, required user verification, backup-flag consistency, an offered algorithm, credential ID checks, and attestation verification and policy.
- Attestation was presented as an alternative to an authenticator class. The text now correctly treats attestation as optional evidence used to verify permitted authenticator characteristics under a privacy-aware policy.
- The enrollment notification was not explicitly independent of the credential-binding transaction. It now requires an established channel independent of that transaction, matching NIST's post-enrollment binding requirement.
- Conditional mediation and autofill were phrased as separate alternatives. The text now describes conditional mediation as working with WebAuthn-enabled autofill.
- The failure-handling guidance implied that cancellation, UV failure, and browser-policy failures can always be classified separately. It now notes that several causes may surface as `NotAllowedError` and cannot always be distinguished.
- The recovery guidance could be read as allowing SMS, push, or a saved recovery code to act as a standalone downgrade path. It now treats a weak legacy method or saved recovery code only as one input to a formal, risk-appropriate recovery process and notes that saved recovery codes are not phishing-resistant.

## Review Notes

- The post contains no code blocks, terminal commands, or configuration snippets, so no runtime or syntax testing was applicable. It nevertheless contains substantial technical implementation guidance and was reviewed as a technical guide.
- WebAuthn Level 3 is current: the linked document is a W3C Recommendation dated August 25, 2026.
- All six reference links in the post resolved successfully to the intended authoritative material. The FIDO UX link redirects to the current Passkey Central design-guidelines page.
- WebAuthn does not disclose biometric data to the RP; local user verification returns a signed UV result. Attestation data can have privacy implications and should be requested only when policy requires it.
- Backup eligibility is fixed for a credential, while backup state can change and should be refreshed from later successful ceremonies when policy uses it.
- Under NIST SP 800-63B-4, qualifying synchronized authenticators can support AAL2, but their exportable keys do not satisfy AAL3's non-exportability requirement.
- A second credential is most useful for recovery when it does not share the same device or synchronization-account failure mode. An RP may have limited visibility into a consumer credential manager's sync fabric, so this is partly a user-education and policy concern.
