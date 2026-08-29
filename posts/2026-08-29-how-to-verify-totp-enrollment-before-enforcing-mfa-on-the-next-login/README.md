# How to Verify TOTP Enrollment Before Enforcing MFA on the Next Login

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TOTP, MFA, Authentication, Security, Enrollment

Description: Enroll TOTP through a pending, short-lived transaction and activate it only after the user proves their authenticator can generate a valid code.

---

Displaying a TOTP QR code does not prove that the user scanned it, retained the secret, or configured a compatible algorithm, digit count, and period. If the account is marked MFA-enabled at that moment, the next login can lock the user out.

Treat enrollment as a state machine: create a pending factor, deliver its provisioning data once, verify a code from that exact pending secret, and only then activate the factor and enforce it.

## Authorize Enrollment First

Start enrollment from an authenticated, TLS-protected session. If the account already has MFA, require a recent proof with an existing factor; an old session cookie alone should not authorize adding a new authenticator. Protect browser endpoints against CSRF and bind the transaction to the current user, session, and intended action.

Create a cryptographically random TOTP secret that meets the selected algorithm's security requirements. Store it with authenticated encryption and status `pending`, plus an opaque transaction ID, creation time, expiry, and configuration:

```text
factor_id: random opaque identifier
status: pending
secret_ciphertext: AEAD-encrypted secret
algorithm: SHA1 | SHA256 | SHA512
digits: 6 or 8
period_seconds: 30
expires_at: short enrollment deadline
attempt_count: 0
```

RFC 6238 supports HMAC-SHA-1, HMAC-SHA-256, and HMAC-SHA-512. Do not silently provision one algorithm while verifying another. In practice, authenticator-app interoperability must be tested before changing from widely supported defaults.

## Present Provisioning Data Once

Construct the provisioning URI with the service issuer and the user's non-sensitive account label, then encode it as a QR image. Avoid putting an email address or other unnecessary personal data in the label. Return the page with `Cache-Control: no-store`; exclude the URI and QR image from logs, analytics, support recordings, and screenshots.

Offer the Base32 secret as an accessible manual-entry fallback, but treat it with the same confidentiality as the QR code. Do not expose the secret again from an account API after enrollment.

The pending record must not satisfy login, step-up, recovery, or “MFA enabled” policy. A background cleanup job should invalidate expired pending records, and starting a replacement flow should invalidate earlier pending transactions for the same purpose.

## Verify and Activate Atomically

Ask the user for a code from the newly configured authenticator. Validate only against the secret attached to this pending transaction, using the service's small documented TOTP window and normal attempt throttles.

```text
BEGIN
pending = lock_factor(transaction.factor_id)
require pending.user_id == current_user
require pending.status == "pending" and now < pending.expires_at
require transaction.session_id == current_session

matched_step = verify_totp_once(pending.secret, submitted_code)
require matched_step is valid and matched_step > pending.last_accepted_step

UPDATE factor
SET status = "active",
    verified_at = now,
    last_accepted_step = matched_step
WHERE id = pending.id AND status = "pending"

UPDATE account SET factor_generation = factor_generation + 1
COMMIT
```

The transition must be compare-and-swap or transactionally locked so concurrent submissions cannot activate twice or overwrite another enrollment. Record the matched counter as consumed: the proof used to enroll must not also authenticate a later login during the same 30-second step.

Only after commit should policy report the factor as active. Rotate the web session identifier after this privilege/security-state change. If this is the first MFA factor, issue recovery codes through their own one-time display flow and ask the user to acknowledge safe storage before finishing.

## Design Failure and Resume Behavior

An invalid code leaves the factor pending and consumes an attempt. Do not regenerate the secret for every typo; the app would continue using the previous QR secret. When the transaction expires or the user explicitly restarts, invalidate the old pending secret and display a newly generated one.

A server crash between activation and the response should be recoverable by transaction status. Reloading the page can report that the factor is active after fresh authorization, but must never redisplay its secret. A user who abandons setup remains on the previous authentication policy.

## Threat Model and Failure Modes

Defend against abandoned setup, QR interception, a hijacked session enrolling an attacker's device, CSRF, code guessing, replay of the enrollment code, concurrent activation, and inconsistent cluster state. Frequent mistakes include setting `mfa_enabled=true` when the QR renders, retaining plaintext secrets, allowing pending factors at login, using a global pending secret, resetting attempt limits on refresh, and accepting enrollment proof again as login proof.

TOTP enrollment does not make TOTP phishing-resistant. Offer WebAuthn/passkeys when phishing resistance is required.

## Rollout and Test Checklist

- Require recent authorization before creating a pending factor.
- Bind a short-lived transaction to user, session, factor, and purpose.
- Confirm QR/URI responses are non-cacheable and absent from telemetry.
- Test every supported algorithm, digit count, and period with real apps.
- Activate only after valid proof, through one atomic state transition.
- Record the enrollment counter as consumed for replay prevention.
- Test invalid, expired, concurrent, abandoned, and crash-retry paths.
- Verify enforcement changes only after activation commits.

## References

- [RFC 6238: TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [RFC 4226: HOTP](https://datatracker.ietf.org/doc/html/rfc4226)
- [NIST SP 800-63B-4: Authenticator Binding](https://pages.nist.gov/800-63-4/sp800-63b.html#binding)
- [NIST SP 800-63B-4: OTP Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [Google Authenticator Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Conclusion

Keep a new TOTP factor pending until a code proves the user's authenticator has the exact secret and configuration. A short-lived bound enrollment transaction, atomic activation, consumed first counter, and safe abandoned-flow behavior prevent both lockout and silent factor injection.
