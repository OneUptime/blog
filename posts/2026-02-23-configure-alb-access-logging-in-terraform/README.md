# How to Configure ALB Access Logging in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ALB, Access Logs, S3, Monitoring

Description: Learn how to configure ALB access logging to S3 using Terraform, including bucket policies, log format details, Athena queries for analysis, and lifecycle management.

---

ALB access logs capture detailed information about every request processed by your load balancer: client IP, request path, response code, latency, target processing time, and more. These logs are invaluable for debugging production issues, analyzing traffic patterns, and meeting compliance requirements.

Setting up ALB logging in Terraform requires three pieces: an S3 bucket, a bucket policy that grants the ALB write access, and the logging configuration on the ALB itself. Let's walk through each piece.

## Basic Access Log Configuration

```hcl
provider "aws" {
  region = "us-east-1"
}

# Look up the current region's ELB service account
# This is needed for the bucket policy
data "aws_elb_service_account" "current" {}

# S3 bucket for ALB access logs
resource "aws_s3_bucket" "alb_logs" {
  bucket_prefix = "alb-access-logs-"

  tags = {
    Name    = "alb-access-logs"
    Purpose = "ALB access log storage"
  }
}

# Bucket policy granting the ALB permission to write logs
resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.current.arn
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/alb-logs/AWSLogs/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/alb-logs/AWSLogs/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}

# Application Load Balancer with access logging enabled
resource "aws_lb" "app" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
  security_groups    = [aws_security_group.alb.id]

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb-logs"
    enabled = true
  }

  tags = {
    Name = "app-alb"
  }

  # Ensure the bucket policy is in place before enabling logging
  depends_on = [aws_s3_bucket_policy.alb_logs]
}
```

The `depends_on` is important here. If Terraform creates the ALB before the bucket policy is applied, the ALB will fail to write logs and the configuration will error out.

## S3 Bucket Configuration for Logs

Production log buckets need encryption, lifecycle rules, and blocked public access.

```hcl
# Log bucket
resource "aws_s3_bucket" "alb_logs" {
  bucket_prefix = "alb-access-logs-"

  # Prevent accidental deletion of log data
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "alb-access-logs"
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle rules to manage log retention
resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "log-retention"
    status = "Enabled"

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

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Versioning (optional but good for compliance)
resource "aws_s3_bucket_versioning" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Understanding the Log Format

ALB access logs are stored as gzip-compressed files in a specific S3 path structure:

```text
s3://bucket-name/prefix/AWSLogs/account-id/elasticloadbalancing/region/yyyy/mm/dd/
```

Each log entry contains fields like:

```text
type timestamp elb client:port target:port request_processing_time
target_processing_time response_processing_time elb_status_code
target_status_code received_bytes sent_bytes "request" "user_agent"
ssl_cipher ssl_protocol target_group_arn "trace_id" "domain_name"
"chosen_cert_arn" matched_rule_priority request_creation_time
"actions_executed" "redirect_url" "error_reason"
"target:port_list" "target_status_code_list" "classification"
"classification_reason"
```

## Querying Logs with Athena

The real power of ALB logs comes from querying them with Athena.

```hcl
# Athena database for ALB logs
resource "aws_athena_database" "alb_logs" {
  name   = "alb_logs"
  bucket = aws_s3_bucket.athena_results.id
}

# S3 bucket for Athena query results
resource "aws_s3_bucket" "athena_results" {
  bucket_prefix = "athena-results-"
}

# Glue table for ALB log structure
resource "aws_glue_catalog_table" "alb_logs" {
  name          = "alb_access_logs"
  database_name = aws_athena_database.alb_logs.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "input.regex"            = "([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[0-9]*) (-|[0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) (.*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^\\s]+?)\" \"([^\\s]+)\" \"([^ ]*)\" \"([^ ]*)\""
    "serialization.format"  = "1"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.alb_logs.id}/alb-logs/AWSLogs/${data.aws_caller_identity.current.account_id}/elasticloadbalancing/${data.aws_region.current.name}/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.serde2.RegexSerDe"
    }

    columns {
      name = "type"
      type = "string"
    }
    columns {
      name = "time"
      type = "string"
    }
    columns {
      name = "elb"
      type = "string"
    }
    columns {
      name = "client_ip"
      type = "string"
    }
    columns {
      name = "client_port"
      type = "int"
    }
    columns {
      name = "target_ip"
      type = "string"
    }
    columns {
      name = "target_port"
      type = "int"
    }
    columns {
      name = "request_processing_time"
      type = "double"
    }
    columns {
      name = "target_processing_time"
      type = "double"
    }
    columns {
      name = "response_processing_time"
      type = "double"
    }
    columns {
      name = "elb_status_code"
      type = "int"
    }
    columns {
      name = "target_status_code"
      type = "string"
    }
    columns {
      name = "received_bytes"
      type = "bigint"
    }
    columns {
      name = "sent_bytes"
      type = "bigint"
    }
    columns {
      name = "request_verb"
      type = "string"
    }
    columns {
      name = "request_url"
      type = "string"
    }
    columns {
      name = "request_proto"
      type = "string"
    }
    columns {
      name = "user_agent"
      type = "string"
    }
    columns {
      name = "ssl_cipher"
      type = "string"
    }
    columns {
      name = "ssl_protocol"
      type = "string"
    }
  }
}
```

Useful Athena queries once the table is set up:

```sql
-- Top 10 slowest requests in the last 24 hours
SELECT time, request_url, target_processing_time, elb_status_code
FROM alb_access_logs
WHERE target_processing_time > 1.0
ORDER BY target_processing_time DESC
LIMIT 10;

-- Error rate by path
SELECT request_url,
       COUNT(*) as total_requests,
       SUM(CASE WHEN elb_status_code >= 500 THEN 1 ELSE 0 END) as errors,
       ROUND(SUM(CASE WHEN elb_status_code >= 500 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 2) as error_rate
FROM alb_access_logs
GROUP BY request_url
ORDER BY error_rate DESC
LIMIT 20;

-- Requests per minute over time
SELECT date_trunc('minute', from_iso8601_timestamp(time)) as minute,
       COUNT(*) as request_count
FROM alb_access_logs
GROUP BY 1
ORDER BY 1;
```

## Multi-ALB Logging Configuration

When you have multiple ALBs, store logs in the same bucket with different prefixes.

```hcl
locals {
  albs = {
    public  = { name = "public-alb", internal = false, subnets = var.public_subnet_ids }
    private = { name = "private-alb", internal = true, subnets = var.private_subnet_ids }
  }
}

resource "aws_lb" "albs" {
  for_each = local.albs

  name               = each.value.name
  internal           = each.value.internal
  load_balancer_type = "application"
  subnets            = each.value.subnets
  security_groups    = [aws_security_group.alb[each.key].id]

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = each.key  # "public" or "private" prefix
    enabled = true
  }

  depends_on = [aws_s3_bucket_policy.alb_logs]
}
```

Update the bucket policy to allow both prefixes:

```hcl
resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.current.arn
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*/AWSLogs/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*/AWSLogs/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}
```

## Troubleshooting

If logs aren't appearing:

1. **Check the bucket policy** - The ELB service account ID varies by region. Use `data.aws_elb_service_account` to get the correct one.
2. **Check the S3 prefix** - The resource ARN in the bucket policy must match the prefix configured on the ALB.
3. **Wait a few minutes** - ALB logs are delivered every 5 minutes, not in real-time.
4. **Check the bucket region** - The S3 bucket must be in the same region as the ALB.

## Summary

ALB access logs provide critical visibility into your application's traffic. Set them up with proper encryption, lifecycle rules for cost management, and Athena tables for analysis. The initial setup requires careful attention to the bucket policy and regional service account, but once configured, you get a continuous stream of detailed request data that's invaluable for troubleshooting and security analysis.

For more ALB topics, see our guides on [creating ALB listener rules](https://oneuptime.com/blog/post/2026-02-23-create-alb-listener-rules-with-terraform/view) and [configuring ALB health checks](https://oneuptime.com/blog/post/2026-02-23-configure-alb-health-checks-in-terraform/view).
