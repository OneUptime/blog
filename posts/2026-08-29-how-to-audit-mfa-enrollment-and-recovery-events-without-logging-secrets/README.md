# How to Audit MFA Enrollment and Recovery Events Without Logging Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MFA, Audit Log, Logging, Security, Privacy

Description: Create useful, tamper-resistant MFA lifecycle evidence with opaque identifiers and policy outcomes while excluding codes, keys, tokens, and provisioning payloads.

---

MFA audit data must answer who initiated a security change, which policy authorized it, what changed, and whether revocation completed. Logging the TOTP secret, recovery code, submitted OTP, cookie, or JWT would turn the evidence system into a credential database.

Design a structured event schema first, then make secret exclusion enforceable in code and tests.

## Log Lifecycle Events, Not Credential Values

At minimum, emit events for:

- enrollment requested, verified, activated, expired, and cancelled;
- factor used, failed, rate-limited, disabled, renamed, and revoked;
- saved recovery-code set created, rotated, used, and exhausted;
- recovery requested, evidence stage completed, approved, denied, and completed;
- trusted browser issued and revoked;
- session/security epoch advanced and revocation fan-out completed;
- support or administrator access to recovery tooling and decisions.

Separate authentication outcomes from lifecycle changes. “TOTP succeeded” and “new TOTP factor activated” are different events with different impact.

Use one append-only structured schema:

```json
{
  "event_type": "mfa.factor.activated",
  "event_version": 1,
  "occurred_at": "2026-08-29T12:34:56.789Z",
  "actor": {"type": "user", "id": "usr_opaque"},
  "subject_id": "usr_opaque",
  "factor": {"id": "fac_opaque", "type": "webauthn"},
  "auth_context": {"acr": "local-policy-2", "age_seconds": 42},
  "result": "success",
  "policy_rule": "factor-add-existing-strong-proof",
  "security_epoch_before": 11,
  "security_epoch_after": 12,
  "request_id": "req_opaque",
  "service": "identity-api"
}
```

Use immutable internal IDs rather than email addresses or mutable display names. Keep event reasons as controlled categories, not raw exception strings that may contain request bodies.

## Explicitly Denylist Sensitive Fields

Never log:

- TOTP/HOTP shared secrets or `otpauth://` URIs;
- QR images or manual enrollment keys;
- submitted OTPs, push matching numbers, or saved/issued recovery codes;
- password values or password-reset tokens;
- session cookies, trusted-browser validators, refresh/access tokens, or full JWTs;
- WebAuthn private data, raw assertions, full `clientDataJSON`, or challenges;
- KMS plaintext keys, wrapped DEKs copied wholesale, or cryptographic headers not needed for audit;
- identity-proofing documents or biometrics in routine authentication logs.

Public keys and credential IDs are not private keys, but routine audit usually needs only an opaque internal factor ID. Minimizing them reduces correlation and credential-inventory exposure.

Do not log verifiers for any recovery credential. Hashes of six-digit OTPs and short issued recovery codes are readily testable because of their tiny input spaces; high-entropy saved recovery-code verifiers still belong only in the authentication datastore, not in telemetry. For session correlation, use an audit-specific keyed digest of an opaque session ID or, preferably, a separate random audit correlation ID. Keep the audit HMAC key outside the log platform.

## Capture Enough Context to Investigate

Useful context includes actor type, target subject, factor type and opaque ID, policy branch, outcome/reason category, authentication method/age, service, tenant, request trace, server time, and before/after security epoch.

IP address, precise location, user agent, device name, and support evidence are personal data. Collect only what investigation and policy justify, restrict access, coarsen where possible, and set a retention schedule. Never let a mutable client-supplied device label become trusted attribution.

For failure events, avoid account enumeration in public responses while retaining a protected reason such as `invalid_code`, `replay`, `expired_transaction`, or `throttled`. Control access to detailed reasons because they can reveal factor inventory and attack strategy.

## Protect the Audit Pipeline

Send events over authenticated encrypted transport to centralized storage. Give the application append-only write authority, not permission to alter or delete history. Restrict readers by role, record audit-log access, synchronize clocks, and monitor ingestion gaps, schema failures, queue backlog, and dropped events.

Use storage immutability, signatures/hash chaining, or platform write-once controls when the risk and compliance model require tamper evidence. These controls do not replace access control or backups. Document retention, legal holds, and secure deletion for expired personal data.

Security-critical state changes should not succeed silently if required audit durability fails. Choose and document which events block the operation, which use a durable local outbox, and how duplicates are deduplicated. An outbox transaction can commit the factor change and its event intent together, then deliver at least once.

## Alert on Sequences, Not Just Single Events

High-signal detections include:

- recovery followed by a new factor and payout/API-key change;
- factor addition from a new session or unusual context;
- multiple denied recovery cases across accounts from one source;
- support operator recovery volume outside baseline;
- trusted-browser issuance immediately after recovery;
- old-security-epoch credential use after revocation;
- repeated TOTP replay or widening drift across many accounts.

Notify the account owner about material lifecycle changes through established channels, but do not copy internal risk scores or sensitive evidence into the message.

## Threat Model and Failure Modes

Defend against secrets leaking through debug logs, malicious insiders hiding recovery, log injection, mutable history, missing regional events, excessive personal-data retention, and attackers using detailed errors as an oracle. Common failures include logging whole HTTP bodies, JWTs, QR URIs, short-code hashes, free-form support notes, and assuming a successful application call means the event reached durable storage.

## Rollout and Test Checklist

- Define versioned event types and controlled result/reason categories.
- Use opaque actor, subject, factor, case, session-correlation, and request IDs.
- Apply centralized field redaction and secret-aware logging APIs.
- Add tests that inject canary secrets and assert none reach any telemetry sink.
- Make lifecycle change and durable event intent atomic through an outbox.
- Restrict append/read/delete permissions and audit log access itself.
- Monitor ingestion gaps, schema rejection, clock skew, and revocation completion.
- Review retention and privacy impact with security, legal, and support teams.

## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Logging Vocabulary Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B-4: Records Retention](https://pages.nist.gov/800-63-4/sp800-63b.html#records-retention-policy)
- [NIST SP 800-92: Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final)
- [W3C WebAuthn Level 3: Privacy Considerations](https://www.w3.org/TR/webauthn-3/#sctn-privacy-considerations)

## Conclusion

An MFA audit trail should preserve decisions and lifecycle transitions, not credential material. Structured opaque identifiers, controlled reason codes, transactional event delivery, tamper resistance, least-privileged access, and tested redaction make the record useful without creating a new source of account takeover.
