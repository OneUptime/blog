# How to Create QLDB Ledgers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, QLDB, Ledger, Database, Blockchain, Infrastructure as Code

Description: Learn how to create and configure Amazon QLDB ledgers using Terraform for immutable, cryptographically verifiable transaction logs.

---

Amazon Quantum Ledger Database (QLDB) is a fully managed ledger database that provides a transparent, immutable, and cryptographically verifiable transaction log. Unlike traditional databases where you can modify or delete historical records, QLDB maintains a complete and verifiable history of every change made to your data. In this guide, we will walk through how to create and manage QLDB ledgers using Terraform.

## Understanding QLDB

QLDB is designed for applications that need an authoritative data source, sometimes called a system of record. It uses an immutable journal that tracks every change to your data and lets you cryptographically verify that no modifications have been made to the journal. This makes it suitable for use cases like financial transaction records, supply chain tracking, insurance claims processing, HR and payroll records, and regulatory compliance.

QLDB uses a document-oriented data model and a SQL-compatible query language called PartiQL. You interact with data in tables, similar to a relational database, but each table stores Amazon Ion documents, which are a superset of JSON.

## Setting Up the Provider

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
```

## Creating a Basic QLDB Ledger

```hcl
# Create a QLDB ledger
resource "aws_qldb_ledger" "main" {
  name                = "financial-transactions"
  permissions_mode    = "STANDARD"  # Use STANDARD for fine-grained permissions
  deletion_protection = true         # Prevent accidental deletion

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Purpose     = "financial-records"
  }
}
```

The `permissions_mode` parameter controls how access to the ledger is managed. `STANDARD` mode lets you use IAM policies to control access at the table and command level. `ALLOW_ALL` mode grants full access to any user with permission to the ledger resource itself, which is simpler but less secure.

## Creating a Ledger with KMS Encryption

By default, QLDB encrypts data with an AWS-owned key. For more control, you can use a customer-managed KMS key:

```hcl
# KMS key for QLDB encryption
resource "aws_kms_key" "qldb_key" {
  description             = "KMS key for QLDB ledger encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

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
        Sid    = "AllowQLDBAccess"
        Effect = "Allow"
        Principal = {
          Service = "qldb.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Environment = "production"
  }
}

resource "aws_kms_alias" "qldb_key_alias" {
  name          = "alias/qldb-encryption"
  target_key_id = aws_kms_key.qldb_key.key_id
}

data "aws_caller_identity" "current" {}

# QLDB ledger with customer-managed KMS key
resource "aws_qldb_ledger" "encrypted" {
  name                = "secure-transactions"
  permissions_mode    = "STANDARD"
  deletion_protection = true
  kms_key             = aws_kms_key.qldb_key.arn

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Encryption  = "customer-managed"
  }
}
```

## Setting Up QLDB Streams

QLDB Streams let you stream journal data to Amazon Kinesis Data Streams in near real-time. This is useful for building event-driven architectures, analytics pipelines, and replication to other data stores:

```hcl
# Kinesis Data Stream for QLDB journal data
resource "aws_kinesis_stream" "qldb_stream" {
  name             = "qldb-journal-stream"
  shard_count      = 2
  retention_period = 24

  tags = {
    Environment = "production"
    Purpose     = "qldb-streaming"
  }
}

# IAM role for QLDB to write to Kinesis
resource "aws_iam_role" "qldb_stream_role" {
  name = "qldb-stream-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "qldb.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "qldb_stream_policy" {
  name = "qldb-stream-policy"
  role = aws_iam_role.qldb_stream_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord*",
          "kinesis:DescribeStream",
          "kinesis:ListShards"
        ]
        Resource = aws_kinesis_stream.qldb_stream.arn
      }
    ]
  })
}

# QLDB Stream to Kinesis
resource "aws_qldb_stream" "journal_stream" {
  ledger_name          = aws_qldb_ledger.main.name
  stream_name          = "journal-to-kinesis"
  role_arn             = aws_iam_role.qldb_stream_role.arn
  inclusive_start_time = "2026-01-01T00:00:00Z"

  kinesis_configuration {
    aggregation_enabled = true
    stream_arn          = aws_kinesis_stream.qldb_stream.arn
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Configuring IAM Permissions

With STANDARD permissions mode, you control access using IAM policies:

```hcl
# IAM policy for read-only access to the ledger
resource "aws_iam_policy" "qldb_read" {
  name        = "qldb-read-policy"
  description = "Read-only access to QLDB ledger"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "qldb:SendCommand"
        ]
        Resource = aws_qldb_ledger.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "qldb:PartiQLSelect",
          "qldb:PartiQLHistoryFunction"
        ]
        Resource = "${aws_qldb_ledger.main.arn}/*"
      }
    ]
  })
}

# IAM policy for read-write access
resource "aws_iam_policy" "qldb_readwrite" {
  name        = "qldb-readwrite-policy"
  description = "Read-write access to QLDB ledger"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "qldb:SendCommand"
        ]
        Resource = aws_qldb_ledger.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "qldb:PartiQLSelect",
          "qldb:PartiQLInsert",
          "qldb:PartiQLUpdate",
          "qldb:PartiQLDelete",
          "qldb:PartiQLHistoryFunction",
          "qldb:PartiQLCreateTable",
          "qldb:PartiQLCreateIndex",
          "qldb:PartiQLDropTable",
          "qldb:PartiQLDropIndex"
        ]
        Resource = "${aws_qldb_ledger.main.arn}/*"
      }
    ]
  })
}

# IAM policy for admin access
resource "aws_iam_policy" "qldb_admin" {
  name        = "qldb-admin-policy"
  description = "Admin access to QLDB ledger"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "qldb:*"
        ]
        Resource = [
          aws_qldb_ledger.main.arn,
          "${aws_qldb_ledger.main.arn}/*"
        ]
      }
    ]
  })
}
```

## Creating Multiple Ledgers for Different Domains

```hcl
# Define ledgers for different business domains
variable "ledgers" {
  description = "Map of QLDB ledgers to create"
  type = map(object({
    permissions_mode    = string
    deletion_protection = bool
  }))
  default = {
    financial-transactions = {
      permissions_mode    = "STANDARD"
      deletion_protection = true
    }
    supply-chain-tracking = {
      permissions_mode    = "STANDARD"
      deletion_protection = true
    }
    audit-log = {
      permissions_mode    = "STANDARD"
      deletion_protection = true
    }
  }
}

# Create ledgers dynamically
resource "aws_qldb_ledger" "ledgers" {
  for_each = var.ledgers

  name                = each.key
  permissions_mode    = each.value.permissions_mode
  deletion_protection = each.value.deletion_protection

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Domain      = each.key
  }
}
```

## Exporting Journal Data to S3

You can export QLDB journal blocks to S3 for archival or analysis:

```hcl
# S3 bucket for QLDB journal exports
resource "aws_s3_bucket" "qldb_exports" {
  bucket = "qldb-journal-exports-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = "production"
    Purpose     = "qldb-exports"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "qldb_exports" {
  bucket = aws_s3_bucket.qldb_exports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# IAM role for QLDB to export to S3
resource "aws_iam_role" "qldb_export_role" {
  name = "qldb-export-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "qldb.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "qldb_export_policy" {
  name = "qldb-export-policy"
  role = aws_iam_role.qldb_export_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.qldb_exports.arn}/*"
      }
    ]
  })
}
```

## Outputs

```hcl
output "ledger_arn" {
  description = "ARN of the QLDB ledger"
  value       = aws_qldb_ledger.main.arn
}

output "ledger_name" {
  description = "Name of the QLDB ledger"
  value       = aws_qldb_ledger.main.name
}

output "stream_id" {
  description = "ID of the QLDB stream"
  value       = aws_qldb_stream.journal_stream.id
}
```

## Monitoring QLDB

```hcl
# Monitor journal storage size
resource "aws_cloudwatch_metric_alarm" "qldb_storage" {
  alarm_name          = "qldb-journal-storage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "JournalStorage"
  namespace           = "AWS/QLDB"
  period              = 86400  # Daily check
  statistic           = "Maximum"
  threshold           = 107374182400  # 100 GB
  alarm_description   = "QLDB journal storage exceeds 100 GB"

  dimensions = {
    LedgerName = aws_qldb_ledger.main.name
  }

  alarm_actions = [aws_sns_topic.qldb_alerts.arn]
}

resource "aws_sns_topic" "qldb_alerts" {
  name = "qldb-alerts"
}
```

For comprehensive monitoring of your ledger databases, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you track transaction rates, storage growth, and stream lag.

## Best Practices

Use STANDARD permissions mode for production ledgers to enable fine-grained access control. Always enable deletion protection on production ledgers. Use customer-managed KMS keys for sensitive data. Set up QLDB Streams to replicate journal data for analytics and disaster recovery. Create separate ledgers for different business domains to maintain clear boundaries. Use the journal export feature for long-term archival. Verify the cryptographic digest periodically to ensure data integrity.

## Conclusion

Amazon QLDB provides an immutable, cryptographically verifiable ledger database that is ideal for applications requiring an authoritative system of record. With Terraform, you can define your ledgers, streams, and access policies as code, ensuring consistent and repeatable deployments. Whether you are building financial systems, supply chain tracking, or audit logs, QLDB with Terraform gives you a trustworthy foundation for your data.
