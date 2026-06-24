# How to Design a Compliance Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Compliance, AWS Config, Security Hub, Module, Governance

Description: Learn how to design a compliance module for OpenTofu that enables AWS Config rules, Security Hub standards, and CloudTrail logging to enforce regulatory requirements.

## Introduction

Compliance infrastructure needs to be consistent across all accounts and environments. A compliance module encapsulates AWS Config rule sets, Security Hub standards, and CloudTrail configuration - making compliance-as-code reproducible.

## variables.tf

```hcl
variable "environment" {
  type = string
}

variable "enable_config" {
  type    = bool
  default = true
}

variable "enable_security_hub" {
  type    = bool
  default = true
}

variable "enable_guardduty" {
  type    = bool
  default = true
}

variable "enable_cloudtrail" {
  type    = bool
  default = true
}

variable "cloudtrail_s3_bucket" {
  description = "Existing S3 bucket name for CloudTrail log delivery"
  type        = string
  default     = ""
}

variable "config_s3_bucket" {
  description = "Optional existing S3 bucket name for AWS Config delivery. Defaults to cloudtrail_s3_bucket when omitted."
  type        = string
  default     = ""
}

variable "config_rules" {
  description = "AWS Config managed rules to enable. Choose rules supported in the target region."
  type = map(object({
    source_identifier = string
    input_parameters  = optional(map(string), {})
  }))
  default = {
    "s3-bucket-public-read-prohibited" = {
      source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
    }
    "s3-bucket-public-write-prohibited" = {
      source_identifier = "S3_BUCKET_PUBLIC_WRITE_PROHIBITED"
    }
    "cloudtrail-enabled" = {
      source_identifier = "CLOUD_TRAIL_ENABLED"
    }
    "multi-region-cloudtrail-enabled" = {
      source_identifier = "MULTI_REGION_CLOUD_TRAIL_ENABLED"
    }
  }
}

variable "security_hub_standards" {
  description = "Security Hub standards ARNs or standards/* paths to subscribe to in the current region"
  type    = list(string)
  default = [
    "standards/aws-foundational-security-best-practices/v/1.0.0",
    "standards/cis-aws-foundations-benchmark/v/3.0.0"
  ]
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf

```hcl
data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_region" "current" {}

data "aws_iam_policy_document" "config_assume_role" {
  count = var.enable_config ? 1 : 0

  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

locals {
  config_s3_bucket = var.config_s3_bucket != "" ? var.config_s3_bucket : var.cloudtrail_s3_bucket
  tags             = merge({ Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)
}

# AWS Config (requires an existing S3 bucket for the delivery channel)

resource "aws_config_configuration_recorder" "main" {
  count    = var.enable_config && local.config_s3_bucket != "" ? 1 : 0
  name     = "default"
  role_arn = aws_iam_role.config[0].arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_iam_role" "config" {
  count              = var.enable_config && local.config_s3_bucket != "" ? 1 : 0
  name               = "aws-config-role"
  assume_role_policy = data.aws_iam_policy_document.config_assume_role[0].json
}

resource "aws_iam_role_policy_attachment" "config" {
  count      = var.enable_config && local.config_s3_bucket != "" ? 1 : 0
  role       = aws_iam_role.config[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

data "aws_iam_policy_document" "config_bucket" {
  count = var.enable_config && local.config_s3_bucket != "" ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketAcl",
    ]
    resources = ["arn:${data.aws_partition.current.partition}:s3:::${local.config_s3_bucket}"]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectAcl",
    ]
    resources = ["arn:${data.aws_partition.current.partition}:s3:::${local.config_s3_bucket}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}

resource "aws_iam_role_policy" "config_bucket" {
  count  = var.enable_config && local.config_s3_bucket != "" ? 1 : 0
  name   = "aws-config-s3-access"
  role   = aws_iam_role.config[0].id
  policy = data.aws_iam_policy_document.config_bucket[0].json
}

resource "aws_config_delivery_channel" "main" {
  count          = var.enable_config && local.config_s3_bucket != "" ? 1 : 0
  name           = "default"
  s3_bucket_name = local.config_s3_bucket
  depends_on     = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  count      = var.enable_config && local.config_s3_bucket != "" ? 1 : 0
  name       = aws_config_configuration_recorder.main[0].name
  is_enabled = true

  depends_on = [
    aws_config_delivery_channel.main,
    aws_iam_role_policy_attachment.config,
    aws_iam_role_policy.config_bucket,
  ]
}

resource "aws_config_config_rule" "rules" {
  for_each = var.enable_config && local.config_s3_bucket != "" ? var.config_rules : {}

  name             = each.key
  input_parameters = length(each.value.input_parameters) > 0 ? jsonencode(each.value.input_parameters) : null

  source {
    owner             = "AWS"
    source_identifier = each.value.source_identifier
  }

  depends_on = [aws_config_configuration_recorder_status.main]
}

# AWS Security Hub
resource "aws_securityhub_account" "main" {
  count                    = var.enable_security_hub ? 1 : 0
  enable_default_standards = false
}

resource "aws_securityhub_standards_subscription" "standards" {
  for_each = var.enable_security_hub ? toset(var.security_hub_standards) : toset([])
  standards_arn = startswith(each.value, "arn:")
    ? each.value
    : "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.region}::${each.value}"
  depends_on = [aws_securityhub_account.main]
}

# GuardDuty
resource "aws_guardduty_detector" "main" {
  count  = var.enable_guardduty ? 1 : 0
  enable = true
  tags   = local.tags
}

# CloudTrail (requires the target bucket to already allow CloudTrail writes)
resource "aws_cloudtrail" "main" {
  count                         = var.enable_cloudtrail && var.cloudtrail_s3_bucket != "" ? 1 : 0
  name                          = "compliance-trail"
  s3_bucket_name                = var.cloudtrail_s3_bucket
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  tags                          = local.tags
}
```

## outputs.tf

```hcl
output "config_enabled" {
  value = length(aws_config_configuration_recorder_status.main) > 0 ? aws_config_configuration_recorder_status.main[0].is_enabled : false
}

output "security_hub_enabled" {
  value = length(aws_securityhub_account.main) > 0
}

output "guardduty_detector_id" {
  value = var.enable_guardduty ? aws_guardduty_detector.main[0].id : null
}
output "config_rule_arns" {
  value = { for k, rule in aws_config_config_rule.rules : k => rule.arn }
}
```

## Conclusion

This compliance module applies a standard security baseline to AWS accounts by enabling AWS Config rules, Security Hub standards, GuardDuty threat detection, and CloudTrail audit logging. Applying it as part of account provisioning, with S3 buckets already prepared for AWS Config and CloudTrail delivery, helps every account start with a consistent baseline aligned with organizational requirements.
