# Validation Summary: How to Build a PCI DSS Compliant Infrastructure with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS VPC and security groups
- AWS KMS
- Amazon RDS for PostgreSQL
- AWS IAM
- AWS CloudTrail
- Amazon CloudWatch Logs and alarms
- Amazon S3 Object Lock
- Amazon GuardDuty
- Amazon Inspector
- AWS Systems Manager Patch Manager
- AWS WAF
- PCI DSS

## Sources Consulted
- Terraform AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider documentation for `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider documentation for `aws_s3_bucket_object_lock_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Terraform AWS provider documentation for `aws_vpc_security_group_ingress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS provider documentation for `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS CloudTrail documentation for S3 bucket policies: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail documentation for KMS key policies: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- Amazon CloudWatch Logs documentation for KMS encryption: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- Amazon RDS documentation for PostgreSQL SSL and pgAudit: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html and https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.pgaudit.basic-setup.html
- AWS IAM documentation for `aws:MultiFactorAuthPresent`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- PCI Security Standards Council PCI DSS page and document library: https://www.pcisecuritystandards.org/standards/pci-dss/ and https://www.pcisecuritystandards.org/document_library
- PCI SSC SAQ references for Requirement 6.4.2 and log retention requirements: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf
- OneUptime blog URL referenced by the post: https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-pci-dss-compliant-infrastructure-with-terraform/view

## Issues Found
- The database security group and payment service security group referenced each other with inline rules, which can create a Terraform dependency cycle. I moved the database ingress rule to a standalone `aws_vpc_security_group_ingress_rule`.
- The RDS example omitted required creation inputs for a new DB instance. I added `allocated_storage`, a master username, and `manage_master_user_password = true`.
- The RDS example enabled deletion protection but did not define a final snapshot identifier for eventual controlled deletion. I added `final_snapshot_identifier`.
- CloudTrail and CloudWatch Logs reused the cardholder-data KMS key even though its policy only granted data-use permissions to the payment service. I added a separate audit-log KMS key with CloudTrail and CloudWatch Logs service permissions.
- The CloudTrail example did not include the S3 bucket policy required for CloudTrail delivery. I added an `aws_s3_bucket_policy` and made the trail depend on it.
- The CloudTrail S3 object data-event selector used a generic partial ARN. I changed it to the audit bucket ARN with the trailing slash form used for all objects in a bucket.
- The S3 Object Lock configuration did not enable Object Lock on the bucket at creation time. I added `object_lock_enabled = true` to the bucket.
- The unauthorized-access alarm referenced a custom metric that was never created. I added a CloudWatch Logs metric filter and configured the alarm to treat missing data as not breaching.
- The WAF comment referenced PCI DSS Requirement 6.6, which is the older PCI DSS 3.x numbering. I updated it to Requirement 6.4.2 for PCI DSS 4.x.
- The conclusion said "CloudTrail and Config enforce logging" even though AWS Config was not shown and CloudTrail/CloudWatch support logging rather than enforce it. I corrected the wording.

## Review Notes
The snippets remain illustrative and still assume surrounding resources and variables such as IAM roles, log groups, subnet groups, SNS topics, and provider data sources are defined elsewhere. Full PCI DSS validation also requires policies, procedures, evidence collection, testing, and assessor review beyond Terraform resource definitions.
