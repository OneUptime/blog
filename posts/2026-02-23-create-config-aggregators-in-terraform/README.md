# How to Create Config Aggregators in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Config, Compliance, Aggregator, Infrastructure as Code

Description: Learn how to create AWS Config aggregators for multi-account and multi-region compliance views using Terraform, including authorization and conformance packs.

---

AWS Config records and evaluates the configuration of your AWS resources. In a multi-account, multi-region setup, you end up with Config data scattered across many accounts and regions. Config aggregators solve this by collecting Config data from multiple source accounts and regions into a single aggregator account, giving you a unified compliance dashboard. Managing aggregators through Terraform keeps your compliance infrastructure consistent and auditable.

This guide covers setting up Config aggregators for both individual accounts and entire AWS Organizations, along with authorization, conformance packs, and Config rules.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with credentials for the aggregator account
- AWS Config enabled in source accounts
- AWS Organizations (for organization-level aggregation)

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Setting Up AWS Config

Before creating an aggregator, you need Config enabled in each account. Here is the basic Config setup.

```hcl
# S3 bucket for Config snapshots
resource "aws_s3_bucket" "config" {
  bucket = "my-org-aws-config-${data.aws_caller_identity.current.account_id}"
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
        Sid    = "AllowConfigPut"
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

# IAM role for AWS Config
resource "aws_iam_role" "config" {
  name = "aws-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

# Config configuration recorder
resource "aws_config_configuration_recorder" "main" {
  name     = "default"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }

  recording_mode {
    recording_frequency = "CONTINUOUS"
  }
}

# Delivery channel for Config snapshots
resource "aws_config_delivery_channel" "main" {
  name           = "default"
  s3_bucket_name = aws_s3_bucket.config.id

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

## Organization-Wide Aggregator

If you use AWS Organizations, the simplest approach is an organization aggregator. It automatically collects Config data from all accounts in the organization without requiring individual authorization.

```hcl
# IAM role for the Config aggregator
resource "aws_iam_role" "config_aggregator" {
  name = "aws-config-aggregator-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config_aggregator" {
  role       = aws_iam_role.config_aggregator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRoleForOrganizations"
}

# Organization aggregator - collects from all accounts and all regions
resource "aws_config_configuration_aggregator" "organization" {
  name = "organization-aggregator"

  organization_aggregation_source {
    all_regions = true
    role_arn    = aws_iam_role.config_aggregator.arn
  }

  tags = {
    Purpose = "organization-wide-compliance"
  }
}
```

## Account-Based Aggregator

When you do not use Organizations or want to aggregate from specific accounts only, use account aggregation with explicit authorization.

```hcl
# Aggregator that collects from specific accounts
resource "aws_config_configuration_aggregator" "multi_account" {
  name = "multi-account-aggregator"

  account_aggregation_source {
    account_ids = [
      "111111111111",
      "222222222222",
      "333333333333",
    ]
    all_regions = true
  }

  tags = {
    Purpose = "multi-account-compliance"
  }
}
```

## Authorization for Account Aggregation

Each source account must authorize the aggregator account to collect its Config data.

```hcl
# Run this in each source account
resource "aws_config_aggregate_authorization" "authorize_aggregator" {
  account_id = "999999999999" # The aggregator account ID
  region     = "us-east-1"    # The aggregator region

  tags = {
    Purpose = "allow-config-aggregation"
  }
}
```

If you need to authorize multiple regions:

```hcl
# Authorize aggregation from all regions
locals {
  aggregator_account_id = "999999999999"
  regions = [
    "us-east-1",
    "us-west-2",
    "eu-west-1",
    "ap-southeast-1",
  ]
}

resource "aws_config_aggregate_authorization" "multi_region" {
  for_each = toset(local.regions)

  account_id = local.aggregator_account_id
  region     = each.value

  tags = {
    Purpose = "allow-config-aggregation"
  }
}
```

## Config Rules for Compliance

Config rules evaluate whether your resources comply with your desired configuration. These rules feed into the aggregator.

```hcl
# Managed rule - check if S3 buckets have versioning enabled
resource "aws_config_config_rule" "s3_versioning" {
  name = "s3-bucket-versioning-enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_VERSIONING_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Managed rule - check for encrypted EBS volumes
resource "aws_config_config_rule" "ebs_encryption" {
  name = "ebs-encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Managed rule - check for public S3 buckets
resource "aws_config_config_rule" "s3_public_access" {
  name = "s3-bucket-public-read-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Managed rule - check required tags
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key   = "Environment"
    tag1Value = "production,staging,development"
    tag2Key   = "Team"
    tag3Key   = "CostCenter"
  })

  scope {
    compliance_resource_types = [
      "AWS::EC2::Instance",
      "AWS::RDS::DBInstance",
      "AWS::S3::Bucket",
    ]
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Managed rule - check for unused IAM credentials
resource "aws_config_config_rule" "iam_credentials" {
  name = "iam-credentials-unused"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_UNUSED_CREDENTIALS_CHECK"
  }

  input_parameters = jsonencode({
    maxCredentialUsageAge = "90"
  })

  maximum_execution_frequency = "TwelveHours"

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Conformance Packs

Conformance packs are collections of Config rules and remediation actions that you can deploy as a single unit.

```hcl
# Organization conformance pack deployed across all accounts
resource "aws_config_organization_conformance_pack" "security_baseline" {
  name = "security-baseline"

  # Use an AWS managed template
  template_body = <<-YAML
    Parameters:
      S3BucketVersioningEnabled:
        Default: "true"
        Type: String
    Resources:
      S3BucketVersioning:
        Type: AWS::Config::ConfigRule
        Properties:
          ConfigRuleName: s3-bucket-versioning-check
          Source:
            Owner: AWS
            SourceIdentifier: S3_BUCKET_VERSIONING_ENABLED
      EncryptedVolumes:
        Type: AWS::Config::ConfigRule
        Properties:
          ConfigRuleName: encrypted-volumes-check
          Source:
            Owner: AWS
            SourceIdentifier: ENCRYPTED_VOLUMES
      RDSEncryption:
        Type: AWS::Config::ConfigRule
        Properties:
          ConfigRuleName: rds-storage-encrypted-check
          Source:
            Owner: AWS
            SourceIdentifier: RDS_STORAGE_ENCRYPTED
      IAMPasswordPolicy:
        Type: AWS::Config::ConfigRule
        Properties:
          ConfigRuleName: iam-password-policy-check
          Source:
            Owner: AWS
            SourceIdentifier: IAM_PASSWORD_POLICY
          MaximumExecutionFrequency: TwelveHours
  YAML

  # Exclude specific accounts (like sandbox)
  excluded_accounts = ["444444444444"]
}
```

## Remediation Actions

Set up automatic remediation for non-compliant resources.

```hcl
# Auto-remediation: enable S3 bucket versioning
resource "aws_config_remediation_configuration" "s3_versioning" {
  config_rule_name = aws_config_config_rule.s3_versioning.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-ConfigureS3BucketVersioning"

  parameter {
    name           = "AutomationAssumeRole"
    static_value   = aws_iam_role.config_remediation.arn
  }

  parameter {
    name             = "BucketName"
    resource_value   = "RESOURCE_ID"
  }

  parameter {
    name         = "VersioningState"
    static_value = "Enabled"
  }

  automatic                  = true
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}

# IAM role for remediation actions
resource "aws_iam_role" "config_remediation" {
  name = "config-remediation-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ssm.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config_remediation" {
  role       = aws_iam_role.config_remediation.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}
```

## Best Practices

1. **Use organization aggregators when possible.** They automatically include new accounts without additional configuration.

2. **Aggregate from all regions.** Resources can exist in any region. Setting `all_regions = true` ensures nothing slips through.

3. **Start with managed rules.** AWS provides hundreds of managed Config rules. Use these before writing custom ones.

4. **Deploy conformance packs for consistency.** Conformance packs ensure the same compliance checks run across all accounts.

5. **Enable automatic remediation carefully.** Auto-remediation is powerful but can cause disruptions if not tested thoroughly. Start with manual remediation and automate only after you are confident in the rules.

6. **Monitor aggregator health.** Check the aggregator status regularly to ensure all source accounts are reporting data.

## Conclusion

AWS Config aggregators with Terraform give you a centralized compliance view across your entire AWS estate. Whether you are aggregating across an organization or specific accounts, the patterns are straightforward. Combine aggregators with Config rules and conformance packs, and you have a comprehensive compliance monitoring system that scales with your organization.
