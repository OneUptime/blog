# How to Create Log Aggregation Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Logging, Infrastructure as Code, Observability, AWS, CloudWatch

Description: Learn how to build a complete log aggregation infrastructure using Terraform, including centralized logging with CloudWatch, Elasticsearch, and S3 storage.

---

Log aggregation is a critical component of any observability strategy. When you have dozens or hundreds of services running across multiple environments, collecting and centralizing logs becomes essential for debugging, auditing, and monitoring. Terraform provides a powerful way to define and deploy your entire log aggregation infrastructure as code, ensuring consistency and repeatability across environments.

In this guide, we will walk through creating a complete log aggregation infrastructure using Terraform. We will cover centralized logging with AWS CloudWatch, log shipping to Elasticsearch, and long-term storage in S3.

## Why Use Terraform for Log Aggregation Infrastructure

Managing log aggregation manually is error-prone and difficult to scale. With Terraform, you get several advantages. First, your entire logging infrastructure is version-controlled, so you can track changes over time. Second, you can replicate your logging setup across multiple environments with minimal effort. Third, Terraform handles dependencies between resources automatically, ensuring everything is created in the right order.

## Setting Up the Terraform Configuration

Start by defining your provider and backend configuration:

```hcl
# main.tf - Configure the AWS provider and backend
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Store state remotely for team collaboration
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "log-aggregation/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Creating CloudWatch Log Groups

CloudWatch Log Groups are the foundation of AWS log aggregation. Create log groups for each of your services:

```hcl
# variables.tf - Define input variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "services" {
  description = "List of services that generate logs"
  type        = list(string)
  default     = ["api-gateway", "user-service", "payment-service", "notification-service"]
}

variable "log_retention_days" {
  description = "Number of days to retain logs in CloudWatch"
  type        = number
  default     = 30
}

# cloudwatch.tf - Create log groups for each service
resource "aws_cloudwatch_log_group" "service_logs" {
  for_each = toset(var.services)

  # Name follows a consistent pattern for easy discovery
  name              = "/app/${var.environment}/${each.value}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
    Service     = each.value
    ManagedBy   = "terraform"
  }
}
```

## Setting Up S3 for Long-Term Log Storage

For cost-effective long-term storage, ship logs to S3 with lifecycle policies:

```hcl
# s3.tf - Create an S3 bucket for long-term log storage
resource "aws_s3_bucket" "log_archive" {
  bucket = "logs-archive-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
    Purpose     = "log-archive"
    ManagedBy   = "terraform"
  }
}

# Enable versioning for audit compliance
resource "aws_s3_bucket_versioning" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rules to move old logs to cheaper storage tiers
resource "aws_s3_bucket_lifecycle_configuration" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    # Move to Infrequent Access after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete after 365 days
    expiration {
      days = 365
    }
  }
}

# Block all public access to the log bucket
resource "aws_s3_bucket_public_access_block" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Get the current AWS account ID
data "aws_caller_identity" "current" {}
```

## Creating a CloudWatch to S3 Export Pipeline

Set up a subscription filter to stream logs from CloudWatch to Kinesis Firehose, which delivers them to S3:

```hcl
# firehose.tf - Create Kinesis Firehose delivery stream
resource "aws_kinesis_firehose_delivery_stream" "log_delivery" {
  name        = "log-delivery-${var.environment}"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose_role.arn
    bucket_arn = aws_s3_bucket.log_archive.arn

    # Organize logs by date prefix
    prefix              = "logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "errors/!{firehose:error-output-type}/year=!{timestamp:yyyy}/"

    # Buffer settings for efficient delivery
    buffering_size     = 64
    buffering_interval = 300

    # Compress logs to reduce storage costs
    compression_format = "GZIP"
  }
}

# IAM role for Firehose to access S3
resource "aws_iam_role" "firehose_role" {
  name = "firehose-log-delivery-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "firehose.amazonaws.com"
      }
    }]
  })
}

# Policy allowing Firehose to write to S3
resource "aws_iam_role_policy" "firehose_s3" {
  name = "firehose-s3-access"
  role = aws_iam_role.firehose_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.log_archive.arn,
        "${aws_s3_bucket.log_archive.arn}/*"
      ]
    }]
  })
}
```

## Setting Up CloudWatch Subscription Filters

Create subscription filters to route logs from CloudWatch to the Firehose delivery stream:

```hcl
# subscription.tf - Create subscription filters for each service
resource "aws_cloudwatch_log_subscription_filter" "log_filter" {
  for_each = toset(var.services)

  name            = "${each.value}-to-firehose"
  log_group_name  = aws_cloudwatch_log_group.service_logs[each.value].name
  filter_pattern  = ""  # Empty pattern captures all logs
  destination_arn = aws_kinesis_firehose_delivery_stream.log_delivery.arn
  role_arn        = aws_iam_role.cloudwatch_to_firehose.arn
}

# IAM role for CloudWatch to push to Firehose
resource "aws_iam_role" "cloudwatch_to_firehose" {
  name = "cloudwatch-to-firehose-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "logs.${var.aws_region}.amazonaws.com"
      }
    }]
  })
}
```

## Creating CloudWatch Metric Filters and Alarms

Set up metric filters to detect error patterns and trigger alerts:

```hcl
# alarms.tf - Create metric filters and alarms for error detection
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  for_each = toset(var.services)

  name           = "${each.value}-error-count"
  log_group_name = aws_cloudwatch_log_group.service_logs[each.value].name
  pattern        = "ERROR"

  metric_transformation {
    name      = "${each.value}-errors"
    namespace = "CustomLogs/${var.environment}"
    value     = "1"
  }
}

# Alarm when error rate exceeds threshold
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  for_each = toset(var.services)

  alarm_name          = "${each.value}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "${each.value}-errors"
  namespace           = "CustomLogs/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Error rate for ${each.value} exceeds threshold"

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# SNS topic for alert notifications
resource "aws_sns_topic" "alerts" {
  name = "log-alerts-${var.environment}"
}
```

## Outputs for Reference

Define outputs to make it easy to reference your logging resources:

```hcl
# outputs.tf - Export useful resource identifiers
output "log_group_names" {
  description = "Map of service names to CloudWatch log group names"
  value       = { for k, v in aws_cloudwatch_log_group.service_logs : k => v.name }
}

output "log_archive_bucket" {
  description = "S3 bucket name for log archives"
  value       = aws_s3_bucket.log_archive.id
}

output "firehose_stream_name" {
  description = "Kinesis Firehose delivery stream name"
  value       = aws_kinesis_firehose_delivery_stream.log_delivery.name
}
```

## Deploying the Infrastructure

With all your Terraform files in place, deploy the infrastructure:

```bash
# Initialize Terraform and download providers
terraform init

# Preview the changes
terraform plan -out=tfplan

# Apply the changes
terraform apply tfplan
```

## Best Practices for Log Aggregation with Terraform

When building log aggregation infrastructure with Terraform, keep these best practices in mind. Use consistent naming conventions across all log groups to make them easy to search and filter. Set appropriate retention periods based on your compliance requirements and budget. Enable encryption at rest for all log storage using AWS KMS keys. Use Terraform modules to encapsulate your logging patterns so they can be reused across projects.

Consider integrating your log aggregation setup with a monitoring platform like [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-infrastructure-health-dashboards-with-terraform/view) to get a unified view of your infrastructure health alongside your logs.

## Conclusion

Building log aggregation infrastructure with Terraform gives you a repeatable, version-controlled approach to managing your logging pipeline. By combining CloudWatch, Kinesis Firehose, and S3, you create a robust system that handles real-time log analysis and long-term storage. The key is to start with a solid foundation and iterate as your logging needs grow. With the patterns shown in this guide, you can scale your log aggregation to handle any number of services and environments.
