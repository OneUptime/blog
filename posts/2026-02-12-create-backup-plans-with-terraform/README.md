# How to Create Backup Plans with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Backup, Disaster Recovery, Infrastructure as Code

Description: Learn how to create and manage AWS Backup plans using Terraform, including vaults, rules, selections, and lifecycle policies for automated data protection.

---

Backing up your AWS resources isn't optional - it's something you need to get right from day one. AWS Backup gives you a centralized way to automate and manage backups across services like EC2, RDS, EFS, DynamoDB, and more. When you combine it with Terraform, you get repeatable, version-controlled backup infrastructure that you can deploy across multiple accounts and regions without clicking through the console.

In this post, we'll walk through setting up a complete AWS Backup plan with Terraform, covering vaults, plans, rules, selections, and lifecycle policies.

## Why Use Terraform for AWS Backup?

Manual backup configuration through the console is fine for a single account with a handful of resources. But once you're managing multiple environments or accounts, things get messy fast. Terraform lets you:

- Define backup policies as code that lives in your repo
- Apply consistent backup schedules across all environments
- Track changes to backup configurations through version control
- Roll back backup policy changes if something goes wrong
- Replicate backup strategies across AWS accounts

## Setting Up the Backup Vault

A backup vault is where your recovery points (backups) are stored. You'll want at least one vault, and it's a good idea to encrypt it with a customer-managed KMS key.

Here's how to create a backup vault with encryption:

```hcl
# Create a KMS key for encrypting backups
resource "aws_kms_key" "backup" {
  description             = "KMS key for AWS Backup vault encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "backup" {
  name          = "alias/backup-vault-key"
  target_key_id = aws_kms_key.backup.key_id
}

# Create the backup vault
resource "aws_backup_vault" "main" {
  name        = "main-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Creating the Backup Plan

The backup plan is where you define when backups happen and how long they're retained. A plan contains one or more rules, each specifying a schedule and lifecycle.

This example creates a plan with daily and monthly backup rules:

```hcl
resource "aws_backup_plan" "main" {
  name = "main-backup-plan"

  # Daily backup rule - runs every day at 3 AM UTC
  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"
    start_window      = 60   # minutes to start the backup
    completion_window = 180  # minutes to complete the backup

    lifecycle {
      cold_storage_after = 30  # move to cold storage after 30 days
      delete_after       = 120 # delete after 120 days
    }

    recovery_point_tags = {
      BackupType = "daily"
      ManagedBy  = "terraform"
    }
  }

  # Monthly backup rule - runs on the 1st of every month
  rule {
    rule_name         = "monthly-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 1 * ? *)"
    start_window      = 60
    completion_window = 360

    lifecycle {
      cold_storage_after = 90
      delete_after       = 365  # keep monthly backups for a year
    }

    recovery_point_tags = {
      BackupType = "monthly"
      ManagedBy  = "terraform"
    }
  }

  tags = {
    Environment = var.environment
  }
}
```

The `schedule` field uses AWS cron expressions. The `start_window` defines how long AWS Backup waits before canceling a job that doesn't start, and `completion_window` is the maximum time allowed for the backup to finish.

## Selecting Resources to Back Up

You need to tell AWS Backup which resources to include. There are two approaches: tag-based selection and resource ARN selection.

Tag-based selection is usually the better choice because it automatically picks up new resources that match the tags:

```hcl
# IAM role that AWS Backup assumes to perform backups
resource "aws_iam_role" "backup" {
  name = "aws-backup-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# Select resources by tag
resource "aws_backup_selection" "tag_based" {
  name         = "tag-based-selection"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.main.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }
}
```

Now any resource tagged with `Backup = true` gets automatically included in the plan. You can also select specific resources by ARN if you need more control:

```hcl
# Select specific resources by ARN
resource "aws_backup_selection" "specific_resources" {
  name         = "specific-resource-selection"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.main.id

  resources = [
    aws_db_instance.production.arn,
    aws_efs_file_system.shared.arn,
    aws_dynamodb_table.main.arn,
  ]
}
```

## Adding Vault Access Policies

If you need cross-account backup access or want to restrict who can delete recovery points, vault access policies are the way to go:

```hcl
resource "aws_backup_vault_policy" "main" {
  backup_vault_name = aws_backup_vault.main.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PreventDeletion"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = [
          "backup:DeleteRecoveryPoint",
          "backup:UpdateRecoveryPointLifecycle"
        ]
        Resource = "*"
      }
    ]
  })
}
```

This policy prevents anyone from manually deleting recovery points, which is great for compliance scenarios.

## Cross-Region Backup Copies

For disaster recovery, you'll want copies of your backups in another region. Add a `copy_action` block to your backup rule:

```hcl
# Vault in the DR region
resource "aws_backup_vault" "dr" {
  provider    = aws.dr_region
  name        = "dr-backup-vault"
  kms_key_arn = aws_kms_key.backup_dr.arn
}

# Add copy action to your backup plan rule
resource "aws_backup_plan" "with_cross_region" {
  name = "cross-region-backup-plan"

  rule {
    rule_name         = "daily-with-copy"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      delete_after = 90
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn

      lifecycle {
        delete_after = 90
      }
    }
  }
}
```

## Vault Lock for Compliance

AWS Backup Vault Lock enforces a WORM (Write Once Read Many) model. Once locked, no one - not even the root account - can delete backups before the retention period expires:

```hcl
resource "aws_backup_vault_lock_configuration" "main" {
  backup_vault_name   = aws_backup_vault.main.name
  changeable_for_days = 3       # grace period before lock becomes immutable
  max_retention_days  = 365
  min_retention_days  = 7
}
```

Be careful with vault locks. Once the grace period passes, the configuration becomes permanent and can't be undone.

## Variables and Outputs

Here's a clean variable structure for making the module reusable:

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "backup_schedule" {
  description = "Cron expression for backup schedule"
  type        = string
  default     = "cron(0 3 * * ? *)"
}

variable "retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 90
}

output "vault_arn" {
  value = aws_backup_vault.main.arn
}

output "plan_id" {
  value = aws_backup_plan.main.id
}
```

## Monitoring Your Backups

You should set up monitoring for backup failures. Check out our post on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view) for broader strategies, but here's a quick CloudWatch alarm for backup job failures:

```hcl
resource "aws_cloudwatch_metric_alarm" "backup_failures" {
  alarm_name          = "backup-job-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 86400  # 24 hours
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when any backup job fails"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

## Wrapping Up

With this setup, you've got a solid, automated backup strategy defined entirely in code. The key pieces are: a vault with encryption, a plan with scheduled rules and lifecycle policies, tag-based resource selection, and cross-region copies for disaster recovery. Tag your resources with `Backup = true` and they're automatically protected.

Start simple with daily backups and a reasonable retention period, then add complexity as your compliance requirements grow. The beauty of doing this in Terraform is that you can iterate on your backup strategy just like you would on any other piece of infrastructure code.
