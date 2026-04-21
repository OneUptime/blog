# How to Use TFLint with OpenTofu - With

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, TFLint, Linting, Infrastructure as Code, Code Quality, DevOps

Description: Learn how to configure and use TFLint with OpenTofu to enforce coding standards, detect invalid resource configurations, and improve infrastructure code quality.

## Introduction

TFLint is a pluggable linter for Terraform configuration files that can be used in OpenTofu workflows. While `tofu validate` checks syntax and internal consistency, TFLint goes further by checking for provider-specific errors, deprecated arguments, and enforcing custom rules - all before you run `tofu plan`.

## Installation

On macOS:

```bash
brew install tflint
```

On Linux using the install script:

```bash
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash
```

## Configuration File

Create `.tflint.hcl` in your project root:

```hcl
config {
  call_module_type = "local"
  force            = false
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

plugin "aws" {
  enabled = true
  version = "0.47.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
```

## Initializing Plugins

```bash
tflint --init
```

## Running TFLint

```bash
# Lint current directory

tflint

# Show compact output
tflint --format=compact

# Lint recursively across directories/modules
tflint --recursive
```

## What TFLint Catches

**Invalid resource arguments:**

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0ff8a91507f77f867"
  instance_type = "t1.2xlarge"    # Error: invalid instance type
}
```

**Deprecated syntax:**

```hcl
# Warning: Deprecated interpolation syntax
name = "${var.name}"   # Use: name = var.name
```

**Missing required tags (custom rule):**

```hcl
rule "aws_resource_missing_tags" {
  enabled = true
  tags    = ["Environment", "Team"]
}
```

## Ignoring Specific Rules

Per-file suppression with inline comments:

```hcl
resource "aws_instance" "legacy" {
  instance_type = "t1.micro"  # tflint-ignore: aws_instance_previous_type
}
```

Global disabling in `.tflint.hcl`:

```hcl
rule "aws_instance_previous_type" {
  enabled = false
}
```

## Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/tofuutils/pre-commit-opentofu
    rev: v2.3.0
    hooks:
      - id: tofu_tflint
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No issues found |
| 1 | Error running TFLint |
| 2 | Issues found |

```bash
tflint || echo "TFLint failed or found issues"
```

## Conclusion

TFLint is an essential complement to `tofu validate` and `tofu plan` for maintaining OpenTofu code quality. Its provider-aware rule sets catch real deployment errors before they happen, making it a worthwhile addition to any IaC development workflow.
