# How to Use the providers Argument in Module Blocks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Provider, Infrastructure as Code, Multi-Region, DevOps

Description: Learn how to use the providers argument in Terraform module blocks to pass specific provider configurations to modules for multi-region and multi-account deployments.

---

By default, a Terraform module inherits provider configurations from its calling module. This works fine when you only have one configuration per provider. But as soon as you need multi-region deployments, multi-account setups, or multiple configurations of the same provider, you need the `providers` argument to explicitly tell a module which provider configuration to use.

This guide explains when and how to use the `providers` argument in module blocks.

## How Provider Inheritance Works

Before diving into the `providers` argument, it is important to understand the default behavior. When you call a module without specifying `providers`, the module inherits all providers from the calling module that match by name:

```hcl
# Root module
provider "aws" {
  region = "us-east-1"
}

# This module automatically uses the aws provider configured above
module "vpc" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
}
```

The `vpc` module uses the `aws` provider with `region = "us-east-1"` because that is the only `aws` provider configured in the calling module. No `providers` argument needed.

## When You Need the providers Argument

You need `providers` when:

1. You have multiple configurations of the same provider (aliased providers)
2. A module expects a provider with a different name than what you have configured
3. You want to explicitly control which provider a module uses instead of relying on inheritance

## Multi-Region Deployments

The most common use case. You want to deploy the same module in multiple AWS regions:

```hcl
# Configure two AWS providers for different regions
provider "aws" {
  region = "us-east-1"
  alias  = "east"
}

provider "aws" {
  region = "eu-west-1"
  alias  = "europe"
}

# Deploy a VPC in US East
module "vpc_east" {
  source = "./modules/vpc"

  providers = {
    aws = aws.east  # Map the module's "aws" provider to our "aws.east"
  }

  cidr        = "10.0.0.0/16"
  environment = "prod-east"
}

# Deploy the same VPC module in Europe
module "vpc_europe" {
  source = "./modules/vpc"

  providers = {
    aws = aws.europe  # Map the module's "aws" provider to our "aws.europe"
  }

  cidr        = "10.1.0.0/16"
  environment = "prod-europe"
}
```

Inside the `vpc` module, all resources just use the default `aws` provider. The `providers` argument in the calling module remaps which concrete provider configuration backs that reference.

## The Syntax

The `providers` argument is a map where:
- Keys are the provider names as used inside the module
- Values are provider references from the calling module

```hcl
module "example" {
  source = "./modules/example"

  providers = {
    # module's provider name = caller's provider reference
    aws          = aws.production
    aws.replica  = aws.disaster_recovery
  }
}
```

## Modules That Require Multiple Providers

Some modules need more than one configuration of the same provider. For example, a module that sets up cross-region replication:

```hcl
# modules/s3-replication/main.tf

# This module expects two AWS providers:
# - aws (default) for the primary bucket
# - aws.replica for the replica bucket

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.replica]  # Declare the aliased provider
    }
  }
}

resource "aws_s3_bucket" "primary" {
  bucket = "${var.bucket_name}-primary"
}

resource "aws_s3_bucket" "replica" {
  provider = aws.replica  # Use the aliased provider
  bucket   = "${var.bucket_name}-replica"
}

resource "aws_s3_bucket_replication_configuration" "replication" {
  bucket = aws_s3_bucket.primary.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD"
    }
  }
}
```

Calling this module:

```hcl
# Root module
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  region = "us-west-2"
  alias  = "west"
}

module "replicated_bucket" {
  source = "./modules/s3-replication"

  providers = {
    aws         = aws           # Primary in us-east-1
    aws.replica = aws.west      # Replica in us-west-2
  }

  bucket_name = "myapp-data"
}
```

## configuration_aliases

When a module needs aliased providers, it must declare them using `configuration_aliases` in the `required_providers` block:

```hcl
# Inside the module's versions.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.0"
      configuration_aliases = [aws.secondary]
    }
  }
}
```

This tells Terraform and anyone using the module that it expects both a default `aws` provider and an aliased `aws.secondary` provider. The caller must provide both through the `providers` argument.

## Multi-Account Deployments

Another common pattern is deploying resources across multiple AWS accounts:

```hcl
# Shared services account
provider "aws" {
  region = "us-east-1"
  alias  = "shared"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformRole"
  }
}

# Application account
provider "aws" {
  region = "us-east-1"
  alias  = "app"

  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformRole"
  }
}

# Monitoring account
provider "aws" {
  region = "us-east-1"
  alias  = "monitoring"

  assume_role {
    role_arn = "arn:aws:iam::333333333333:role/TerraformRole"
  }
}

# Deploy VPC in the app account
module "app_vpc" {
  source = "./modules/vpc"

  providers = {
    aws = aws.app
  }

  cidr = "10.0.0.0/16"
}

# Deploy monitoring in the monitoring account
module "monitoring" {
  source = "./modules/monitoring"

  providers = {
    aws = aws.monitoring
  }

  vpc_id = module.app_vpc.vpc_id
}
```

## Multi-Cloud Modules

Modules that work with multiple cloud providers use the `providers` argument to receive each provider:

```hcl
# A module that sets up DNS across both AWS and GCP
module "dns" {
  source = "./modules/hybrid-dns"

  providers = {
    aws    = aws.production
    google = google.production
  }

  domain = "example.com"
}
```

## A Complete Multi-Region Example

Here is a realistic example deploying a full application stack across two regions:

```hcl
# providers.tf
provider "aws" {
  region = "us-east-1"
  alias  = "primary"
}

provider "aws" {
  region = "eu-west-1"
  alias  = "secondary"
}

# main.tf

# Primary region infrastructure
module "primary_vpc" {
  source = "./modules/vpc"
  providers = { aws = aws.primary }

  cidr        = "10.0.0.0/16"
  environment = "prod"
  region_name = "primary"
}

module "primary_database" {
  source = "./modules/rds"
  providers = { aws = aws.primary }

  vpc_id     = module.primary_vpc.vpc_id
  subnet_ids = module.primary_vpc.database_subnet_ids
  identifier = "prod-primary"
}

module "primary_app" {
  source = "./modules/ecs-service"
  providers = { aws = aws.primary }

  vpc_id      = module.primary_vpc.vpc_id
  subnet_ids  = module.primary_vpc.private_subnet_ids
  db_endpoint = module.primary_database.endpoint
}

# Secondary region infrastructure (disaster recovery)
module "secondary_vpc" {
  source = "./modules/vpc"
  providers = { aws = aws.secondary }

  cidr        = "10.1.0.0/16"
  environment = "prod"
  region_name = "secondary"
}

module "secondary_database" {
  source = "./modules/rds"
  providers = { aws = aws.secondary }

  vpc_id     = module.secondary_vpc.vpc_id
  subnet_ids = module.secondary_vpc.database_subnet_ids
  identifier = "prod-secondary"

  # Read replica of primary
  replicate_source_db = module.primary_database.db_arn
}

# Cross-region replication for S3
module "data_replication" {
  source = "./modules/s3-replication"

  providers = {
    aws         = aws.primary
    aws.replica = aws.secondary
  }

  bucket_name = "prod-application-data"
}
```

## Common Mistakes

**Forgetting to pass providers to nested modules.** If Module A calls Module B, and Module A receives explicit providers, Module B also needs them passed explicitly. Provider inheritance only works for the default (non-aliased) provider.

**Mismatched provider names.** The keys in the `providers` map must match what the module expects. If the module uses `aws`, the key must be `aws`. If the module declares `configuration_aliases = [aws.secondary]`, you must provide `aws.secondary`.

**Using aliased providers without the providers argument.** If all your providers are aliased (no default), modules will not inherit any of them automatically. You must use the `providers` argument.

## Summary

The `providers` argument is how you control which provider configuration a module uses. It is essential for multi-region deployments, multi-account architectures, and any situation where you have more than one configuration for the same provider type. The syntax maps provider names as used inside the module to provider references in the calling module. For modules that need multiple configurations of the same provider, declare `configuration_aliases` in the module's `required_providers` block.

For more on passing provider configurations, see [How to Pass Provider Configurations to Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-pass-provider-configurations-to-modules/view). For module composition patterns, check out [How to Chain Module Outputs to Other Module Inputs](https://oneuptime.com/blog/post/2026-02-23-how-to-chain-module-outputs-to-other-module-inputs/view).
