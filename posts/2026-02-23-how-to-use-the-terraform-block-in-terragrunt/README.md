# How to Use the terraform Block in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Module Management

Description: A detailed guide to the terraform block in Terragrunt covering module sources, extra arguments, before and after hooks, and advanced configuration options.

---

The `terraform` block in Terragrunt controls how Terraform is executed. It is where you specify the module source, pass extra CLI arguments, and configure hooks that run before or after Terraform commands. While it might seem straightforward, there is a lot of functionality packed into this block.

## The source Attribute

The most basic use of the `terraform` block is specifying where the Terraform module lives:

```hcl
# Point to a local module
terraform {
  source = "../../../modules/vpc"
}
```

Terragrunt copies the module source into a `.terragrunt-cache` directory and runs Terraform there. The `source` attribute supports several source types.

### Local Paths

```hcl
# Relative path to a local module directory
terraform {
  source = "../../../modules/vpc"
}
```

### Git Repositories

```hcl
# Clone from a Git repository
terraform {
  source = "git::https://github.com/my-org/terraform-modules.git//vpc?ref=v1.2.0"
}
```

The `//` separates the repository URL from the subdirectory within the repo. The `?ref=` specifies a tag, branch, or commit.

### Terraform Registry

```hcl
# Use a module from the Terraform registry
terraform {
  source = "tfr:///terraform-aws-modules/vpc/aws?version=5.1.0"
}
```

The `tfr:///` prefix tells Terragrunt to fetch from the Terraform registry.

### S3 or GCS

```hcl
# Fetch from an S3 bucket
terraform {
  source = "s3::https://my-bucket.s3.amazonaws.com/modules/vpc.zip"
}
```

## The extra_arguments Block

The `extra_arguments` block lets you pass additional CLI arguments to Terraform commands. This is one of the most practical features of the `terraform` block.

### Auto-loading Variable Files

```hcl
terraform {
  source = "../../../modules/vpc"

  extra_arguments "common_vars" {
    # Apply these extra arguments to these Terraform commands
    commands = [
      "plan",
      "apply",
      "destroy",
      "import",
    ]

    # Automatically load these tfvars files if they exist
    optional_var_files = [
      "${get_terragrunt_dir()}/../common.tfvars",
      "${get_terragrunt_dir()}/terraform.tfvars",
    ]
  }
}
```

The `optional_var_files` parameter loads variable files if they exist. If a file does not exist, it is silently skipped. There is also `required_var_files` which will fail if the file is missing.

### Passing CLI Flags

```hcl
terraform {
  source = "../../../modules/vpc"

  # Disable color in CI environments
  extra_arguments "disable_color" {
    commands = ["plan", "apply", "destroy"]
    arguments = ["-no-color"]
  }

  # Auto-approve in non-interactive environments
  extra_arguments "auto_approve" {
    commands  = ["apply"]
    arguments = ["-auto-approve"]
  }
}
```

### Conditional Arguments with env_vars

```hcl
terraform {
  source = "../../../modules/vpc"

  extra_arguments "parallelism" {
    commands = ["plan", "apply"]

    # Pass environment variables to Terraform
    env_vars = {
      TF_LOG = "WARN"
    }

    # Limit parallelism to reduce API rate limiting
    arguments = ["-parallelism=5"]
  }
}
```

### Multiple extra_arguments Blocks

You can have multiple `extra_arguments` blocks. They are applied in order:

```hcl
terraform {
  source = "../../../modules/vpc"

  # Load common variables first
  extra_arguments "common_vars" {
    commands = ["plan", "apply", "destroy"]
    optional_var_files = [
      "${find_in_parent_folders("common.tfvars", "ignore")}"
    ]
  }

  # Then load environment-specific variables
  extra_arguments "env_vars" {
    commands = ["plan", "apply", "destroy"]
    optional_var_files = [
      "${get_terragrunt_dir()}/env.tfvars"
    ]
  }

  # Then add CLI flags
  extra_arguments "retry_lock" {
    commands  = ["plan", "apply", "destroy"]
    arguments = ["-lock-timeout=5m"]
  }
}
```

## Before and After Hooks

Hooks let you run custom commands before or after Terraform commands. They are defined inside the `terraform` block.

### before_hook

```hcl
terraform {
  source = "../../../modules/vpc"

  # Run tflint before plan
  before_hook "tflint" {
    commands = ["plan"]
    execute  = ["tflint", "--config", "${get_repo_root()}/.tflint.hcl"]
  }

  # Print a message before apply
  before_hook "confirm" {
    commands = ["apply"]
    execute  = ["echo", "Applying changes to VPC module..."]
  }
}
```

### after_hook

```hcl
terraform {
  source = "../../../modules/vpc"

  # Run a notification script after successful apply
  after_hook "notify" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "curl -X POST https://hooks.slack.com/... -d '{\"text\": \"VPC applied\"}'"]
    run_on_error = false  # only run on success
  }

  # Copy the plan output for auditing
  after_hook "save_plan" {
    commands     = ["plan"]
    execute      = ["bash", "-c", "cp tfplan /audit/plans/vpc-$(date +%s).plan"]
    run_on_error = false
  }
}
```

The `run_on_error` flag controls whether the hook runs if Terraform failed. It defaults to `false`.

### Hook Working Directory

By default, hooks run in the Terraform working directory (inside `.terragrunt-cache`). You can change this:

```hcl
terraform {
  source = "../../../modules/vpc"

  before_hook "validate_inputs" {
    commands    = ["plan"]
    execute     = ["python3", "validate.py"]
    working_dir = "${get_repo_root()}/scripts"  # run from scripts dir
  }
}
```

## The include_in_copy Parameter

When Terragrunt copies the module source to `.terragrunt-cache`, it usually copies only the files from the source directory. You can include additional files from parent directories:

```hcl
terraform {
  source = "../../../modules/vpc"

  # Also copy .tf files from the module's parent directory
  include_in_copy = [
    "../../common/*.tf",
  ]
}
```

This is useful when your Terraform modules share common files that live in a parent directory.

## Practical Example: Full terraform Block

Here is a real-world example combining multiple features:

```hcl
# Root terragrunt.hcl

terraform {
  # Load common variable files for all modules
  extra_arguments "common_vars" {
    commands = [
      "plan",
      "apply",
      "destroy",
      "import",
      "push",
      "refresh",
    ]

    # Load region and environment vars automatically
    optional_var_files = [
      "${find_in_parent_folders("region.tfvars", "ignore")}",
      "${find_in_parent_folders("env.tfvars", "ignore")}",
      "${get_terragrunt_dir()}/module.tfvars",
    ]
  }

  # Set lock timeout to avoid flaky failures in CI
  extra_arguments "lock_timeout" {
    commands  = ["plan", "apply", "destroy", "refresh"]
    arguments = ["-lock-timeout=10m"]
  }

  # Format check before plan
  before_hook "fmt_check" {
    commands = ["plan"]
    execute  = ["terraform", "fmt", "-check", "-diff"]
  }

  # Validate before plan
  before_hook "validate" {
    commands = ["plan"]
    execute  = ["terraform", "validate"]
  }

  # Log the apply timestamp
  after_hook "log_apply" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "echo \"$(date): Applied $(basename $(pwd))\" >> /var/log/terraform-applies.log"]
    run_on_error = false
  }
}
```

Child modules inherit this configuration through `include`:

```hcl
# live/dev/vpc/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

# The source is specific to this module
terraform {
  source = "../../../modules/vpc"
}

inputs = {
  vpc_cidr = "10.0.0.0/16"
}
```

The child's `terraform` block gets merged with the root's. The child provides `source`, while the root provides `extra_arguments` and hooks.

## Source with Double Slash

The double slash (`//`) in source URLs has special meaning. It separates the download root from the module subdirectory:

```hcl
terraform {
  # Downloads the entire repo, but uses the vpc subdirectory
  source = "git::https://github.com/my-org/infra-modules.git//modules/vpc?ref=v2.0.0"
}
```

Everything before `//` is the source to download. Everything after is the path within that source. This distinction matters because Terragrunt caches at the download root level, so modules that share the same root share the cache.

## Overriding source in Child Modules

A common pattern is to define the Git repository in the root and let children specify the subdirectory:

```hcl
# Root terragrunt.hcl
locals {
  modules_repo = "git::https://github.com/my-org/infra-modules.git"
  modules_version = "v2.0.0"
}
```

```hcl
# Child module
include "root" {
  path   = find_in_parent_folders()
  expose = true
}

terraform {
  source = "${include.root.locals.modules_repo}//vpc?ref=${include.root.locals.modules_version}"
}
```

This lets you control the module version from a single location.

## Conclusion

The `terraform` block is the bridge between Terragrunt and Terraform. The `source` attribute tells Terragrunt what module to run. The `extra_arguments` blocks control how Terraform is invoked. And hooks give you extension points before and after each command.

For most projects, you will define `extra_arguments` and hooks in the root `terragrunt.hcl` and only specify `source` in child modules. This keeps the shared behavior centralized while allowing each module to point to its own Terraform code.

For more on the inputs block that works alongside the terraform block, see [How to Use the inputs Block in Terragrunt](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-inputs-block-in-terragrunt/view).
