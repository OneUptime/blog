# Validation Summary: How to Restore Cloudability Ingestion After Archiving an AWS Payer

## Status
validated

## Post Type
Technical troubleshooting and recovery guide. Although it contains no executable code, commands, or configuration snippets, it includes technical implementation details for billing exports, credential onboarding, IAM trust relationships, and ingestion reconciliation, so it requires technical review.

## Technologies Covered
- IBM Cloudability vendor credentials and AWS ingestion
- Cloudability MSP and Commercial Billing
- AWS management/payer and linked accounts
- AWS Cost and Usage Reports (CUR) and Amazon S3
- AWS IAM roles, external IDs, and CloudFormation
- FinOps cost reporting and historical data reconciliation

## Sources Consulted
- [IBM: Manage vendor credentials in Cloudability](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=credentials-manage-vendor-in-cloudability) — archive behavior, historical data retention, recredentialing, child-account data collection, and verification.
- [IBM: What's new in Cloudability Essentials](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in) — August 3, 2026 release note confirming archived accounts are hidden by default and can be displayed using the toggle.
- [IBM: Frequently Asked Questions for Connecting with AWS](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=guide-frequently-asked-questions-connecting-aws) — billing objects and manifests, initial delivery timing, consolidated billing ingestion, template updates, and historical-data support.
- [IBM: Simplified Credentialing Workflow for AWS](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-msp/saas?topic=guide-simplified-credentialing-workflow-aws) — payer account fields, template generation, IAM roles, external-ID matching, and linked-account automation.
- [IBM: MSP administration FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-msp/saas?topic=administration-faq) — archived billing accounts are excluded from subsequently reprocessed historical management and end-consumer reports.
- [AWS: What are AWS Cost and Usage Reports?](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html) — S3 delivery, initial delivery within 24 hours, daily updates, and cumulative monthly reporting.
- [AWS: Understanding your report versions](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html) — report objects, manifests, prefixes, and report versioning.
- [AWS: Access to AWS accounts owned by third parties](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html) — role assumption and matching external-ID conditions in trust policies.
- [AWS: Troubleshooting Amazon S3 Lifecycle issues](https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-lifecycle.html) — object expiration and recovery limits.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The linked IBM resources correspond to the claims they support. Some direct fetches returned HTTP 403; their documentation text was available through indexed official IBM results. The release-note direct fetch initially showed older content, while indexed results included the relevant August 2026 entry.
- The payer-ingestion consequence is a reasonable inference from removal of the vendor link and IBM's requirement to ingest consolidated billing through the payer. Archiving a Cloudability credential is distinct from closing the AWS account.
- The onboarding fields and advice to compare the generated template with the existing role are supported. IBM also documents updating the existing CloudFormation stack and reverifying credentials.
- A successful credential check verifies access; it does not establish reporting completeness. Consulting IBM Support for historical ingestion is documented, and the post correctly avoids promising automatic backfill.
- Daily cost totals remain subject to AWS billing updates. Reconciliation should use comparable metrics and filters; a recovered daily reporting period does not mean the monthly invoice is final.
- S3 versioning can permit recovery of retained object versions, but recredentialing alone cannot restore deleted source objects. The post does not claim otherwise.
- No version-specific code, CLI syntax, or configuration examples required execution. This was a documentation review; no live Cloudability tenant or AWS recovery was exercised.
