# How to Create VPC Flow Logs to S3 with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VPC Flow Logs, S3, AWS, Networking, Security, Compliance

Description: Learn how to create VPC Flow Logs that stream to S3 using Terraform for cost-effective long-term storage, compliance, and batch analysis of network traffic.

---

VPC Flow Logs capture detailed information about network traffic in your VPC. While streaming to CloudWatch is great for real-time monitoring, sending flow logs to S3 is the preferred choice for long-term storage, compliance requirements, and batch analytics. S3 is significantly cheaper for storing large volumes of log data, supports lifecycle policies for automatic archival, and integrates with analytics tools like Athena for SQL-based querying. Terraform makes the entire setup straightforward.

## Why Send Flow Logs to S3

S3 offers several advantages over CloudWatch for flow log storage. The cost per GB is dramatically lower, especially with S3 storage classes like Intelligent-Tiering and Glacier. Lifecycle policies can automatically transition older logs to cheaper storage. Amazon Athena can query flow logs directly from S3 using SQL. And the Parquet file format is supported for even more efficient querying and storage.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC whose traffic you want to log.

## Basic S3 Flow Logs Setup

Create flow logs that deliver to an S3 bucket:

```hcl
# Configure the AWS provider
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

# Reference the VPC
data "aws_vpc" "main" {
  tags = { Name = "main-vpc" }
}

# S3 bucket for flow logs
resource "aws_s3_bucket" "flow_logs" {
  bucket = "my-vpc-flow-logs-bucket"

  tags = { Name = "vpc-flow-logs" }
}

# Enable versioning for compliance
resource "aws_s3_bucket_versioning" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# VPC Flow Log to S3
resource "aws_flow_log" "vpc_to_s3" {
  vpc_id               = data.aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"

  # Deliver logs in Parquet format for better query performance
  destination_options {
    file_format                = "parquet"
    hive_compatible_partitions = true
    per_hour_partition         = true
  }

  max_aggregation_interval = 60

  tags = { Name = "vpc-flow-log-s3" }
}
```

## S3 Lifecycle Policies

Configure lifecycle rules to manage storage costs:

```hcl
# Lifecycle policy for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  # Move to Infrequent Access after 30 days
  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Move to Glacier Deep Archive after 365 days
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    # Delete after 7 years (compliance requirement)
    expiration {
      days = 2555
    }
  }

  # Clean up incomplete multipart uploads
  rule {
    id     = "cleanup-multipart"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

## Custom Log Format for S3

Define a custom log format with additional fields:

```hcl
# Flow log with custom format
resource "aws_flow_log" "vpc_custom_s3" {
  vpc_id               = data.aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"

  # Custom log format with extensive fields
  log_format = join(" ", [
    "$${version}",
    "$${account-id}",
    "$${interface-id}",
    "$${srcaddr}",
    "$${dstaddr}",
    "$${srcport}",
    "$${dstport}",
    "$${protocol}",
    "$${packets}",
    "$${bytes}",
    "$${start}",
    "$${end}",
    "$${action}",
    "$${log-status}",
    "$${vpc-id}",
    "$${subnet-id}",
    "$${az-id}",
    "$${pkt-srcaddr}",
    "$${pkt-dstaddr}",
    "$${region}",
    "$${pkt-src-aws-service}",
    "$${pkt-dst-aws-service}",
    "$${flow-direction}",
    "$${traffic-path}",
  ])

  destination_options {
    file_format                = "parquet"
    hive_compatible_partitions = true
    per_hour_partition         = true
  }

  max_aggregation_interval = 60

  tags = { Name = "vpc-flow-log-custom-s3" }
}
```

## Setting Up Athena for Querying

Create an Athena database and table to query flow logs:

```hcl
# Athena workgroup for flow log queries
resource "aws_athena_workgroup" "flow_logs" {
  name = "vpc-flow-logs"

  configuration {
    result_configuration {
      output_location = "s3://${aws_s3_bucket.flow_logs.bucket}/athena-results/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }

    enforce_workgroup_configuration = true
  }

  tags = { Name = "flow-logs-workgroup" }
}

# Athena database
resource "aws_athena_database" "flow_logs" {
  name   = "vpc_flow_logs"
  bucket = aws_s3_bucket.flow_logs.bucket
}

# Athena named query for creating the flow logs table
resource "aws_athena_named_query" "create_table" {
  name      = "create-flow-logs-table"
  workgroup = aws_athena_workgroup.flow_logs.id
  database  = aws_athena_database.flow_logs.name

  query = <<-EOT
    CREATE EXTERNAL TABLE IF NOT EXISTS vpc_flow_logs (
      version int,
      account_id string,
      interface_id string,
      srcaddr string,
      dstaddr string,
      srcport int,
      dstport int,
      protocol bigint,
      packets bigint,
      bytes bigint,
      start bigint,
      `end` bigint,
      action string,
      log_status string,
      vpc_id string,
      subnet_id string,
      az_id string,
      pkt_srcaddr string,
      pkt_dstaddr string,
      region string,
      pkt_src_aws_service string,
      pkt_dst_aws_service string,
      flow_direction string,
      traffic_path int
    )
    PARTITIONED BY (
      `aws-account-id` string,
      `aws-service` string,
      `aws-region` string,
      `year` string,
      `month` string,
      `day` string,
      `hour` string
    )
    STORED AS PARQUET
    LOCATION 's3://${aws_s3_bucket.flow_logs.bucket}/AWSLogs/'
    TBLPROPERTIES (
      'skip.header.line.count'='1',
      'projection.enabled'='true',
      'projection.aws-account-id.type'='enum',
      'projection.aws-account-id.values'='${data.aws_caller_identity.current.account_id}',
      'projection.aws-service.type'='enum',
      'projection.aws-service.values'='vpcflowlogs',
      'projection.aws-region.type'='enum',
      'projection.aws-region.values'='us-east-1',
      'projection.year.type'='integer',
      'projection.year.range'='2024,2030',
      'projection.month.type'='integer',
      'projection.month.range'='1,12',
      'projection.month.digits'='2',
      'projection.day.type'='integer',
      'projection.day.range'='1,31',
      'projection.day.digits'='2',
      'projection.hour.type'='integer',
      'projection.hour.range'='0,23',
      'projection.hour.digits'='2',
      'storage.location.template'='s3://${aws_s3_bucket.flow_logs.bucket}/AWSLogs/$${aws-account-id}/$${aws-service}/$${aws-region}/$${year}/$${month}/$${day}/$${hour}'
    )
  EOT
}

data "aws_caller_identity" "current" {}

# Useful saved queries
resource "aws_athena_named_query" "top_talkers" {
  name      = "top-talkers"
  workgroup = aws_athena_workgroup.flow_logs.id
  database  = aws_athena_database.flow_logs.name

  query = <<-EOT
    SELECT srcaddr,
           sum(bytes) as total_bytes,
           count(*) as flow_count
    FROM vpc_flow_logs
    WHERE year = '2026' AND month = '02'
    GROUP BY srcaddr
    ORDER BY total_bytes DESC
    LIMIT 20
  EOT
}

resource "aws_athena_named_query" "rejected_traffic" {
  name      = "rejected-traffic-summary"
  workgroup = aws_athena_workgroup.flow_logs.id
  database  = aws_athena_database.flow_logs.name

  query = <<-EOT
    SELECT srcaddr, dstport, protocol,
           count(*) as reject_count
    FROM vpc_flow_logs
    WHERE action = 'REJECT'
      AND year = '2026' AND month = '02'
    GROUP BY srcaddr, dstport, protocol
    ORDER BY reject_count DESC
    LIMIT 50
  EOT
}
```

## Cross-Account Flow Logs

Send flow logs from multiple accounts to a central S3 bucket:

```hcl
# S3 bucket policy allowing cross-account flow log delivery
resource "aws_s3_bucket_policy" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSLogDeliveryWrite"
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.flow_logs.arn}/AWSLogs/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"      = "bucket-owner-full-control"
            "aws:SourceAccount" = ["111111111111", "222222222222", "333333333333"]
          }
        }
      },
      {
        Sid    = "AWSLogDeliveryCheck"
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.flow_logs.arn
      }
    ]
  })
}
```

## Outputs

```hcl
output "flow_log_id" {
  description = "ID of the VPC flow log"
  value       = aws_flow_log.vpc_to_s3.id
}

output "s3_bucket_name" {
  description = "S3 bucket for flow logs"
  value       = aws_s3_bucket.flow_logs.bucket
}

output "athena_database" {
  description = "Athena database name"
  value       = aws_athena_database.flow_logs.name
}
```

## Monitoring Flow Logs Delivery

Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-vpc-flow-logs-to-s3-with-terraform/view) to monitor the delivery of flow logs to S3 and set up alerts when log delivery stops or falls behind.

## Best Practices

Use Parquet format for better compression and query performance. Enable Hive-compatible partitions for efficient Athena queries. Use per-hour partitioning for granular data access. Set up lifecycle policies to reduce storage costs over time. Enable bucket versioning and encryption for security and compliance. Use Athena partition projection to avoid manual partition management.

## Conclusion

VPC Flow Logs to S3 with Terraform provide a cost-effective, scalable solution for long-term network traffic storage and analysis. By combining S3 storage with Athena for querying, you get powerful analytics capabilities at a fraction of the cost of real-time log processing. Terraform ensures your flow log infrastructure is consistent, automated, and ready for both compliance auditing and security investigation.
