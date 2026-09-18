# Validation Summary: Enforce AWS Data Residency with SCPs, Region-Deny Policies, and IaC Checks

## Status

validated

## Post Type

Technical guide with an illustrative JSON service control policy and infrastructure validation guidance.

## Technologies Covered

- AWS Organizations and service control policies (SCPs)
- AWS Identity and Access Management (IAM) and global condition keys
- AWS Control Tower Region-deny controls
- Amazon S3 bucket locations and replication permissions
- AWS Backup cross-Region copies
- AWS CloudFormation and CloudFormation Guard
- Infrastructure as Code and Terraform deployment plans
- Configuration monitoring and AWS Config

## Sources Consulted

- [AWS Organizations: Service control policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html) — permission limits, management-account and service-linked-role exemptions, external principals, and test OUs.
- [AWS Organizations: SCP syntax](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_syntax.html) — JSON elements, wildcard actions, and conditional Deny statements with NotAction.
- [AWS Organizations: Management account best practices](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html) — workload placement and administrative access recovery.
- [IAM: aws:RequestedRegion](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-requestedregion) — endpoint scope and cross-Region S3 effects, including s3:LocationConstraint.
- [IAM: Deny access based on the requested Region](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html) — region restrictions, global-service exceptions, and the absence of permission grants.
- [AWS Control Tower: Configure the Region deny control](https://docs.aws.amazon.com/controltower/latest/userguide/region-deny.html) — landing-zone and OU controls, exceptions, and existing resources.
- [Amazon S3: Setting up permissions for live replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html) — configuration permissions, replication roles, and destination bucket policies.
- [AWS Backup: Creating backup copies across AWS Regions](https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html) — destination Region and vault selection.
- [CloudFormation Guard overview](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html) — structured-data rules, testing, and configuration evaluation.
- [CloudFormation: Pseudo parameters](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html) — deployment Region and account context.
- [HashiCorp Terraform: JSON output format](https://developer.hashicorp.com/terraform/internals/json-format) — module resources, provider configuration references, and unknown planned values.
- [AWS Config: Evaluating resources with rules](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config.html) — configuration monitoring and recording limitations.
- [Author GitHub profile](https://github.com/nawazdhandala) — confirmed the author link resolves to the intended profile.

## Issues Found

- The sentence introducing the SCP said the deny statement “allows requests” in approved Regions. Changed it to say the statement denies requests outside those Regions. A Deny statement does not grant access; approved-region operations still depend on applicable permissions and the SCP hierarchy. The JSON policy itself required no changes.

## Review Notes

- Checked the JSON policy elements against official SCP syntax and region-deny examples. The policy language version, 2012-10-17, remains valid and does not indicate a deprecated API.
- Confirmed the SCP scope limitations, including management-account principals, service-linked roles, and external principals. The recommendation to audit existing data and application egress correctly recognizes that an API permission boundary is not a complete residency guarantee.
- Confirmed that endpoint Region is not a universal destination restriction. S3 location conditions, replication roles, destination policies, and backup destinations require separate evaluation.
- The global-service exception list is explicitly illustrative. Omitted global services can be blocked, and exemptions do not establish residency guarantees.
- Deny-only SCP deployment assumes applicable Allow coverage remains in the SCP hierarchy, commonly through FullAWSAccess. Organizations must have all features enabled and SCP support configured before deployment.
- Guard evaluates supplied structured data against authored rules. It does not automatically resolve all deployment values or enforce future changes. The post correctly calls for deployment context, explicit treatment of unknown destinations, and resource-type coverage.
- Configuration monitoring requires suitable recording and rules. The monitoring fixture is an expected control outcome, not an automatic benefit of static IaC validation.
- All five AWS documentation links in the post resolved to the intended resources. The author URL redirected to the expected GitHub profile.
- No terminal commands or version-specific executable examples are present. No SCP was attached and no live AWS enforcement, replication, or restore tests were run.
