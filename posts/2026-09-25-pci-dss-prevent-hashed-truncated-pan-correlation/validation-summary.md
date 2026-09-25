# Validation Summary: How to Prevent Correlation Between Hashed and Truncated PAN Values Under PCI DSS

## Status

validated

## Post Type

Technical security implementation guide. Although it contains no executable code, commands, or configuration snippets, it provides concrete guidance on data flows, access boundaries, cryptographic services, exports, and security testing, so it qualifies for technical review.

## Technologies Covered

- PCI DSS PAN protection and assessment scope
- Keyed cryptographic hashing and key management
- PAN truncation and display masking
- Database joins, data exports, backups, and network segmentation
- Identity permissions, cryptographic service authorization, and audit monitoring

## Sources Consulted

- [PCI SSC FAQ 1308: Preventing correlation of hashed and truncated versions](https://www.pcisecuritystandards.org/faqs/1308/) — additional controls and recognition of managed keyed hashing.
- [PCI SSC FAQ 1146: Masking versus truncation](https://www.pcisecuritystandards.org/faqs/1146/) — display concealment versus removal of stored digits.
- [PCI SSC FAQ 1117: Protection and scope of truncated PANs](https://www.pcisecuritystandards.org/faqs/1117/) — segmentation, combined truncation formats, and scope conditions.
- [PCI SSC FAQ 1089: Hashing PANs and assessment scope](https://www.pcisecuritystandards.org/faqs/1089/) — entire-PAN hashing, strong cryptography, keyed hashing, and separate environments.
- [PCI SSC FAQ 1091: Acceptable truncation formats](https://www.pcisecuritystandards.org/faqs/1091/) — PAN-length and payment-brand-dependent formats.
- [PCI SSC FAQ 1573: Previously hashed PANs](https://www.pcisecuritystandards.org/faqs/1573/) — the effective date and applicability of keyed hashing to hashing processes.
- [PCI DSS v4.0 SAQ D for Service Providers](https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf) — Requirements 3.2.1 and 3.5.1.1 concerning disposal across storage locations and managed keyed hashing. Current PCI SSC FAQs were also checked for subsequent clarifications.
- [Author GitHub profile](https://www.github.com/nawazdhandala) — verified that the author link resolves.

## Issues Found

- The post stated that removing a dataset also removes its replicas, exports, access reviews, and deletion burden. Deleting a primary dataset does not inherently dispose of independent copies. Reworded this sentence to make the reduction in ongoing obligations conditional on secure disposal of replicas, backups, and exports under the retention policy. This is consistent with Requirement 3.2.1's coverage of all storage locations and secure disposal of data no longer needed. No other technical changes were necessary.

## Review Notes

- Confirmed that FAQ 1308 explicitly recognizes keyed cryptographic hashing with appropriate key management as an additional correlation control. The article correctly avoids treating its examples as a universal compliance checklist.
- Confirmed the distinction between masking and truncation, the risks of combining different truncation formats, and the conditional scope treatment of hashed and truncated values.
- Whole-PAN keyed hashing guidance is accurate. FAQ 1573 distinguishes previously hashed data from hashing processes: after 31 March 2025, processes used to render PAN unreadable must meet keyed-hashing requirements. The legacy unkeyed-hash inventory example does not itself assert that continued unkeyed hashing is acceptable.
- The guessing-oracle discussion is a sound engineering inference: an identity able to compute candidate digests can compare them with stored digests even without retrieving the key. Rate controls and purpose-specific APIs are presented as environmental design measures, not as verbatim PCI DSS requirements or sufficient controls by themselves.
- Role-based synthetic testing, export-path checks, backup-restore checks, and attributable logging are reasonable validation techniques. No running environment was supplied, so these are reviewed recommendations rather than executed security tests.
- All distinct external links in the post resolved to the expected resources. No executable examples or versioned APIs required runtime testing.
