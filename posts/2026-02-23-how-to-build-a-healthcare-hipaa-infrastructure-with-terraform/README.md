# How to Build a Healthcare (HIPAA) Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, HIPAA, Healthcare, Compliance, Security, PHI

Description: Learn how to build HIPAA-compliant healthcare infrastructure with Terraform including PHI protection, encryption, access controls, audit logging, and BAA requirements.

---

Healthcare infrastructure is one of the most heavily regulated environments you can build. HIPAA requires specific safeguards for Protected Health Information (PHI) - technical, physical, and administrative. Getting it wrong can mean fines in the millions and loss of patient trust. Terraform lets you encode HIPAA requirements directly into your infrastructure code, ensuring every environment meets compliance standards automatically.

## Understanding HIPAA Infrastructure Requirements

HIPAA has several rules that affect infrastructure design. The Security Rule requires administrative, physical, and technical safeguards. The Privacy Rule governs how PHI is used and disclosed. The Breach Notification Rule mandates reporting. For infrastructure, the technical safeguards are the most relevant: access controls, audit controls, integrity controls, and transmission security.

Before building anything, you need a Business Associate Agreement (BAA) with AWS. AWS will not cover HIPAA compliance without one.

## Architecture Overview

Our HIPAA-compliant infrastructure includes:

- VPC with strict network isolation
- KMS encryption for all data at rest
- TLS 1.2+ for all data in transit
- CloudTrail for comprehensive audit logging
- Config rules for continuous compliance
- Dedicated tenancy for sensitive workloads
- Automated access controls
- Backup and recovery for PHI data

## VPC with HIPAA-Grade Network Security

Start with network isolation that prevents unauthorized access to PHI.

```hcl
# HIPAA-compliant VPC
resource "aws_vpc" "hipaa" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Consider dedicated tenancy for strictest isolation
  # instance_tenancy = "dedicated"

  tags = {
    Name       = "hipaa-${var.environment}"
    Compliance = "HIPAA"
    DataClass  = "PHI"
  }
}

# VPC endpoints to keep traffic off the public internet
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.hipaa.id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [aws_route_table.private.id]

  tags = {
    Compliance = "HIPAA"
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.hipaa.id
  service_name = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [aws_route_table.private.id]
}

# Interface endpoints for AWS services
resource "aws_vpc_endpoint" "kms" {
  vpc_id              = aws_vpc.hipaa.id
  service_name        = "com.amazonaws.${var.region}.kms"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.hipaa.id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.hipaa.id
  service_name        = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

# VPC Flow Logs - required for HIPAA audit
resource "aws_flow_log" "hipaa" {
  vpc_id                   = aws_vpc.hipaa.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_log.arn
  max_aggregation_interval = 60
}
```

## Encryption for PHI Data

All PHI must be encrypted at rest and in transit. No exceptions.

```hcl
# KMS key for PHI data encryption
resource "aws_kms_key" "phi" {
  description             = "Encryption key for PHI data"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  is_enabled              = true

  # Strict key policy
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowKeyAdmins"
        Effect = "Allow"
        Principal = {
          AWS = var.key_admin_role_arns
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
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion",
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
          "kms:DescribeKey",
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Compliance = "HIPAA"
    DataClass  = "PHI"
  }
}

resource "aws_kms_alias" "phi" {
  name          = "alias/phi-encryption"
  target_key_id = aws_kms_key.phi.key_id
}
```

## Database with HIPAA Controls

Aurora PostgreSQL with full encryption and audit logging.

```hcl
# Aurora cluster for PHI data
resource "aws_rds_cluster" "hipaa" {
  cluster_identifier      = "hipaa-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "healthcare"
  master_username         = "admin"
  master_password         = var.db_password
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.phi.arn
  deletion_protection     = true
  backup_retention_period = 35
  copy_tags_to_snapshot   = true

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.hipaa.name

  enabled_cloudwatch_logs_exports = ["postgresql"]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.hipaa.name

  # IAM database authentication for enhanced access control
  iam_database_authentication_enabled = true

  tags = {
    Compliance = "HIPAA"
    DataClass  = "PHI"
  }
}

resource "aws_rds_cluster_parameter_group" "hipaa" {
  name   = "hipaa-audit"
  family = "aurora-postgresql15"

  parameter {
    name  = "shared_preload_libraries"
    value = "pgaudit"
  }

  parameter {
    name  = "pgaudit.log"
    value = "all"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  # Force SSL connections
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}
```

## PHI Storage with S3

S3 buckets for PHI need encryption, access logging, and versioning.

```hcl
# S3 bucket for PHI documents
resource "aws_s3_bucket" "phi_documents" {
  bucket = "hipaa-phi-documents-${var.environment}"

  tags = {
    Compliance = "HIPAA"
    DataClass  = "PHI"
  }
}

resource "aws_s3_bucket_versioning" "phi" {
  bucket = aws_s3_bucket.phi_documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "phi" {
  bucket = aws_s3_bucket.phi_documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.phi.arn
    }
    bucket_key_enabled = true
  }
}

# Block ALL public access
resource "aws_s3_bucket_public_access_block" "phi" {
  bucket = aws_s3_bucket.phi_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Access logging
resource "aws_s3_bucket_logging" "phi" {
  bucket        = aws_s3_bucket.phi_documents.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "phi-access-logs/"
}

# Object lock for immutability (prevent deletion/modification)
resource "aws_s3_bucket_object_lock_configuration" "phi" {
  bucket = aws_s3_bucket.phi_documents.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 2555  # 7 years - HIPAA retention requirement
    }
  }
}

# Bucket policy enforcing encryption and SSL
resource "aws_s3_bucket_policy" "phi" {
  bucket = aws_s3_bucket.phi_documents.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnencryptedUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.phi_documents.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid       = "DenyNonSSL"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.phi_documents.arn,
          "${aws_s3_bucket.phi_documents.arn}/*",
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

## Audit Logging

HIPAA requires comprehensive audit trails for all access to PHI.

```hcl
# CloudTrail for API audit logging
resource "aws_cloudtrail" "hipaa" {
  name                       = "hipaa-audit-trail"
  s3_bucket_name             = aws_s3_bucket.audit_logs.id
  is_multi_region_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = aws_kms_key.phi.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.phi_documents.arn}/"]
    }
  }

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn
}

# CloudWatch log group with encryption and retention
resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/hipaa/cloudtrail"
  retention_in_days = 2555  # 7 years
  kms_key_id        = aws_kms_key.phi.arn
}

# Config rules for continuous HIPAA compliance
resource "aws_config_config_rule" "s3_encryption" {
  name = "hipaa-s3-encryption"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }
}

resource "aws_config_config_rule" "rds_encryption" {
  name = "hipaa-rds-encryption"
  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }
}

resource "aws_config_config_rule" "cloudtrail_enabled" {
  name = "hipaa-cloudtrail-enabled"
  source {
    owner             = "AWS"
    source_identifier = "CLOUD_TRAIL_ENABLED"
  }
}
```

## Backup and Recovery

HIPAA requires data backup and the ability to recover PHI.

```hcl
# AWS Backup plan for HIPAA data
resource "aws_backup_plan" "hipaa" {
  name = "hipaa-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.hipaa.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      delete_after = 2555  # 7 years retention
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.hipaa_dr.arn
      lifecycle {
        delete_after = 2555
      }
    }
  }
}

resource "aws_backup_vault" "hipaa" {
  name        = "hipaa-backup-vault"
  kms_key_arn = aws_kms_key.phi.arn
}

# Vault lock to prevent deletion
resource "aws_backup_vault_lock_configuration" "hipaa" {
  backup_vault_name  = aws_backup_vault.hipaa.name
  min_retention_days = 365
  max_retention_days = 2555
}
```

## Wrapping Up

HIPAA-compliant infrastructure is about defense in depth. Every layer has encryption. Every access is logged. Every resource has strict access controls. Network segmentation prevents lateral movement. Backups ensure data availability. And continuous compliance monitoring catches any drift.

Terraform is invaluable here because it turns HIPAA controls into code. When an auditor asks about your encryption practices, you show them the KMS configuration. When they ask about access logging, you show them the CloudTrail setup. The infrastructure code itself serves as compliance documentation.

For monitoring your HIPAA-compliant infrastructure and getting real-time alerts on compliance violations and security events, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-healthcare-hipaa-infrastructure-with-terraform/view) for healthcare infrastructure observability.
