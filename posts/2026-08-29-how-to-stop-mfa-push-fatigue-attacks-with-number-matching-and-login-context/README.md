# How to Stop MFA Push-Fatigue Attacks with Number Matching and Login Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MFA, Push Notification, Authentication, Security, Threat Modeling

Description: Replace blind push approval with transaction-bound number matching, useful login context, prompt throttling, and a migration path to phishing-resistant authentication.

---

In a push-fatigue attack, an adversary who has a password repeatedly triggers approval requests until the user accepts one to stop the noise or by mistake. A plain “Approve/Deny” prompt asks the user to distinguish a real login without evidence.

Number matching and login context reduce accidental approval, but they do not make push phishing-resistant. An attacker at the real login page can see the number and socially engineer the user into entering it. CISA recommends number matching when push MFA cannot yet be replaced and prioritizes phishing-resistant MFA such as FIDO/WebAuthn.

## Require a User-Initiated Transaction

Create a short-lived server transaction only after the primary authenticator succeeds. Bind it to the account, browser session, app, nonce, issuance time, expiry, and one enrolled push device. Generate a fresh random challenge independently for each transaction, bind it only to that transaction, and do not allow the same value to identify more than one live transaction for the same account. To satisfy NIST SP 800-63B-4's out-of-band secret requirements, the verifier must use an approved random bit generator, generate at least six decimal digits (or equivalent), invalidate the authentication after no more than 10 minutes, and accept the secret only once. When the secret is shorter than 64 bits-as a six-digit value is-the verifier must rate-limit consecutive failed entries per subscriber account, and issuing a new secret must not reset that count. A challenge below the six-decimal-digit-equivalent minimum, or a list-choice match, is not that NIST profile.

The login browser displays the number. The authenticator app receives a signed or mutually authenticated push transaction and asks the user to enter that number. Do not include the correct answer in the notification payload or show it on both screens.

```text
push_transaction = {
  id: random,
  user_id,
  preauth_session_id,
  device_credential_id,
  number_verifier,
  context_digest,
  expires_at,
  status: pending
}
```

The mobile app must authenticate itself to the verifier using a key bound during enrollment; possession of a push-provider device token alone is not authentication. Protect all channels with TLS and authenticate server messages so a compromised notification path cannot manufacture approvals.

## Show Context the User Can Check

Display the service and action, time, browser or device class, and an approximate location derived by the server. Use plain language: “Sign in to payroll from Chrome near London?” Avoid false precision and explain that location can be wrong for VPNs and mobile networks.

For sensitive step-up, display the actual action rather than generic “login”: creating an API key and changing a bank account are different intents. Bind a digest of security-relevant details into the server transaction so approval cannot be replayed for another operation.

Never place passwords, OTPs, full IP addresses, confidential transaction data, or recovery secrets in push payloads that may appear on a lock screen.

## Suppress Bombardment

Allow at most one active push transaction per account, bind it to one pre-authenticated session, and coalesce duplicate requests from that session. Apply account-based and device-based limits plus IP/network and global provider limits. Back off after denials, timeouts, or repeated requests; do not automatically send another prompt on page refresh.

A denial should terminate the transaction and offer “I did not request this.” That report can lock the pre-authentication attempt, notify security, and guide the user to change a compromised password. Do not lock the entire account solely because an attacker generated pushes; preserve a secure recovery route.

Expire approvals quickly and consume them atomically. The push result must authorize only its bound pre-authenticated session or action. A late approval after the browser transaction expired must fail.

## Design Safe Fallback

Do not automatically downgrade to SMS after push denial or rate limiting. Select fallbacks from server-side account policy. A separately enrolled WebAuthn credential or a securely stored, single-use recovery code is preferable to another phishable, attacker-triggerable channel.

Use number matching as an interim control while migrating to passkeys or security keys. WebAuthn scopes each credential to an RP ID and includes the caller origin in signed client data; with the required server-side RP ID and origin checks, an unrelated phishing origin cannot use the credential. Number matching still depends on the user correctly interpreting an out-of-context prompt.

## Threat Model and Failure Modes

Threat-model password-compromise bombardment, accidental approval, real-time phishing relay, push-token theft, notification spoofing, transaction swapping, and provider-cost exhaustion. Common failures include showing the answer in the push, accepting approval for any waiting browser, unlimited resend, multiple simultaneous prompts, vague context, automatic SMS downgrade, and calling number matching phishing-resistant.

Malware controlling the enrolled phone or browser remains a separate threat. Device health signals may inform risk but should not be represented as guarantees.

## Rollout and Test Checklist

- Bind each push to one account, session/action, device credential, nonce, and expiry.
- Require entry of a browser-displayed number in the app.
- Show clear service, action, time, browser/device, and approximate location context.
- Permit one active request per account and rate-limit failed entries and request volume across the account, device, network, and provider.
- Consume approval atomically and reject expired or mismatched transactions.
- Add denial/report flows without creating attacker-triggered permanent lockout.
- Prevent automatic downgrade to SMS or weaker recovery.
- Measure fatigue reports and migrate priority cohorts to WebAuthn.

## References

- [CISA: Implementing Number Matching in MFA Applications](https://www.cisa.gov/sites/default/files/publications/fact-sheet-implement-number-matching-in-mfa-applications-508c.pdf)
- [CISA: Implementing Phishing-Resistant MFA](https://www.cisa.gov/sites/default/files/2023-01/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf)
- [NIST SP 800-63B-4: Out-of-Band Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#out-of-band)
- [NIST SP 800-63B-4: Phishing Resistance](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#verifimpers)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Conclusion

Number matching makes blind approval harder when the user must reconcile a short-lived browser transaction with meaningful app context. Pair it with authenticated device binding, prompt suppression, transaction-specific consumption, and safe fallback-but treat it as a bridge to phishing-resistant WebAuthn, not the destination.
