# How to Pin Module Versions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Versioning, Infrastructure as Code, DevOps, Best Practices

Description: Learn how to pin Terraform module versions using exact versions, constraints, and lock files to ensure reproducible and safe infrastructure deployments.

---

When you use a Terraform module without pinning its version, you are running whatever the latest version happens to be at the time of `terraform init`. This might work fine today, but the next time someone initializes the project - maybe in a CI/CD pipeline, maybe on a teammate's laptop - a newer version with breaking changes could silently slip in. Pinning module versions prevents this.

This guide covers the practical mechanics of version pinning for every type of module source.

## Pinning Registry Module Versions

Registry modules are the easiest to pin because they support the `version` argument directly:

```hcl
# Exact version pin - the most predictable option
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "production-vpc"
  cidr = "10.0.0.0/16"
}
```

This guarantees that everyone on the team and every CI/CD run uses exactly version 5.5.1. Nothing more, nothing less.

### Version Constraint Syntax

You can also use constraint operators for more flexibility:

```hcl
# Exact version
version = "5.5.1"

# Pessimistic constraint - allows 5.5.x (patch updates only)
version = "~> 5.5.0"

# Pessimistic constraint - allows 5.x.x (minor and patch updates)
version = "~> 5.0"

# Greater than or equal to
version = ">= 5.5.0"

# Range constraint
version = ">= 5.0.0, < 6.0.0"

# Not equal (rarely used)
version = "!= 5.5.2"
```

For production, exact version pins or tight pessimistic constraints (`~> 5.5.0`) are the safest choice.

## Pinning Git Module Versions

Git sources do not support the `version` argument. Instead, you pin using the `ref` query parameter:

```hcl
# Pin to a Git tag (recommended)
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.3.1"
}

# Pin to a specific commit SHA (most precise)
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=abc123def456"
}

# Pin to a branch (not recommended for production)
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=main"
}
```

Tags are the best option because they are immutable (unlike branches, which move forward) and human-readable (unlike commit SHAs, which are opaque).

### Tagging Strategy for Git Modules

If you maintain your own modules in Git, adopt semantic versioning for your tags:

```bash
# Tag a release
git tag -a v2.3.1 -m "Release 2.3.1: fix subnet calculation bug"
git push origin v2.3.1

# For monorepos with multiple modules, use prefixed tags
git tag -a vpc-v2.3.1 -m "VPC module release 2.3.1"
git tag -a ecs-v1.5.0 -m "ECS module release 1.5.0"
```

Then reference the prefixed tag:

```hcl
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=vpc-v2.3.1"
}
```

## Pinning S3 and GCS Module Versions

For S3 and GCS sources, versioning is built into the object path:

```hcl
# S3 - version is part of the object path
module "vpc" {
  source = "s3::https://myorg-terraform-modules.s3.amazonaws.com/vpc/v2.3.1.zip"
}

# GCS - same pattern
module "network" {
  source = "gcs::https://www.googleapis.com/storage/v1/myorg-terraform-modules/network/v2.3.1.zip"
}
```

Since the version is in the URL, changing versions means changing the URL. This is explicit and clear, though it lacks the constraint syntax that registry modules offer.

## The Dependency Lock File

Starting with Terraform 1.0, the `.terraform.lock.hcl` file records the exact versions of providers used. However, this lock file does not currently lock module versions - it only covers providers. Module version locking depends entirely on the version constraints you specify in your code.

This makes explicit version pinning in your module blocks even more important.

## A Complete Version-Pinned Configuration

Here is what a production configuration with properly pinned versions looks like:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30.0"
    }
  }
}

# main.tf
provider "aws" {
  region = var.region
}

# Registry module - pinned with version argument
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"

  name = "${var.project}-${var.environment}"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
}

# Git module - pinned with ref parameter
module "custom_monitoring" {
  source = "git::ssh://git@github.com/myorg/terraform-modules.git//modules/monitoring?ref=v1.4.2"

  vpc_id      = module.vpc.vpc_id
  environment = var.environment
}

# S3 module - pinned via path
module "iam_roles" {
  source = "s3::https://myorg-terraform-modules.s3.amazonaws.com/iam-roles/v3.0.1.zip"

  environment = var.environment
  project     = var.project
}

# Local module - no versioning needed (changes are immediate)
module "app_config" {
  source = "./modules/app-config"

  environment = var.environment
}
```

## Upgrading Pinned Versions

When you want to upgrade a module, follow this process:

```bash
# 1. Change the version in your .tf file
# (edit the version argument or ref parameter)

# 2. Initialize with upgrade flag
terraform init -upgrade

# 3. Review the plan carefully
terraform plan

# 4. Check for deprecation warnings or breaking changes
# Look at the module's changelog before applying

# 5. Apply if everything looks good
terraform apply
```

For registry modules, you can check available versions:

```bash
# List versions of a registry module
terraform providers mirror -platform=linux_amd64 .  # shows available versions
# Or check the registry website directly
```

## Version Pinning in CI/CD

In CI/CD pipelines, version pinning is critical. Here is a typical approach:

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0  # Pin Terraform itself too

      - name: Terraform Init
        run: terraform init
        # Do NOT use -upgrade in CI unless intentional
        # This ensures the same versions as the developer's last init

      - name: Terraform Plan
        run: terraform plan -out=tfplan
```

Notice that the CI pipeline does not use `-upgrade`. This ensures it uses the same versions the developer had when they last ran `terraform init` locally.

## Automated Version Update Tools

Tools like Dependabot and Renovate can automatically detect outdated module versions and create pull requests to upgrade them:

```json
// renovate.json - Renovate configuration for Terraform modules
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "terraform": {
    "enabled": true
  }
}
```

This creates PRs when new versions of your pinned modules are released, letting you review and test upgrades before merging.

## Common Mistakes

**Not pinning at all.** This is the most dangerous mistake. Without a version pin, `terraform init` grabs the latest version, which could include breaking changes.

**Pinning too loosely.** Using `version = ">= 5.0"` means any future 5.x or 6.x or 100.x version is acceptable. That is not really pinning.

**Forgetting to pin Git refs.** Omitting `?ref=` from a Git source means Terraform uses the default branch, which changes with every push.

**Using branch refs in production.** Branches move. A module source with `?ref=main` will get different code every time `terraform init` runs.

## Summary

Version pinning is one of the simplest things you can do to make your Terraform configurations reliable. For registry modules, use the `version` argument with exact or pessimistic constraints. For Git modules, use tags in the `ref` parameter. For S3 and GCS modules, include the version in the object path. Always pin in production, use `terraform init -upgrade` only when you intentionally want to update versions, and review changes before applying. Your future self and your teammates will thank you.

For more on version constraints syntax, see [How to Use Version Constraints for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-version-constraints-for-terraform-modules/view). For choosing where to host your modules, check out [How to Use the source Argument in Module Blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-source-argument-in-module-blocks/view).
