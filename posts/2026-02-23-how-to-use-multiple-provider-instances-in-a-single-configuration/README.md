# How to Use Multiple Provider Instances in a Single Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Multi-Cloud, Infrastructure as Code, Configuration

Description: Learn how to configure and use multiple instances of the same or different providers in a single Terraform configuration using aliases, for multi-region and multi-account deployments.

---

Real-world infrastructure rarely lives in a single region or a single cloud account. You might need to deploy resources across multiple AWS regions, manage both a staging and production Kubernetes cluster, or work with several cloud providers simultaneously. Terraform handles this through provider aliases, letting you define multiple instances of the same provider in one configuration. This guide covers how to set it up and when to use it.

## The Problem

By default, Terraform associates each provider with a single configuration. If you declare `provider "aws" {}`, every AWS resource in your configuration uses that one provider instance. But what happens when you need to create an S3 bucket in us-east-1 and a DynamoDB table in eu-west-1? Or when you need to deploy resources in both a development and production AWS account?

That is where provider aliases come in.

## Basic Provider Aliases

The `alias` meta-argument lets you create named instances of a provider:

```hcl
# Default AWS provider - us-east-1
provider "aws" {
  region = "us-east-1"
}

# Second AWS provider instance for eu-west-1
provider "aws" {
  alias  = "europe"
  region = "eu-west-1"
}

# This resource uses the default provider (us-east-1)
resource "aws_s3_bucket" "us_bucket" {
  bucket = "my-app-data-us"
}

# This resource uses the aliased provider (eu-west-1)
resource "aws_s3_bucket" "eu_bucket" {
  provider = aws.europe
  bucket   = "my-app-data-eu"
}
```

The key points are:

- One provider instance can be the default (no alias). Every resource without an explicit `provider` argument uses this one.
- Additional instances get an `alias`. Resources reference them with the `provider` argument using the format `provider_name.alias`.

## Multi-Region Deployments

A common pattern is deploying the same resources across multiple regions for high availability:

```hcl
# US East - primary region
provider "aws" {
  region = "us-east-1"
}

# US West - secondary region
provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

# Asia Pacific - tertiary region
provider "aws" {
  alias  = "ap_southeast"
  region = "ap-southeast-1"
}

# VPC in each region
resource "aws_vpc" "primary" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "primary-vpc"
  }
}

resource "aws_vpc" "secondary" {
  provider   = aws.us_west
  cidr_block = "10.1.0.0/16"

  tags = {
    Name = "secondary-vpc"
  }
}

resource "aws_vpc" "tertiary" {
  provider   = aws.ap_southeast
  cidr_block = "10.2.0.0/16"

  tags = {
    Name = "tertiary-vpc"
  }
}
```

## Multi-Account Deployments

If your organization uses separate AWS accounts for different environments or teams, you can assume roles into each:

```hcl
# Development account
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformRole"
  }
}

# Staging account
provider "aws" {
  alias  = "staging"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformRole"
  }
}

# Production account
provider "aws" {
  alias  = "production"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::333333333333:role/TerraformRole"
  }
}

# Create resources in specific accounts
resource "aws_s3_bucket" "dev_logs" {
  bucket = "dev-application-logs"
}

resource "aws_s3_bucket" "staging_logs" {
  provider = aws.staging
  bucket   = "staging-application-logs"
}

resource "aws_s3_bucket" "prod_logs" {
  provider = aws.production
  bucket   = "prod-application-logs"
}
```

## Multiple Different Providers

You can also mix completely different cloud providers:

```hcl
# AWS provider
provider "aws" {
  region = "us-east-1"
}

# Google Cloud provider
provider "google" {
  project = "my-gcp-project"
  region  = "us-central1"
}

# Azure provider
provider "azurerm" {
  features {}

  subscription_id = var.azure_subscription_id
}

# Create resources across all three clouds
resource "aws_s3_bucket" "data" {
  bucket = "cross-cloud-data-aws"
}

resource "google_storage_bucket" "data" {
  name     = "cross-cloud-data-gcp"
  location = "US"
}

resource "azurerm_storage_account" "data" {
  name                     = "crossclouddataazure"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = "East US"
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Passing Providers to Modules

When using modules, you pass provider instances through the `providers` argument:

```hcl
# Root module configuration
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

# Pass the default provider to the module
module "east_deployment" {
  source = "./modules/app"

  environment = "production"
  region      = "us-east-1"
}

# Pass the aliased provider to a second module instance
module "west_deployment" {
  source = "./modules/app"

  providers = {
    aws = aws.west
  }

  environment = "production"
  region      = "us-west-2"
}
```

Inside the module, declare which providers it expects:

```hcl
# modules/app/providers.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# The module uses whatever aws provider is passed to it
# No need to configure credentials here
```

## Modules Requiring Multiple Providers

Some modules need more than one provider instance. For example, a module that sets up DNS in one region and compute in another:

```hcl
# modules/global-app/providers.tf

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.dns]
    }
  }
}

# Use the default provider for compute resources
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
}

# Use the dns-aliased provider for Route53
# (Route53 is global but the provider still needs a region)
resource "aws_route53_record" "app" {
  provider = aws.dns

  zone_id = var.zone_id
  name    = var.hostname
  type    = "A"
  ttl     = 300
  records = [aws_instance.app.public_ip]
}
```

Call the module from the root:

```hcl
provider "aws" {
  region = "us-west-2"
}

provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

module "app" {
  source = "./modules/global-app"

  providers = {
    aws     = aws
    aws.dns = aws.us_east
  }

  ami_id   = "ami-0abc123"
  zone_id  = "Z1234567890"
  hostname = "app.example.com"
}
```

## Dynamic Provider Configuration with Variables

You can parameterize provider configurations:

```hcl
variable "regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2", "eu-west-1"]
}

# Note: You cannot dynamically create provider blocks.
# Providers must be statically defined. But you can use
# variables within provider blocks.

variable "primary_region" {
  type    = string
  default = "us-east-1"
}

variable "secondary_region" {
  type    = string
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

One important limitation: you cannot use `for_each` or `count` to dynamically create provider blocks. Each provider instance must be explicitly declared. This is a fundamental Terraform constraint because providers are resolved during the initialization phase, before any resource evaluation happens.

## Cross-Provider References

Resources from different provider instances can reference each other:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

# Create a VPC in us-east-1
resource "aws_vpc" "east" {
  cidr_block = "10.0.0.0/16"
}

# Create a VPC in us-west-2
resource "aws_vpc" "west" {
  provider   = aws.west
  cidr_block = "10.1.0.0/16"
}

# Set up VPC peering between the two regions
resource "aws_vpc_peering_connection" "east_to_west" {
  vpc_id      = aws_vpc.east.id
  peer_vpc_id = aws_vpc.west.id
  peer_region = "us-west-2"
}

# Accept the peering connection in the west region
resource "aws_vpc_peering_connection_accepter" "west_accept" {
  provider                  = aws.west
  vpc_peering_connection_id = aws_vpc_peering_connection.east_to_west.id
  auto_accept               = true
}
```

## Common Mistakes to Avoid

**Forgetting the provider argument on resources.** If you define an alias but forget to specify `provider = aws.alias` on a resource, it silently uses the default. This can deploy resources in the wrong region or account.

**Too many provider instances.** Having ten provider aliases in one configuration makes it hard to track which resource lives where. Consider splitting into separate root modules if the configuration grows too complex.

**Not pinning provider versions across aliases.** All instances of the same provider share one version. You cannot have one alias on version 4.x and another on 5.x.

## Conclusion

Multiple provider instances give you the flexibility to manage resources across regions, accounts, and even cloud platforms from a single Terraform configuration. The alias mechanism is straightforward once you understand the pattern: define the providers, reference them on resources, and pass them to modules. Keep your provider count manageable, and consider splitting into separate configurations when things get complex. For workspace-based approaches to multi-environment management, check out our post on [understanding Terraform workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-terraform-workspaces/view).
