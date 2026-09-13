# Validation Summary: Reject Idempotency Key Reuse with a Different Payload

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Python
- JSON
- SHA-256 request fingerprinting
- Idempotent API design
- RFC 8785 JSON Canonicalization Scheme
- PostgreSQL unique constraints

## Sources Consulted

- [Python JSON encoder and decoder](https://docs.python.org/3/library/json.html)
- [Python hashlib](https://docs.python.org/3/library/hashlib.html)
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html)
- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)

## Issues Found
No technical issues found.

## Review Notes
The Python example was executed to confirm that reordered and differently spaced JSON objects produce the same fingerprint, while duplicate members, nonstandard numeric constants, boolean amounts, and floating-point amounts are rejected as described. The post correctly distinguishes its restricted deterministic JSON encoding from RFC 8785 canonicalization and appropriately treats request fingerprints as neither authorization nor signatures.
