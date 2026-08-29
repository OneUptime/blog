# How to Rate-Limit MFA Code Attempts Without Creating an Account-Lockout DoS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MFA, Rate Limiting, Authentication, Security, DoS

Description: Slow online MFA guessing with layered account-aware limits, bounded backoff, and abuse detection while avoiding attacker-triggered permanent account lockout.

---

Six decimal digits provide only one million possible values, and a TOTP acceptance window can make several values valid at once. MFA codes therefore depend on strict online throttling. A hard rule such as “ten failures locks the account until support unlocks it,” however, lets anyone who knows a username deny service to that user.

The goal is not unlimited availability or permanent lockout. It is to make guessing uneconomic, constrain distributed attacks, preserve a legitimate recovery path, and detect abuse.

## Put the Primary Budget on the Account and Factor

An IP-only limit is easy to distribute across a botnet and can block many users behind a proxy. Maintain an authoritative failure budget keyed to the target account and, where appropriate, the factor or active authentication transaction. Add supporting limits by IP or network, device cookie, tenant, and global service capacity.

Useful layers include:

- a small burst allowance for typos within one short-lived MFA challenge;
- increasing server-enforced delay after repeated failures;
- a rolling per-account or per-factor attempt budget;
- network and device limits to suppress broad credential-stuffing traffic;
- global circuit breakers that protect the verifier and messaging providers.

NIST SP 800-63B-4 sets 100 consecutive failed attempts as an upper bound before an authenticator is disabled and explicitly permits lower limits. It also permits techniques such as increasing wait periods, bot challenges, and risk-based controls. Treat 100 as a ceiling for conforming deployments, not a recommended product default.

## Prefer Bounded Backoff to Permanent Lockout

An example policy might allow a few immediate attempts, then impose progressively longer waits with a maximum delay. Exact numbers require a threat model, code length, accepted TOTP window, user population, and recovery capability.

```text
state = load_authoritative_attempt_state(account, factor)

if now < state.next_allowed_at:
    return generic_failure_with_retry_after()

if !verify_once(submitted_code):
    state.failures += 1
    state.next_allowed_at = now + bounded_backoff(state.failures)
    atomic_save(state)
    return generic_failure()

atomic_clear_or_decay(state)
complete_authentication()
```

Make check, failure increment, and next-allowed calculation atomic. Otherwise parallel requests can all pass an old limit. Do not perform expensive Argon2 or KMS operations before a cheap authoritative throttle check when the request can be rejected safely.

Avoid precise public counters such as “two attempts remain,” which help attackers tune activity. A coarse `Retry-After` may improve legitimate behavior, but invalid account, invalid code, replay, and throttled states should not become an enumeration oracle.

## Define What Resets the Budget

A successful verification of the factor can clear or decay its failures. Merely supplying the correct password should not erase MFA failures: an attacker with a stolen password could use that to obtain unlimited OTP guesses.

Do not let creation of a new pre-MFA session reset the account-wide budget. Bind transaction-level bursts to a broader account/factor counter. Expiring the short challenge stops replay of that challenge but does not forgive the underlying attack history.

Recovery and alternate factors need their own budgets and a shared risk view. Otherwise an attacker can rotate among TOTP, recovery codes, SMS, and support workflows. At the same time, do not let failures against one optional factor permanently disable every recovery method. Escalate suspicious accounts to stronger proof, delay, and owner notification according to policy.

## Make Lockout Safe When Disablement Is Required

For high-assurance or standards-driven environments, the failure ceiling may require disabling an authenticator. Under NIST SP 800-63B-4, a disabled authenticator must be rebound before it can be used again; if excessive attempts involved more than one authenticator, all involved authenticators must be disabled. This does not necessarily disable the identity or untouched authenticators, so preserve a separately secured recovery route or another enrolled factor. Notify the owner without including submitted codes.

Support must not bypass the limit on request. Any administrative recovery should follow documented identity verification, separation of duties for high-value accounts, and an audit trail. Attackers often create the denial of service precisely to pressure support into a weak exception.

## Threat Model and Failure Modes

Defend against brute force from one source, distributed low-and-slow guessing, parallel races, username-based lockout attacks, cost exhaustion of SMS/push providers, and compromised passwords used to reset budgets. Common failures are IP-only limiting, permanent account lockout after a tiny public threshold, counters stored on one node, resetting on password success, treating each accepted TOTP counter as a separate attempt, and allowing each new challenge a fresh global budget.

Remember that each submitted code is one attempt even if the verifier checks several permitted time counters internally.

## Rollout and Test Checklist

- Model guess probability from code length, validation window, and attempt policy.
- Enforce atomic account/factor limits in shared authoritative storage.
- Add IP, device, tenant, provider-cost, and global protection as secondary layers.
- Test parallel requests cannot exceed the intended burst.
- Verify new sessions and correct passwords do not reset MFA failures.
- Exercise distributed attacks and shared NAT users separately.
- Keep another secure factor or recovery path available after factor disablement.
- Alert on sprays, repeated recovery switching, and messaging-cost spikes.

## References

- [NIST SP 800-63B-4: Rate Limiting](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#throttle)
- [RFC 4226: HOTP Throttling Parameter](https://datatracker.ietf.org/doc/html/rfc4226#section-7.3)
- [RFC 6238: TOTP Security Considerations](https://datatracker.ietf.org/doc/html/rfc6238#section-5)
- [OWASP Authentication Cheat Sheet: Login Throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Conclusion

Throttle MFA primarily by account and factor, reinforce it with network and global abuse controls, and use atomic bounded backoff. When a factor must be disabled, preserve an independently secured recovery route so an attacker cannot turn guessing protection into a support-assisted denial of service.
