# How to Configure S3 Bucket Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, Bucket Policies, IAM, Security

Description: A comprehensive guide to writing and managing S3 bucket policies in Terraform, covering access control, cross-account access, VPC endpoints, encryption enforcement, and common policy patterns.

---

S3 bucket policies are JSON documents that define who can do what with your bucket and its objects. They complement IAM policies by providing resource-based access control - meaning you can grant access to principals from other AWS accounts, enforce encryption requirements, restrict access to specific VPCs, and more.

Writing bucket policies in Terraform is straightforward once you understand the policy structure. Let's go through the common patterns you'll need.

## Basic Bucket Policy

A bucket policy consists of one or more statements, each with an Effect (Allow/Deny), Principal (who), Action (what), and Resource (which objects).

```hcl
resource "aws_s3_bucket" "data" {
  bucket_prefix = "app-data-"
}

# Basic bucket policy allowing a specific IAM role to read objects
resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAppRoleRead"
        Effect    = "Allow"
        Principal = {
          AWS = aws_iam_role.app.arn
        }
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.data.arn,           # For ListBucket
          "${aws_s3_bucket.data.arn}/*"      # For GetObject
        ]
      }
    ]
  })
}
```

Notice that `ListBucket` applies to the bucket ARN (without `/*`) while `GetObject` applies to the objects (with `/*`). This is a common source of confusion.

## Using the aws_iam_policy_document Data Source

For complex policies, the `aws_iam_policy_document` data source is cleaner than writing JSON directly.

```hcl
# Build the policy using the data source
data "aws_iam_policy_document" "bucket_policy" {
  # Allow the application role to read and write objects
  statement {
    sid    = "AllowAppAccess"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.app.arn]
    }

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.data.arn,
      "${aws_s3_bucket.data.arn}/*",
    ]
  }

  # Deny unencrypted uploads
  statement {
    sid    = "DenyUnencryptedUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:PutObject"]

    resources = ["${aws_s3_bucket.data.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms", "AES256"]
    }
  }
}

# Apply the policy to the bucket
resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id
  policy = data.aws_iam_policy_document.bucket_policy.json
}
```

## Enforce SSL/TLS Only

One of the most important security policies: deny all requests that don't use HTTPS.

```hcl
data "aws_iam_policy_document" "enforce_ssl" {
  # Deny any request not using SSL
  statement {
    sid    = "EnforceSSLOnly"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.secure.arn,
      "${aws_s3_bucket.secure.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  # Deny TLS versions below 1.2
  statement {
    sid    = "EnforceTLS12"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.secure.arn,
      "${aws_s3_bucket.secure.arn}/*",
    ]

    condition {
      test     = "NumericLessThan"
      variable = "s3:TlsVersion"
      values   = ["1.2"]
    }
  }
}

resource "aws_s3_bucket_policy" "secure" {
  bucket = aws_s3_bucket.secure.id
  policy = data.aws_iam_policy_document.enforce_ssl.json
}
```

## Cross-Account Access

Grant another AWS account access to your bucket.

```hcl
variable "partner_account_id" {
  type        = string
  description = "AWS account ID of the partner"
}

data "aws_iam_policy_document" "cross_account" {
  # Allow the partner account to list the bucket
  statement {
    sid    = "AllowPartnerList"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.partner_account_id}:root"]
    }

    actions = ["s3:ListBucket"]

    resources = [aws_s3_bucket.shared.arn]

    # Only allow listing under a specific prefix
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["shared/*"]
    }
  }

  # Allow the partner account to read objects under shared/
  statement {
    sid    = "AllowPartnerRead"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.partner_account_id}:root"]
    }

    actions = ["s3:GetObject"]

    resources = ["${aws_s3_bucket.shared.arn}/shared/*"]
  }

  # Allow the partner to upload under incoming/
  statement {
    sid    = "AllowPartnerUpload"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.partner_account_id}:root"]
    }

    actions = [
      "s3:PutObject",
      "s3:PutObjectAcl",
    ]

    resources = ["${aws_s3_bucket.shared.arn}/incoming/*"]

    # Require bucket owner full control
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}

resource "aws_s3_bucket_policy" "shared" {
  bucket = aws_s3_bucket.shared.id
  policy = data.aws_iam_policy_document.cross_account.json
}
```

## VPC Endpoint Restriction

Restrict bucket access to traffic coming through a specific VPC endpoint. This ensures the bucket can only be accessed from within your VPC.

```hcl
# VPC endpoint for S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"

  tags = {
    Name = "s3-vpc-endpoint"
  }
}

data "aws_iam_policy_document" "vpc_only" {
  # Deny all access except from the VPC endpoint
  statement {
    sid    = "DenyNonVPCAccess"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.internal.arn,
      "${aws_s3_bucket.internal.arn}/*",
    ]

    condition {
      test     = "StringNotEquals"
      variable = "aws:sourceVpce"
      values   = [aws_vpc_endpoint.s3.id]
    }
  }
}

resource "aws_s3_bucket_policy" "internal" {
  bucket = aws_s3_bucket.internal.id
  policy = data.aws_iam_policy_document.vpc_only.json
}
```

## IP-Based Restrictions

Restrict access to specific IP ranges.

```hcl
data "aws_iam_policy_document" "ip_restricted" {
  # Allow access from specific IP ranges
  statement {
    sid    = "AllowFromOffice"
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.restricted.arn,
      "${aws_s3_bucket.restricted.arn}/*",
    ]

    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"
      values   = [
        "203.0.113.0/24",   # Office network
        "198.51.100.0/24",  # VPN network
      ]
    }
  }

  # Deny from everywhere else
  statement {
    sid    = "DenyFromOther"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.restricted.arn,
      "${aws_s3_bucket.restricted.arn}/*",
    ]

    condition {
      test     = "NotIpAddress"
      variable = "aws:SourceIp"
      values   = [
        "203.0.113.0/24",
        "198.51.100.0/24",
      ]
    }
  }
}
```

## CloudFront Origin Access Control

Allow CloudFront to access a private S3 bucket.

```hcl
data "aws_iam_policy_document" "cloudfront_access" {
  statement {
    sid    = "AllowCloudFrontRead"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions = ["s3:GetObject"]

    resources = ["${aws_s3_bucket.static.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "static" {
  bucket = aws_s3_bucket.static.id
  policy = data.aws_iam_policy_document.cloudfront_access.json
}
```

## Combining Multiple Policy Requirements

Real bucket policies often combine several requirements.

```hcl
data "aws_iam_policy_document" "production" {
  # Enforce SSL
  statement {
    sid       = "EnforceSSL"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.prod.arn, "${aws_s3_bucket.prod.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  # Enforce encryption
  statement {
    sid       = "EnforceEncryption"
    effect    = "Deny"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.prod.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }

  # Allow app access
  statement {
    sid       = "AllowAppAccess"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.prod.arn, "${aws_s3_bucket.prod.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.app.arn]
    }
  }
}
```

## Summary

Bucket policies give you resource-based access control for your S3 buckets. Start every production bucket with SSL enforcement and encryption requirements, then layer on access controls based on IAM principals, VPC endpoints, or IP ranges. Use the `aws_iam_policy_document` data source for complex policies - it catches syntax errors at plan time rather than apply time. And always test your policies by attempting the operations you expect to both succeed and fail.

For more S3 security, see our guides on [blocking public access to S3 buckets](https://oneuptime.com/blog/post/2026-02-23-block-public-access-to-s3-buckets-in-terraform/view) and [configuring S3 bucket encryption](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-encryption-in-terraform/view).
