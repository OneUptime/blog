# How to Create Resource Lifecycle Policies for Cost with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Optimization, Lifecycle Policies, Cloud Cost Management, Infrastructure as Code

Description: Learn how to create resource lifecycle policies with Terraform to automate cost savings by managing resource expiration, cleanup, and retention schedules.

---

Managing cloud costs effectively requires more than just monitoring spend. You need automated policies that govern when resources are created, when they should be cleaned up, and how long they should be retained. Terraform provides powerful mechanisms for implementing resource lifecycle policies that can dramatically reduce your cloud bills.

In this guide, we will walk through practical approaches to creating lifecycle policies using Terraform that help you control costs across your cloud infrastructure.

## Understanding Resource Lifecycle Policies

Resource lifecycle policies define rules about how long resources should exist and what happens when they reach certain age thresholds. Without these policies, teams often forget about temporary resources, leaving them running indefinitely and accumulating unnecessary costs.

Common lifecycle scenarios include:

- Development environments that should be destroyed after business hours
- Test resources that should expire after a set number of days
- Old snapshots and backups that should be cleaned up automatically
- Unused storage volumes that should be flagged and removed

## Setting Up S3 Lifecycle Policies

One of the most impactful lifecycle policies you can create is for S3 storage. Moving data between storage tiers based on age can save significant money.

```hcl
# Define an S3 bucket with lifecycle rules for cost optimization
resource "aws_s3_bucket" "data_lake" {
  bucket = "company-data-lake-${var.environment}"
}

# Configure lifecycle rules to transition and expire objects
resource "aws_s3_bucket_lifecycle_configuration" "data_lake_lifecycle" {
  bucket = aws_s3_bucket.data_lake.id

  # Rule for log files - move to cheaper storage, then delete
  rule {
    id     = "log-lifecycle"
    status = "Enabled"

    filter {
      prefix = "logs/"
    }

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

  # Rule for temporary data - clean up quickly
  rule {
    id     = "temp-data-cleanup"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    # Delete temporary data after 7 days
    expiration {
      days = 7
    }
  }

  # Rule for incomplete multipart uploads
  rule {
    id     = "abort-incomplete-uploads"
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

## EBS Snapshot Lifecycle with Data Lifecycle Manager

AWS Data Lifecycle Manager automates the creation and deletion of EBS snapshots. This prevents snapshot sprawl, which is a common source of unexpected costs.

```hcl
# IAM role for Data Lifecycle Manager
resource "aws_iam_role" "dlm_role" {
  name = "dlm-lifecycle-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "dlm.amazonaws.com"
        }
      }
    ]
  })
}

# Attach the required policy to the DLM role
resource "aws_iam_role_policy_attachment" "dlm_policy" {
  role       = aws_iam_role.dlm_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

# Create a lifecycle policy for daily snapshots with retention
resource "aws_dlm_lifecycle_policy" "daily_snapshots" {
  description        = "Daily snapshot lifecycle policy"
  execution_role_arn = aws_iam_role.dlm_role.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    # Target volumes with specific tags
    target_tags = {
      Backup = "true"
    }

    schedule {
      name = "daily-snapshots"

      create_rule {
        # Run every 24 hours
        interval      = 24
        interval_unit = "HOURS"
        times         = ["03:00"]
      }

      retain_rule {
        # Keep only the last 14 snapshots
        count = 14
      }

      tags_to_add = {
        SnapshotType = "automated-daily"
        ManagedBy    = "terraform-dlm"
      }

      copy_tags = true
    }
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Implementing Time-Based Resource Expiration

For development and testing environments, you can implement time-based expiration using tags and scheduled cleanup scripts managed by Terraform.

```hcl
# Local variable to calculate expiration dates
locals {
  # Resources expire 7 days from creation
  expiration_date = timeadd(timestamp(), "168h")
}

# Create a dev EC2 instance with expiration metadata
resource "aws_instance" "dev_server" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    Name           = "dev-server-${var.developer_name}"
    Environment    = "development"
    ExpirationDate = local.expiration_date
    Owner          = var.developer_name
    AutoShutdown   = "true"
  }
}

# Lambda function to clean up expired resources
resource "aws_lambda_function" "resource_cleanup" {
  filename         = "cleanup_lambda.zip"
  function_name    = "expired-resource-cleanup"
  role             = aws_iam_role.cleanup_lambda_role.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      DRY_RUN = var.cleanup_dry_run ? "true" : "false"
    }
  }
}

# Schedule the cleanup function to run daily
resource "aws_cloudwatch_event_rule" "daily_cleanup" {
  name                = "daily-resource-cleanup"
  description         = "Triggers daily cleanup of expired resources"
  schedule_expression = "cron(0 6 * * ? *)"
}

resource "aws_cloudwatch_event_target" "cleanup_target" {
  rule      = aws_cloudwatch_event_rule.daily_cleanup.name
  target_id = "CleanupLambda"
  arn       = aws_lambda_function.resource_cleanup.arn
}
```

## ECR Image Lifecycle Policies

Container image registries can accumulate thousands of unused images over time. ECR lifecycle policies help keep this under control.

```hcl
# Create an ECR repository with lifecycle policy
resource "aws_ecr_repository" "app" {
  name                 = "application-service"
  image_tag_mutability = "MUTABLE"

  # Enable image scanning for security
  image_scanning_configuration {
    scan_on_push = true
  }
}

# Define lifecycle policy to limit image count and age
resource "aws_ecr_lifecycle_policy" "app_policy" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep only the last 20 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## Creating a Reusable Lifecycle Module

To standardize lifecycle policies across your organization, create a reusable Terraform module.

```hcl
# modules/lifecycle-policy/variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "max_resource_age_days" {
  description = "Maximum age of resources before cleanup"
  type        = number
  default     = 30
}

variable "enable_auto_cleanup" {
  description = "Whether to enable automatic resource cleanup"
  type        = bool
  default     = true
}

variable "notification_email" {
  description = "Email for lifecycle notifications"
  type        = string
}

# modules/lifecycle-policy/main.tf
# SNS topic for lifecycle notifications
resource "aws_sns_topic" "lifecycle_alerts" {
  name = "lifecycle-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "email_alert" {
  topic_arn = aws_sns_topic.lifecycle_alerts.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# CloudWatch alarm for resource count thresholds
resource "aws_cloudwatch_metric_alarm" "resource_count" {
  alarm_name          = "high-resource-count-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ResourceCount"
  namespace           = "Custom/Lifecycle"
  period              = 86400
  statistic           = "Maximum"
  threshold           = 100
  alarm_description   = "Alert when resource count exceeds threshold"
  alarm_actions       = [aws_sns_topic.lifecycle_alerts.arn]
}
```

## Using Terraform Lifecycle Meta-Arguments

Terraform itself provides lifecycle meta-arguments that can help manage resource costs by controlling when resources are replaced versus updated in place.

```hcl
resource "aws_instance" "production" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    # Prevent accidental destruction of production resources
    prevent_destroy = true

    # Ignore changes to tags managed by external tools
    ignore_changes = [
      tags["LastModifiedBy"],
      tags["LastModifiedDate"],
    ]

    # Create new resource before destroying old one
    # This avoids downtime but temporarily doubles cost
    create_before_destroy = true
  }
}
```

## Best Practices for Lifecycle Policies

When implementing lifecycle policies with Terraform, keep these best practices in mind. First, always start with a dry-run mode that reports what would be cleaned up without actually deleting anything. Second, send notifications before resources are deleted so teams can extend the lifecycle if needed. Third, use consistent tagging across all resources to make lifecycle policies effective.

You should also implement graduated policies where resources move through states before deletion. For example, a resource might first be stopped, then tagged for deletion, and finally removed after a grace period.

Lifecycle policies are one piece of a broader cost optimization strategy. For related approaches, check out our guide on [monitoring cloud spend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-cloud-spend-with-terraform/view) and [using Terraform to identify unused resources](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-to-identify-unused-resources/view).

## Conclusion

Resource lifecycle policies are essential for keeping cloud costs under control. By using Terraform to codify these policies, you ensure they are version-controlled, repeatable, and consistently applied across all environments. Start with the areas that have the highest cost impact, such as storage lifecycle rules and snapshot retention, then expand to cover development environments and container registries. The investment in setting up these policies pays for itself many times over through reduced waste and better resource hygiene.
