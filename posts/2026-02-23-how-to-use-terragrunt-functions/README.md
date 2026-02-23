# How to Use Terragrunt Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Functions, HCL

Description: A comprehensive guide to the most important Terragrunt built-in functions including find_in_parent_folders, get_env, read_terragrunt_config, and more.

---

Terragrunt extends HCL with its own set of built-in functions. These functions are what make Terragrunt configurations dynamic and composable. They let you resolve file paths, read environment variables, reference parent configurations, and compute values at runtime.

This post covers the most commonly used Terragrunt functions with practical examples.

## find_in_parent_folders

This is probably the most frequently used Terragrunt function. It walks up the directory tree from the current `terragrunt.hcl` file and returns the absolute path to the first file matching the given name.

```hcl
# Finds the nearest terragrunt.hcl in parent directories
include "root" {
  path = find_in_parent_folders()
}
```

When called without arguments, it looks for `terragrunt.hcl`. You can pass a specific filename:

```hcl
# Find a specific file in parent directories
include "env" {
  path   = find_in_parent_folders("env.hcl")
  expose = true
}
```

You can also provide a fallback value if the file might not exist:

```hcl
# Returns the fallback path if env.hcl is not found
include "env" {
  path = find_in_parent_folders("env.hcl", "${get_terragrunt_dir()}/default-env.hcl")
}
```

Given this directory structure:

```
live/
  terragrunt.hcl       # root config
  us-east-1/
    region.hcl
    dev/
      env.hcl
      vpc/
        terragrunt.hcl  # calling find_in_parent_folders("env.hcl")
```

From `live/us-east-1/dev/vpc/terragrunt.hcl`:
- `find_in_parent_folders()` returns the path to `live/terragrunt.hcl`
- `find_in_parent_folders("env.hcl")` returns the path to `live/us-east-1/dev/env.hcl`
- `find_in_parent_folders("region.hcl")` returns the path to `live/us-east-1/region.hcl`

## path_relative_to_include

Returns the relative path between the current `terragrunt.hcl` and the included `terragrunt.hcl`. This is most commonly used for generating unique state keys:

```hcl
# Root terragrunt.hcl
remote_state {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    # Generates a unique key based on the child module's relative path
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

If the root is at `live/terragrunt.hcl` and a child is at `live/dev/vpc/terragrunt.hcl`, then `path_relative_to_include()` returns `dev/vpc`. This means the state key becomes `dev/vpc/terraform.tfstate`.

For a detailed exploration, see [How to Use the path_relative_to_include Function in Terragrunt](https://oneuptime.com/blog/post/2026-02-23-how-to-use-path-relative-to-include-in-terragrunt/view).

## path_relative_from_include

The inverse of `path_relative_to_include`. Returns the relative path from the included configuration back to the current one. This is useful when the parent needs to generate paths that point to child directories:

```hcl
# Root terragrunt.hcl
terraform {
  extra_arguments "module_vars" {
    commands = ["plan", "apply"]
    optional_var_files = [
      # Path from root down to the child module's directory
      "${path_relative_from_include()}/module.tfvars"
    ]
  }
}
```

See [How to Use the path_relative_from_include Function in Terragrunt](https://oneuptime.com/blog/post/2026-02-23-how-to-use-path-relative-from-include-in-terragrunt/view) for more details.

## get_terragrunt_dir

Returns the absolute path to the directory containing the current `terragrunt.hcl` file:

```hcl
locals {
  # Read a config file from the same directory as this terragrunt.hcl
  config = jsondecode(file("${get_terragrunt_dir()}/config.json"))
}

inputs = {
  app_port = local.config.port
}
```

This is different from `get_original_terragrunt_dir()` when using includes. `get_terragrunt_dir()` returns the directory of the file being processed, while `get_original_terragrunt_dir()` always returns the directory of the child configuration that initiated the include chain.

## get_original_terragrunt_dir

Returns the directory of the child `terragrunt.hcl` that started the configuration resolution, regardless of which included file is currently being evaluated:

```hcl
# Root terragrunt.hcl
# Even when this root file is being processed,
# get_original_terragrunt_dir() returns the child's directory

terraform {
  extra_arguments "local_vars" {
    commands = ["plan", "apply"]
    optional_var_files = [
      # Points to the child module's directory, not the root's
      "${get_original_terragrunt_dir()}/local.tfvars"
    ]
  }
}
```

## get_env

Reads environment variables with an optional default:

```hcl
inputs = {
  # Read env var with default
  image_tag = get_env("IMAGE_TAG", "latest")

  # Read env var without default (errors if not set)
  api_secret = get_env("API_SECRET")

  # Use env vars for AWS configuration
  aws_profile = get_env("AWS_PROFILE", "default")
}
```

For a deeper dive, see [How to Use the get_env Function in Terragrunt](https://oneuptime.com/blog/post/2026-02-23-how-to-use-get-env-function-in-terragrunt/view).

## read_terragrunt_config

Reads and parses another Terragrunt configuration file, giving you access to its locals, inputs, and other attributes:

```hcl
locals {
  # Read the environment configuration
  env_config = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  # Access its locals
  environment = local.env_config.locals.environment
  account_id  = local.env_config.locals.account_id
}

inputs = {
  environment = local.environment
  account_id  = local.account_id
}
```

The file being read typically defines `locals`:

```hcl
# env.hcl
locals {
  environment = "dev"
  account_id  = "111111111111"
  aws_region  = "us-east-1"
}
```

This is an alternative to using `include` with `expose = true`. The advantage is that you can read any file without including it, which avoids merging behavior.

For more details, see [How to Use the read_terragrunt_config Function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-read-terragrunt-config-function/view).

## get_repo_root

Returns the absolute path to the root of the Git repository:

```hcl
terraform {
  # Reference modules relative to the repo root
  source = "${get_repo_root()}/modules/vpc"

  before_hook "lint" {
    commands = ["plan"]
    execute  = ["tflint", "--config", "${get_repo_root()}/.tflint.hcl"]
  }
}
```

This is useful when you want paths that are stable regardless of where the `terragrunt.hcl` is in the directory hierarchy.

## get_parent_terragrunt_dir

Returns the absolute path to the directory of the parent `terragrunt.hcl` (the one being included):

```hcl
# Used in child configs to reference files relative to the root
locals {
  common_vars = yamldecode(file("${get_parent_terragrunt_dir()}/common-vars.yaml"))
}
```

## run_cmd

Executes a shell command and returns its stdout. Use this sparingly - it runs every time Terragrunt evaluates the configuration:

```hcl
locals {
  # Get the current Git commit hash
  git_commit = run_cmd("git", "rev-parse", "--short", "HEAD")

  # Get the current AWS account ID
  account_id = run_cmd("aws", "sts", "get-caller-identity", "--query", "Account", "--output", "text")
}

inputs = {
  git_commit = local.git_commit
  account_id = local.account_id
}
```

There is also `run_cmd("--terragrunt-forward-tf-stdout", ...)` for commands whose output should be forwarded to the terminal.

## Combining Functions

The real power comes from combining multiple functions:

```hcl
locals {
  # Read configs from different levels of the hierarchy
  root_config   = read_terragrunt_config(find_in_parent_folders("root.hcl"))
  region_config = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  env_config    = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  # Extract values
  project     = local.root_config.locals.project
  aws_region  = local.region_config.locals.aws_region
  environment = local.env_config.locals.environment
  account_id  = local.env_config.locals.account_id

  # Compute derived values
  name_prefix = "${local.project}-${local.environment}"
}

# Remote state with dynamic key
remote_state {
  backend = "s3"
  config = {
    bucket = "${local.project}-terraform-state-${local.account_id}"
    key    = "${local.aws_region}/${path_relative_to_include()}/terraform.tfstate"
    region = local.aws_region
  }
}

# Generate provider with values from multiple config sources
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  assume_role {
    role_arn = "arn:aws:iam::${local.account_id}:role/TerraformRole"
  }

  default_tags {
    tags = {
      Project     = "${local.project}"
      Environment = "${local.environment}"
      Region      = "${local.aws_region}"
    }
  }
}
EOF
}

# Common inputs from all config levels
inputs = {
  project     = local.project
  environment = local.environment
  aws_region  = local.aws_region
  name_prefix = local.name_prefix
}
```

## Function Reference Table

Here is a quick reference of all commonly used Terragrunt functions:

| Function | Returns |
|----------|---------|
| `find_in_parent_folders()` | Path to the nearest parent config file |
| `path_relative_to_include()` | Relative path from included config to current |
| `path_relative_from_include()` | Relative path from current to included config |
| `get_terragrunt_dir()` | Directory of the current terragrunt.hcl |
| `get_original_terragrunt_dir()` | Directory of the child terragrunt.hcl |
| `get_parent_terragrunt_dir()` | Directory of the parent terragrunt.hcl |
| `get_repo_root()` | Root of the Git repository |
| `get_env(name, default)` | Value of an environment variable |
| `read_terragrunt_config(path)` | Parsed contents of another config file |
| `run_cmd(args...)` | Stdout from a shell command |

## Conclusion

Terragrunt functions are the glue that holds together DRY, multi-environment configurations. Start with `find_in_parent_folders()` and `path_relative_to_include()` for basic inheritance and state management. Add `read_terragrunt_config()` and `get_env()` as your configurations become more dynamic. Use `run_cmd()` sparingly for values that must come from external commands.

These functions, combined with `locals` blocks for intermediate computations, let you build Terragrunt configurations that adapt to their context in the directory hierarchy - without duplicating anything.
