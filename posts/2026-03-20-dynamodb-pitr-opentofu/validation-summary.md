# Validation Summary: How to Enable DynamoDB Point-in-Time Recovery with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS DynamoDB
- DynamoDB Point-in-Time Recovery (PITR)
- AWS CLI
- AWS Backup
- Amazon CloudWatch
- AWS KMS
- IAM

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/cli/import/
- DynamoDB PITR overview: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- DynamoDB backup and restore overview: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Backup-and-Restore.html
- DynamoDB PITR restore behavior: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/pointintimerecovery_restores.html
- DynamoDB on-demand backup behavior: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/backuprestore_HowItWorks.html
- AWS CLI `describe-continuous-backups`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-continuous-backups.html
- AWS CLI `restore-table-to-point-in-time`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/restore-table-to-point-in-time.html
- AWS CLI `create-backup`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-backup.html
- DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- AWS Backup with DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/backuprestore_HowItWorksAWS.html
- AWS Backup metrics in CloudWatch: https://docs.aws.amazon.com/aws-backup/latest/devguide/cloudwatch.html
- AWS provider `aws_dynamodb_table` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- AWS provider `aws_backup_plan` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/backup_plan.html.markdown
- AWS provider `aws_backup_selection` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/backup_selection.html.markdown
- AWS provider `aws_backup_vault` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/backup_vault.html.markdown
- AWS provider `aws_kms_key` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_key.html.markdown
- AWS provider `aws_cloudwatch_metric_alarm` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown

## Issues Found
- The post described PITR as a fixed 35-day window. AWS now supports a configurable retention period of 1 to 35 days, with 35 as the default. I updated the description, introduction, examples, and conclusion to reflect that.
- The “existing table” example implied that declaring an `aws_dynamodb_table` resource alone would update an already-existing table. In OpenTofu, existing infrastructure must first be imported into state. I added the `tofu import aws_dynamodb_table.orders orders` step.
- The post used an `aws_dynamodb_backup` resource that does not exist in the current AWS provider. I replaced that example with the supported DynamoDB `create-backup` AWS CLI command for ad hoc on-demand backups.
- The CloudWatch example used the DynamoDB `SuccessfulRequestLatency` metric while claiming to monitor backup status. That metric reflects request latency, not PITR or backup health. I replaced it with an AWS Backup failed-jobs alarm using the `AWS/Backup` namespace.
- The section titled “PITR with AWS Backup Service” was inaccurate for DynamoDB. AWS Backup integration for DynamoDB is used for scheduled on-demand backups and lifecycle management, while PITR is enabled on the table itself. I renamed and corrected that section.
- The AWS Backup example referenced `aws_iam_role.backup` and `aws_kms_key.backup` without defining them. I added the missing IAM role, policy attachment, and KMS key resources so the snippet is complete.
- The pricing table incorrectly said restores were free. Current DynamoDB pricing charges for restored data, and cross-Region restores also incur inter-Region data transfer out. I corrected the pricing guidance to match AWS documentation.
- The best-practice note about `EarliestRestorableDateTime` was incorrect. A PITR window does not “expire” because the earliest restorable time becomes older than 35 days; instead, the window should be checked against the configured retention period and can reset after PITR is disabled and re-enabled. I corrected that guidance.

## Review Notes
- Restored DynamoDB tables do not preserve PITR settings or tags automatically; operators need to re-enable PITR and reapply tags if needed.
- AWS Backup requires DynamoDB to be opted in for the relevant account and Region before advanced backup management applies.
- Validation was documentation-based. The local environment did not have the AWS CLI installed, so commands were verified against official CLI reference pages rather than executed locally.
