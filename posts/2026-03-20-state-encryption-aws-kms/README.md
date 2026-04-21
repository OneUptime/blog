# How to Configure State Encryption with AWS KMS in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, AWS, Encryption

Description: Learn how to configure OpenTofu state file encryption using AWS KMS for enterprise-grade key management, rotation, and access control.

## Introduction

Using AWS Key Management Service (KMS) with OpenTofu state encryption provides enterprise-grade security: centralized key management, automatic key rotation, CloudTrail audit logs, and fine-grained IAM access control. This guide walks through setting up KMS-based state encryption.

## Prerequisites

- AWS KMS key created (or permission to create one)
- IAM role with permissions to use the KMS key
- OpenTofu 1.7 or later

## Step 1: Create or Identify a KMS Key

```hcl
# kms.tf - Create a KMS key for state encryption

resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for OpenTofu state encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true  # AWS rotates key material annually

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM Root Access"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Terraform Roles to Use Key"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/terraform-ci",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/terraform-admin"
          ]
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

data "aws_caller_identity" "current" {}
```

## Step 2: Configure the AWS KMS Key Provider

```hcl
# encryption.tf
terraform {
  required_version = ">= 1.7.0"

  encryption {
    # AWS KMS key provider
    key_provider "aws_kms" "state_key" {
      # Reference by ARN for reliability
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab"

      # Or use the alias (more readable)
      # kms_key_id = "alias/terraform-state"

      # AWS region where the KMS key is located
      region = "us-east-1"

      # Key spec for the generated data key
      key_spec = "AES_256"
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.aws_kms.state_key
    }

    state {
      method = method.aes_gcm.state_method
    }

    plan {
      method = method.aes_gcm.state_method
    }
  }
}
```

## Step 3: Configure AWS Authentication

The OpenTofu process needs IAM permissions to use the KMS key:

```bash
# Using environment variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"

# Or using AWS profile
export AWS_PROFILE="terraform-ci"

# Or using IAM role (in EC2/ECS/Lambda)
# Automatically uses the instance/task role
```

Required IAM permissions for the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:GenerateDataKey",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab"
    }
  ]
}
```

## Step 4: Using Multi-Region Keys

For multi-region deployments, use AWS KMS Multi-Region Keys:

```hcl
key_provider "aws_kms" "state_key" {
  # Multi-region key ARN
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/mrk-1234567890abcdef1234567890abcdef"
  region     = "us-east-1"
  key_spec   = "AES_256"
}
```

## Step 5: Apply and Verify

For a new project, initialize and apply. For existing unencrypted state, configure an `unencrypted` fallback during the first migration apply, then remove it after OpenTofu rewrites the state:

```bash
# Initialize and apply
tofu init
tofu apply

# Verify KMS is being used - CloudTrail should show:
# kms:GenerateDataKey calls during apply
# kms:Decrypt calls during plan/show
```

Check CloudTrail for KMS activity:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GenerateDataKey \
  --start-time 2026-03-20T00:00:00Z \
  --query 'Events[*].[EventTime,Username,EventName,CloudTrailEvent]'
```

## Using KMS with the S3 Backend

Combine KMS state encryption with S3 backend encryption for defense in depth:

The role that initializes this backend also needs `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey` on the S3 backend KMS key.

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"

    # S3-side encryption (server-side)
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/2234abcd-12ab-34cd-56ef-1234567890ab"
    encrypt        = true
  }

  encryption {
    # OpenTofu-side encryption (client-side) with a different key
    key_provider "aws_kms" "state_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/3234abcd-12ab-34cd-56ef-1234567890ab"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.aws_kms.state_key
    }

    state {
      method = method.aes_gcm.state_method
    }
  }
}
```

## Conclusion

AWS KMS integration for OpenTofu state encryption provides production-grade key management with automatic rotation, detailed audit logs in CloudTrail, and fine-grained IAM access control. It's the recommended approach for any production deployment on AWS. Combined with S3-side encryption, you get defense-in-depth protection for your most sensitive infrastructure data.
