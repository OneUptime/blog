# How to Call a Module from the Terraform Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Terraform Registry, Infrastructure as Code, DevOps

Description: Learn how to find, reference, and use Terraform modules from the public Terraform Registry and private registries with proper version pinning and configuration.

---

The Terraform Registry is the official marketplace for sharing and discovering Terraform modules. It hosts thousands of community-maintained and HashiCorp-verified modules that handle common infrastructure patterns. Instead of writing everything from scratch, you can pull in a battle-tested module, configure it with your values, and deploy.

This guide covers how to find modules on the registry, call them in your code, pin versions, and work with both the public and private registries.

## Finding Modules on the Registry

The public Terraform Registry lives at [registry.terraform.io](https://registry.terraform.io). You can browse modules by provider (AWS, Azure, GCP, etc.) or search for specific functionality.

When evaluating a module, look for:

- **Verified badge** - Modules from HashiCorp partners that have been reviewed for quality
- **Download count** - Popular modules tend to be more reliable
- **Recent updates** - Actively maintained modules are less likely to have compatibility issues
- **Documentation** - The registry auto-generates docs from the module's variables and outputs

## Basic Registry Module Syntax

Registry modules use a shorthand source format that is different from Git URLs:

```hcl
# Format: <NAMESPACE>/<NAME>/<PROVIDER>
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}
```

The three-part naming convention (`namespace/name/provider`) is required for registry modules. The `version` argument is also specific to registry modules and is not supported for Git or local sources.

## Version Pinning

The `version` argument accepts version constraint syntax:

```hcl
# Exact version - the safest choice for production
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"
  # ...
}

# Pessimistic constraint - allows patch updates
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.5"  # Allows 5.5.x but not 5.6.0
  # ...
}

# Range constraint
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = ">= 5.0, < 6.0"  # Any 5.x version
  # ...
}
```

For production environments, pinning to an exact version is strongly recommended. Use the pessimistic constraint (`~>`) when you want to automatically pick up bug fixes within a minor version.

## A Complete Example with Registry Modules

Here is a realistic configuration that uses multiple registry modules together:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# main.tf
provider "aws" {
  region = var.region
}

# VPC module from the registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "${var.project}-${var.environment}"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "prod"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = var.tags
}

# Security group module from the registry
module "web_sg" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.0"

  name        = "${var.project}-web-sg"
  description = "Security group for web servers"
  vpc_id      = module.vpc.vpc_id

  # Allow HTTP and HTTPS from anywhere
  ingress_with_cidr_blocks = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = "0.0.0.0/0"
      description = "HTTP"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = "0.0.0.0/0"
      description = "HTTPS"
    },
  ]

  # Allow all outbound
  egress_with_cidr_blocks = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = "0.0.0.0/0"
    },
  ]

  tags = var.tags
}

# ALB module from the registry
module "alb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "9.4.0"

  name               = "${var.project}-alb"
  load_balancer_type = "application"
  vpc_id             = module.vpc.vpc_id
  subnets            = module.vpc.public_subnets
  security_groups    = [module.web_sg.security_group_id]

  tags = var.tags
}
```

Notice how the modules chain together: the VPC module's outputs (`vpc_id`, `public_subnets`) feed into the security group and ALB modules.

## Using Sub-Modules from the Registry

Some registry modules publish sub-modules that you can use independently. The syntax adds a `//` path:

```hcl
# Use the IAM assumable-role sub-module
module "ecs_task_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role"
  version = "5.33.0"

  create_role       = true
  role_name         = "ecs-task-role"
  role_requires_mfa = false

  trusted_role_services = ["ecs-tasks.amazonaws.com"]

  custom_role_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
  ]
}
```

The `//modules/iam-assumable-role` part points to a subdirectory within the module's repository.

## Private Registries

If your organization uses Terraform Cloud or Terraform Enterprise, you have access to a private registry. The syntax is slightly different:

```hcl
# Private registry module (Terraform Cloud / Enterprise)
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "2.1.0"

  # ... variables
}
```

For the private registry, you need to be authenticated. Configure credentials in your CLI config:

```hcl
# ~/.terraformrc or %APPDATA%/terraform.rc
credentials "app.terraform.io" {
  token = "your-api-token-here"
}
```

Or set the `TF_TOKEN_app_terraform_io` environment variable in CI/CD pipelines.

## Understanding Module Documentation

Every module on the registry has auto-generated documentation that shows:

- **Inputs** - All variables the module accepts, their types, defaults, and descriptions
- **Outputs** - All values the module exports
- **Resources** - All resources the module creates
- **Dependencies** - Required providers and their versions

Before using a module, review its inputs carefully. Most well-designed modules have sensible defaults, so you only need to provide the values that are specific to your deployment.

```hcl
# You do not need to set every variable
# Only set what differs from the defaults
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  # These are the minimum required inputs
  name = "my-vpc"
  cidr = "10.0.0.0/16"
  azs  = ["us-east-1a", "us-east-1b"]

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  # Everything else uses the module's defaults
}
```

## Upgrading Module Versions

When a new version of a registry module is available, update the `version` argument and run:

```bash
# Upgrade to the new version
terraform init -upgrade

# Check what changes the new version introduces
terraform plan
```

Review the module's changelog before upgrading. Breaking changes in inputs or outputs can cause issues. For major version bumps, read the migration guide if one is provided.

## Caching and Initialization

When you run `terraform init`, Terraform downloads registry modules to `.terraform/modules/`. This directory acts as a local cache. If you need to clear the cache and re-download everything:

```bash
# Remove the cache and re-initialize
rm -rf .terraform
terraform init
```

In CI/CD pipelines, you might want to cache the `.terraform` directory between runs to speed up initialization.

## Summary

The Terraform Registry is the easiest way to consume well-tested, community-maintained modules. Use the three-part naming format (`namespace/name/provider`), always pin versions for production use, and review the auto-generated documentation before configuring a module. For private modules, use your organization's private registry in Terraform Cloud or Enterprise. The registry's version constraint system gives you fine-grained control over which updates you accept, and `terraform init -upgrade` handles the actual version changes.

For other module source options, see [How to Call a Module from a Git Repository in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-a-git-repository-in-terraform/view) and [How to Call a Module from an S3 Bucket in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-an-s3-bucket-in-terraform/view).
