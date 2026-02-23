# How to Build a Cross-Region Replication Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cross-Region Replication, AWS, Disaster Recovery, High Availability, Infrastructure as Code

Description: Learn how to build cross-region replication infrastructure using Terraform for S3, DynamoDB, RDS, and ECS to ensure data availability across AWS regions.

---

Cross-region replication ensures your data and services are available even if an entire AWS region goes down. It is a critical component of any serious disaster recovery or high availability strategy. The challenge is that different AWS services have different replication mechanisms, and coordinating them all requires careful planning.

In this guide, we will build a comprehensive cross-region replication infrastructure using Terraform. We will cover S3, DynamoDB, RDS, Secrets Manager, and ECR, showing how to replicate each service across regions.

## Replication Architecture

Our cross-region setup replicates these components:

- **S3**: Bidirectional replication for object storage
- **DynamoDB**: Global tables for NoSQL data
- **RDS Aurora**: Global database for relational data
- **ECR**: Container image replication
- **Secrets Manager**: Secret replication for application configuration

## Multi-Region Provider Setup

```hcl
# providers.tf - Multi-region configuration
provider "aws" {
  alias  = "primary"
  region = var.primary_region
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}

variable "primary_region" {
  type    = string
  default = "us-east-1"
}

variable "secondary_region" {
  type    = string
  default = "eu-west-1"
}
```

## S3 Cross-Region Replication

S3 CRR replicates objects between buckets in different regions. We will set up bidirectional replication.

```hcl
# s3-replication.tf - S3 cross-region replication

# Primary bucket
resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = "${var.project_name}-data-${var.primary_region}"

  tags = {
    Region = var.primary_region
    Role   = "primary"
  }
}

resource "aws_s3_bucket_versioning" "primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.primary.arn
    }
    bucket_key_enabled = true
  }
}

# Secondary bucket
resource "aws_s3_bucket" "secondary" {
  provider = aws.secondary
  bucket   = "${var.project_name}-data-${var.secondary_region}"

  tags = {
    Region = var.secondary_region
    Role   = "secondary"
  }
}

resource "aws_s3_bucket_versioning" "secondary" {
  provider = aws.secondary
  bucket   = aws_s3_bucket.secondary.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "secondary" {
  provider = aws.secondary
  bucket   = aws_s3_bucket.secondary.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.secondary.arn
    }
    bucket_key_enabled = true
  }
}

# IAM role for replication
resource "aws_iam_role" "replication" {
  provider = aws.primary
  name     = "${var.project_name}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "replication" {
  provider = aws.primary
  name     = "s3-replication-policy"
  role     = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [aws_s3_bucket.primary.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = ["${aws_s3_bucket.primary.arn}/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = ["${aws_s3_bucket.secondary.arn}/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          aws_kms_key.primary.arn,
          aws_kms_key.secondary.arn
        ]
      }
    ]
  })
}

# Replication configuration: primary to secondary
resource "aws_s3_bucket_replication_configuration" "primary_to_secondary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    filter {}

    destination {
      bucket        = aws_s3_bucket.secondary.arn
      storage_class = "STANDARD"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.secondary.arn
      }

      # Enable replication time control for predictable replication
      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }

  depends_on = [
    aws_s3_bucket_versioning.primary,
    aws_s3_bucket_versioning.secondary
  ]
}
```

## DynamoDB Global Tables

DynamoDB Global Tables provide multi-region, multi-active replication.

```hcl
# dynamodb-replication.tf - DynamoDB global tables
resource "aws_dynamodb_table" "main" {
  provider = aws.primary

  name         = "${var.project_name}-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  # Stream is required for global tables
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  # Enable cross-region replication
  replica {
    region_name = var.secondary_region
    kms_key_arn = aws_kms_key.secondary_dynamodb.arn

    point_in_time_recovery {
      enabled = true
    }
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.primary_dynamodb.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Replication = "global-table"
  }
}
```

## Aurora Global Database

Aurora Global Database provides cross-region replication for relational data.

```hcl
# aurora-replication.tf - Aurora global database
resource "aws_rds_global_cluster" "main" {
  provider = aws.primary

  global_cluster_identifier = "${var.project_name}-global-db"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = var.database_name
  storage_encrypted         = true
}

resource "aws_rds_cluster" "primary" {
  provider = aws.primary

  cluster_identifier        = "${var.project_name}-primary"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"

  master_username = var.db_username
  master_password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.primary_db.id]

  backup_retention_period = 35
}

resource "aws_rds_cluster_instance" "primary" {
  provider = aws.primary
  count    = 2

  identifier         = "${var.project_name}-primary-${count.index}"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.r6g.large"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
}

resource "aws_rds_cluster" "secondary" {
  provider = aws.secondary

  cluster_identifier        = "${var.project_name}-secondary"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"

  db_subnet_group_name   = aws_db_subnet_group.secondary.name
  vpc_security_group_ids = [aws_security_group.secondary_db.id]

  depends_on = [aws_rds_cluster_instance.primary]
}

resource "aws_rds_cluster_instance" "secondary" {
  provider = aws.secondary

  identifier         = "${var.project_name}-secondary-0"
  cluster_identifier = aws_rds_cluster.secondary.id
  instance_class     = "db.r6g.large"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
}
```

## ECR Cross-Region Replication

Replicate container images to the secondary region so deployments work during failover.

```hcl
# ecr-replication.tf - Container image replication
resource "aws_ecr_replication_configuration" "main" {
  provider = aws.primary

  replication_configuration {
    rule {
      destination {
        region      = var.secondary_region
        registry_id = data.aws_caller_identity.current.account_id
      }
    }
  }
}
```

## Secrets Manager Replication

Replicate application secrets so the secondary region has everything it needs.

```hcl
# secrets-replication.tf - Cross-region secret replication
resource "aws_secretsmanager_secret" "app_config" {
  provider = aws.primary
  name     = "${var.project_name}/app-config"

  replica {
    region     = var.secondary_region
    kms_key_id = aws_kms_key.secondary_secrets.arn
  }

  tags = {
    Replication = "cross-region"
  }
}

resource "aws_secretsmanager_secret" "db_credentials" {
  provider = aws.primary
  name     = "${var.project_name}/db-credentials"

  replica {
    region     = var.secondary_region
    kms_key_id = aws_kms_key.secondary_secrets.arn
  }

  tags = {
    Replication = "cross-region"
  }
}
```

## Replication Monitoring

Monitor replication lag across all services to catch issues early.

```hcl
# monitoring.tf - Replication monitoring
# S3 replication lag
resource "aws_cloudwatch_metric_alarm" "s3_replication_lag" {
  provider            = aws.primary
  alarm_name          = "${var.project_name}-s3-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Maximum"
  threshold           = 900 # 15 minutes in seconds

  dimensions = {
    SourceBucket      = aws_s3_bucket.primary.id
    DestinationBucket = aws_s3_bucket.secondary.id
    RuleId            = "replicate-all"
  }

  alarm_actions = [var.alert_sns_topic_arn]
  alarm_description = "S3 replication lag exceeds 15 minutes"
}

# Aurora replication lag
resource "aws_cloudwatch_metric_alarm" "aurora_replication_lag" {
  provider            = aws.secondary
  alarm_name          = "${var.project_name}-aurora-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "AuroraGlobalDBReplicationLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 5000 # 5 seconds in ms

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.secondary.cluster_identifier
  }

  alarm_actions = [var.alert_sns_topic_arn]
  alarm_description = "Aurora global database replication lag exceeds 5 seconds"
}

# DynamoDB replication lag
resource "aws_cloudwatch_metric_alarm" "dynamodb_replication_lag" {
  provider            = aws.secondary
  alarm_name          = "${var.project_name}-dynamodb-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Maximum"
  threshold           = 30000 # 30 seconds in ms

  dimensions = {
    TableName  = aws_dynamodb_table.main.name
    ReceivingRegion = var.secondary_region
  }

  alarm_actions = [var.alert_sns_topic_arn]
  alarm_description = "DynamoDB global table replication lag exceeds 30 seconds"
}
```

## Summary

Cross-region replication with Terraform provides a unified approach to replicating all your critical services: S3 for objects, DynamoDB for NoSQL data, Aurora for relational data, ECR for container images, and Secrets Manager for configuration. Each service has its own replication mechanism, but Terraform lets you manage them all in one place.

The most important aspect is monitoring. Replication lag metrics tell you how far behind the secondary region is and how much data you could lose during failover. Set up alerts on every replication metric from day one.

For monitoring replication health across all your services and regions, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can provide a unified view of replication status and alert you when lag exceeds acceptable thresholds.
