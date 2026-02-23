# How to Use Terragrunt Extra Arguments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Extra Arguments, Infrastructure as Code, DevOps

Description: Learn how to use Terragrunt extra_arguments to automatically pass variable files, backend configs, and CLI flags to Terraform commands without repeating them manually.

---

Every team has a set of Terraform flags they always pass - variable files, backend configs, parallelism settings, lock timeouts. Without Terragrunt, you end up with long command lines or wrapper scripts. Terragrunt's `extra_arguments` feature lets you define these flags once in your configuration and have them automatically appended to Terraform commands.

## Basic Syntax

The `extra_arguments` block lives inside the `terraform` block:

```hcl
# terragrunt.hcl
terraform {
  source = "../../modules/vpc"

  extra_arguments "common_vars" {
    commands = ["plan", "apply", "destroy"]

    # These flags are added to the terraform command automatically
    arguments = [
      "-var-file=common.tfvars",
      "-var-file=secrets.tfvars"
    ]
  }
}
```

When you run `terragrunt plan`, Terragrunt actually executes:
```bash
terraform plan -var-file=common.tfvars -var-file=secrets.tfvars
```

## Auto-Loading Variable Files

One of the most common uses is automatically loading `.tfvars` files from the directory hierarchy. Terragrunt has dedicated parameters for this:

### required_var_files

```hcl
terraform {
  extra_arguments "env_vars" {
    commands = [
      "apply",
      "plan",
      "destroy",
      "import",
      "push",
      "refresh"
    ]

    # These files must exist, or Terragrunt will error
    required_var_files = [
      "${get_terragrunt_dir()}/../../common.tfvars",
      "${get_terragrunt_dir()}/../env.tfvars"
    ]
  }
}
```

### optional_var_files

```hcl
terraform {
  extra_arguments "optional_vars" {
    commands = [
      "apply",
      "plan",
      "destroy"
    ]

    # These files are loaded if they exist, silently skipped if not
    optional_var_files = [
      "${get_terragrunt_dir()}/../../common.tfvars",
      "${get_terragrunt_dir()}/../region.tfvars",
      "${get_terragrunt_dir()}/module.tfvars"
    ]
  }
}
```

This is particularly useful when you have a layered variable file structure:

```
infrastructure/
  common.tfvars               # Org-wide variables
  dev/
    env.tfvars                # Dev-specific variables
    us-east-1/
      region.tfvars           # Region-specific variables
      vpc/
        module.tfvars         # Module-specific variables
        terragrunt.hcl
```

Each level optionally overrides the previous one.

## Setting Parallelism

Control how many resources Terraform manages concurrently:

```hcl
terraform {
  extra_arguments "parallelism" {
    commands = ["plan", "apply"]
    arguments = ["-parallelism=5"]
  }
}
```

## Lock Timeout

In CI environments where multiple pipelines might run, increase the lock timeout:

```hcl
terraform {
  extra_arguments "lock_timeout" {
    commands = ["plan", "apply", "destroy"]
    arguments = ["-lock-timeout=20m"]
  }
}
```

## Disabling Color Output

For CI/CD logs where ANSI colors create noise:

```hcl
terraform {
  extra_arguments "no_color" {
    commands = [
      "init",
      "plan",
      "apply",
      "destroy",
      "validate"
    ]
    arguments = ["-no-color"]
  }
}
```

## Conditional Extra Arguments

Combine extra_arguments with environment variables for conditional behavior:

```hcl
locals {
  # Check if we're running in CI
  is_ci = get_env("CI", "false") == "true"
}

terraform {
  # Apply CI-specific arguments
  extra_arguments "ci_settings" {
    commands = ["plan", "apply"]

    # In CI, skip interactive prompts and reduce color
    arguments = local.is_ci ? [
      "-no-color",
      "-input=false",
      "-compact-warnings"
    ] : []
  }
}
```

## Multiple extra_arguments Blocks

You can define multiple blocks, and they're all applied in order:

```hcl
terraform {
  source = "../../modules/app"

  # Block 1: Variable files
  extra_arguments "var_files" {
    commands = ["plan", "apply", "destroy"]
    required_var_files = [
      "${get_terragrunt_dir()}/../../common.tfvars"
    ]
    optional_var_files = [
      "${get_terragrunt_dir()}/overrides.tfvars"
    ]
  }

  # Block 2: Performance settings
  extra_arguments "performance" {
    commands = ["plan", "apply"]
    arguments = ["-parallelism=10"]
  }

  # Block 3: Lock settings
  extra_arguments "locking" {
    commands = ["plan", "apply", "destroy"]
    arguments = ["-lock-timeout=15m"]
  }
}
```

The resulting `terraform plan` command gets all of these combined:
```bash
terraform plan \
  -var-file=../../common.tfvars \
  -var-file=overrides.tfvars \
  -parallelism=10 \
  -lock-timeout=15m
```

## Root-Level Extra Arguments

Define common arguments in the root `terragrunt.hcl` to apply them everywhere:

```hcl
# root terragrunt.hcl

terraform {
  # All child modules inherit these arguments
  extra_arguments "common" {
    commands = get_terraform_commands_that_need_vars()

    required_var_files = [
      "${get_parent_terragrunt_dir()}/common.tfvars"
    ]
  }

  extra_arguments "retry_lock" {
    commands = get_terraform_commands_that_need_locking()
    arguments = ["-lock-timeout=10m"]
  }
}
```

Note the helper functions:
- `get_terraform_commands_that_need_vars()` returns commands that accept `-var` and `-var-file` flags
- `get_terraform_commands_that_need_locking()` returns commands that accept `-lock-timeout`

## Environment Variables as Extra Arguments

You can also set Terraform environment variables through Terragrunt:

```hcl
terraform {
  extra_arguments "env_vars" {
    commands = ["plan", "apply"]

    env_vars = {
      TF_VAR_region      = "us-east-1"
      TF_VAR_environment = "dev"
      TF_LOG             = "WARN"
    }
  }
}
```

This is useful for passing variables that you don't want in `.tfvars` files, or for setting Terraform configuration environment variables like `TF_LOG`.

## Auto-Approve in Specific Contexts

Add `-auto-approve` for certain situations (use with caution):

```hcl
locals {
  auto_approve = get_env("AUTO_APPROVE", "false") == "true"
}

terraform {
  extra_arguments "auto_approve" {
    commands = ["apply", "destroy"]
    arguments = local.auto_approve ? ["-auto-approve"] : []
  }
}
```

Then in CI:
```bash
AUTO_APPROVE=true terragrunt apply
```

## Passing Backend Config Arguments

For backend partial configuration:

```hcl
terraform {
  extra_arguments "init_backend" {
    commands = ["init"]
    arguments = [
      "-backend-config=bucket=my-state-bucket",
      "-backend-config=key=${path_relative_to_include()}/terraform.tfstate",
      "-backend-config=region=us-east-1"
    ]
  }
}
```

This is an alternative to the `remote_state` block for teams that prefer more explicit control.

## Practical Example: Multi-Account AWS Setup

Here's a real-world example combining multiple extra_arguments patterns:

```hcl
# root terragrunt.hcl

locals {
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  region_vars  = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  env_vars     = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

terraform {
  # Load variable files from the directory hierarchy
  extra_arguments "hierarchical_vars" {
    commands = get_terraform_commands_that_need_vars()

    optional_var_files = [
      "${get_parent_terragrunt_dir()}/common.tfvars",
      "${find_in_parent_folders("account.hcl", "ignore")}/../account.tfvars",
      "${find_in_parent_folders("region.hcl", "ignore")}/../region.tfvars",
      "${get_terragrunt_dir()}/terraform.tfvars"
    ]
  }

  # Standard settings for all commands
  extra_arguments "standard" {
    commands = ["plan", "apply", "destroy"]
    arguments = [
      "-lock-timeout=10m",
      "-parallelism=5"
    ]
  }

  # Pass account and region as environment variables
  extra_arguments "account_env" {
    commands = get_terraform_commands_that_need_vars()
    env_vars = {
      TF_VAR_aws_account_id = local.account_vars.locals.account_id
      TF_VAR_aws_region     = local.region_vars.locals.aws_region
      TF_VAR_environment    = local.env_vars.locals.environment
    }
  }
}
```

## Debugging Extra Arguments

To see what arguments Terragrunt is passing to Terraform:

```bash
# Debug logging shows the full command being executed
terragrunt plan --terragrunt-log-level debug

# Look for lines like:
# DEBUG: Running command: terraform plan -var-file=... -parallelism=5 ...
```

## Summary

Extra arguments save you from long command lines and wrapper scripts. The most impactful uses are automatic variable file loading (with `required_var_files` and `optional_var_files`), consistent performance settings, and environment-specific flags. Define them in the root `terragrunt.hcl` for project-wide defaults, and override in child modules when needed. For more on making Terraform DRY with Terragrunt, see our [Terragrunt with Terraform Modules guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-terraform-modules/view).
