# Validation Summary: How to Introduce Keyed PAN Hashing While Handling Legacy Hashes Under PCI DSS

## Status
validated

## Post Type
Technical migration guide with a Python cryptographic example and an illustrative JSON record format.

## Technologies Covered
- PCI DSS requirements for stored PAN protection, scope, and cryptographic key management.
- HMAC-SHA-256 and migration from legacy unkeyed hashes.
- Python standard-library `hmac` and `secrets` APIs and string validation.
- Versioned JSON digest records and key rotation.

## Sources Consulted
- PCI SSC FAQ 1573, legacy hashes and the 31 March 2025 effective date: https://www.pcisecuritystandards.org/faqs/1573/
- PCI SSC FAQ 1089, hashing and PCI DSS scope (updated March 2026): https://www.pcisecuritystandards.org/faqs/1089/
- PCI SSC glossary, keyed cryptographic hashing and effective strength: https://www.pcisecuritystandards.org/glossary/
- PCI SSC SAQ D for Service Providers v4.0, requirement 3.5.1.1 and key protection and lifecycle requirements 3.6 and 3.7: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf
- PCI SSC SAQ D for Merchants v4.0, requirement 3.7.5 on retirement and archived keys: https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf
- PCI SSC FAQ 1308, correlation controls for hashed and truncated PAN: https://www.pcisecuritystandards.org/faqs/1308/
- Python HMAC documentation: https://docs.python.org/3/library/hmac.html
- Python secrets documentation: https://docs.python.org/3/library/secrets.html
- Python built-in types, ASCII/decimal checks and encoding: https://docs.python.org/3/library/stdtypes.html
- RFC 2104, HMAC construction: https://www.rfc-editor.org/rfc/rfc2104
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post correctly distinguishes previously stored hashes from hashing processes operating after the effective date; ongoing legacy lookup needs assessment.
- Confirmed that the requirement covers the entire PAN and references key management under requirements 3.6 and 3.7. The glossary supports HMAC with at least 128 bits of effective cryptographic strength. The JSON is an application-defined example, not a PCI-mandated schema; its digest value is explicitly a placeholder.
- Executed the exact Python example on Python 3.13.1; both assertions passed. Additional checks passed for empty input, non-ASCII digits, whitespace, signs, short and overlong values, accepted 8- and 19-character boundaries, leading-zero preservation, 64-character hexadecimal output, and equivalence to hmac.new(...).hexdigest(). Parsed the JSON successfully.
- The APIs are documented and not deprecated. hmac.digest and str.isascii require Python 3.7 or later. The 32-byte random key is appropriate for the narrow demonstration; the post explicitly excludes production key storage and full PAN validation. Its length check is not a universal payment-network acceptance rule.
- Equality assertions are demonstration checks, not verification of an attacker-supplied authentication tag. Production tag verification should use hmac.compare_digest where applicable. A different random key produces a different digest with overwhelming probability, rather than a mathematical guarantee.
- Hashing an existing digest does not produce HMAC over the original PAN. One-way hashing has no supported inverse; this does not imply that weak legacy PAN hashes are immune to guessing attacks.
- Reviewed the rotation and scope guidance as architectural advice. Retention of historical keys remains subject to cryptoperiod, compromise response, access restrictions, and secure archival requirements; business reconciliation does not override those requirements.
- All links in the post resolved to the intended resources. The direct PCI DSS v4.0.1 standard PDF returned HTTP 403 in the browser tool; the requirement text was cross-checked using accessible official v4.0 SAQ documents and current PCI SSC FAQs and glossary. This review does not certify a production deployment.
- No terminal commands or vendor-specific configuration appear in the post.
