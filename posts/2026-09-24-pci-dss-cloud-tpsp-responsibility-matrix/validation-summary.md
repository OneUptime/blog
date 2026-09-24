# Validation Summary: How to Build a PCI DSS Responsibility Matrix for Cloud Providers and Other TPSPs

## Status
not-code-blog

## Post Type
Compliance process guide.

## Technologies Covered
- PCI DSS v4.0.1 and third-party service provider (TPSP) responsibility allocation.
- Cloud shared responsibility and AWS Artifact compliance reports.
- Cloud security control areas: physical security, network protection, identity, logging, encryption, and data lifecycle management.

## Sources Consulted
- Local post: `posts/2026-09-24-pci-dss-cloud-tpsp-responsibility-matrix/README.md`, inspected to determine the post type.
- No external sources were consulted. Step 1 directs posts without code or technical implementation details to skip technical verification and proceed to validation-file creation.

## Issues Found
No technical issues found.

## Review Notes
This classification is based on the post's content and does not certify its PCI DSS claims. The post describes responsibility allocation, evidence collection, ownership, and review processes without executable code, terminal commands, configuration snippets, or concrete technical implementation instructions. Its fenced text block lists suggested matrix columns; the table illustrates control ownership rather than implementation.

Technical claims, requirement numbers, version currency, and external URLs were not independently verified because Steps 2 and 3 were skipped under the Step 1 rule. The README.md was left unchanged.

## Follow-up Source Verification — 2026-09-24

A separate substantive review found no factual error. Requirements 12.8.2, 12.8.4, 12.8.5, and 12.9.2 support the article's agreement, oversight, allocation, and provider-information claims. FAQ 1576 supports obtaining applicable provider evidence and responsibility information. AWS's Artifact documentation confirms report downloads require appropriate permissions and may require acceptance of report terms.

The generic cloud-control rows are clearly illustrative rather than universal provider commitments. README text, title, and `not-code-blog` classification were retained.

### Follow-up Sources Consulted

- [PCI SSC: PCI DSS v4.0.1 — public mirror](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf), Requirements 12.8.2, 12.8.4, 12.8.5, and 12.9.2. The PCI-authored PDF was downloaded and read directly after the canonical PCI-hosted PDF returned HTTP 403.
- [PCI SSC FAQ 1576](https://www.pcisecuritystandards.org/faqs/1576/), evidence and responsibility information shared with TPSP customers.
- [AWS Artifact: Downloading reports](https://docs.aws.amazon.com/artifact/latest/ug/downloading-documents.html), permissions, report terms, and document handling.
