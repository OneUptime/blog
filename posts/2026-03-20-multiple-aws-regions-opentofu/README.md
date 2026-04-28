# How to Configure Multiple AWS Regions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, AWS, Terraform, IaC, DevOps, Multi-Region

Description: Learn how to configure OpenTofu to deploy resources across multiple AWS regions using provider aliases and how to manage cross-region dependencies.

## Introduction

Many production architectures deploy resources across multiple AWS regions - primary and disaster recovery, global CloudFront + certificate in us-east-1, or edge locations. OpenTofu handles this through provider aliases: each alias represents a provider configuration for a specific region, and resources reference the appropriate alias.

## Provider Aliases for Multiple Regions

```hcl
# Primary region

provider "aws" {
  region = "us-east-1"
}

# Secondary region (alias required for additional providers of same type)
provider "aws" {
  alias  = "us_west_2"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}
```

## Deploying Resources to Specific Regions

```hcl
# This resource uses the default (us-east-1) provider
resource "aws_vpc" "primary" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "primary-vpc", Region = "us-east-1" }
}

# This resource deploys to us-west-2
resource "aws_vpc" "secondary" {
  provider   = aws.us_west_2
  cidr_block = "10.1.0.0/16"
  tags       = { Name = "secondary-vpc", Region = "us-west-2" }
}

# This resource deploys to eu-west-1
resource "aws_vpc" "europe" {
  provider   = aws.eu_west_1
  cidr_block = "10.2.0.0/16"
  tags       = { Name = "europe-vpc", Region = "eu-west-1" }
}
```

## CloudFront + ACM Pattern (Certificate Must Be in us-east-1)

```hcl
# Default provider for your application region
provider "aws" {
  region = "eu-west-1"  # Application runs in EU
}

# CloudFront certificates MUST be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Certificate must be in us-east-1 for CloudFront
resource "aws_acm_certificate" "cdn" {
  provider    = aws.us_east_1  # Required for CloudFront
  domain_name = var.domain_name

  validation_method = "DNS"
}

resource "aws_cloudfront_distribution" "main" {
  # CloudFront is global, uses default provider
  aliases = [var.domain_name]

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.cdn.arn
    ssl_support_method  = "sni-only"
  }

  # ...distribution config
}
```

## Multi-Region S3 Replication

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

# Primary bucket
resource "aws_s3_bucket" "primary" {
  bucket = "${var.prefix}-primary"
}

# Replica bucket
resource "aws_s3_bucket" "replica" {
  provider = aws.west
  bucket   = "${var.prefix}-replica"
}

resource "aws_s3_bucket_replication_configuration" "replication" {
  bucket = aws_s3_bucket.primary.id
  role   = aws_iam_role.replication.arn

  rule {
    status = "Enabled"
    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

## Multi-Region in Modules

Pass the provider to modules using `providers` map:

```hcl
module "app_primary" {
  source = "./modules/app"
  region = "us-east-1"

  providers = {
    aws = aws  # Uses default provider
  }
}

module "app_secondary" {
  source = "./modules/app"
  region = "us-west-2"

  providers = {
    aws = aws.us_west_2  # Uses aliased provider
  }
}
```

```hcl
# modules/app/main.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}

# This module uses whatever provider was passed in
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
}
```

## Dynamic Region Configuration

Use variables to configure regions:

```hcl
variable "primary_region" {
  default = "us-east-1"
}

variable "secondary_region" {
  default = "us-west-2"
}

provider "aws" {
  region = var.primary_region
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}
```

## Data Sources Across Regions

```hcl
# Look up AMI in the primary region
data "aws_ami" "ubuntu_primary" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# Look up AMI in the secondary region (requires aliased provider)
data "aws_ami" "ubuntu_secondary" {
  provider    = aws.us_west_2
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}
```

## Conclusion

Multiple AWS regions in OpenTofu are managed through provider aliases. The default provider handles resources in the primary region; aliased providers handle other regions. Always use `provider = aws.<alias>` on resources destined for non-default regions. For CloudFront, remember that ACM certificates must be in `us-east-1` regardless of where your application runs. When building reusable modules, accept providers via the `providers` argument to make them region-agnostic.
