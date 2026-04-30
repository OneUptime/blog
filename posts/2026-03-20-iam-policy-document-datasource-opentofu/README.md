# How to Use aws_iam_policy_document Data Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Policy Document, Data Source, Infrastructure as Code, Access Control

Description: Learn how to use the aws_iam_policy_document data source in OpenTofu to construct IAM policy documents programmatically with HCL syntax instead of raw JSON strings.

## Introduction

The `aws_iam_policy_document` data source generates IAM policy JSON from HCL blocks, providing syntax highlighting, validation, and the ability to merge multiple policy documents. It's more maintainable than raw JSON strings and integrates naturally with other OpenTofu resources.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM permissions

## Step 1: Basic Policy Document

```hcl
# Construct an IAM policy document using HCL

data "aws_iam_policy_document" "s3_access" {
  statement {
    sid    = "AllowS3BucketOperations"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]

    resources = [
      "arn:aws:s3:::${var.bucket_name}",
    ]
  }

  statement {
    sid    = "AllowS3ObjectReadDelete"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:DeleteObject",
    ]

    resources = ["arn:aws:s3:::${var.bucket_name}/*"]
  }

  statement {
    sid    = "AllowS3ObjectPutWithKMSEncryption"
    effect = "Allow"

    actions = [
      "s3:PutObject",
    ]

    resources = ["arn:aws:s3:::${var.bucket_name}/*"]

    # Add conditions using the condition block
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }
}

# Create the policy from the document
resource "aws_iam_policy" "s3_access" {
  name        = "S3AccessPolicy"
  description = "S3 access with encryption enforcement"
  policy      = data.aws_iam_policy_document.s3_access.json
}
```

## Step 2: Trust Policy for IAM Roles

```hcl
# Generate a trust policy (assume role policy)
data "aws_iam_policy_document" "ec2_trust" {
  statement {
    effect = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "lambda-execution-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}
```

## Step 3: Merge Multiple Policy Documents

```hcl
# Get the current AWS account ID for ARN construction
data "aws_caller_identity" "current" {}

# Base policy for all application roles
data "aws_iam_policy_document" "base" {
  statement {
    sid    = "AllowLogging"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }

  statement {
    sid    = "AllowSSM"
    effect = "Allow"
    actions = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/app/*"]
  }
}

# Application-specific additions
data "aws_iam_policy_document" "app_specific" {
  statement {
    sid    = "AllowDynamoDB"
    effect = "Allow"
    actions = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
    resources = [aws_dynamodb_table.app.arn]
  }
}

# Merge both documents into a single policy
data "aws_iam_policy_document" "combined" {
  source_policy_documents = [
    data.aws_iam_policy_document.base.json,
    data.aws_iam_policy_document.app_specific.json,
  ]
}

resource "aws_iam_role_policy" "combined" {
  name   = "combined-app-policy"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.combined.json
}
```

## Step 4: Override Policy Statements

```hcl
# Override specific statements from a source document
data "aws_iam_policy_document" "restricted" {
  source_policy_documents = [data.aws_iam_policy_document.base.json]

  # Override the SSM statement to be more restrictive
  override_policy_documents = [
    jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Sid      = "AllowSSM"  # Same Sid overrides the base statement
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/app/prod/*"]
      }]
    })
  ]
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# View the generated policy JSON
tofu show -json | jq '.values.root_module.resources[] | select(.type=="aws_iam_policy") | .values.policy'
```

## Conclusion

The `aws_iam_policy_document` data source is the idiomatic way to write IAM policies in OpenTofu. It provides HCL syntax with proper type checking, enables merging and overriding policy documents, and generates valid IAM JSON. Use `source_policy_documents` to compose complex policies from reusable base policies, reducing duplication across multiple roles and services.
