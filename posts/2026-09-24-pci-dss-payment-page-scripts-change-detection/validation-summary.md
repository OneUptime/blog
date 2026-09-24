# Validation Summary: PCI DSS 4.0.1: Payment-Page Scripts and Change Detection

## Status

validated

## Post Type

Technical implementation guide with an illustrative YAML script-inventory record and browser security implementation guidance.

## Technologies Covered

- PCI DSS v4.0.1 Requirements 6.4.3, 11.6.1, and 12.3.1
- Revised SAQ A eligibility and embedded payment forms
- Browser-executed JavaScript, tag managers, and third-party dependencies
- Subresource Integrity (SRI) and Cross-Origin Resource Sharing (CORS)
- Content Security Policy (CSP), nonces, hashes, and report-only policies
- HTTP header monitoring and browser-visible tamper detection
- YAML inventory records

## Sources Consulted

- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — verified the post's standard-document landing page. The direct v4.0.1 standard PDF endpoint returned HTTP 403 during review; requirement wording was cross-checked using PCI SSC-authored guidance below.
- [PCI SSC: Payment Page Security and Preventing E-Skimming — Guidance for PCI DSS Requirements 6.4.3 and 11.6.1](https://developer.swedbankpay.com/assets/documents/guidance-for-pci-dss-points.pdf) — PCI SSC's March 2025 information supplement, accessed through a payment-provider-hosted copy; reviewed requirement explanations, monitoring frequency, script management, and assessment evidence.
- [PCI SSC announcement of the payment-page security supplement](https://blog.pcisecuritystandards.org/new-information-supplement-payment-page-security-and-preventing-e-skimming) — confirmed the publication's authorship and supplemental status.
- [PCI SSC FAQ 1588](https://www.pcisecuritystandards.org/faqs/1588/) — verified the embedded-form eligibility condition, provider-confirmation option, exclusions for redirects and fully outsourced payment links, and compliance-accepting entity guidance.
- [PCI SSC: Important Updates Announced for Merchants Validating to Self-Assessment Questionnaire A](https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a) — verified the January 2025 revision, removal of questionnaire entries, and 31 March 2025 effective date.
- [PCI SSC-hosted presentation: 6.4.3 & 11.6.1 — Do You Understand Website Scoping?](https://www.pcisecuritystandards.org/wp-content/uploads/2024/09/Day-1_Track-2_7_JMan_JZitomer_FINAL.pdf) — corroborated the control categories and parent-page/provider-form distinction; newer FAQ guidance was used for SAQ A eligibility.
- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity) — verified digest matching, rejection of changed resources, and cross-origin CORS requirements.
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) — verified source restrictions, nonce/hash approaches, and report-only deployment behavior.
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) — checked mapping, plain-scalar, and flow-sequence syntax.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged.
- The post correctly distinguishes script authorization, integrity, and inventory under 6.4.3 from browser-visible change detection under 11.6.1. Its weekly-or-targeted-risk-analysis frequency description is accurate for v4.0.1.
- The SAQ A discussion correctly limits the particular script-attack eligibility condition to embedded forms. It does not claim that redirect merchants are exempt from all PCI DSS obligations. The revised questionnaire also removed 12.3.1; the post does not claim its list of removed entries is exhaustive.
- Parsed the YAML block successfully with PyYAML. It contains eight mapping entries, with a two-element list for pages. These are illustrative inventory fields, not a vendor configuration schema or a PCI-prescribed format. The post explicitly identifies the example as incomplete for compliance purposes.
- SRI correctly blocks a resource whose bytes no longer match its expected digest. Cross-origin use requires CORS-enabled fetching and compatible server responses. A CSP source allowlist alone does not verify resource bytes; report-only mode observes violations without enforcing the candidate policy.
- Browser observations, conditional-flow coverage, monitor-health alerts, controlled tamper tests, and reviewed baseline changes are reasonable engineering practices. They are not represented as a complete assessment procedure.
- There are no terminal commands, executable application examples, or versioned library APIs to run. No live payment system was available or tested; this review validates the article's technical content, not a deployed implementation's compliance.
- The post's technical-reference links resolved to the intended resources. The standard link is a document-library landing page rather than a direct PDF link.
