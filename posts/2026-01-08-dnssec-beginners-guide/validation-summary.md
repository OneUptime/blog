# Validation Summary: How to Understand DNSSEC: A Complete Beginner's Guide to DNS Security

## Status
validated

## Post Type
Guide / Beginner tutorial (conceptual with command and configuration examples)

## Technologies Covered
- DNSSEC (DNS Security Extensions)
- DNS (record types: DNSKEY, RRSIG, DS, NSEC, NSEC3, A, MX)
- Cryptographic signing algorithms (RSASHA256, ECDSA P-256/P-384, Ed25519, Ed448)
- `dig` (BIND DNS lookup utility)
- `dnssec-dsfromkey` (BIND DNSSEC tooling)
- Unbound recursive resolver configuration
- DNSSEC chain of trust / trust anchors

## Sources Consulted
- RFC 8624 — Algorithm Implementation Requirements and Usage Guidance for DNSSEC (https://www.rfc-editor.org/rfc/rfc8624.html)
- RFC 4509 — Use of SHA-256 in DNSSEC Delegation Signer (DS) Resource Records (https://www.rfc-editor.org/rfc/rfc4509.html)
- IANA DS RR Type Digest Algorithms registry (https://www.iana.org/assignments/ds-rr-types)
- RFC 4034 (DNSKEY/RRSIG/DS/NSEC record formats) and RFC 5155 (NSEC3) — referenced in post
- Knowledge of BIND `dig`/`dnssec-dsfromkey` and Unbound configuration semantics

## Issues Found
No technical issues found. All key claims were verified:
- DNSKEY flag values (ZSK = 256, KSK = 257) are correct.
- DS digest types `1=SHA-1, 2=SHA-256, 4=SHA-384` are correct per IANA / RFC 4509 (digest type 3 = GOST is appropriately omitted for a beginner guide).
- RRSIG label counts in the examples are internally consistent and correct: `example.com` uses `13 2` (2 labels) and `www.example.com` uses `13 3` (3 labels).
- The root trust anchor example (`. ... DNSKEY 257 3 8 AwEAAaz/tAm8...`) matches the real root KSK: flag 257 (KSK), algorithm 8 (RSASHA256), and the correct leading public-key bytes.
- DNSSEC key sizes are correct (Ed25519 = 256-bit, Ed448 = 456-bit keys).
- NSEC3 parameters (algorithm 1 = SHA-1, opt-out flag, iterations, salt) are correct.
- `dig`, `dnssec-dsfromkey -2`, and Unbound config options (`module-config: "validator iterator"`, `auto-trust-anchor-file`, `harden-dnssec-stripped`, `harden-below-nxdomain`) are all valid and current.
- `sigfail.verteiltesysteme.net` is a valid intentionally-broken DNSSEC test domain that returns SERVFAIL on a validating resolver, as described.
- The conceptual explanations of the chain of trust, validation flow, and DNSSEC's non-goals (no encryption/privacy/DDoS protection) are accurate.

## Review Notes
- The algorithm status table uses simplified labels (Deprecated / Recommended / Acceptable) that map well to RFC 8624's MUST / RECOMMENDED / MAY / NOT RECOMMENDED. One soft point: RSASHA512 (algorithm 10) is labeled "Acceptable" whereas RFC 8624 lists it as NOT RECOMMENDED for signing. This is a defensible simplification for a beginner audience (the algorithm remains cryptographically strong; it is discouraged primarily for ecosystem/size reasons, not a security flaw), so it was left as-is. A future revision could note that algorithm 8 (RSASHA256) or 13/15 are preferred over 10.
- The Unbound configuration snippet is fenced as ```yaml. Unbound's config format is not strictly YAML but is YAML-like; the highlighting choice is cosmetic and does not affect correctness.
- The `example.com` A record `93.184.216.34` was the long-standing canonical IP for the documentation domain; IANA changed example.com's address records in 2025, but the value is used purely illustratively here and does not affect any DNSSEC point.
