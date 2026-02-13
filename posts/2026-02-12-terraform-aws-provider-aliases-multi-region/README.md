# How to Use Terraform AWS Provider Aliases for Multi-Region

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Multi-Region

Description: Complete guide to using Terraform AWS provider aliases for multi-region deployments, covering provider configuration, module patterns, data replication, and disaster recovery setups.

---

When you're deploying infrastructure across multiple AWS regions, Terraform's provider alias system is how you tell it where to create each resource. Without aliases, every resource goes to whatever region your default provider is configured for. With aliases, you can deploy a DynamoDB table in us-east-1 and a replica in eu-west-1, all in the same Terraform configuration.

This guide covers provider alias configuration, common multi-region patterns, passing providers to modules, and building a practical disaster recovery setup.

## Provider Alias Basics

The default provider uses the region from your AWS configuration or the provider block. Aliases let you create additional providers pointing to different regions.

This configures providers for three regions:

```hcl
# Default provider - us-east-1
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}

# Provider alias for eu-west-1
provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}

# Provider alias for ap-southeast-1
provider "aws" {
  alias  = "ap_southeast_1"
  region = "ap-southeast-1"

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}
```

To use an alias, add the `provider` argument to any resource:

```hcl
# This goes in us-east-1 (default provider)
resource "aws_s3_bucket" "primary" {
  bucket = "my-app-primary"
}

# This goes in eu-west-1
resource "aws_s3_bucket" "secondary" {
  provider = aws.eu_west_1
  bucket   = "my-app-secondary"
}
```

## ACM Certificates for CloudFront

The classic multi-region use case: CloudFront requires certificates in us-east-1, regardless of where your infrastructure lives.

This creates a certificate in us-east-1 for a CloudFront distribution managed in another region:

```hcl
provider "aws" {
  region = "eu-west-1"  # Main region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Certificate must be in us-east-1 for CloudFront
resource "aws_acm_certificate" "cdn" {
  provider          = aws.us_east_1
  domain_name       = "cdn.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Route 53 is global, so it works with any provider
resource "aws_route53_record" "cdn_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cdn.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "cdn" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cdn.arn
  validation_record_fqdns = [for record in aws_route53_record.cdn_validation : record.fqdn]
}
```

## Multi-Region S3 Replication

S3 Cross-Region Replication is a common multi-region pattern. You need buckets in both regions.

This sets up S3 replication from us-east-1 to eu-west-1:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}

# Primary bucket in us-east-1
resource "aws_s3_bucket" "primary" {
  bucket = "my-app-data-primary"
}

resource "aws_s3_bucket_versioning" "primary" {
  bucket = aws_s3_bucket.primary.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Replica bucket in eu-west-1
resource "aws_s3_bucket" "replica" {
  provider = aws.eu
  bucket   = "my-app-data-replica"
}

resource "aws_s3_bucket_versioning" "replica" {
  provider = aws.eu
  bucket   = aws_s3_bucket.replica.id
  versioning_configuration {
    status = "Enabled"
  }
}

# IAM role for replication
resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "s3.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "replication" {
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.primary.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.primary.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.replica.arn}/*"
      }
    ]
  })
}

resource "aws_s3_bucket_replication_configuration" "primary" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.primary.id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD_IA"
    }
  }

  depends_on = [
    aws_s3_bucket_versioning.primary,
    aws_s3_bucket_versioning.replica
  ]
}
```

## Passing Providers to Modules

When you use modules, providers need to be explicitly passed through.

This shows how to create a module that works in any region:

```hcl
# Root module configuration
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}

# Deploy the same module in two regions
module "app_us" {
  source = "./modules/app-stack"

  environment = "production"
  region      = "us-east-1"
}

module "app_eu" {
  source = "./modules/app-stack"

  providers = {
    aws = aws.eu
  }

  environment = "production"
  region      = "eu-west-1"
}
```

Inside the module, declare the provider requirement:

```hcl
# modules/app-stack/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment" {
  type = string
}

variable "region" {
  type = string
}

# Resources here use whatever provider was passed in
resource "aws_s3_bucket" "app_data" {
  bucket = "app-data-${var.environment}-${var.region}"
}
```

## DynamoDB Global Tables

DynamoDB Global Tables replicate data across regions automatically. With Terraform, you create the table in one region and add replicas.

This creates a DynamoDB global table spanning two regions:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}

resource "aws_dynamodb_table" "global" {
  name             = "user-sessions"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "session_id"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "session_id"
    type = "S"
  }

  replica {
    region_name = "eu-west-1"
  }

  tags = {
    Name = "user-sessions-global"
  }
}
```

## Multi-Region Data Sources

Sometimes you need to look up data in another region. Data sources accept the `provider` argument too.

This looks up an AMI in a different region:

```hcl
data "aws_ami" "ubuntu_eu" {
  provider    = aws.eu_west_1
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"]  # Canonical
}
```

## Multi-Region with for_each

For deploying to many regions, combine `for_each` with a map of providers. Unfortunately, Terraform doesn't support dynamic provider configurations, so you need to define each provider explicitly. But you can use modules with `for_each` and provider maps.

This pattern uses locals to manage region-specific configurations:

```hcl
locals {
  regions = {
    primary   = "us-east-1"
    secondary = "eu-west-1"
    tertiary  = "ap-southeast-1"
  }
}

# You still need explicit provider blocks
provider "aws" {
  alias  = "primary"
  region = local.regions.primary
}

provider "aws" {
  alias  = "secondary"
  region = local.regions.secondary
}

provider "aws" {
  alias  = "tertiary"
  region = local.regions.tertiary
}
```

## Common Gotchas

**Provider in state**: When you change a resource's provider, Terraform treats it as a destroy-and-recreate. Plan carefully before changing provider assignments.

**Global services**: Some AWS services (IAM, Route 53, CloudFront) are global. They work with any regional provider, but only need to be created once.

**Module provider requirements**: If a module uses provider aliases internally, the root module must pass all required providers. Forgetting one gives a confusing error.

**State management**: Multi-region deployments can use a single state file or separate state files per region. Single state is simpler but creates a blast radius issue. Separate state files are safer but require cross-state data sharing with `terraform_remote_state`.

For creating certificates that work across regions, see our guide on [ACM certificates with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-acm-certificates-terraform/view).

## Wrapping Up

Provider aliases are the mechanism that makes multi-region Terraform possible. The pattern is always the same: define aliased providers for each region, pass them to resources or modules, and let Terraform handle the rest. Start with the simplest setup (one default provider plus aliases for specific needs) and expand as your multi-region requirements grow. The key thing to remember is that providers are static - you can't dynamically generate them with `for_each` - so plan your provider blocks based on the regions you need to support.
