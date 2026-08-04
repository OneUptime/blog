# Validation Summary: How to Build Complete SOC 2 Populations for Four Key Workflows

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SOC 2 Trust Services Criteria and audit populations
- Identity and access management audit logging and entitlement reconciliation
- CI/CD, GitOps, deployment records, and software artifact provenance
- Security incident detection, triage, declaration, and response records
- HRIS, workforce onboarding, and identity provisioning records
- SQL left joins, exception handling, and population reconciliation
- Audit evidence metadata and lineage retention

## Sources Consulted
- AICPA & CIMA: 2017 Trust Services Criteria (With Revised Points of Focus — 2022) (https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- AICPA & CIMA: SOC 2 Reporting on an Examination of Controls at a Service Organization Relevant to Security, Availability, Processing Integrity, Confidentiality, or Privacy (https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- AICPA & CIMA: FAQs — Effect of the use of software tools on SOC 2 examinations (https://www.aicpa-cima.com/resources/article/faqs-effect-of-the-use-of-software-tools-on-soc-2-r-examinations)
- AWS Audit Manager: Understanding how evidence is collected (https://docs.aws.amazon.com/audit-manager/latest/userguide/how-evidence-is-collected.html)
- AWS Audit Manager: Reviewing evidence and collection metadata (https://docs.aws.amazon.com/audit-manager/latest/userguide/review-evidence.html)
- AWS IAM: Logging IAM and AWS STS API calls with AWS CloudTrail (https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
- NIST SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cybersecurity Risk Management (https://csrc.nist.gov/pubs/sp/800/61/r3/final)
- PostgreSQL documentation: Table Expressions and Joined Tables (https://www.postgresql.org/docs/current/queries-table-expressions.html)
- GitHub documentation: REST API endpoints for deployments (https://docs.github.com/en/rest/deployments/deployments)
- GitHub documentation: Using artifact attestations to establish provenance for builds (https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- Microsoft Learn: Learn about groups, group membership, and access (https://learn.microsoft.com/en-us/entra/fundamentals/concept-learn-about-groups)

## Issues Found
No technical issues found.

## Review Notes
- The post contains no executable code, terminal commands, or configuration. Its `text` blocks are illustrative field inventories, but its data extraction, joining, reconciliation, and evidence-lineage guidance constitutes technical implementation detail, so it was reviewed as a technical guide rather than classified as `not-code-blog`.
- The post correctly makes population boundaries and units dependent on the specific control wording. It does not incorrectly present every listed source, event status, worker type, or onboarding activity as universally required by SOC 2.
- The recommendation to start from the occurrence source and left join workflow evidence is technically correct: a left outer join preserves unmatched occurrence rows, whereas an inner join returns only matches.
- NIST SP 800-61 Rev. 3 distinguishes analyzed adverse events from declared incidents and calls for incident reports to be triaged and validated, supporting the post's separation of detection, declared-incident, and control-action populations.
- All five URLs in the post's Official Documentation section resolved successfully and pointed to the described resources when checked on 2026-08-03.
- AWS states that Audit Manager is no longer open to new customers, although existing customers can continue using it. The cited pages remain live and technically support the post's discussion of evidence sources, collection timestamps, UTC, account and IAM identifiers, control mappings, and resource metadata; the post does not recommend adopting the service.
- The AICPA software-tools FAQ is official but nonauthoritative guidance. The post appropriately uses cautious language about the service auditor's possible completeness-and-accuracy procedures and does not claim that a compliance-tool label replaces audit work.
