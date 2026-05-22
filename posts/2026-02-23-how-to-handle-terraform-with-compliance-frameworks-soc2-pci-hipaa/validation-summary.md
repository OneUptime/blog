# Validation Summary: How to Handle Terraform with Compliance Frameworks (SOC2 PCI HIPAA)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon S3
- AWS KMS
- AWS CloudTrail
- Amazon CloudWatch Logs
- Amazon VPC Flow Logs
- Amazon GuardDuty
- AWS Config
- AWS IAM
- AWS WAF
- AWS Backup
- Checkov
- tfsec
- SOC2
- PCI DSS
- HIPAA Security Rule

## Sources Consulted
- Terraform AWS provider documentation for S3 bucket encryption, versioning, public access block, logging, CloudTrail, VPC Flow Logs, GuardDuty, AWS Config rules, IAM roles and password policy, WAFv2 Web ACLs, AWS Backup plans, and backup vaults: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS S3 default encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html
- AWS CloudTrail event selector documentation: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- AWS Config managed rule documentation for S3 bucket encryption: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html
- AWS Config PCI DSS v4 operational best practices mapping: https://docs.aws.amazon.com/config/latest/developerguide/operational-best-practices-for-pci-dss-v4-including-global-resource-types.html
- HIPAA Security Rule, 45 CFR 164.312: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312
- HIPAA Security Rule, 45 CFR 164.308: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.308
- PCI Security Standards Council FAQ for PCI DSS Requirement 3.5.1 stored PAN protection: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/does-cardholder-name-expiration-date-etc-need-to-be-rendered-unreadable-if-stored-in-conjunction-with-the-pan-primary-account-number/
- PCI Security Standards Council FAQ for PCI DSS Requirement 4.2.1 transmission protection: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/can-unencrypted-pans-be-sent-over-e-mail-instant-messaging-sms-or-chat/
- PCI Security Standards Council FAQ referencing Requirement 6.4.2 for automated technical solutions protecting public-facing web applications: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/how-should-pci-dss-v4-x-requirements-noted-as-superseded-by-another-requirement-be-reported-after-31-march-2025/
- Checkov CLI documentation: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- tfsec usage documentation: https://aquasecurity.github.io/tfsec/latest/guides/usage/

## Issues Found
- The encryption paragraph cited older or incomplete PCI DSS and HIPAA references and said all frameworks require encryption at rest and in transit. Updated it to reference PCI DSS Requirements 3 and 4.2, include HIPAA transmission security, and clarify that HIPAA encryption implementation specifications are addressable.
- The WAF section cited PCI DSS Requirement 6.6, which is the older PCI DSS numbering. Updated the section and WAF description to PCI DSS Requirement 6.4.2 for current PCI DSS v4.x terminology.
- The HIPAA IAM password policy example was labeled as a session timeout control. Updated the comment to describe it as an IAM password policy for access control, because `aws_iam_account_password_policy` does not configure session timeout or automatic logoff.

## Review Notes
The Terraform snippets use current split AWS S3 resources and current AWS provider resource names and arguments. The local environment did not have `terraform`, `checkov`, or `tfsec` installed, so CLI behavior was verified against official documentation instead of local command output. The post's OneUptime links returned HTTP 200 during review.
