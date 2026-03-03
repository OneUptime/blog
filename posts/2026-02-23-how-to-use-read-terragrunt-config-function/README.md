# How to Use the read_terragrunt_config Function

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Functions, Configuration Management

Description: Learn how to use the read_terragrunt_config function in Terragrunt to read and parse external configuration files for building layered, composable infrastructure setups.

---

The `read_terragrunt_config()` function reads and parses a Terragrunt configuration file, giving you access to its `locals`, `inputs`, and other attributes. It is one of the most powerful functions in Terragrunt because it enables a layered configuration pattern where different files define different aspects of your setup.

## Basic Syntax

```hcl
locals {
  # Read another terragrunt config file and access its contents
  config = read_terragrunt_config("path/to/file.hcl")

  # Access locals from the read file
  value = local.config.locals.some_value
}
```

The function takes a file path and returns a parsed representation of that file's contents. You can then access `locals`, `inputs`, and other top-level attributes from the returned object.

## Why Use It Instead of include?

You might wonder why you would use `read_terragrunt_config()` when you can use `include` with `expose = true`. The key difference is that `include` merges the included file's configuration into the current one, while `read_terragrunt_config()` just reads the data without merging anything.

```hcl
# Using include - MERGES the configuration
include "env" {
  path   = find_in_parent_folders("env.hcl")
  expose = true
}
# The env.hcl's remote_state, generate blocks, etc. are all merged

# Using read_terragrunt_config - just READS the data
locals {
  env = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}
# Nothing is merged - you just have access to env.hcl's locals
```

Use `read_terragrunt_config()` when you want to read values from a file without any of the side effects of including it.

## The Standard Pattern

The most common pattern is having small `.hcl` files at various levels of your directory hierarchy that define locals:

```text
live/
  root.hcl                    # project-wide settings
  us-east-1/
    region.hcl                # region settings
    dev/
      env.hcl                 # environment settings
      vpc/
        terragrunt.hcl        # module config
      app/
        terragrunt.hcl        # module config
```

Each config file defines locals:

```hcl
# live/root.hcl
locals {
  project     = "my-project"
  team        = "platform"
  cost_center = "ENG-001"
}
```

```hcl
# live/us-east-1/region.hcl
locals {
  aws_region = "us-east-1"
}
```

```hcl
# live/us-east-1/dev/env.hcl
locals {
  environment = "dev"
  account_id  = "111111111111"
}
```

The module configuration reads all of them:

```hcl
# live/us-east-1/dev/vpc/terragrunt.hcl

locals {
  # Read each config file from the hierarchy
  root_config   = read_terragrunt_config(find_in_parent_folders("root.hcl"))
  region_config = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  env_config    = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  # Extract the values we need
  project     = local.root_config.locals.project
  aws_region  = local.region_config.locals.aws_region
  environment = local.env_config.locals.environment
  account_id  = local.env_config.locals.account_id
}

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../../modules/vpc"
}

inputs = {
  project     = local.project
  environment = local.environment
  aws_region  = local.aws_region
  vpc_cidr    = "10.0.0.0/16"
}
```

## Accessing Different Attributes

`read_terragrunt_config()` gives you access to several top-level attributes from the file:

```hcl
locals {
  config = read_terragrunt_config("some-config.hcl")

  # Access locals defined in the file
  value1 = local.config.locals.some_local

  # Access inputs defined in the file
  value2 = local.config.inputs.some_input

  # Access the dependency blocks (if any)
  deps = local.config.dependency
}
```

In practice, you will almost always use `.locals` because the convention is to put shared values in `locals` blocks.

## Dynamic Configuration Based on Environment

One powerful pattern uses `read_terragrunt_config()` to build dynamic configurations:

```hcl
# live/us-east-1/dev/app/terragrunt.hcl

locals {
  env_config  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment

  # Load environment-specific sizing
  sizing = {
    dev = {
      instance_type  = "t3.small"
      instance_count = 1
      storage_gb     = 20
    }
    staging = {
      instance_type  = "t3.medium"
      instance_count = 2
      storage_gb     = 50
    }
    prod = {
      instance_type  = "m5.large"
      instance_count = 3
      storage_gb     = 100
    }
  }

  # Select the sizing for this environment
  current_sizing = local.sizing[local.environment]
}

terraform {
  source = "../../../../modules/app"
}

inputs = {
  instance_type  = local.current_sizing.instance_type
  instance_count = local.current_sizing.instance_count
  storage_gb     = local.current_sizing.storage_gb
}
```

## Reading Multiple Files and Merging

You can read several files and merge their values:

```hcl
locals {
  # Read defaults
  defaults = read_terragrunt_config("${get_terragrunt_dir()}/defaults.hcl")

  # Read overrides (module-specific)
  overrides_path = "${get_terragrunt_dir()}/overrides.hcl"
  has_overrides  = fileexists(local.overrides_path)
  overrides      = local.has_overrides ? read_terragrunt_config(local.overrides_path) : { locals = {} }

  # Merge defaults with overrides
  config = merge(
    local.defaults.locals,
    local.overrides.locals
  )
}

inputs = local.config
```

This lets you have a base set of defaults with optional per-module overrides.

## Using with generate Blocks

Combine `read_terragrunt_config()` with `generate` for dynamic file generation:

```hcl
locals {
  env_config  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment
  account_id  = local.env_config.locals.account_id

  region_config = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  aws_region    = local.region_config.locals.aws_region
}

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
      Environment = "${local.environment}"
    }
  }
}
EOF
}
```

## Error Handling

If the file does not exist, `read_terragrunt_config()` will throw an error. Handle optional files with `fileexists()`:

```hcl
locals {
  optional_path = "${get_terragrunt_dir()}/optional.hcl"

  # Check if the file exists before reading
  optional_config = fileexists(local.optional_path) ? read_terragrunt_config(local.optional_path) : null

  # Use a default if the file does not exist
  optional_value = local.optional_config != null ? local.optional_config.locals.some_value : "default"
}
```

## Caching Behavior

Terragrunt caches the results of `read_terragrunt_config()` calls. If multiple modules read the same file, it is only parsed once. This means you do not need to worry about performance when many modules read the same `env.hcl` or `region.hcl`.

## Real-World Root Configuration

Here is a complete root configuration that uses `read_terragrunt_config()` to build its settings:

```hcl
# live/root.hcl

locals {
  # Read configs from various levels
  # These are called in child modules that include this root
  region_config = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  env_config    = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  aws_region  = local.region_config.locals.aws_region
  environment = local.env_config.locals.environment
  account_id  = local.env_config.locals.account_id
  project     = "my-project"
}

# Remote state using values from the config hierarchy
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "${local.project}-tf-state-${local.account_id}"
    key            = "${local.aws_region}/${path_relative_to_include()}/terraform.tfstate"
    region         = local.aws_region
    encrypt        = true
    dynamodb_table = "${local.project}-tf-lock"
  }
}

# Provider using values from the config hierarchy
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  assume_role {
    role_arn = "arn:aws:iam::${local.account_id}:role/TerraformDeployRole"
  }

  default_tags {
    tags = {
      Project     = "${local.project}"
      Environment = "${local.environment}"
      ManagedBy   = "terraform"
    }
  }
}
EOF
}

# Common inputs
inputs = {
  project     = local.project
  environment = local.environment
  aws_region  = local.aws_region
}
```

Every child module that includes this root automatically gets the correct state bucket, provider, and common inputs based on where it sits in the directory hierarchy.

## Conclusion

`read_terragrunt_config()` is the function that enables Terragrunt's layered configuration pattern. By placing small config files at each level of your directory hierarchy (project, region, environment), you create a system where each module automatically picks up the right settings based on its location.

The key advantage over `include` is that `read_terragrunt_config()` gives you read-only access to another file's data without merging its full configuration. This makes it predictable and easy to reason about - you are just reading values, not changing how the current configuration behaves.

For more on organizing your directory hierarchy, see [How to Organize Terragrunt for Multi-Environment Projects](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-terragrunt-for-multi-environment-projects/view).
