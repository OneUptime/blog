# How to Restore Resources from AWS Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Backup, Restore, Disaster Recovery, Data Recovery

Description: Step-by-step guide to restoring AWS resources from backup recovery points, covering EBS, RDS, DynamoDB, EFS, EC2, and point-in-time recovery scenarios.

---

Backups are worthless if you can't restore from them. It sounds obvious, but you'd be surprised how many teams set up elaborate backup plans and never test a restore until they actually need one - at 3 AM during an incident. That's the worst time to discover your restore process doesn't work or your team doesn't know how to do it.

This guide walks through restoring different types of AWS resources from AWS Backup recovery points. We'll cover the most common services and highlight the gotchas for each.

## Finding Your Recovery Points

Before you can restore, you need to find the right recovery point:

```bash
# List all recovery points in a vault
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name "production-backups" \
  --query 'RecoveryPoints[*].{
    ARN:RecoveryPointArn,
    Resource:ResourceArn,
    Type:ResourceType,
    Created:CreationDate,
    Status:Status
  }' \
  --output table

# Filter by resource type
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name "production-backups" \
  --by-resource-type "RDS" \
  --max-results 10

# Filter by resource ARN
aws backup list-recovery-points-by-resource-arn \
  --resource-arn "arn:aws:rds:us-east-1:123456789012:db:production-db"
```

## Restoring an EBS Volume

EBS restores create a new volume from the backup snapshot. You can then attach it to an instance.

```bash
# Get the recovery point details
aws backup describe-recovery-point \
  --backup-vault-name "production-backups" \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:rp-ebs-001"

# Start the restore job
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:rp-ebs-001" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupServiceRole" \
  --metadata '{
    "availabilityZone": "us-east-1a",
    "encrypted": "true",
    "volumeType": "gp3",
    "iops": "3000",
    "throughput": "125"
  }'

# Monitor the restore
aws backup describe-restore-job \
  --restore-job-id "restore-ebs-001"
```

After the volume is created, attach it to your instance:

```bash
# Find the restored volume
aws ec2 describe-volumes \
  --filters "Name=tag:aws:backup:source-resource,Values=*" \
  --query 'Volumes[0].VolumeId' --output text

# Attach to an instance
aws ec2 attach-volume \
  --volume-id vol-restored123 \
  --instance-id i-0123456789abcdef0 \
  --device /dev/xvdf
```

## Restoring an RDS Database

RDS restores create a new database instance. You can't restore over an existing instance - it's always a new one.

```bash
# Restore RDS from a backup recovery point
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:rp-rds-001" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupServiceRole" \
  --metadata '{
    "DBInstanceIdentifier": "production-db-restored",
    "DBInstanceClass": "db.r5.large",
    "MultiAZ": "false",
    "DBSubnetGroupName": "production-subnet-group",
    "VpcSecurityGroupIds": "[\"sg-0123456789abcdef0\"]",
    "Port": "5432",
    "PubliclyAccessible": "false"
  }'
```

After the restore:

```bash
# Check the new instance status
aws rds describe-db-instances \
  --db-instance-identifier "production-db-restored" \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address}'

# Once available, you can rename the old instance and the new one
# to perform a swap
aws rds modify-db-instance \
  --db-instance-identifier "production-db" \
  --new-db-instance-identifier "production-db-old" \
  --apply-immediately

# Wait for the rename to complete, then rename the restored one
aws rds modify-db-instance \
  --db-instance-identifier "production-db-restored" \
  --new-db-instance-identifier "production-db" \
  --apply-immediately
```

## Restoring RDS with Point-in-Time Recovery

If you have continuous backup enabled, you can restore to any second within the retention period:

```bash
# Find the available PITR window
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name "production-backups" \
  --by-resource-type "RDS" \
  --query 'RecoveryPoints[?RecoveryPointType==`CONTINUOUS`].{
    ARN:RecoveryPointArn,
    Earliest:CreationDate,
    Resource:ResourceArn
  }'

# Restore to a specific point in time
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:continuous:rp-rds-pitr" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupServiceRole" \
  --metadata '{
    "DBInstanceIdentifier": "production-db-pitr",
    "DBInstanceClass": "db.r5.large",
    "RestoreTime": "2026-02-12T14:30:00Z",
    "MultiAZ": "false",
    "DBSubnetGroupName": "production-subnet-group"
  }'
```

PITR is incredibly useful when you know exactly when something went wrong - like an accidental DELETE statement at 2:30 PM. You can restore to 2:29 PM and recover the data.

## Restoring a DynamoDB Table

DynamoDB restores also create new tables:

```bash
# Restore a DynamoDB table
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:rp-ddb-001" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupServiceRole" \
  --metadata '{
    "targetTableName": "orders-restored",
    "encryptionType": "AWS_OWNED_KMS_KEY"
  }'

# Once restored, verify the data
aws dynamodb scan \
  --table-name "orders-restored" \
  --select COUNT
```

For DynamoDB with continuous backup, you can do PITR:

```bash
# Restore DynamoDB to a specific point
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:continuous:rp-ddb-pitr" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupServiceRole" \
  --metadata '{
    "targetTableName": "orders-pitr-restore",
    "restoreDateTime": "2026-02-12T10:00:00Z"
  }'
```

## Restoring an EFS File System

EFS restores can go to a new file system or to a specific directory within an existing one:

```bash
# Restore to a new EFS file system
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:rp-efs-001" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupServiceRole" \
  --metadata '{
    "file-system-id": "fs-0123456789abcdef0",
    "Encrypted": "true",
    "PerformanceMode": "generalPurpose",
    "newFileSystem": "true"
  }'

# Or restore to a subdirectory of an existing file system
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:rp-efs-001" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupServiceRole" \
  --metadata '{
    "file-system-id": "fs-0123456789abcdef0",
    "newFileSystem": "false",
    "ItemsToRestore": "[\"/*\"]"
  }'
```

Restoring to an existing file system puts the data in an `aws-backup-restore_[timestamp]` directory so it doesn't overwrite existing files.

## Restoring an EC2 Instance

EC2 restores create a new instance from the backed-up AMI:

```bash
# Restore an EC2 instance
aws backup start-restore-job \
  --recovery-point-arn "arn:aws:backup:us-east-1:123456789012:recovery-point:rp-ec2-001" \
  --iam-role-arn "arn:aws:iam::123456789012:role/AWSBackupServiceRole" \
  --metadata '{
    "InstanceType": "m5.large",
    "SubnetId": "subnet-0abc1234",
    "SecurityGroupIds": "[\"sg-0123456789abcdef0\"]",
    "Placement": "{\"AvailabilityZone\":\"us-east-1a\"}",
    "CpuOptions": "{}",
    "HibernationOptions": "{\"Configured\":false}"
  }'
```

## Monitoring Restore Jobs

Track your restore jobs and set up alerts:

```bash
# List all restore jobs
aws backup list-restore-jobs \
  --by-status COMPLETED \
  --max-results 20

# Get detailed info about a restore
aws backup describe-restore-job \
  --restore-job-id "restore-12345678" \
  --query '{
    Status: Status,
    ResourceType: ResourceType,
    Created: CreationDate,
    Completed: CompletionDate,
    RestoredResourceArn: CreatedResourceArn
  }'
```

## Building a Restore Runbook

Don't wait for a disaster to figure out your restore process. Create a runbook that documents:

1. **Who** is authorized to initiate restores
2. **Where** to find recovery points (vault names, how to search)
3. **Service-specific metadata** needed for each resource type
4. **Post-restore steps** - like DNS updates, application configuration changes, data verification
5. **Communication plan** - who to notify during a restore operation

Then schedule quarterly restore drills where you actually restore production data to a test environment. You'll catch configuration issues, permission problems, and knowledge gaps before they matter.

For comprehensive backup management including creating the plans that generate these recovery points, see our guide on [creating backup plans with AWS Backup](https://oneuptime.com/blog/post/create-backup-plans-aws-backup/view).
