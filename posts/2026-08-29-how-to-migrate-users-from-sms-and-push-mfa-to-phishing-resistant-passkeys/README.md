# How to Migrate Users from SMS and Push MFA to Phishing-Resistant Passkeys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Passkeys, WebAuthn, FIDO2, MFA, SMS

Description: Move users from phishable SMS and push approvals to verified WebAuthn passkeys through staged enrollment, measured fallback reduction, and recovery redesign.

---

SMS codes can be phished or redirected through SIM-swap and telecom attacks. Push approval can be relayed or abused through prompt fatigue. Passkeys use WebAuthn public-key credentials scoped to the relying party, so a credential created for the legitimate RP cannot produce a valid assertion for a lookalike phishing origin.

Migration is more than adding a “Create passkey” button. The old factor still controls enrollment and recovery until the service changes those paths, and a silent fallback can preserve the attacker's downgrade route indefinitely.

## Define the Target Authentication Context

A passkey is a discoverable FIDO credential. It may be device-bound or synchronized through a credential manager. Both use RP-scoped public-key authentication, but synchronization, device management, and recovery have different risks.

If the service expects a multi-factor cryptographic authentication event, request and verify WebAuthn user verification rather than user presence alone. Record backup eligibility and backup state as signals. Decide whether privileged enterprise users require managed or device-bound authenticators, and whether attestation, where available, is needed to verify permitted authenticator characteristics under a documented privacy-aware policy.

Inventory browser, operating-system, embedded-webview, shared-device, accessibility, and account-recovery constraints. Do not strand a population whose environment cannot complete WebAuthn. Hardware security keys can cover users without a suitable platform authenticator.

## Enroll from the Legacy State Safely

The legacy factor temporarily authorizes a stronger credential, so protect this bridge:

1. require a recent successful legacy MFA event, not just a remembered session;
2. reject enrollment after recovery or on high-risk context without additional review;
3. create a short-lived, server-generated random WebAuthn registration challenge of at least 16 bytes, bound to the user and session;
4. validate the complete registration response according to the WebAuthn RP registration procedure, including type, challenge, expected origin and any cross-origin context, RP ID hash, applicable user presence, required user verification, backup-flag consistency, an offered public-key algorithm, credential ID length and uniqueness, and the attestation statement and policy;
5. perform a passkey authentication test before marking migration complete;
6. notify the owner through an established channel independent of the binding transaction.

For high-value accounts, use a cooling-off period or retain heightened monitoring before the new credential can change recovery settings. This contains an attacker who has just compromised SMS or pushed a user into approving enrollment.

Use conditional mediation with WebAuthn-enabled autofill where supported so users discover passkeys naturally at sign-in. Keep a visible “use another method” path during transition, but label methods accurately and avoid nudging users back to the weakest option by default.

## Run a Measured Coexistence Phase

Track capability and outcomes without collecting unnecessary biometric or attestation data:

- passkey creation and first-use success;
- platform/browser compatibility failures;
- fallback frequency and reason;
- recovery starts and completion;
- account-takeover and help-desk signals by factor;
- number of accounts with two viable phishing-resistant credentials.

Segment policy. Administrators and users with sensitive access can move first with security-key or managed-passkey support. Consumer cohorts may need a longer coexistence window. Publish a timeline and give users a way to enroll a second passkey before disabling fallback.

Do not classify every failed WebAuthn ceremony as unsupported. Use reliable exception categories where available, but remember that cancellation, timeout, UV failure, and client-specific policy failures may share `NotAllowedError` and cannot always be distinguished. Keep server errors generic but make client guidance actionable.

## Retire Downgrade Paths Deliberately

Once a user has demonstrated reliable passkey use and a recovery path, change policy so SMS or push cannot silently satisfy the same high-risk operations. Options include:

- remove the old factor after explicit confirmation;
- retain it temporarily for low-risk login but never factor changes or sensitive step-up;
- allow it only as one input to a formal, risk-assessed recovery process that may impose a delay;
- disable it entirely for privileged roles.

Do not offer “SMS instead” after a passkey challenge merely because an attacker caused it to fail. The server, not the client, decides allowed fallback based on account state and risk.

Redesign recovery at the same time. Encourage multiple passkeys or security keys. If you issue saved recovery codes, require users to store them offline and use them only as one component of a risk-appropriate recovery process; saved recovery codes are not phishing-resistant. Understand the credential manager's own account-recovery model for synchronized passkeys, but do not assume it replaces the service's authenticator lifecycle and revocation controls.

## Threat Model and Failure Modes

Defend against phishing of the legacy factor during enrollment, push fatigue, SIM swap, registration ceremony attacks, malicious fallback, compromised sync accounts, and lockout during platform changes. Common failures include marking a passkey active before a test assertion, accepting UV when policy required it but the flag is false, retaining SMS for every sensitive action, and treating synchronized and device-bound credentials as identical.

Passkeys resist RP-origin phishing; they do not fix compromised endpoints, broken authorization, unsafe recovery, or malicious browser sessions.

## Rollout and Test Checklist

- Define accepted passkey classes, UV requirements, and privileged-user policy.
- Test supported platforms, cross-device flows, security keys, and accessibility.
- Protect legacy-authorized enrollment with freshness, risk checks, and notification.
- Validate registration and a first authentication before declaring success.
- Measure fallback and recovery outcomes during a time-bounded coexistence phase.
- Enroll a second strong credential before removing the old factor.
- Remove SMS/push from factor changes and sensitive step-up first.
- Red-team downgrade, phishing relay, sync-account recovery, and lost-device flows.

## References

- [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)
- [NIST SP 800-63B-4: Phishing Resistance](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#verifimpers)
- [NIST SP 800-63B-4: Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#syncable-authenticators)
- [FIDO Alliance Passkey Resources](https://fidoalliance.org/passkeys/)
- [FIDO Alliance Passkey User Experience Guidelines](https://fidoalliance.org/ux-guidelines/)
- [CISA: Implementing Phishing-Resistant MFA](https://www.cisa.gov/sites/default/files/2023-01/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf)

## Conclusion

Use the legacy factor only as a controlled bridge to a fully validated passkey, observe a finite coexistence period, and then remove weak methods as direct paths to high-risk actions or account recovery. The migration succeeds when the stronger credential-not an invisible SMS or push fallback-defines the account's real assurance.
