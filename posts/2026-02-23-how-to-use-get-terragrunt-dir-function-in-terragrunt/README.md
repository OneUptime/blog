# How to Use the get_terragrunt_dir Function in Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Functions, Path Resolution

Description: Learn how to use get_terragrunt_dir in Terragrunt to resolve file paths relative to the current configuration file for loading configs, scripts, and local modules.

---

The `get_terragrunt_dir()` function returns the absolute path to the directory containing the current `terragrunt.hcl` file. It sounds simple, and it is - but it is one of the most frequently used functions in Terragrunt because reliable path resolution is critical when you are reading files, referencing local modules, or running scripts.

## Basic Usage

```hcl
# live/dev/app/terragrunt.hcl

locals {
  # Returns something like: /home/user/project/live/dev/app
  current_dir = get_terragrunt_dir()
}

terraform {
  # Reference a module relative to this file
  source = "${get_terragrunt_dir()}/../../../modules/app"
}
```

The function always returns an absolute path, which means you never have to worry about where the command was invoked from. Whether you run `terragrunt plan` from the module directory or from the project root, `get_terragrunt_dir()` returns the same value.

## Reading Local Files

One of the most common uses is reading configuration files that sit alongside the `terragrunt.hcl`:

```hcl
# live/dev/app/terragrunt.hcl

locals {
  # Read a JSON config file from the same directory
  app_config = jsondecode(file("${get_terragrunt_dir()}/config.json"))

  # Read a YAML file
  overrides = yamldecode(file("${get_terragrunt_dir()}/overrides.yaml"))
}

terraform {
  source = "../../../modules/app"
}

inputs = {
  app_port     = local.app_config.port
  app_replicas = local.app_config.replicas
  log_level    = local.overrides.log_level
}
```

With this directory structure:

```
live/dev/app/
  terragrunt.hcl
  config.json        # {"port": 8080, "replicas": 2}
  overrides.yaml     # log_level: "info"
```

Each module directory can have its own config files, and `get_terragrunt_dir()` ensures they are always found correctly.

## Loading Variable Files

Use `get_terragrunt_dir()` in `extra_arguments` to load `.tfvars` files from the module directory:

```hcl
# Root terragrunt.hcl

terraform {
  extra_arguments "module_vars" {
    commands = ["plan", "apply", "destroy"]

    # Load a tfvars file from each child module's directory if it exists
    optional_var_files = [
      "${get_terragrunt_dir()}/terraform.tfvars",
      "${get_terragrunt_dir()}/secrets.tfvars",
    ]
  }
}
```

Wait - there is an important subtlety here. When `get_terragrunt_dir()` is used in a root config that gets included by children, it returns the root directory, not the child's directory. For that, you need `get_original_terragrunt_dir()`. Let me explain.

## get_terragrunt_dir vs get_original_terragrunt_dir

This distinction trips people up. Here is the difference:

- **get_terragrunt_dir()**: Returns the directory of the file currently being processed
- **get_original_terragrunt_dir()**: Returns the directory of the child config that started the include chain

Example setup:

```
live/
  terragrunt.hcl              # root config
  dev/
    app/
      terragrunt.hcl          # child config
      config.json              # module-specific config
```

```hcl
# live/terragrunt.hcl (root)

locals {
  # When this root config is processed as part of the child include:
  root_dir  = get_terragrunt_dir()              # /project/live
  child_dir = get_original_terragrunt_dir()     # /project/live/dev/app
}
```

```hcl
# live/dev/app/terragrunt.hcl (child)

include "root" {
  path = find_in_parent_folders()
}

locals {
  # When this child config is processed:
  my_dir = get_terragrunt_dir()  # /project/live/dev/app
}
```

So if you want the root config to read a file from the child's directory, use `get_original_terragrunt_dir()`:

```hcl
# live/terragrunt.hcl (root)

terraform {
  extra_arguments "module_vars" {
    commands = ["plan", "apply", "destroy"]
    optional_var_files = [
      # Use get_original_terragrunt_dir to reference the CHILD's directory
      "${get_original_terragrunt_dir()}/terraform.tfvars",
    ]
  }
}
```

## Practical Examples

### Module Source Paths

```hcl
# live/dev/vpc/terragrunt.hcl

terraform {
  # Absolute path to the module, resolved from this file's location
  source = "${get_terragrunt_dir()}/../../../modules/vpc"
}
```

This is equivalent to using a relative path `../../../modules/vpc`, but the absolute version is more explicit and easier to debug.

### Reading Environment-Specific Configs

```hcl
# live/dev/app/terragrunt.hcl

locals {
  # Read config from this module's directory
  module_config = jsondecode(file("${get_terragrunt_dir()}/config.json"))

  # Read config from the parent (environment) directory
  env_config = jsondecode(file("${get_terragrunt_dir()}/../env-config.json"))
}

inputs = {
  app_port    = local.module_config.port
  environment = local.env_config.environment
}
```

### Conditional File Loading

```hcl
locals {
  # Check if an optional config file exists
  config_path   = "${get_terragrunt_dir()}/extra-config.json"
  has_config    = fileexists(local.config_path)
  extra_config  = local.has_config ? jsondecode(file(local.config_path)) : {}
}

inputs = merge(
  {
    app_name = "my-app"
    app_port = 8080
  },
  local.extra_config
)
```

### Script Execution

```hcl
terraform {
  source = "../../../modules/app"

  # Run a validation script from the module directory
  before_hook "validate_config" {
    commands = ["plan"]
    execute  = ["python3", "${get_terragrunt_dir()}/validate-config.py"]
  }
}
```

### Generating Files with Dynamic Paths

```hcl
locals {
  module_name = basename(get_terragrunt_dir())  # extracts "app" from /project/live/dev/app
}

generate "locals" {
  path      = "generated_locals.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
locals {
  module_name = "${local.module_name}"
}
EOF
}
```

## Using in Root Configuration

When `get_terragrunt_dir()` is used in the root configuration, it returns the root's directory. This is useful for referencing files that live alongside the root config:

```hcl
# live/terragrunt.hcl (root)

locals {
  # Read a project-wide config from the root directory
  project_config = yamldecode(file("${get_terragrunt_dir()}/project.yaml"))
  project_name   = local.project_config.name
  team           = local.project_config.team
}

inputs = {
  project = local.project_name
  team    = local.team
}
```

```yaml
# live/project.yaml
name: my-project
team: platform-engineering
cost_center: ENG-001
```

## Comparison with Other Path Functions

Here is how `get_terragrunt_dir()` compares to other path-related functions:

| Function | Returns (when child includes root) |
|---|---|
| `get_terragrunt_dir()` | Directory of the file being evaluated |
| `get_original_terragrunt_dir()` | Directory of the child that started the chain |
| `get_parent_terragrunt_dir()` | Directory of the parent (included) config |
| `get_repo_root()` | Git repository root directory |
| `path_relative_to_include()` | Relative path from parent to child |

Most of the time in child configurations, `get_terragrunt_dir()` is all you need because you are referencing files relative to the child. In root configurations that are included by children, think carefully about whether you want the root's directory or the child's directory.

## Debugging

Print the value to verify:

```bash
# Render the configuration and check paths
cd live/dev/app
terragrunt render-json | jq '.locals'
```

Or use a temporary output:

```hcl
locals {
  debug = run_cmd("echo", "get_terragrunt_dir = ${get_terragrunt_dir()}")
}
```

## Common Pitfall

A frequent mistake is using `get_terragrunt_dir()` in a root config and expecting it to return the child's directory:

```hcl
# live/terragrunt.hcl (root) - WRONG
terraform {
  extra_arguments "vars" {
    commands = ["plan", "apply"]
    optional_var_files = [
      # This resolves to /project/live/terraform.tfvars (root dir)
      # NOT /project/live/dev/app/terraform.tfvars (child dir)
      "${get_terragrunt_dir()}/terraform.tfvars",
    ]
  }
}
```

Use `get_original_terragrunt_dir()` instead:

```hcl
# live/terragrunt.hcl (root) - CORRECT
terraform {
  extra_arguments "vars" {
    commands = ["plan", "apply"]
    optional_var_files = [
      # This resolves to the child module's directory
      "${get_original_terragrunt_dir()}/terraform.tfvars",
    ]
  }
}
```

## Conclusion

`get_terragrunt_dir()` is a utility function you will reach for constantly. It gives you a reliable, absolute path to work with when reading files, referencing modules, or running scripts. The key thing to remember is that in included (parent) configurations, it returns the parent's directory - use `get_original_terragrunt_dir()` if you need the child's directory instead.

For more path-related functions, see [How to Use Terragrunt Functions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-functions/view).
