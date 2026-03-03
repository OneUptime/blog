# How to Use the path_relative_to_include Function in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Functions, State Management

Description: Learn how path_relative_to_include works in Terragrunt with practical examples for state key generation, resource naming, and directory-based configuration.

---

The `path_relative_to_include()` function is one of the most important functions in Terragrunt. It returns the relative path from the directory of the included (parent) `terragrunt.hcl` to the directory of the current (child) `terragrunt.hcl`. While that sounds abstract, its practical application is straightforward: it gives each module a unique identifier based on its position in your directory tree.

## How It Works

Consider this directory layout:

```text
live/
  terragrunt.hcl                 # root config (the "included" file)
  dev/
    vpc/
      terragrunt.hcl             # child config
    rds/
      terragrunt.hcl             # child config
  prod/
    vpc/
      terragrunt.hcl             # child config
    rds/
      terragrunt.hcl             # child config
```

Each child includes the root:

```hcl
# live/dev/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}
```

When Terragrunt processes `live/dev/vpc/terragrunt.hcl`, the `path_relative_to_include()` function returns `dev/vpc` - the relative path from `live/` (where the included `terragrunt.hcl` lives) to `live/dev/vpc/` (where the current file lives).

For each child module:

| Child location | path_relative_to_include() returns |
|---|---|
| `live/dev/vpc/terragrunt.hcl` | `dev/vpc` |
| `live/dev/rds/terragrunt.hcl` | `dev/rds` |
| `live/prod/vpc/terragrunt.hcl` | `prod/vpc` |
| `live/prod/rds/terragrunt.hcl` | `prod/rds` |

Each module gets a unique string based on its directory position.

## Primary Use Case: Unique State Keys

The most common use of `path_relative_to_include()` is generating unique Terraform state file keys:

```hcl
# live/terragrunt.hcl (root)

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "my-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

This single configuration creates separate state files for every module:

- `dev/vpc/terraform.tfstate`
- `dev/rds/terraform.tfstate`
- `prod/vpc/terraform.tfstate`
- `prod/rds/terraform.tfstate`

Without this function, you would need to manually set a unique `key` in every single module's backend configuration. With dozens or hundreds of modules, that is a lot of error-prone copy-pasting.

## Resource Naming

Beyond state keys, `path_relative_to_include()` is useful for generating consistent resource names:

```hcl
# live/terragrunt.hcl (root)

locals {
  # Convert the relative path to a name-safe string
  # "dev/vpc" becomes "dev-vpc"
  module_path = replace(path_relative_to_include(), "/", "-")
}

inputs = {
  # Every module gets a unique name prefix based on its directory position
  resource_prefix = local.module_path
}
```

In your Terraform module:

```hcl
# modules/vpc/main.tf

variable "resource_prefix" {
  type = string
}

resource "aws_vpc" "this" {
  cidr_block = var.vpc_cidr

  tags = {
    Name = "${var.resource_prefix}-vpc"
    # Results in: "dev-vpc-vpc" for the dev environment
  }
}
```

## CloudWatch Log Group Naming

A practical example for log groups:

```hcl
# live/terragrunt.hcl (root)

inputs = {
  # Use the path to create hierarchical log group names
  log_group_prefix = "/${replace(path_relative_to_include(), "/", "/")}"
}
```

This creates log groups like:
- `/dev/vpc/` for the dev VPC module
- `/prod/ecs-service/` for the prod ECS service module

## Tagging Resources

Use the path to automatically tag resources with their source:

```hcl
# live/terragrunt.hcl (root)

inputs = {
  common_tags = {
    ManagedBy    = "terraform"
    TerragruntModule = path_relative_to_include()
  }
}
```

Now every resource is tagged with the Terragrunt module path that created it, making it easy to trace resources back to their source configuration.

## With Multiple State Backends

If you use different state backends for different regions, `path_relative_to_include()` keeps things consistent:

```hcl
# live/terragrunt.hcl (root)

locals {
  region_config = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  aws_region    = local.region_config.locals.aws_region
}

remote_state {
  backend = "s3"
  config = {
    # Region-specific state bucket
    bucket = "terraform-state-${local.aws_region}"
    # Path is still based on directory structure
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = local.aws_region
  }
}
```

With a structure like:

```text
live/
  terragrunt.hcl
  us-east-1/
    region.hcl          # aws_region = "us-east-1"
    dev/
      vpc/
        terragrunt.hcl  # key = "us-east-1/dev/vpc/terraform.tfstate"
  eu-west-1/
    region.hcl          # aws_region = "eu-west-1"
    dev/
      vpc/
        terragrunt.hcl  # key = "eu-west-1/dev/vpc/terraform.tfstate"
```

## Behavior with Multiple Includes

When you have multiple `include` blocks, `path_relative_to_include()` returns the relative path to the include where it is used. If used in the root `terragrunt.hcl`, it computes the path relative to the root.

```hcl
# live/dev/app/terragrunt.hcl

include "root" {
  path = find_in_parent_folders("root.hcl")
  # path_relative_to_include() in root.hcl = "us-east-1/dev/app"
}

include "env" {
  path = find_in_parent_folders("env.hcl")
  # path_relative_to_include() in env.hcl = "app"
}
```

This is important to understand. The same function returns different values depending on which included file it is evaluated in. The path is always relative to the file that contains the `include` being resolved.

## Combining with Other Functions

A common pattern combines `path_relative_to_include()` with string manipulation:

```hcl
# live/terragrunt.hcl (root)

locals {
  # Get the relative path
  rel_path = path_relative_to_include()

  # Split into components
  path_parts = split("/", local.rel_path)

  # Extract specific parts
  # For "us-east-1/dev/vpc":
  #   path_parts[0] = "us-east-1" (region)
  #   path_parts[1] = "dev" (environment)
  #   path_parts[2] = "vpc" (module)
  region      = local.path_parts[0]
  environment = local.path_parts[1]
  module_name = local.path_parts[2]
}

inputs = {
  region      = local.region
  environment = local.environment
  module_name = local.module_name
}
```

This lets you derive configuration values from the directory structure itself. The directory hierarchy becomes a source of truth.

## Azure and GCP Backends

The pattern works with any Terraform backend, not just S3:

```hcl
# Azure backend
remote_state {
  backend = "azurerm"
  config = {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate"
    container_name       = "state"
    key                  = "${path_relative_to_include()}/terraform.tfstate"
  }
}
```

```hcl
# GCP backend
remote_state {
  backend = "gcs"
  config = {
    bucket = "my-terraform-state"
    prefix = path_relative_to_include()
  }
}
```

## Debugging

To see what `path_relative_to_include()` resolves to, you can use `terragrunt render-json`:

```bash
cd live/dev/vpc
terragrunt render-json | jq '.remote_state.config.key'
# Output: "dev/vpc/terraform.tfstate"
```

Or add a temporary `run_cmd` to print it:

```hcl
locals {
  debug = run_cmd("echo", "path_relative_to_include = ${path_relative_to_include()}")
}
```

## Conclusion

`path_relative_to_include()` is one of those functions you set up once in your root configuration and then forget about. It automatically gives every module a unique identifier based on the directory structure, which is used for state keys, resource naming, tagging, and log group paths.

The function embodies a key Terragrunt philosophy: the directory structure is meaningful. By organizing your modules in a logical hierarchy (region/environment/module), you get consistent, predictable identifiers without any manual configuration.

For the inverse function, see [How to Use the path_relative_from_include Function in Terragrunt](https://oneuptime.com/blog/post/2026-02-23-how-to-use-path-relative-from-include-in-terragrunt/view).
