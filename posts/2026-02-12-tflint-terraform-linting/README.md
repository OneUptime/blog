# How to Use TFLint for Terraform Linting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Linting, DevOps

Description: Set up TFLint to catch errors, enforce best practices, and validate AWS-specific Terraform configurations before they cause problems.

---

Terraform's built-in `validate` command checks syntax, but it doesn't catch a lot of common mistakes. Using an invalid instance type? It won't tell you until apply time. Referencing an AMI that doesn't exist in your region? TFLint can catch that too when AWS deep checking is enabled. TFLint fills that gap by catching AWS-specific errors and enforcing best practices at lint time.

TFLint is a pluggable linter with deep AWS knowledge. It validates resource configurations against provider-specific rules, and with deep checking it can use AWS credentials to check resources that require AWS API reads.

## Installation

TFLint has straightforward installation on macOS and Linux:

```bash
# macOS with Homebrew

brew install terraform-linters/tap/tflint

# Linux - download the latest release
curl -sSLO https://github.com/terraform-linters/tflint/releases/latest/download/tflint_linux_amd64.zip
unzip tflint_linux_amd64.zip
sudo install -c -v tflint /usr/local/bin/

# Verify installation
tflint --version
```

For Docker users:

```bash
# Run TFLint in Docker
docker run --rm -v $(pwd):/data -t ghcr.io/terraform-linters/tflint

# Initialize plugins and run TFLint in Docker
docker run --rm -v $(pwd):/data -t --entrypoint /bin/sh ghcr.io/terraform-linters/tflint -c "tflint --init && tflint"
```

## Configuration

TFLint uses a `.tflint.hcl` configuration file. Here's a solid starting point for AWS projects:

```hcl
# .tflint.hcl
config {
  # Enable local and remote module inspection
  call_module_type = "all"

  # Return non-zero when issues are found
  force = false
}

# AWS provider plugin
plugin "aws" {
  enabled = true
  version = "0.47.0"
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
tflint --chdir=./terraform/modules/vpc

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

Same goes for invalid security group rule protocols:

```hcl
# TFLint catches invalid security group rule protocols
resource "aws_security_group_rule" "example" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcpx"  # Typo - TFLint catches this
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = "sg-0123456789abcdef0"
}
```

And previous generation instance types:

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
      - '**/*.tf'
      - '.tflint.hcl'

jobs:
  tflint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup TFLint
        uses: terraform-linters/setup-tflint@v6
        with:
          tflint_version: v0.62.1

      - name: Init TFLint
        run: tflint --init
        env:
          GITHUB_TOKEN: ${{ github.token }}

      - name: Run TFLint
        run: tflint --format compact --recursive
```

The `--recursive` flag scans all subdirectories, which is handy for monorepos with multiple Terraform configurations.

## Pre-commit Integration

Catching lint issues before they even reach CI saves time. Add TFLint to your pre-commit hooks:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.106.0
    hooks:
      - id: terraform_tflint
```

```bash
# Install the hook
pre-commit install

# Run manually against all files
pre-commit run terraform_tflint --all-files
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

TFLint can inspect Terraform module calls. By default it calls local modules, and you can enable remote module calls with `call_module_type`:

```hcl
# .tflint.hcl
config {
  call_module_type = "all"
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

For security scanning specifics, check out [using Checkov for Terraform security scanning](https://oneuptime.com/blog/post/2026-02-12-checkov-terraform-security-scanning/view).

## Troubleshooting

**"Plugin not found"** - Run `tflint --init` to download plugins. This is needed after changing the config file.

**"Failed to check ruleset"** - The GitHub API rate limit might be hit during plugin download. Set `GITHUB_TOKEN` to increase the limit.

**Module scanning errors** - If modules reference remote sources and `call_module_type = "all"` is enabled, make sure `terraform init` has been run first so modules are downloaded.

## Summary

TFLint catches a useful class of errors that Terraform's built-in validation does not. Invalid instance types, deprecated configurations, and naming convention violations are exactly the kind of things that slip through code review but cause problems at apply time. Setting it up takes five minutes, and it saves you from countless failed deployments.
