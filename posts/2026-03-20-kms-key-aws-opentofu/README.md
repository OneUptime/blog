# How to Create a KMS Key with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, KMS, Encryption, Security

Description: Learn how to create and configure AWS KMS keys with OpenTofu for encrypting S3 buckets, RDS databases, EBS volumes, and other AWS resources.

## Introduction

AWS Key Management Service (KMS) provides managed encryption keys for securing data at rest across AWS services. OpenTofu makes it easy to create KMS keys, set rotation policies, define key policies, and create aliases for human-readable references.

## Creating a KMS Key

```hcl
data "aws_caller_identity" "current" {}

resource "aws_kms_key" "app" {
  description             = "Encryption key for ${var.name} application data"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Automatically rotate annually

  # Key policy: who can administer and use this key
  policy = data.aws_iam_policy_document.kms_policy.json

  tags = {
    Name        = "${var.name}-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "app" {
  name          = "alias/${var.name}-key"
  target_key_id = aws_kms_key.app.key_id
}
```

## Key Policy

```hcl
data "aws_iam_policy_document" "kms_policy" {
  # Root account can administer the key
  statement {
    sid    = "EnableRootAccess"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  # Allow specific IAM role to use the key for common encryption workflows
  statement {
    sid    = "AllowAppKeyUsage"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.app.arn]
    }
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey",
      "kms:GenerateDataKeyWithoutPlaintext",
      "kms:DescribeKey",
    ]
    resources = ["*"]
  }

  # Allow AWS services such as EBS to create grants on behalf of the role
  statement {
    sid    = "AllowAWSServiceGrants"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.app.arn]
    }
    actions   = ["kms:CreateGrant"]
    resources = ["*"]
    condition {
      test     = "Bool"
      variable = "kms:GrantIsForAWSResource"
      values   = ["true"]
    }
  }

  # Allow CloudTrail to use the key for log delivery
  statement {
    sid    = "AllowCloudTrail"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    actions = [
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
    ]
    resources = ["*"]
  }
}
```

## Multi-Region Key

```hcl
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

# Primary key in us-east-1

resource "aws_kms_key" "primary" {
  provider                = aws.us_east
  description             = "Multi-region primary key"
  multi_region            = true
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

# Replica key in eu-west-1 for cross-region operations
resource "aws_kms_replica_key" "replica" {
  provider                = aws.eu_west
  description             = "Replica of ${aws_kms_key.primary.description}"
  primary_key_arn         = aws_kms_key.primary.arn
  deletion_window_in_days = 30
  enabled                 = true
}
```

## Using KMS Keys with Other Resources

```hcl
# Encrypt an S3 bucket with the KMS key
resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.app.arn
    }
    bucket_key_enabled = true  # Reduces KMS API calls and costs
  }
}

# Encrypt an EBS volume with the KMS key
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100
  type              = "gp3"
  encrypted         = true
  kms_key_id        = aws_kms_key.app.arn
}
```

## Outputs

```hcl
output "kms_key_arn"   { value = aws_kms_key.app.arn }
output "kms_key_id"    { value = aws_kms_key.app.key_id }
output "kms_alias_arn" { value = aws_kms_alias.app.arn }
```

## Conclusion

For symmetric customer managed KMS keys, enable automatic rotation, use the maximum deletion window of 30 days to allow recovery from accidental deletion, and use the least-privilege key policy to restrict which principals can use each key. Reference keys consistently by ARN, or by alias where the target resource supports it.
