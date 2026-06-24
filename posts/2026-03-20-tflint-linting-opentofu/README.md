# How to Use tflint for Linting OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, TFLint, Linting, Code Quality, Infrastructure as Code, DevOps

Description: Learn how to use tflint to catch configuration errors, deprecated attributes, and provider-specific best practice violations in OpenTofu configurations before planning.

## Introduction

`tflint` complements `tofu validate` for Terraform-compatible OpenTofu configurations - while validate checks syntax, argument names and types, and internal consistency, tflint catches lint issues: deprecated syntax, invalid instance types, naming convention violations, and provider-specific configuration mistakes. It integrates with TFLint ruleset plugins to know what valid values look like.

## Installing tflint

```bash
# macOS

brew install tflint

# Linux
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

# Docker
docker run --rm -v "$(pwd):/data" -t ghcr.io/terraform-linters/tflint --version

# Verify local install
tflint --version
```

## Installing Ruleset Plugins

tflint's ruleset plugins enable provider-specific rule checking:

```bash
# Initialize tflint with configured ruleset plugins
tflint --init

# Or specify explicitly
tflint --init --config .tflint.hcl
```

## .tflint.hcl Configuration

```hcl
# .tflint.hcl
config {
  # Inspect all local and remote module calls
  call_module_type = "all"
  # Keep a non-zero exit status when issues are found
  force = false
}

# AWS provider rules
plugin "aws" {
  enabled    = true
  version    = "0.47.0"
  source     = "github.com/terraform-linters/tflint-ruleset-aws"
}

# Google provider rules
plugin "google" {
  enabled = true
  version = "0.39.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}

# Built-in rules
rule "terraform_deprecated_interpolation" {
  enabled = true
}

rule "terraform_naming_convention" {
  enabled = true

  variable {
    format = "snake_case"
  }

  resource {
    format = "snake_case"
  }
}

rule "terraform_required_version" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}
```

## Running tflint

```bash
# Lint the current directory
tflint

# Lint with specific config
tflint --config .tflint.hcl

# Lint each configuration directory recursively
tflint --recursive

# Fail only on errors (warnings and notices are still printed)
tflint --minimum-failure-severity=error

# Format output as JSON
tflint --format=json
```

## Common tflint Findings

```hcl
# VIOLATION: aws_instance_invalid_type
# Error: "t1.2xlarge" is an invalid value as instance_type
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t1.2xlarge"   # Invalid - use t3.nano
}

# FIX
resource "aws_instance" "web" {
  instance_type = "t3.nano"
}

# VIOLATION: terraform_naming_convention
# Error: Resource name "WebServer" must match snake_case format
resource "aws_instance" "WebServer" {}   # Should be "web_server"

# VIOLATION: terraform_documented_variables
# Error: Variable "db_password" does not have a description
variable "db_password" {
  type = string
  # Missing: description = "..."
}
```

## GitHub Actions Integration

```yaml
- name: tflint
  uses: reviewdog/action-tflint@v1.25.0
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    reporter: github-pr-review
    tflint_init: "true"
    flags: "--recursive --call-module-type=all"
    tflint_rulesets: "aws google"
```

## Pre-Commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.104.0
    hooks:
      - id: terraform_tflint
        args:
          - --args=--config=.tflint.hcl
          - --args=--call-module-type=all
```

## Conclusion

tflint catches issues that `tofu validate` misses - invalid cloud resource configurations, deprecated syntax, and naming convention violations. Install ruleset plugins to get provider-specific rule checking, configure naming convention rules to enforce your team's standards, and run tflint in pre-commit hooks and CI to prevent these issues from reaching code review.
