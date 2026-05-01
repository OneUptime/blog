# Validation Summary: How to Configure DynamoDB Backup and PITR with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS DynamoDB
- AWS Backup
- AWS CLI
- AWS IAM
- AWS KMS

## Sources Consulted
- Amazon DynamoDB Developer Guide: Point-in-time backups for DynamoDB  
  https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- AWS Backup Developer Guide: Advanced DynamoDB backup  
  https://docs.aws.amazon.com/aws-backup/latest/devguide/advanced-ddb-backup.html
- AWS Backup Developer Guide: IAM service roles  
  https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html
- AWS Backup Developer Guide: AWS Backup Vault Lock  
  https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html
- AWS CLI Command Reference: `dynamodb restore-table-to-point-in-time`  
  https://docs.aws.amazon.com/cli/latest/reference/dynamodb/restore-table-to-point-in-time.html
- AWS CLI Command Reference: `dynamodb describe-continuous-backups`  
  https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-continuous-backups.html
- AWS provider resource docs: `aws_dynamodb_table`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- AWS provider resource docs: `aws_backup_plan`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/backup_plan.html.markdown
- AWS provider resource docs: `aws_backup_selection`  
  https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/backup_selection.html.markdown

## Issues Found
- The post described PITR as always covering the past 35 days. DynamoDB now supports a configurable recovery period from 1 to 35 days, with 35 days as the default and maximum. I updated the introduction and code comments to reflect that accurately.
- The AWS Backup IAM managed policy ARN was incorrect. I changed `arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForBackup` to the documented ARN `arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup`.
- The monthly AWS Backup lifecycle claimed to move backups to cold storage but omitted `opt_in_to_archive_for_supported_resources = true`, which AWS Backup documents for archive tier transitions. I added that field.
- The post omitted the DynamoDB advanced-backup prerequisite for cold storage and related AWS Backup-managed features. I added a prerequisite note so the configuration matches AWS Backup’s current DynamoDB behavior.
- The conclusion implied AWS Backup alone satisfied immutable-storage compliance needs. I clarified that immutable backup storage requires AWS Backup Vault Lock.

## Review Notes
- The AWS CLI commands shown in the post are valid per the current AWS CLI command reference.
- `aws dynamodb describe-continuous-backups` is an appropriate verification command, but readers still need to inspect `PointInTimeRecoveryStatus` in the output to confirm PITR is enabled.
- The local environment used for review did not have `aws` or `tofu` installed, so CLI validation was done against the official command reference and provider documentation rather than local `--help` output.
