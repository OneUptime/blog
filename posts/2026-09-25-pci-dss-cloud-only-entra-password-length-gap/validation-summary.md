# Validation Summary: How to Address PCI DSS Password-Length Gaps in Cloud-Only Entra ID

## Status

validated

## Post Type

Technical implementation and compliance guide. Although there are no executable code examples, commands, or configuration snippets, the post contains concrete guidance on authentication strengths, password-policy enforcement, recovery, and access-path testing, so a technical review applies.

## Technologies Covered

- PCI DSS v4.0.1 password and MFA requirements
- Microsoft Entra ID cloud-managed identities and Password Protection
- Conditional Access authentication strengths and sign-in logs
- FIDO2 passkeys and Windows Hello for Business
- Active Directory, federation, SSO, and independent application authentication

## Sources Consulted

- [Microsoft: Combined password policy](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-password-ban-bad-combined-policy) — length, complexity, policy configurability, and synchronized-account distinctions.
- [Microsoft: Password Protection](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-password-ban-bad) — banned-term evaluation and its purpose.
- [Microsoft: PCI DSS Requirement 8 guidance](https://learn.microsoft.com/en-us/entra/standards/pci-requirement-8) — reproduced password and MFA requirements, passwordless architecture, identity verification, and factor management.
- [Microsoft: Conditional Access authentication strengths](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths) — permitted method combinations, passwordless and phishing-resistant strengths, and P1 licensing prerequisite.
- [Microsoft: How authentication strengths work](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strength-how-it-works) — resource access, existing authentication, registration, and policy interactions.
- [Microsoft: Analyze Conditional Access policy impact](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only) — report-only evaluation, enforcement, and sign-in logs.
- [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/) — verified the post's standards-library destination.
- [PCI SSC FAQ 1590](https://www.pcisecuritystandards.org/faqs/1590/) — periodic-change requirements 8.3.9 and 8.3.10.1 and MFA applicability.
- [PCI SSC FAQ 1591](https://www.pcisecuritystandards.org/faqs/1591/) — distinction between access into the CDE and other in-scope components.
- [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) — independently checked the cached standard text for Requirement 8.4.2's non-console scope and applicability notes.
- [PCI SSC FAQ 1595](https://www.pcisecuritystandards.org/faqs/1595/) and [FAQ 1596](https://www.pcisecuritystandards.org/faqs/1596/) — checked the phishing-resistant exception under 8.4.2 and the additional-factor requirements under 8.4.1 and 8.4.3.
- [PCI SSC: Compensating controls versus customized approach](https://blog.pcisecuritystandards.org/pci-dss-v4-0-compensating-controls-vs-customized-approach) — separate assessment routes, constraints, documentation, and testing obligations.

## Issues Found

- **Incomplete MFA scope:** The implementation guidance singled out administrative and external remote access without covering other applicable non-console CDE access under 8.4.2. Updated the paragraph to cover that access, retain the applicability notes and phishing-resistant exception, and distinguish the additional-factor requirements under 8.4.1 and 8.4.3. The wording follows v4.0.1's non-console scope rather than the broader wording in older requirement tables.

## Review Notes

- Confirmed the documented eight-character minimum, 256-character maximum, and three-of-four complexity rule. The latter does not guarantee a numeric character. The post appropriately distinguishes accepting a long password from enforcing its minimum length.
- The caution against automatically claiming the eight-character PCI allowance is appropriate. Microsoft accepts passwords longer than 12 characters; the post does not invent an assessor determination for a particular deployment.
- FAQ 1590 addresses periodic password changes, not a general exemption from password length for MFA deployments. Microsoft's password-specific not-applicable entries must be read alongside its passwordless recommendation.
- Authentication strengths restrict access to targeted resources; enrollment alone does not enforce that restriction. Existing sessions, application fallback authentication, local accounts, recovery, and exclusions still require deployment-specific testing. Report-only results are observations, not enforcement.
- The post's linked Microsoft and PCI SSC web resources resolved to relevant material. The direct PCI DSS v4.0.1 PDF could not be retrieved through the browsing tool. A follow-up review checked cached v4.0.1 standard text and live PCI SSC FAQs, correcting the older Microsoft table's broader wording for 8.4.2.
- This was a documentation-based review. No tenant was available, and no live authentication, reset, recovery, or application-bypass tests were performed. There were no executable examples to run.
