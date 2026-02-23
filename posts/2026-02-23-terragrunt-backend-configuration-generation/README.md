# How to Use Terragrunt for Backend Configuration Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, Backend Configuration, DevOps

Description: Learn how to use Terragrunt to automatically generate backend configurations for Terraform, eliminating repetitive backend blocks across multiple environments and regions.

---

Managing Terraform backend configurations across dozens of environments and regions gets old fast. Every module needs its own backend block, every environment needs a different state file path, and if you ever need to change your backend settings, you're updating files everywhere. Terragrunt solves this with its `generate` block, which lets you define your backend configuration once and have it automatically created for each module at plan or apply time.

In this guide, we'll walk through how to set up backend configuration generation with Terragrunt, covering S3, GCS, and Azure Blob backends.

## Why Generate Backend Configurations?

In plain Terraform, every module directory needs a backend block:

```hcl
# This has to be copied into every single module
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "dev/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

The problem is that most of these values are identical across modules - only the `key` changes. When you have 50 modules across 5 environments, that's 250 backend blocks to maintain. Changing the bucket name means touching every single one.

Terragrunt's `generate` block fixes this by creating the backend configuration file dynamically before Terraform runs.

## Basic Backend Generation with S3

Here's how to set up automatic S3 backend generation. Start with a root `terragrunt.hcl` file:

```hcl
# root terragrunt.hcl - lives at the top of your infrastructure repo
# This file is inherited by all child modules

# Automatically generate the backend configuration
generate "backend" {
  path      = "backend.tf"       # The file Terragrunt will create
  if_exists = "overwrite"        # Overwrite if it already exists
  contents  = <<EOF
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
EOF
}
```

The `path_relative_to_include()` function is the key piece here. It returns the relative path from the root `terragrunt.hcl` to the child module, which gives each module a unique state file key automatically.

For example, if your directory structure looks like this:

```
infrastructure/
  terragrunt.hcl              # Root config with generate block
  dev/
    vpc/
      terragrunt.hcl          # Child config
    rds/
      terragrunt.hcl          # Child config
  prod/
    vpc/
      terragrunt.hcl          # Child config
```

The generated state keys would be:
- `dev/vpc/terraform.tfstate`
- `dev/rds/terraform.tfstate`
- `prod/vpc/terraform.tfstate`

Each child `terragrunt.hcl` just needs to include the root configuration:

```hcl
# dev/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

# Your module-specific Terraform source
terraform {
  source = "../../modules/vpc"
}

inputs = {
  cidr_block = "10.0.0.0/16"
}
```

## Dynamic Backend Configuration with Variables

For more flexibility, you can pull values from local variables or external configuration files:

```hcl
# root terragrunt.hcl

# Read account-level and region-level configs
locals {
  # Parse the account.hcl file found in parent folders
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  region_vars  = read_terragrunt_config(find_in_parent_folders("region.hcl"))

  # Extract values
  account_id   = local.account_vars.locals.account_id
  account_name = local.account_vars.locals.account_name
  aws_region   = local.region_vars.locals.aws_region
}

generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite"
  contents  = <<EOF
terraform {
  backend "s3" {
    bucket         = "${local.account_name}-terraform-state-${local.account_id}"
    key            = "${local.aws_region}/${path_relative_to_include()}/terraform.tfstate"
    region         = "${local.aws_region}"
    encrypt        = true
    dynamodb_table = "terraform-locks-${local.aws_region}"
  }
}
EOF
}
```

Then create the supporting configuration files:

```hcl
# account.hcl - placed in each account directory
locals {
  account_id   = "123456789012"
  account_name = "production"
}
```

```hcl
# region.hcl - placed in each region directory
locals {
  aws_region = "us-west-2"
}
```

This setup produces state keys like `us-west-2/prod/vpc/terraform.tfstate`, keeping state files organized by region as well as environment.

## GCS Backend Generation

The same pattern works for Google Cloud Storage:

```hcl
# root terragrunt.hcl for GCP projects

locals {
  project_vars = read_terragrunt_config(find_in_parent_folders("project.hcl"))
  gcp_project  = local.project_vars.locals.gcp_project
}

generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite"
  contents  = <<EOF
terraform {
  backend "gcs" {
    bucket = "${local.gcp_project}-tfstate"
    prefix = "${path_relative_to_include()}"
  }
}
EOF
}
```

## Azure Blob Backend Generation

And for Azure:

```hcl
# root terragrunt.hcl for Azure

locals {
  env_vars       = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  subscription   = local.env_vars.locals.subscription_id
  env_name       = local.env_vars.locals.environment
}

generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite"
  contents  = <<EOF
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate${local.env_name}"
    container_name       = "tfstate"
    key                  = "${path_relative_to_include()}/terraform.tfstate"
    subscription_id      = "${local.subscription}"
  }
}
EOF
}
```

## Using remote_state Block Instead of generate

Terragrunt also offers a `remote_state` block that goes a step further - it can actually create the backend resources (like the S3 bucket and DynamoDB table) if they don't exist:

```hcl
# root terragrunt.hcl

remote_state {
  backend = "s3"

  # Terragrunt will create these resources if missing
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }

  config = {
    bucket         = "my-company-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"

    # S3 bucket configuration when Terragrunt creates it
    s3_bucket_tags = {
      Name        = "Terraform State"
      Environment = "shared"
    }

    # DynamoDB table tags
    dynamodb_table_tags = {
      Name = "Terraform Lock Table"
    }
  }
}
```

This is particularly useful for bootstrapping new accounts or environments where the state bucket doesn't exist yet.

## Handling Multiple Backends

Sometimes different parts of your infrastructure use different backends. You can override the root backend in child configurations:

```hcl
# modules/legacy-app/terragrunt.hcl
# This module uses a different backend than the rest

include "root" {
  path = find_in_parent_folders()
}

# Override the backend from root
generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite"
  contents  = <<EOF
terraform {
  backend "consul" {
    address = "consul.example.com:8500"
    scheme  = "https"
    path    = "terraform/${path_relative_to_include()}"
  }
}
EOF
}
```

## Controlling the if_exists Behavior

The `if_exists` parameter controls what happens when the generated file already exists in the module directory:

```hcl
generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite"          # Replace the file (most common)
  # if_exists = "overwrite_terragrunt"  # Only overwrite if Terragrunt created it
  # if_exists = "skip"              # Don't generate if file exists
  # if_exists = "error"             # Throw an error if file exists
  contents  = <<EOF
  # ...
EOF
}
```

The `overwrite_terragrunt` option is useful during migration periods when some modules still have hand-written backend blocks.

## Verifying Generated Files

To see what Terragrunt generates without actually running Terraform, use the `render-json` command:

```bash
# Show the full resolved configuration
terragrunt render-json --terragrunt-json-out config.json

# Or just look at the generated files in the cache directory
terragrunt plan
ls .terragrunt-cache/*/backend.tf
```

## Common Pitfalls

One mistake people make is using Terraform variables inside the `generate` block contents. This won't work because the backend block is evaluated before any variables are loaded. Everything in the backend configuration must be known at generation time.

Another common issue is forgetting that `path_relative_to_include()` is relative to the root config file, not the current working directory. Plan your directory structure accordingly.

## Wrapping Up

Backend configuration generation is one of Terragrunt's most practical features. It eliminates a whole class of copy-paste errors and makes reorganizing your infrastructure much simpler - change the backend in one place, and every module picks it up. Combined with the `remote_state` block's ability to create backend resources automatically, it removes a lot of the bootstrapping friction from new environments.

For more on keeping your Terraform configurations DRY with Terragrunt, check out our post on [using Terragrunt for DRY Terraform](https://oneuptime.com/blog/post/2026-01-26-terragrunt-dry-terraform/view).
