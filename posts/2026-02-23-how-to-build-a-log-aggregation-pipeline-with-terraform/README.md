# How to Build a Log Aggregation Pipeline with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Logging, Elasticsearch, Kinesis, CloudWatch, Infrastructure Patterns, Observability

Description: Build a centralized log aggregation pipeline with Terraform using Kinesis Data Firehose, OpenSearch, and CloudWatch for collecting, processing, and analyzing logs at scale.

---

When you are running dozens of services across multiple accounts, logs are scattered everywhere. Some are in CloudWatch, some in container stdout, some in files on EC2 instances. Without a centralized log aggregation pipeline, debugging a production issue means SSH-ing into boxes and grepping through files, which is not a great experience at 3 AM.

In this guide, we will build a centralized log aggregation pipeline on AWS using Terraform. Logs from all your services will flow into a single place where you can search, analyze, and alert on them.

## Architecture

The pipeline has three stages:

1. **Collection**: CloudWatch Logs, Kinesis agents, and Fluent Bit collect logs from various sources
2. **Processing**: Kinesis Data Firehose buffers, transforms, and delivers logs
3. **Storage and Analysis**: OpenSearch for search and visualization, S3 for long-term archive

## Log Collection with CloudWatch

Most AWS services already send logs to CloudWatch. The first step is making sure all your services are sending logs there:

```hcl
# Standard log group for an ECS service
resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${var.service_name}"
  retention_in_days = 30 # Short retention since we archive to S3
  kms_key_id        = aws_kms_key.logs.arn

  tags = {
    Service     = var.service_name
    Environment = var.environment
  }
}

# Log group for Lambda functions
resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = var.lambda_functions
  name              = "/aws/lambda/${each.key}"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.logs.arn
}

# Log group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.api_name}"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.logs.arn
}
```

## CloudWatch Subscription Filters

Subscription filters stream logs from CloudWatch to Kinesis Data Firehose in real time:

```hcl
# Subscription filter to send logs to Kinesis Firehose
resource "aws_cloudwatch_log_subscription_filter" "to_firehose" {
  for_each = var.log_groups_to_aggregate

  name            = "${each.key}-to-firehose"
  log_group_name  = each.value
  filter_pattern  = "" # Empty pattern captures all logs
  destination_arn = aws_kinesis_firehose_delivery_stream.logs.arn
  role_arn        = aws_iam_role.cloudwatch_to_firehose.arn
}

# IAM role for CloudWatch to write to Firehose
resource "aws_iam_role" "cloudwatch_to_firehose" {
  name = "${var.project_name}-cw-to-firehose"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "cloudwatch_to_firehose" {
  name = "firehose-put"
  role = aws_iam_role.cloudwatch_to_firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "firehose:PutRecord",
          "firehose:PutRecordBatch"
        ]
        Resource = [aws_kinesis_firehose_delivery_stream.logs.arn]
      }
    ]
  })
}
```

## Kinesis Data Firehose

Firehose acts as the central pipeline, buffering logs and delivering them to OpenSearch and S3:

```hcl
resource "aws_kinesis_firehose_delivery_stream" "logs" {
  name        = "${var.project_name}-log-pipeline"
  destination = "opensearch"

  opensearch_configuration {
    domain_arn = aws_opensearch_domain.logs.arn
    role_arn   = aws_iam_role.firehose.arn
    index_name = "logs"

    # Rotate indices daily
    index_rotation_period = "OneDay"

    # Buffer settings
    buffering_interval = 60  # seconds
    buffering_size     = 5   # MB

    # Send failed records to S3
    s3_backup_mode = "AllDocuments"

    s3_configuration {
      role_arn           = aws_iam_role.firehose.arn
      bucket_arn         = aws_s3_bucket.log_archive.arn
      prefix             = "logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
      buffering_interval = 300
      buffering_size     = 128
      compression_format = "GZIP"
    }

    # Transform logs with Lambda before indexing
    processing_configuration {
      enabled = true

      processors {
        type = "Lambda"

        parameters {
          parameter_name  = "LambdaArn"
          parameter_value = "${aws_lambda_function.log_transformer.arn}:$LATEST"
        }

        parameters {
          parameter_name  = "BufferSizeInMBs"
          parameter_value = "1"
        }

        parameters {
          parameter_name  = "BufferIntervalInSeconds"
          parameter_value = "60"
        }
      }
    }

    retry_duration = 300

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "opensearch-delivery"
    }
  }
}
```

## OpenSearch Domain

OpenSearch (the successor to Elasticsearch) provides powerful search and visualization:

```hcl
resource "aws_opensearch_domain" "logs" {
  domain_name    = "${var.project_name}-logs"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type            = "r6g.large.search"
    instance_count           = 3
    zone_awareness_enabled   = true
    dedicated_master_enabled = true
    dedicated_master_type    = "m6g.large.search"
    dedicated_master_count   = 3

    zone_awareness_config {
      availability_zone_count = 3
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 500
    iops        = 3000
    throughput  = 125
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.logs.arn
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-PFS-2023-10"
  }

  vpc_options {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.opensearch.id]
  }

  advanced_options = {
    "rest.action.multi.allow_explicit_index" = "true"
    "indices.query.bool.max_clause_count"    = "8096"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_slow.arn
    log_type                 = "SEARCH_SLOW_LOGS"
  }

  tags = {
    Purpose = "log-aggregation"
  }
}

# Security group for OpenSearch
resource "aws_security_group" "opensearch" {
  name_prefix = "${var.project_name}-opensearch-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.firehose.id, aws_security_group.grafana.id]
    description     = "HTTPS from Firehose and Grafana"
  }
}
```

## S3 Archive for Long-Term Retention

All logs also go to S3 for cost-effective long-term storage:

```hcl
resource "aws_s3_bucket" "log_archive" {
  bucket = "${var.project_name}-log-archive-${var.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555 # 7 years for compliance
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.logs.arn
    }
  }
}
```

## Log Transformer Lambda

The transformer Lambda normalizes log formats before they reach OpenSearch:

```hcl
resource "aws_lambda_function" "log_transformer" {
  filename         = "${path.module}/lambda/log-transformer.zip"
  function_name    = "${var.project_name}-log-transformer"
  role             = aws_iam_role.log_transformer.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 300
  source_code_hash = filebase64sha256("${path.module}/lambda/log-transformer.zip")

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}
```

## Index Lifecycle Management

Set up ISM (Index State Management) policies so old indices get cleaned up automatically. You can manage this through the OpenSearch API, but the Terraform OpenSearch provider also supports it.

## Cross-Account Log Collection

For multi-account environments, use CloudWatch Logs destinations to collect logs from spoke accounts:

```hcl
# Destination in the central logging account
resource "aws_cloudwatch_log_destination" "central" {
  name       = "${var.project_name}-central-logs"
  role_arn   = aws_iam_role.log_destination.arn
  target_arn = aws_kinesis_firehose_delivery_stream.logs.arn
}

# Policy allowing other accounts to send logs
resource "aws_cloudwatch_log_destination_policy" "central" {
  destination_name = aws_cloudwatch_log_destination.central.name

  access_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowOrgAccounts"
        Effect    = "Allow"
        Principal = { AWS = var.organization_account_ids }
        Action    = "logs:PutSubscriptionFilter"
        Resource  = aws_cloudwatch_log_destination.central.arn
      }
    ]
  })
}
```

For alerting on log patterns, integrate this pipeline with your [monitoring and alerting stack](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Wrapping Up

A centralized log aggregation pipeline eliminates the chaos of scattered logs and gives your team a single place to search and analyze operational data. The Terraform approach ensures every environment gets the same pipeline, and the entire setup is auditable through code reviews. Start with CloudWatch collection, add Firehose for processing, and use OpenSearch for search. Keep S3 as your long-term archive for compliance. That combination covers most operational logging needs.
