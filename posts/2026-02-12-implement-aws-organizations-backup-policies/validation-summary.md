# Validation Summary: How to Implement AWS Organizations Backup Policies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Organizations backup policies
- AWS Backup
- AWS Backup Audit Manager
- AWS CloudFormation StackSets
- AWS IAM
- AWS KMS
- AWS CLI

## Sources Consulted
- AWS Organizations: Backup policy syntax and examples - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup_syntax.html
- AWS Organizations: Best practices for using backup policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup_best-practices.html
- AWS Organizations: Enabling a policy type - https://docs.aws.amazon.com/organizations/latest/userguide/enable-policy-type.html
- AWS CLI Command Reference: organizations enable-policy-type - https://docs.aws.amazon.com/cli/latest/reference/organizations/enable-policy-type.html
- AWS CLI Command Reference: backup list-backup-jobs - https://docs.aws.amazon.com/cli/latest/reference/backup/list-backup-jobs.html
- AWS Backup: Lifecycle API - https://docs.aws.amazon.com/aws-backup/latest/devguide/API_Lifecycle.html
- AWS Backup: Encryption for backups in AWS Backup - https://docs.aws.amazon.com/aws-backup/latest/devguide/encryption.html
- AWS Backup: Backup vault creation and deletion - https://docs.aws.amazon.com/aws-backup/latest/devguide/create-a-vault.html
- AWS Backup: Using AWS Backup Audit Manager with CloudFormation - https://docs.aws.amazon.com/aws-backup/latest/devguide/bam-cfn-integration.html
- AWS CloudFormation: Add stacks to CloudFormation StackSets - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stackinstances-create.html

## Issues Found
- The prerequisites said IAM roles could be provisioned by the backup policy. AWS recommends using CloudFormation StackSets or similar provisioning for the required vaults and IAM roles, so the prerequisite now says the role must be provisioned separately.
- The backup policy lifecycle moved recovery points to cold storage after 7 days but deleted them after 35 days. AWS Backup requires `delete_after_days` to be at least 90 days after `move_to_cold_storage_after_days`, so the example now deletes after 97 days.
- The custom IAM role was named `OrgBackupRole`. AWS Backup requires non-default role names used for backup jobs to include `AWSBackup` or `AwsBackup`, so the policy, CloudFormation resource, role name, and StackSet name now use `AWSBackupOrgRole`.
- The backup vault KMS key policy omitted `kms:CreateGrant` and `kms:DescribeKey`, which AWS Backup commonly requires for vault encryption and key access. These permissions were added to the backup service statement.
- The command labeled as listing backup jobs across accounts from the management account omitted `--by-account-id '*'`. The AWS CLI requires that filter to return all organization jobs from an Organizations management account, so it was added.

## Review Notes
The AWS CLI was not installed locally, so command validation was performed against official AWS CLI documentation rather than local `--help` output. The post remains a valid implementation guide after the corrections.
