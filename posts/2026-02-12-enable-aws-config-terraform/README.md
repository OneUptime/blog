# How to Enable AWS Config with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Config, Terraform, Compliance

Description: Learn how to enable and configure AWS Config with Terraform, including managed rules, custom rules, conformance packs, and remediation actions for compliance monitoring.

---

AWS Config continuously tracks how your AWS resources are configured and evaluates them against rules you define. Think of it as a compliance auditor that never sleeps. It records every configuration change, stores the history, and alerts you when resources drift from your desired state.

Whether you need to enforce tagging standards, make sure S3 buckets aren't public, or verify that encryption is enabled everywhere, AWS Config is the service to use. This guide walks through enabling it in Terraform with practical rules and remediation patterns.

## Enabling the Configuration Recorder

AWS Config has two main components: the configuration recorder (which tracks resources) and the delivery channel (which stores the data in S3). Both need to be set up.

This creates the IAM role, S3 bucket, configuration recorder, and delivery channel:

```hcl
# IAM role for AWS Config
resource "aws_iam_role" "config" {
  name = "aws-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "config.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

# S3 bucket for configuration snapshots and history
resource "aws_s3_bucket" "config" {
  bucket = "aws-config-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose = "aws-config"
  }
}

resource "aws_s3_bucket_policy" "config" {
  bucket = aws_s3_bucket.config.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowConfigBucketAccess"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.config.arn
      },
      {
        Sid    = "AllowConfigBucketDelivery"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.config.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# Configuration recorder
resource "aws_config_configuration_recorder" "main" {
  name     = "default"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# Delivery channel
resource "aws_config_delivery_channel" "main" {
  name           = "default"
  s3_bucket_name = aws_s3_bucket.config.bucket

  snapshot_delivery_properties {
    delivery_frequency = "Six_Hours"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Start the recorder
resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}

data "aws_caller_identity" "current" {}
```

## Common Managed Rules

AWS provides dozens of managed rules that cover the most common compliance requirements. Here are the ones most teams should enable.

This set of rules covers encryption, public access, and tagging requirements:

```hcl
# Ensure S3 buckets are not publicly accessible
resource "aws_config_config_rule" "s3_public_read_prohibited" {
  name = "s3-bucket-public-read-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure S3 buckets have encryption enabled
resource "aws_config_config_rule" "s3_encryption" {
  name = "s3-bucket-server-side-encryption-enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure EBS volumes are encrypted
resource "aws_config_config_rule" "ebs_encryption" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure RDS instances are encrypted
resource "aws_config_config_rule" "rds_encryption" {
  name = "rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
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

# Ensure VPC flow logs are enabled
resource "aws_config_config_rule" "vpc_flow_logs" {
  name = "vpc-flow-logs-enabled"

  source {
    owner             = "AWS"
    source_identifier = "VPC_FLOW_LOGS_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure root account has MFA enabled
resource "aws_config_config_rule" "root_mfa" {
  name = "root-account-mfa-enabled"

  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
  }

  maximum_execution_frequency = "TwentyFour_Hours"

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Required Tags Rule

Enforcing tagging standards is one of Config's most practical uses.

This rule checks that all EC2 instances and RDS databases have required tags:

```hcl
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  scope {
    compliance_resource_types = [
      "AWS::EC2::Instance",
      "AWS::RDS::DBInstance",
      "AWS::S3::Bucket"
    ]
  }

  input_parameters = jsonencode({
    tag1Key   = "Environment"
    tag1Value = "production,staging,development"
    tag2Key   = "Team"
    tag3Key   = "ManagedBy"
  })

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Batch Creating Rules with for_each

When you have many rules with the same structure, use `for_each`:

```hcl
variable "config_rules" {
  type = map(string)
  default = {
    "s3-public-read"      = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
    "s3-public-write"     = "S3_BUCKET_PUBLIC_WRITE_PROHIBITED"
    "s3-encryption"       = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
    "s3-ssl"              = "S3_BUCKET_SSL_REQUESTS_ONLY"
    "ebs-encryption"      = "ENCRYPTED_VOLUMES"
    "rds-encryption"      = "RDS_STORAGE_ENCRYPTED"
    "rds-public"          = "RDS_INSTANCE_PUBLIC_ACCESS_CHECK"
    "rds-multi-az"        = "RDS_MULTI_AZ_SUPPORT"
    "ec2-imdsv2"          = "EC2_IMDSV2_CHECK"
    "cloudtrail"          = "CLOUD_TRAIL_ENABLED"
    "guardduty"           = "GUARDDUTY_ENABLED_CENTRALIZED"
  }
}

resource "aws_config_config_rule" "rules" {
  for_each = var.config_rules

  name = each.key

  source {
    owner             = "AWS"
    source_identifier = each.value
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Automatic Remediation

Config rules can trigger automatic remediation using SSM Automation documents. This is powerful but should be used carefully - you don't want auto-remediation causing unexpected changes in production.

This auto-enables S3 bucket encryption when Config finds a non-compliant bucket:

```hcl
resource "aws_config_remediation_configuration" "s3_encryption" {
  config_rule_name = aws_config_config_rule.s3_encryption.name

  resource_type  = "AWS::S3::Bucket"
  target_type    = "SSM_DOCUMENT"
  target_id      = "AWS-EnableS3BucketEncryption"
  target_version = "1"

  parameter {
    name           = "BucketName"
    resource_value = "RESOURCE_ID"
  }

  parameter {
    name         = "SSEAlgorithm"
    static_value = "AES256"
  }

  automatic                  = true
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}
```

## Conformance Packs

Conformance packs bundle multiple rules together. AWS provides pre-built packs for common frameworks like CIS Benchmarks, PCI DSS, and HIPAA.

This deploys the CIS AWS Foundations Benchmark conformance pack:

```hcl
resource "aws_config_conformance_pack" "cis" {
  name = "cis-aws-foundations"

  template_body = <<-EOF
    Resources:
      S3BucketPublicReadProhibited:
        Type: AWS::Config::ConfigRule
        Properties:
          ConfigRuleName: cis-s3-bucket-public-read
          Source:
            Owner: AWS
            SourceIdentifier: S3_BUCKET_PUBLIC_READ_PROHIBITED
      RootAccountMFAEnabled:
        Type: AWS::Config::ConfigRule
        Properties:
          ConfigRuleName: cis-root-mfa
          Source:
            Owner: AWS
            SourceIdentifier: ROOT_ACCOUNT_MFA_ENABLED
          MaximumExecutionFrequency: TwentyFour_Hours
  EOF

  depends_on = [aws_config_configuration_recorder.main]
}
```

## SNS Notifications for Non-Compliant Resources

Get notified when resources fall out of compliance:

```hcl
resource "aws_config_delivery_channel" "with_sns" {
  name           = "default"
  s3_bucket_name = aws_s3_bucket.config.bucket
  sns_topic_arn  = aws_sns_topic.config_changes.arn

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_sns_topic" "config_changes" {
  name = "config-compliance-changes"
}
```

For additional alerting on compliance changes, pair Config notifications with EventBridge rules as described in our guide on [EventBridge rules with Terraform](https://oneuptime.com/blog/post/create-eventbridge-rules-terraform/view).

## Wrapping Up

AWS Config is essential for maintaining compliance and visibility into your resource configurations. Start by enabling the recorder, add the managed rules that match your compliance requirements, and set up notifications for non-compliant resources. Auto-remediation is powerful but should be rolled out gradually, starting with non-production environments. The `for_each` pattern keeps your rule definitions clean as the number of rules grows.
