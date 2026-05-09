# Using S3 as a Module Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, S3, AWS

Description: Learn how to use Amazon S3 buckets as module sources in OpenTofu for private module distribution.

Amazon S3 is a natural choice for hosting private OpenTofu modules within AWS environments. OpenTofu can download module archives directly from S3 using standard AWS authentication.

## S3 Source Syntax

```hcl
module "vpc" {
  source = "s3::https://s3.amazonaws.com/my-modules/vpc-2.1.0.zip"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

## Using S3 with Path-Style URL

```hcl
# Path-style URL (s3.amazonaws.com resolves to us-east-1)

module "vpc" {
  source = "s3::https://s3.amazonaws.com/my-modules-bucket/modules/vpc-v2.1.0.zip"
}

# Regional endpoint (use this for buckets outside us-east-1)
module "vpc" {
  source = "s3::https://s3.us-east-1.amazonaws.com/my-modules-bucket/vpc-v2.1.0.zip"
}
```

## Authentication

OpenTofu uses standard AWS credential chain for S3 sources:

```bash
# Environment variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"

# AWS credentials file (~/.aws/credentials)
# [default]
# aws_access_key_id = AKIAIOSFODNN7EXAMPLE
# aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# IAM roles (on EC2/ECS/Lambda - best for production)
# No credentials needed - uses instance profile
```

## S3 Bucket Policy for Module Distribution

```hcl
# Allow specific roles to read modules from the bucket
data "aws_iam_policy_document" "module_bucket_policy" {
  statement {
    principals {
      type        = "AWS"
      identifiers = var.deployer_role_arns
    }
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::my-modules/*"]
  }
}

resource "aws_s3_bucket_policy" "modules" {
  bucket = aws_s3_bucket.modules.id
  policy = data.aws_iam_policy_document.module_bucket_policy.json
}
```

## Publishing Modules to S3

```bash
#!/bin/bash
# publish-module.sh

MODULE_NAME="vpc"
VERSION="v2.1.0"
BUCKET="my-terraform-modules"

# Create archive (extension must match the source URL - OpenTofu picks
# the decompressor based on the URL extension)
(cd "./modules/${MODULE_NAME}/" && zip -r "../../${MODULE_NAME}-${VERSION}.zip" .)

# Upload to S3
aws s3 cp "${MODULE_NAME}-${VERSION}.zip" \
  "s3://${BUCKET}/modules/${MODULE_NAME}-${VERSION}.zip"

echo "Published ${MODULE_NAME} ${VERSION} to S3"
```

## Versioned Module Strategy

```hcl
variable "module_version" {
  description = "Version of the VPC module to use"
  type        = string
  default     = "v2.1.0"
}

module "vpc" {
  source = "s3::https://s3.amazonaws.com/my-modules/vpc-${var.module_version}.zip"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

## Conclusion

S3 module sources provide secure, AWS-native private module distribution. They leverage existing AWS authentication (IAM roles, credentials), integrate with S3 access control, and work well in AWS-centric organizations. Use versioned archives with semantic version naming for reproducible deployments.
