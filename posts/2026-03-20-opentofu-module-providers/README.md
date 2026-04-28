# Passing Providers to Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Provider

Description: Learn how to pass provider configurations to child modules in OpenTofu for multi-region and cross-account deployments.

By default, child modules inherit their parent's default provider configurations. When you use provider aliases or need explicit routing of providers, use the `providers` argument to pass specific provider configurations to modules.

## Default Provider Inheritance

```hcl
provider "aws" {
  region = "us-east-1"
}

# Module inherits the default aws provider

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

# Pass the EU provider to the module
module "eu_vpc" {
  source = "./modules/vpc"

  providers = {
    aws = aws.eu
  }

  cidr_block = "172.16.0.0/16"
}
```

## Module Declaring Required Providers

```hcl
# modules/multi-region/versions.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.0"
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
```

## Calling the Module with Provider Map

```hcl
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

module "global_buckets" {
  source = "./modules/multi-region"

  providers = {
    aws.primary   = aws.us_east
    aws.secondary = aws.eu_west
  }

  name = "myapp"
}
```

## Passing Multiple Providers

```hcl
module "full_app" {
  source = "./modules/application"

  providers = {
    aws        = aws           # Default AWS
    aws.replica = aws.backup   # Backup region
    kubernetes = kubernetes    # K8s cluster
    cloudflare = cloudflare    # DNS
  }

  domain      = "example.com"
  environment = var.environment
}
```

## Conclusion

Provider passing gives you fine-grained control over which provider configuration each module uses. Use `configuration_aliases` in modules to declare which aliases they expect, and use the `providers` map in module calls to route the right provider to each module. This pattern is essential for multi-region and cross-account architectures.
