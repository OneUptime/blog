# How to Implement Data Protection Policies with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Data Protection, Encryption, Security, Compliance

Description: Implement comprehensive data protection policies using Terraform including encryption at rest, encryption in transit, backup policies, and data classification.

---

Data protection is not a single checkbox. It is a set of overlapping controls that cover encryption at rest, encryption in transit, access controls, backup policies, and data lifecycle management. When you manage infrastructure with Terraform, you can codify all of these controls and apply them consistently across every resource in every environment.

This guide covers practical Terraform patterns for implementing data protection policies on AWS, from S3 bucket encryption to RDS backup retention to KMS key management.

## Encryption at Rest

Every data store should be encrypted at rest. Here is how to enforce this across common AWS services.

### S3 Buckets

```hcl
# S3 bucket with mandatory encryption
resource "aws_s3_bucket" "data" {
  bucket = "${var.project}-data-${var.environment}"

  tags = {
    DataClassification = "confidential"
    Environment        = var.environment
  }
}

# Default encryption with customer-managed KMS key
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data_encryption.arn
    }
    bucket_key_enabled = true
  }
}

# Deny any unencrypted uploads via bucket policy
resource "aws_s3_bucket_policy" "enforce_encryption" {
  bucket = aws_s3_bucket.data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnencryptedUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.data.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid       = "DenyIncorrectKMSKey"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.data.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption-aws-kms-key-id" = aws_kms_key.data_encryption.arn
          }
        }
      }
    ]
  })
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning for data recovery
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

### RDS Databases

```hcl
resource "aws_db_instance" "production" {
  identifier     = "${var.project}-production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  # Encryption at rest
  storage_encrypted = true
  kms_key_id        = aws_kms_key.data_encryption.arn

  # Backup configuration
  backup_retention_period = 35  # Keep backups for 35 days
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Copy backups to another region for disaster recovery
  # (handled separately via aws_db_instance_automated_backups_replication)

  # Deletion protection
  deletion_protection = true

  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Performance Insights with encryption
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.data_encryption.arn

  tags = {
    DataClassification = "confidential"
  }
}
```

### EBS Volumes

```hcl
# Default EBS encryption for the entire account
resource "aws_ebs_encryption_by_default" "enabled" {
  enabled = true
}

# Set the default KMS key for EBS encryption
resource "aws_ebs_default_kms_key" "default" {
  key_arn = aws_kms_key.data_encryption.arn
}

# Individual EBS volume with encryption
resource "aws_ebs_volume" "data" {
  availability_zone = var.availability_zone
  size              = 100
  type              = "gp3"
  encrypted         = true
  kms_key_id        = aws_kms_key.data_encryption.arn

  tags = {
    Name               = "${var.project}-data-volume"
    DataClassification = "confidential"
  }
}
```

## Encryption in Transit

### Enforce TLS on S3

```hcl
# Add to the bucket policy
resource "aws_s3_bucket_policy" "enforce_tls" {
  bucket = aws_s3_bucket.data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
```

### Enforce TLS on RDS

```hcl
# RDS parameter group that requires SSL
resource "aws_db_parameter_group" "require_ssl" {
  family = "postgres15"
  name   = "${var.project}-require-ssl"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}
```

### Enforce TLS on Elasticsearch/OpenSearch

```hcl
resource "aws_opensearch_domain" "main" {
  domain_name    = var.project
  engine_version = "OpenSearch_2.11"

  # Enforce HTTPS
  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-PFS-2023-10"
  }

  # Encryption at rest
  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.data_encryption.arn
  }

  # Node-to-node encryption
  node_to_node_encryption {
    enabled = true
  }
}
```

## KMS Key Management

Create a well-structured KMS key for data encryption:

```hcl
resource "aws_kms_key" "data_encryption" {
  description             = "KMS key for data encryption - ${var.project}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region            = false

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowKeyAdministration"
        Effect = "Allow"
        Principal = {
          AWS = var.key_admin_role_arn
        }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowKeyUsage"
        Effect = "Allow"
        Principal = {
          AWS = var.key_user_role_arns
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        # Allow AWS services to use the key
        Sid    = "AllowServiceUsage"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
            "kms:ViaService"    = "s3.${var.region}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-data-encryption-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "data_encryption" {
  name          = "alias/${var.project}-data-encryption"
  target_key_id = aws_kms_key.data_encryption.key_id
}
```

## Data Lifecycle Policies

### S3 Object Lifecycle

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "transition-to-cheaper-storage"
    status = "Enabled"

    filter {
      prefix = "archive/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }

  rule {
    id     = "delete-temporary-data"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 7
    }
  }

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

### AWS Backup Plans

```hcl
# Backup plan for critical resources
resource "aws_backup_plan" "critical_data" {
  name = "${var.project}-critical-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_region.arn
      lifecycle {
        delete_after = 365
      }
    }
  }

  rule {
    rule_name         = "monthly-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 1 * ? *)"

    lifecycle {
      cold_storage_after = 90
      delete_after       = 2555  # 7 years for compliance
    }
  }
}

# Encrypted backup vault
resource "aws_backup_vault" "main" {
  name        = "${var.project}-backup-vault"
  kms_key_arn = aws_kms_key.data_encryption.arn
}

# Assign resources to backup plan using tags
resource "aws_backup_selection" "critical" {
  name         = "critical-resources"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.critical_data.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "DataClassification"
    value = "confidential"
  }
}
```

## Summary

Data protection with Terraform means encoding your encryption, access control, backup, and lifecycle policies as infrastructure code. Every S3 bucket gets encryption. Every database gets encrypted storage and backups. Every data store requires TLS in transit. KMS keys have well-defined policies that separate administration from usage. And backup plans ensure you can recover from both accidental deletion and regional outages. By defining these policies in Terraform, you ensure they are applied consistently and can be audited at any time.

For more on compliance and security, see [how to handle Terraform with compliance frameworks](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-with-compliance-frameworks-soc2-pci-hipaa/view).
