# Validation Summary: How to Enroll Multiple WebAuthn Security Keys Without Weakening Account Recovery

## Status

validated

## Post Type

Technical security implementation guide

## Technologies Covered

- WebAuthn Level 3 registration and authentication ceremonies
- FIDO2 security keys, passkeys, and public-key credentials
- Multi-factor authentication and authenticator lifecycle management
- NIST SP 800-63B-4 authenticator binding, loss handling, and account recovery
- Session security and recovery controls

## Sources Consulted

- [W3C Web Authentication: An API for accessing Public Key Credentials — Level 3](https://www.w3.org/TR/webauthn-3/)
- [W3C WebAuthn Level 3: Credential Record](https://www.w3.org/TR/webauthn-3/#credential-record)
- [W3C WebAuthn Level 3: User Account Parameters](https://www.w3.org/TR/webauthn-3/#sctn-user-credential-params)
- [W3C WebAuthn Level 3: Registering a New Credential](https://www.w3.org/TR/webauthn-3/#sctn-registering-a-new-credential)
- [W3C WebAuthn Level 3: Verifying an Authentication Assertion](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)
- [W3C WebAuthn Level 3: Signature Counter Considerations](https://www.w3.org/TR/webauthn-3/#sctn-sign-counter)
- [W3C WebAuthn Level 3: Credential Backup State](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)
- [W3C WebAuthn Level 3: Credential Loss and Key Mobility](https://www.w3.org/TR/webauthn-3/#sctn-credential-loss-key-mobility)
- [NIST SP 800-63B-4: Authenticator Binding](https://pages.nist.gov/800-63-4/sp800-63b/events/#bindexisting)
- [NIST SP 800-63B-4: Loss, Theft, Damage, and Compromise](https://pages.nist.gov/800-63-4/sp800-63b/events/#loss-theft-damage-and-compromise)
- [NIST SP 800-63B-4: Account Recovery](https://pages.nist.gov/800-63-4/sp800-63b/events/#recovery)
- [FIDO Alliance: Passkey and WebAuthn Resources](https://fidoalliance.org/passkeys/)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Issues Found

- The credential schema and checklist described records per authenticator. WebAuthn credential records are per registered public-key credential, and one authenticator can hold multiple credentials. The wording now uses the correct record granularity and states that each intended physical backup key must be enrolled separately.
- The user-handle requirement omitted WebAuthn's non-empty lower bound. It now specifies an opaque, non-PII byte sequence of 1–64 bytes. The credential record also now captures the 1023-byte credential-ID limit, RP-wide credential-ID uniqueness, credential type, and user-verification initialization state.
- The registration checklist made attestation-statement verification conditional on relying-party attestation policy. WebAuthn requires processing the selected attestation format and validating its statement even when the resulting attestation type is `none`; trust assessment is the policy-dependent step. The checklist now distinguishes these stages and also covers applicable cross-origin context, backup-flag consistency, and single-use transaction handling.
- The authentication paragraph implied that the user-verification flag must always be set. WebAuthn requires that check only when user verification is required by policy. The paragraph now qualifies the check and includes the ceremony type, applicable cross-origin and top-origin context, backup-flag consistency, allow-list membership, credential ownership, and the user-handle rules for both identified-user and account-discovery flows.
- The text implied that presenting two keys could implement multi-person control. It now explains that this requires credentials bound to distinct principals and separate authorization; two credentials assigned to one account only provide multiple-device control.
- Lost-key handling deferred credential invalidation until recovery completed. NIST requires prompt suspension or invalidation after an accepted loss or compromise report. The post now makes server-side invalidation explicit, separates loss reporting from replacement binding, and keeps reported credentials invalidated throughout recovery.
- The recovery text did not state that a single recovery code is insufficient for NIST AAL2 recovery. It now requires independent methods whose combined assurance meets policy and calls out that AAL2 constraint.
- The checklist's prohibition on “support discretion” was broader than the standards, which allow documented, risk-assessed human-assisted recovery. It now prohibits ad hoc support discretion while preserving formal support-assisted recovery.

## Review Notes

- The post contains API calls, option names, data-model guidance, and security implementation details, so it was reviewed as a technical guide rather than classified as a non-code post.
- WebAuthn Level 3 is a W3C Recommendation dated August 25, 2026, and NIST SP 800-63B-4 is the current final publication referenced by the post as of validation.
- The explanations of credential-specific public keys, AAGUID limitations, `excludeCredentials`, transports, signature-counter limitations, and backup eligibility/state were verified as technically correct.
- Factor-generation updates, session-ID renewal, session revocation, and trusted-browser invalidation are sound defense-in-depth controls; they are application security measures rather than WebAuthn ceremony requirements.
- The post's rejection of password-only key addition is an intentionally stronger change-control policy than NIST's minimum for some AAL1 binding cases; NIST requires the lower of the account's maximum currently available AAL and the maximum AAL at which the new authenticator will be used.
- All reference URLs in the post resolved to the intended W3C, NIST, and FIDO resources during review. No executable terminal commands or complete source-code examples required runtime testing.
