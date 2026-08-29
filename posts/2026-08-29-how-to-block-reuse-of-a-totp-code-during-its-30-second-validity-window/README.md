# How to Block Reuse of a TOTP Code During Its 30-Second Validity Window

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TOTP, MFA, Authentication, Security, Replay

Description: Enforce TOTP's one-time property by recording the matched time counter atomically, coordinating verifier nodes, and separating safe request retries from credential replay.

---

A TOTP output does not become invalid merely because the server accepted it. The authenticator displays the same digits until the time step changes, and a stateless verifier will calculate the same result for every request during that period. Without server-side replay state, a captured code can authenticate repeatedly.

RFC 6238 requires a verifier to accept a successfully validated OTP only once. The durable identity of that use is the matched time-step counter, not the six-digit string: numeric outputs eventually repeat by chance.

## Persist a High-Water Mark per Factor

For every TOTP credential, store `last_accepted_step`. During verification, calculate each permitted candidate counter, but skip counters at or below that high-water mark.

```text
server_step = floor(unix_time / 30)
candidates = [server_step, server_step - 1, server_step + 1]

matched_step = null
for step in candidates:
    if step > factor.last_accepted_step and
       constant_time_equal(totp(factor.secret, step), submitted_code):
        matched_step = step
        break

if matched_step is null:
    reject()
```

Use the exact window and drift policy selected for the service. Storing the submitted digits or their hash is the wrong replay key: the same digits can occur at different counters, and the verifier already knows which counter produced the match.

For multiple TOTP enrollments, keep the high-water mark on each credential. Do not let enrollment of a second device reset the first device's replay history.

## Make Acceptance Atomic

Two requests can validate against the same old value before either writes the new one. Close that race with a transaction, row lock, or atomic compare-and-swap:

```sql
UPDATE mfa_totp_factors
SET last_accepted_step = :matched_step,
    last_used_at = CURRENT_TIMESTAMP
WHERE id = :factor_id
  AND status = 'active'
  AND last_accepted_step < :matched_step;
```

Authentication succeeds only if exactly one row changed. Create the fully authenticated session in the same transaction, or use a transactionally coupled state machine so a crash cannot consume the code without a recoverable outcome.

All verifier instances and regions must coordinate through authoritative strongly consistent state for this decision. A process-local cache, eventually replicated read model, or sticky load balancer does not prevent two nodes from accepting the same counter.

If cross-region consistency is unavailable, route a factor deterministically to one authoritative region or use another architecture that provides a single atomic decision point. Document the availability tradeoff; accepting replay during a partition is not a safe fallback.

## Separate Retry Idempotency from OTP Reuse

A client may retry because the first response was lost after the server succeeded. Give the MFA challenge an opaque ID and accept an idempotency key. Bind both to the account, pre-authenticated session, intended login, and short expiry.

On an exact retry, return the result already created for that transaction without running the OTP as a new authentication. The resulting session token should not be stored in plaintext merely to support retries; store a safe result reference or encrypted response using the same controls as other credentials.

The same code submitted with a different challenge or idempotency key must fail once its counter was consumed. Never return “code already used” to an unauthenticated caller; use the same generic error as an invalid or expired code and keep detailed reasons only in protected telemetry.

## Handle Future-Step Matches Deliberately

If the validation window includes a future counter and it is accepted, the high-water mark moves ahead. Codes for lower counters must then remain rejected, even if the wall clock has not caught up. Otherwise the window can be walked backward for replay.

This can briefly inconvenience a user whose authenticator clock is ahead. Solve it with bounded drift handling and time synchronization, not by decreasing `last_accepted_step`. Administrative reset of replay state should require factor replacement because lowering it can reactivate captured codes.

## Threat Model and Failure Modes

Defend against real-time interception followed by replay, duplicate browser submissions, parallel requests, retries after timeouts, compromised application nodes, and replication lag. Frequent mistakes include storing “last code,” updating after issuing a session, using a non-atomic read/write pair, tracking replay only in memory, resetting state on failure, and accepting an older counter after a newer one.

Replay protection does not prevent a phishing proxy from winning the race and consuming the code first. Phishing-resistant WebAuthn authenticates the relying-party origin and should be preferred for high-risk use.

## Rollout and Test Checklist

- Store a monotonic accepted counter for each TOTP credential.
- Use one atomic conditional transition to consume the matched counter.
- Test hundreds of concurrent submissions yield exactly one authentication result.
- Repeat the test across nodes and regions, including failover and partitions.
- Verify an accepted future counter blocks all lower counters afterward.
- Test lost responses through transaction-bound idempotent retries.
- Keep invalid, expired, replayed, and unknown-factor responses indistinguishable.
- Confirm rate limits charge parallel and replayed attempts.

## References

- [RFC 6238: TOTP Security Considerations](https://datatracker.ietf.org/doc/html/rfc6238#section-5.2)
- [RFC 6238: Security Considerations](https://datatracker.ietf.org/doc/html/rfc6238#section-7)
- [RFC 4226: HOTP Verification](https://datatracker.ietf.org/doc/html/rfc4226#section-7.3)
- [NIST SP 800-63B-4: Replay Resistance](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#replay)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Conclusion

Make TOTP one-time by remembering the matched counter and advancing it through one authoritative atomic operation. A monotonic per-factor high-water mark, consistent cluster coordination, and transaction-bound retry handling close the 30-second replay gap without punishing legitimate network retries.
