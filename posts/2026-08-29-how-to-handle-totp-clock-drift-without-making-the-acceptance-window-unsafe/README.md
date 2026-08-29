# How to Handle TOTP Clock Drift Without Making the Acceptance Window Unsafe

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TOTP, MFA, Authentication, Security, Time Synchronization

Description: Handle real TOTP clock skew with synchronized servers, a deliberately small validation window, bounded per-factor correction, replay protection, and measurable recovery paths.

---

TOTP converts time into a counter. If an authenticator and verifier disagree about time, they can calculate different counters from the same secret. The tempting fix is to accept many counters before and after “now,” but every extra counter normally gives an online attacker another valid code for each attempt.

RFC 6238 recommends a 30-second time step and at most one time step for network delay. That is protocol guidance, not permission to grow a window until every broken clock works.

## Start with the Clock, Not the Window

All verifier nodes should use authenticated, monitored time synchronization. Alert on offset, loss of synchronization, sudden steps, and disagreement between regions. TOTP must use Unix time from a synchronized system wall clock; a monotonic clock is useful for measuring local durations and timeouts, but it is not the TOTP time source. Application servers should not derive TOTP time from browser time, request timestamps, or database client values.

Authenticator phones normally synchronize time through the platform. When a user has persistent failures, offer instructions to enable automatic date and time and provide another enrolled factor or a controlled recovery route. Do not ask support to add a large permanent window to that account.

## Define the Window Explicitly

Let `C = floor((now - T0) / 30)`. Begin by validating `C`. Accepting `C-1` addresses measured boundary delay; if evidence also justifies a future step for small clock skew, a window such as `C-1, C, C+1` is common, but it normally triples the set of codes accepted at a moment. Use the smallest range justified by measured conditions and your assurance requirements.

```text
candidate_steps = ordered_unique([C, C - 1, C + 1])
matched_steps = []

for step in candidate_steps:
    if step <= factor.last_accepted_step:
        continue
    if constant_time_equal(totp(secret, step), submitted_code):
        matched_steps.append(step)

if matched_steps:
    accept_if_newer_atomically(max(matched_steps))
```

The example includes replay state because widening a window without one-time enforcement lets a captured code be reused. `accept_if_newer_atomically` must recheck and advance the persisted high-water mark in one operation, and only the request that wins that update may succeed. If an unlikely numeric collision matches more than one unconsumed step, record the greatest matching counter, return one success, and do not update drift from the ambiguous match; this prevents the same value from being accepted again through another counter in the active window.

Do not expose which counter matched to the client. Apply one rate-limit charge per submitted verification request, not one charge per internal counter comparison, while recognizing that the wider window increases the success probability of each guess.

## Use Bounded Per-Factor Drift Carefully

For devices known to drift, store a correction in time steps on the individual factor, not on the user or globally. Learn or update it only after a successful proof made within a hard bootstrap window, and cap it tightly.

```text
expected = server_step + factor.drift_steps
search = [expected, expected - 1, expected + 1]
```

A submitted six-digit value alone is weak evidence for learning an arbitrary offset across dozens of counters; with enough candidates, accidental or guessed matches become more likely. Never scan an unbounded range and “resynchronize” to the first match. Require another factor or recovery process if drift is outside the cap, then re-enroll the TOTP factor.

Track the matched counter, observed drift, and server clock health as safe metadata. Do not log the OTP or secret. A sudden drift change across many accounts is likely a verifier time incident; a large change on one factor is a reason to require re-enrollment, not expand policy.

## Handle Boundary and Retry Behavior

A user can read a code at the end of one step and submit it after the boundary. Accepting one immediately previous counter addresses that specific race. The verifier should still mark the matched counter consumed after success.

If a request times out after the server completed login, an idempotency key bound to the login transaction may return the already-created result. Do not achieve retry friendliness by accepting the same TOTP again for a different transaction.

Keep the authentication challenge short-lived and bound to the pre-authenticated session. Once it expires, restart the flow rather than carrying a drift window into an old password-authenticated session.

## Threat Model and Failure Modes

Defend against online guessing, intercepted-code replay, compromised or skewed verifier clocks, misconfigured phones, and attackers deliberately probing many time steps. Common failures are accepting ±5 or more steps, learning drift from any guessed match, sharing drift across factors, trusting client-provided time, omitting atomic replay state, and hiding a fleet-wide NTP incident by widening the window.

TOTP is not phishing-resistant. A perfectly tuned window cannot stop a real-time phishing proxy from relaying a valid code. Offer WebAuthn/passkeys for higher-risk users and sensitive actions.

## Rollout and Test Checklist

- Monitor time offset and synchronization state on every verifier node.
- Document the step size, candidate counters, order, and maximum drift correction.
- Test codes immediately before and after a 30-second boundary.
- Test skew at every accepted and rejected edge, including negative time offsets.
- Ensure a matched counter is consumed atomically across regions and retries.
- Confirm a submitted value creates one public failure and one rate-limit event.
- Alert on fleet-wide drift changes and unusual per-factor drift.
- Provide another factor or secure re-enrollment for clocks outside the hard cap.

## References

- [RFC 6238: TOTP, Validation and Time-Step Size](https://datatracker.ietf.org/doc/html/rfc6238#section-5.2)
- [RFC 6238: Resynchronization](https://datatracker.ietf.org/doc/html/rfc6238#section-6)
- [RFC 4226: HOTP Security Considerations](https://datatracker.ietf.org/doc/html/rfc4226#section-6)
- [NIST SP 800-63B-4: OTP Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Conclusion

Clock drift is an availability problem with a security cost. Keep verifier clocks healthy, accept only a small documented set of counters, learn only bounded per-factor correction after valid proof, consume the matched counter atomically, and send outliers through re-enrollment rather than an unsafe window.
