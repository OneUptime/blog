# How to Use TFLint for Terraform Linting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Linting, DevOps

Description: Set up TFLint to catch errors, enforce best practices, and validate AWS-specific Terraform configurations before they cause problems.

---

Terraform's built-in `validate` command checks syntax, but it doesn't catch a lot of common mistakes. Using an invalid instance type? It won't tell you until apply time. Referencing an AMI that doesn't exist in your region? Same deal. TFLint fills that gap by catching AWS-specific errors and enforcing best practices at lint time.

TFLint is a pluggable linter with deep AWS knowledge. It validates resource configurations against the actual AWS API constraints, something Terraform's validation can't do on its own.

## Installation

TFLint has straightforward installation on all major platforms:

```bash
# macOS with Homebrew
brew install tflint

# Linux - using the install script
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

# Verify installation
tflint --version
```

For Docker users:

```bash
# Run TFLint in Docker
docker run --rm -v $(pwd):/data -t ghcr.io/terraform-linters/tflint
```

## Configuration

TFLint uses a `.tflint.hcl` configuration file. Here's a solid starting point for AWS projects:

```hcl
# .tflint.hcl
config {
  # Enable module inspection
  module = true

  # Treat warnings as errors in CI
  force = false
}

# AWS provider plugin
plugin "aws" {
  enabled = true
  version = "0.30.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# Terraform language rules
plugin "terraform" {
  enabled = true
  preset  = "recommended"
}
```

Install the plugins after creating the config:

```bash
# Download and install configured plugins
tflint --init
```

## Running TFLint

Basic usage is simple:

```bash
# Lint the current directory
tflint

# Lint a specific directory
tflint ./terraform/modules/vpc

# Output as JSON for CI processing
tflint --format json
```

## What TFLint Catches

TFLint's AWS ruleset catches errors that Terraform validate misses entirely. Here are some practical examples.

Invalid instance types get flagged immediately:

```hcl
# This will be caught by TFLint - t3.huuge isn't a real instance type
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.huuge"  # TFLint error: invalid instance type
}
```

Same goes for invalid IAM policy actions:

```hcl
# TFLint catches typos in IAM actions
resource "aws_iam_policy" "example" {
  name = "example"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:GetObejct"  # Typo - TFLint catches this
      Resource = "*"
    }]
  })
}
```

And referencing nonexistent attributes:

```hcl
# Previous generation instance type - TFLint can warn about this
resource "aws_instance" "legacy" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t1.micro"  # TFLint warning: previous generation
}
```

## Enabling and Disabling Rules

Control which rules run using your config file or inline annotations.

Disable a rule globally in the config:

```hcl
# .tflint.hcl
rule "aws_instance_previous_type" {
  enabled = false
}

rule "terraform_naming_convention" {
  enabled = true

  # Custom naming format
  format = "snake_case"
}
```

Disable a rule for a specific block using comments:

```hcl
# tflint-ignore: aws_instance_previous_type
resource "aws_instance" "legacy" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t1.micro"  # Intentionally using older type
}
```

## Custom Rules

TFLint lets you write custom rules for your organization. The Terraform plugin includes useful built-in rules for code conventions:

```hcl
# .tflint.hcl - Enforce naming conventions
rule "terraform_naming_convention" {
  enabled = true

  variable {
    format = "snake_case"
  }

  resource {
    format = "snake_case"
  }

  module {
    format = "snake_case"
  }
}

# Require descriptions on variables
rule "terraform_documented_variables" {
  enabled = true
}

# Require descriptions on outputs
rule "terraform_documented_outputs" {
  enabled = true
}

# Require type declarations on variables
rule "terraform_typed_variables" {
  enabled = true
}
```

## CI/CD Integration

Here's a GitHub Actions workflow for TFLint:

```yaml
# .github/workflows/tflint.yml
name: TFLint

on:
  pull_request:
    paths:
      - '**.tf'
      - '.tflint.hcl'

jobs:
  tflint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup TFLint
        uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: v0.50.0

      - name: Init TFLint
        run: tflint --init
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run TFLint
        run: tflint --format compact --recursive
```

The `--recursive` flag scans all subdirectories, which is handy for monorepos with multiple Terraform configurations.

## Pre-commit Integration

Catching lint issues before they even reach CI saves time. Add TFLint to your pre-commit hooks:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/terraform-linters/tflint
    rev: v0.50.0
    hooks:
      - id: tflint
        args: ['--recursive']
```

```bash
# Install the hook
pre-commit install

# Run manually against all files
pre-commit run tflint --all-files
```

## TFLint vs Terraform Validate

It's worth understanding what each tool catches. They're complementary, not replacements:

**Terraform validate catches:**
- Syntax errors
- Invalid block types
- Missing required arguments
- Type mismatches in variables

**TFLint additionally catches:**
- Invalid AWS resource attribute values (instance types, regions, etc.)
- Deprecated resource configurations
- Naming convention violations
- Missing variable descriptions
- AWS-specific best practice violations

Use both in your pipeline. `terraform validate` first, then TFLint:

```bash
# Run both checks in sequence
terraform validate && tflint
```

## Scanning Modules

TFLint can inspect Terraform modules when the `module` option is enabled:

```hcl
# .tflint.hcl
config {
  module = true
}
```

For modules with variables, you might need to provide variable values:

```bash
# Pass variables for module scanning
tflint --var="instance_type=t3.micro" --var="region=us-east-1"

# Or use a var file
tflint --var-file="terraform.tfvars"
```

## Combining with Other Tools

TFLint works best as part of a broader Terraform validation pipeline. A typical setup runs:

1. `terraform fmt` - formatting check
2. `terraform validate` - syntax and type checks
3. `tflint` - AWS-specific linting
4. `checkov` - security scanning
5. `terraform plan` - actual plan review

Here's a combined script:

```bash
#!/bin/bash
# validate.sh - Full Terraform validation pipeline

set -e

echo "Checking formatting..."
terraform fmt -check -recursive

echo "Running validate..."
terraform validate

echo "Running TFLint..."
tflint --recursive

echo "Running Checkov..."
checkov -d .

echo "All checks passed."
```

For security scanning specifics, check out [using Checkov for Terraform security scanning](https://oneuptime.com/blog/post/checkov-terraform-security-scanning/view).

## Troubleshooting

**"Plugin not found"** - Run `tflint --init` to download plugins. This is needed after changing the config file.

**"Failed to check ruleset"** - The GitHub API rate limit might be hit during plugin download. Set `GITHUB_TOKEN` to increase the limit.

**Module scanning errors** - If modules reference remote sources, make sure `terraform init` has been run first so modules are downloaded.

## Summary

TFLint catches a class of errors that no other tool in the Terraform ecosystem handles. Invalid instance types, deprecated configurations, and naming convention violations are exactly the kind of things that slip through code review but cause problems at apply time. Setting it up takes five minutes, and it saves you from countless failed deployments.
