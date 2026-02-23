# How to Create Cost and Usage Reports in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Cost Management, CUR, FinOps, Infrastructure as Code

Description: A hands-on guide to setting up AWS Cost and Usage Reports with Terraform, including S3 storage, Athena integration, and automated cost analysis queries.

---

AWS Cost and Usage Reports (CUR) provide the most detailed billing data available from AWS. They break down your spending by service, operation, resource, and tag - updated multiple times per day. If you want to understand where your money goes at a granular level, CUR is the tool for the job.

Setting up CUR through Terraform makes your cost reporting configuration reproducible and version-controlled. This is especially valuable in multi-account setups where you need consistent reporting across every account. This guide covers creating the report definition, configuring S3 storage, and setting up Athena for querying the data.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with billing, S3, and (optionally) Athena/Glue permissions
- CUR can only be created in the us-east-1 region
- Management account or delegated administrator access for consolidated billing

## Provider Configuration

CUR resources must be created in us-east-1:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# CUR must be configured in us-east-1
provider "aws" {
  region = "us-east-1"
  alias  = "billing"
}

# Your primary region for other resources
provider "aws" {
  region = var.primary_region
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

data "aws_caller_identity" "current" {}
```

## S3 Bucket for CUR Data

The report data lands in an S3 bucket. The bucket policy must allow the billing service to write to it:

```hcl
# S3 bucket for Cost and Usage Report data
resource "aws_s3_bucket" "cur" {
  provider = aws.billing
  bucket   = "cur-reports-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose = "cost-usage-reports"
    Team    = "finops"
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "cur" {
  provider = aws.billing
  bucket   = aws_s3_bucket.cur.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy for CUR delivery
resource "aws_s3_bucket_policy" "cur" {
  provider = aws.billing
  bucket   = aws_s3_bucket.cur.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCURBucketAcl"
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cur.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
            "aws:SourceArn"     = "arn:aws:cur:us-east-1:${data.aws_caller_identity.current.account_id}:definition/*"
          }
        }
      },
      {
        Sid    = "AllowCURBucketPut"
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cur.arn}/*"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
            "aws:SourceArn"     = "arn:aws:cur:us-east-1:${data.aws_caller_identity.current.account_id}:definition/*"
          }
        }
      }
    ]
  })
}

# Lifecycle rule for older report data
resource "aws_s3_bucket_lifecycle_configuration" "cur" {
  provider = aws.billing
  bucket   = aws_s3_bucket.cur.id

  rule {
    id     = "archive-old-reports"
    status = "Enabled"

    # Transition to Infrequent Access after 90 days
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 180 days
    transition {
      days          = 180
      storage_class = "GLACIER"
    }

    # Delete after 2 years
    expiration {
      days = 730
    }
  }
}
```

## Creating the Cost and Usage Report

```hcl
# Cost and Usage Report definition
resource "aws_cur_report_definition" "main" {
  provider = aws.billing

  report_name = "monthly-cost-usage-report"

  # Time granularity: HOURLY, DAILY, or MONTHLY
  time_unit = "DAILY"

  # Report format: textORcsv, Parquet
  format = "Parquet"

  # Compression: ZIP, GZIP, or Parquet
  compression = "Parquet"

  # Additional schema elements
  # RESOURCES adds individual resource IDs to the report
  additional_schema_elements = ["RESOURCES"]

  # S3 delivery configuration
  s3_bucket = aws_s3_bucket.cur.id
  s3_region = "us-east-1"
  s3_prefix = "cur-data"

  # Additional artifacts for Athena integration
  additional_artifacts = ["ATHENA"]

  # Whether each report update overwrites or creates new versions
  report_versioning = "OVERWRITE_REPORT"

  # Refresh closed month data if corrections are made
  refresh_closed_reports = true

  depends_on = [aws_s3_bucket_policy.cur]
}
```

## Athena Integration for Querying CUR Data

CUR with Athena integration automatically creates a Glue database and table for SQL queries:

```hcl
# Glue database for CUR data
resource "aws_glue_catalog_database" "cur" {
  name = "cur_database"

  description = "Database for Cost and Usage Report data"
}

# Athena workgroup for cost queries
resource "aws_athena_workgroup" "cur" {
  name = "cur-queries"

  configuration {
    # Enforce the workgroup settings
    enforce_workgroup_configuration = true

    # Limit query scan to prevent accidental expensive queries
    bytes_scanned_cutoff_per_query = 10737418240  # 10 GB

    result_configuration {
      output_location = "s3://${aws_s3_bucket.cur.id}/athena-results/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }
  }

  tags = {
    Purpose = "cost-analysis"
  }
}

# S3 bucket for Athena query results
resource "aws_s3_bucket" "athena_results" {
  bucket = "athena-cur-results-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose = "athena-query-results"
  }
}
```

## Named Queries for Common Cost Analysis

Save commonly used queries as named queries in Athena:

```hcl
# Query: Top 10 services by cost this month
resource "aws_athena_named_query" "top_services" {
  name      = "top-10-services-by-cost"
  workgroup = aws_athena_workgroup.cur.name
  database  = aws_glue_catalog_database.cur.name

  description = "Find the top 10 AWS services by cost for the current month"

  query = <<-EOQ
    SELECT
      line_item_product_code AS service,
      SUM(line_item_unblended_cost) AS total_cost
    FROM cur_database.cur_table
    WHERE month = CAST(MONTH(CURRENT_DATE) AS VARCHAR)
      AND year = CAST(YEAR(CURRENT_DATE) AS VARCHAR)
    GROUP BY line_item_product_code
    ORDER BY total_cost DESC
    LIMIT 10
  EOQ
}

# Query: Daily cost trend
resource "aws_athena_named_query" "daily_trend" {
  name      = "daily-cost-trend"
  workgroup = aws_athena_workgroup.cur.name
  database  = aws_glue_catalog_database.cur.name

  description = "Show daily cost for the current month"

  query = <<-EOQ
    SELECT
      line_item_usage_start_date AS date,
      SUM(line_item_unblended_cost) AS daily_cost
    FROM cur_database.cur_table
    WHERE month = CAST(MONTH(CURRENT_DATE) AS VARCHAR)
      AND year = CAST(YEAR(CURRENT_DATE) AS VARCHAR)
    GROUP BY line_item_usage_start_date
    ORDER BY date
  EOQ
}

# Query: Cost by tag
resource "aws_athena_named_query" "cost_by_tag" {
  name      = "cost-by-environment-tag"
  workgroup = aws_athena_workgroup.cur.name
  database  = aws_glue_catalog_database.cur.name

  description = "Break down costs by the Environment tag"

  query = <<-EOQ
    SELECT
      resource_tags_user_environment AS environment,
      line_item_product_code AS service,
      SUM(line_item_unblended_cost) AS total_cost
    FROM cur_database.cur_table
    WHERE month = CAST(MONTH(CURRENT_DATE) AS VARCHAR)
      AND year = CAST(YEAR(CURRENT_DATE) AS VARCHAR)
      AND resource_tags_user_environment IS NOT NULL
    GROUP BY resource_tags_user_environment, line_item_product_code
    ORDER BY environment, total_cost DESC
  EOQ
}

# Query: Unused or idle resources
resource "aws_athena_named_query" "idle_resources" {
  name      = "idle-resources"
  workgroup = aws_athena_workgroup.cur.name
  database  = aws_glue_catalog_database.cur.name

  description = "Find resources with low utilization that could be downsized"

  query = <<-EOQ
    SELECT
      line_item_resource_id,
      line_item_product_code,
      product_instance_type,
      SUM(line_item_unblended_cost) AS total_cost,
      AVG(CAST(line_item_usage_amount AS DOUBLE)) AS avg_usage
    FROM cur_database.cur_table
    WHERE month = CAST(MONTH(CURRENT_DATE) AS VARCHAR)
      AND year = CAST(YEAR(CURRENT_DATE) AS VARCHAR)
      AND line_item_resource_id != ''
      AND line_item_product_code = 'AmazonEC2'
    GROUP BY line_item_resource_id, line_item_product_code, product_instance_type
    HAVING SUM(line_item_unblended_cost) > 10
    ORDER BY total_cost DESC
    LIMIT 50
  EOQ
}
```

## SNS Notifications for Report Delivery

Get notified when new CUR data arrives:

```hcl
# SNS topic for CUR delivery notifications
resource "aws_sns_topic" "cur_delivery" {
  provider = aws.billing
  name     = "cur-delivery-notifications"

  tags = {
    Purpose = "cost-reporting"
  }
}

# S3 event notification when new report files arrive
resource "aws_s3_bucket_notification" "cur_notification" {
  provider = aws.billing
  bucket   = aws_s3_bucket.cur.id

  topic {
    topic_arn     = aws_sns_topic.cur_delivery.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "cur-data/"
    filter_suffix = ".parquet"
  }

  depends_on = [aws_sns_topic_policy.cur_s3]
}

# Allow S3 to publish to the SNS topic
resource "aws_sns_topic_policy" "cur_s3" {
  provider = aws.billing
  arn      = aws_sns_topic.cur_delivery.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.cur_delivery.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = aws_s3_bucket.cur.arn
          }
        }
      }
    ]
  })
}
```

## Outputs

```hcl
output "cur_report_name" {
  description = "Name of the Cost and Usage Report"
  value       = aws_cur_report_definition.main.report_name
}

output "cur_s3_bucket" {
  description = "S3 bucket containing CUR data"
  value       = aws_s3_bucket.cur.id
}

output "athena_workgroup" {
  description = "Athena workgroup for cost queries"
  value       = aws_athena_workgroup.cur.name
}
```

## Connecting CUR to Budget Alerts

CUR data feeds into AWS Budgets, which can send alerts when spending exceeds thresholds. For setting up automated budget alerts through Terraform, see our companion guide at https://oneuptime.com/blog/post/2026-02-23-how-to-create-budget-alerts-in-terraform/view.

## Monitoring Your Cloud Spend

Having detailed cost data is only useful if someone is looking at it. Set up dashboards in OneUptime that pull key cost metrics so your team can spot anomalies - like a misconfigured auto-scaling group burning through compute budget - before they become expensive surprises.

## Summary

Cost and Usage Reports give you the raw data needed to understand and optimize your AWS spending. By managing the report configuration, S3 storage, and Athena queries through Terraform, you build a cost analysis pipeline that is consistent across accounts and easy to maintain. Start with daily granularity and Parquet format for the best balance of detail and query performance, and use the Athena named queries as templates for your specific cost analysis needs.
