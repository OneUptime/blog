# How to Organize Terragrunt for Multi-Environment Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Multi-Environment, Project Structure

Description: A practical guide to organizing Terragrunt projects for multi-environment deployments covering directory structures, configuration hierarchy, and real-world patterns.

---

Getting the directory structure right is one of the most important decisions in a Terragrunt project. A good structure makes it easy to add new environments, onboard team members, and reason about what is deployed where. A bad structure leads to confusion, duplication, and painful refactoring down the line.

This post covers proven patterns for organizing Terragrunt across multiple environments, regions, and accounts.

## The Fundamental Idea

Terragrunt's directory structure serves double duty. It is not just file organization - it is configuration. Functions like `path_relative_to_include()` derive unique identifiers from the directory path. Config files like `env.hcl` and `region.hcl` at various levels define settings that child modules inherit.

The directory tree is your source of truth for what is deployed where.

## Basic Multi-Environment Structure

The simplest multi-environment setup separates environments at the top level:

```text
infrastructure/
  modules/                       # Reusable Terraform modules
    vpc/
    rds/
    ecs/
    app/
  live/                          # Terragrunt configurations
    terragrunt.hcl               # Root config (state, providers)
    dev/
      env.hcl                    # environment = "dev"
      vpc/
        terragrunt.hcl
      rds/
        terragrunt.hcl
      app/
        terragrunt.hcl
    staging/
      env.hcl                    # environment = "staging"
      vpc/
        terragrunt.hcl
      rds/
        terragrunt.hcl
      app/
        terragrunt.hcl
    prod/
      env.hcl                    # environment = "prod"
      vpc/
        terragrunt.hcl
      rds/
        terragrunt.hcl
      app/
        terragrunt.hcl
```

The root `terragrunt.hcl` handles shared configuration:

```hcl
# live/terragrunt.hcl

locals {
  env_config  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment
  account_id  = local.env_config.locals.account_id
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "terraform-state-${local.account_id}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "${local.environment}"
      ManagedBy   = "terraform"
    }
  }
}
EOF
}
```

Each `env.hcl` defines environment-specific values:

```hcl
# live/dev/env.hcl
locals {
  environment = "dev"
  account_id  = "111111111111"
}
```

And each module configuration is minimal:

```hcl
# live/dev/vpc/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
}
```

This structure works well for teams with a single region and a few environments.

## Multi-Region Structure

When you deploy to multiple regions, add a region level to the hierarchy:

```text
live/
  root.hcl                         # Root config
  us-east-1/
    region.hcl                     # aws_region = "us-east-1"
    dev/
      env.hcl                      # environment = "dev"
      vpc/
        terragrunt.hcl
      app/
        terragrunt.hcl
    prod/
      env.hcl                      # environment = "prod"
      vpc/
        terragrunt.hcl
      app/
        terragrunt.hcl
  eu-west-1/
    region.hcl                     # aws_region = "eu-west-1"
    dev/
      env.hcl
      vpc/
        terragrunt.hcl
      app/
        terragrunt.hcl
    prod/
      env.hcl
      vpc/
        terragrunt.hcl
      app/
        terragrunt.hcl
```

The root config reads both region and environment settings:

```hcl
# live/root.hcl

locals {
  region_config = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  env_config    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  aws_region    = local.region_config.locals.aws_region
  environment   = local.env_config.locals.environment
  account_id    = local.env_config.locals.account_id
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket = "terraform-state-${local.account_id}-${local.aws_region}"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = local.aws_region
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  default_tags {
    tags = {
      Environment = "${local.environment}"
      Region      = "${local.aws_region}"
      ManagedBy   = "terraform"
    }
  }
}
EOF
}
```

## Multi-Account Structure

For organizations using separate AWS accounts per environment (which is the recommended practice), the account boundary maps to the environment level:

```text
live/
  root.hcl
  accounts/
    dev/                           # AWS Account: 111111111111
      account.hcl                  # account_id, iam role
      us-east-1/
        region.hcl
        vpc/
          terragrunt.hcl
        app/
          terragrunt.hcl
      eu-west-1/
        region.hcl
        vpc/
          terragrunt.hcl
    staging/                       # AWS Account: 222222222222
      account.hcl
      us-east-1/
        region.hcl
        vpc/
          terragrunt.hcl
        app/
          terragrunt.hcl
    prod/                          # AWS Account: 333333333333
      account.hcl
      us-east-1/
        region.hcl
        vpc/
          terragrunt.hcl
        app/
          terragrunt.hcl
```

The `account.hcl` defines account-level settings:

```hcl
# live/accounts/dev/account.hcl
locals {
  account_id   = "111111111111"
  account_name = "dev"
  role_arn     = "arn:aws:iam::111111111111:role/TerraformDeployRole"
}
```

The root config uses `assume_role` to switch accounts:

```hcl
# live/root.hcl

locals {
  account_config = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  region_config  = read_terragrunt_config(find_in_parent_folders("region.hcl"))

  account_id   = local.account_config.locals.account_id
  role_arn     = local.account_config.locals.role_arn
  aws_region   = local.region_config.locals.aws_region
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  assume_role {
    role_arn = "${local.role_arn}"
  }
}
EOF
}
```

## Shared Infrastructure Pattern

Many organizations have infrastructure shared across environments - a central logging account, shared networking, or global DNS:

```text
live/
  root.hcl
  _global/                         # Shared, not environment-specific
    account.hcl
    route53/
      terragrunt.hcl              # DNS zones shared across envs
    iam-baseline/
      terragrunt.hcl              # Cross-account IAM roles
  accounts/
    dev/
      account.hcl
      us-east-1/
        region.hcl
        vpc/
          terragrunt.hcl
    prod/
      account.hcl
      us-east-1/
        region.hcl
        vpc/
          terragrunt.hcl
```

The `_global` directory (prefixed with underscore to sort it first) contains resources that exist outside any single environment.

## Module Grouping Pattern

For large environments with many modules, group related modules together:

```text
live/
  root.hcl
  dev/
    env.hcl
    networking/
      vpc/
        terragrunt.hcl
      transit-gateway/
        terragrunt.hcl
      security-groups/
        terragrunt.hcl
    data/
      rds-primary/
        terragrunt.hcl
      elasticache/
        terragrunt.hcl
      dynamodb/
        terragrunt.hcl
    compute/
      ecs-cluster/
        terragrunt.hcl
      ecs-services/
        api/
          terragrunt.hcl
        worker/
          terragrunt.hcl
    monitoring/
      cloudwatch/
        terragrunt.hcl
      alarms/
        terragrunt.hcl
```

This makes it easy to find modules and to apply changes to a specific layer:

```bash
# Apply all networking changes in dev
cd live/dev/networking
terragrunt run-all apply

# Apply all data store changes in dev
cd live/dev/data
terragrunt run-all apply
```

## Environment Parity

Keep the structure identical across environments. If dev has a VPC, staging and prod should have VPCs in the same relative path. This makes it easy to compare environments:

```bash
# Compare what is deployed in dev vs prod
diff <(ls -R live/dev/) <(ls -R live/prod/)
```

When an environment needs a module that others do not, it is better to deploy it with a minimal configuration (or set a `count = 0` in the module) than to have completely different directory structures.

## Variables That Change Per Environment

Use the `env.hcl` pattern to centralize environment-specific values:

```hcl
# live/dev/env.hcl
locals {
  environment        = "dev"
  account_id         = "111111111111"
  vpc_cidr           = "10.0.0.0/16"
  instance_type      = "t3.small"
  min_capacity       = 1
  max_capacity       = 3
  enable_deletion_protection = false
}
```

```hcl
# live/prod/env.hcl
locals {
  environment        = "prod"
  account_id         = "333333333333"
  vpc_cidr           = "10.2.0.0/16"
  instance_type      = "m5.large"
  min_capacity       = 3
  max_capacity       = 20
  enable_deletion_protection = true
}
```

Modules read these values through `read_terragrunt_config()`:

```hcl
# live/dev/app/terragrunt.hcl

locals {
  env_config = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

inputs = {
  instance_type = local.env_config.locals.instance_type
  min_capacity  = local.env_config.locals.min_capacity
  max_capacity  = local.env_config.locals.max_capacity
}
```

## Best Practices

**Keep module configurations small.** Each `terragrunt.hcl` in a module directory should be under 30 lines. If it is longer, you probably need to move shared logic into the root or env config.

**Use consistent naming.** If the module directory is called `vpc`, the Terraform module source should also be the `vpc` module. Do not create mismatches between directory names and module names.

**Separate modules from live configs.** Keep your Terraform modules in a `modules/` directory (or a separate Git repo) and your Terragrunt configurations in `live/`. Do not mix resource definitions with Terragrunt configurations.

**Version your modules.** Once you move modules to a separate repo, use Git tags for versioning. This lets you test module changes in dev before rolling them out to prod.

**Document the structure.** A README at the root of the `live/` directory explaining the hierarchy (what each level represents) saves a lot of confusion for new team members.

## Conclusion

The directory structure is the backbone of any Terragrunt project. Start with the simplest structure that meets your needs - usually environment at the top level with modules underneath. Add region and account levels as your infrastructure grows.

The key principle is that each level of the hierarchy should represent a meaningful boundary (environment, region, account, or module group), and each level should have a corresponding config file that defines values for that boundary.

For working with specific cloud providers, see [How to Use Terragrunt with Azure Multi-Subscription](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-with-azure-multi-subscription/view) for Azure-specific patterns.
