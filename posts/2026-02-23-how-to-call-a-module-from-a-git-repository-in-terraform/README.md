# How to Call a Module from a Git Repository in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Git, Infrastructure as Code, DevOps

Description: Learn how to reference Terraform modules stored in Git repositories using HTTPS and SSH URLs, branch references, tags, and subdirectory paths.

---

When your Terraform modules need to be shared across multiple projects or teams, storing them in a Git repository is one of the most common approaches. Terraform natively supports Git as a module source, so you can reference any Git repository - GitHub, GitLab, Bitbucket, or a self-hosted Git server - directly in your module blocks.

This guide covers all the ways to reference Git-hosted modules, including authentication, version pinning, and working with monorepos.

## Basic Git Source Syntax

Terraform supports two URL formats for Git sources: the generic Git URL format and the shorthand for GitHub.

### Generic Git URL

The generic format works with any Git hosting provider:

```hcl
# HTTPS URL with the git:: prefix
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

The `git::` prefix tells Terraform to use the Git protocol. The `//` separates the repository URL from the path within the repository.

### SSH URL

For private repositories, SSH is usually the way to go:

```hcl
# SSH URL format
module "vpc" {
  source = "git::ssh://git@github.com/myorg/terraform-modules.git//modules/vpc"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

You can also use the SCP-style shorthand that most developers are familiar with:

```hcl
# SCP-style SSH URL (common shorthand)
module "vpc" {
  source = "git::git@github.com:myorg/terraform-modules.git//modules/vpc"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

### GitHub Shorthand

For public GitHub repositories, Terraform has a special shorthand that does not require the `git::` prefix:

```hcl
# GitHub shorthand - Terraform recognizes the github.com domain
module "vpc" {
  source = "github.com/myorg/terraform-modules//modules/vpc"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

This shorthand automatically uses HTTPS. For SSH, use the `git::` prefix shown above.

## Pinning to a Specific Version

Without version pinning, Terraform pulls the latest commit on the default branch. This is risky because changes to the module could break your infrastructure without warning. Always pin to a specific reference.

### Pin to a Git Tag

Tags are the recommended way to version your modules:

```hcl
# Pin to a specific tag (semantic version)
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.3.1"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

The `?ref=` parameter accepts any valid Git reference - tags, branches, or commit SHAs.

### Pin to a Branch

Useful during development, but not recommended for production:

```hcl
# Pin to a branch (use for development only)
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=feature/new-subnet-layout"

  vpc_cidr    = "10.0.0.0/16"
  environment = "dev"
}
```

### Pin to a Commit SHA

The most precise way to pin. Guarantees the exact code you are using:

```hcl
# Pin to a specific commit
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=a1b2c3d4e5f6"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}
```

## Working with Monorepos

Many organizations keep all their Terraform modules in a single repository (a monorepo). The `//` path separator lets you point to a specific subdirectory within the repo:

```
terraform-modules/          (repository root)
  modules/
    vpc/
      main.tf
      variables.tf
      outputs.tf
    ecs-service/
      main.tf
      variables.tf
      outputs.tf
    rds/
      main.tf
      variables.tf
      outputs.tf
```

Reference each module by its path within the repo:

```hcl
# Call different modules from the same repo
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.0.0"
  # ...
}

module "ecs" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/ecs-service?ref=v2.0.0"
  # ...
}

module "database" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/rds?ref=v2.0.0"
  # ...
}
```

One thing to note: the tag applies to the entire repository, not individual modules. If you tag the repo as `v2.0.0`, all modules in that tag share the same version. If different modules evolve at different rates, you might want separate repositories per module, or use a tagging convention like `vpc-v2.0.0` and `ecs-v1.5.0`.

## Authentication

### SSH Keys

If your Git repository is private, SSH authentication is the most common approach. Terraform uses the same SSH keys that your Git client uses:

```bash
# Make sure your SSH key is loaded
ssh-add ~/.ssh/id_ed25519

# Test connectivity
ssh -T git@github.com
```

```hcl
# Then use SSH URLs in your module source
module "vpc" {
  source = "git::ssh://git@github.com/myorg/private-modules.git//modules/vpc?ref=v1.0.0"
}
```

### HTTPS with Tokens

For HTTPS access to private repos, you can configure Git credentials:

```bash
# Configure a credential helper (example for GitHub)
git config --global credential.helper store

# Or use environment variables that Terraform respects
export GIT_ASKPASS="echo $GITHUB_TOKEN"
```

For GitHub specifically, you can embed the token in the URL (not recommended for shared code, but works in CI/CD):

```hcl
# HTTPS with token (CI/CD pipelines)
module "vpc" {
  source = "git::https://${var.github_token}@github.com/myorg/private-modules.git//modules/vpc?ref=v1.0.0"
}
```

A better approach for CI/CD is to configure the Git credential helper in the pipeline before running Terraform:

```bash
# In your CI/CD pipeline, configure git before terraform init
git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com".insteadOf "https://github.com"

# Then terraform init will work with HTTPS URLs
terraform init
```

## Full Working Example

Here is a complete configuration that uses modules from a Git repository:

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

# Network layer from the shared modules repo
module "networking" {
  source = "git::ssh://git@github.com/myorg/terraform-modules.git//modules/vpc?ref=v3.1.0"

  vpc_cidr             = var.vpc_cidr
  environment          = var.environment
  availability_zones   = var.availability_zones
  enable_nat_gateway   = var.environment == "prod"
  single_nat_gateway   = var.environment != "prod"
}

# Application layer from the same repo, possibly a different version
module "app" {
  source = "git::ssh://git@github.com/myorg/terraform-modules.git//modules/ecs-service?ref=v3.1.0"

  service_name   = "web-app"
  cluster_id     = module.cluster.id
  subnet_ids     = module.networking.private_subnet_ids
  vpc_id         = module.networking.vpc_id
  container_port = 8080
  desired_count  = var.environment == "prod" ? 3 : 1
}

# variables.tf
variable "region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}
```

## Updating Module Versions

When you change the `ref` parameter to point to a new version, you need to run `terraform init -upgrade` to fetch the updated module code:

```bash
# After changing ref=v3.1.0 to ref=v3.2.0
terraform init -upgrade

# Then plan to see what changes
terraform plan
```

Without `-upgrade`, Terraform uses the cached version from the `.terraform` directory.

## Troubleshooting Common Issues

**"Failed to download module"** - Usually an authentication issue. Verify you can clone the repo manually with `git clone`.

**Module not found at path** - Check the `//` separator and the subdirectory path. The path after `//` must match the directory structure in the repo.

**Changes not reflected after updating ref** - Run `terraform init -upgrade` to force Terraform to re-download the module.

**Slow initialization** - Git modules are cloned during `terraform init`. For large repos, this can be slow. Consider using shallow clones or switching to the Terraform Registry for frequently used modules.

## Summary

Git repositories are a flexible and widely supported source for Terraform modules. Use SSH URLs for private repos and HTTPS for public ones. Always pin to a specific tag or commit SHA in production configurations. For monorepos, use the `//` path separator to point to specific module directories. And remember to run `terraform init -upgrade` when you update module versions. For an alternative approach to module hosting, see [How to Call a Module from the Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-the-terraform-registry/view) or [How to Call a Module from an S3 Bucket in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-an-s3-bucket-in-terraform/view).
