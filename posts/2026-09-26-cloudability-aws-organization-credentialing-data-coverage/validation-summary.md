# Validation Summary: How to Credential AWS in Cloudability for Utilization and Commitment Data

## Status

validated

## Post Type

Technical implementation and operations guide. Although it contains no executable code, terminal commands, or configuration snippets, it provides technical guidance on billing exports, IAM role deployment, linked-account credentialing, and data-coverage verification. It therefore requires technical review rather than the not-code-blog classification.

## Technologies Covered

- IBM Cloudability AWS credentialing, utilization collection, and commitment analysis
- AWS Organizations and consolidated billing
- AWS Cost and Usage Reports (legacy CUR and CUR 2.0) and Amazon S3
- AWS IAM roles, trust relationships, and service control policies
- AWS CloudFormation and StackSets
- Amazon CloudWatch and resource discovery APIs
- AWS Reserved Instances and Savings Plans

## Sources Consulted

- [IBM: Frequently Asked Questions for Connecting with AWS](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=guide-frequently-asked-questions-connecting-aws) — consolidated billing requirements, supported CUR versions, report identifiers, and current template regeneration.
- [AWS: Maximizing Commitment-Based Savings with AWS and Apptio Cloudability](https://aws.amazon.com/blogs/apn/maximizing-commitment-based-savings-with-aws-and-apptio-cloudability/) — CUR consumption plus commitment description APIs, payer and commitment-owner roles, credential verification, and additional permissions for automation.
- [IBM: Simplified Credentialing Workflow for AWS](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-msp/saas?topic=guide-simplified-credentialing-workflow-aws) — separate Cloudability configuration and AWS deployment requirements, linked-account templates, StackSets, and trust configuration.
- [IBM: AWS Linked Account Credentialing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=guide-aws-linked-account-credentialing) — account-level API access for utilization and commitments, automated onboarding, regional verification, and read-only versus automated-action selections.
- [IBM: Manage vendor credentials in Cloudability](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=credentials-manage-vendor-in-cloudability) — continued parent-sourced costs after archiving a child account and cessation of advanced collection.
- [IBM: Read Only Permissions Reference - Amazon Web Services](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=services-read-only-permissions-reference-amazon-web) — CloudWatch metric retrieval, resource descriptions, and Reserved Instance discovery permissions.
- [AWS: Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html) — distinction between the purchasing account and accounts receiving shared benefits.
- [AWS: Service control policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html) — organizational restrictions on effective member-account permissions despite IAM role grants.

## Issues Found

No technical issues found.

The README was left unchanged.

## Review Notes

- The central distinction between payer billing coverage and account-level utilization or commitment metadata is supported by IBM and AWS documentation. Linked-account cost visibility does not establish API access to that account.
- Legacy CUR and CUR 2.0 support, the billing location identifiers, generated templates, and credential verification are documented. The post appropriately avoids prescribing a static permission policy or export format for every deployment.
- Commitment benefits can be shared across accounts when sharing is enabled. Identifying owners separately from consumers is therefore appropriate.
- Enabling automated linked-account credentialing does not itself deploy the necessary AWS roles. The recommendation to verify both AWS deployment results and Cloudability credentials is correct.
- Read-only and automated-action permissions serve different purposes. Organizational policies can restrict otherwise permitted role actions, supporting the advice to investigate the actual denial source.
- The coverage matrix, representative-resource checks, equivalent-basis cost reconciliation, and separate freshness records are operational recommendations rather than guarantees about platform behavior. Accounts without billable activity need to be interpreted in the context of the selected reporting period.
- All four technical reference links in the post correspond to relevant official resources. Direct retrieval of the three IBM links returned HTTP 403 responses in the research tool; their content was checked through indexed official IBM documentation. This access limitation was not treated as evidence of broken links.
- The AWS integration walkthrough is dated December 2023. Its claims used by this post remain consistent with the IBM documentation consulted; the review did not rely on its historical UI labels or sample policies as a current deployment specification.
- No executable examples or version-pinned APIs are present. This was a documentation-based review; no live AWS organization or Cloudability tenant was provisioned, and no actual billing totals or telemetry were tested.
