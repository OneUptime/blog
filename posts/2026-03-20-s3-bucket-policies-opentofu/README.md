# How to Create S3 Bucket Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Bucket Policy, IAM, Access Control, Infrastructure as Code

Description: Learn how to write and apply S3 bucket policies using OpenTofu to control access, enforce encryption, require TLS, and restrict access to specific VPCs or IP ranges.

## Introduction

S3 bucket policies are resource-based IAM policies attached directly to S3 buckets. They define who can access the bucket and under what conditions, supporting complex scenarios like VPC endpoint access, cross-account permissions, and encryption enforcement.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3 permissions

## Step 1: Create a Secure S3 Bucket

```hcl
resource "aws_s3_bucket" "secure" {
  bucket = var.bucket_name
  tags   = { Name = var.bucket_name }
}

resource "aws_s3_bucket_public_access_block" "secure" {
  bucket                  = aws_s3_bucket.secure.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Step 2: Apply a Comprehensive Bucket Policy

```hcl
resource "aws_s3_bucket_policy" "secure" {
  bucket = aws_s3_bucket.secure.id

  # Wait for the public access block to apply first
  depends_on = [aws_s3_bucket_public_access_block.secure]

  policy = data.aws_iam_policy_document.s3_policy.json
}

data "aws_iam_policy_document" "s3_policy" {
  # Deny uploads that do not request SSE-KMS
  statement {
    sid    = "DenyUploadsWithoutSSEKMS"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.secure.arn}/*"]
    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }

  # Deny non-TLS access from non-AWS service principals
  statement {
    sid    = "DenyHTTP"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:*"]
    resources = [
      aws_s3_bucket.secure.arn,
      "${aws_s3_bucket.secure.arn}/*"
    ]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
    condition {
      test     = "Bool"
      variable = "aws:PrincipalIsAWSService"
      values   = ["false"]
    }
  }

  # Deny the application role outside the specific VPC endpoint
  statement {
    sid    = "DenyAppRoleOutsideVPCEndpoint"
    effect = "Deny"
    principals {
      type        = "AWS"
      identifiers = [var.app_role_arn]
    }
    actions = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
    resources = [
      aws_s3_bucket.secure.arn,
      "${aws_s3_bucket.secure.arn}/*"
    ]
    condition {
      test     = "StringNotEquals"
      variable = "aws:SourceVpce"
      values   = [var.vpc_endpoint_id]
    }
  }

  # Allow the application role through the specific VPC endpoint
  statement {
    sid    = "AllowAppRoleFromVPCEndpoint"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [var.app_role_arn]
    }
    actions = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
    resources = [
      aws_s3_bucket.secure.arn,
      "${aws_s3_bucket.secure.arn}/*"
    ]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceVpce"
      values   = [var.vpc_endpoint_id]
    }
  }

  # Allow cross-account listing of the shared prefix
  statement {
    sid    = "CrossAccountListSharedPrefix"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.partner_account_id}:root"]
    }
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.secure.arn]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["shared/*"]
    }
  }

  # Allow cross-account read access to shared objects
  statement {
    sid    = "CrossAccountReadSharedObjects"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.partner_account_id}:root"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.secure.arn}/shared/*"]
  }

  # Allow CloudFront OAC to read objects
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.secure.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [var.cloudfront_distribution_arn]
    }
  }
}
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 bucket policies are essential for enforcing security baselines. Always deny HTTP access (require TLS) and enforce your required server-side encryption mode on uploads. Use explicit deny statements with VPC endpoint conditions for principals that should only access a bucket from within your AWS network. Bucket policies allow cross-account access without requiring IAM role assumption, though the external account must still grant its own principals the corresponding IAM permissions. If CloudFront serves SSE-KMS objects, also grant the distribution permission to use the KMS key.
