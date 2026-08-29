# Validation Summary: How to Generate, Hash, Consume, and Rotate Single-Use MFA Recovery Codes

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered

- Multi-factor authentication and account recovery
- NIST SP 800-63B-4 saved recovery codes and look-up secrets
- Cryptographically secure random number generation
- RFC 4648 Base32 encoding and canonicalization
- Argon2id password hashing, salts, peppers, and KMS-backed secret storage
- SQL transactions, row locking, conditional updates, and concurrent rotation
- TLS, HTTP cache control, rate limiting, auditing, and session security

## Sources Consulted

- [NIST SP 800-63B-4 final publication](https://csrc.nist.gov/pubs/sp/800/63/B/4/final)
- [NIST SP 800-63B-4: Account Recovery](https://pages.nist.gov/800-63-4/sp800-63b/events/#recovery)
- [NIST SP 800-63B-4: Recovery at AAL2 and AAL3](https://pages.nist.gov/800-63-4/sp800-63b/events/#recovery-at-aal2)
- [NIST SP 800-63B-4: Look-Up Secrets](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#lookupsecrets)
- [NIST SP 800-63B-4: Rate Limiting](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#throttle)
- [NIST SP 800-63B-4: Random Values](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#randomness)
- [NIST SP 800-63B-4: Post-Enrollment Binding](https://pages.nist.gov/800-63-4/sp800-63b/events/#post-enroll-bind)
- [RFC 4648: Base-N Encodings](https://www.rfc-editor.org/rfc/rfc4648.html)
- [RFC 9106: Argon2 Memory-Hard Function](https://datatracker.ietf.org/doc/html/rfc9106)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)
- [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

## Issues Found

- The generation pseudocode hashed the 16 raw random bytes, but consumption verified the user-entered Base32 text. Those byte strings differ, so verification would fail as written. The example now defines canonical, unpadded RFC 4648 Base32 text and hashes and verifies that same canonical representation.
- The random selector was described as identifying one row without a database uniqueness invariant. The post now requires a uniqueness constraint on `(set_id, selector)` and regeneration on collision.
- Missing or consumed rows exited before the expensive password-hash operation, creating a timing signal despite the stated non-enumeration goal. The consumption flow now canonicalizes malformed input into the common failure path and uses an equivalent-cost dummy verifier when no usable row exists.
- The failure pseudocode did not close the transaction on every path and only recorded a failed attempt for a hash mismatch. It now records all malformed, unknown, consumed, and mismatched submissions and commits that accounting before returning the uniform failure response.
- Consumption locked only the code row even though invalidation belongs to the set, allowing rotation and consumption to interleave if they did not coordinate on the same record. The pseudocode now locks the active set and its code row, and the conditional-update alternative must recheck active-set status.
- A transaction by itself does not prevent two concurrent rotations from creating two active generations. Rotation now serializes on a stable per-user record, enforces at most one active set as a database invariant, coordinates with the active-set lock used by consumption, and includes a concurrent-rotation test.
- The NIST recovery statement applied the maximum-AAL2 recovery alternatives too broadly to any account that can authenticate at AAL2. It now uses NIST's precise “maximum of AAL2” scope.
- Several NIST conformance details were understated. The post now distinguishes an operating-system CSPRNG from an approved random bit generator with at least 112 bits of generator security strength, specifies the minimum 32-bit salt requirement for shorter look-up secrets, states the 100-attempt upper bound and disable/rebind behavior, and requires the post-enrollment binding authentication level for normal rotation.
- The opening implied that possession of one code always crosses MFA, which conflicts with recovery policies that require another recovery method or bound authenticator. It now states that a code may bypass the normal MFA flow or satisfy only part of the recovery policy.

## Review Notes

- Argon2id parameters remain intentionally deployment-specific in the pseudocode. Implementations should meet current OWASP guidance and tune cost parameters to their hardware and availability budget.
- Argon2id is appropriate under the cited OWASP guidance but is not automatically acceptable for a deployment that requires NIST-approved cryptography; the post correctly preserves that caveat.
- The locking example is implementation-neutral pseudocode. Database-specific lock, isolation, retry, and partial-uniqueness semantics must be checked for the selected database.
- All external links present in the post resolved to the intended resources, including the NIST section anchors.
