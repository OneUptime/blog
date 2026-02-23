# How to Use the path_relative_from_include Function in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Functions, Path Resolution

Description: Understand the path_relative_from_include function in Terragrunt - how it differs from path_relative_to_include and when to use it for resolving paths in parent configs.

---

Terragrunt has two path functions that complement each other: `path_relative_to_include()` and `path_relative_from_include()`. While `path_relative_to_include()` is widely used and well-documented, its counterpart `path_relative_from_include()` is less commonly discussed. But it fills an important role when the parent configuration needs to reference files in or relative to the child module's directory.

## What It Returns

`path_relative_from_include()` returns the relative path from the child `terragrunt.hcl` back to the directory containing the included (parent) `terragrunt.hcl`.

Think of it as the reverse direction of `path_relative_to_include()`:

```
# Directory structure:
live/
  terragrunt.hcl              # parent (included config)
  dev/
    vpc/
      terragrunt.hcl          # child

# From the child's perspective:
# path_relative_to_include()   -> "dev/vpc"     (child to parent = DOWN from parent)
# path_relative_from_include() -> "../.."        (parent back to child = UP from child)
```

Wait, that needs clarification. `path_relative_from_include()` is evaluated in the context of the parent configuration, and it returns the path from the parent back to itself. Actually, let me be precise:

- `path_relative_to_include()` = relative path from the **included (parent)** directory to the **child** directory
- `path_relative_from_include()` = relative path from the **child** directory to the **included (parent)** directory

So from `live/dev/vpc/terragrunt.hcl` including `live/terragrunt.hcl`:
- `path_relative_to_include()` returns `dev/vpc`
- `path_relative_from_include()` returns `../..`

## When You Need It

The main use case for `path_relative_from_include()` is in the parent configuration when it needs to construct paths that resolve correctly from the child's directory.

### Referencing Shared Module Sources

Consider a root configuration that sets the module source:

```hcl
# live/terragrunt.hcl (root)

terraform {
  # The source path needs to resolve from the CHILD's directory
  # path_relative_from_include() gives us "../.." (or however many levels)
  # which takes us from the child back to the root, then we can go to modules/
  source = "${path_relative_from_include()}/../modules/${local.module_name}"
}
```

Here is the directory layout:

```
project/
  modules/
    vpc/
      main.tf
    rds/
      main.tf
  live/
    terragrunt.hcl          # root config
    dev/
      vpc/
        terragrunt.hcl      # child
```

From `live/dev/vpc/`, `path_relative_from_include()` returns `../..` (going from `live/dev/vpc/` up to `live/`). Then `../../modules/vpc` resolves correctly from the child's directory to `project/modules/vpc`.

### Loading Variable Files Relative to Root

```hcl
# live/terragrunt.hcl (root)

terraform {
  extra_arguments "shared_vars" {
    commands = ["plan", "apply", "destroy"]

    # These paths resolve from the child's working directory
    optional_var_files = [
      "${path_relative_from_include()}/shared.tfvars",
      "${path_relative_from_include()}/region-defaults.tfvars",
    ]
  }
}
```

When a child at `live/dev/vpc/` includes this root, the paths become:
- `../../shared.tfvars` (which resolves to `live/shared.tfvars`)
- `../../region-defaults.tfvars` (which resolves to `live/region-defaults.tfvars`)

This lets you keep shared variable files next to the root `terragrunt.hcl` and reference them from any child module.

## Practical Examples

### Shared Scripts

If you have helper scripts next to your root configuration:

```hcl
# live/terragrunt.hcl (root)

terraform {
  before_hook "validate" {
    commands = ["plan"]
    # The hook runs from the child's .terragrunt-cache directory
    # We need a path from there to the scripts at the root level
    execute = ["bash", "${path_relative_from_include()}/scripts/validate.sh"]
  }

  after_hook "notify" {
    commands     = ["apply"]
    execute      = ["python3", "${path_relative_from_include()}/scripts/notify.py"]
    run_on_error = false
  }
}
```

Directory structure:

```
live/
  terragrunt.hcl
  scripts/
    validate.sh
    notify.py
  dev/
    vpc/
      terragrunt.hcl
```

### Shared Terraform Files

Some teams keep common Terraform files (like shared data sources or local values) at the root level and want every module to include them:

```hcl
# live/terragrunt.hcl (root)

terraform {
  # Copy common .tf files from the root's common/ directory into each module
  include_in_copy = [
    "${path_relative_from_include()}/common/*.tf",
  ]
}
```

```
live/
  terragrunt.hcl
  common/
    data_sources.tf    # shared data sources
    locals.tf          # shared local values
  dev/
    vpc/
      terragrunt.hcl
```

Every child module gets the files from `common/` copied into its working directory.

### Referencing a Shared Lockfile

If you want all modules to use the same `.terraform.lock.hcl`:

```hcl
# live/terragrunt.hcl (root)

terraform {
  # Copy the lockfile from root to each module's working directory
  include_in_copy = [
    "${path_relative_from_include()}/.terraform.lock.hcl",
  ]
}
```

## Comparison Table

Let me clarify both functions side by side with a concrete example.

Given:
- Root config: `live/terragrunt.hcl`
- Child config: `live/us-east-1/dev/vpc/terragrunt.hcl`

| Function | Returns | Direction |
|---|---|---|
| `path_relative_to_include()` | `us-east-1/dev/vpc` | From root to child |
| `path_relative_from_include()` | `../../..` | From child to root |

Think of it like giving directions:
- `path_relative_to_include()`: "To get from the root to this child, go `us-east-1/dev/vpc`"
- `path_relative_from_include()`: "To get from this child back to the root, go `../../..`"

## With Multiple Includes

When using multiple named includes, `path_relative_from_include()` computes the path relative to each specific include:

```hcl
# live/us-east-1/dev/app/terragrunt.hcl

include "root" {
  path = find_in_parent_folders("root.hcl")
  # path_relative_from_include() in root.hcl context = "../../.."
}

include "region" {
  path = find_in_parent_folders("region.hcl")
  # path_relative_from_include() in region.hcl context = "../.."
}

include "env" {
  path = find_in_parent_folders("env.hcl")
  # path_relative_from_include() in env.hcl context = ".."
}
```

The function adjusts based on which include context it is evaluated in, so paths always resolve correctly.

## Common Mistake: Confusing the Two Functions

The biggest pitfall is using the wrong function. Here is a guideline:

**Use `path_relative_to_include()` when you need a unique identifier** - state keys, resource names, tags. You are asking "what is this module's position in the hierarchy?"

```hcl
# Correct: unique state key
remote_state {
  config = {
    key = "${path_relative_to_include()}/terraform.tfstate"
  }
}
```

**Use `path_relative_from_include()` when you need a file path that resolves from the child's working directory back to the root** - variable files, scripts, shared configs. You are asking "how do I navigate from this child back to the root?"

```hcl
# Correct: loading a file from the root directory
terraform {
  extra_arguments "shared" {
    optional_var_files = ["${path_relative_from_include()}/shared.tfvars"]
  }
}
```

If you accidentally use `path_relative_to_include()` where you need a filesystem path, you will get something like `dev/vpc` instead of `../..`, and your file paths will not resolve.

## Debugging

You can check what the function resolves to by using `render-json`:

```bash
cd live/dev/vpc
terragrunt render-json | jq '.'
```

Or use a temporary local to print it:

```hcl
locals {
  debug_path_from = path_relative_from_include()
  debug_check = run_cmd("echo", "path_relative_from_include = ${local.debug_path_from}")
}
```

## Conclusion

`path_relative_from_include()` is the complement to `path_relative_to_include()`. While `path_relative_to_include()` gives you a unique module identifier (great for state keys and naming), `path_relative_from_include()` gives you a navigable path from the child back to the parent (great for referencing shared files, scripts, and configurations).

In most projects, you will use `path_relative_to_include()` far more often. But when you need the parent configuration to reference files relative to itself while those paths resolve from child modules, `path_relative_from_include()` is the right tool.
