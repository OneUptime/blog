# How to Understand Variable Precedence in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Precedence, Infrastructure as Code, DevOps

Description: A comprehensive guide to understanding how OpenTofu resolves variable values when multiple sources provide the same variable.

## Introduction

When multiple sources provide values for the same variable, OpenTofu uses a defined precedence order to determine which value to use. Understanding this precedence prevents unexpected behavior and helps you design reliable variable management strategies.

## Precedence Order (Lowest to Highest)

```text
1. Default values (in variable blocks)           <- LOWEST
2. TF_VAR_ environment variables
3. terraform.tfvars
4. terraform.tfvars.json
5. *.auto.tfvars (lexical order)
6. *.auto.tfvars.json (lexical order)
7. -var and -var-file flags (in the order specified)  <- HIGHEST
```

Note: `-var` and `-var-file` share the same precedence level. They are processed in the order they appear on the command line, with later values overriding earlier ones for the same variable.

## Demonstration

```hcl
# variables.tf

variable "instance_count" {
  type    = number
  default = 1  # Level 1: Default
}
```

```hcl
# terraform.tfvars
instance_count = 2  # Level 2: Overrides default
```

```hcl
# common.auto.tfvars
instance_count = 3  # Level 5: Overrides terraform.tfvars
```

```bash
# The following overrides all file-based values:
tofu plan -var="instance_count=5"  # Level 7: Overrides auto.tfvars

# Check which value is used:
tofu console
> var.instance_count
# Output: 5
```

## Step-by-Step Precedence Example

```bash
# Setup:
# - default in variable block: 1
# - terraform.tfvars: 2
# - common.auto.tfvars: 3
# - -var-file="override.tfvars" (value=4): 4
# - -var="instance_count=5": 5
# - TF_VAR_instance_count=6: 6

# Without any TF_VAR or -var (auto.tfvars wins over terraform.tfvars):
unset TF_VAR_instance_count
tofu plan  # instance_count = 3 (common.auto.tfvars overrides terraform.tfvars)

# With TF_VAR set, but auto.tfvars is still present (auto.tfvars wins):
export TF_VAR_instance_count=6
tofu plan  # instance_count = 3 (auto.tfvars > terraform.tfvars > TF_VAR)

# With -var on the command line (-var beats all files and env vars):
tofu plan -var="instance_count=5"  # instance_count = 5 (-var > everything else)
```

## Multiple -var-file Loading Order

```bash
# When using multiple -var-file flags, later files override earlier ones
tofu apply \
  -var-file="base.tfvars" \
  -var-file="environment.tfvars" \
  -var="specific_override=value"
# Order of processing for overlapping variables:
# 1st: base.tfvars                (base values)
# 2nd: environment.tfvars         (overrides base.tfvars)
# 3rd: -var="specific_override"   (overrides both files)
```

## Auto.tfvars Alphabetical Loading

```hcl
# a-base.auto.tfvars
instance_type = "t3.micro"

# b-compute.auto.tfvars (loaded after a-base)
instance_type = "t3.small"  # Overrides a-base.auto.tfvars

# Result: instance_type = "t3.small"
```

## Practical Examples

```bash
# Development workflow - mostly defaults and terraform.tfvars
cd dev/
tofu plan  # Uses defaults + terraform.tfvars

# Staging override from CI/CD
tofu plan \
  -var-file="staging.tfvars" \
  -var="image_version=$BUILD_TAG"

# Production with secrets from environment
export TF_VAR_db_password="$(vault read -field=value secret/prod/db)"
tofu apply -var-file="prod.tfvars" -auto-approve
```

## Debugging Variable Values

```bash
# Check the effective value of variables
tofu console
> var.instance_count
> var.environment

# Or print in a plan
tofu plan
# Shows the computed values in the plan output
```

## Common Gotchas

```bash
# Gotcha 1: TF_VAR_ set from a previous session
export TF_VAR_environment="prod"
# Forgot it's set, now running in dev context!
# If terraform.tfvars or *.auto.tfvars does NOT set `environment`,
# TF_VAR_environment will win over the default and leak into dev.
tofu plan

# Fix: Always unset TF_VAR_ when switching contexts
unset TF_VAR_environment

# Gotcha 2: -var and -var-file are processed in the order given
# They share the same precedence level; the LAST occurrence wins.
tofu plan -var="count=5" -var-file="values.tfvars"
# If values.tfvars has count=10, count=10 wins (it's last on the line)

tofu plan -var-file="values.tfvars" -var="count=5"
# Here count=5 wins, because -var appears after -var-file
```

## Conclusion

Understanding variable precedence is crucial for predictable OpenTofu behavior. The key insight is that more explicit sources (like `-var` flags) override less explicit ones (like file-based defaults), creating a clear hierarchy from most general (defaults) to most specific (command-line flags). Design your variable strategy by placing commonly shared values in `terraform.tfvars` and using `-var` flags or `TF_VAR_` variables only for environment-specific or sensitive overrides.
