# Validation Summary: How to Build Encryption Key Management Details

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- Python cryptography AESGCM and HKDF APIs
- Hardware Security Modules
- PKCS#11
- AWS CloudHSM
- HashiCorp Vault Transit secrets engine
- Shamir's Secret Sharing
- PCI DSS, HIPAA, SOC 2, and GDPR compliance considerations

## Sources Consulted
- cryptography authenticated encryption documentation: https://cryptography.io/en/latest/hazmat/primitives/aead/
- cryptography key derivation documentation: https://cryptography.io/en/latest/hazmat/primitives/key-derivation-functions/
- RFC 5869, HMAC-based Extract-and-Expand Key Derivation Function: https://datatracker.ietf.org/doc/html/rfc5869
- HashiCorp Vault Transit secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/transit
- PCI DSS v4.0 SAQ D Merchant, Requirement 3 key-management excerpts: https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf
- HHS HIPAA Security Rule encryption FAQ: https://www.hhs.gov/hipaa/for-professionals/faq/2001/is-the-use-of-encryption-mandatory-in-the-security-rule/index.html
- GDPR Article 32, Security of processing: https://gdpr-info.eu/art-32-gdpr/
- AICPA Trust Services Criteria overview: https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022

## Issues Found
- The KEK rotation example derived the new KEK from only the master key and environment, which would produce the same KEK during rotation. Updated KEK derivation to include a `kek_id`, stored that identifier in backup metadata, and used the new KEK ID during rotation.
- The rotation helper `_retrieve_kek` was left as `pass`, making the re-wrap flow incomplete. Updated it to derive the KEK from stored metadata using the same `kek_id`-bound derivation path.
- Several later Python snippets depended on imports that were not shown in the snippet. Added missing imports for `Optional`, `List`, `base64`, `datetime`, `timezone`, `uuid`, `os`, `hashlib`, and `AESGCM` where needed.
- The compliance matrix overstated key escrow as a required control for PCI DSS, HIPAA, and GDPR, and described HSM use too narrowly. Updated those rows to use risk-based or contingency-based recovery language and to describe secure key storage/HSM as HSM/SCD or equivalent where appropriate.
- The audit tag examples used older or overly specific PCI DSS control references for key operations. Updated the key-operation PCI DSS references to align with the PCI DSS v4.0 Requirement 3.6 key-protection language used by the cited PCI source.

## Review Notes
The examples are illustrative and still rely on placeholder storage, HSM, approval, and notification components. The AES-GCM usage matches the cryptography API shape and uses fresh 96-bit nonces, but production backup systems should also enforce nonce uniqueness, authenticated metadata schemas, durable key version lookup, and tamper-evident audit log storage.
