# Validation Summary: How to Set Up AWS Backup with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Backup backup vaults, vault lock, backup plans, backup selections, and copy actions
- AWS IAM roles and AWS managed policies for AWS Backup
- AWS cron schedule expressions / Amazon EventBridge schedule syntax
- AWS KMS-backed backup vault encryption
- Amazon RDS, Amazon EFS, Amazon DynamoDB, and Amazon EBS backup coverage

## Sources Consulted
- Terraform AWS provider `aws_backup_vault` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/backup_vault.html.markdown
- Terraform AWS provider `aws_backup_vault_lock_configuration` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/backup_vault_lock_configuration.html.markdown
- Terraform AWS provider `aws_backup_plan` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/backup_plan.html.markdown
- Terraform AWS provider `aws_backup_selection` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/backup_selection.html.markdown
- AWS Backup Vault Lock documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html
- AWS Backup plan options and lifecycle documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/plan-options-and-configuration.html
- AWS Backup feature availability by resource: https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html
- AWS Backup `BackupRule` API reference: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_BackupRule.html
- Amazon EventBridge cron expression documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- AWS Backup IAM service roles documentation: https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html

## Issues Found
- The backup vault lock used `max_retention_days = 365`, but the weekly backup rule and DR copy used `delete_after = 730`. AWS Backup Vault Lock rejects backup and copy jobs whose retention exceeds the vault lock maximum. Changed `max_retention_days` to `730` so both daily and weekly rules comply with the lock configuration.
- The weekly schedule used `cron(0 3 ? * 1 *)` while the comment said every Monday. AWS cron expressions use Sunday as numeric day-of-week `1`; changed the expression to `cron(0 3 ? * MON *)` to run on Mondays unambiguously.
- The lifecycle examples moved backups to cold storage while the post's examples include a mixed selection of RDS, EFS, and DynamoDB resources and mention EBS. AWS Backup cold/archive transition is only supported for specific resource types, with additional EBS archive requirements, and is not generally valid across the mixed resources shown. Removed `cold_storage_after` from the rule and copy lifecycles while preserving retention with `delete_after`.
- The post described Vault Lock as preventing vault deletion and said the OpenTofu configuration enforced RPO/RTO requirements. Refined the wording to say Vault Lock protects recovery points from accidental or early deletion and that the configuration helps enforce backup policy requirements.

## Review Notes
- The examples remain partial snippets; referenced resources such as the KMS key, DR-region backup vault, RDS instance, EFS file system, and DynamoDB table must still be defined elsewhere in a real OpenTofu configuration.
- For an actual cross-region copy setup, the destination vault should be created with an aliased AWS provider for the DR region, and KMS/key policy permissions should be reviewed for both source and destination regions.
- I did not run `tofu validate` because the blog intentionally contains snippets rather than a complete standalone module.
