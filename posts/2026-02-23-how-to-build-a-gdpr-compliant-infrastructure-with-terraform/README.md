# How to Build a GDPR Compliant Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GDPR, Compliance, Infrastructure as Code, AWS, Data Privacy

Description: Learn how to build a GDPR compliant cloud infrastructure using Terraform with encryption, access controls, audit logging, and data residency enforcement.

---

Building infrastructure that meets GDPR requirements is not just a legal obligation for companies handling EU citizen data - it is a fundamental trust exercise. Terraform gives you the ability to codify compliance rules so that every environment you spin up is compliant from the start, rather than having to retrofit security controls after deployment.

In this guide, we will walk through building a GDPR compliant infrastructure on AWS using Terraform. The approach covers data residency, encryption at rest and in transit, access controls, audit logging, and data lifecycle management.

## Understanding GDPR Infrastructure Requirements

GDPR has several technical requirements that directly impact infrastructure design:

- Data must be stored in approved regions (typically EU)
- Data must be encrypted at rest and in transit
- Access to personal data must be logged and auditable
- You need the ability to delete personal data on request (right to erasure)
- Data processing must have clear boundaries and controls

Let's translate each of these into Terraform configurations.

## Setting Up the Provider with Region Restrictions

The first step is making sure all resources get created in EU regions only.

```hcl
# providers.tf - Lock down to EU regions only
provider "aws" {
  region = var.aws_region

  # Enforce that only EU regions can be used
  allowed_account_ids = [var.account_id]

  default_tags {
    tags = {
      Environment   = var.environment
      Compliance    = "GDPR"
      DataResidency = "EU"
      ManagedBy     = "Terraform"
    }
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region - must be an EU region for GDPR compliance"

  validation {
    condition = contains([
      "eu-west-1",      # Ireland
      "eu-west-2",      # London
      "eu-west-3",      # Paris
      "eu-central-1",   # Frankfurt
      "eu-north-1",     # Stockholm
      "eu-south-1",     # Milan
    ], var.aws_region)
    error_message = "Region must be an EU region for GDPR compliance."
  }
}
```

## Encrypted Storage with KMS

All personal data must be encrypted. We will create a KMS key specifically for GDPR-related data and apply it across our storage resources.

```hcl
# kms.tf - Customer managed encryption keys
resource "aws_kms_key" "gdpr_data" {
  description             = "KMS key for encrypting GDPR-protected personal data"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  # Policy that restricts key usage to specific roles
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowKeyAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.account_id}:role/KeyAdministrator"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowDataProcessing"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.account_id}:role/DataProcessor"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Purpose = "GDPR-PersonalData"
  }
}

resource "aws_kms_alias" "gdpr_data" {
  name          = "alias/gdpr-personal-data"
  target_key_id = aws_kms_key.gdpr_data.key_id
}
```

## Database with Encryption and Access Controls

For storing personal data, we need an encrypted database with strict access controls.

```hcl
# database.tf - Encrypted RDS instance for personal data
resource "aws_db_subnet_group" "gdpr" {
  name       = "gdpr-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "GDPR Database Subnet Group"
  }
}

resource "aws_db_instance" "personal_data" {
  identifier = "gdpr-personal-data"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500

  # Encryption at rest using our GDPR KMS key
  storage_encrypted = true
  kms_key_id        = aws_kms_key.gdpr_data.arn

  # Network isolation
  db_subnet_group_name   = aws_db_subnet_group.gdpr.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Backup configuration for data recovery
  backup_retention_period = 35
  backup_window           = "03:00-04:00"

  # Enable deletion protection
  deletion_protection = true

  # Enable enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Enable audit logging
  enabled_cloudwatch_logs_exports = [
    "postgresql",
    "upgrade"
  ]

  tags = {
    DataClassification = "PersonalData"
    GDPRScope          = "true"
  }
}
```

## S3 Buckets with Lifecycle Policies

GDPR requires data retention limits. S3 lifecycle policies help enforce automatic deletion after the retention period expires.

```hcl
# storage.tf - S3 bucket with GDPR lifecycle policies
resource "aws_s3_bucket" "personal_data" {
  bucket = "${var.project_name}-personal-data-${var.environment}"

  tags = {
    DataClassification = "PersonalData"
    GDPRScope          = "true"
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "personal_data" {
  bucket = aws_s3_bucket.personal_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption with our GDPR KMS key
resource "aws_s3_bucket_server_side_encryption_configuration" "personal_data" {
  bucket = aws_s3_bucket.personal_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.gdpr_data.arn
    }
    bucket_key_enabled = true
  }
}

# Enforce data retention - auto-delete after retention period
resource "aws_s3_bucket_lifecycle_configuration" "personal_data" {
  bucket = aws_s3_bucket.personal_data.id

  rule {
    id     = "gdpr-data-retention"
    status = "Enabled"

    # Move to cheaper storage after 90 days
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    # Delete after the retention period
    expiration {
      days = var.data_retention_days # e.g., 365 days
    }
  }
}

# Enable versioning for audit trail
resource "aws_s3_bucket_versioning" "personal_data" {
  bucket = aws_s3_bucket.personal_data.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Audit Logging with CloudTrail

GDPR requires that you can demonstrate who accessed personal data and when. CloudTrail provides this audit trail.

```hcl
# audit.tf - CloudTrail for GDPR audit logging
resource "aws_cloudtrail" "gdpr_audit" {
  name                          = "gdpr-audit-trail"
  s3_bucket_name                = aws_s3_bucket.audit_logs.id
  include_global_service_events = true
  is_multi_region_trail         = false # Stay within EU region
  enable_log_file_validation    = true

  # Log data events for S3 buckets containing personal data
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.personal_data.arn}/"]
    }
  }

  # Send logs to CloudWatch for real-time alerting
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.gdpr_audit.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch.arn

  tags = {
    Purpose = "GDPR-AuditLogging"
  }
}

# Audit log bucket with its own retention policy
resource "aws_s3_bucket" "audit_logs" {
  bucket = "${var.project_name}-gdpr-audit-logs-${var.environment}"

  tags = {
    Purpose = "GDPR-AuditLogs"
  }
}

# Audit logs must be retained for compliance period
resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "audit-log-retention"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Keep audit logs for 7 years
    expiration {
      days = 2555
    }
  }
}
```

## VPC and Network Isolation

Personal data processing should happen within an isolated network segment.

```hcl
# network.tf - Isolated VPC for GDPR workloads
resource "aws_vpc" "gdpr" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name    = "gdpr-vpc"
    Purpose = "GDPR-DataProcessing"
  }
}

# Private subnets only - no public subnets for personal data
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.gdpr.id
  cidr_block        = cidrsubnet(aws_vpc.gdpr.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = false

  tags = {
    Name = "gdpr-private-${count.index}"
    Tier = "Private"
  }
}

# VPC Flow Logs for network audit trail
resource "aws_flow_log" "gdpr" {
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.gdpr.id

  tags = {
    Purpose = "GDPR-NetworkAudit"
  }
}
```

## Data Subject Access Request (DSAR) Support

Build infrastructure that supports the right to erasure and data portability.

```hcl
# dsar.tf - Lambda function for handling data subject requests
resource "aws_lambda_function" "dsar_handler" {
  filename         = "dsar_handler.zip"
  function_name    = "gdpr-dsar-handler"
  role             = aws_iam_role.dsar_handler.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 300

  # Encrypt environment variables
  kms_key_arn = aws_kms_key.gdpr_data.arn

  environment {
    variables = {
      DB_SECRET_ARN  = aws_secretsmanager_secret.db_credentials.arn
      S3_BUCKET      = aws_s3_bucket.personal_data.id
      AUDIT_LOG_GROUP = aws_cloudwatch_log_group.gdpr_audit.name
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = {
    Purpose = "GDPR-DSAR-Processing"
  }
}

# SQS queue for DSAR requests
resource "aws_sqs_queue" "dsar_requests" {
  name                       = "gdpr-dsar-requests"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 300

  # Encrypt messages in transit and at rest
  kms_master_key_id = aws_kms_key.gdpr_data.id

  tags = {
    Purpose = "GDPR-DSAR"
  }
}
```

## Monitoring and Alerting

Set up alerts for any compliance violations or suspicious access patterns.

```hcl
# monitoring.tf - Alerts for GDPR compliance
resource "aws_cloudwatch_metric_alarm" "unauthorized_access" {
  alarm_name          = "gdpr-unauthorized-access-attempt"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnauthorizedAccessAttempts"
  namespace           = "GDPR/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when unauthorized access to personal data is detected"

  alarm_actions = [aws_sns_topic.gdpr_alerts.arn]
}

resource "aws_sns_topic" "gdpr_alerts" {
  name              = "gdpr-compliance-alerts"
  kms_master_key_id = aws_kms_key.gdpr_data.id
}
```

## Putting It All Together

With these Terraform configurations, your infrastructure will enforce GDPR compliance at every layer:

1. **Region restrictions** prevent data from leaving the EU
2. **KMS encryption** protects data at rest across all storage services
3. **VPC isolation** keeps personal data processing in private networks
4. **CloudTrail auditing** logs every access to personal data
5. **Lifecycle policies** automatically enforce data retention limits
6. **DSAR infrastructure** supports right to erasure and portability

The key advantage of managing GDPR compliance through Terraform is repeatability. Every environment you create will have the same controls, and any drift from the compliant configuration will be caught during the next `terraform plan`.

For monitoring your GDPR compliant infrastructure, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) to keep track of your services and get alerted when something goes wrong.

Remember that GDPR compliance is not just about infrastructure. You will also need proper data processing agreements, privacy policies, and organizational measures. But having the infrastructure right from the start makes everything else much easier to build on top of.
