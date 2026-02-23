# How to Configure Database Encryption at Rest in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Encryption, Security, KMS, Infrastructure as Code

Description: Learn how to configure encryption at rest for AWS databases using Terraform including RDS, Aurora, DynamoDB, ElastiCache, and other services with KMS.

---

Encryption at rest protects your data by encrypting it when it is stored on disk. For AWS managed database services, this means that the underlying storage, automated backups, snapshots, and read replicas are all encrypted. Many compliance frameworks require encryption at rest, making it a standard practice for production databases. In this guide, we will cover how to configure encryption at rest across all major AWS database services using Terraform.

## Understanding Encryption at Rest

When you enable encryption at rest on an AWS database, the service encrypts the data using AES-256 encryption. The encryption keys are managed through AWS Key Management Service (KMS). You can use either AWS-managed keys (which AWS creates and manages for you) or customer-managed keys (which you create and control in KMS).

Customer-managed keys give you more control, including the ability to rotate keys, define key policies, audit key usage through CloudTrail, and disable or delete keys. For production workloads, customer-managed keys are generally recommended.

## Setting Up the Provider and KMS Key

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Create a customer-managed KMS key for database encryption
resource "aws_kms_key" "database_key" {
  description             = "KMS key for database encryption at rest"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Automatically rotate the key annually

  # Key policy allowing account root and specific roles
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowDatabaseAdmins"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/DatabaseAdmin"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
          "kms:CreateGrant",
          "kms:ListGrants",
          "kms:RevokeGrant"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Environment = "production"
    Purpose     = "database-encryption"
    ManagedBy   = "terraform"
  }
}

# Create a friendly alias for the key
resource "aws_kms_alias" "database_key_alias" {
  name          = "alias/database-encryption"
  target_key_id = aws_kms_key.database_key.key_id
}

data "aws_caller_identity" "current" {}
```

## Encrypting RDS Instances

```hcl
# RDS instance with encryption at rest using customer-managed key
resource "aws_db_instance" "encrypted_postgres" {
  identifier     = "encrypted-postgres"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"

  db_name  = "appdb"
  username = "dbadmin"
  password = var.db_password

  # Enable encryption with customer-managed KMS key
  storage_encrypted = true
  kms_key_id        = aws_kms_key.database_key.arn

  # Snapshots inherit encryption settings
  copy_tags_to_snapshot = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  multi_az               = true

  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "encrypted-postgres-final"

  tags = {
    Environment = "production"
    Encryption  = "customer-managed-kms"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Encrypting Aurora Clusters

```hcl
# Aurora cluster with encryption
resource "aws_rds_cluster" "encrypted_aurora" {
  cluster_identifier = "encrypted-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "dbadmin"
  master_password    = var.db_password

  # Enable encryption with customer-managed key
  storage_encrypted = true
  kms_key_id        = aws_kms_key.database_key.arn

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  backup_retention_period = 14
  copy_tags_to_snapshot   = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "encrypted-aurora-final"

  tags = {
    Environment = "production"
    Encryption  = "customer-managed-kms"
  }
}

# Aurora instances inherit encryption from the cluster
resource "aws_rds_cluster_instance" "encrypted_instances" {
  count = 2

  identifier         = "encrypted-aurora-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.encrypted_aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.encrypted_aurora.engine
  engine_version     = aws_rds_cluster.encrypted_aurora.engine_version

  tags = {
    Environment = "production"
  }
}
```

## Encrypting DynamoDB Tables

```hcl
# DynamoDB with AWS-managed key (default, no additional cost)
resource "aws_dynamodb_table" "default_encrypted" {
  name         = "default-encrypted-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # Default encryption with AWS-owned key (enabled by default)
  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "production"
  }
}

# DynamoDB with customer-managed KMS key
resource "aws_dynamodb_table" "custom_encrypted" {
  name         = "custom-encrypted-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # Encryption with customer-managed key
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.database_key.arn
  }

  tags = {
    Environment = "production"
    Encryption  = "customer-managed-kms"
  }
}
```

## Encrypting ElastiCache

```hcl
# ElastiCache Redis with encryption at rest
resource "aws_elasticache_replication_group" "encrypted_redis" {
  replication_group_id       = "encrypted-redis"
  description                = "Encrypted Redis replication group"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  automatic_failover_enabled = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis_sg.id]

  # Enable encryption at rest
  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.database_key.arn

  # Also enable encryption in transit
  transit_encryption_enabled = true

  tags = {
    Environment = "production"
    Encryption  = "at-rest-and-in-transit"
  }
}
```

## Encrypting DocumentDB

```hcl
# DocumentDB with encryption
resource "aws_docdb_cluster" "encrypted_docdb" {
  cluster_identifier = "encrypted-docdb"
  engine             = "docdb"
  engine_version     = "5.0.0"
  master_username    = "docdbadmin"
  master_password    = var.db_password

  # Enable encryption with customer-managed key
  storage_encrypted = true
  kms_key_id        = aws_kms_key.database_key.arn

  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]

  skip_final_snapshot       = false
  final_snapshot_identifier = "encrypted-docdb-final"

  tags = {
    Environment = "production"
    Encryption  = "customer-managed-kms"
  }
}
```

## Encrypting Neptune

```hcl
# Neptune with encryption
resource "aws_neptune_cluster" "encrypted_neptune" {
  cluster_identifier = "encrypted-neptune"
  engine             = "neptune"
  engine_version     = "1.3.1.0"

  # Enable encryption
  storage_encrypted = true
  kms_key_arn       = aws_kms_key.database_key.arn

  neptune_subnet_group_name = aws_neptune_subnet_group.main.name
  vpc_security_group_ids    = [aws_security_group.neptune_sg.id]

  skip_final_snapshot       = false
  final_snapshot_identifier = "encrypted-neptune-final"

  tags = {
    Environment = "production"
    Encryption  = "customer-managed-kms"
  }
}
```

## Creating Separate KMS Keys per Service

For fine-grained access control, use separate KMS keys for different database services:

```hcl
# KMS keys for different services
locals {
  kms_key_configs = {
    rds = {
      description = "KMS key for RDS encryption"
      alias       = "alias/rds-encryption"
    }
    aurora = {
      description = "KMS key for Aurora encryption"
      alias       = "alias/aurora-encryption"
    }
    dynamodb = {
      description = "KMS key for DynamoDB encryption"
      alias       = "alias/dynamodb-encryption"
    }
    elasticache = {
      description = "KMS key for ElastiCache encryption"
      alias       = "alias/elasticache-encryption"
    }
  }
}

resource "aws_kms_key" "service_keys" {
  for_each = local.kms_key_configs

  description             = each.value.description
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = "production"
    Service     = each.key
  }
}

resource "aws_kms_alias" "service_key_aliases" {
  for_each = local.kms_key_configs

  name          = each.value.alias
  target_key_id = aws_kms_key.service_keys[each.key].key_id
}
```

## Monitoring KMS Key Usage

```hcl
# CloudTrail for KMS key usage auditing
resource "aws_cloudwatch_metric_alarm" "kms_key_deletion" {
  alarm_name          = "kms-key-pending-deletion"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfMessagesPublished"
  namespace           = "AWS/SNS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when KMS key deletion is scheduled"

  alarm_actions = [aws_sns_topic.security_alerts.arn]
}

resource "aws_sns_topic" "security_alerts" {
  name = "database-security-alerts"
}
```

For comprehensive monitoring of your database encryption status, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides dashboards to track security configurations across your infrastructure.

## Important Notes

There are several things to keep in mind about encryption at rest. Once you enable encryption on an RDS or Aurora instance, you cannot disable it. If you need to encrypt an existing unencrypted database, you must create an encrypted snapshot and restore from it. Read replicas must use the same encryption setting as their source database. Cross-region read replicas require a KMS key in the destination region.

## Best Practices

Enable encryption at rest on all production databases from day one. Use customer-managed KMS keys for production workloads. Enable key rotation on all customer-managed keys. Use separate KMS keys for different database services or data classifications. Audit KMS key usage through CloudTrail. Define clear key policies that follow the principle of least privilege. Tag KMS keys to track their purpose. Plan for key management across regions if you use cross-region replicas or backups.

## Conclusion

Encryption at rest is a fundamental security control for database workloads on AWS. Terraform makes it easy to consistently apply encryption across all your database services using KMS keys. By using customer-managed keys, enabling automatic rotation, and auditing key usage, you build a strong security foundation for your data. Make encryption at rest a non-negotiable part of your database provisioning standards.
