# Validation Summary: How to Set and Verify a PCI DSS Cardholder-Data Retention and Deletion Schedule

## Status
validated

## Post Type
Technical guide. Although it contains no executable code, commands, or configuration snippets, it provides implementation details for expiry enforcement, storage disposal, cryptographic erasure, verification, and backup restoration.

## Technologies Covered
- PCI DSS v4.0.1 account-data retention and disposal controls
- Primary account numbers (PAN), cardholder data, sensitive authentication data (SAD), and provider references
- Database deletion, replicas, historical versions, transaction logs, and backups
- Object versioning and immutable storage
- Cryptographic erasure and encryption-key lifecycle management
- Automated expiry, disposal verification, and restoration reconciliation

## Sources Consulted
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — verified the post's standard links and version listing. The linked official PDF returned an access error; the standard text was read in a [copy of PCI SSC's June 2024 v4.0.1 document hosted by Red Hat](https://issues.redhat.com/secure/attachment/13274529/PCI-DSS-v4_0_1.pdf), particularly Requirements 3.2.1 and 3.3 and the account-data definitions.
- [PCI SSC FAQ 1318: Maximum storage period for cardholder data](https://www.pcisecuritystandards.org/faqs/1318/) — retention duration and disposal obligations.
- [NIST SP 800-88 Rev. 2: Guidelines for Media Sanitization](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-88r2.pdf) — cryptographic erasure and key sanitization considerations.
- [PostgreSQL: Routine Vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html) — deleted row versions can remain after logical deletion.
- [PostgreSQL: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html) — backups and archived transaction logs support restoration of earlier database states.
- [Amazon S3: Locking objects with Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) — retention locks, protected versions, and deletion behavior.
- [AWS KMS: Delete an AWS KMS key](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html) — disabling versus destroying keys, replicas, imported material, and backup considerations.
- [Stripe API: Create a refund](https://docs.stripe.com/api/refunds/create) — refunds can reference an existing Charge or PaymentIntent rather than require the merchant to supply PAN.

## Issues Found
No technical issues found.

## Review Notes
- Requirement 3.2.1 supports the stated storage minimization, documented retention justification, all-location coverage, disposal, and verification at least every three months. PCI DSS does not set a universal PAN retention duration; the verification interval does not extend an approved retention period.
- The post correctly distinguishes ordinary merchant SAD handling from issuing-related provisions. Pre-authorization SAD retention coverage is applicable by the review date; its transition deadline was 31 March 2025.
- The TPSP and geographic-copy guidance agrees with the requirement's applicability notes. Inventorying tokens and limited display data is sensible operational guidance, not a claim that every token or truncated value has identical PCI scope.
- Vendor documentation corroborates the storage risks using concrete implementations; behavior remains technology-dependent, as the post states. Logical database deletion does not necessarily erase old versions, and restoring an earlier database state can reintroduce removed records.
- Cryptographic erasure requires addressing recoverable key material. Temporarily disabling a key is reversible and does not establish permanent erasure. Immutable storage settings must be evaluated before ingestion because retention protection can prevent timely deletion.
- Retry handling, synthetic boundary tests, protected verification references, and restoration reconciliation are implementation recommendations. The article does not present them as separately numbered PCI requirements.
- No executable examples required runtime testing. README.md was left unchanged. The PCI library links are appropriate but broad; the source-access limitation and alternate copy used are documented above.
