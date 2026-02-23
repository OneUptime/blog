# How to Create Timestream Databases and Tables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Timestream, Time Series, Database, IoT, Infrastructure as Code

Description: Learn how to create and configure Amazon Timestream databases and tables using Terraform for time series data from IoT devices and applications.

---

Amazon Timestream is a fully managed, serverless time series database designed for collecting, storing, and analyzing time series data at scale. It is ideal for IoT applications, DevOps monitoring, industrial telemetry, and any workload that involves time-stamped data points. In this guide, we will cover how to create Timestream databases and tables using Terraform.

## Understanding Timestream Architecture

Timestream uses a tiered storage architecture. Recent data is stored in a memory store for fast query performance, while older data is automatically moved to a magnetic store for cost-effective long-term storage. You define retention policies for each tier, and Timestream handles the data movement automatically.

Timestream is serverless, meaning there are no instances to manage. You simply create databases and tables, and AWS scales the underlying infrastructure based on your workload. Queries are processed using a distributed query engine that can handle trillions of data points.

## Setting Up the Provider

```hcl
# Configure Terraform
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

## Creating a Timestream Database

A Timestream database is the top-level container for your tables:

```hcl
# Create a Timestream database
resource "aws_timestreamwrite_database" "iot_database" {
  database_name = "iot_telemetry"

  # Optional: Use a customer-managed KMS key for encryption
  kms_key_id = aws_kms_key.timestream_key.arn

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Purpose     = "iot-telemetry"
  }
}

# KMS key for Timestream encryption
resource "aws_kms_key" "timestream_key" {
  description             = "KMS key for Timestream encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = "production"
  }
}
```

## Creating Timestream Tables

Tables hold your time series data. The key configuration is the retention policy for each storage tier:

```hcl
# Create a table for device metrics
resource "aws_timestreamwrite_table" "device_metrics" {
  database_name = aws_timestreamwrite_database.iot_database.database_name
  table_name    = "device_metrics"

  # Configure retention policies
  retention_properties {
    # Keep data in memory store for 24 hours for fast queries
    memory_store_retention_period_in_hours = 24

    # Keep data in magnetic store for 365 days for historical analysis
    magnetic_store_retention_period_in_days = 365
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Creating Tables with Magnetic Store Writes

Magnetic store writes allow you to write data directly to the magnetic store, which is useful for late-arriving or historical data:

```hcl
# Table with magnetic store writes enabled
resource "aws_timestreamwrite_table" "historical_data" {
  database_name = aws_timestreamwrite_database.iot_database.database_name
  table_name    = "historical_sensor_data"

  retention_properties {
    memory_store_retention_period_in_hours = 1   # Short memory retention
    magnetic_store_retention_period_in_days = 730  # 2 years in magnetic store
  }

  # Enable magnetic store writes for late-arriving data
  magnetic_store_write_properties {
    enable_magnetic_store_writes = true

    # Configure S3 error logging for rejected records
    magnetic_store_rejected_data_location {
      s3_configuration {
        bucket_name       = aws_s3_bucket.timestream_errors.id
        object_key_prefix = "rejected-records/"
        encryption_option = "SSE_S3"
      }
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# S3 bucket for rejected records
resource "aws_s3_bucket" "timestream_errors" {
  bucket = "timestream-rejected-records-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = "production"
    Purpose     = "timestream-error-logging"
  }
}

data "aws_caller_identity" "current" {}
```

## Creating Multiple Tables for Different Data Types

A common pattern is to create separate tables for different types of telemetry data:

```hcl
# Variables for table configuration
variable "timestream_tables" {
  description = "Map of Timestream tables to create"
  type = map(object({
    memory_hours  = number
    magnetic_days = number
  }))
  default = {
    cpu_metrics = {
      memory_hours  = 24
      magnetic_days = 90
    }
    memory_metrics = {
      memory_hours  = 24
      magnetic_days = 90
    }
    disk_metrics = {
      memory_hours  = 12
      magnetic_days = 180
    }
    network_metrics = {
      memory_hours  = 6
      magnetic_days = 30
    }
    application_logs = {
      memory_hours  = 48
      magnetic_days = 365
    }
  }
}

# Create all tables using for_each
resource "aws_timestreamwrite_table" "metrics_tables" {
  for_each = var.timestream_tables

  database_name = aws_timestreamwrite_database.iot_database.database_name
  table_name    = each.key

  retention_properties {
    memory_store_retention_period_in_hours = each.value.memory_hours
    magnetic_store_retention_period_in_days = each.value.magnetic_days
  }

  magnetic_store_write_properties {
    enable_magnetic_store_writes = true
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    TableType   = each.key
  }
}
```

## Setting Up IAM Permissions for Writing Data

Your applications need appropriate IAM permissions to write to Timestream:

```hcl
# IAM policy for writing to Timestream
resource "aws_iam_policy" "timestream_write" {
  name        = "timestream-write-policy"
  description = "Policy for writing data to Timestream"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "timestream:WriteRecords",
          "timestream:DescribeEndpoints"
        ]
        Resource = "${aws_timestreamwrite_database.iot_database.arn}/table/*"
      },
      {
        Effect = "Allow"
        Action = [
          "timestream:DescribeEndpoints"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM policy for querying Timestream
resource "aws_iam_policy" "timestream_read" {
  name        = "timestream-read-policy"
  description = "Policy for querying data from Timestream"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "timestream:Select",
          "timestream:DescribeTable",
          "timestream:ListMeasures",
          "timestream:DescribeEndpoints"
        ]
        Resource = "${aws_timestreamwrite_database.iot_database.arn}/table/*"
      },
      {
        Effect = "Allow"
        Action = [
          "timestream:DescribeEndpoints",
          "timestream:SelectValues",
          "timestream:CancelQuery"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Creating Scheduled Queries

Timestream supports scheduled queries that run on a defined schedule and write results to a destination table:

```hcl
# Destination table for scheduled query results
resource "aws_timestreamwrite_table" "hourly_aggregates" {
  database_name = aws_timestreamwrite_database.iot_database.database_name
  table_name    = "hourly_aggregates"

  retention_properties {
    memory_store_retention_period_in_hours = 168  # 7 days in memory
    magnetic_store_retention_period_in_days = 730  # 2 years total
  }

  tags = {
    Environment = "production"
    Purpose     = "scheduled-query-results"
  }
}

# IAM role for scheduled queries
resource "aws_iam_role" "scheduled_query_role" {
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

# SNS topic for scheduled query notifications
resource "aws_sns_topic" "scheduled_query_notifications" {
  name = "timestream-scheduled-query-notifications"
}
```

## Setting Up a VPC Endpoint for Timestream

For secure, private connectivity to Timestream from your VPC:

```hcl
# VPC endpoint for Timestream ingest
resource "aws_vpc_endpoint" "timestream_ingest" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.timestream.ingest-cell1"
  vpc_endpoint_type = "Interface"

  subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_group_ids = [aws_security_group.timestream_endpoint_sg.id]

  private_dns_enabled = true

  tags = {
    Name        = "timestream-ingest-endpoint"
    Environment = "production"
  }
}

# VPC endpoint for Timestream query
resource "aws_vpc_endpoint" "timestream_query" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.timestream.query-cell1"
  vpc_endpoint_type = "Interface"

  subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_group_ids = [aws_security_group.timestream_endpoint_sg.id]

  private_dns_enabled = true

  tags = {
    Name        = "timestream-query-endpoint"
    Environment = "production"
  }
}

# Security group for VPC endpoints
resource "aws_security_group" "timestream_endpoint_sg" {
  name_prefix = "timestream-endpoint-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS access from VPC"
  }

  tags = {
    Name = "timestream-endpoint-sg"
  }
}
```

## Outputs

```hcl
# Database information
output "database_name" {
  description = "Timestream database name"
  value       = aws_timestreamwrite_database.iot_database.database_name
}

output "database_arn" {
  description = "Timestream database ARN"
  value       = aws_timestreamwrite_database.iot_database.arn
}

# Table information
output "device_metrics_table" {
  description = "Device metrics table name"
  value       = aws_timestreamwrite_table.device_metrics.table_name
}

output "table_arns" {
  description = "ARNs of all metric tables"
  value       = { for k, v in aws_timestreamwrite_table.metrics_tables : k => v.arn }
}
```

## Monitoring Timestream

Monitor your Timestream resources to track usage and detect issues:

```hcl
# Alarm for write throttling
resource "aws_cloudwatch_metric_alarm" "write_throttling" {
  alarm_name          = "timestream-write-throttling"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SystemErrors"
  namespace           = "AWS/Timestream"
  period              = 300
  statistic           = "Sum"
  threshold           = 10

  dimensions = {
    DatabaseName = aws_timestreamwrite_database.iot_database.database_name
    TableName    = aws_timestreamwrite_table.device_metrics.table_name
    Operation    = "WriteRecords"
  }

  alarm_actions = [aws_sns_topic.timestream_alerts.arn]
}

resource "aws_sns_topic" "timestream_alerts" {
  name = "timestream-alerts"
}
```

For end-to-end observability of your time series data pipeline, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can provide unified dashboards for tracking ingestion rates, query performance, and storage utilization.

## Best Practices

Choose memory store retention based on your query patterns, keeping frequently accessed data in the memory tier. Use magnetic store writes for late-arriving data. Create separate tables for different types of metrics to optimize query performance. Use VPC endpoints for private connectivity. Set up IAM policies with least-privilege access. Monitor write throttling and adjust your ingestion patterns if needed. Use scheduled queries to pre-compute aggregates for common query patterns.

## Conclusion

Amazon Timestream provides a purpose-built solution for time series data with automatic tiered storage and serverless scalability. Terraform makes it easy to define your databases, tables, and supporting infrastructure as code. Whether you are collecting IoT sensor data, application metrics, or industrial telemetry, Timestream with Terraform gives you a scalable, cost-effective foundation for time series workloads.
