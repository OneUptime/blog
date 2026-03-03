# How to Call a Module from an S3 Bucket in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, S3, Infrastructure as Code, DevOps

Description: Learn how to host and reference Terraform modules stored in AWS S3 buckets, including packaging, uploading, versioning, and authentication configuration.

---

Storing Terraform modules in S3 buckets is a practical choice for organizations that are already invested in AWS and want a simple, private module distribution mechanism. You do not need a Terraform Registry or Git server. Just package your module as a zip file, upload it to S3, and reference it in your configuration. AWS IAM handles authentication, and S3 versioning can handle module versions.

This guide covers how to package, upload, and reference S3-hosted modules.

## How S3 Module Sources Work

Terraform can download modules from S3 buckets using the `s3::` prefix. When it encounters this source, it downloads the archive from S3, extracts it, and uses the contents as the module code.

```hcl
# Basic S3 module source
module "vpc" {
  source = "s3::https://my-terraform-modules.s3.amazonaws.com/vpc/v1.0.0.zip"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

Terraform expects the S3 object to be a zip archive containing the module's `.tf` files.

## Packaging a Module for S3

First, you need to create a zip archive of your module. The zip should contain the `.tf` files at the root level (not nested in a subdirectory):

```bash
# Navigate to the module directory
cd modules/vpc

# Create a zip file of the module contents
# The files should be at the root of the zip, not in a subdirectory
zip -r /tmp/vpc-v1.0.0.zip *.tf

# Verify the contents
unzip -l /tmp/vpc-v1.0.0.zip
# Archive:  /tmp/vpc-v1.0.0.zip
#   Length      Date    Time    Name
# ---------  ---------- -----   ----
#      1234  2026-02-23 10:00   main.tf
#       567  2026-02-23 10:00   variables.tf
#       345  2026-02-23 10:00   outputs.tf
#       123  2026-02-23 10:00   versions.tf
```

The important thing is that the `.tf` files are at the root of the zip, not inside a folder like `vpc/main.tf`.

## Creating the S3 Bucket

Set up an S3 bucket to host your modules. Versioning and encryption are good practices:

```hcl
# s3-module-hosting/main.tf - Infrastructure for hosting modules

resource "aws_s3_bucket" "modules" {
  bucket = "myorg-terraform-modules"

  tags = {
    Purpose   = "terraform-module-hosting"
    ManagedBy = "terraform"
  }
}

# Enable versioning to track module changes
resource "aws_s3_bucket_versioning" "modules" {
  bucket = aws_s3_bucket.modules.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "modules" {
  bucket = aws_s3_bucket.modules.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access - modules should be private
resource "aws_s3_bucket_public_access_block" "modules" {
  bucket = aws_s3_bucket.modules.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Uploading Modules to S3

Upload your packaged module using the AWS CLI:

```bash
# Upload with a version path
aws s3 cp /tmp/vpc-v1.0.0.zip s3://myorg-terraform-modules/vpc/v1.0.0.zip

# Upload a new version
aws s3 cp /tmp/vpc-v1.1.0.zip s3://myorg-terraform-modules/vpc/v1.1.0.zip

# List available versions
aws s3 ls s3://myorg-terraform-modules/vpc/
# 2026-02-23 10:00:00      12345 v1.0.0.zip
# 2026-02-23 11:00:00      13456 v1.1.0.zip
```

A good directory structure in S3 looks like this:

```text
myorg-terraform-modules/
  vpc/
    v1.0.0.zip
    v1.1.0.zip
    v2.0.0.zip
  ecs-service/
    v1.0.0.zip
    v1.0.1.zip
  rds/
    v1.0.0.zip
```

## Referencing S3 Modules

There are two URL formats you can use:

### S3 URL Format

```hcl
# Using the s3:: prefix with the S3 URL
module "vpc" {
  source = "s3::https://myorg-terraform-modules.s3.amazonaws.com/vpc/v1.0.0.zip"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

### Regional S3 Endpoint

If your bucket is in a specific region, use the regional endpoint:

```hcl
# Regional S3 endpoint
module "vpc" {
  source = "s3::https://myorg-terraform-modules.s3.us-east-1.amazonaws.com/vpc/v1.0.0.zip"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

## Authentication

Terraform uses the standard AWS credential chain to authenticate with S3. This means it checks, in order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. AWS config file (`~/.aws/config`)
4. EC2 instance profile or ECS task role
5. Other credential sources in the chain

For most setups, if you can run `aws s3 ls s3://your-bucket` successfully, Terraform will also be able to download modules from that bucket.

### IAM Policy for Module Access

Create an IAM policy that grants the minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::myorg-terraform-modules",
        "arn:aws:s3:::myorg-terraform-modules/*"
      ]
    }
  ]
}
```

Attach this policy to the IAM user or role that runs Terraform.

### Cross-Account Access

If the module bucket is in a different AWS account, set up a bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::111111111111:root",
          "arn:aws:iam::222222222222:root"
        ]
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::myorg-terraform-modules",
        "arn:aws:s3:::myorg-terraform-modules/*"
      ]
    }
  ]
}
```

## Automating Module Publishing

Automate the packaging and uploading process with a script or CI/CD pipeline:

```bash
#!/bin/bash
# publish-module.sh - Package and upload a Terraform module to S3

MODULE_NAME=$1
VERSION=$2
MODULE_DIR="modules/${MODULE_NAME}"
BUCKET="myorg-terraform-modules"

# Validate inputs
if [ -z "$MODULE_NAME" ] || [ -z "$VERSION" ]; then
  echo "Usage: ./publish-module.sh <module-name> <version>"
  exit 1
fi

# Check that the module directory exists
if [ ! -d "$MODULE_DIR" ]; then
  echo "Module directory not found: $MODULE_DIR"
  exit 1
fi

# Create a temporary directory for packaging
TEMP_DIR=$(mktemp -d)
ZIP_FILE="${TEMP_DIR}/${MODULE_NAME}-${VERSION}.zip"

# Package the module
cd "$MODULE_DIR"
zip -r "$ZIP_FILE" *.tf
cd -

# Upload to S3
aws s3 cp "$ZIP_FILE" "s3://${BUCKET}/${MODULE_NAME}/${VERSION}.zip"

# Clean up
rm -rf "$TEMP_DIR"

echo "Published ${MODULE_NAME} version ${VERSION} to s3://${BUCKET}/${MODULE_NAME}/${VERSION}.zip"
```

Usage:

```bash
# Publish the VPC module version 1.2.0
./publish-module.sh vpc v1.2.0
```

## A Complete Working Example

Here is a full configuration using S3-hosted modules:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # You can even store state in S3
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "prod/infrastructure.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}

# main.tf
provider "aws" {
  region = "us-east-1"
}

# VPC module from S3
module "vpc" {
  source = "s3::https://myorg-terraform-modules.s3.us-east-1.amazonaws.com/vpc/v2.0.0.zip"

  vpc_cidr           = "10.0.0.0/16"
  environment        = "prod"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# ECS module from S3
module "ecs_cluster" {
  source = "s3::https://myorg-terraform-modules.s3.us-east-1.amazonaws.com/ecs-cluster/v1.3.0.zip"

  cluster_name   = "prod-cluster"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
}

# RDS module from S3
module "database" {
  source = "s3::https://myorg-terraform-modules.s3.us-east-1.amazonaws.com/rds/v1.1.0.zip"

  identifier     = "prod-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnet_ids
}

# outputs.tf
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "cluster_id" {
  value = module.ecs_cluster.cluster_id
}
```

## Versioning Strategy

Since S3 does not have built-in semantic versioning like the Terraform Registry, you need to establish a convention. The path-based approach shown above works well:

```text
s3://bucket/module-name/v1.0.0.zip   # Major.Minor.Patch
s3://bucket/module-name/v1.0.1.zip   # Patch release
s3://bucket/module-name/v1.1.0.zip   # Minor release
s3://bucket/module-name/v2.0.0.zip   # Breaking change
```

You can also maintain a `latest.zip` symlink for development (though you should never use "latest" in production):

```bash
# Copy the latest version as "latest" for development use
aws s3 cp s3://myorg-terraform-modules/vpc/v2.0.0.zip s3://myorg-terraform-modules/vpc/latest.zip
```

## S3 vs Other Module Sources

S3 modules are a good fit when:
- Your organization is AWS-native and already has IAM infrastructure
- You want simple, private module hosting without running a registry
- Your CI/CD pipeline already has AWS credentials
- You need cross-account module sharing with IAM policies

Consider the Terraform Registry when you need version constraints (`~>`, `>=`), or Git repositories when you want code review workflows tied to module changes.

## Summary

S3 is a straightforward way to host private Terraform modules. Package your module as a zip file, upload it to an S3 bucket with a version-based path, and reference it with the `s3::` prefix in your module source. AWS IAM handles authentication, and a simple naming convention handles versioning. For teams already running on AWS, this approach requires zero additional infrastructure.

For alternative hosting options, see [How to Call a Module from a GCS Bucket in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-a-gcs-bucket-in-terraform/view) and [How to Call a Module from the Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-the-terraform-registry/view).
