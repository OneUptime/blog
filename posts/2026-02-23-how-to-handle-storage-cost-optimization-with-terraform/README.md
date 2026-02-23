# How to Handle Storage Cost Optimization with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Storage, Cost Optimization, S3, EBS, Cloud Storage, Infrastructure as Code

Description: Learn how to optimize cloud storage costs with Terraform by implementing tiered storage, compression, deduplication, and automated cleanup policies.

---

Storage costs are one of the fastest-growing line items in cloud budgets. Data tends to accumulate over time, and without deliberate management, organizations end up paying premium prices for data that could be stored more cheaply or deleted entirely. Terraform gives you the tools to implement storage cost optimization as code, making your savings repeatable and auditable.

This guide covers practical strategies for reducing storage costs across AWS services using Terraform configurations you can adapt for your own infrastructure.

## Understanding Storage Cost Drivers

Before optimizing, you need to understand what drives storage costs. The main factors include storage class selection, data transfer fees, request costs, and the sheer volume of data being stored. Many organizations store everything in the default high-performance tier when only a fraction of their data actually needs fast access.

## Optimizing S3 Storage with Intelligent Tiering

S3 Intelligent-Tiering automatically moves data between access tiers based on usage patterns. This is ideal for data with unpredictable access patterns.

```hcl
# S3 bucket with intelligent tiering for cost optimization
resource "aws_s3_bucket" "optimized_storage" {
  bucket = "company-optimized-storage-${var.environment}"
}

# Enable intelligent tiering configuration
resource "aws_s3_bucket_intelligent_tiering_configuration" "auto_tier" {
  bucket = aws_s3_bucket.optimized_storage.id
  name   = "AutoTierConfiguration"

  # Move to deep archive access after 180 days of no access
  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  # Move to archive access after 90 days of no access
  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }

  # Optional filter to apply only to specific prefixes
  filter {
    prefix = "data/"
  }
}

# Lifecycle rules for additional optimization
resource "aws_s3_bucket_lifecycle_configuration" "storage_lifecycle" {
  bucket = aws_s3_bucket.optimized_storage.id

  # Move old versions to cheaper storage
  rule {
    id     = "version-management"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }

    # Delete old versions after 90 days
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  # Clean up incomplete multipart uploads
  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
```

## Right-Sizing EBS Volumes

EBS volumes are frequently over-provisioned. Teams request large volumes during initial setup and never resize them down, even when usage is low.

```hcl
# Variables for flexible EBS configuration
variable "ebs_volumes" {
  description = "Map of EBS volume configurations"
  type = map(object({
    size        = number
    type        = string
    iops        = optional(number)
    throughput  = optional(number)
    encrypted   = bool
  }))
  default = {
    # Use gp3 instead of gp2 for better price-performance
    app_data = {
      size      = 50
      type      = "gp3"
      iops      = 3000
      throughput = 125
      encrypted = true
    }
    # Use st1 for sequential throughput workloads (much cheaper)
    logs = {
      size      = 500
      type      = "st1"
      encrypted = true
    }
    # Use sc1 for cold data (cheapest option)
    archive = {
      size      = 1000
      type      = "sc1"
      encrypted = true
    }
  }
}

# Create optimized EBS volumes based on workload type
resource "aws_ebs_volume" "optimized" {
  for_each = var.ebs_volumes

  availability_zone = var.availability_zone
  size              = each.value.size
  type              = each.value.type
  iops              = each.value.iops
  throughput        = each.value.throughput
  encrypted         = each.value.encrypted

  tags = {
    Name        = "${var.environment}-${each.key}"
    Environment = var.environment
    VolumeType  = each.key
    ManagedBy   = "terraform"
  }
}
```

## Implementing S3 Storage Lens for Visibility

Before you can optimize storage, you need visibility into how it is being used. S3 Storage Lens provides analytics across your entire S3 footprint.

```hcl
# S3 Storage Lens configuration for cost visibility
resource "aws_s3control_storage_lens_configuration" "cost_visibility" {
  config_id = "organization-storage-lens"

  storage_lens_configuration {
    enabled = true

    # Include all accounts and buckets
    account_level {
      # Track activity metrics
      activity_metrics {
        enabled = true
      }

      # Bucket-level metrics
      bucket_level {
        activity_metrics {
          enabled = true
        }

        # Track prefix-level metrics for top prefixes
        prefix_level {
          storage_metrics {
            enabled = true
            selection_criteria {
              max_depth        = 3
              min_storage_bytes_percentage = 1.0
            }
          }
        }
      }
    }

    # Publish metrics to CloudWatch for alerting
    data_export {
      cloud_watch_metrics {
        enabled = true
      }

      # Export detailed reports to S3
      s3_bucket_destination {
        account_id            = var.account_id
        arn                   = aws_s3_bucket.analytics.arn
        format                = "CSV"
        output_schema_version = "V_1"
        prefix                = "storage-lens/"

        encryption {
          sse_s3 {}
        }
      }
    }
  }
}
```

## Cleaning Up Unused EBS Volumes

Unattached EBS volumes are a common source of waste. You can use Terraform to set up automated detection and cleanup.

```hcl
# Lambda function to find and report unattached EBS volumes
resource "aws_lambda_function" "ebs_cleanup" {
  filename         = data.archive_file.ebs_cleanup_zip.output_path
  function_name    = "ebs-volume-cleanup"
  role             = aws_iam_role.ebs_cleanup_role.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 120
  source_code_hash = data.archive_file.ebs_cleanup_zip.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN     = aws_sns_topic.storage_alerts.arn
      MIN_AGE_DAYS      = "7"
      DRY_RUN           = var.dry_run_mode ? "true" : "false"
      SNAPSHOT_BEFORE_DELETE = "true"
    }
  }
}

# Schedule weekly cleanup checks
resource "aws_cloudwatch_event_rule" "weekly_ebs_check" {
  name                = "weekly-ebs-cleanup-check"
  description         = "Check for unattached EBS volumes weekly"
  schedule_expression = "cron(0 8 ? * MON *)"
}

resource "aws_cloudwatch_event_target" "ebs_cleanup" {
  rule      = aws_cloudwatch_event_rule.weekly_ebs_check.name
  target_id = "EBSCleanup"
  arn       = aws_lambda_function.ebs_cleanup.arn
}

# SNS topic for storage alerts
resource "aws_sns_topic" "storage_alerts" {
  name = "storage-cost-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "storage_email" {
  topic_arn = aws_sns_topic.storage_alerts.arn
  protocol  = "email"
  endpoint  = var.storage_alert_email
}
```

## Optimizing EFS Storage

Amazon EFS supports lifecycle management that moves infrequently accessed files to a lower-cost storage class automatically.

```hcl
# EFS file system with lifecycle optimization
resource "aws_efs_file_system" "optimized" {
  creation_token = "optimized-efs-${var.environment}"

  # Use bursting throughput mode for cost savings
  throughput_mode = "bursting"

  # Enable lifecycle management
  lifecycle_policy {
    transition_to_ia = "AFTER_14_DAYS"
  }

  # Also transition back to standard when accessed
  lifecycle_policy {
    transition_to_primary_storage_class = "AFTER_1_ACCESS"
  }

  # Use One Zone for non-critical data (47% cheaper)
  availability_zone_name = var.single_az ? var.availability_zone : null

  encrypted = true

  tags = {
    Name        = "optimized-efs-${var.environment}"
    Environment = var.environment
    CostCenter  = var.cost_center
  }
}
```

## Storage Cost Monitoring with CloudWatch

Set up CloudWatch alarms to catch storage cost spikes before they become expensive.

```hcl
# CloudWatch alarm for S3 bucket size
resource "aws_cloudwatch_metric_alarm" "s3_size_alarm" {
  alarm_name          = "s3-bucket-size-${var.bucket_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = 86400
  statistic           = "Average"
  threshold           = var.max_bucket_size_bytes
  alarm_description   = "S3 bucket size exceeds threshold"
  alarm_actions       = [aws_sns_topic.storage_alerts.arn]

  dimensions = {
    BucketName  = var.bucket_name
    StorageType = "StandardStorage"
  }
}

# Budget alarm for overall storage spend
resource "aws_budgets_budget" "storage_budget" {
  name              = "storage-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_storage_budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  cost_filter {
    name   = "Service"
    values = [
      "Amazon Simple Storage Service",
      "Amazon Elastic Block Store",
      "Amazon Elastic File System"
    ]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.storage_alert_email]
  }
}
```

## Best Practices for Storage Cost Optimization

When optimizing storage costs with Terraform, follow these key principles. Always choose the right storage class for your workload. Standard storage is often used by default when cheaper alternatives would work just as well. Review your storage types quarterly and adjust as access patterns change.

Enable versioning only where it is truly needed, and set expiration policies for old versions. Implement compression at the application layer before storing data. Use server-side encryption with AWS-managed keys to avoid additional KMS costs where full key control is not required.

For a broader view of cost management strategies, see our guide on [creating resource lifecycle policies for cost with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-resource-lifecycle-policies-for-cost-with-terraform/view) and [monitoring cloud spend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-cloud-spend-with-terraform/view).

## Conclusion

Storage cost optimization is a continuous process that benefits enormously from automation through Terraform. By codifying your storage policies, you ensure they are applied consistently across all environments and accounts. Start with the quick wins like intelligent tiering and unused volume cleanup, then progressively implement more sophisticated strategies like cross-tier lifecycle management and automated right-sizing. The key is to make cost-efficient storage the default rather than the exception.
