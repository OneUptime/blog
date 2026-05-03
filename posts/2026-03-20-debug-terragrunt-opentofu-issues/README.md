# How to Debug Terragrunt with OpenTofu Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Debugging, Troubleshooting, Logging

Description: Learn how to diagnose and fix common Terragrunt issues with OpenTofu using log levels, render-json, validate-inputs, and targeted debugging techniques.

## Introduction

Terragrunt issues typically fall into three categories: configuration parsing errors, dependency resolution failures, and OpenTofu execution problems. The right debugging technique depends on which layer the problem is in.

## Enabling Debug Logging

```bash
# Enable debug logging for verbose output

terragrunt apply --terragrunt-log-level debug

# Even more verbose trace logging
terragrunt apply --terragrunt-log-level trace

# Redirect debug output to a file
terragrunt apply --terragrunt-log-level debug 2>&1 | tee /tmp/terragrunt-debug.log
```

## Rendering Configuration for Inspection

```bash
# Render the final merged terragrunt.hcl as JSON
# Shows what the resolved configuration looks like after all includes and locals
terragrunt render-json --terragrunt-json-out rendered.json
cat rendered.json | jq .

# View the rendered inputs that will be passed to OpenTofu
cat rendered.json | jq '.inputs'

# View the rendered remote_state configuration
cat rendered.json | jq '.remote_state'
```

## Validating inputs

```bash
# Check that all inputs match the module's variables
terragrunt validate-inputs

# This reports:
# - Inputs in terragrunt.hcl that don't have corresponding variables
# - Required variables that are missing from inputs
```

## Debugging Dependency Issues

```bash
# Show the dependency graph without running anything
terragrunt graph-dependencies

# Test that a dependency's outputs are readable
cd environments/prod/services/api
terragrunt output  # from the dependency's directory first

# Run with --terragrunt-fetch-dependency-output-from-state
# to read outputs from state instead of running apply
terragrunt plan --terragrunt-fetch-dependency-output-from-state
```

## Common Error: "Error finding parent folders"

```bash
# Error: Could not find a terragrunt.hcl file in any parent folder
# Solution: Ensure the root terragrunt.hcl exists and has no include block

# Check the directory structure
find . -name "terragrunt.hcl" | head -20

# Verify the root file doesn't accidentally include another file
cat terragrunt.hcl
```

## Common Error: "Error reading file"

```hcl
# Error: Error in function call: invalid character in function arguments
# This often means a variable interpolation issue in heredoc

# Wrong - variable in heredoc not interpolated
generate "provider" {
  contents = <<EOF
region = "${local.region}"  # This fails if local.region is undefined
EOF
}

# Fix - ensure local is defined before use
locals {
  region = read_terragrunt_config(find_in_parent_folders("env.hcl")).locals.aws_region
}
```

## Debugging Mock Outputs

```bash
# Error: Mock outputs are being used when they shouldn't be
# Check which commands allow mock outputs

dependency "networking" {
  config_path = "../networking"
  mock_outputs = {
    vpc_id = "vpc-mock"
  }
  # Only use mocks for plan and validate, NOT apply
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
  mock_outputs_merge_strategy_with_state  = "shallow"
}
```

## Debugging with terragrunt-no-auto-init

```bash
# Prevent auto-init to see the raw OpenTofu error without init output noise
terragrunt apply --terragrunt-no-auto-init

# Or manually run init first
terragrunt init --terragrunt-log-level debug
terragrunt apply
```

## Isolating OpenTofu vs Terragrunt Issues

```bash
# Check if the issue is in OpenTofu by running it directly
# First, let Terragrunt generate the files
terragrunt init

# Then run OpenTofu directly on the generated code
cd .terragrunt-cache/[hash]/[module]
tofu plan -var-file=/tmp/terragrunt-[hash].auto.tfvars

# If tofu works directly but terragrunt doesn't, the issue is in terragrunt config
```

## Inspecting the .terragrunt-cache

```bash
# Terragrunt caches module source code here
ls -la .terragrunt-cache/

# Each subdirectory contains a copy of the module with generated files
ls -la .terragrunt-cache/[hash]/[module]/
# You should see: backend.tf, provider.tf (from generate blocks), plus module files

# Clear the cache if stale
terragrunt apply --terragrunt-source-update
# or manually
rm -rf .terragrunt-cache
```

## Debugging run-all Issues

```bash
# Show what modules would be run and in what order
terragrunt run-all plan --terragrunt-working-dir environments/prod \
  2>&1 | grep -E "Module|Running|Skipping"

# Run with increased verbosity for run-all
terragrunt run-all apply \
  --terragrunt-log-level debug \
  --terragrunt-parallelism 1  # Sequential makes logs easier to read
```

## Conclusion

Start debugging Terragrunt issues with `--terragrunt-log-level debug` and `render-json` to understand what configuration Terragrunt is actually using. Use `validate-inputs` to catch variable mismatches early, and isolate whether errors are in Terragrunt's configuration layer or in OpenTofu itself by running `tofu` directly against the `.terragrunt-cache` directory.
