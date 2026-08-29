# Validation Summary: How to Verify TOTP Enrollment Before Enforcing MFA on the Next Login

## Status

validated

## Post Type

Security implementation guide

## Technologies Covered

- TOTP (RFC 6238) and HOTP (RFC 4226)
- HMAC-SHA-1, HMAC-SHA-256, and HMAC-SHA-512
- MFA authenticator enrollment and binding
- `otpauth` provisioning URIs, Base32 secrets, and QR codes
- AEAD-protected secret storage
- HTTP TLS, `Cache-Control: no-store`, CSRF protection, and session rotation
- Database transactions, row locking, compare-and-swap updates, and replay prevention
- Recovery codes
- WebAuthn and passkeys

## Sources Consulted

- [RFC 6238: TOTP](https://www.rfc-editor.org/rfc/rfc6238.html)
- [RFC 4226: HOTP](https://www.rfc-editor.org/rfc/rfc4226.html)
- [RFC 4648: Base-N Encodings](https://www.rfc-editor.org/rfc/rfc4648.html)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html#name-no-store)
- [NIST SP 800-63B-4 publication page](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- [NIST SP 800-63B-4: Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- [NIST SP 800-63B-4: Authenticator and Verifier Requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [Google Authenticator Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [PostgreSQL `UPDATE` documentation](https://www.postgresql.org/docs/current/sql-update.html)

## Issues Found

- The pending-record example omitted fields that its prose and pseudocode relied on, including transaction, user, session, purpose, creation-time, and replay state. Added those bindings and initialized `last_accepted_step`; the verifier now explicitly uses the authenticated decryption of `secret_ciphertext` together with the stored algorithm, digit count, and period.
- The first comparison against `last_accepted_step` was undefined for a new factor. Made the comparison null-safe and clarified that every later verification must atomically reject a matched counter at or below the stored counter and advance it on success.
- The post said an invalid code consumed an attempt, but the pseudocode neither checked nor incremented `attempt_count`; a failed assertion inside the transaction would not durably record the failure. Added an attempt-limit check, an atomic increment, an explicit commit-before-error branch, and an account-scoped throttle that survives refreshes and replacement transactions.
- `UPDATE account SET factor_generation = factor_generation + 1` had no `WHERE` clause and could update every account if implemented literally. Scoped it to `pending.user_id` and added affected-row checks to both factor and account updates.
- Locking only one factor row did not prevent two distinct pending enrollments for the same user and purpose from activating concurrently. Added a per-user, per-purpose current-enrollment lock requirement, while retaining a compare-and-swap or transactional lock on the factor transition itself.
- The authorization wording did not state the assurance requirement precisely. Updated it to require recent authentication at the lower of the account's maximum currently available assurance level and the maximum level at which the new authenticator will be used, matching NIST SP 800-63B-4.
- The post omitted the independent subscriber notification required when an authenticator is added. Added a post-activation notification through a previously established independent channel, including a reporting and revocation path.
- The recovery-code sentence did not state the security properties needed for saved recovery codes. Added cryptographically secure generation with at least 64 random bits per code, single-use semantics, hashed storage, rate-limited verification, and secure offline storage guidance.

## Review Notes

All referenced URLs were reachable during review. RFC 6238's supported HMAC algorithms, 30-second default period, validation-window guidance, and prohibition on accepting a successfully validated OTP twice were confirmed. NIST likewise requires one-time OTP acceptance, effective rate limiting, protected symmetric keys, and independent notification when a factor is bound. The TOTP phishing-resistance limitation and the WebAuthn/passkey recommendation are correct.

The Google Authenticator Key URI page is a de facto interoperability reference rather than an IETF standard, and its repository is archived. It documents that some Google Authenticator implementations ignore non-default algorithm, digit, or period parameters; the post already addresses this appropriately by requiring testing with real supported apps.
