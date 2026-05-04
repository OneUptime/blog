# How to Create AWS Backup Vaults with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Backup, Backup Vault, Infrastructure as Code

Description: Learn how to create AWS Backup vaults with OpenTofu for encrypted, access-controlled backup storage with immutable vault lock for compliance.

AWS Backup vaults are encrypted repositories where backup data is stored. Managing vaults in OpenTofu ensures consistent encryption, access policies, and vault lock configuration that prevents unauthorized deletion of compliance backups.

## Creating a Backup Vault

```hcl
# KMS key for backup encryption

resource "aws_kms_key" "backup" {
  description             = "Backup vault encryption key"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = {
    Purpose = "Backup encryption"
  }
}

resource "aws_kms_alias" "backup" {
  name          = "alias/backup-vault"
  target_key_id = aws_kms_key.backup.key_id
}

# Production backup vault
resource "aws_backup_vault" "production" {
  name        = "production-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Environment = "production"
    DataClass   = "confidential"
  }
}
```

## Vault Access Policy

```hcl
resource "aws_backup_vault_policy" "production" {
  backup_vault_name = aws_backup_vault.production.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow backup service to write
      {
        Sid    = "AllowBackupService"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.backup.arn
        }
        Action = [
          "backup:CopyIntoBackupVault",
          "backup:GetRecoveryPointRestoreMetadata",
        ]
        Resource = "*"
      },
      # Allow restore operations by authorized role
      {
        Sid    = "AllowRestore"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.restore.arn
        }
        Action = [
          "backup:StartRestoreJob",
          "backup:DescribeRecoveryPoint",
          "backup:GetRecoveryPointRestoreMetadata",
          "backup:ListRecoveryPointsByBackupVault",
        ]
        Resource = "*"
      },
      # Deny deletion by everyone except the vault admin role
      {
        Sid    = "DenyDeletion"
        Effect = "Deny"
        Principal = { AWS = "*" }
        Action = [
          "backup:DeleteBackupVault",
          "backup:DeleteRecoveryPoint",
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:PrincipalArn" = aws_iam_role.vault_admin.arn
          }
        }
      }
    ]
  })
}
```

## Vault Lock (Immutable Backup Storage)

```hcl
# Compliance mode vault lock - cannot be removed or changed
resource "aws_backup_vault_lock_configuration" "compliance" {
  backup_vault_name = aws_backup_vault.production.name

  # Minimum 7 days, maximum 365 days retention
  min_retention_days = 7
  max_retention_days = 365

  # changeable_for_days: Cooling-off period before the lock becomes immutable.
  # Must be 3 or greater (AWS enforces a minimum 72-hour grace period).
  # Omit this argument entirely to create the lock in governance mode
  # (which can be removed by users with sufficient IAM permissions).
  changeable_for_days = 3
}
```

## Multiple Vaults for Different Tiers

```hcl
locals {
  vaults = {
    hot         = { retention_min = 1,   retention_max = 30,   lock = false }
    warm        = { retention_min = 7,   retention_max = 90,   lock = false }
    cold        = { retention_min = 30,  retention_max = 365,  lock = true }
    compliance  = { retention_min = 90,  retention_max = 2555, lock = true }
  }
}

resource "aws_backup_vault" "tiers" {
  for_each    = local.vaults
  name        = "${each.key}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Tier = each.key
  }
}

resource "aws_backup_vault_lock_configuration" "locked" {
  for_each = { for k, v in local.vaults : k => v if v.lock }

  backup_vault_name  = aws_backup_vault.tiers[each.key].name
  min_retention_days = each.value.retention_min
  max_retention_days = each.value.retention_max
  changeable_for_days = 3
}
```

## Cross-Region Vault (DR)

```hcl
provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

resource "aws_backup_vault" "dr" {
  provider    = aws.dr
  name        = "dr-backup-vault"
  kms_key_arn = aws_kms_key.backup_dr.arn

  tags = {
    Purpose = "disaster-recovery"
  }
}
```

## Notification on Backup Events

```hcl
resource "aws_backup_vault_notifications" "production" {
  backup_vault_name   = aws_backup_vault.production.name
  sns_topic_arn       = aws_sns_topic.backup_alerts.arn

  backup_vault_events = [
    "BACKUP_JOB_FAILED",
    "RESTORE_JOB_FAILED",
    "COPY_JOB_FAILED",
  ]
}
```

## Conclusion

AWS Backup vaults in OpenTofu provide encrypted, access-controlled storage for backup data. Use separate KMS keys for vault encryption, implement access policies to prevent unauthorized deletion, and apply vault lock for compliance requirements. Create multiple vaults for different data tiers and configure SNS notifications on backup failures to ensure your backup strategy is working as expected.
