# Validation Summary: How to Build a Healthcare (HIPAA) Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS VPC and VPC endpoints
- AWS KMS
- Amazon Aurora PostgreSQL / Amazon RDS
- Amazon S3
- AWS CloudTrail
- Amazon CloudWatch Logs
- AWS Config
- AWS Backup and Backup Vault Lock
- HIPAA Security Rule safeguards and AWS BAA requirements

## Sources Consulted
- AWS HIPAA Eligible Services Reference: https://aws.amazon.com/compliance/hipaa-eligible-services-reference/
- AWS whitepaper, Architecting for HIPAA Security and Compliance on Amazon Web Services: https://docs.aws.amazon.com/whitepapers/latest/architecting-hipaa-security-and-compliance-on-aws/
- HHS HIPAA Security Rule technical safeguards guidance: https://www.hhs.gov/sites/default/files/ocr/privacy/hipaa/administrative/securityrule/techsafeguards.pdf
- HHS FAQ on HIPAA medical record retention: https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html
- 45 CFR 164.316 documentation retention requirements: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.316
- Terraform AWS provider documentation for `aws_s3_bucket_object_lock_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Terraform AWS provider documentation for `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider documentation for `aws_backup_vault_lock_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_vault_lock_configuration
- AWS CloudTrail KMS key policy documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- Amazon CloudWatch Logs KMS encryption documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- AWS Backup Vault Lock documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html
- Amazon Aurora PostgreSQL pgAudit setup documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Appendix.PostgreSQL.CommonDBATasks.pgaudit.basic-setup.html

## Issues Found
- The introduction overstated Terraform as automatically ensuring HIPAA compliance. Changed the wording to say Terraform encodes HIPAA-supporting controls and helps maintain a compliance baseline, because compliance also depends on policies, procedures, service eligibility, operational practices, and shared responsibility.
- The BAA section implied AWS broadly "covers HIPAA compliance" with a BAA. Updated it to require a BAA before storing, processing, or transmitting PHI and to note that workloads must use AWS HIPAA Eligible Services.
- The architecture list and VPC comments implied dedicated tenancy is a general HIPAA requirement. Updated the language to make dedicated tenancy optional and policy-driven.
- The VPC Flow Logs comment said flow logs are required for HIPAA audit. Changed it to say they are useful evidence for audit controls, because HIPAA requires audit controls but does not mandate VPC Flow Logs specifically.
- The encryption section used absolute legal language that all PHI must be encrypted at rest and in transit. Adjusted the wording to describe encryption as an AWS architecture requirement for PHI workloads without overstating the HIPAA Security Rule's addressable implementation specification language.
- The KMS key policy did not grant CloudTrail or CloudWatch Logs service principals the permissions needed to use the customer-managed KMS key. Added service-principal statements for CloudTrail encryption and CloudWatch Logs encryption context use.
- The S3 Object Lock example configured retention but did not enable Object Lock on the bucket at creation. Added `object_lock_enabled = true` to the `aws_s3_bucket` resource, matching the Terraform AWS provider requirement for new buckets.
- The S3, CloudWatch Logs, and AWS Backup examples described seven years as a HIPAA retention requirement. Reworded those comments as example retention policy values and noted that legal and state requirements should be confirmed.
- The AWS Backup Vault Lock example said it prevented deletion, but without `changeable_for_days` Terraform creates governance mode. Added `changeable_for_days = 3` and updated the comment to describe compliance mode after the grace period.

## Review Notes
The Terraform snippets remain illustrative and assume supporting resources exist, such as subnets, route tables, IAM roles, log buckets, backup selections, and the disaster-recovery backup vault. For production use, the Terraform state itself must be protected because values such as database credentials can be stored in state.
