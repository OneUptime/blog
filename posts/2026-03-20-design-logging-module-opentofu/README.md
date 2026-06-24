# How to Design a Logging Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, CloudWatch Logs, S3, AWS, Module, Logging

Description: Learn how to design a reusable logging module for OpenTofu that creates CloudWatch log groups, S3 log buckets, and log export configurations with retention policies.

## Introduction

A logging module standardizes log infrastructure: CloudWatch log groups with appropriate retention periods, optional S3 archival buckets for long-term storage, and metric filters for extracting signals from log data.

## variables.tf

```hcl
variable "service_name"      { type = string }
variable "environment"       { type = string }
variable "log_retention_days" { type = number; default = 30 }

variable "log_groups" {
  description = "Map of log group configurations"
  type = map(object({
    retention_days = optional(number)
    kms_key_id     = optional(string)
  }))
  default = {}
}

variable "enable_s3_archive" { type = bool; default = false }
variable "s3_archive_days"   { type = number; default = 90 }

variable "metric_filters" {
  type = map(object({
    log_group_name = string
    pattern        = string
    metric_namespace = string
    metric_name    = string
    metric_value   = string
  }))
  default = {}
}

variable "tags" { type = map(string); default = {} }
```

## main.tf

```hcl
locals {
  tags = merge({ Service = var.service_name, Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)

  # Build a complete map of log groups with resolved retention
  resolved_log_groups = {
    for name, config in var.log_groups :
    name => merge(config, {
      retention_days = config.retention_days != null ? config.retention_days : var.log_retention_days
    })
  }
}

resource "aws_cloudwatch_log_group" "groups" {
  for_each = local.resolved_log_groups

  name              = "/app/${var.service_name}/${each.key}"
  retention_in_days = each.value.retention_days
  kms_key_id        = each.value.kms_key_id

  tags = merge(local.tags, { LogGroup = each.key })
}

# S3 bucket for log archival

resource "aws_s3_bucket" "logs" {
  count  = var.enable_s3_archive ? 1 : 0
  bucket = "${var.service_name}-${var.environment}-logs-${data.aws_caller_identity.current.account_id}"
  tags   = local.tags
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count  = var.enable_s3_archive ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  rule {
    id     = "archive-and-expire"
    status = "Enabled"

    transition {
      days          = var.s3_archive_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.s3_archive_days * 4  # Delete after 4x the transition period
    }
  }
}

# CloudWatch Logs metric filters
resource "aws_cloudwatch_log_metric_filter" "filters" {
  for_each = var.metric_filters

  name           = "${var.service_name}-${each.key}"
  pattern        = each.value.pattern
  log_group_name = aws_cloudwatch_log_group.groups[each.value.log_group_name].name

  metric_transformation {
    name      = each.value.metric_name
    namespace = each.value.metric_namespace
    value     = each.value.metric_value
  }
}

data "aws_caller_identity" "current" {}
```

## outputs.tf

```hcl
output "log_group_names" {
  value = { for k, lg in aws_cloudwatch_log_group.groups : k => lg.name }
}

output "log_group_arns" {
  value = { for k, lg in aws_cloudwatch_log_group.groups : k => lg.arn }
}

output "s3_log_bucket" {
  value = var.enable_s3_archive ? aws_s3_bucket.logs[0].bucket : null
}
```

## Example Usage

```hcl
module "logging" {
  source       = "./modules/logging"
  service_name = "api-service"
  environment  = "prod"
  log_retention_days = 90

  log_groups = {
    "application" = { retention_days = 90 }
    "access"      = { retention_days = 30 }
    "errors"      = { retention_days = 365 }
  }

  enable_s3_archive = true

  metric_filters = {
    "error-count" = {
      log_group_name   = "errors"
      pattern          = "ERROR"
      metric_namespace = "Application/Logs"
      metric_name      = "ErrorCount"
      metric_value     = "1"
    }
  }
}
```

## Conclusion

This logging module standardizes how services store and retain logs. By centralizing log group creation with configurable retention per group, organizations can enforce compliance requirements while letting teams customize retention for different log types. Metric filters bridge the gap between unstructured logs and CloudWatch alarms.
