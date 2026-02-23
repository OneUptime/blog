# How to Create Timestream Databases in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Timestream, Time Series, Database, Infrastructure as Code

Description: Learn how to create Amazon Timestream databases and tables with retention policies, scheduled queries, and monitoring using Terraform.

---

Amazon Timestream is a serverless time-series database designed for storing and analyzing trillions of time-series data points per day. If you are collecting IoT sensor data, application metrics, DevOps telemetry, or any data that changes over time, Timestream handles the storage tiering and query optimization automatically. Managing it through Terraform ensures your database configuration, retention policies, and scheduled queries are all version-controlled and reproducible.

In this guide, we will walk through creating Timestream databases, tables with custom retention policies, scheduled queries, and the supporting infrastructure.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with permissions for Timestream
- Basic understanding of time-series data concepts

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

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

## Creating a Timestream Database

A database is the top-level container in Timestream. Each database can hold multiple tables.

```hcl
# KMS key for encrypting Timestream data
resource "aws_kms_key" "timestream" {
  description             = "KMS key for Timestream database encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Service = "timestream"
  }
}

resource "aws_kms_alias" "timestream" {
  name          = "alias/timestream-key"
  target_key_id = aws_kms_key.timestream.key_id
}

# Timestream database with customer-managed KMS key
resource "aws_timestreamwrite_database" "metrics" {
  database_name = "application-metrics"
  kms_key_id    = aws_kms_key.timestream.arn

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

# Second database for IoT data
resource "aws_timestreamwrite_database" "iot" {
  database_name = "iot-sensor-data"
  kms_key_id    = aws_kms_key.timestream.arn

  tags = {
    Environment = "production"
    Team        = "iot"
  }
}
```

## Creating Tables with Retention Policies

Timestream tables have two storage tiers: a memory store for recent, frequently accessed data and a magnetic store for historical data. You configure how long data stays in each tier.

```hcl
# Table for application performance metrics
resource "aws_timestreamwrite_table" "app_performance" {
  database_name = aws_timestreamwrite_database.metrics.database_name
  table_name    = "app-performance"

  # Retention configuration
  retention_properties {
    # Keep data in memory store for 24 hours (in hours)
    memory_store_retention_period_in_hours = 24

    # Keep data in magnetic store for 365 days (in days)
    magnetic_store_retention_period_in_days = 365
  }

  # Enable magnetic store writes for late-arriving data
  magnetic_store_write_properties {
    enable_magnetic_store_writes = true

    # Configure where rejected records go
    magnetic_store_rejected_data_location {
      s3_configuration {
        bucket_name       = aws_s3_bucket.timestream_rejected.id
        encryption_option = "SSE_KMS"
        kms_key_id        = aws_kms_key.timestream.arn
        object_key_prefix = "rejected/app-performance/"
      }
    }
  }

  tags = {
    DataType = "performance-metrics"
  }
}

# Table for infrastructure metrics with longer memory retention
resource "aws_timestreamwrite_table" "infra_metrics" {
  database_name = aws_timestreamwrite_database.metrics.database_name
  table_name    = "infrastructure-metrics"

  retention_properties {
    # Keep 72 hours in memory for fast queries on recent data
    memory_store_retention_period_in_hours = 72

    # Keep 2 years in magnetic store for historical analysis
    magnetic_store_retention_period_in_days = 730
  }

  magnetic_store_write_properties {
    enable_magnetic_store_writes = true
  }

  tags = {
    DataType = "infrastructure-metrics"
  }
}

# Table for IoT sensor readings
resource "aws_timestreamwrite_table" "sensor_readings" {
  database_name = aws_timestreamwrite_database.iot.database_name
  table_name    = "sensor-readings"

  retention_properties {
    # Sensors generate lots of data - keep only 6 hours in memory
    memory_store_retention_period_in_hours = 6

    # Retain for 90 days in magnetic store
    magnetic_store_retention_period_in_days = 90
  }

  magnetic_store_write_properties {
    enable_magnetic_store_writes = true
  }

  tags = {
    DataType = "sensor-data"
  }
}

# S3 bucket for rejected records
resource "aws_s3_bucket" "timestream_rejected" {
  bucket = "my-org-timestream-rejected-records"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "timestream_rejected" {
  bucket = aws_s3_bucket.timestream_rejected.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.timestream.arn
    }
  }
}
```

## Table with Schema Definition

You can define the schema for your table to enable strict type checking.

```hcl
# Table with explicit schema definition
resource "aws_timestreamwrite_table" "events" {
  database_name = aws_timestreamwrite_database.metrics.database_name
  table_name    = "application-events"

  retention_properties {
    memory_store_retention_period_in_hours = 12
    magnetic_store_retention_period_in_days = 180
  }

  # Define the schema for measure values
  schema {
    composite_partition_key {
      enforcement_in_record = "REQUIRED"
      name                  = "dimension_key"
      type                  = "DIMENSION"
    }
  }

  magnetic_store_write_properties {
    enable_magnetic_store_writes = true
  }

  tags = {
    DataType = "events"
  }
}
```

## Scheduled Queries

Scheduled queries let you precompute aggregations and store the results in another Timestream table. This is useful for dashboards and reports.

```hcl
# Destination table for scheduled query results
resource "aws_timestreamwrite_table" "hourly_aggregates" {
  database_name = aws_timestreamwrite_database.metrics.database_name
  table_name    = "hourly-aggregates"

  retention_properties {
    memory_store_retention_period_in_hours = 168 # 7 days
    magnetic_store_retention_period_in_days = 365
  }
}

# IAM role for the scheduled query
resource "aws_iam_role" "timestream_scheduled_query" {
  name = "timestream-scheduled-query-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "timestream.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "timestream_scheduled_query" {
  name = "timestream-scheduled-query-policy"
  role = aws_iam_role.timestream_scheduled_query.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "timestream:Select",
          "timestream:WriteRecords",
          "timestream:DescribeEndpoints",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
        ]
        Resource = "${aws_s3_bucket.timestream_errors.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish",
        ]
        Resource = aws_sns_topic.timestream_alerts.arn
      }
    ]
  })
}

# SNS topic for scheduled query notifications
resource "aws_sns_topic" "timestream_alerts" {
  name = "timestream-scheduled-query-alerts"
}

# S3 bucket for error reports
resource "aws_s3_bucket" "timestream_errors" {
  bucket = "my-org-timestream-query-errors"
}

# Scheduled query that computes hourly averages
resource "aws_timestreamquery_scheduled_query" "hourly_avg" {
  name = "hourly-performance-averages"

  query_string = <<-SQL
    SELECT
      bin(time, 1h) as binned_time,
      hostname,
      AVG(measure_value::double) as avg_cpu,
      MAX(measure_value::double) as max_cpu,
      MIN(measure_value::double) as min_cpu
    FROM "${aws_timestreamwrite_database.metrics.database_name}"."${aws_timestreamwrite_table.app_performance.table_name}"
    WHERE measure_name = 'cpu_utilization'
      AND time BETWEEN @scheduled_runtime - 1h AND @scheduled_runtime
    GROUP BY bin(time, 1h), hostname
  SQL

  schedule_configuration {
    schedule_expression = "rate(1 hour)"
  }

  notification_configuration {
    sns_configuration {
      topic_arn = aws_sns_topic.timestream_alerts.arn
    }
  }

  target_configuration {
    timestream_configuration {
      database_name = aws_timestreamwrite_database.metrics.database_name
      table_name    = aws_timestreamwrite_table.hourly_aggregates.table_name

      time_column      = "binned_time"
      measure_name_column = "measure_name"

      dimension_mappings {
        name                = "hostname"
        dimension_value_type = "VARCHAR"
      }

      multi_measure_mappings {
        target_multi_measure_name = "performance_stats"

        multi_measure_attribute_mappings {
          measure_value_type = "DOUBLE"
          source_column      = "avg_cpu"
        }

        multi_measure_attribute_mappings {
          measure_value_type = "DOUBLE"
          source_column      = "max_cpu"
        }

        multi_measure_attribute_mappings {
          measure_value_type = "DOUBLE"
          source_column      = "min_cpu"
        }
      }
    }
  }

  scheduled_query_execution_role_arn = aws_iam_role.timestream_scheduled_query.arn

  error_report_configuration {
    s3_configuration {
      bucket_name       = aws_s3_bucket.timestream_errors.id
      object_key_prefix = "errors/hourly-avg/"
      encryption_option = "SSE_S3"
    }
  }

  tags = {
    Purpose = "hourly-aggregation"
  }
}
```

## IAM Policies for Application Access

Your applications need IAM permissions to write to and read from Timestream.

```hcl
# Policy for writing data to Timestream
resource "aws_iam_policy" "timestream_write" {
  name        = "timestream-write-access"
  description = "Allows writing records to Timestream tables"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TimestreamWrite"
        Effect = "Allow"
        Action = [
          "timestream:WriteRecords",
          "timestream:DescribeEndpoints",
        ]
        Resource = [
          aws_timestreamwrite_table.app_performance.arn,
          aws_timestreamwrite_table.infra_metrics.arn,
        ]
      },
      {
        Sid    = "DescribeDatabase"
        Effect = "Allow"
        Action = [
          "timestream:DescribeDatabase",
          "timestream:DescribeTable",
        ]
        Resource = "*"
      }
    ]
  })
}

# Policy for querying Timestream
resource "aws_iam_policy" "timestream_read" {
  name        = "timestream-read-access"
  description = "Allows querying Timestream tables"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TimestreamQuery"
        Effect = "Allow"
        Action = [
          "timestream:Select",
          "timestream:DescribeEndpoints",
          "timestream:DescribeTable",
          "timestream:ListMeasures",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Using Variables for Multiple Environments

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "tables" {
  type = map(object({
    memory_retention_hours  = number
    magnetic_retention_days = number
  }))
  default = {
    "cpu-metrics" = {
      memory_retention_hours  = 24
      magnetic_retention_days = 365
    }
    "memory-metrics" = {
      memory_retention_hours  = 24
      magnetic_retention_days = 365
    }
    "network-metrics" = {
      memory_retention_hours  = 12
      magnetic_retention_days = 180
    }
  }
}

# Create multiple tables from variable
resource "aws_timestreamwrite_table" "dynamic_tables" {
  for_each = var.tables

  database_name = aws_timestreamwrite_database.metrics.database_name
  table_name    = "${var.environment}-${each.key}"

  retention_properties {
    memory_store_retention_period_in_hours = each.value.memory_retention_hours
    magnetic_store_retention_period_in_days = each.value.magnetic_retention_days
  }

  tags = {
    Environment = var.environment
    TableType   = each.key
  }
}
```

## Best Practices

1. **Choose retention periods carefully.** Memory store is faster but more expensive. Keep only the data you actively query in memory. Historical analysis can use the magnetic store.

2. **Enable magnetic store writes.** This catches late-arriving data that would otherwise be rejected because its timestamp falls outside the memory store retention window.

3. **Use scheduled queries for dashboards.** Instead of running expensive real-time aggregations, precompute the results with scheduled queries and store them in a separate table.

4. **Encrypt with customer-managed keys.** Use your own KMS key rather than the AWS-managed key for better control over key rotation and access policies.

5. **Partition your data across tables.** Do not dump all data types into one table. Separate tables for different data types improves query performance and lets you set different retention policies.

6. **Monitor rejected records.** Configure an S3 location for rejected records so you can diagnose ingestion issues.

## Conclusion

Amazon Timestream with Terraform gives you a solid foundation for time-series data storage at scale. The combination of automatic storage tiering, scheduled queries for precomputed aggregations, and serverless scaling means you can focus on your data rather than database operations. With Terraform managing the configuration, spinning up new databases and tables for different teams or environments is a straightforward code change.
