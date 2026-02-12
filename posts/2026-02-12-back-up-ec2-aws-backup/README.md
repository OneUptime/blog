# How to Back Up EC2 Instances with AWS Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Backup, Disaster Recovery

Description: Learn how to use AWS Backup to automate EC2 instance backups with scheduled plans, retention policies, cross-region copies, and compliance reporting.

---

Backups are one of those things everyone knows they should have but many teams set up only after losing data. AWS Backup is a centralized service that automates backup scheduling, retention, and lifecycle management for EC2 instances (and many other AWS resources). It's far more reliable than homegrown cron scripts creating snapshots.

Let's set up a comprehensive backup strategy for your EC2 instances.

## Why AWS Backup Over Manual Snapshots

You could write scripts that call `aws ec2 create-snapshot` on a schedule, but AWS Backup offers several advantages:

- **Centralized management** - one dashboard for all your backups across services
- **Compliance reporting** - prove that backups are happening as required
- **Cross-region and cross-account copies** - built-in disaster recovery
- **Lifecycle policies** - automatically transition old backups to cold storage
- **Tag-based resource selection** - no need to maintain lists of instance IDs
- **Integration with AWS Organizations** - enforce backup policies across accounts

## Creating a Backup Vault

A backup vault is where your recovery points (backups) are stored. Think of it as an encrypted container for your backups.

Create a backup vault:

```bash
# Create a backup vault with default encryption
aws backup create-backup-vault \
  --backup-vault-name ec2-backups \
  --backup-vault-tags Environment=production

# Or create with a custom KMS key for additional security
aws backup create-backup-vault \
  --backup-vault-name ec2-backups-encrypted \
  --encryption-key-arn arn:aws:kms:us-east-1:123456789012:key/abc123
```

List your backup vaults:

```bash
aws backup list-backup-vaults \
  --query 'BackupVaultList[].{Name: BackupVaultName, Points: NumberOfRecoveryPoints}'
```

## Creating a Backup Plan

A backup plan defines when backups happen, how long they're retained, and where they're stored. You can have multiple rules in a single plan for different backup frequencies.

Create a backup plan with daily and monthly rules:

```bash
# Create a backup plan
aws backup create-backup-plan --backup-plan '{
  "BackupPlanName": "ec2-daily-monthly",
  "Rules": [
    {
      "RuleName": "DailyBackup",
      "TargetBackupVaultName": "ec2-backups",
      "ScheduleExpression": "cron(0 5 ? * * *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 180,
      "Lifecycle": {
        "DeleteAfterDays": 35
      }
    },
    {
      "RuleName": "MonthlyBackup",
      "TargetBackupVaultName": "ec2-backups",
      "ScheduleExpression": "cron(0 5 1 * ? *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 360,
      "Lifecycle": {
        "MoveToColdStorageAfterDays": 30,
        "DeleteAfterDays": 365
      }
    }
  ]
}'
```

This plan creates daily backups kept for 35 days and monthly backups that move to cold storage after 30 days and are deleted after a year.

The schedule uses cron expressions in UTC. `cron(0 5 ? * * *)` means "every day at 5:00 AM UTC."

## Assigning Resources to the Backup Plan

Resources are assigned using a selection mechanism that can be tag-based (recommended) or specify individual resource ARNs.

First, create an IAM role for AWS Backup:

```bash
# Create the backup role
aws iam create-role \
  --role-name AWSBackupRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "backup.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the managed backup policy
aws iam attach-role-policy \
  --role-name AWSBackupRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup

aws iam attach-role-policy \
  --role-name AWSBackupRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores
```

Now create a resource selection using tags:

```bash
# Assign resources by tag (all instances tagged with Backup=true)
aws backup create-backup-selection \
  --backup-plan-id YOUR_PLAN_ID \
  --backup-selection '{
    "SelectionName": "tagged-ec2-instances",
    "IamRoleArn": "arn:aws:iam::123456789012:role/AWSBackupRole",
    "ListOfTags": [
      {
        "ConditionType": "STRINGEQUALS",
        "ConditionKey": "Backup",
        "ConditionValue": "true"
      }
    ]
  }'
```

Now tag your EC2 instances to include them in the backup plan:

```bash
# Tag instances for backup
aws ec2 create-tags \
  --resources i-0abc123 i-0def456 i-0ghi789 \
  --tags Key=Backup,Value=true
```

Any instance with `Backup=true` will automatically be included in the backup plan. New instances with this tag are picked up automatically.

## Cross-Region Backup Copies

For disaster recovery, copy backups to another region. This protects against regional outages.

Add a cross-region copy rule to your backup plan:

```bash
# Update the backup plan to include cross-region copy
aws backup update-backup-plan \
  --backup-plan-id YOUR_PLAN_ID \
  --backup-plan '{
    "BackupPlanName": "ec2-daily-monthly",
    "Rules": [
      {
        "RuleName": "DailyWithCrossRegionCopy",
        "TargetBackupVaultName": "ec2-backups",
        "ScheduleExpression": "cron(0 5 ? * * *)",
        "StartWindowMinutes": 60,
        "CompletionWindowMinutes": 180,
        "Lifecycle": {
          "DeleteAfterDays": 35
        },
        "CopyActions": [
          {
            "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:ec2-backups-dr",
            "Lifecycle": {
              "DeleteAfterDays": 35
            }
          }
        ]
      }
    ]
  }'
```

Make sure the destination vault exists in the target region first.

## Restoring from Backup

When disaster strikes, here's how to restore an EC2 instance from a backup.

List available recovery points:

```bash
# List recovery points for a specific resource
aws backup list-recovery-points-by-resource \
  --resource-arn arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123 \
  --query 'RecoveryPoints[].{Date: CreationDate, ID: RecoveryPointArn, Status: Status}' \
  --output table
```

Restore an EC2 instance:

```bash
# Start a restore job
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:abc123" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupRole" \
  --metadata '{
    "InstanceType": "t3.medium",
    "SubnetId": "subnet-0abc123",
    "SecurityGroupIds": "[\"sg-0abc123\"]"
  }'

# Check restore job status
aws backup describe-restore-job --restore-job-id YOUR_RESTORE_JOB_ID
```

The restored instance will be a new instance with new IDs. You'll need to update any references (load balancers, DNS, etc.) to point to the new instance.

## Setting Up with Terraform

Here's the complete backup setup as Terraform code:

```hcl
resource "aws_backup_vault" "ec2" {
  name = "ec2-backups"
}

resource "aws_backup_plan" "ec2" {
  name = "ec2-daily-monthly"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.ec2.name
    schedule          = "cron(0 5 ? * * *)"
    start_window      = 60
    completion_window  = 180

    lifecycle {
      delete_after = 35
    }
  }

  rule {
    rule_name         = "monthly"
    target_vault_name = aws_backup_vault.ec2.name
    schedule          = "cron(0 5 1 * ? *)"
    start_window      = 60
    completion_window  = 360

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365
    }
  }
}

resource "aws_backup_selection" "ec2" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "tagged-ec2-instances"
  plan_id      = aws_backup_plan.ec2.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }
}
```

## Monitoring Backup Jobs

Check backup job status and set up notifications for failures.

Monitor backup jobs:

```bash
# List recent backup jobs
aws backup list-backup-jobs \
  --by-state COMPLETED \
  --query 'BackupJobs[0:5].{Resource: ResourceArn, Status: State, Created: CreationDate, Size: BackupSizeInBytes}' \
  --output table

# Check for failed jobs
aws backup list-backup-jobs \
  --by-state FAILED \
  --query 'BackupJobs[].{Resource: ResourceArn, Message: StatusMessage}'
```

Set up SNS notifications for backup failures:

```bash
# Create an SNS topic for backup notifications
aws sns create-topic --name backup-alerts

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:backup-alerts \
  --protocol email \
  --notification-endpoint ops-team@example.com

# Set up EventBridge rule for backup failures
aws events put-rule \
  --name backup-failure-alert \
  --event-pattern '{
    "source": ["aws.backup"],
    "detail-type": ["Backup Job State Change"],
    "detail": {"state": ["FAILED"]}
  }'
```

## Compliance and Reporting

AWS Backup Audit Manager helps verify that your backup policies are being followed.

Create a backup audit framework:

```bash
# List available frameworks
aws backup list-frameworks

# Create a report plan
aws backup create-report-plan \
  --report-plan-name "ec2-backup-compliance" \
  --report-delivery-channel '{
    "S3BucketName": "my-backup-reports",
    "Formats": ["CSV"]
  }' \
  --report-setting '{
    "ReportTemplate": "BACKUP_JOB_REPORT"
  }'
```

For comprehensive infrastructure monitoring including backup health, check our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Wrapping Up

AWS Backup takes the manual work out of EC2 backups. Define a plan with your desired schedule and retention, assign resources via tags, and let AWS handle the rest. Add cross-region copies for disaster recovery, monitor for failures with EventBridge and SNS, and use compliance reports to prove your backup posture. It's one of those services that's easy to set up and immensely valuable when you actually need to restore something.
