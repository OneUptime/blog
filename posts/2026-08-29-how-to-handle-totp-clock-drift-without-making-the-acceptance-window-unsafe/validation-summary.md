# Validation Summary: How to Handle TOTP Clock Drift Without Making the Acceptance Window Unsafe

## Status
validated

## Post Type
Security implementation guide

## Technologies Covered

- Time-Based One-Time Passwords (TOTP) and HMAC-Based One-Time Passwords (HOTP)
- Multi-factor authentication (MFA)
- Unix time, system wall clocks, and monotonic clocks
- Network Time Protocol (NTP) and Network Time Security (NTS)
- Replay protection, atomic state transitions, and rate limiting
- Bounded per-factor clock-drift correction
- Authentication transaction idempotency and recovery
- WebAuthn and passkeys

## Sources Consulted

- [RFC 6238, Sections 3, 4.2, 5.2, and 6: TOTP requirements, counter derivation, validation windows, replay prevention, and resynchronization](https://datatracker.ietf.org/doc/html/rfc6238)
- [RFC 4226, Section 6: HOTP security analysis and the effect of the synchronization window on guessing probability](https://datatracker.ietf.org/doc/html/rfc4226#section-6)
- [RFC 4226, Section 7.3: server-side throttling](https://datatracker.ietf.org/doc/html/rfc4226#section-7.3)
- [RFC 8633, Sections 3.2 and 3.5: NTP source selection and monitoring best practices](https://datatracker.ietf.org/doc/html/rfc8633)
- [RFC 8915: Network Time Security for authenticated NTP synchronization](https://datatracker.ietf.org/doc/html/rfc8915)
- [NIST SP 800-63B-4: OTP verifier, replay-resistance, rate-limiting, and phishing-resistance requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [NIST publication record for the July 2025 final SP 800-63B-4](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- [OWASP Multifactor Authentication Cheat Sheet: OTP handling, recovery, and passkey guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [POSIX `clock_gettime()` and clock semantics: `CLOCK_REALTIME` versus `CLOCK_MONOTONIC`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/clock_gettime.html)

## Issues Found

- The original current-first loop could accept the same submitted value twice when adjacent counters produced the same truncated digits. It stopped at the first match and could record the lower counter while leaving a simultaneously matching higher counter unconsumed. The pseudocode now evaluates all eligible counters and passes the greatest match to an atomic conditional high-water-mark update. The prose now requires the state transition to recheck persisted state, permits success only for a request whose update commits, and avoids learning drift from an ambiguous match. This aligns the example with RFC 6238 and NIST's one-time-use requirement.
- The original collision guidance allowed any deterministic matching counter. It now requires the greatest currently matching counter so another matching counter in the active window cannot accept the same value later.
- The window explanation treated a symmetric `C-1, C, C+1` range as a response to boundary delay. The text now distinguishes the previous step used for measured boundary delay from a future step justified by measured forward clock skew.
- Claims that each extra counter always adds a distinct accepted code and that a three-counter window always triples the accepted set ignored rare truncated-output collisions. Both claims now say this happens normally, preserving the security point without claiming impossible uniqueness.
- The rate-limit wording could be read as charging a particular code value. It now specifies one charge per submitted verification request, rather than one charge for each internal counter comparison.
- The RFC 4226 reference was labeled “Security Considerations” but linked to Section 7, “Security Requirements.” Its anchor now points to Section 6, which is titled “Security Considerations” and contains the synchronization-window guessing-probability analysis relevant to the post.

## Review Notes

- The examples are language-neutral pseudocode. `accept_if_newer_atomically` represents a conditional transaction or compare-and-set that must authenticate only when the persisted high-water-mark update commits.
- The remaining claims about Unix time, bounded per-factor drift, one-time acceptance, rate limiting, phishing susceptibility, time-source monitoring, recovery, and WebAuthn are consistent with the consulted sources.
- All five external links in the post resolved successfully to the intended RFC, NIST, and OWASP resources during review.
- No versioned library APIs, terminal commands, or configuration snippets are present.
