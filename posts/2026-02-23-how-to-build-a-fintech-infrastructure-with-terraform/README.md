# How to Build a FinTech Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, FinTech, Security, Compliance, AWS, Financial Services

Description: Learn how to build secure FinTech infrastructure with Terraform including encryption at rest and in transit, audit logging, fraud detection, transaction processing, and regulatory compliance.

---

Financial technology infrastructure has higher requirements than almost any other domain. Every transaction must be recorded immutably. Data must be encrypted everywhere. Access must be tightly controlled and audited. Regulatory requirements like PCI DSS, SOX, and banking regulations add additional constraints. Terraform lets you encode all of these requirements as infrastructure code so nothing gets missed.

## Why Terraform for FinTech?

When regulators ask "how do you ensure all data is encrypted?", you want to point to Terraform code that makes it impossible to create unencrypted resources. When auditors ask about access controls, you show them the IAM policies in your repository. Infrastructure as code turns compliance from a manual checklist into an automated guarantee.

## Architecture Overview

Our FinTech infrastructure includes:

- VPC with strict network segmentation
- KMS for encryption key management
- Aurora with encryption and audit logging
- SQS FIFO queues for ordered transaction processing
- WAF for API protection
- CloudTrail and Config for compliance auditing
- Secrets Manager for credential rotation
- GuardDuty for threat detection

## Network Segmentation

Financial infrastructure needs strict network isolation between tiers.

```hcl
# VPC with dedicated subnets for each tier
resource "aws_vpc" "fintech" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "fintech-${var.environment}"
    Compliance  = "PCI-DSS"
  }
}

# Public subnets - only for load balancers
resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.fintech.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "public-${count.index}"
    Tier = "public"
  }
}

# Application subnets - for compute
resource "aws_subnet" "application" {
  count             = 3
  vpc_id            = aws_vpc.fintech.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "application-${count.index}"
    Tier = "application"
  }
}

# Data subnets - for databases (most restricted)
resource "aws_subnet" "data" {
  count             = 3
  vpc_id            = aws_vpc.fintech.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "data-${count.index}"
    Tier = "data"
  }
}

# Security groups with least-privilege access
resource "aws_security_group" "alb" {
  name        = "fintech-alb"
  description = "ALB security group - HTTPS only"
  vpc_id      = aws_vpc.fintech.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

resource "aws_security_group" "app" {
  name        = "fintech-app"
  description = "Application tier - only from ALB"
  vpc_id      = aws_vpc.fintech.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
  }

  egress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis.id]
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # For AWS API calls
  }
}

resource "aws_security_group" "database" {
  name        = "fintech-database"
  description = "Database tier - only from app tier"
  vpc_id      = aws_vpc.fintech.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # No egress needed for database tier
}

# VPC Flow Logs for network audit
resource "aws_flow_log" "main" {
  vpc_id                   = aws_vpc.fintech.id
  traffic_type             = "ALL"
  iam_role_arn             = aws_iam_role.flow_log.arn
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  max_aggregation_interval = 60

  tags = {
    Purpose = "network-audit"
  }
}
```

## Encryption Key Management

All FinTech data needs encryption with managed key rotation.

```hcl
# KMS key for database encryption
resource "aws_kms_key" "database" {
  description             = "Database encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = data.aws_iam_policy_document.kms_database.json

  tags = {
    Purpose    = "database-encryption"
    Compliance = "PCI-DSS"
  }
}

# KMS key for application-level encryption (tokenization, PII)
resource "aws_kms_key" "application" {
  description             = "Application data encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Purpose    = "application-encryption"
    Compliance = "PCI-DSS"
  }
}

# KMS key for audit log encryption
resource "aws_kms_key" "audit" {
  description             = "Audit log encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Purpose = "audit-encryption"
  }
}

# Secrets Manager for credential rotation
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "fintech/database/credentials"
  kms_key_id              = aws_kms_key.application.id
  recovery_window_in_days = 30

  tags = {
    Purpose = "database-credentials"
  }
}

resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

## Transaction Database

Aurora PostgreSQL with full audit logging and encryption.

```hcl
# Aurora cluster for financial transactions
resource "aws_rds_cluster" "fintech" {
  cluster_identifier      = "fintech-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "fintech"
  master_username         = "admin"
  master_password         = var.db_password
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.database.arn
  deletion_protection     = true
  backup_retention_period = 35
  copy_tags_to_snapshot   = true

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.fintech.name

  # Enable PostgreSQL audit logging
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Cluster parameter group with audit logging
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.audit.name

  tags = {
    Compliance = "PCI-DSS"
  }
}

resource "aws_rds_cluster_parameter_group" "audit" {
  name   = "fintech-audit-params"
  family = "aurora-postgresql15"

  # Enable pgAudit for comprehensive audit logging
  parameter {
    name  = "shared_preload_libraries"
    value = "pgaudit"
  }

  parameter {
    name  = "pgaudit.log"
    value = "all"
  }

  parameter {
    name  = "pgaudit.role"
    value = "rds_pgaudit"
  }

  parameter {
    name  = "log_statement"
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
}
```

## Transaction Processing Queue

FIFO queues ensure transactions are processed in order exactly once.

```hcl
# FIFO queue for ordered transaction processing
resource "aws_sqs_queue" "transactions" {
  name                        = "transaction-processing.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 120
  message_retention_seconds   = 86400
  receive_wait_time_seconds   = 20
  sqs_managed_sse_enabled     = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.transactions_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Purpose = "transaction-processing"
  }
}

resource "aws_sqs_queue" "transactions_dlq" {
  name                        = "transaction-processing-dlq.fifo"
  fifo_queue                  = true
  message_retention_seconds   = 1209600  # 14 days
  sqs_managed_sse_enabled     = true
}
```

## WAF Protection

Protect financial APIs from common attack patterns.

```hcl
# WAF for financial API protection
resource "aws_wafv2_web_acl" "fintech" {
  name  = "fintech-api-protection"
  scope = "REGIONAL"

  default_action { allow {} }

  # Rate limiting
  rule {
    name     = "rate-limit"
    priority = 1
    action { block {} }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "fintech-rate-limit"
    }
  }

  # SQL injection protection
  rule {
    name     = "sql-injection"
    priority = 2
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "sql-injection"
    }
  }

  # Known bad inputs
  rule {
    name     = "known-bad-inputs"
    priority = 3
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "known-bad-inputs"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "fintech-waf"
  }
}
```

## Compliance Monitoring

Continuous compliance checks for financial regulations.

```hcl
# GuardDuty for threat detection
resource "aws_guardduty_detector" "fintech" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"
}

# CloudTrail with tamper-proof logging
resource "aws_cloudtrail" "fintech" {
  name                       = "fintech-audit-trail"
  s3_bucket_name             = aws_s3_bucket.audit_logs.id
  is_multi_region_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = aws_kms_key.audit.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }
}

# Alarm for DLQ messages (failed transactions)
resource "aws_cloudwatch_metric_alarm" "transaction_failures" {
  alarm_name          = "transaction-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Failed transactions detected"
  alarm_actions       = [aws_sns_topic.critical.arn]

  dimensions = {
    QueueName = aws_sqs_queue.transactions_dlq.name
  }
}

resource "aws_sns_topic" "critical" {
  name              = "fintech-critical-alerts"
  kms_master_key_id = aws_kms_key.audit.id
}
```

## Wrapping Up

FinTech infrastructure demands defense in depth. Network segmentation isolates tiers. KMS encrypts everything. Audit logging captures every action. FIFO queues guarantee transaction ordering. WAF protects the API surface. And continuous compliance monitoring catches any drift.

Terraform makes this manageable by codifying every security control. When you need to prove to a regulator that all databases are encrypted, you point to the Terraform configuration. When you need to show audit trails, you point to the CloudTrail setup. The infrastructure code is the compliance documentation.

For monitoring your financial infrastructure with real-time alerting on transaction failures and security events, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-fintech-infrastructure-with-terraform/view) for FinTech-grade observability.
