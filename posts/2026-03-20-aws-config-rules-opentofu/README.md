# How to Set Up AWS Config Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CONFIG, Compliance, Infrastructure Governance, Infrastructure as Code

Description: Learn how to configure AWS Config Rules with OpenTofu to continuously evaluate AWS resource configurations for compliance with security and operational best practices.

## Introduction

AWS Config continuously records resource configurations and evaluates them against rules. Config Rules can use AWS-managed rules or custom rules to check configurations like S3 bucket encryption, security group rules, and IAM password policies. Non-compliant resources are flagged for remediation.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with permissions to create AWS Config, IAM, and S3 resources

## Step 1: Enable AWS Config Recorder

```hcl
resource "aws_config_configuration_recorder" "main" {
  name     = "${var.project_name}-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true   # Record all supported resources
    include_global_resource_types = true   # Include IAM, Route 53, etc.
  }
}

resource "aws_iam_role" "config" {
  name = "${var.project_name}-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "config.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

# S3 bucket for Config delivery

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "config" {
  bucket = "${var.project_name}-config-${data.aws_caller_identity.current.account_id}"
}

resource "aws_iam_role_policy" "config_s3" {
  name = "${var.project_name}-config-s3-access"
  role = aws_iam_role.config.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketAcl",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.config.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.config.arn}/*"
      }
    ]
  })
}

resource "aws_config_delivery_channel" "main" {
  name           = "${var.project_name}-config-delivery"
  s3_bucket_name = aws_s3_bucket.config.bucket

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [
    aws_config_delivery_channel.main,
    aws_iam_role_policy_attachment.config,
    aws_iam_role_policy.config_s3
  ]
}
```

## Step 2: Enable AWS Managed Config Rules

```hcl
# S3 buckets must not be publicly accessible
resource "aws_config_config_rule" "s3_public_access" {
  name        = "s3-bucket-public-read-prohibited"
  description = "S3 buckets must block public read access"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Root account MFA must be enabled
resource "aws_config_config_rule" "root_mfa" {
  name        = "root-account-mfa-enabled"
  description = "Root account must have MFA enabled"

  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
  }

  # This rule applies at the account level
  depends_on = [aws_config_configuration_recorder.main]
}

# Ensure EBS volumes are encrypted
resource "aws_config_config_rule" "ebs_encryption" {
  name        = "ec2-ebs-encryption-by-default"
  description = "EC2 EBS volumes must be encrypted by default"

  source {
    owner             = "AWS"
    source_identifier = "EC2_EBS_ENCRYPTION_BY_DEFAULT"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# CloudTrail must be enabled
resource "aws_config_config_rule" "cloudtrail_enabled" {
  name        = "cloud-trail-enabled"
  description = "CloudTrail must be enabled and use the expected S3 bucket"

  source {
    owner             = "AWS"
    source_identifier = "CLOUD_TRAIL_ENABLED"
  }

  input_parameters = jsonencode({
    s3BucketName = var.cloudtrail_bucket_name
  })

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Step 3: Enable Conformance Pack

```hcl
# Deploy CIS AWS Foundations Benchmark v1.4 Level 1 conformance pack
# Download the sample template from the AWS Config Rules repository first.
resource "aws_config_conformance_pack" "cis" {
  name = "${var.project_name}-cis-benchmark"

  template_body = file("${path.module}/Operational-Best-Practices-for-CIS-AWS-v1.4-Level1.yaml")

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Step 4: Configure Automatic Remediation

```hcl
# Remediate: Block public read/write access on non-compliant S3 buckets
resource "aws_config_remediation_configuration" "s3_public_access" {
  config_rule_name = aws_config_config_rule.s3_public_access.name

  resource_type  = "AWS::S3::Bucket"
  target_type    = "SSM_DOCUMENT"
  target_id      = "AWS-DisableS3BucketPublicReadWrite"
  automatic      = false  # Set to true for automatic remediation

  parameter {
    name         = "AutomationAssumeRole"
    static_value = var.remediation_role_arn
  }

  parameter {
    name           = "S3BucketName"
    resource_value = "RESOURCE_ID"
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check compliance summary
aws configservice describe-compliance-by-config-rule \
  --config-rule-names s3-bucket-public-read-prohibited
```

## Conclusion

AWS Config Rules provide continuous compliance monitoring that catches drift between infrastructure changes and your security baseline. Start with the CIS AWS Benchmark conformance pack for comprehensive coverage across the most impactful security controls. Enable automatic remediation selectively for low-risk, well-understood fixes (like blocking public S3 access), but require manual approval for remediations that could impact availability, like modifying security group rules.
