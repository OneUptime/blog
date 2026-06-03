# Validation Summary: How to Create Backup Plans with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Backup
- Terraform
- Terraform AWS Provider
- AWS KMS
- AWS IAM
- Amazon CloudWatch
- AWS Backup Vault Lock

## Sources Consulted
- Terraform AWS Provider `aws_backup_plan` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan
- Terraform AWS Provider `aws_backup_selection` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_selection
- Terraform AWS Provider `aws_backup_vault` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_vault
- Terraform AWS Provider `aws_backup_vault_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_vault_policy
- Terraform AWS Provider `aws_backup_vault_lock_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_vault_lock_configuration
- AWS Backup `BackupRule` API documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_BackupRule.html
- AWS Backup `Lifecycle` API documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_Lifecycle.html
- AWS Backup IAM service roles documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html
- AWS Backup vault access policies documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/create-a-vault-access-policy.html
- AWS Backup cross-Region copy documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html
- AWS Backup Vault Lock documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html
- AWS Backup CloudWatch metrics documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/cloudwatch.html

## Issues Found
- The cross-Region backup copy example referenced `aws_kms_key.backup_dr.arn` without defining the DR-region KMS key. Added a minimal `aws_kms_key.backup_dr` resource using the DR provider alias so the destination vault example is internally complete.
- The CloudWatch alarm example implied a dimensionless alarm would catch any AWS Backup job failure. AWS Backup publishes job metrics with dimensions such as vault name and resource type, so I updated the text and Terraform snippet to scope the alarm with `BackupVaultName` and `ResourceType`.

## Review Notes
- The lifecycle examples correctly keep `delete_after` at least 90 days greater than `cold_storage_after`, which is required for recovery points transitioned to cold storage.
- The Vault Lock example uses `changeable_for_days`, which creates a compliance-mode lock in Terraform. The warning about immutability after the grace period is accurate.
- The referenced OneUptime monitoring post URL resolves to the expected Pulumi/AWS blog post.
- For broad monitoring across multiple protected resource types, duplicate the CloudWatch alarm per relevant `ResourceType` or use CloudWatch metric math/search expressions.
