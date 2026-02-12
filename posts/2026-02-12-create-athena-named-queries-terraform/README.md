# How to Create Athena Named Queries with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Athena, Terraform, Analytics

Description: Guide to managing Amazon Athena resources with Terraform, including workgroups, named queries, databases, data catalogs, and query result encryption.

---

Amazon Athena lets you run SQL queries directly against data in S3 without loading it into a database first. It's the go-to service for ad-hoc analysis of data lake content, log analysis, and cost exploration. Named queries in Athena are saved SQL statements that your team can reuse - think of them as bookmarked queries that are always available in the Athena console.

Managing Athena resources in Terraform ensures your workgroups, named queries, and databases are consistent across accounts and environments. This guide covers the full setup.

## Athena Workgroup

Workgroups are the organizational unit in Athena. They control query settings, enforce result encryption, set data scan limits, and provide per-group CloudWatch metrics.

This creates an Athena workgroup with result encryption and scan limits:

```hcl
resource "aws_athena_workgroup" "analytics" {
  name        = "analytics"
  description = "Workgroup for the analytics team"

  configuration {
    enforce_workgroup_configuration = true  # Override client-side settings

    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.bucket}/analytics/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }

    bytes_scanned_cutoff_per_query = 10737418240  # 10 GB limit per query

    engine_version {
      selected_engine_version = "Athena engine version 3"
    }
  }

  tags = {
    Team        = "analytics"
    Environment = "production"
  }
}

resource "aws_s3_bucket" "athena_results" {
  bucket = "athena-query-results-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    id     = "expire-old-results"
    status = "Enabled"

    expiration {
      days = 30  # Clean up query results after 30 days
    }
  }
}

data "aws_caller_identity" "current" {}
```

The `enforce_workgroup_configuration` setting is important. When enabled, Athena ignores any result location or encryption settings specified by the client and uses the workgroup's settings instead. This prevents users from accidentally writing unencrypted results to the wrong bucket.

## Creating Athena Databases

Athena databases are containers in the Glue Data Catalog. You can create them directly in Terraform.

This creates a database for your data lake:

```hcl
resource "aws_athena_database" "data_lake" {
  name   = "data_lake"
  bucket = aws_s3_bucket.athena_results.bucket

  encryption_configuration {
    encryption_option = "SSE_S3"
  }

  comment = "Main data lake database"
}
```

## Named Queries

Named queries are the reusable SQL statements your team will access from the Athena console. They're great for common reports, data exploration patterns, and frequently-used CTEs.

These named queries provide commonly-used analytics queries for the team:

```hcl
# Query to analyze daily active users
resource "aws_athena_named_query" "daily_active_users" {
  name        = "Daily Active Users"
  workgroup   = aws_athena_workgroup.analytics.name
  database    = aws_athena_database.data_lake.name
  description = "Count of unique users per day for the last 30 days"

  query = <<-SQL
    SELECT
      DATE(event_timestamp) as event_date,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(*) as total_events
    FROM events
    WHERE event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30' DAY
    GROUP BY DATE(event_timestamp)
    ORDER BY event_date DESC
  SQL
}

# Query to find the most popular pages
resource "aws_athena_named_query" "top_pages" {
  name        = "Top Pages by Views"
  workgroup   = aws_athena_workgroup.analytics.name
  database    = aws_athena_database.data_lake.name
  description = "Top 50 most viewed pages in the last 7 days"

  query = <<-SQL
    SELECT
      page_url,
      COUNT(*) as page_views,
      COUNT(DISTINCT user_id) as unique_visitors,
      AVG(time_on_page) as avg_time_seconds
    FROM page_views
    WHERE event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '7' DAY
    GROUP BY page_url
    ORDER BY page_views DESC
    LIMIT 50
  SQL
}

# Query for error rate analysis
resource "aws_athena_named_query" "error_rates" {
  name        = "API Error Rates"
  workgroup   = aws_athena_workgroup.analytics.name
  database    = aws_athena_database.data_lake.name
  description = "Hourly error rates by endpoint for the last 24 hours"

  query = <<-SQL
    SELECT
      DATE_TRUNC('hour', request_timestamp) as hour,
      endpoint,
      COUNT(*) as total_requests,
      COUNT_IF(status_code >= 500) as server_errors,
      COUNT_IF(status_code >= 400 AND status_code < 500) as client_errors,
      ROUND(
        CAST(COUNT_IF(status_code >= 500) AS DOUBLE) / COUNT(*) * 100,
        2
      ) as error_rate_percent
    FROM api_logs
    WHERE request_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
    GROUP BY DATE_TRUNC('hour', request_timestamp), endpoint
    HAVING COUNT_IF(status_code >= 500) > 0
    ORDER BY hour DESC, error_rate_percent DESC
  SQL
}

# Query for cost analysis using AWS Cost and Usage Reports
resource "aws_athena_named_query" "monthly_costs" {
  name        = "Monthly Cost Breakdown"
  workgroup   = aws_athena_workgroup.analytics.name
  database    = "cost_reports"
  description = "Monthly AWS costs broken down by service"

  query = <<-SQL
    SELECT
      line_item_product_code as service,
      SUM(line_item_unblended_cost) as total_cost,
      SUM(line_item_usage_amount) as total_usage
    FROM cost_and_usage_report
    WHERE year = CAST(YEAR(CURRENT_DATE) AS VARCHAR)
      AND month = LPAD(CAST(MONTH(CURRENT_DATE) AS VARCHAR), 2, '0')
    GROUP BY line_item_product_code
    ORDER BY total_cost DESC
    LIMIT 20
  SQL
}

# Create table query for setting up new data sources
resource "aws_athena_named_query" "create_events_table" {
  name        = "Create Events Table"
  workgroup   = aws_athena_workgroup.analytics.name
  database    = aws_athena_database.data_lake.name
  description = "DDL to create the events table pointing to S3"

  query = <<-SQL
    CREATE EXTERNAL TABLE IF NOT EXISTS events (
      event_id STRING,
      event_type STRING,
      event_timestamp TIMESTAMP,
      user_id STRING,
      session_id STRING,
      properties MAP<STRING, STRING>
    )
    PARTITIONED BY (
      year STRING,
      month STRING,
      day STRING
    )
    ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
    STORED AS PARQUET
    LOCATION 's3://my-data-lake/events/'
    TBLPROPERTIES (
      'parquet.compression' = 'SNAPPY',
      'projection.enabled' = 'true',
      'projection.year.type' = 'integer',
      'projection.year.range' = '2024,2030',
      'projection.month.type' = 'integer',
      'projection.month.range' = '1,12',
      'projection.month.digits' = '2',
      'projection.day.type' = 'integer',
      'projection.day.range' = '1,31',
      'projection.day.digits' = '2',
      'storage.location.template' = 's3://my-data-lake/events/year=${year}/month=${month}/day=${day}/'
    )
  SQL
}

# Query to repair partitions
resource "aws_athena_named_query" "repair_partitions" {
  name        = "Repair Table Partitions"
  workgroup   = aws_athena_workgroup.analytics.name
  database    = aws_athena_database.data_lake.name
  description = "Run MSCK REPAIR to discover new partitions"

  query = "MSCK REPAIR TABLE events"
}
```

## Managing Named Queries with for_each

When you have many named queries, organize them using a variable map:

```hcl
variable "named_queries" {
  type = map(object({
    description = string
    database    = string
    query       = string
  }))
}

resource "aws_athena_named_query" "queries" {
  for_each = var.named_queries

  name        = each.key
  workgroup   = aws_athena_workgroup.analytics.name
  database    = each.value.database
  description = each.value.description
  query       = each.value.query
}
```

## Multiple Workgroups

Different teams often need different settings. Create separate workgroups with appropriate limits.

This creates workgroups for different teams with different scan limits:

```hcl
variable "teams" {
  type = map(object({
    scan_limit_gb = number
    description   = string
  }))
  default = {
    analytics = {
      scan_limit_gb = 100
      description   = "Analytics team workgroup"
    }
    engineering = {
      scan_limit_gb = 50
      description   = "Engineering team workgroup"
    }
    finance = {
      scan_limit_gb = 20
      description   = "Finance team workgroup"
    }
  }
}

resource "aws_athena_workgroup" "teams" {
  for_each = var.teams

  name        = each.key
  description = each.value.description

  configuration {
    enforce_workgroup_configuration    = true
    bytes_scanned_cutoff_per_query     = each.value.scan_limit_gb * 1073741824

    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.bucket}/${each.key}/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }

    publish_cloudwatch_metrics_enabled = true
  }

  tags = {
    Team = each.key
  }
}
```

## IAM Policies for Athena Access

Control who can use which workgroup:

```hcl
resource "aws_iam_policy" "athena_analytics" {
  name = "athena-analytics-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "athena:StartQueryExecution",
          "athena:StopQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
          "athena:ListNamedQueries",
          "athena:GetNamedQuery",
          "athena:BatchGetNamedQuery"
        ]
        Resource = aws_athena_workgroup.analytics.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-data-lake",
          "arn:aws:s3:::my-data-lake/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetBucketLocation"
        ]
        Resource = [
          "${aws_s3_bucket.athena_results.arn}",
          "${aws_s3_bucket.athena_results.arn}/analytics/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "glue:GetDatabase",
          "glue:GetDatabases",
          "glue:GetTable",
          "glue:GetTables",
          "glue:GetPartition",
          "glue:GetPartitions"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Monitoring Athena Usage

Athena publishes workgroup-level metrics to CloudWatch. Monitor scan volumes to keep costs under control.

For tracking Athena costs and performance, pair workgroup metrics with our broader monitoring approach described in [CloudWatch alarms with Terraform](https://oneuptime.com/blog/post/create-cloudwatch-alarms-terraform/view).

## Wrapping Up

Athena named queries and workgroups in Terraform give you organized, access-controlled, and reproducible analytics infrastructure. Workgroups provide cost control through scan limits and ensure results are always encrypted. Named queries act as a shared library of SQL that new team members can pick up immediately. Start with one workgroup per team, set reasonable scan limits, and build up your library of named queries as common analysis patterns emerge.
