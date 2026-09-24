# Validation Summary: How to Define the IP Inventory for Quarterly PCI DSS ASV Scans

## Status
validated

## Post Type
Technical guide. Although it contains no executable code, it provides technical implementation details for constructing and reconciling an external scan inventory, identifying hostname and address exposure, and documenting segmentation exclusions. It therefore qualifies for technical review.

## Technologies Covered
- PCI DSS v4.0.1, Requirements 11.3.2 and 11.3.2.1
- Approved Scanning Vendor (ASV) scanning and vulnerability management
- SAQ A e-commerce payment redirects and embedded iframes
- DNS, FQDNs, IPv4, IPv6, and AAAA records
- TLS Server Name Indication (SNI) and virtual hosting
- CDNs, origin servers, load balancers, NAT, and shared cloud hosting
- Network segmentation and asset inventory management

## Sources Consulted
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — verified the linked resource and its PCI DSS v4.0.1 listing.
- [PCI DSS v4.0.1, Requirements and Testing Procedures](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf) — Requirements 11.3.2 and 11.3.2.1, including applicability notes, printed pages 271–273. The official PDF returned HTTP 403; consulted a [mirror of the PCI SSC-authored document](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf).
- [PCI SSC ASV Program Guide v4.0, Revision 2](https://docs-prv.pcisecuritystandards.org/Programs%20and%20Certification/Approved%20Scanning%20Vendor%20(ASV)/ASV-Program-Guide-v4.0r2.pdf) — customer responsibilities, scope, segmentation, shared hosting, discovery, interference, and scan reporting. The official download was inaccessible; consulted the [reproduced PCI SSC document on Scribd](https://www.scribd.com/document/686715606/ASV-Program-Guide-v4-0r2), particularly sections 4.6, 5.5, 5.6, and 7.
- [PCI SSC FAQ 1604](https://www.pcisecuritystandards.org/faqs/1604/) — June 2026 clarification of SAQ A scanning for redirects and embedded iframes.
- [PCI SSC ASV Resource Guide announcement](https://blog.pcisecuritystandards.org/resource-guide-vulnerability-scans-and-approved-scanning-vendors) — quarterly scanning and SAQ A applicability.
- [RFC 3596, section 2.1](https://www.rfc-editor.org/info/rfc3596/) — AAAA records store IPv6 addresses.
- [RFC 6066, section 3](https://www.rfc-editor.org/rfc/rfc6066.txt) — TLS server names support virtual servers sharing a network address.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged.
- Confirmed that Requirement 11.3.2 calls for ASV scans at least every three months, remediation to meet passing criteria, and rescans as needed. Its applicability notes explicitly address coordination over topology, providers, protocols, and interference.
- Confirmed that Requirement 11.3.2.1 requires external scans after significant changes, qualified personnel, and organizational independence; an ASV or QSA is not mandatory for those scans.
- The initial-assessment exception to having four historical passing scans does not invalidate the post's description of the recurring requirement.
- FAQ 1604 explicitly supports both chained redirects and nested iframes, and displays the stated June 2026 date.
- Inventory reconciliation, documented exclusions, provider coordination, and investigation of incomplete scans agree with the ASV guidance. An unresolved inconclusive scan caused by interference must be reported as failed; recording a gap does not itself establish passing coverage.
- The inventory row is an illustrative set of fields, not executable code or a vendor configuration format. No code, commands, APIs, or runtime tests were applicable.
- Stable asset identifiers, DNS observation timestamps, and deployment-driven inventory updates are practical recommendations rather than claims that PCI DSS mandates those exact fields or processes.
- IPv6 discovery and hostname-aware TLS scanning are technically sound. The post appropriately leaves the concrete scanning method to coordination with the ASV.
- The post's PCI resource links resolve to the intended library and FAQ. PDF retrieval limitations and the alternative copies used are disclosed above; no live infrastructure or actual ASV scan was tested.
