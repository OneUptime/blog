# How to Build a Compliance Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Compliance, Security, AWS Config, Cloud Governance

Description: A practical guide to building automated compliance infrastructure with Terraform including AWS Config rules, audit logging, policy enforcement, and automated remediation.

---

Compliance is one of those things that everyone knows they need but nobody wants to deal with manually. Checking configurations by hand, generating audit reports, and hoping nothing drifts between reviews is a recipe for failure. The good news is that Terraform lets you codify your compliance requirements and enforce them automatically. In this post, we will build a compliance infrastructure that covers AWS Config rules, audit logging, policy enforcement, and automated remediation.

## Why Automate Compliance?

Manual compliance checks do not scale. When you have hundreds of resources across multiple accounts, you cannot rely on spreadsheets and quarterly reviews. Automated compliance gives you continuous monitoring, instant detection of violations, and in many cases, automatic remediation. Plus, when the auditor comes knocking, you can show them your Terraform code as evidence of your controls.

## Architecture Overview

Our compliance infrastructure includes:

- AWS Config for continuous resource monitoring
- Config rules for automated compliance checks
- CloudTrail for audit logging
- S3 buckets with proper access controls for log storage
- Lambda functions for automated remediation
- SNS notifications for compliance violations
- GuardDuty for threat detection

## Enabling AWS Config

First, let us set up AWS Config to record all resource changes.

```hcl
# S3 bucket for Config recordings
resource "aws_s3_bucket" "config" {
  bucket = "company-aws-config-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose   = "compliance"
    ManagedBy = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "config" {
  bucket = aws_s3_bucket.config.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  bucket = aws_s3_bucket.config.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.compliance.arn
    }
  }
}

# Block all public access to the config bucket
resource "aws_s3_bucket_public_access_block" "config" {
  bucket = aws_s3_bucket.config.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# AWS Config recorder
resource "aws_config_configuration_recorder" "main" {
  name     = "default"
  role_arn = aws_iam_role.config_role.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# Delivery channel for Config
resource "aws_config_delivery_channel" "main" {
  name           = "default"
  s3_bucket_name = aws_s3_bucket.config.id
  s3_key_prefix  = "config"
  sns_topic_arn  = aws_sns_topic.compliance_alerts.arn

  snapshot_delivery_properties {
    delivery_frequency = "TwelveHours"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true
  depends_on = [aws_config_delivery_channel.main]
}
```

## Config Rules for Compliance Checks

Now let us define rules that check for common compliance requirements.

```hcl
# Ensure all S3 buckets have encryption enabled
resource "aws_config_config_rule" "s3_encryption" {
  name = "s3-bucket-server-side-encryption-enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure all EBS volumes are encrypted
resource "aws_config_config_rule" "ebs_encryption" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure RDS instances are not publicly accessible
resource "aws_config_config_rule" "rds_public" {
  name = "rds-instance-public-access-check"

  source {
    owner             = "AWS"
    source_identifier = "RDS_INSTANCE_PUBLIC_ACCESS_CHECK"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure CloudTrail is enabled
resource "aws_config_config_rule" "cloudtrail_enabled" {
  name = "cloudtrail-enabled"

  source {
    owner             = "AWS"
    source_identifier = "CLOUD_TRAIL_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure MFA is enabled for IAM users
resource "aws_config_config_rule" "mfa_enabled" {
  name = "iam-user-mfa-enabled"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_MFA_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure no security groups allow unrestricted SSH
resource "aws_config_config_rule" "restricted_ssh" {
  name = "restricted-ssh"

  source {
    owner             = "AWS"
    source_identifier = "INCOMING_SSH_DISABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure VPC flow logs are enabled
resource "aws_config_config_rule" "vpc_flow_logs" {
  name = "vpc-flow-logs-enabled"

  source {
    owner             = "AWS"
    source_identifier = "VPC_FLOW_LOGS_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Custom rule using Lambda for organization-specific checks
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags-check"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key   = "Environment"
    tag2Key   = "Owner"
    tag3Key   = "CostCenter"
    tag4Key   = "ManagedBy"
  })

  depends_on = [aws_config_configuration_recorder.main]
}
```

## CloudTrail for Audit Logging

Every compliance framework requires audit logging. CloudTrail captures every API call.

```hcl
# KMS key for CloudTrail encryption
resource "aws_kms_key" "cloudtrail" {
  description             = "KMS key for CloudTrail encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = data.aws_iam_policy_document.cloudtrail_kms.json
}

# S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "company-cloudtrail-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose = "audit-logging"
  }
}

# Object lock for tamper-proof logs
resource "aws_s3_bucket_object_lock_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 365
    }
  }
}

# CloudTrail trail
resource "aws_cloudtrail" "main" {
  name                       = "organization-trail"
  s3_bucket_name             = aws_s3_bucket.cloudtrail.id
  is_multi_region_trail      = true
  is_organization_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = aws_kms_key.cloudtrail.arn

  # Log management events
  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  # Log S3 data events
  event_selector {
    read_write_type           = "All"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch.arn

  tags = {
    Purpose = "compliance-audit"
  }
}

# CloudWatch log group for real-time analysis
resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/organization"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.cloudtrail.arn
}
```

## Automated Remediation

Detecting violations is only half the battle. Let us auto-remediate some common issues.

```hcl
# Lambda function to remediate unencrypted S3 buckets
resource "aws_lambda_function" "remediate_s3" {
  filename         = "remediate_s3.zip"
  function_name    = "remediate-s3-encryption"
  role             = aws_iam_role.remediation_role.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 60

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.compliance_alerts.arn
    }
  }
}

# Config remediation for S3 encryption
resource "aws_config_remediation_configuration" "s3_encryption" {
  config_rule_name = aws_config_config_rule.s3_encryption.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-EnableS3BucketEncryption"
  automatic        = true

  parameter {
    name           = "BucketName"
    resource_value = "RESOURCE_ID"
  }

  parameter {
    name         = "SSEAlgorithm"
    static_value = "aws:kms"
  }

  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}

# Remediation for open security groups
resource "aws_config_remediation_configuration" "restricted_ssh" {
  config_rule_name = aws_config_config_rule.restricted_ssh.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-DisablePublicAccessForSecurityGroup"
  automatic        = true

  parameter {
    name           = "GroupId"
    resource_value = "RESOURCE_ID"
  }

  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}
```

## GuardDuty for Threat Detection

GuardDuty adds an extra layer by detecting suspicious activity.

```hcl
# Enable GuardDuty
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  finding_publishing_frequency = "FIFTEEN_MINUTES"

  tags = {
    Purpose = "compliance-threat-detection"
  }
}

# SNS notifications for GuardDuty findings
resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  name = "guardduty-high-severity"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{ numeric = [">=", 7] }]
    }
  })
}
```

## Compliance Notifications

Set up proper alerting so violations do not go unnoticed.

```hcl
# SNS topic for compliance alerts
resource "aws_sns_topic" "compliance_alerts" {
  name              = "compliance-violations"
  kms_master_key_id = aws_kms_key.compliance.id
}

resource "aws_sns_topic_subscription" "security_team" {
  topic_arn = aws_sns_topic.compliance_alerts.arn
  protocol  = "email"
  endpoint  = "security@company.com"
}

# EventBridge rule for non-compliant Config evaluations
resource "aws_cloudwatch_event_rule" "compliance_change" {
  name = "config-compliance-change"

  event_pattern = jsonencode({
    source      = ["aws.config"]
    detail-type = ["Config Rules Compliance Change"]
    detail = {
      messageType       = ["ComplianceChangeNotification"]
      newEvaluationResult = {
        complianceType = ["NON_COMPLIANT"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "compliance_sns" {
  rule      = aws_cloudwatch_event_rule.compliance_change.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.compliance_alerts.arn
}
```

## Compliance Dashboard with CloudWatch

Create a dashboard to give your security team visibility into compliance posture.

```hcl
resource "aws_cloudwatch_dashboard" "compliance" {
  dashboard_name = "compliance-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Config Rule Compliance"
          metrics = [
            ["AWS/Config", "ComplianceByConfigRule", "ConfigRuleName", "s3-bucket-server-side-encryption-enabled"],
            ["...", "encrypted-volumes"],
            ["...", "rds-instance-public-access-check"],
            ["...", "restricted-ssh"]
          ]
          period = 86400
          stat   = "Average"
        }
      }
    ]
  })
}
```

## Wrapping Up

Building compliance infrastructure with Terraform gives you a repeatable, auditable foundation. Every rule, every alert, and every remediation action is version-controlled and reviewable. When an auditor asks how you enforce encryption at rest, you point to the Config rule. When they ask for evidence of audit logging, you point to the CloudTrail configuration.

The real power comes from treating compliance as code. You can test it, review it, and deploy it consistently across every account in your organization. No more hoping that someone remembered to check the checkbox.

For monitoring your compliance infrastructure and getting real-time alerts when violations occur, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-compliance-infrastructure-with-terraform/view) to centralize your observability across all compliance controls.
