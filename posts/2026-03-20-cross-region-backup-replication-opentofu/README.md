# How to Configure Cross-Region Backup Replication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Backup, Cross-Region, Disaster Recovery, Infrastructure as Code

Description: Learn how to configure cross-region backup replication with OpenTofu to ensure your backups survive regional failures and meet geographic redundancy requirements.

Cross-region backup replication copies your backups to a secondary AWS region, enabling recovery in case of a regional disaster. Managing this in OpenTofu ensures your DR strategy is documented and consistently configured.

## Cross-Region Copy in AWS Backup Plan

```hcl
provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

# Primary vault

resource "aws_backup_vault" "primary" {
  provider    = aws.primary
  name        = "primary-vault"
  kms_key_arn = aws_kms_key.backup_primary.arn
}

# DR vault in secondary region
resource "aws_backup_vault" "dr" {
  provider    = aws.dr
  name        = "dr-vault"
  kms_key_arn = aws_kms_key.backup_dr.arn  # Separate KMS key in DR region
}

# Backup plan with cross-region copy
resource "aws_backup_plan" "with_dr" {
  provider = aws.primary
  name     = "production-with-dr"

  rule {
    rule_name         = "daily-with-dr-copy"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      cold_storage_after = 30
      delete_after       = 120
    }

    # Copy to DR region
    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn

      lifecycle {
        cold_storage_after = 30
        delete_after       = 120
      }
    }
  }
}
```

## EBS Snapshot Cross-Region Copy with DLM

```hcl
resource "aws_dlm_lifecycle_policy" "cross_region" {
  description        = "EBS snapshots with cross-region copy"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    schedule {
      name = "daily"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["03:00"]
      }

      retain_rule {
        count = 7  # 7 days primary
      }

      copy_tags = true

      # Copy to DR region
      cross_region_copy_rule {
        target    = "us-west-2"  # DR region
        encrypted = true
        copy_tags = true

        retain_rule {
          interval      = 14  # Keep 14 days in DR region
          interval_unit = "DAYS"
        }
      }

      # Second DR region
      cross_region_copy_rule {
        target    = "eu-west-1"  # European DR
        encrypted = true
        copy_tags = true

        retain_rule {
          interval      = 14
          interval_unit = "DAYS"
        }
      }
    }

    target_tags = {
      Backup = "true"
    }
  }
}
```

## RDS Cross-Region Automated Backup Replication

```hcl
resource "aws_db_instance_automated_backups_replication" "main" {
  provider                        = aws.dr
  source_db_instance_arn          = aws_db_instance.primary.arn
  retention_period                = 14  # Days to retain replicated backups
  kms_key_id                      = aws_kms_key.backup_dr.arn

  # Replicate from primary region to DR region
  # The resource must be created in the destination region
}
```

## S3 Cross-Region Replication for Backup Bucket

```hcl
resource "aws_s3_bucket" "backup_primary" {
  provider = aws.primary
  bucket   = "myapp-backups-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "backup_dr" {
  provider = aws.dr
  bucket   = "myapp-backups-dr-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_replication_configuration" "cross_region" {
  provider = aws.primary
  bucket   = aws_s3_bucket.backup_primary.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-to-dr"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backup_dr.arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.backup_dr.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}
```

## Conclusion

Cross-region backup replication in OpenTofu ensures your backups survive regional failures. Configure AWS Backup plans to copy to a DR vault in a secondary region, use DLM with cross_region_copy_rule for EBS snapshots, enable RDS automated backup replication for database DR, and replicate backup buckets to secondary regions. Use separate KMS keys per region since keys are regional resources.
