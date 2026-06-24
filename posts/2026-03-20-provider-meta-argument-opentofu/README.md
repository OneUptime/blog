# How to Use the provider Meta-Argument in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Provider, Multi-Region, Infrastructure as Code, DevOps

Description: A guide to using the provider meta-argument in OpenTofu resources to specify which provider configuration to use for multi-region and multi-account deployments.

## Introduction

The `provider` meta-argument lets you specify which provider configuration to use for a resource or data source when multiple configurations of the same provider exist. This is essential for multi-region deployments, multi-account AWS setups, and any scenario requiring different provider configurations for different resources.

## Provider Aliases

```hcl
# versions.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# Default provider (no alias)
provider "aws" {
  region = "us-east-1"
}

# Provider with alias for a different region
provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

# Another provider for a different account
provider "aws" {
  alias  = "prod_account"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::PROD_ACCOUNT_ID:role/TerraformRole"
  }
}
```

## Using the provider Meta-Argument

```hcl
# Default provider (us-east-1) - no provider argument needed
resource "aws_vpc" "east" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "east-vpc", Region = "us-east-1" }
}

# Use the us_west alias
resource "aws_vpc" "west" {
  provider   = aws.us_west  # Specify the alias
  cidr_block = "10.1.0.0/16"
  tags = { Name = "west-vpc", Region = "us-west-2" }
}

# Use the prod_account alias
resource "aws_s3_bucket" "prod_state" {
  provider = aws.prod_account
  bucket   = "prod-terraform-state"
}
```

## Multi-Region Infrastructure

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "ap_southeast"
  region = "ap-southeast-1"
}

# Look up a current Amazon Linux 2023 AMI in each region
data "aws_ssm_parameter" "us_east_al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_ssm_parameter" "eu_west_al2023" {
  provider = aws.eu_west
  name     = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_ssm_parameter" "ap_southeast_al2023" {
  provider = aws.ap_southeast
  name     = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# Create EC2 instances in multiple regions
resource "aws_instance" "us_east" {
  ami           = data.aws_ssm_parameter.us_east_al2023.value
  instance_type = "t3.micro"
  # Uses default provider (us-east-1)
}

resource "aws_instance" "eu_west" {
  provider      = aws.eu_west
  ami           = data.aws_ssm_parameter.eu_west_al2023.value
  instance_type = "t3.micro"
}

resource "aws_instance" "ap_southeast" {
  provider      = aws.ap_southeast
  ami           = data.aws_ssm_parameter.ap_southeast_al2023.value
  instance_type = "t3.micro"
}
```

## ACM for CloudFront with provider

```hcl
provider "aws" {
  region = var.primary_region
}

# CloudFront-related ACM certificates must be created in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ACM certificates for CloudFront must be in us-east-1
resource "aws_acm_certificate" "cdn" {
  provider          = aws.us_east_1  # Required for CloudFront
  domain_name       = "*.example.com"
  validation_method = "DNS"
}
```

## Provider in Modules

```hcl
# Passing provider to a module
module "east_vpc" {
  source = "./modules/vpc"

  providers = {
    aws = aws  # Default provider
  }

  cidr_block = "10.0.0.0/16"
}

module "west_vpc" {
  source = "./modules/vpc"

  providers = {
    aws = aws.us_west  # Pass the aliased provider
  }

  cidr_block = "10.1.0.0/16"
}
```

## Conclusion

The `provider` meta-argument is essential for multi-region and multi-account OpenTofu deployments. By creating aliased provider configurations and using the `provider` meta-argument in resource and data blocks, you can manage infrastructure across different regions and accounts within a single OpenTofu configuration. This is particularly powerful for disaster recovery setups, global applications, and multi-account governance patterns.
