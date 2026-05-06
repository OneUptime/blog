# How to Create CloudWatch Log Groups and Streams with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Log Groups, Log Streams, Logging, Infrastructure as Code

Description: Learn how to create CloudWatch Log Groups and Log Streams with OpenTofu, configure retention policies, and set up KMS encryption for centralized log management.

## Introduction

CloudWatch Log Groups and Log Streams organize application and AWS service logs. Log Groups are containers for related log streams, while Log Streams contain the actual log events from a specific source. Managing these resources with OpenTofu ensures consistent retention policies, encryption, and naming conventions across all environments.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with CloudWatch Logs and AWS KMS permissions

## Step 1: Create Log Groups with Retention Policies

```hcl
# Application log group

resource "aws_cloudwatch_log_group" "app" {
  name              = "/application/${var.project_name}/${var.environment}"
  retention_in_days = 30

  kms_key_id = aws_kms_key.logs.arn

  tags = {
    Name        = "${var.project_name}-app-logs"
    Environment = var.environment
  }
}

# Default Lambda log group (pre-create /aws/lambda/<function-name> when using the default)
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.logs.arn
}

# API Gateway access logs (execution logs use service-managed log groups)
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}"
  retention_in_days = 7
  kms_key_id        = aws_kms_key.logs.arn
}

# ECS task logs
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}/${var.service_name}"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.logs.arn
}
```

## Step 2: Create KMS Key for Log Encryption

```hcl
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_kms_key" "logs" {
  description             = "KMS key for CloudWatch Logs"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Effect    = "Allow"
        Principal = { Service = "logs.${data.aws_region.current.region}.amazonaws.com" }
        Action    = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*",
                     "kms:GenerateDataKey*", "kms:Describe*"]
        Resource  = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      }
    ]
  })
}
```

## Step 3: Create Log Streams

```hcl
# Log streams for specific application instances
resource "aws_cloudwatch_log_stream" "app_instance_1" {
  name           = "instance-1"
  log_group_name = aws_cloudwatch_log_group.app.name
}

resource "aws_cloudwatch_log_stream" "app_instance_2" {
  name           = "instance-2"
  log_group_name = aws_cloudwatch_log_group.app.name
}

# Generate additional streams dynamically for multiple workers
resource "aws_cloudwatch_log_stream" "app_instances" {
  count = var.instance_count

  name           = "worker-${count.index + 1}"
  log_group_name = aws_cloudwatch_log_group.app.name
}
```

## Step 4: Create Multiple Log Groups with for_each

```hcl
locals {
  log_group_configs = {
    api     = { retention = 30, path = "/application/${var.project_name}/api" }
    worker  = { retention = 14, path = "/application/${var.project_name}/worker" }
    cron    = { retention = 7,  path = "/application/${var.project_name}/cron" }
    metrics = { retention = 90, path = "/application/${var.project_name}/metrics" }
  }
}

resource "aws_cloudwatch_log_group" "services" {
  for_each = local.log_group_configs

  name              = each.value.path
  retention_in_days = each.value.retention
  kms_key_id        = aws_kms_key.logs.arn

  tags = {
    Name    = "${var.project_name}-${each.key}-logs"
    Service = each.key
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Tail logs for the Lambda function
aws logs tail /aws/lambda/my-function --follow

# Search for errors in the last hour
aws logs filter-log-events \
  --log-group-name /application/my-project/api \
  --filter-pattern "ERROR" \
  --start-time $(($(date +%s) - 3600))000
```

## Conclusion

Always pre-create CloudWatch Log Groups in OpenTofu rather than allowing services to auto-create them - this ensures retention policies and encryption are applied from the first log entry. Without explicit retention, logs accumulate indefinitely and continue to incur storage charges. Use the KMS key condition `kms:EncryptionContext:aws:logs:arn` to restrict the key to log groups in the intended account and Region, preventing accidental use for other purposes.
