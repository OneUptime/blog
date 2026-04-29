# Validation Summary: How to Build a Landing Zone with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS Organizations
- AWS Service Control Policies (SCPs)
- AWS CloudTrail
- Amazon S3
- Amazon GuardDuty
- AWS Security Hub CSPM

## Sources Consulted
- AWS provider `aws_organizations_organization` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_organization
- AWS provider `aws_organizations_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy
- AWS provider `aws_organizations_account` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_account
- AWS provider `aws_organizations_policy_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy_attachment
- AWS provider `aws_cloudtrail` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS provider `aws_guardduty_detector` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- AWS provider `aws_guardduty_detector_feature` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- AWS provider `aws_guardduty_organization_admin_account` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_organization_admin_account
- AWS provider `aws_securityhub_account` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_account
- AWS provider `aws_securityhub_standards_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- AWS provider `aws_securityhub_organization_admin_account` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_organization_admin_account
- Service control policies (SCPs) - AWS Organizations: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- Amazon S3 bucket policy for CloudTrail - AWS CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- Validating CloudTrail log file integrity - AWS CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html
- Designating a delegated GuardDuty administrator account - Amazon GuardDuty: https://docs.aws.amazon.com/guardduty/latest/ug/delegated-admin-designate.html
- Enabling Security Hub CSPM with Organizations integration - AWS Security Hub: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-settingup.html
- Author link check: https://github.com/nawazdhandala

## Issues Found
- The region-restriction SCP was defined but never attached, so it would have had no effect. I added a policy attachment to the organization root.
- The SCP wording implied root-account enforcement everywhere. AWS documents that SCPs affect member accounts, including the member account root user, but not users or roles in the management account. I corrected the wording accordingly.
- The CloudTrail example referenced an undefined S3 bucket resource and omitted the bucket policy required for trail delivery. I added a central S3 bucket plus the required CloudTrail bucket policy statements for both the management-account prefix and the organization prefix.
- The CloudTrail step said the trail was created “in each account,” but `is_organization_trail = true` represents an organization trail managed centrally. I corrected the comment to match AWS behavior.
- The CloudTrail S3 data-event selector used `arn:aws:s3:::`. Current provider documentation uses `arn:aws:s3` for “all S3 object events” with basic event selectors, so I corrected the selector.
- The original Step 3 implied direct provisioning into a newly created log-archive member account, but the snippet did not include a cross-account bootstrap workflow. I corrected the example to keep the organization trail bootstrap in the management account while still creating the foundational log-archive account.
- The GuardDuty detector used the deprecated `datasources` block. I replaced it with current `aws_guardduty_detector_feature` resources.
- The GuardDuty delegated-admin resource referenced an undefined `security_tooling` account. I added the missing security account resource and an explicit dependency on the Organizations resource.
- The Security Hub example relied on the default standards auto-enablement while also explicitly subscribing to AWS Foundational Security Best Practices. I set `enable_default_standards = false` so the explicit standards subscription is the single source of truth.
- The Security Hub standard ARN was hardcoded to `us-east-1`. I changed it to use the current provider region and partition so the snippet is region-correct.
- The summary described CloudTrail log validation as producing an “immutable” audit trail. AWS documents log file integrity validation as detecting modification or deletion after delivery; I corrected this to “tamper-evident.”
- The summary implied GuardDuty and Security Hub delegation was organization-wide without regional caveats. AWS documents both delegated-administrator setups as region-specific, so I added that clarification.

## Review Notes
- The region-restriction SCP is valid, but in real environments the `NotAction` allowlist for global services often needs additional tuning based on which globally scoped AWS services the organization uses.
- The corrected CloudTrail example now matches AWS’s required bucket-policy shape for organization trails. A production landing zone will often add KMS encryption, lifecycle rules, access logging, and tighter bucket hardening on top of this baseline.
- GuardDuty and Security Hub are both regional services. The post now says this explicitly, but readers should still expect to repeat delegated-administrator setup and service configuration in each enabled Region.
- AWS service documentation now allows CloudTrail organization trails to be managed by the management account or a delegated administrator. The provider documentation used for resource-shape validation remains conservative about the management/master account, so the corrected example stays on the management-account path.
