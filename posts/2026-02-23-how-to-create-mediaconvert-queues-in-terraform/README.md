# How to Create MediaConvert Queues in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, MediaConvert, Media Processing, Video, Infrastructure as Code

Description: Learn how to set up AWS Elemental MediaConvert queues, job templates, and IAM roles with Terraform for scalable video transcoding pipelines.

---

AWS Elemental MediaConvert is a file-based video transcoding service that processes media files at scale. It handles format conversion, adaptive bitrate packaging, and content protection without requiring you to manage any transcoding infrastructure. Queues are how you organize and prioritize your transcoding jobs within MediaConvert.

Managing MediaConvert resources through Terraform ensures your video processing pipeline is consistent across environments and can be rebuilt from code. This guide covers queue creation, job templates, presets, and the IAM configuration that ties everything together.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with MediaConvert permissions
- S3 buckets for input and output media files
- Basic understanding of video transcoding concepts

## Provider Setup

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
```

## Understanding MediaConvert Queues

MediaConvert uses queues to manage transcoding jobs. There are two types:

**On-demand queues** process jobs whenever capacity is available. You pay per minute of output video. Every account gets a default on-demand queue.

**Reserved queues** provide committed transcoding capacity at a fixed monthly price. These are useful when you have a predictable, steady workload.

## Creating an On-Demand Queue

```hcl
# On-demand queue for standard video processing
resource "aws_media_convert_queue" "standard" {
  name        = "standard-processing"
  description = "Queue for standard video transcoding jobs"
  status      = "ACTIVE"

  # Pricing plan: ON_DEMAND or RESERVED
  pricing_plan = "ON_DEMAND"

  tags = {
    Environment = "production"
    Team        = "media"
  }
}

# High-priority queue for urgent processing
resource "aws_media_convert_queue" "priority" {
  name        = "priority-processing"
  description = "Queue for high-priority transcoding jobs"
  status      = "ACTIVE"
  pricing_plan = "ON_DEMAND"

  tags = {
    Environment = "production"
    Team        = "media"
    Priority    = "high"
  }
}
```

## Creating a Reserved Queue

For steady workloads, reserved queues can reduce costs significantly:

```hcl
# Reserved queue with committed capacity
resource "aws_media_convert_queue" "reserved" {
  name         = "reserved-encoding"
  description  = "Reserved capacity queue for batch encoding"
  status       = "ACTIVE"
  pricing_plan = "RESERVED"

  # Reservation plan configuration
  reservation_plan_settings {
    commitment = "ONE_YEAR"
    renewal_type = "AUTO_RENEW"

    # Number of reserved transcode slots (RTS)
    reserved_slots = 5
  }

  tags = {
    Environment = "production"
    Team        = "media"
    CostCenter  = "video-platform"
  }
}
```

## IAM Role for MediaConvert

MediaConvert needs an IAM role to access your S3 buckets and other AWS services. This role is passed when you submit jobs:

```hcl
# IAM role that MediaConvert assumes when running jobs
resource "aws_iam_role" "mediaconvert" {
  name = "MediaConvertJobRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "mediaconvert.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Service = "mediaconvert"
  }
}

# Policy for S3 access - read input, write output
resource "aws_iam_role_policy" "mediaconvert_s3" {
  name = "mediaconvert-s3-access"
  role = aws_iam_role.mediaconvert.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadInputBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.input_bucket}",
          "arn:aws:s3:::${var.input_bucket}/*"
        ]
      },
      {
        Sid    = "WriteOutputBucket"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.output_bucket}",
          "arn:aws:s3:::${var.output_bucket}/*"
        ]
      }
    ]
  })
}

# Policy for CloudWatch logging
resource "aws_iam_role_policy" "mediaconvert_cloudwatch" {
  name = "mediaconvert-cloudwatch"
  role = aws_iam_role.mediaconvert.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

variable "input_bucket" {
  description = "S3 bucket name for input media files"
  type        = string
}

variable "output_bucket" {
  description = "S3 bucket name for transcoded output files"
  type        = string
}
```

## Getting the MediaConvert Endpoint

MediaConvert uses account-specific endpoints. You need this endpoint to submit jobs:

```hcl
# Retrieve the account-specific MediaConvert endpoint
data "aws_media_convert_queue" "default" {
  id = "Default"
}

# You can also use the AWS CLI data source
# to discover the endpoint programmatically
output "mediaconvert_endpoint" {
  description = "MediaConvert API endpoint for this account"
  value       = "Use aws mediaconvert describe-endpoints to get the endpoint URL"
}
```

## Setting Up Event Notifications

Track job status changes with EventBridge rules:

```hcl
# EventBridge rule for MediaConvert job state changes
resource "aws_cloudwatch_event_rule" "mediaconvert_jobs" {
  name        = "mediaconvert-job-status"
  description = "Capture MediaConvert job state changes"

  event_pattern = jsonencode({
    source      = ["aws.mediaconvert"]
    detail-type = ["MediaConvert Job State Change"]
    detail = {
      status = ["COMPLETE", "ERROR"]
      queue  = [aws_media_convert_queue.standard.arn]
    }
  })

  tags = {
    Service = "mediaconvert"
  }
}

# SNS topic for notifications
resource "aws_sns_topic" "mediaconvert_alerts" {
  name = "mediaconvert-job-alerts"

  tags = {
    Service = "mediaconvert"
  }
}

# Send job status to SNS
resource "aws_cloudwatch_event_target" "sns_notification" {
  rule      = aws_cloudwatch_event_rule.mediaconvert_jobs.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.mediaconvert_alerts.arn
}

# Allow EventBridge to publish to the SNS topic
resource "aws_sns_topic_policy" "mediaconvert_events" {
  arn = aws_sns_topic.mediaconvert_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgePublish"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.mediaconvert_alerts.arn
      }
    ]
  })
}
```

## S3 Buckets for Media Pipeline

Set up the input and output buckets with proper configuration:

```hcl
# Input bucket for source media files
resource "aws_s3_bucket" "media_input" {
  bucket = var.input_bucket

  tags = {
    Purpose = "mediaconvert-input"
  }
}

# Output bucket for transcoded files
resource "aws_s3_bucket" "media_output" {
  bucket = var.output_bucket

  tags = {
    Purpose = "mediaconvert-output"
  }
}

# Lifecycle rule to clean up old output files
resource "aws_s3_bucket_lifecycle_configuration" "output_lifecycle" {
  bucket = aws_s3_bucket.media_output.id

  rule {
    id     = "move-to-glacier"
    status = "Enabled"

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
```

## Organizing Queues by Workload

In a production environment, you typically want multiple queues for different workload types:

```hcl
# Define queue configurations
locals {
  queues = {
    live_events = {
      description = "Queue for live event recordings"
      status      = "ACTIVE"
    }
    vod_standard = {
      description = "Queue for standard VOD content"
      status      = "ACTIVE"
    }
    vod_premium = {
      description = "Queue for premium VOD content"
      status      = "ACTIVE"
    }
    archive = {
      description = "Queue for archival transcoding"
      status      = "ACTIVE"
    }
  }
}

# Create queues from the map
resource "aws_media_convert_queue" "workload_queues" {
  for_each = local.queues

  name         = each.key
  description  = each.value.description
  status       = each.value.status
  pricing_plan = "ON_DEMAND"

  tags = {
    Environment = "production"
    Workload    = each.key
  }
}

# Output all queue ARNs
output "queue_arns" {
  description = "ARNs for all MediaConvert queues"
  value = {
    for k, v in aws_media_convert_queue.workload_queues : k => v.arn
  }
}
```

## Monitoring Your Transcoding Pipeline

Transcoding failures can silently break your content pipeline. Set up monitoring through OneUptime to track job completion rates, processing times, and error rates. This way you catch issues before your users notice missing or broken content.

For tracking costs associated with your transcoding workloads, see our guide on setting up budget alerts at https://oneuptime.com/blog/post/2026-02-23-how-to-create-budget-alerts-in-terraform/view.

## Summary

MediaConvert queues give you control over how your transcoding jobs are organized and prioritized. By managing them through Terraform alongside IAM roles, S3 buckets, and event notifications, you build a complete video processing pipeline that is reproducible and auditable. Start with on-demand queues and consider reserved capacity once your workload patterns are predictable enough to justify the commitment.
