# Validation Summary: How to Audit MFA Enrollment and Recovery Events Without Logging Secrets

## Status
validated

## Post Type
Security implementation guide

## Technologies Covered

- MFA enrollment, factor management, account recovery, and trusted-browser lifecycle events
- Structured JSON audit logging and controlled event schemas
- TOTP/HOTP authenticators and saved or issued recovery codes
- WebAuthn public-key credentials, assertions, challenges, and credential identifiers
- HMAC-based correlation identifiers, signed logs, anchored hash chains, immutable storage, and write-once controls
- Transactional outbox delivery, at-least-once event delivery, and duplicate handling
- Session and token revocation using a security epoch
- Privacy-aware retention, access control, monitoring, and alerting

## Sources Consulted

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Logging Vocabulary Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B-4: Authentication and Authenticator Management — Records Retention Policy](https://pages.nist.gov/800-63-4/sp800-63b.html#records-retention-policy)
- [NIST SP 800-63B-4: Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- [NIST SP 800-92: Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final)
- [NIST SP 800-92 Rev. 1 Initial Public Draft: Cybersecurity Log Management Planning Guide](https://csrc.nist.gov/pubs/sp/800/92/r1/ipd)
- [W3C Web Authentication Level 3 — Privacy Considerations](https://www.w3.org/TR/webauthn-3/#sctn-privacy-considerations)
- [RFC 4226: HOTP](https://www.rfc-editor.org/rfc/rfc4226.html)
- [RFC 6238: TOTP](https://www.rfc-editor.org/rfc/rfc6238.html)
- [RFC 2104: HMAC](https://www.rfc-editor.org/rfc/rfc2104.html)
- [RFC 5848: Signed Syslog Messages](https://www.rfc-editor.org/rfc/rfc5848.html)
- [AWS Prescriptive Guidance: Transactional Outbox Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [AWS CloudTrail: Validating Log File Integrity](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html)

## Issues Found

- The post categorically described IP addresses, precise locations, user agents, device names, and support evidence as personal data. Whether every item is personal data depends on its content, context, linkability, and applicable law. The sentence now says these values can be personal data or otherwise privacy-sensitive, preserving the required data-minimization guidance without overstating the classification.
- The post listed signatures and hash chaining together as tamper-evidence controls without qualifying a bare hash chain. An attacker able to rewrite the complete log could recompute an unauthenticated chain. The guidance now specifies protected signing keys and requires hash-chain heads to be periodically signed or anchored outside the writable log store.

## Review Notes

- The structured event example is valid JSON. Its identifiers and policy values are intentionally application-defined rather than claims of a standard audit schema.
- All six links in the post resolve to the intended authoritative documents.
- WebAuthn challenges and raw assertions are not reusable bearer secrets when the protocol is implemented correctly. Excluding them from routine audit logs is nevertheless sound data-minimization and defense-in-depth guidance because they expose ceremony context and may contain correlatable data.
- NIST SP 800-92 remains the current final publication. Revision 1 is still an Initial Public Draft and has not superseded it; the reference should be revisited if NIST finalizes the revision.
- An outbox provides atomicity only when the state change and outbox record are committed in the same local transaction. The post states this requirement and correctly calls for deduplication under at-least-once delivery.
- Opaque internal identifiers are pseudonymous rather than anonymous when they remain linkable to an account, so the post's access-control and retention guidance still applies to them.
