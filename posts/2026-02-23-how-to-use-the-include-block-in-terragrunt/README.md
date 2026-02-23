# How to Use the include Block in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Configuration Management

Description: Learn how to use the include block in Terragrunt to inherit shared configurations, reduce duplication, and build composable infrastructure setups.

---

The `include` block is one of the most fundamental features in Terragrunt. It allows child configurations to inherit settings from parent configurations, which is the primary mechanism for keeping your Terragrunt code DRY. If you have used Terragrunt at all, you have probably seen `include` with `find_in_parent_folders()`. But there is much more to it than that basic pattern.

This post covers everything about the `include` block - from the basics to advanced multi-include patterns.

## The Basics

At its simplest, `include` tells Terragrunt to merge another configuration file into the current one. The most common pattern is inheriting from a root `terragrunt.hcl`:

```hcl
# live/dev/vpc/terragrunt.hcl

# Include the root configuration
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  vpc_cidr = "10.0.0.0/16"
}
```

The `find_in_parent_folders()` function walks up the directory tree until it finds a `terragrunt.hcl` file, and returns its path. So if your root configuration is at `live/terragrunt.hcl`, this include will find and merge it.

The root configuration typically holds shared settings:

```hcl
# live/terragrunt.hcl

# Remote state configuration inherited by all children
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket = "my-terraform-state"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}

# Common inputs shared across all modules
inputs = {
  aws_region = "us-east-1"
  project    = "my-project"
}
```

When Terragrunt processes the child configuration, it merges the root's `remote_state`, `generate` blocks, and `inputs` into the child. The child's `inputs` take precedence for any overlapping keys.

## Named Includes

Starting with Terragrunt v0.32.0, includes are named. The name serves as a label and determines how you reference the included configuration in expressions.

```hcl
# The name "root" is arbitrary - you can use any name
include "root" {
  path = find_in_parent_folders()
}
```

You can reference attributes from the included configuration using the name:

```hcl
include "root" {
  path = find_in_parent_folders()
}

# Access the locals from the included config
inputs = {
  # Reference the root include's inputs
  state_bucket = include.root.inputs.state_bucket
}
```

## Multiple Includes

One of the most powerful features is the ability to include multiple configurations. This lets you compose behavior from different sources.

```hcl
# live/dev/app/terragrunt.hcl

# Include the root configuration for remote state
include "root" {
  path = find_in_parent_folders()
}

# Include environment-specific defaults
include "env" {
  path   = find_in_parent_folders("env.hcl")
  expose = true
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  # Use values exposed from the env include
  environment  = include.env.locals.environment
  account_id   = include.env.locals.account_id
  instance_type = "t3.small"
}
```

For this to work, you need an `env.hcl` file in the environment directory:

```hcl
# live/dev/env.hcl

locals {
  environment = "dev"
  account_id  = "111111111111"
}
```

And another one for production:

```hcl
# live/prod/env.hcl

locals {
  environment = "prod"
  account_id  = "222222222222"
}
```

The directory structure looks like:

```
live/
  terragrunt.hcl           # root (remote state, common settings)
  dev/
    env.hcl                # dev environment settings
    app/
      terragrunt.hcl       # includes both root and env
    database/
      terragrunt.hcl
  prod/
    env.hcl                # prod environment settings
    app/
      terragrunt.hcl
    database/
      terragrunt.hcl
```

## The expose Parameter

By default, you cannot reference values from an included configuration. The `expose` parameter changes that:

```hcl
include "env" {
  path   = find_in_parent_folders("env.hcl")
  expose = true  # makes locals and other attributes accessible
}

# Now you can reference include.env.locals.*
inputs = {
  environment = include.env.locals.environment
}
```

Without `expose = true`, trying to reference `include.env.locals` would result in an error.

## The merge_strategy Parameter

When a child configuration defines the same block as the included parent, Terragrunt needs to know how to handle the conflict. The `merge_strategy` parameter controls this behavior.

There are three merge strategies:

### no_merge (default for most blocks)

The child completely overrides the parent:

```hcl
include "root" {
  path           = find_in_parent_folders()
  merge_strategy = "no_merge"
}
```

### shallow

Top-level keys are merged, with child values taking precedence:

```hcl
include "root" {
  path           = find_in_parent_folders()
  merge_strategy = "shallow"
}
```

If the parent has:

```hcl
inputs = {
  region      = "us-east-1"
  environment = "default"
}
```

And the child has:

```hcl
inputs = {
  environment = "dev"
  vpc_cidr    = "10.0.0.0/16"
}
```

The result with `shallow` merge is:

```hcl
inputs = {
  region      = "us-east-1"    # from parent
  environment = "dev"          # child overrides parent
  vpc_cidr    = "10.0.0.0/16"  # from child
}
```

### deep

Nested maps are also merged recursively:

```hcl
include "root" {
  path           = find_in_parent_folders()
  merge_strategy = "deep"
}
```

This is useful when you have nested input structures like tags:

```hcl
# Parent
inputs = {
  tags = {
    ManagedBy = "terraform"
    Project   = "my-project"
  }
}

# Child
inputs = {
  tags = {
    Environment = "dev"
  }
}

# Result with deep merge
inputs = {
  tags = {
    ManagedBy   = "terraform"    # from parent
    Project     = "my-project"   # from parent
    Environment = "dev"          # from child
  }
}
```

## Practical Pattern: Three-Level Include

A common production pattern uses three levels of include - root, region, and environment:

```hcl
# live/us-east-1/dev/app/terragrunt.hcl

# Root handles remote state
include "root" {
  path = find_in_parent_folders("root.hcl")
}

# Region handles provider configuration
include "region" {
  path   = find_in_parent_folders("region.hcl")
  expose = true
}

# Environment handles env-specific defaults
include "env" {
  path   = find_in_parent_folders("env.hcl")
  expose = true
}

terraform {
  source = "../../../../modules/app"
}

inputs = {
  aws_region  = include.region.locals.aws_region
  environment = include.env.locals.environment
  app_name    = "my-app"
}
```

With this structure:

```
live/
  root.hcl                     # remote state config
  us-east-1/
    region.hcl                 # region = "us-east-1"
    dev/
      env.hcl                  # environment = "dev"
      app/
        terragrunt.hcl
    prod/
      env.hcl                  # environment = "prod"
      app/
        terragrunt.hcl
  eu-west-1/
    region.hcl                 # region = "eu-west-1"
    dev/
      env.hcl
      app/
        terragrunt.hcl
```

Each level of the hierarchy contributes its own piece of configuration. The leaf `terragrunt.hcl` files stay small and focused on module-specific inputs.

## Common Mistakes

**Forgetting expose**: If you try to reference `include.env.locals.something` without `expose = true`, Terragrunt will give you an error. Always add `expose` when you need to reference included values.

**Circular includes**: Terragrunt does not support circular includes. If A includes B and B includes A, you get an error. Keep your include hierarchy one-directional.

**Wrong find_in_parent_folders argument**: When using multiple includes with `find_in_parent_folders("env.hcl")`, make sure the file actually exists in a parent directory. If it is not found, Terragrunt fails with an error unless you provide a fallback:

```hcl
# Provide a fallback path if the file might not exist
include "env" {
  path = find_in_parent_folders("env.hcl", "default-env.hcl")
}
```

## Conclusion

The `include` block is the backbone of Terragrunt's configuration inheritance system. Start with a single root include using `find_in_parent_folders()` for shared state and provider configuration. As your project grows, adopt multiple named includes with `expose = true` to build composable, layered configurations.

The combination of `include`, `expose`, and `merge_strategy` gives you fine-grained control over how parent and child configurations interact. This is what makes it possible to manage large infrastructure setups without drowning in copied configuration files.

For more on the functions used alongside include, check out [How to Use Terragrunt Functions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-functions/view).
