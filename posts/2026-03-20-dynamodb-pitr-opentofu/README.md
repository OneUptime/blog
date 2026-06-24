# How to Enable DynamoDB Point-in-Time Recovery with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, PITR, Backup, Disaster Recovery, Terraform

Description: Learn how to enable and manage DynamoDB Point-in-Time Recovery (PITR) using OpenTofu to protect your data with continuous backups and restore to any point within 35 days.

---

DynamoDB Point-in-Time Recovery (PITR) provides continuous backups of your DynamoDB table data. It allows you to restore your table to any point in time within its configured recovery window (35 days by default), protecting against accidental writes, deletes, or application bugs.

---

## Enabling PITR with OpenTofu

### Basic Table with PITR

```hcl
# main.tf

resource "aws_dynamodb_table" "users" {
  name           = "users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  point_in_time_recovery {
    enabled                 = true
    recovery_period_in_days = 35
  }

  tags = {
    Environment = "production"
    DataClass   = "sensitive"
    ManagedBy   = "opentofu"
  }
}
```

### Enable PITR on Existing Table

If the table already exists, import it into OpenTofu state before applying the PITR change:

```bash
tofu import aws_dynamodb_table.orders orders
```

```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  point_in_time_recovery {
    enabled                 = true
    recovery_period_in_days = 35
  }
}
```

---

## Verify PITR is Enabled

```bash
# Check PITR status
aws dynamodb describe-continuous-backups --table-name users \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription'

# Expected output:
# {
#   "PointInTimeRecoveryStatus": "ENABLED",
#   "RecoveryPeriodInDays": 35,
#   "EarliestRestorableDateTime": "2026-02-13T...",
#   "LatestRestorableDateTime": "2026-03-20T..."
# }
```

---

## Restoring from PITR

PITR restores create a new table - they do not overwrite the source.

### Restore via AWS CLI

```bash
# Restore to latest restorable time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name users \
  --target-table-name users-restored-20260320 \
  --use-latest-restorable-time

# Restore to a specific time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name users \
  --target-table-name users-restored-before-incident \
  --restore-date-time "2026-03-19T14:30:00Z"

# Monitor restore status
aws dynamodb describe-table --table-name users-restored-20260320 \
  --query 'Table.TableStatus'
```

---

## Combining PITR with On-Demand Backups

Use PITR for continuous recovery, and create on-demand backups separately for ad hoc snapshots:

```hcl
# PITR for continuous protection
resource "aws_dynamodb_table" "critical" {
  name         = "transactions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "txId"

  attribute {
    name = "txId"
    type = "S"
  }

  point_in_time_recovery {
    enabled                 = true
    recovery_period_in_days = 35
  }
}
```

```bash
# Create an on-demand backup when you need a snapshot
aws dynamodb create-backup \
  --table-name transactions \
  --backup-name transactions-20260320
```

---

## CloudWatch Monitoring for AWS Backup Jobs

If you schedule on-demand backups with AWS Backup, alarm on failed backup jobs:

```hcl
resource "aws_cloudwatch_metric_alarm" "backup_jobs_failed" {
  alarm_name          = "aws-backup-failed-jobs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when AWS Backup reports failed backup jobs"
  treat_missing_data  = "notBreaching"
}
```

---

## Scheduled On-Demand Backups with AWS Backup

For centralized management of scheduled on-demand backups across services, use AWS Backup after opting DynamoDB into AWS Backup for that account and Region:

```hcl
data "aws_iam_policy_document" "backup_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "backup" {
  name               = "dynamodb-backup-role"
  assume_role_policy = data.aws_iam_policy_document.backup_assume_role.json
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_kms_key" "backup" {
  description             = "KMS key for DynamoDB backups"
  deletion_window_in_days = 7
}

resource "aws_backup_plan" "dynamodb" {
  name = "dynamodb-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"  # 2 AM daily
    
    lifecycle {
      delete_after = 35
    }
  }
}

resource "aws_backup_selection" "dynamodb" {
  name         = "dynamodb-selection"
  plan_id      = aws_backup_plan.dynamodb.id
  iam_role_arn = aws_iam_role.backup.arn

  resources = [
    aws_dynamodb_table.critical.arn
  ]
}

resource "aws_backup_vault" "main" {
  name        = "dynamodb-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn
}
```

---

## Cost Considerations

PITR pricing is based on table size:

| Factor | Cost |
|--------|------|
| PITR storage | Charged per GB of table data and local secondary indexes per month |
| Data restore | Charged per GB restored |
| Cross-region restore | Destination restore charges plus inter-Region data transfer out |

---

## Best Practices

1. **Enable PITR on all production tables** - the cost is minimal compared to data loss risk
2. **Test restores regularly** - run quarterly restore drills to validate your recovery process
3. **Monitor earliest restorable time** - make sure it reaches your configured recovery window, especially after disabling and re-enabling PITR
4. **Use separate restored table name** - never restore over an existing production table
5. **Combine with on-demand backups** for long-term archival beyond your PITR window

---

## Conclusion

DynamoDB PITR is a small OpenTofu change that provides continuous protection with a configurable 1 to 35 day recovery window. Enable it on production tables, and pair it with AWS Backup or on-demand backups for longer-term retention.

---

*Monitor your database health and set up alerting with [OneUptime](https://oneuptime.com).*
