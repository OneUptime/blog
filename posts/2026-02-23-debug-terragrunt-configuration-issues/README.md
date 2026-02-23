# How to Debug Terragrunt Configuration Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Debugging, Troubleshooting, Infrastructure as Code, DevOps

Description: A practical guide to debugging common Terragrunt configuration issues, covering log levels, render-json, dependency errors, and the most frequent mistakes teams encounter.

---

Terragrunt configuration errors can be frustrating because the tool sits between you and Terraform, and it's not always clear which layer is causing the problem. Is it a Terragrunt HCL parsing issue? A dependency resolution failure? A Terraform error that Terragrunt is surfacing? This guide walks through systematic debugging techniques and the most common issues you'll run into.

## Enable Debug Logging

The first thing to do when something goes wrong is increase the log level:

```bash
# Show debug-level output from Terragrunt
export TERRAGRUNT_LOG_LEVEL=debug
terragrunt plan

# Or pass it as a flag
terragrunt plan --terragrunt-log-level debug
```

Debug logging shows you exactly what Terragrunt is doing: which configuration files it's reading, how it resolves `find_in_parent_folders()`, what commands it's running, and how dependencies are resolved.

For even more detail:

```bash
# Trace level shows everything, including file contents
terragrunt plan --terragrunt-log-level trace
```

## Use render-json to Inspect Resolved Config

One of the most useful debugging commands is `render-json`, which shows the fully resolved Terragrunt configuration:

```bash
# Output the resolved config as JSON
terragrunt render-json

# Save to a file for easier reading
terragrunt render-json --terragrunt-json-out resolved-config.json
```

This shows you exactly what Terragrunt sees after processing all `include` blocks, `locals`, and function calls. It's the fastest way to check if your variables are being resolved correctly.

```json
{
  "terraform": {
    "source": "../../modules/vpc"
  },
  "inputs": {
    "vpc_cidr": "10.0.0.0/16",
    "environment": "dev",
    "region": "us-east-1"
  },
  "generate": {
    "backend": {
      "path": "backend.tf",
      "if_exists": "overwrite",
      "contents": "..."
    }
  }
}
```

## Common Error: "Could Not Find a terragrunt.hcl"

```
ERRO[0000] Could not find a terragrunt.hcl file
```

This means `find_in_parent_folders()` walked up the directory tree and didn't find a parent `terragrunt.hcl`. Common causes:

```hcl
# The include path might be wrong
include "root" {
  # This searches parent directories for terragrunt.hcl
  path = find_in_parent_folders()
}
```

Check that:
1. There's actually a `terragrunt.hcl` in a parent directory
2. You're running the command from the right directory
3. The file is named exactly `terragrunt.hcl` (not `terraform.hcl` or `Terragrunt.hcl`)

If you want `find_in_parent_folders()` to look for a specific filename:

```hcl
# Look for a specific file instead of the default terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}
```

## Common Error: Dependency Cycle

```
ERRO[0000] Found a dependency cycle between modules
```

This happens when module A depends on module B, and module B depends on module A (directly or transitively). To visualize the dependency graph:

```bash
# Print the dependency graph
terragrunt graph-dependencies

# Output as DOT format for visualization
terragrunt graph-dependencies | dot -Tpng -o deps.png
```

To fix cycles, you usually need to restructure your modules. A common pattern is extracting shared data into a separate module that both A and B depend on, instead of depending on each other.

## Common Error: "Error reading file"

```
ERRO[0000] Error reading file at path infrastructure/env.hcl
```

This typically happens with `read_terragrunt_config()`:

```hcl
locals {
  # This fails if env.hcl doesn't exist at the expected location
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}
```

Debug by checking what path is being resolved:

```bash
# Check from the module directory
terragrunt render-json 2>&1 | grep "env.hcl"

# Or manually trace the path
pwd
ls -la ../../env.hcl
```

To make this more resilient, provide a fallback:

```hcl
locals {
  # Use a default if the file doesn't exist
  env_vars = try(
    read_terragrunt_config(find_in_parent_folders("env.hcl")),
    { locals = { environment = "default" } }
  )
}
```

## Common Error: "Locals Block Not Allowed"

```
ERRO[0000] Error: Unsupported block type "locals"
```

This happens when you use Terraform syntax in a Terragrunt file or vice versa. Terragrunt uses `locals` (with an 's'), while Terraform uses `locals` too, but the syntax inside differs:

```hcl
# Terragrunt locals - this is correct
locals {
  environment = "dev"
  region      = "us-east-1"
}

# This would be wrong in terragrunt.hcl - it's Terraform syntax
variable "environment" {
  type    = string
  default = "dev"
}
```

Make sure you're editing the right file. Terragrunt's `terragrunt.hcl` and Terraform's `.tf` files have different syntaxes even though both use HCL.

## Debugging Generated Files

When using `generate` blocks, the generated files might not contain what you expect. Inspect them after running Terragrunt:

```bash
# Run a plan to trigger file generation
terragrunt plan

# Look at what was generated
ls -la .terragrunt-cache/*/
cat .terragrunt-cache/*/backend.tf
cat .terragrunt-cache/*/provider.tf
```

A common issue is string interpolation not working as expected:

```hcl
# Problem: Terraform-style interpolation in generate block
generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite"
  contents  = <<EOF
terraform {
  backend "s3" {
    # This won't work - var.region is a Terraform concept
    region = "${var.region}"

    # This works - local.region is a Terragrunt local
    region = "${local.aws_region}"
  }
}
EOF
}
```

## Debugging Dependency Outputs

When a dependency's outputs aren't what you expect:

```bash
# Check what outputs a dependency module produces
cd ../vpc
terragrunt output

# Check the dependency configuration
terragrunt render-json | jq '.dependencies'
```

If you're getting `null` outputs from dependencies, the dependency module might not have been applied yet. Use `mock_outputs` for plan-time safety:

```hcl
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id = "vpc-mock"
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]

  # This makes Terragrunt error if the dependency hasn't been applied
  # and you try to run apply (not just plan)
  skip_outputs = false
}
```

## Debugging run-all Issues

When `run-all` behaves unexpectedly, add these flags:

```bash
# Show which modules will be included
terragrunt run-all plan --terragrunt-log-level debug 2>&1 | grep "Module"

# See the execution order
terragrunt graph-dependencies

# Run one module at a time to isolate the problem
terragrunt run-all plan --terragrunt-parallelism 1
```

If a specific module fails in `run-all` but works on its own, it's likely a dependency issue. Check that dependent modules have been applied and their outputs match what the failing module expects.

## Debugging Include Blocks

Include blocks can be tricky, especially with multiple includes:

```hcl
# Multiple named includes
include "root" {
  path   = find_in_parent_folders()
  expose = true
}

include "env" {
  path   = find_in_parent_folders("env.hcl")
  expose = true
}
```

To check how includes are resolved:

```bash
# render-json shows the merged result
terragrunt render-json | jq '.include'

# Debug log shows the resolution order
terragrunt plan --terragrunt-log-level debug 2>&1 | grep -i "include"
```

Common include issues:
- Forgetting `expose = true` when you want to reference parent locals
- Path resolution differences between `find_in_parent_folders()` and relative paths
- Merge behavior conflicts between root and child configurations

## Using Terraform Debug Logs

Sometimes the issue is in Terraform, not Terragrunt. Enable Terraform's debug logging:

```bash
# Enable Terraform trace logging
export TF_LOG=TRACE
export TF_LOG_PATH=/tmp/terraform-debug.log

terragrunt plan

# Check the log
less /tmp/terraform-debug.log
```

This is useful for provider authentication issues, state access problems, and resource-level errors.

## The Nuclear Option: Clean Everything

When nothing else works, start fresh:

```bash
# Remove all Terragrunt caches
find . -type d -name ".terragrunt-cache" -exec rm -rf {} + 2>/dev/null

# Remove Terraform caches too
find . -type d -name ".terraform" -exec rm -rf {} + 2>/dev/null
find . -name ".terraform.lock.hcl" -delete 2>/dev/null

# Clear the plugin cache
rm -rf ~/.terraform.d/plugin-cache/*

# Now try again
terragrunt init
terragrunt plan
```

## Summary

Most Terragrunt debugging comes down to three things: checking the resolved configuration with `render-json`, enabling debug logging to see what's happening, and verifying that dependency outputs are what you expect. Start with the highest-level tool (render-json) and work your way down to trace logging only when needed. For performance-related issues, see our [caching and performance guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-caching-and-performance/view).
