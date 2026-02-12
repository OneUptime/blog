# How to Use AWS Backup for Centralized Backup Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Backup, Disaster Recovery, Data Protection

Description: Set up AWS Backup as a centralized backup solution for your AWS resources, covering supported services, backup vaults, and organizational policies for consistent data protection.

---

Managing backups across a dozen different AWS services is a headache. EBS snapshots have their own lifecycle rules. RDS has automated backups with separate retention settings. DynamoDB has point-in-time recovery. EFS has its own backup mechanism. Each service does its own thing, and keeping track of what's backed up, when, and where gets messy fast.

AWS Backup solves this by providing a single, centralized service to manage backups across your entire AWS environment. One place to define backup policies, one place to monitor backup status, and one place to restore from. It supports over 15 AWS services and keeps expanding.

## Supported Services

AWS Backup works with:
- Amazon EBS volumes
- Amazon RDS databases (including Aurora)
- Amazon DynamoDB tables
- Amazon EFS file systems
- Amazon FSx file systems
- Amazon EC2 instances (AMI-based)
- Amazon S3 buckets
- AWS Storage Gateway volumes
- Amazon DocumentDB
- Amazon Neptune
- Amazon Redshift
- VMware on AWS
- Amazon Timestream
- Amazon CloudFormation stacks

That covers the vast majority of stateful AWS resources you'd want to protect.

## Step 1: Create a Backup Vault

A backup vault is where your backups (recovery points) are stored. It's essentially a container encrypted with a KMS key:

```bash
# Create a KMS key for backup encryption
KEY_ID=$(aws kms create-key \
  --description "AWS Backup encryption key" \
  --query 'KeyMetadata.KeyId' \
  --output text)

aws kms create-alias \
  --alias-name alias/aws-backup-key \
  --target-key-id "$KEY_ID"

# Create the backup vault
aws backup create-backup-vault \
  --backup-vault-name "production-backups" \
  --encryption-key-arn "arn:aws:kms:us-east-1:123456789012:key/$KEY_ID" \
  --backup-vault-tags '{
    "Environment": "Production",
    "ManagedBy": "AWSBackup"
  }'
```

You can create multiple vaults for different environments or compliance requirements. Each vault has its own encryption key and access policies.

## Step 2: Set Up IAM for AWS Backup

AWS Backup needs a service role to create and manage backups:

```bash
# Create the backup service role
aws iam create-role \
  --role-name AWSBackupServiceRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "backup.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the managed policies
aws iam attach-role-policy \
  --role-name AWSBackupServiceRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup

aws iam attach-role-policy \
  --role-name AWSBackupServiceRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores
```

## Step 3: Create a Backup Plan

Backup plans define what to back up, when, and how long to keep it:

```bash
# Create a comprehensive backup plan
aws backup create-backup-plan \
  --backup-plan '{
    "BackupPlanName": "production-daily-weekly",
    "Rules": [
      {
        "RuleName": "DailyBackup",
        "TargetBackupVaultName": "production-backups",
        "ScheduleExpression": "cron(0 3 * * ? *)",
        "StartWindowMinutes": 60,
        "CompletionWindowMinutes": 180,
        "Lifecycle": {
          "MoveToColdStorageAfterDays": 30,
          "DeleteAfterDays": 365
        },
        "EnableContinuousBackup": false
      },
      {
        "RuleName": "WeeklyBackup",
        "TargetBackupVaultName": "production-backups",
        "ScheduleExpression": "cron(0 5 ? * SUN *)",
        "StartWindowMinutes": 120,
        "CompletionWindowMinutes": 360,
        "Lifecycle": {
          "MoveToColdStorageAfterDays": 90,
          "DeleteAfterDays": 2555
        }
      }
    ],
    "AdvancedBackupSettings": [
      {
        "ResourceType": "EC2",
        "BackupOptions": {
          "WindowsVSS": "enabled"
        }
      }
    ]
  }'
```

This plan creates:
- **Daily backups** at 3 AM UTC, kept for 1 year (moved to cold storage after 30 days)
- **Weekly backups** on Sundays at 5 AM UTC, kept for 7 years (moved to cold storage after 90 days)
- **Windows VSS** enabled for consistent EC2 snapshots of Windows instances

The start window gives AWS Backup a time range to initiate the backup (useful when backing up many resources). The completion window is the maximum time a backup can take before it's marked as failed.

## Step 4: Assign Resources to the Plan

Tell AWS Backup what to protect by creating resource assignments. You can assign by resource ARN, by tags, or both:

```bash
# Assign all resources tagged with Backup=true
aws backup create-backup-selection \
  --backup-plan-id "plan-12345678" \
  --backup-selection '{
    "SelectionName": "TagBasedSelection",
    "IamRoleArn": "arn:aws:iam::123456789012:role/AWSBackupServiceRole",
    "ListOfTags": [
      {
        "ConditionType": "STRINGEQUALS",
        "ConditionKey": "Backup",
        "ConditionValue": "true"
      }
    ]
  }'

# Assign specific resources by ARN
aws backup create-backup-selection \
  --backup-plan-id "plan-12345678" \
  --backup-selection '{
    "SelectionName": "CriticalDatabases",
    "IamRoleArn": "arn:aws:iam::123456789012:role/AWSBackupServiceRole",
    "Resources": [
      "arn:aws:rds:us-east-1:123456789012:db:production-db",
      "arn:aws:dynamodb:us-east-1:123456789012:table/orders",
      "arn:aws:ec2:us-east-1:123456789012:volume/vol-0123456789abcdef0"
    ]
  }'
```

The tag-based approach is the most scalable. Just tag any new resource with `Backup=true` and it automatically gets included in the backup plan. No need to update the plan every time you deploy a new database.

## Step 5: Enable Continuous Backup for Point-in-Time Recovery

For critical databases, enable continuous backup to support point-in-time recovery (PITR):

```bash
# Create a backup plan rule with continuous backup enabled
aws backup create-backup-plan \
  --backup-plan '{
    "BackupPlanName": "pitr-databases",
    "Rules": [
      {
        "RuleName": "ContinuousBackup",
        "TargetBackupVaultName": "production-backups",
        "ScheduleExpression": "cron(0 3 * * ? *)",
        "Lifecycle": {
          "DeleteAfterDays": 35
        },
        "EnableContinuousBackup": true
      }
    ]
  }'
```

Continuous backup lets you restore to any point within the retention period - not just the scheduled backup times. It's supported for RDS, Aurora, DynamoDB, S3, and SAP HANA.

## Step 6: Monitor Backup Jobs

Keep an eye on your backup health:

```bash
# List recent backup jobs
aws backup list-backup-jobs \
  --by-state COMPLETED \
  --by-backup-vault-name "production-backups" \
  --max-results 20

# Check for failed jobs
aws backup list-backup-jobs \
  --by-state FAILED \
  --by-created-after "$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)"

# Get backup job details
aws backup describe-backup-job \
  --backup-job-id "job-12345678"
```

Set up EventBridge rules to alert on failures:

```bash
# Create a rule for backup job failures
aws events put-rule \
  --name "BackupJobFailed" \
  --event-pattern '{
    "source": ["aws.backup"],
    "detail-type": ["Backup Job State Change"],
    "detail": {
      "state": ["FAILED", "EXPIRED"]
    }
  }' \
  --state ENABLED

aws events put-targets \
  --rule "BackupJobFailed" \
  --targets '[{
    "Id": "sns-notification",
    "Arn": "arn:aws:sns:us-east-1:123456789012:backup-alerts"
  }]'
```

## Step 7: Set Up Backup Reporting

AWS Backup can generate compliance reports:

```bash
# Create a backup report plan
aws backup create-report-plan \
  --report-plan-name "DailyComplianceReport" \
  --report-delivery-channel '{
    "S3BucketName": "backup-reports-bucket",
    "S3KeyPrefix": "compliance-reports",
    "Formats": ["CSV"]
  }' \
  --report-setting '{
    "ReportTemplate": "BACKUP_JOB_REPORT",
    "FrameworkArns": []
  }'
```

This generates daily reports showing backup job success/failure rates, which is invaluable for compliance audits.

## Organization-Wide Backup Policies

If you're using AWS Organizations, you can enforce backup policies across all accounts:

```bash
# Enable backup policies in your organization
aws organizations enable-policy-type \
  --root-id r-abc123 \
  --policy-type BACKUP_POLICY

# Create an organization backup policy
aws organizations create-policy \
  --name "RequiredBackups" \
  --type BACKUP_POLICY \
  --description "Mandatory backup policy for all accounts" \
  --content file://backup-policy.json
```

This ensures that even if a team forgets to set up backups, the organizational policy covers them. No more finding out about missing backups during an incident.

AWS Backup is one of those services that doesn't get enough attention until you need it. Setting it up takes an hour or two; not having it can cost you everything. Take the time to configure it properly, test your restores regularly (see our guide on [restoring from AWS Backup](https://oneuptime.com/blog/post/restore-resources-aws-backup/view)), and you'll sleep a lot better at night.
