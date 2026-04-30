# How to Import Resources with Custom Provider Configurations in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to specify custom provider configurations when importing resources in OpenTofu, enabling cross-account, multi-region, and aliased provider imports.

## Introduction

By default, import blocks use the default provider configuration. However, when importing resources that require a specific provider configuration - such as resources in a different AWS account, a specific region, or requiring an IAM role assumption - you can specify the provider with the `provider` argument. Each `import` block still needs a matching `resource` block unless you generate configuration separately.

## Basic Provider Specification

```hcl
# Provider configurations

provider "aws" {
  region = "us-east-1"
  alias  = "us_east"
}

provider "aws" {
  region = "eu-west-1"
  alias  = "eu_west"
}

# Import using the eu-west-1 provider
import {
  provider = aws.eu_west  # Specify which provider configuration to use
  to       = aws_instance.eu_web
  id       = "i-0123456789abcdef0"
}

resource "aws_instance" "eu_web" {
  provider      = aws.eu_west
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}
```

## Cross-Account Import

```hcl
# Production account provider (role assumption)
provider "aws" {
  region = "us-east-1"
  alias  = "production"

  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/TerraformAdmin"
  }
}

# Import resources from the production account
import {
  provider = aws.production
  to       = aws_vpc.prod_main
  id       = "vpc-0123456789abcdef0"
}

resource "aws_vpc" "prod_main" {
  provider   = aws.production
  cidr_block = "10.0.0.0/16"
}
```

## Multi-Region Imports

```hcl
# Multiple AWS region providers
provider "aws" {
  region = "us-east-1"
  alias  = "primary"
}

provider "aws" {
  region = "us-west-2"
  alias  = "dr"
}

# Import from primary region
import {
  provider = aws.primary
  to       = aws_vpc.primary
  id       = "vpc-0123456789abcdea0"
}

resource "aws_vpc" "primary" {
  provider   = aws.primary
  cidr_block = "10.0.0.0/16"
}

# Import from DR region
import {
  provider = aws.dr
  to       = aws_vpc.dr
  id       = "vpc-0123456789abcdeb0"
}

resource "aws_vpc" "dr" {
  provider   = aws.dr
  cidr_block = "10.1.0.0/16"
}
```

## Importing with Different Authentication

```hcl
# Provider with explicit credentials
provider "aws" {
  region     = "us-east-1"
  access_key = var.legacy_access_key
  secret_key = var.legacy_secret_key
  alias      = "legacy_account"
}

import {
  provider = aws.legacy_account
  to       = aws_s3_bucket.legacy_data
  id       = "my-legacy-bucket-name"
}

resource "aws_s3_bucket" "legacy_data" {
  provider = aws.legacy_account
  bucket   = "my-legacy-bucket-name"
}
```

## Azure Multi-Subscription Import

```hcl
provider "azurerm" {
  features {}
  subscription_id = "00000000-0000-0000-0000-000000000001"
  alias           = "subscription_1"
}

provider "azurerm" {
  features {}
  subscription_id = "00000000-0000-0000-0000-000000000002"
  alias           = "subscription_2"
}

import {
  provider = azurerm.subscription_2
  to       = azurerm_resource_group.app
  id       = "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg-app"
}

resource "azurerm_resource_group" "app" {
  provider = azurerm.subscription_2
  name     = "rg-app"
  location = "West Europe"
}
```

## GCP Multi-Project Import

```hcl
provider "google" {
  project = "project-prod"
  region  = "us-central1"
  alias   = "production"
}

provider "google" {
  project = "project-dev"
  region  = "us-central1"
  alias   = "development"
}

import {
  provider = google.production
  to       = google_storage_bucket.app
  id       = "prod-app-bucket"
}

resource "google_storage_bucket" "app" {
  provider = google.production
  name     = "prod-app-bucket"
  location = "US"
}
```

## CLI Import with Provider Aliases

For CLI imports, the provider is determined by the resource's `provider` argument:

```hcl
resource "aws_instance" "eu_web" {
  provider = aws.eu_west  # This provider is used for CLI import too
}
```

```bash
# CLI import uses the provider configured on the resource
tofu import aws_instance.eu_web i-0123456789abcdef0
```

## Conclusion

Custom provider configurations for imports are essential in multi-account, multi-region, and hybrid cloud environments. Always specify the `provider` argument in import blocks when the resource requires a non-default provider configuration. This ensures the import uses the correct credentials, region, and account context, and that the resource continues to be managed by the correct provider after import.
