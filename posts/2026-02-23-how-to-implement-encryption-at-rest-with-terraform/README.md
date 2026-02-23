# How to Implement Encryption at Rest with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Encryption, KMS, AWS

Description: Learn how to implement encryption at rest for all major AWS services using Terraform, including KMS key management and best practices.

---

Encryption at rest means that data stored on disk is encrypted. If someone gets physical access to the storage media or gains unauthorized access to the underlying storage service, the data is unreadable without the encryption key. Most compliance frameworks require it, and honestly, there is no good reason not to enable it for every service that supports it.

This guide walks through implementing encryption at rest for the most common AWS services using Terraform, along with KMS key management strategies.

## KMS Key Strategy

Before encrypting anything, you need encryption keys. AWS Key Management Service (KMS) is the standard choice. You have two options:

- **AWS-managed keys** (`aws/s3`, `aws/ebs`, etc.): Free, automatically rotated, but you cannot control access policies independently.
- **Customer-managed keys (CMK)**: You control the key policy, rotation schedule, and who can use the key. This is what most compliance frameworks require.

```hcl
# Create a customer-managed KMS key for general encryption
resource "aws_kms_key" "main" {
  description             = "Main encryption key for ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  # Key policy controlling who can use and manage this key
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountFullAccess"
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
          AWS = var.key_admin_arns
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
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowKeyUsers"
        Effect = "Allow"
        Principal = {
          AWS = var.key_user_arns
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-main-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.environment}-main"
  target_key_id = aws_kms_key.main.key_id
}
```

For environments with strict separation, create separate keys per service:

```hcl
# Separate keys for different services
resource "aws_kms_key" "s3" {
  description         = "S3 encryption key - ${var.environment}"
  enable_key_rotation = true
  # ... policy
}

resource "aws_kms_key" "rds" {
  description         = "RDS encryption key - ${var.environment}"
  enable_key_rotation = true
  # ... policy
}

resource "aws_kms_key" "ebs" {
  description         = "EBS encryption key - ${var.environment}"
  enable_key_rotation = true
  # ... policy
}
```

## S3 Bucket Encryption

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-encrypted-data-bucket"
}

# Enable server-side encryption with CMK
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    # Enable bucket keys to reduce KMS costs
    bucket_key_enabled = true
  }
}

# Deny unencrypted uploads
resource "aws_s3_bucket_policy" "require_encryption" {
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
        Sid       = "DenyWrongKMSKey"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.data.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption-aws-kms-key-id" = aws_kms_key.s3.arn
          }
        }
      }
    ]
  })
}
```

## RDS Encryption

```hcl
resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  # Encryption at rest
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  # Performance Insights encryption
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn

  # Other security settings
  publicly_accessible    = false
  deletion_protection    = true
  copy_tags_to_snapshot  = true
  backup_retention_period = 14

  tags = {
    Name       = "production-db"
    Encryption = "kms-cmk"
  }
}
```

Note: RDS encryption must be enabled at creation time. You cannot encrypt an existing unencrypted RDS instance in place - you need to create an encrypted snapshot and restore from it.

## EBS Volume Encryption

```hcl
# Enable EBS encryption by default for the entire account
resource "aws_ebs_encryption_by_default" "enabled" {
  enabled = true
}

resource "aws_ebs_default_kms_key" "main" {
  key_arn = aws_kms_key.ebs.arn
}

# Individual EBS volume with encryption
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100
  type              = "gp3"
  encrypted         = true
  kms_key_id        = aws_kms_key.ebs.arn

  tags = {
    Name = "data-volume"
  }
}

# EC2 instance with encrypted root volume
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
    kms_key_id  = aws_kms_key.ebs.arn
  }

  ebs_block_device {
    device_name = "/dev/sdf"
    volume_size = 100
    volume_type = "gp3"
    encrypted   = true
    kms_key_id  = aws_kms_key.ebs.arn
  }
}
```

## DynamoDB Encryption

```hcl
resource "aws_dynamodb_table" "main" {
  name         = "my-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # CMK encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.main.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}
```

## ElastiCache Encryption

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "production-redis"
  description          = "Production Redis cluster"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2

  # Encryption at rest
  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.main.arn

  # Encryption in transit
  transit_encryption_enabled = true

  # Auth
  auth_token = var.redis_auth_token

  subnet_group_name  = aws_elasticache_subnet_group.private.name
  security_group_ids = [aws_security_group.redis.id]
}
```

## EFS Encryption

```hcl
resource "aws_efs_file_system" "shared" {
  creation_token = "shared-storage"
  encrypted      = true
  kms_key_id     = aws_kms_key.main.arn

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = {
    Name = "shared-storage"
  }
}
```

## SNS and SQS Encryption

```hcl
resource "aws_sns_topic" "alerts" {
  name              = "security-alerts"
  kms_master_key_id = aws_kms_key.main.id
}

resource "aws_sqs_queue" "processing" {
  name                    = "job-processing"
  kms_master_key_id       = aws_kms_key.main.id
  kms_data_key_reuse_period_seconds = 86400
}
```

## CloudWatch Log Encryption

```hcl
resource "aws_cloudwatch_log_group" "application" {
  name              = "/app/production"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.main.arn
}
```

## Wrapping Up

Encryption at rest should be a default, not an afterthought. Enable EBS encryption by default at the account level, use CMKs for services that need independent key policies, and enforce encryption through bucket policies and SCP guardrails. The initial KMS key setup takes some thought, but once your key strategy is in place, enabling encryption on each service is straightforward.

For monitoring the health and availability of your encrypted infrastructure, [OneUptime](https://oneuptime.com) provides uptime monitoring, log management, and alerting to keep your services running smoothly.
