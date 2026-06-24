# How to Configure ELB Access Logging with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ELB, ALB, NLB, Access Logging, Observability, Infrastructure as Code

Description: Learn how to enable access logging for AWS Application Load Balancers and Network Load Balancers using OpenTofu to capture detailed request records for troubleshooting and compliance.

ALB access logs capture detailed request information including client IP, request paths, response codes, latency, and target responses. NLB access logs capture TLS connection details. Managing log configuration in OpenTofu ensures every load balancer in your environment has logging enabled consistently.

## ALB Access Logging

```hcl
# S3 bucket to store load balancer access logs

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_s3_bucket" "alb_logs" {
  bucket = "alb-access-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"
    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 90
    }
  }
}

# Bucket policy to allow ALB and NLB log delivery

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowALBLogDelivery"
        Effect    = "Allow"
        Principal = { Service = "logdelivery.elasticloadbalancing.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.alb_logs.arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
      },
      {
        Sid       = "AllowNLBLogDeliveryAclCheck"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.alb_logs.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      },
      {
        Sid       = "AllowNLBLogDeliveryWrite"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.alb_logs.arn}/nlb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"      = "bucket-owner-full-control"
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      }
    ]
  })
}

# Application Load Balancer with access logging enabled
resource "aws_lb" "main" {
  name               = "production-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"          # Organizes logs under alb/ prefix
    enabled = true
  }

  depends_on = [aws_s3_bucket_policy.alb_logs]

  tags = {
    Environment = var.environment
  }
}
```

## NLB Access Logging

```hcl
# Network Load Balancer with access logging
# NLB access logs are created only for TLS listeners
resource "aws_lb" "nlb" {
  name               = "production-nlb"
  internal           = false
  load_balancer_type = "network"
  subnets            = var.public_subnet_ids

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "nlb"
    enabled = true
  }

  # Enable cross-zone load balancing
  enable_cross_zone_load_balancing = true

  depends_on = [aws_s3_bucket_policy.alb_logs]
}
```

## Athena Named Query for Log Analysis

```hcl
resource "aws_athena_database" "alb_logs" {
  name   = "alb_access_logs"
  bucket = aws_s3_bucket.alb_logs.id
}

# Stores the CREATE TABLE statement as a named query to run in Athena
resource "aws_athena_named_query" "create_table" {
  name      = "create-alb-logs-table"
  database  = aws_athena_database.alb_logs.name
  workgroup = "primary"

  query = <<-EOT
    CREATE EXTERNAL TABLE IF NOT EXISTS alb_access_logs (
      type               string,
      time               string,
      elb                string,
      client_ip          string,
      client_port        int,
      target_ip          string,
      target_port        int,
      request_processing_time double,
      target_processing_time double,
      response_processing_time double,
      elb_status_code    int,
      target_status_code string,
      received_bytes     bigint,
      sent_bytes         bigint,
      request_verb       string,
      request_url        string,
      request_proto      string,
      user_agent         string,
      ssl_cipher         string,
      ssl_protocol       string,
      target_group_arn   string,
      trace_id           string,
      domain_name        string,
      chosen_cert_arn    string,
      matched_rule_priority string,
      request_creation_time string,
      actions_executed   string,
      redirect_url       string,
      lambda_error_reason string,
      target_port_list   string,
      target_status_code_list string,
      classification     string,
      classification_reason string,
      conn_trace_id      string
    )
    ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe'
    WITH SERDEPROPERTIES (
      'serialization.format' = '1',
      'input.regex' = '([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) (.*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^\\s]+?)\" \"([^\\s]+)\" \"([^ ]*)\" \"([^ ]*)\" ?([^ ]*)? ?( .*)?'
    )
    LOCATION 's3://${aws_s3_bucket.alb_logs.id}/alb/';
  EOT
}
```

## CloudWatch Alarms on 5xx Errors

```hcl
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_description = "ALB backend returning 5xx errors"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "alb-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 1  # 1 second P99 latency threshold

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_description = "ALB p99 latency exceeds 1 second"
  alarm_actions     = [aws_sns_topic.alerts.arn]
}
```

## Conclusion

ELB access logging in OpenTofu ensures every load balancer has consistent log collection. Store logs in a dedicated S3 bucket with lifecycle rules to manage cost, use Athena named queries for ad-hoc SQL analysis of ALB access patterns, and combine with CloudWatch metrics alarms for real-time alerting on error rates and latency. For ALBs, configure the S3 bucket policy for the ELB log delivery service, and for NLB access logs include the required `delivery.logs.amazonaws.com` permissions and a TLS listener.
