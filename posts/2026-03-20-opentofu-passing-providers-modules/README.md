# Passing Providers Between Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, Module

Description: Learn how to pass provider configurations between parent and child modules in OpenTofu for flexible multi-region architectures.

By default, child modules inherit the default provider configurations from their parent. But when you use provider aliases or need explicit control over which provider a module uses, you must pass providers explicitly via the `providers` argument.

## Default Provider Inheritance

When no `providers` argument is specified, modules inherit all default providers:

```hcl
# Root module

provider "aws" {
  region = "us-east-1"
}

# This module uses the inherited "aws" provider for us-east-1
module "vpc" {
  source     = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
}
```

## Explicit Provider Passing

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}

# Pass specific provider to the module
module "eu_vpc" {
  source = "./modules/vpc"

  providers = {
    aws = aws.eu   # Map module's "aws" to the eu alias
  }

  cidr_block = "172.16.0.0/16"
}
```

## Modules That Require Multiple Providers

```hcl
# Root configuration
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "replica_region"
  region = "eu-central-1"
}

provider "cloudflare" {
  api_token = var.cloudflare_token
}

module "application" {
  source = "./modules/application"

  providers = {
    aws              = aws                    # Primary region
    aws.replica      = aws.replica_region     # Replica region
    cloudflare       = cloudflare             # DNS provider
  }

  domain      = "example.com"
  environment = "production"
}
```

```hcl
# modules/application/versions.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.0"
      configuration_aliases = [aws.replica]  # Declares the alias this module needs
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 4.0"
    }
  }
}
```

## The providers Map Syntax

```hcl
module "example" {
  source = "./modules/example"

  providers = {
    # "local name in module" = "provider in parent module"
    aws        = aws           # Use parent's default aws
    aws.useast = aws           # Map aws.useast alias in module to parent's default aws
    aws.euwest = aws.eu        # Map aws.euwest in module to parent's eu alias
    kubernetes = kubernetes    # Pass kubernetes as-is
  }
}
```

## Module Receiving Providers

```hcl
# modules/multi-region/versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
      # Declare aliases this module expects to receive
      configuration_aliases = [aws.primary, aws.secondary]
    }
  }
}

# modules/multi-region/main.tf
resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = "${var.name}-primary"
}

resource "aws_s3_bucket" "secondary" {
  provider = aws.secondary
  bucket   = "${var.name}-secondary"
}

# modules/multi-region/outputs.tf
output "primary_bucket_arn" {
  value = aws_s3_bucket.primary.arn
}

output "secondary_bucket_arn" {
  value = aws_s3_bucket.secondary.arn
}
```

```hcl
# Root module using the multi-region module
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

module "global_storage" {
  source = "./modules/multi-region"

  providers = {
    aws.primary   = aws.us_east
    aws.secondary = aws.eu_west
  }

  name = "myapp-data"
}
```

## Optional Provider Passing

For modules that work with or without a secondary provider:

```hcl
# modules/database/versions.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.0"
      # Caller must always pass this alias; the replica resource below uses it conditionally
      configuration_aliases = [aws.replica]
    }
  }
}

# modules/database/main.tf
resource "aws_db_instance" "primary" {
  engine        = "postgres"
  instance_class = "db.r5.large"
}

# Only create replica if the provider alias was passed
resource "aws_db_instance" "replica" {
  count    = var.create_replica ? 1 : 0
  provider = aws.replica

  replicate_source_db = aws_db_instance.primary.arn
  instance_class      = "db.r5.large"
}
```

## Conclusion

Explicit provider passing gives you precise control over which provider configuration each module uses. Use the `providers` map to pass aliases, declare expected aliases in modules via `configuration_aliases`, and remember that by default, child modules inherit the parent's default provider. This flexibility is essential for multi-region and multi-account architectures.
