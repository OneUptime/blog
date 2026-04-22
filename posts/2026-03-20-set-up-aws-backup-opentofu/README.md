# How to Set Up AWS Backup with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Backup, Disaster Recovery, Infrastructure as Code

Description: Learn how to configure AWS Backup with OpenTofu to centrally manage and automate backups across RDS, EBS, EFS, and other AWS services.

AWS Backup provides a centralized, policy-driven backup service across multiple AWS services. Managing backup plans and vaults in OpenTofu helps codify and consistently enforce your backup policy requirements.

## Creating a Backup Vault

```hcl
resource "aws_backup_vault" "main" {
  name        = "production-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Environment = "production"
    Purpose     = "Backup storage"
  }
}

# Lock the vault to protect recovery points from early deletion (compliance requirement)

resource "aws_backup_vault_lock_configuration" "compliance" {
  backup_vault_name   = aws_backup_vault.main.name
  min_retention_days  = 7
  max_retention_days  = 730
  changeable_for_days = 3  # 3-day grace period to configure
}
```

## Creating a Backup Plan

```hcl
resource "aws_backup_plan" "production" {
  name = "production-backup-plan"

  rule {
    rule_name         = "daily-backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"  # 3 AM UTC daily

    # Backup window
    start_window      = 60   # Start within 60 minutes of schedule
    completion_window = 180  # Must complete within 180 minutes

    lifecycle {
      delete_after = 365  # Delete after 1 year
    }
  }

  rule {
    rule_name         = "weekly-backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * MON *)"  # 3 AM UTC every Monday

    lifecycle {
      delete_after = 730  # Keep weekly backups for 2 years
    }

    # Copy weekly backups to DR region
    copy_action {
      destination_vault_arn = aws_backup_vault.dr_region.arn

      lifecycle {
        delete_after = 730
      }
    }
  }

  tags = {
    Environment = "production"
  }
}
```

## Assigning Resources to the Backup Plan

```hcl
resource "aws_backup_selection" "all_tagged" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "production-resources"
  plan_id      = aws_backup_plan.production.id

  # Backup all resources tagged with Backup=true
  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }
}

# Or backup specific resources by ARN
resource "aws_backup_selection" "specific" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "critical-databases"
  plan_id      = aws_backup_plan.production.id

  resources = [
    aws_db_instance.primary.arn,
    aws_efs_file_system.data.arn,
    aws_dynamodb_table.main.arn,
  ]
}
```

## IAM Role for Backup

```hcl
resource "aws_iam_role" "backup" {
  name = "aws-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "backup.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
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
```

## Conclusion

AWS Backup in OpenTofu provides centralized backup management across services. Tag resources with Backup=true for automatic inclusion in backup plans, configure daily and weekly rules with different retention periods, copy critical backups to a DR region, and lock vaults to protect recovery points from accidental or early deletion. Use vault lock in compliance mode to meet regulatory requirements for immutable backups.
