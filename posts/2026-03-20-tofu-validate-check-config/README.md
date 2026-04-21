# How to Use tofu validate to Check Configuration - Tofu Check Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu validate to check your OpenTofu configuration for syntax errors and logical inconsistencies without accessing any remote services.

## Introduction

`tofu validate` checks your OpenTofu configuration files for syntax errors, type mismatches, and invalid references - all without accessing the state backend or any cloud APIs. It's fast, offline, and should be a standard step in your development workflow and CI/CD pipelines.

## Basic Usage

```bash
# Validate configuration in the current directory

tofu validate

# Success output:
# Success! The configuration is valid.

# Failure output:
# Error: Unsupported argument
#
#   on main.tf line 12, in resource "aws_instance" "web":
#   12:     instance_tupe = "t3.micro"
#
# An argument named "instance_tupe" is not expected here.
# Did you mean "instance_type"?
```

## What tofu validate Checks

- **Syntax**: Valid HCL syntax
- **References**: Variables, locals, and resources referenced correctly
- **Provider schema**: Resource arguments match the provider's schema
- **Required arguments**: All required arguments are present
- **Type mismatches**: Argument values and variable defaults match expected types

## What tofu validate Does NOT Check

- Whether resources already exist
- Whether credentials are valid
- Whether API calls will succeed
- Runtime errors (e.g., a resource that can't be created due to quota)

## JSON Output for CI/CD

```bash
# Machine-readable JSON output
tofu validate -json

# Example success output:
# {
#   "format_version": "1.0",
#   "valid": true,
#   "error_count": 0,
#   "warning_count": 0,
#   "diagnostics": []
# }

# Example failure output:
# {
#   "format_version": "1.0",
#   "valid": false,
#   "error_count": 1,
#   "warning_count": 0,
#   "diagnostics": [
#     {
#       "severity": "error",
#       "summary": "Unsupported argument",
#       "detail": "An argument named \"instance_tupe\" is not expected here.",
#       "range": {
#         "filename": "main.tf",
#         "start": { "line": 12, "column": 5 },
#         "end": { "line": 12, "column": 22 }
#       }
#     }
#   ]
# }
```

## Using in CI/CD

```yaml
# GitHub Actions
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: Init (needed for provider schema validation)
        run: tofu init -backend=false

      - name: Validate
        run: tofu validate -json | tee validate_output.json

      - name: Check Result
        run: |
          if [ "$(jq '.valid' validate_output.json)" != "true" ]; then
            echo "Validation failed:"
            jq '.diagnostics' validate_output.json
            exit 1
          fi
```

## Validating Before Plan

```bash
# Always validate before planning
tofu validate && tofu plan

# Or in a pipeline
set -e
tofu validate
tofu plan -out=tfplan
tofu apply tfplan
```

## Common Validation Errors

### Missing Required Argument

```hcl
# Missing required argument
resource "aws_instance" "web" {
  # ami is required here because no launch_template is configured
  instance_type = "t3.micro"
}
```

```text
Error: Missing required argument
  "ami": one of `ami,launch_template` must be specified
```

### Invalid Reference

```hcl
resource "aws_security_group" "app" {
  vpc_id = aws_vpc.typo_here.id  # Wrong resource name
}
```

```text
Error: Reference to undeclared resource
  A managed resource "aws_vpc" "typo_here" has not been declared.
```

### Type Mismatch

```hcl
resource "aws_instance" "web" {
  ami           = "ami-1234567890abcdef0"
  instance_type = "t3.micro"
  count         = "not-a-number"  # String where number expected
}
```

## Validate a Specific Directory

```bash
# Validate after changing to a specific directory
cd /path/to/module/ && tofu validate

# Validate with chdir
tofu -chdir=/path/to/config validate
```

## Integration with Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.105.0
    hooks:
      - id: terraform_validate
        args:
          - --hook-config=--tf-path=tofu
```

## Conclusion

`tofu validate` is an essential early check in your development and CI/CD workflow. It catches syntax and schema errors before you attempt a plan, saving time by not spinning up backend connections for clearly invalid configs. Combine it with `tofu fmt` for formatting checks to create a comprehensive configuration validation step in your pipelines.
