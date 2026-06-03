# Validation Summary: How to Back Up EC2 Instances with AWS Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Backup
- Amazon EC2
- Amazon EBS
- AWS CLI
- AWS IAM
- AWS KMS
- Amazon EventBridge
- Amazon SNS
- AWS Backup Audit Manager reports
- Terraform AWS provider

## Sources Consulted
- AWS Backup Developer Guide: Backup plan options and configuration: https://docs.aws.amazon.com/aws-backup/latest/devguide/plan-options-and-configuration.html
- AWS Backup Developer Guide: Feature availability by resource: https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html
- AWS Backup Developer Guide: Restore a backup by resource type: https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-a-backup.html
- AWS Backup Developer Guide: Monitoring AWS Backup events using Amazon EventBridge: https://docs.aws.amazon.com/aws-backup/latest/devguide/eventbridge.html
- AWS CLI Command Reference: backup create-backup-plan: https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-plan.html
- AWS CLI Command Reference: backup create-backup-selection: https://docs.aws.amazon.com/cli/latest/reference/backup/create-backup-selection.html
- AWS CLI Command Reference: backup create-report-plan: https://docs.aws.amazon.com/cli/latest/reference/backup/create-report-plan.html
- AWS CLI Command Reference: events put-targets: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Terraform AWS Provider: aws_backup_plan: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan
- Terraform AWS Provider: aws_iam_role: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role

## Issues Found
- The post stated and demonstrated cold-storage lifecycle transitions for EC2 instance backups. AWS Backup cold storage lifecycle is only available for supported resource types, and EC2 instance backups are not listed as a cold-storage lifecycle resource type. Removed the EC2 cold-storage lifecycle settings and clarified the limitation.
- The cross-region `update-backup-plan` example replaced the backup plan with only the daily copy rule, which would drop the monthly rule. Added the monthly rule back into the update payload.
- The Terraform example was described as complete but referenced `aws_iam_role.backup` without defining it. Added the IAM assume-role policy, role, and AWS Backup managed policy attachments.
- The EventBridge/SNS notification example created a rule but did not grant EventBridge permission to publish to SNS or attach the SNS topic as a target. Added the SNS topic policy and `put-targets` command.
- The AWS Backup report plan name used hyphens, but the AWS CLI requires report plan names to start with a letter and then use only letters, numbers, and underscores. Changed it to `ec2_backup_compliance`.
- The compliance section said it was creating an audit framework while the command created a report plan. Updated the wording to match the command.

## Review Notes
The local environment did not have the AWS CLI installed, so command validation was performed against the current official AWS CLI command reference and AWS Backup documentation instead of local `aws help` output.
