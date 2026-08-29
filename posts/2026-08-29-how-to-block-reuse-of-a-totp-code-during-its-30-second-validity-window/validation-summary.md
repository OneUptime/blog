# Validation Summary: How to Block Reuse of a TOTP Code During Its 30-Second Validity Window

## Status

validated

## Post Type

Security implementation guide

## Technologies Covered

- Time-Based One-Time Passwords (TOTP) and RFC 6238
- HMAC-Based One-Time Passwords (HOTP) and RFC 4226
- Multi-factor authentication and replay resistance
- SQL conditional updates, transactions, and row locking
- Distributed verifier consistency and cross-region failover
- Request idempotency and session issuance
- WebAuthn phishing resistance
- Authentication rate limiting and generic failure responses

## Sources Consulted

- [RFC 6238: TOTP](https://datatracker.ietf.org/doc/html/rfc6238), especially Sections 4, 5.1, 5.2, and 6
- [RFC 6238 errata](https://www.rfc-editor.org/errata/rfc6238)
- [RFC 4226: HOTP](https://datatracker.ietf.org/doc/html/rfc4226), especially Sections 7.2 and 7.3 and Appendix A.3
- [RFC 4226 errata](https://www.rfc-editor.org/errata/rfc4226)
- [NIST SP 800-63B-4: Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/), including OTP verifier, phishing-resistance, replay-resistance, and rate-limiting requirements
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-responses)
- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/), especially RP ID scoping and origin validation
- [PostgreSQL comparison functions and NULL semantics](https://www.postgresql.org/docs/current/functions-comparison.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [IETF HTTPAPI Idempotency-Key Internet-Draft 07](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header-07), used as non-normative guidance for request fingerprints and duplicate-result handling

## Issues Found

- The original pseudocode and SQL did not define initial-state behavior. If `last_accepted_step` were null, both comparisons would be non-true and a new factor could never accept its first OTP. The pseudocode and SQL now handle null explicitly, and the prose also permits a non-null sentinel.
- The original loop stopped at the first matching counter. Because truncated TOTP outputs from distinct counters can rarely collide, the same digits could match the current and future counters, be recorded first as the current counter, and then be replayed against the future counter. The verifier now evaluates all eligible candidates and consumes the greatest matching counter.
- The time-counter formula silently assumed RFC 6238's default parameters. The example now names `T0 = 0` and the 30-second step explicitly.
- The original multiple-enrollment wording did not distinguish independent seeds from synchronized or cloned devices. The post now states that devices sharing one seed are one logical credential with one replay mark, and that credential IDs bind immutably to seeds.
- Challenge and retry state were not explicitly bound to the exact logical TOTP credential. The post now adds that binding so a retry cannot fall through to another independently seeded factor if numeric outputs collide.
- Exact-retry idempotency was described without explicitly requiring an atomic result reservation. The post now couples the challenge/idempotency result reservation to counter consumption and rejects reuse of a key for a different request.
- “Strongly consistent state” was underspecified for the cross-region compare-and-swap. The post now requires a durable, linearizable conditional update and fenced failover so a partition cannot create two authorities.
- The threat model claimed the mechanism defended against compromised application nodes. A fully compromised verifier that can access seeds, modify state, or issue sessions can bypass this control. The text now correctly covers application-node crashes and restarts instead.
- “Resetting state on failure” could incorrectly discourage rolling back an uncommitted transaction when no session was created. The post now warns specifically against lowering committed replay state after a downstream failure.
- The WebAuthn statement described the security property as authenticating the relying-party origin. It now accurately states that assertions are bound to the RP ID and that the relying party must validate the client origin.
- The concurrency test did not explicitly say that all submissions use the same code and credential. The test now does so and requires exactly one new authentication result.
- The rate-limit checklist could be read as charging a successful exact idempotent retry as another failed OTP attempt. It now distinguishes that retry from non-idempotent replay attempts.
- Two RFC reference labels did not match their targets: RFC 6238 Section 7 is Acknowledgements, not Security Considerations, and RFC 4226 Section 7.3 is Throttling at the Server, not HOTP Verification. The labels and the RFC 6238 resynchronization target were corrected.

## Review Notes

- Thirty seconds is RFC 6238's recommended default time step, not a universal TOTP lifetime. A verifier's effective acceptance lifetime also depends on its bounded drift and transmission-delay policy; the post correctly directs readers to use their service's exact policy.
- The SQL is intentionally dialect-neutral application SQL with named placeholders. Its security property depends on checking that exactly one row changed and on treating serialization failures or transaction aborts as failures, never as successful authentication.
- RFC 6238 is an Informational RFC but uses RFC 2119 requirement language, including the requirement not to accept a second attempt after successful validation.
- The Idempotency-Key document consulted is an expired Internet-Draft rather than an RFC. The post does not present the header as a standardized requirement and uses the pattern generically.
- No deprecated APIs, version-specific commands, or configuration formats are present.
