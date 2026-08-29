# Validation Summary: How to Rate-Limit MFA Code Attempts Without Creating an Account-Lockout DoS

## Status
validated

## Post Type
Technical security guide

## Technologies Covered

- Multi-factor authentication (MFA)
- HOTP and TOTP one-time passwords
- Account- and factor-aware rate limiting
- Bounded backoff and abuse detection
- Atomic shared-state updates and replay prevention
- HTTP `Retry-After` behavior
- Account recovery and authenticator rebinding

## Sources Consulted

- [NIST SP 800-63B-4, Section 3.2.2: Rate Limiting (Throttling)](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#throttle)
- [NIST SP 800-63B-4: Authenticator Event Management and Account Recovery](https://pages.nist.gov/800-63-4/sp800-63b/events/#account-recovery)
- [NIST CSRC: SP 800-63B-4 Final Publication Record](https://csrc.nist.gov/pubs/sp/800/63/B/4/final)
- [RFC 4226, Section 7.3: Throttling at the Server](https://datatracker.ietf.org/doc/html/rfc4226#section-7.3), together with Sections 5.3 and 6 for HOTP value space and guessing probability
- [RFC 6238, Section 5: TOTP Security Considerations](https://datatracker.ietf.org/doc/html/rfc6238#section-5), together with Section 6 for accepted time-step windows
- [OWASP Authentication Cheat Sheet: Login Throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [RFC 9110, Section 10.2.3: Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)
- [RFC 6585, Section 4: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)

## Issues Found

- The original pseudocode loaded and checked state before calling `atomic_save`. That made only the final write atomic, so parallel requests could all pass the stale throttle check and lost updates could undercount failures. The example now serializes the full read/check/verify/update sequence in authoritative shared storage; an atomic admission-reservation design is noted as an equivalent.
- The original success path did not explicitly consume the matched TOTP time step or other one-time code and the MFA transaction atomically. Parallel submissions could therefore accept the same valid code more than once. The corrected example records both as consumed before completing authentication, matching the replay-resistance requirements in NIST SP 800-63B-4 and RFC 6238.
- The throttled branch originally returned a distinct `Retry-After` response while an invalid code returned a generic failure, despite the post's warning about enumeration oracles. The sample now uses the same generic outward failure; the prose retains `Retry-After` only as an optional, safely normalized response.
- The NIST 100-attempt statement was broader than the standard's exact scope. It now identifies that authenticator-specific requirements invoke the general rule, including for short OTP outputs, and that the limit applies to a specific authenticator on one subscriber account. The disablement wording was also made mandatory when a deployment follows that rule, and alternate-factor recovery was qualified by the required assurance level.
- The username-only denial-of-service statement assumed that knowing an identifier was enough to reach the MFA verifier. It now applies to a caller who can actually submit MFA attempts for the known account. Minor reset and budget wording was also tightened to reflect successful authentication and the broader account/factor budget.

## Review Notes

The sample is implementation-neutral pseudocode. `atomic_authoritative_attempt` must provide cross-node serialization and an atomic commit in shared authoritative storage, not merely an in-process mutex; an atomic reservation-and-commit design is a scalable equivalent. If `Retry-After` is exposed, invalid identifiers and other failure states need equivalent status, metadata, and timing behavior where account enumeration is in scope. NIST SP 800-63B-4 is the final July 2025 publication, and the post's five technical reference links and author link resolved correctly. There are no executable commands, language-specific APIs, or configuration snippets to validate.
