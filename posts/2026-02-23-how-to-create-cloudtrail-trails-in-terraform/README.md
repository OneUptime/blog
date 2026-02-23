# How to Create CloudTrail Trails in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudTrail, Security, Auditing, Compliance, Infrastructure as Code

Description: Learn how to create and configure AWS CloudTrail trails with Terraform for API activity logging, compliance auditing, and security monitoring across your AWS accounts.

---

AWS CloudTrail records API calls and events across your AWS account. Every time someone creates an EC2 instance, modifies a security group, or accesses an S3 object, CloudTrail captures that activity. This audit trail is essential for security investigations, compliance requirements, and understanding who changed what in your infrastructure.

Managing CloudTrail with Terraform ensures your logging configuration is consistent, version-controlled, and applied uniformly across all accounts in your organization. This guide walks through creating trails, configuring S3 storage, setting up CloudWatch integration, and enabling advanced features like data events and organization trails.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with CloudTrail, S3, CloudWatch, and KMS permissions
- For organization trails: management account access

## Provider Configuration

```hcl
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

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
```

## S3 Bucket for Trail Logs

CloudTrail needs an S3 bucket to store log files. The bucket policy must allow CloudTrail to write to it:

```hcl
# S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "cloudtrail-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose     = "cloudtrail-logging"
    Environment = "security"
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning for log integrity
resource "aws_s3_bucket_versioning" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rules to manage log retention
resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete after 365 days (adjust based on compliance needs)
    expiration {
      days = 365
    }
  }
}

# Bucket policy allowing CloudTrail to write logs
resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}
```

## KMS Key for Log Encryption

Encrypting CloudTrail logs with a customer-managed KMS key gives you control over who can decrypt them:

```hcl
# KMS key for encrypting CloudTrail logs
resource "aws_kms_key" "cloudtrail" {
  description             = "KMS key for CloudTrail log encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow root account full access
        Sid    = "EnableRootAccountPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        # Allow CloudTrail to encrypt logs
        Sid    = "AllowCloudTrailEncrypt"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        # Allow log decryption by authorized users
        Sid    = "AllowLogDecryption"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "kms:Decrypt",
          "kms:ReEncryptFrom"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  tags = {
    Purpose = "cloudtrail-encryption"
  }
}

resource "aws_kms_alias" "cloudtrail" {
  name          = "alias/cloudtrail"
  target_key_id = aws_kms_key.cloudtrail.key_id
}
```

## Creating a Basic Trail

```hcl
# CloudTrail trail with encryption and validation
resource "aws_cloudtrail" "main" {
  name = "main-trail"

  # S3 bucket for log storage
  s3_bucket_name = aws_s3_bucket.cloudtrail.id

  # Optional S3 key prefix to organize logs
  s3_key_prefix = "cloudtrail"

  # Encrypt logs with KMS
  kms_key_id = aws_kms_key.cloudtrail.arn

  # Record events in all regions
  is_multi_region_trail = true

  # Enable log file integrity validation
  enable_log_file_validation = true

  # Include global service events (IAM, STS, CloudFront)
  include_global_service_events = true

  # Enable logging on creation
  enable_logging = true

  tags = {
    Environment = "production"
    Purpose     = "security-auditing"
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}
```

## CloudWatch Integration

Send CloudTrail events to CloudWatch Logs for real-time monitoring and alerting:

```hcl
# CloudWatch log group for CloudTrail
resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/main"
  retention_in_days = 90

  tags = {
    Service = "cloudtrail"
  }
}

# IAM role for CloudTrail to write to CloudWatch
resource "aws_iam_role" "cloudtrail_cloudwatch" {
  name = "cloudtrail-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "cloudtrail_cloudwatch" {
  name = "cloudtrail-cloudwatch-policy"
  role = aws_iam_role.cloudtrail_cloudwatch.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
      }
    ]
  })
}

# Updated trail with CloudWatch integration
resource "aws_cloudtrail" "main_with_cloudwatch" {
  name                          = "main-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  s3_key_prefix                 = "cloudtrail"
  kms_key_id                    = aws_kms_key.cloudtrail.arn
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true
  enable_logging                = true

  # CloudWatch Logs integration
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch.arn

  tags = {
    Environment = "production"
    Purpose     = "security-auditing"
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}
```

## Enabling Data Events

Data events capture object-level activity in S3 and invocation-level activity in Lambda:

```hcl
# Trail with S3 data events for a specific bucket
resource "aws_cloudtrail" "data_events" {
  name                          = "data-events-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true

  # Log S3 object-level operations on specific buckets
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::sensitive-data-bucket/"]
    }
  }

  # Log all Lambda function invocations
  event_selector {
    read_write_type           = "All"
    include_management_events = false

    data_resource {
      type   = "AWS::Lambda::Function"
      values = ["arn:aws:lambda"]
    }
  }

  tags = {
    Purpose = "data-event-auditing"
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}
```

## Security Alerts with CloudWatch Metric Filters

Create alerts for suspicious activity detected in CloudTrail logs:

```hcl
# Metric filter for unauthorized API calls
resource "aws_cloudwatch_log_metric_filter" "unauthorized_api_calls" {
  name           = "unauthorized-api-calls"
  pattern        = "{ ($.errorCode = \"*UnauthorizedAccess\") || ($.errorCode = \"AccessDenied*\") }"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  metric_transformation {
    name      = "UnauthorizedAPICalls"
    namespace = "CloudTrailMetrics"
    value     = "1"
  }
}

# Alarm for too many unauthorized calls
resource "aws_cloudwatch_metric_alarm" "unauthorized_api_calls" {
  alarm_name          = "unauthorized-api-calls"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnauthorizedAPICalls"
  namespace           = "CloudTrailMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when unauthorized API calls exceed threshold"
  alarm_actions       = [var.sns_topic_arn]

  tags = {
    Purpose = "security"
  }
}

# Metric filter for root account usage
resource "aws_cloudwatch_log_metric_filter" "root_account_usage" {
  name           = "root-account-usage"
  pattern        = "{ $.userIdentity.type = \"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != \"AwsServiceEvent\" }"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  metric_transformation {
    name      = "RootAccountUsage"
    namespace = "CloudTrailMetrics"
    value     = "1"
  }
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for security alerts"
  type        = string
  default     = ""
}
```

## Monitoring and Incident Response

CloudTrail tells you what happened, but you also need to know when things go wrong in real time. Integrate your infrastructure monitoring with OneUptime to correlate CloudTrail events with application performance issues. When an outage happens, having both the audit trail and monitoring data in one place speeds up root cause analysis significantly.

For cost tracking of your CloudTrail storage, see our guide on budget alerts at https://oneuptime.com/blog/post/2026-02-23-how-to-create-budget-alerts-in-terraform/view.

## Outputs

```hcl
output "trail_arn" {
  description = "ARN of the CloudTrail trail"
  value       = aws_cloudtrail.main.arn
}

output "log_bucket" {
  description = "S3 bucket storing CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail.id
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for CloudTrail"
  value       = aws_cloudwatch_log_group.cloudtrail.name
}
```

## Summary

CloudTrail is a non-negotiable component of any serious AWS deployment. By managing it through Terraform, you ensure that logging is enabled from day one and configured consistently across all your accounts. The combination of S3 storage for long-term retention, KMS encryption for security, and CloudWatch integration for real-time alerting gives you a complete audit and monitoring solution.
