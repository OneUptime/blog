# How to Use the provider Meta-Argument in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Providers, Multi-Region, Infrastructure as Code

Description: Learn how to use the Terraform provider meta-argument to work with multiple provider configurations for multi-region deployments, cross-account access, and resources that require specific provider settings.

---

When you have a single AWS account in one region, provider configuration is simple - one provider block and every resource uses it. But real-world infrastructure often spans multiple regions, multiple accounts, or multiple cloud providers. The `provider` meta-argument lets you tell a specific resource which provider configuration to use.

This post covers how to set up multiple provider configurations and select the right one for each resource.

## Default Provider Configuration

Without any aliases, Terraform uses the default provider configuration for all resources of that provider type:

```hcl
# Default AWS provider - all aws_ resources use this
provider "aws" {
  region = "us-east-1"
}

# Uses the default provider (us-east-1)
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

# Also uses the default provider (us-east-1)
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

## Provider Aliases

To create multiple configurations for the same provider, use the `alias` argument:

```hcl
# Default provider - us-east-1
provider "aws" {
  region = "us-east-1"
}

# Aliased provider - eu-west-1
provider "aws" {
  alias  = "europe"
  region = "eu-west-1"
}

# Aliased provider - ap-southeast-1
provider "aws" {
  alias  = "asia"
  region = "ap-southeast-1"
}
```

Now you have three AWS provider configurations. Resources without a `provider` argument use the default (us-east-1). Resources that need a different region use the `provider` meta-argument.

## Selecting a Provider for a Resource

Use the `provider` meta-argument to specify which provider configuration to use:

```hcl
# Uses the default provider (us-east-1)
resource "aws_s3_bucket" "us_data" {
  bucket = "myapp-us-data"
}

# Uses the europe provider (eu-west-1)
resource "aws_s3_bucket" "eu_data" {
  provider = aws.europe
  bucket   = "myapp-eu-data"
}

# Uses the asia provider (ap-southeast-1)
resource "aws_s3_bucket" "asia_data" {
  provider = aws.asia
  bucket   = "myapp-asia-data"
}
```

The syntax is `<provider_name>.<alias>`.

## Multi-Region Deployment

The most common use case for the `provider` meta-argument is deploying the same infrastructure to multiple regions:

```hcl
# Provider configurations
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

# Primary region resources
resource "aws_vpc" "primary" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name   = "primary-vpc"
    Region = "us-east-1"
  }
}

# Secondary region resources
resource "aws_vpc" "secondary" {
  provider   = aws.us_west
  cidr_block = "10.1.0.0/16"

  tags = {
    Name   = "secondary-vpc"
    Region = "us-west-2"
  }
}

# DynamoDB global table requires tables in both regions
resource "aws_dynamodb_table" "primary" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
}

resource "aws_dynamodb_table" "secondary" {
  provider     = aws.us_west
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
}
```

## CloudFront with ACM Certificate

CloudFront requires ACM certificates to be in us-east-1, regardless of where your other resources are:

```hcl
# Main provider - wherever your app is deployed
provider "aws" {
  region = "eu-west-1"
}

# CloudFront needs certificates in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Certificate must be in us-east-1 for CloudFront
resource "aws_acm_certificate" "cdn" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Validation record can be in any region
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cdn.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Certificate validation in us-east-1
resource "aws_acm_certificate_validation" "cdn" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cdn.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront distribution - uses default provider region for origin
resource "aws_cloudfront_distribution" "main" {
  # ...
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cdn.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

## Cross-Account Access

Use provider aliases for deploying resources across multiple AWS accounts:

```hcl
# Primary account
provider "aws" {
  region = "us-east-1"
}

# Shared services account
provider "aws" {
  alias  = "shared"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformDeployRole"
  }
}

# Logging account
provider "aws" {
  alias  = "logging"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::333333333333:role/TerraformDeployRole"
  }
}

# Application resources in the primary account
resource "aws_ecs_cluster" "main" {
  name = var.project
}

# Shared DNS in the shared services account
resource "aws_route53_record" "app" {
  provider = aws.shared

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${var.project}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Centralized logging bucket in the logging account
resource "aws_s3_bucket" "logs" {
  provider = aws.logging
  bucket   = "centralized-logs-${var.project}"
}
```

## Provider in Modules

Modules can accept provider configurations through the `providers` argument:

```hcl
# Root module providers
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

# Pass the DR provider to the module
module "disaster_recovery" {
  source = "./modules/dr"

  providers = {
    aws = aws.dr  # The module's default "aws" provider uses the DR region
  }

  project     = var.project
  environment = var.environment
}
```

Inside the module, resources use the provided configuration as their default:

```hcl
# modules/dr/main.tf
# This uses whatever "aws" provider was passed to the module
resource "aws_s3_bucket" "dr_backup" {
  bucket = "${var.project}-${var.environment}-dr-backup"
}
```

For modules that need multiple provider configurations:

```hcl
# Module definition expects two providers
# modules/replication/main.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.primary, aws.replica]
    }
  }
}

resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = "${var.project}-primary-data"
}

resource "aws_s3_bucket" "replica" {
  provider = aws.replica
  bucket   = "${var.project}-replica-data"
}
```

```hcl
# Root module passes both providers
module "replication" {
  source = "./modules/replication"

  providers = {
    aws.primary = aws           # Default provider
    aws.replica = aws.us_west   # Aliased provider
  }

  project = var.project
}
```

## Multi-Cloud Provider Configuration

The `provider` meta-argument works across different cloud providers too:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "google" {
  project = var.gcp_project
  region  = "us-central1"
}

# AWS resource
resource "aws_s3_bucket" "data" {
  bucket = "myapp-data"
}

# GCP resource - Terraform selects the google provider automatically
resource "google_storage_bucket" "backup" {
  name     = "myapp-backup"
  location = "US"
}
```

For resources from different providers, Terraform selects the correct provider based on the resource type prefix. You only need the `provider` meta-argument when choosing between multiple configurations of the same provider.

## Data Sources with Provider

Data sources also support the `provider` meta-argument:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "oregon"
  region = "us-west-2"
}

# Fetch AMI from us-east-1
data "aws_ami" "east_ami" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Fetch AMI from us-west-2
data "aws_ami" "west_ami" {
  provider    = aws.oregon
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}
```

## Summary

The `provider` meta-argument gives you control over which provider configuration each resource uses. Set up multiple configurations with `alias`, select them with `provider = aws.alias_name`, and pass them to modules with the `providers` argument. Common use cases include multi-region deployments, CloudFront ACM certificates in us-east-1, cross-account resource management, and disaster recovery setups. When no `provider` is specified, resources use the default (unaliased) provider configuration.

For more on Terraform meta-arguments, see our post on [resource meta-arguments in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-resource-meta-arguments-in-terraform/view).
