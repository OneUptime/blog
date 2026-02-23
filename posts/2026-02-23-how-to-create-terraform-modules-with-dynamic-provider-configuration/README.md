# How to Create Terraform Modules with Dynamic Provider Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Providers, Dynamic Configuration, Infrastructure as Code

Description: Learn how to create Terraform modules that support dynamic provider configuration for multi-account, multi-region, and cross-provider deployments.

---

Provider configuration in Terraform modules is one of those areas where things can get confusing quickly. Modules inherit providers from their callers, but sometimes you need more control - deploying to multiple AWS accounts, managing resources across regions, or working with multiple provider instances. This post explains how to handle all of these scenarios cleanly.

## How Provider Inheritance Works

By default, a child module inherits the default provider from its parent. If you configure an AWS provider in your root module, every child module automatically uses it.

```hcl
# Root module - providers.tf
provider "aws" {
  region = "us-east-1"
}

# This module automatically uses the aws provider from above
module "vpc" {
  source   = "./modules/vpc"
  vpc_cidr = "10.0.0.0/16"
}
```

This works fine for simple setups. The complexity starts when you need multiple provider configurations.

## Passing Aliased Providers to Modules

When you have multiple provider configurations (using aliases), you need to explicitly pass them to modules.

```hcl
# Root module - two AWS provider configurations
provider "aws" {
  region = "us-east-1"
  alias  = "primary"
}

provider "aws" {
  region = "eu-west-1"
  alias  = "secondary"
}

# The module declares which providers it expects
module "multi_region_s3" {
  source = "./modules/multi-region-s3"

  # Map the module's expected provider names to root provider configurations
  providers = {
    aws.primary   = aws.primary
    aws.secondary = aws.secondary
  }

  bucket_name = "my-replicated-bucket"
}
```

Inside the module, you declare the required provider configurations:

```hcl
# modules/multi-region-s3/providers.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.primary, aws.secondary]
    }
  }
}

# modules/multi-region-s3/main.tf
# Create bucket in primary region
resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = var.bucket_name
}

# Enable versioning for replication
resource "aws_s3_bucket_versioning" "primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Create replica bucket in secondary region
resource "aws_s3_bucket" "replica" {
  provider = aws.secondary
  bucket   = "${var.bucket_name}-replica"
}

resource "aws_s3_bucket_versioning" "replica" {
  provider = aws.secondary
  bucket   = aws_s3_bucket.replica.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Cross-Account Provider Configuration

A common pattern is deploying resources across multiple AWS accounts using assume role.

```hcl
# Root module - providers for different accounts
provider "aws" {
  region = "us-east-1"
  alias  = "shared_services"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformDeploy"
  }
}

provider "aws" {
  region = "us-east-1"
  alias  = "production"

  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformDeploy"
  }
}

provider "aws" {
  region = "us-east-1"
  alias  = "staging"

  assume_role {
    role_arn = "arn:aws:iam::333333333333:role/TerraformDeploy"
  }
}

# Module that creates VPC peering across accounts
module "vpc_peering" {
  source = "./modules/vpc-peering"

  providers = {
    aws.requester = aws.production
    aws.accepter  = aws.shared_services
  }

  requester_vpc_id = module.prod_vpc.vpc_id
  accepter_vpc_id  = module.shared_vpc.vpc_id
}
```

```hcl
# modules/vpc-peering/main.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.requester, aws.accepter]
    }
  }
}

# Create peering connection from requester side
resource "aws_vpc_peering_connection" "this" {
  provider    = aws.requester
  vpc_id      = var.requester_vpc_id
  peer_vpc_id = var.accepter_vpc_id
  auto_accept = false

  tags = {
    Name = "cross-account-peering"
  }
}

# Accept the peering connection from accepter side
resource "aws_vpc_peering_connection_accepter" "this" {
  provider                  = aws.accepter
  vpc_peering_connection_id = aws_vpc_peering_connection.this.id
  auto_accept               = true

  tags = {
    Name = "cross-account-peering"
  }
}
```

## Dynamic Provider Selection with Variables

You can build modules that select provider configurations based on input variables, though this requires some planning.

```hcl
# Root module with region-based provider selection
locals {
  # Define all regions you might deploy to
  regions = {
    us_east_1 = "us-east-1"
    us_west_2 = "us-west-2"
    eu_west_1 = "eu-west-1"
  }
}

# Create a provider for each region
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "us_west_2"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

# Deploy the same module to multiple regions
module "vpc_us_east" {
  source = "./modules/vpc"
  providers = {
    aws = aws.us_east_1
  }
  name     = "app-us-east"
  vpc_cidr = "10.0.0.0/16"
}

module "vpc_us_west" {
  source = "./modules/vpc"
  providers = {
    aws = aws.us_west_2
  }
  name     = "app-us-west"
  vpc_cidr = "10.1.0.0/16"
}

module "vpc_eu_west" {
  source = "./modules/vpc"
  providers = {
    aws = aws.eu_west_1
  }
  name     = "app-eu-west"
  vpc_cidr = "10.2.0.0/16"
}
```

## Multiple Provider Types in a Module

Some modules need to work with more than one provider type - for example, creating AWS resources and registering them in a DNS zone managed by a different provider.

```hcl
# modules/app-with-dns/providers.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# modules/app-with-dns/main.tf
resource "aws_lb" "this" {
  name               = var.name
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
}

# Create a DNS record in Cloudflare pointing to the AWS ALB
resource "cloudflare_record" "this" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain
  content = aws_lb.this.dns_name
  type    = "CNAME"
  proxied = true
}
```

```hcl
# Root module - pass both providers
provider "aws" {
  region = "us-east-1"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

module "app" {
  source = "./modules/app-with-dns"

  # Both providers are automatically inherited
  # because neither uses an alias

  name               = "my-app"
  public_subnet_ids  = module.vpc.public_subnet_ids
  cloudflare_zone_id = var.cloudflare_zone_id
  subdomain          = "api"
}
```

## Provider Configuration Best Practices

Here are the rules I follow for provider configuration in modules:

```hcl
# 1. Never hardcode provider configuration in child modules
# Bad - provider config locked in the module
provider "aws" {
  region = "us-east-1"  # Do not do this in a child module
}

# 2. Always declare configuration_aliases when using aliased providers
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.primary, aws.secondary]
    }
  }
}

# 3. Use the default (non-aliased) provider when possible
# This keeps the module simple for callers who only have one provider config
resource "aws_s3_bucket" "this" {
  # Uses the default aws provider - no explicit provider needed
  bucket = var.bucket_name
}

# 4. Document required providers clearly in the module README
# Required Providers:
#   aws.primary   - Provider for the primary region
#   aws.secondary - Provider for the DR region
```

## Handling Provider Versions

Modules should declare minimum provider versions but let the root module control the exact version.

```hcl
# modules/vpc/versions.tf
# Declare minimum version requirements
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"  # Minimum version, not exact
    }
  }
}

# Root module - controls the exact version
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31"  # Exact minor version constraint
    }
  }
}
```

## Conclusion

Dynamic provider configuration is essential for real-world Terraform modules that span accounts, regions, or cloud providers. The key principles are: never hardcode provider config in child modules, use `configuration_aliases` for aliased providers, pass providers explicitly through the `providers` block, and keep the default provider path simple. With these patterns in place, your modules become truly reusable across different deployment contexts.

For more on multi-cloud patterns, see our guide on [how to create Terraform modules for multi-cloud](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-multi-cloud/view) and [how to create Terraform modules that support multiple regions](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-that-support-multiple-regions/view).
