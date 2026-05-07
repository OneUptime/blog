# How to Set Up AWS CloudTrail with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudTrail, Audit Logging, Security

Description: Learn how to configure AWS CloudTrail with OpenTofu to capture API activity across your AWS account and store logs in S3 with encryption and integrity validation.

## Introduction

AWS CloudTrail records API calls made to your AWS account, providing an audit trail for security analysis, compliance, and troubleshooting. This guide sets up a multi-region trail with S3 log delivery, KMS encryption, and log file validation.

## S3 Bucket for Trail Logs

CloudTrail needs a bucket with a specific bucket policy allowing it to deliver logs:

```hcl
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "${var.account_id}-cloudtrail-logs"
  tags   = { Name = "cloudtrail-logs" }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket                  = aws_s3_bucket.cloudtrail.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_policy_document" "cloudtrail_bucket" {
  statement {
    sid       = "AWSCloudTrailAclCheck"
    effect    = "Allow"
    principals { type = "Service"; identifiers = ["cloudtrail.amazonaws.com"] }
    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.cloudtrail.arn]
  }

  statement {
    sid       = "AWSCloudTrailWrite"
    effect    = "Allow"
    principals { type = "Service"; identifiers = ["cloudtrail.amazonaws.com"] }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${var.account_id}/*"]
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket     = aws_s3_bucket.cloudtrail.id
  policy     = data.aws_iam_policy_document.cloudtrail_bucket.json
  depends_on = [aws_s3_bucket_public_access_block.cloudtrail]
}
```

## KMS Key for Encryption

```hcl
data "aws_region" "current" {}

data "aws_iam_policy_document" "cloudtrail_kms" {
  statement {
    sid    = "EnableRootPermissions"
    effect = "Allow"
    principals { type = "AWS"; identifiers = ["arn:aws:iam::${var.account_id}:root"] }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowCloudTrailEncryptLogs"
    effect = "Allow"
    principals { type = "Service"; identifiers = ["cloudtrail.amazonaws.com"] }
    actions   = ["kms:GenerateDataKey*"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = ["arn:aws:cloudtrail:${data.aws_region.current.name}:${var.account_id}:trail/${var.name}-trail"]
    }
    condition {
      test     = "StringLike"
      variable = "kms:EncryptionContext:aws:cloudtrail:arn"
      values   = ["arn:aws:cloudtrail:*:${var.account_id}:trail/*"]
    }
  }

  statement {
    sid    = "AllowCloudTrailDescribeKey"
    effect = "Allow"
    principals { type = "Service"; identifiers = ["cloudtrail.amazonaws.com"] }
    actions   = ["kms:DescribeKey"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = ["arn:aws:cloudtrail:${data.aws_region.current.name}:${var.account_id}:trail/${var.name}-trail"]
    }
  }

  statement {
    sid    = "AllowCloudWatchLogsUseKey"
    effect = "Allow"
    principals { type = "Service"; identifiers = ["logs.${data.aws_region.current.name}.amazonaws.com"] }
    actions   = ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
    resources = ["*"]
    condition {
      test     = "ArnEquals"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = ["arn:aws:logs:${data.aws_region.current.name}:${var.account_id}:log-group:/aws/cloudtrail/${var.name}"]
    }
  }
}

resource "aws_kms_key" "cloudtrail" {
  description             = "KMS key for CloudTrail log encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.cloudtrail_kms.json
}

resource "aws_kms_alias" "cloudtrail" {
  name          = "alias/cloudtrail"
  target_key_id = aws_kms_key.cloudtrail.key_id
}
```

## CloudTrail Trail

```hcl
resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/${var.name}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.cloudtrail.arn
}

data "aws_iam_policy_document" "cloudtrail_cw_assume_role" {
  statement {
    effect = "Allow"
    principals { type = "Service"; identifiers = ["cloudtrail.amazonaws.com"] }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "cloudtrail_cw" {
  name               = "${var.name}-cloudtrail-cloudwatch-logs"
  assume_role_policy = data.aws_iam_policy_document.cloudtrail_cw_assume_role.json
}

data "aws_iam_policy_document" "cloudtrail_cw" {
  statement {
    effect    = "Allow"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.cloudtrail.arn}:log-stream:*"]
  }
}

resource "aws_iam_role_policy" "cloudtrail_cw" {
  name   = "${var.name}-cloudtrail-cloudwatch-logs"
  role   = aws_iam_role.cloudtrail_cw.id
  policy = data.aws_iam_policy_document.cloudtrail_cw.json
}

resource "aws_cloudtrail" "main" {
  name                          = "${var.name}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.cloudtrail.arn

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cw.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }

  tags       = { Name = "${var.name}-trail" }
  depends_on = [aws_s3_bucket_policy.cloudtrail, aws_iam_role_policy.cloudtrail_cw]
}
```

## Root Account Usage Alarm

```hcl
resource "aws_sns_topic" "security_alerts" {
  name = "${var.name}-security-alerts"
}

resource "aws_cloudwatch_log_metric_filter" "root_usage" {
  name           = "RootAccountUsage"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = "{$.userIdentity.type=\"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType!=\"AwsServiceEvent\"}"

  metric_transformation {
    name      = "RootAccountUsageEventCount"
    namespace = "CloudTrailMetrics"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "root_usage" {
  alarm_name          = "root-account-usage"
  alarm_description   = "Root account has been used - investigate immediately"
  namespace           = "CloudTrailMetrics"
  metric_name         = "RootAccountUsageEventCount"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 1
  period              = 300
  statistic           = "Sum"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
  treat_missing_data  = "notBreaching"
}
```

## Conclusion

CloudTrail is non-negotiable for security and compliance. Enable log file validation to detect tampering, use KMS encryption for log confidentiality, and forward logs to CloudWatch Logs for real-time alerting on suspicious activity.
