# How to Use tofu plan to Preview Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu plan to preview what changes OpenTofu will make to your infrastructure before applying them.

## Introduction

`tofu plan` shows a preview of what OpenTofu will create, update, or destroy when you run `tofu apply`. It reads the current state, compares it with the desired configuration, and displays a diff. No changes are made to infrastructure during a plan. Running `tofu plan` before every `apply` is a fundamental safety practice.

## Basic Usage

```bash
tofu plan

# Output:

# OpenTofu will perform the following actions:
#
#   # aws_s3_bucket.data will be created
#   + resource "aws_s3_bucket" "data" {
#       + bucket = "acme-data-production"
#       ...
#     }
#
# Plan: 1 to add, 0 to change, 0 to destroy.
```

## Reading the Plan Output

Symbols in plan output:

| Symbol | Meaning |
|--------|---------|
| `+` | Resource will be created |
| `-` | Resource will be destroyed |
| `~` | Resource will be updated in-place |
| `-/+` | Resource will be replaced (destroy then create) |
| `<=` | Data source will be read |

## Planning with Variables

```bash
tofu plan -var="environment=production"
tofu plan -var-file=environments/production.tfvars
```

## Saving a Plan File

```bash
# Save the plan to a file
tofu plan -out=tfplan

# Apply the exact saved plan later
tofu apply tfplan
```

Saved plans guarantee that exactly what was previewed is what gets applied - no drift between plan and apply.

## Targeted Plan

```bash
# Plan only specific resources
tofu plan -target=aws_s3_bucket.data
tofu plan -target=module.networking
```

## Detailed Plan Output

```bash
# Return a granular exit code based on the plan result
tofu plan -detailed-exitcode

# Exit codes:
# 0 = no changes
# 1 = error
# 2 = changes present (useful in CI/CD)
```

```bash
# CI/CD: check if changes exist
tofu plan -detailed-exitcode
EXIT_CODE=$?

if [ $EXIT_CODE -eq 2 ]; then
  echo "Changes detected - proceeding to apply"
elif [ $EXIT_CODE -eq 0 ]; then
  echo "No changes - nothing to apply"
fi
```

## JSON Plan Output

```bash
# Machine-readable plan
tofu plan -out=tfplan
tofu show -json tfplan | jq '.resource_changes[] | {action: .change.actions, address: .address}'
```

## Plan with Refresh Disabled

```bash
# Skip refreshing state (faster for large configurations)
tofu plan -refresh=false
```

## Plan with Destroy

```bash
# Preview what destroy would delete
tofu plan -destroy
```

## Reading Sensitive Values in Plan

```bash
# Sensitive values are masked in output
# resource "aws_secretsmanager_secret_version" "db" {
#   secret_string = (sensitive value)
# }
```

## CI/CD Integration

```bash
# Standard CI/CD plan pattern
tofu init -input=false
tofu plan \
  -input=false \
  -out=tfplan \
  -var-file=environments/$ENVIRONMENT.tfvars

# Store tfplan as artifact, then in a separate apply step:
tofu apply tfplan
```

## Conclusion

`tofu plan` is a read-only operation that shows exactly what will change. Always run it before applying. Use `-out=tfplan` to save the plan and guarantee the apply matches the preview. Use `-detailed-exitcode` in CI/CD scripts to detect when changes are present. The plan output's `+`, `-`, `~`, and `-/+` symbols immediately communicate the nature and risk of each change.
