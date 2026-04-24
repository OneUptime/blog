# How to Use Provider Aliases in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Provider

Description: Learn how to configure and use provider aliases in OpenTofu to manage multiple instances of the same provider with different configurations.

## Introduction

Provider aliases allow you to have multiple instances of the same provider with different configurations - different regions, accounts, or settings. Without aliases, you can only have one provider configuration per provider type. Aliases are essential for multi-region deployments, cross-account access, and any scenario requiring two differently-configured instances of the same provider.

## Defining Provider Aliases

```hcl
# Default provider (no alias)

provider "aws" {
  region = "us-east-1"
}

# Aliased providers
provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

provider "aws" {
  alias  = "europe"
  region = "eu-west-1"
}
```

## Using Aliases in Resources

```hcl
# Uses the default provider (us-east-1)
resource "aws_vpc" "primary" {
  cidr_block = "10.0.0.0/16"
}

# Uses the aliased provider (us-west-2)
resource "aws_vpc" "secondary" {
  provider   = aws.west  # Reference: provider_type.alias
  cidr_block = "10.1.0.0/16"
}

# Uses the Europe provider
resource "aws_vpc" "europe" {
  provider   = aws.europe
  cidr_block = "10.2.0.0/16"
}
```

## Aliases in Data Sources

```hcl
# Look up an AMI in us-west-2
data "aws_ami" "ubuntu_west" {
  provider    = aws.west
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "west_app" {
  provider      = aws.west
  ami           = data.aws_ami.ubuntu_west.id
  instance_type = "t3.micro"
}
```

## Passing Aliases to Modules

Modules receive providers through the `providers` argument:

```hcl
# Root configuration
module "app_primary" {
  source = "./modules/app"

  providers = {
    aws = aws  # Pass the default provider
  }
}

module "app_secondary" {
  source = "./modules/app"

  providers = {
    aws = aws.west  # Pass the aliased provider
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

# This module uses whatever provider was passed via providers argument
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
}
```

## Module with Required Provider Aliases

Some modules declare specific aliased provider configuration names that callers must map:

```hcl
# modules/dns/main.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]  # Requires this alias
    }
  }
}

# Certificate must be in us-east-1 for CloudFront
resource "aws_acm_certificate" "cdn" {
  provider    = aws.us_east_1
  domain_name = var.domain_name
}
```

```hcl
# Root configuration
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "dns" {
  source = "./modules/dns"

  providers = {
    aws.us_east_1 = aws.us_east_1  # Must provide the required alias
  }
}
```

## Naming Convention for Aliases

Use meaningful alias names that reflect the configuration difference:

```hcl
# By region
provider "aws" { alias = "us_east_1"; region = "us-east-1" }
provider "aws" { alias = "us_west_2"; region = "us-west-2" }
provider "aws" { alias = "eu_west_1"; region = "eu-west-1" }

# By account
provider "aws" { alias = "prod"; assume_role { role_arn = var.prod_role } }
provider "aws" { alias = "staging"; assume_role { role_arn = var.staging_role } }

# By purpose
provider "aws" { alias = "acm"; region = "us-east-1" }  # CloudFront certs
provider "aws" { alias = "primary"; region = var.primary_region }
```

## Checking Which Provider Is Used

Use `data.aws_region` and `data.aws_caller_identity` to verify:

```hcl
data "aws_region" "primary" {}
data "aws_region" "west" { provider = aws.west }

data "aws_caller_identity" "primary" {}
data "aws_caller_identity" "west" { provider = aws.west }

output "providers_info" {
  value = {
    primary_region  = data.aws_region.primary.id
    primary_account = data.aws_caller_identity.primary.account_id
    west_region     = data.aws_region.west.id
    west_account    = data.aws_caller_identity.west.account_id
  }
}
```

## Conclusion

Provider aliases are the mechanism for having multiple configurations of the same provider type. The default provider (no alias) handles the primary use case; aliases handle additional regions, accounts, or configurations. Always use meaningful alias names, pass aliases to modules via the `providers` argument, and use `configuration_aliases` in module `required_providers` when a module uses additional aliased provider configuration names. Understanding aliases is fundamental to any multi-region or multi-account OpenTofu architecture.
