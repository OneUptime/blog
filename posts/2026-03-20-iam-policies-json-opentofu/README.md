# How to Create IAM Policies with JSON Documents in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Policies, JSON, Access Control, Infrastructure as Code

Description: Learn how to create AWS IAM policies using raw JSON policy documents in OpenTofu, including condition keys, resource restrictions, and best practices for least-privilege access.

## Introduction

IAM policies define what actions are allowed or denied for AWS resources. Creating policies with JSON documents in OpenTofu gives you full control over policy structure. This guide covers creating customer-managed policies with various condition types and resource restrictions.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM permissions

## Step 1: Create a Basic IAM Policy

```hcl
# Customer-managed IAM policy with JSON document

resource "aws_iam_policy" "s3_read" {
  name        = "S3ReadOnlyPolicy"
  description = "Allow reading from specific S3 buckets"
  path        = "/application/"  # Organize policies with paths

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3BucketList"
        Effect = "Allow"
        Action = ["s3:ListBucket", "s3:GetBucketLocation"]
        Resource = [
          "arn:aws:s3:::${var.data_bucket}",
          "arn:aws:s3:::${var.config_bucket}"
        ]
      },
      {
        Sid    = "AllowS3ObjectRead"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetObjectTagging"
        ]
        Resource = [
          "arn:aws:s3:::${var.data_bucket}/*",
          "arn:aws:s3:::${var.config_bucket}/*"
        ]
      }
    ]
  })

  tags = { Name = "s3-read-only" }
}
```

## Step 2: Create a Policy with Conditions

```hcl
resource "aws_iam_policy" "vpc_restricted_s3" {
  name        = "S3VPCRestrictedPolicy"
  description = "Allow S3 access only through a specific VPC endpoint"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowFromVPCOnly"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.internal_bucket}",
          "arn:aws:s3:::${var.internal_bucket}/*"
        ]
        Condition = {
          StringEquals = {
            "aws:SourceVpce" = var.s3_vpc_endpoint_id
          }
        }
      }
    ]
  })
}
```

## Step 3: Create an EC2 Policy with Tag-Based Conditions

```hcl
data "aws_caller_identity" "current" {}

resource "aws_iam_policy" "ec2_owner_policy" {
  name        = "EC2OwnerPolicy"
  description = "Allow an IAM user to manage EC2 instances tagged with their username"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEC2ReadAll"
        Effect = "Allow"
        Action = ["ec2:Describe*"]
        Resource = "*"
      },
      {
        Sid    = "AllowEC2ManageOwned"
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:instance/*"
        Condition = {
          StringEquals = {
            "ec2:ResourceTag/Owner" = "$${aws:username}"
          }
        }
      }
    ]
  })
}
```

## Step 4: Attach Policy to an IAM Role

```hcl
resource "aws_iam_role" "app" {
  name = "app-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "s3_read" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.s3_read.arn
}

resource "aws_iam_role_policy_attachment" "vpc_s3" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.vpc_restricted_s3.arn
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Retrieve the current default policy version
aws iam get-policy-version \
  --policy-arn arn:aws:iam::123456789012:policy/application/S3ReadOnlyPolicy \
  --version-id "$(aws iam get-policy \
    --policy-arn arn:aws:iam::123456789012:policy/application/S3ReadOnlyPolicy \
    --query 'Policy.DefaultVersionId' \
    --output text)"
```

## Conclusion

IAM policies with JSON documents provide the most explicit control over AWS permissions. Use separate `Sid` identifiers to make policies self-documenting. Apply conditions like `aws:SourceVpce` and `ec2:ResourceTag/Owner` to enforce network and ownership boundaries. Always follow least privilege: start with the minimum required allows and add explicit denies only when needed.
