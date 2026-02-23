# How to Create Athena Workgroups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Athena, Analytics, Data Lake, Infrastructure as Code

Description: Learn how to create and configure Amazon Athena workgroups in Terraform to manage query execution, enforce cost controls, and separate workloads across teams.

---

Amazon Athena is a serverless query engine that lets you analyze data directly in S3 using standard SQL. If you have more than a handful of people running queries, you quickly run into the problem of cost management and workload separation. That is where Athena workgroups come in.

Workgroups let you isolate query execution for different teams or use cases. Each workgroup can have its own query result location, encryption settings, data usage limits, and CloudWatch metrics. They are the primary mechanism for controlling who can run queries, where results go, and how much each team spends on scanning data.

In this post, we will walk through creating Athena workgroups with Terraform, covering everything from basic configuration to enforcing cost controls and integrating with CloudWatch.

## Why Use Athena Workgroups

Before jumping into Terraform code, it helps to understand what workgroups solve:

- **Cost isolation**: Set per-query and per-workgroup data scan limits to prevent runaway queries
- **Result management**: Route query results to separate S3 locations per team
- **Encryption control**: Enforce encryption on query results at the workgroup level
- **CloudWatch metrics**: Publish query metrics per workgroup for monitoring and alerting
- **Access control**: Use IAM policies to restrict which users can run queries in which workgroups

Without workgroups, everyone shares the default `primary` workgroup, and you have no visibility into which team is driving your Athena costs.

## Basic Workgroup

Here is a straightforward Athena workgroup with a dedicated results location:

```hcl
# S3 bucket for storing query results
resource "aws_s3_bucket" "athena_results" {
  bucket = "my-company-athena-results"

  tags = {
    Purpose   = "Athena query results"
    ManagedBy = "terraform"
  }
}

# Enable server-side encryption on the results bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Create the Athena workgroup
resource "aws_athena_workgroup" "analytics_team" {
  name        = "analytics-team"
  description = "Workgroup for the analytics team"
  state       = "ENABLED"

  configuration {
    # Enforce the workgroup settings so users cannot override them
    enforce_workgroup_configuration = true

    # Where query results will be stored
    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.bucket}/analytics-team/"

      # Encrypt query results with SSE-KMS
      encryption_configuration {
        encryption_option = "SSE_KMS"
        kms_key_arn       = aws_kms_key.athena.arn
      }
    }
  }

  tags = {
    Team      = "analytics"
    ManagedBy = "terraform"
  }
}

# KMS key for encrypting Athena query results
resource "aws_kms_key" "athena" {
  description             = "KMS key for Athena query result encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    ManagedBy = "terraform"
  }
}
```

The `enforce_workgroup_configuration` flag is important. When set to `true`, it forces all queries in this workgroup to use the result location and encryption settings defined in the workgroup, regardless of what users specify in their query execution parameters. This prevents someone from accidentally writing unencrypted results to a random bucket.

## Workgroup with Cost Controls

One of the most useful features of Athena workgroups is data usage controls. You can set limits on how much data a single query or the entire workgroup can scan:

```hcl
resource "aws_athena_workgroup" "cost_controlled" {
  name  = "data-science"
  state = "ENABLED"

  configuration {
    enforce_workgroup_configuration = true

    # Publish query metrics to CloudWatch
    publish_cloudwatch_metrics_enabled = true

    # Limit the number of concurrent queries
    bytes_scanned_cutoff_per_query = 10737418240  # 10 GB per query

    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.bucket}/data-science/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }

    # Engine version - use Athena engine version 3 for best performance
    engine_version {
      selected_engine_version = "Athena engine version 3"
    }
  }

  tags = {
    Team      = "data-science"
    ManagedBy = "terraform"
  }
}
```

The `bytes_scanned_cutoff_per_query` parameter is your safety net. If a query would scan more than 10 GB, Athena cancels it before it starts. This is useful for preventing accidental full-table scans on multi-terabyte datasets. The value is in bytes, so 10737418240 equals 10 GB.

Note that Athena also supports workgroup-level data usage controls through CloudWatch alarms, but those are configured outside the workgroup resource itself.

## Multiple Workgroups with a Module

If you need workgroups for several teams, creating a reusable module keeps things clean:

```hcl
# modules/athena-workgroup/variables.tf
variable "name" {
  type        = string
  description = "Name of the workgroup"
}

variable "results_bucket" {
  type        = string
  description = "S3 bucket for query results"
}

variable "max_bytes_per_query" {
  type        = number
  description = "Maximum bytes scanned per query (0 = unlimited)"
  default     = 0
}

variable "encryption_option" {
  type        = string
  description = "Encryption option for query results"
  default     = "SSE_S3"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for SSE_KMS encryption"
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to the workgroup"
  default     = {}
}
```

```hcl
# modules/athena-workgroup/main.tf
resource "aws_athena_workgroup" "this" {
  name  = var.name
  state = "ENABLED"

  configuration {
    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true

    # Only set the cutoff if a value is provided
    bytes_scanned_cutoff_per_query = var.max_bytes_per_query > 0 ? var.max_bytes_per_query : null

    result_configuration {
      output_location = "s3://${var.results_bucket}/${var.name}/"

      encryption_configuration {
        encryption_option = var.encryption_option
        kms_key_arn       = var.encryption_option == "SSE_KMS" ? var.kms_key_arn : null
      }
    }

    engine_version {
      selected_engine_version = "Athena engine version 3"
    }
  }

  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}
```

Then use it across your teams:

```hcl
# Create workgroups for different teams
module "analytics_workgroup" {
  source              = "./modules/athena-workgroup"
  name                = "analytics"
  results_bucket      = aws_s3_bucket.athena_results.bucket
  max_bytes_per_query = 10737418240  # 10 GB
  tags                = { Team = "analytics" }
}

module "engineering_workgroup" {
  source              = "./modules/athena-workgroup"
  name                = "engineering"
  results_bucket      = aws_s3_bucket.athena_results.bucket
  max_bytes_per_query = 5368709120  # 5 GB
  tags                = { Team = "engineering" }
}

module "finance_workgroup" {
  source              = "./modules/athena-workgroup"
  name                = "finance"
  results_bucket      = aws_s3_bucket.athena_results.bucket
  max_bytes_per_query = 1073741824  # 1 GB
  encryption_option   = "SSE_KMS"
  kms_key_arn         = aws_kms_key.athena.arn
  tags                = { Team = "finance" }
}
```

## IAM Policy for Workgroup Access

To restrict users to a specific workgroup, attach an IAM policy that limits their Athena access:

```hcl
# IAM policy that restricts a user to a specific workgroup
resource "aws_iam_policy" "athena_analytics_access" {
  name        = "athena-analytics-workgroup-access"
  description = "Allows Athena access only within the analytics workgroup"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow running queries only in the analytics workgroup
        Effect = "Allow"
        Action = [
          "athena:StartQueryExecution",
          "athena:StopQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
          "athena:GetWorkGroup",
          "athena:ListQueryExecutions"
        ]
        Resource = [
          "arn:aws:athena:*:*:workgroup/analytics"
        ]
      },
      {
        # Allow reading from the data catalog
        Effect = "Allow"
        Action = [
          "glue:GetTable",
          "glue:GetTables",
          "glue:GetDatabase",
          "glue:GetDatabases",
          "glue:GetPartition",
          "glue:GetPartitions"
        ]
        Resource = ["*"]
      },
      {
        # Allow reading source data and writing results
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::my-data-lake-bucket",
          "arn:aws:s3:::my-data-lake-bucket/*",
          "arn:aws:s3:::my-company-athena-results",
          "arn:aws:s3:::my-company-athena-results/analytics/*"
        ]
      }
    ]
  })
}
```

This policy ensures users can only execute queries through the `analytics` workgroup and can only write results to their designated prefix.

## Monitoring Workgroup Costs with CloudWatch

When you enable `publish_cloudwatch_metrics_enabled`, Athena publishes several metrics per workgroup. You can create alarms to catch spending spikes:

```hcl
# CloudWatch alarm when total data scanned exceeds threshold
resource "aws_cloudwatch_metric_alarm" "athena_data_scanned" {
  alarm_name          = "athena-analytics-high-scan"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ProcessedBytes"
  namespace           = "AWS/Athena"
  period              = 3600  # 1 hour
  statistic           = "Sum"
  threshold           = 107374182400  # 100 GB per hour

  dimensions = {
    WorkGroup = aws_athena_workgroup.analytics_team.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  alarm_description = "Alert when analytics team scans more than 100 GB in an hour"

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Prepared Statements in Workgroups

Athena supports prepared statements within workgroups, which are useful for parameterized queries that run frequently:

```hcl
resource "aws_athena_named_query" "top_events" {
  name        = "top-events-by-type"
  workgroup   = aws_athena_workgroup.analytics_team.name
  database    = "events_db"
  description = "Get top events by type for a given date range"

  query = <<-EOT
    SELECT event_type, COUNT(*) as event_count
    FROM events
    WHERE event_date BETWEEN DATE '2024-01-01' AND DATE '2024-12-31'
    GROUP BY event_type
    ORDER BY event_count DESC
    LIMIT 100
  EOT
}
```

Named queries stored in a workgroup show up for all users of that workgroup, making it easy to share commonly used queries.

## Wrapping Up

Athena workgroups give you fine-grained control over query execution that you simply cannot achieve with the default `primary` workgroup. By defining them in Terraform, you get consistent configuration across environments, version control for your settings, and easy replication when onboarding new teams.

The key configuration decisions to make for each workgroup are: result location, encryption settings, per-query byte limits, and whether to enforce those settings. Start with `enforce_workgroup_configuration = true` and `publish_cloudwatch_metrics_enabled = true` for every workgroup. Add byte limits based on the expected query patterns for each team.

For related topics, check out our posts on [creating Athena named queries with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-athena-named-queries-terraform/view) and [creating Glue data catalogs with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-glue-jobs-terraform/view) since Athena relies heavily on the Glue Data Catalog for table metadata.
