# Validation Summary: Scoping a SaaS SOC 2 System: Components, Data, and Vendors

## Status

validated

## Post Type

Technical compliance guide

## Technologies Covered

- AICPA SOC 2 Description Criteria
- AICPA Trust Services Criteria
- SaaS and cloud system scoping
- Cloud accounts, infrastructure, and shared control planes
- CI/CD, identity, logging, backup, recovery, and support systems
- Data lifecycle and data-flow mapping
- Vendor and subservice organization management
- Carve-out and inclusive methods for subservice organizations
- AWS Shared Responsibility Model

## Sources Consulted

- [AICPA and CIMA: 2018 SOC 2 Description Criteria (With Revised Implementation Guidance – 2022)](https://www.aicpa-cima.com/resources/download/get-description-criteria-for-your-organizations-soc-2-r-report)
- [AICPA and CIMA: 2017 Trust Services Criteria (With Revised Points of Focus – 2022)](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: SOC for Service Organizations Engagements – Overview](https://www.aicpa-cima.com/resources/download/soc-for-service-organizations-engagements-overview)
- [AICPA and CIMA: How to Perform Proper Vendor Management and Third-Party Risk Assessment Reviews](https://assets.ctfassets.net/rb9cdnjh59cm/3mFIuhmctfzQwHK28zTNBC/eba957a2459c9bfcd7b51b5951b7d981/how-to-perform-proper-vendor-management-and-third-party-risk-reviews.pdf)
- [AWS: Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)

## Issues Found

- The description-criteria summary characterized reportable system incidents only as incidents that significantly impaired service commitments or system requirements. AICPA DC 4 also covers identified incidents resulting from controls that were not suitably designed or operating effectively. The summary now states both triggers.
- The Type II summary referred only to significant changes to the system. AICPA DC 9 covers relevant significant changes to the service organization's system and controls during the period, so `and controls` was added.
- The definition of principal service commitments referred only to promises made to user entities, and the system-requirement definition omitted commitments to other parties and relevant industry guidance. The wording now reflects commitments to user entities and others and the broader sources of system requirements described in AICPA DC 2.

## Review Notes

- The two fenced text blocks are conceptual examples, not executable code. The post contains no terminal commands or configuration snippets requiring execution.
- All external links in the post resolved to the intended official AICPA and AWS resources at review time.
- The remaining system-component, boundary, data-lifecycle, subservice-organization, carve-out, inclusive-method, Type II, and AWS shared-responsibility explanations are consistent with the consulted sources.
- The post appropriately treats final scoping and subservice presentation decisions as management judgments to be discussed with the service auditor.
