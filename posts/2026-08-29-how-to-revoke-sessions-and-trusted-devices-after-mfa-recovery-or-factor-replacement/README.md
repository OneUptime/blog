# How to Revoke Sessions and Trusted Devices After MFA Recovery or Factor Replacement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MFA, Session Management, Recovery, Authentication, Security

Description: Make recovery and factor replacement a security-epoch transition that invalidates sessions, refresh families, trusted-browser tokens, and stale authorization promptly.

---

Replacing a lost factor closes only one door. An attacker may already hold a session cookie, refresh token, trusted-browser token, mobile session, or pending step-up grant. If those credentials survive recovery, the attacker can remain signed in or skip the newly repaired MFA boundary.

Treat recovery and factor replacement as account-wide security-state changes, then decide explicitly which authority survives.

## Inventory Every Credential Class

Revocation cannot cover credentials the identity system does not know about. Model and track:

- web and mobile sessions by opaque `sid`;
- refresh-token families and device grants;
- short-lived access-token `jti` values or their session/epoch relationship;
- trusted-browser selectors;
- pending MFA, recovery, password-reset, and factor-change transactions;
- remembered OAuth grants and application-specific device sessions;
- API keys and personal access tokens where recovery policy requires review.

Do not confuse a trusted-browser token with a recovery code or an ordinary session cookie. It may be a separate long-lived credential that suppresses MFA and therefore needs an explicit revocation path.

Under NIST SP 800-63B-4, cookies and similar “remember my browser” features cannot replace authentication except for the limited AAL2 reauthentication case in which the inactivity limit has expired but the overall timeout has not.

## Use a Security Epoch

Maintain a monotonically increasing `security_epoch` or `factor_generation` on the account. Bind every newly issued session, refresh family, trusted-browser record, and sensitive action grant to the current value.

```text
accept(credential) only if:
  credential.user_id == account.id
  credential.security_epoch == account.security_epoch
  credential is active and not expired
```

Recovery completion increments the epoch in the authoritative datastore. This invalidates all older bound credentials immediately wherever the live check is enforced, while asynchronous cleanup marks individual records revoked.

A local epoch cache must have a bounded, risk-appropriate staleness. For factor changes and recovery, publish high-priority invalidation events and fail closed at sensitive endpoints if current state cannot be obtained. Eventual cleanup alone leaves a known takeover window.

## Order the Transition Safely

Use a transaction or durable workflow with idempotent stages:

1. lock the account's security state;
2. approve the constrained recovery/factor replacement transaction;
3. increment the security epoch and invalidate the old factor;
4. revoke sessions, refresh families, trusted devices, and pending grants;
5. activate the verified replacement factor;
6. issue a short-lived, narrowly authorized recovery-completion session if policy permits, without treating it as authenticated at the account's normal AAL;
7. commit audit evidence and send notifications.

If the new factor must be verified before cutover, do that while it is pending, then perform steps 3–5 atomically.

For routine renewal of an uncompromised authenticator, bind and successfully use the replacement before invalidating the old one. If the old authenticator is lost or suspected of compromise, suspend or invalidate it promptly, then use the formal recovery process to establish the replacement.

The session conducting recovery should not simply survive the epoch change as a normal fully authenticated session. Exchange it for a short-lived, narrowly authorized recovery-completion session, then require authentication with the replacement authenticator before issuing a normal authenticated session.

## Handle JWTs and OAuth Tokens

Self-contained JWT access tokens cannot be recalled by changing their contents. Use short expiry plus one or more of:

- an online check of `sid` and security epoch;
- token introspection by the resource server;
- a bounded denylist for compromised `jti` values;
- sender-constrained tokens to limit replay.

RFC 7009 defines OAuth token revocation. Revoke refresh tokens and their family, and configure the authorization server to revoke related access where supported. A successful HTTP response from a revocation endpoint is not proof every independent application session disappeared; inventory RP sessions and use standardized logout/back-channel mechanisms where available.

API keys are not automatically sessions. For a routine factor addition, blanket API-key deletion may be disruptive. After account recovery or suspected takeover, freeze or revoke high-impact keys according to explicit policy and show the user what needs rotation.

## Make Revocation Observable

Notify the owner at established destinations with event time, broad context, factor type, and a safe fraud-report path. Do not send secrets, full session identifiers, or one-click links that restore access.

Monitor revocation fan-out: expected versus completed session updates, event-consumer lag, failed provider calls, access with an old epoch, and use of revoked refresh families. A security control that silently stops at one regional cache is not complete.

## Threat Model and Failure Modes

Defend against persistent stolen sessions, refresh-token replay, trusted-device reuse, race conditions during recovery, stale regional caches, lost revocation events, and external RP sessions. Common failures include revoking only the old TOTP secret, letting the recovery session remain fully privileged, updating epoch after issuing the new session, refreshing old access after recovery, and assuming password change or RFC 7009 automatically logs out every system.

## Rollout and Test Checklist

- Inventory every credential and pending transaction tied to account authority.
- Bind sessions, refresh families, trusted devices, and grants to a security epoch.
- Increment the epoch and activate/invalidate factors in a safe atomic transition.
- Exchange the recovery transaction for a restricted recovery-completion session, then require authentication before a normal session.
- Use short JWT lifetime plus online epoch/session enforcement where required.
- Revoke OAuth token families and separately address RP/application sessions.
- Test races, cache loss, event duplication, partitions, and regional failover.
- Alert on old-epoch use and incomplete revocation fan-out.

## References

- [NIST SP 800-63B-4: Session Management](https://pages.nist.gov/800-63-4/sp800-63b/session/)
- [NIST SP 800-63B-4: Account Recovery](https://pages.nist.gov/800-63-4/sp800-63b.html#recovery)
- [RFC 7009: OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
- [RFC 7662: OAuth 2.0 Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662)
- [OpenID Connect Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Conclusion

Recovery and replacement of a lost or compromised factor must trigger account-wide invalidation of credentials that could preserve old authority—using a security epoch or an equivalent mechanism—not merely swap one authenticator row. Enforce the transition online where risk demands it, and monitor revocation until all dependent systems converge.
