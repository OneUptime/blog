# How to Create AWS CloudTrail Organization Trails with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudTrail, Compliance, Infrastructure as Code

Description: Learn how to create AWS CloudTrail organization trails with OpenTofu to capture API activity across all accounts in your AWS Organization for centralized auditing.

Organization trails automatically capture management events across every account in your AWS Organization and can also capture supported data events when you add event selectors. Create the trail from your organization management account and deliver logs to a central S3 bucket. Managing it in OpenTofu ensures consistent audit logging coverage with tamper-evident log validation.

## Organization Trail

```hcl
data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

data "aws_organizations_organization" "current" {}

locals {
  cloudtrail_name = "organization-trail"
  cloudtrail_arn  = "arn:${data.aws_partition.current.partition}:cloudtrail:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:trail/${local.cloudtrail_name}"
}

resource "aws_cloudtrail" "organization" {
  depends_on = [
    aws_iam_role_policy.cloudtrail_cloudwatch,
    aws_s3_bucket_object_lock_configuration.cloudtrail,
    aws_s3_bucket_policy.cloudtrail
  ]

  name                          = local.cloudtrail_name
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  is_organization_trail         = true
  enable_log_file_validation    = true  # Delivers digest files for integrity validation
  kms_key_id                    = aws_kms_key.cloudtrail.arn

  # Capture all S3 data events
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]  # All S3 buckets
    }
  }

  # Capture all Lambda invocations
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::Lambda::Function"
      values = ["arn:aws:lambda"]
    }
  }

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch.arn

  tags = {
    Purpose     = "Organization-wide audit trail"
    Compliance  = "SOC2,PCI-DSS,HIPAA"
  }
}
```

## S3 Bucket for CloudTrail Logs

```hcl
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "org-cloudtrail-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck20150319"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
        Condition = {
          StringEquals = {
            "aws:SourceArn" = local.cloudtrail_arn
          }
        }
      },
      {
        Sid    = "AWSCloudTrailWrite20150319"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
            "aws:SourceArn" = local.cloudtrail_arn
          }
        }
      },
      {
        Sid    = "AWSCloudTrailOrganizationWrite20150319"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${data.aws_organizations_organization.current.id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
            "aws:SourceArn" = local.cloudtrail_arn
          }
        }
      }
    ]
  })
}

# Object lock to prevent log deletion (compliance)

resource "aws_s3_bucket_object_lock_configuration" "cloudtrail" {
  bucket     = aws_s3_bucket.cloudtrail.id
  depends_on = [aws_s3_bucket_versioning.cloudtrail]

  rule {
    default_retention {
      mode  = "GOVERNANCE"
      years = 7
    }
  }
}
```

## CloudWatch Log Group for CloudTrail

```hcl
resource "aws_kms_key" "cloudtrail" {
  description             = "KMS key for CloudTrail log encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableIamUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudTrailEncryptLogs"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "kms:GenerateDataKey*"
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:SourceArn" = local.cloudtrail_arn
          }
          StringLike = {
            "kms:EncryptionContext:aws:cloudtrail:arn" = "arn:${data.aws_partition.current.partition}:cloudtrail:*:${data.aws_caller_identity.current.account_id}:trail/*"
          }
        }
      },
      {
        Sid    = "AllowCloudTrailDescribeKey"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "kms:DescribeKey"
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:SourceArn" = local.cloudtrail_arn
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/organization"
  retention_in_days = 90  # Keep in CloudWatch for 90 days for querying
}

resource "aws_iam_role" "cloudtrail_cloudwatch" {
  name = "cloudtrail-to-cloudwatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "cloudtrail_cloudwatch" {
  role = aws_iam_role.cloudtrail_cloudwatch.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AWSCloudTrailCreateLogStream20141101"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream"]
        Resource = [
          "${aws_cloudwatch_log_group.cloudtrail.arn}:log-stream:${data.aws_caller_identity.current.account_id}_CloudTrail_${data.aws_region.current.region}*",
          "${aws_cloudwatch_log_group.cloudtrail.arn}:log-stream:${data.aws_organizations_organization.current.id}_*"
        ]
      },
      {
        Sid      = "AWSCloudTrailPutLogEvents20141101"
        Effect   = "Allow"
        Action   = ["logs:PutLogEvents"]
        Resource = [
          "${aws_cloudwatch_log_group.cloudtrail.arn}:log-stream:${data.aws_caller_identity.current.account_id}_CloudTrail_${data.aws_region.current.region}*",
          "${aws_cloudwatch_log_group.cloudtrail.arn}:log-stream:${data.aws_organizations_organization.current.id}_*"
        ]
      }
    ]
  })
}
```

## CloudWatch Alarms for Security Events

```hcl
resource "aws_sns_topic" "security_alerts" {
  name = "cloudtrail-security-alerts"
}

# Alert on root account usage
resource "aws_cloudwatch_log_metric_filter" "root_usage" {
  name           = "root-account-usage"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = "{ $.userIdentity.type = \"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != \"AwsServiceEvent\" }"

  metric_transformation {
    name      = "RootAccountUsageCount"
    namespace = "SecurityMetrics"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "root_usage" {
  alarm_name          = "root-account-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RootAccountUsageCount"
  namespace           = "SecurityMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Root account was used - investigate immediately"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
}
```

## Conclusion

AWS CloudTrail organization trails in OpenTofu provide centralized, tamper-evident audit logging across AWS Organization accounts. Enable S3 and Lambda data events to capture supported data plane activity, use object lock on the S3 bucket for retention protection, stream to CloudWatch Logs for real-time querying, and create metric filters and alarms for critical security events like root account usage and console login failures.
