# How to Use Terradocs to Generate Documentation for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Documentation, Infrastructure as Code, IaC, Automation, Developer Experience

Description: Learn how to use terraform-docs to automatically generate documentation from OpenTofu module inputs and outputs.

## Introduction

Learn how to use terraform-docs to automatically generate documentation from OpenTofu module inputs and outputs. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow. For full generated inputs, outputs, providers, and resources, keep module code in `.tf` files; terraform-docs has only limited support for parsing `.tofu` files.

## Prerequisites

- OpenTofu v1.6+ installed
- terraform-docs v0.22.0 installed
- Basic knowledge of OpenTofu concepts
- An OpenTofu module with documented variables and outputs

## Step 1: Set Up the Environment

```bash
# Install terraform-docs if it is not already installed
TERRAFORM_DOCS_VERSION=0.22.0
OS="$(uname | tr '[:upper:]' '[:lower:]')"
curl -sSLo terraform-docs.tar.gz "https://terraform-docs.io/dl/v${TERRAFORM_DOCS_VERSION}/terraform-docs-v${TERRAFORM_DOCS_VERSION}-${OS}-amd64.tar.gz"
tar -xzf terraform-docs.tar.gz
chmod +x terraform-docs
sudo mv terraform-docs /usr/local/bin/terraform-docs

# Verify OpenTofu and terraform-docs are available
tofu version
terraform-docs --help

# Configure non-interactive OpenTofu output for automation
export TF_INPUT=false
export TF_IN_AUTOMATION=true
```

## Step 2: Configure Your OpenTofu Project

```hcl
# main.tf
terraform {
  required_version = ">= 1.6.0"
}

locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "OpenTofu"
    Owner       = var.team_email
  }
}

# variables.tf
variable "project" {
  description = "Short project name used in generated resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "team_email" {
  description = "Team email address used for ownership tags."
  type        = string
}

# outputs.tf
output "name_prefix" {
  description = "Computed prefix shared by resources in this module."
  value       = local.name_prefix
}

output "common_tags" {
  description = "Common tags applied by this module."
  value       = local.common_tags
}
```

```markdown
# README.md
# Example OpenTofu Module

<!-- BEGIN_TF_DOCS -->
<!-- END_TF_DOCS -->
```

## Step 3: Implement the Core Feature

```bash
# Initialize without configuring a backend for reusable module validation
tofu init -backend=false

# Validate the module's OpenTofu syntax
tofu validate

# Generate or update the README documentation
terraform-docs markdown table --output-file README.md --output-mode inject .

# Check whether the generated README content is current
terraform-docs markdown table --output-file README.md --output-mode inject --output-check .
```

## Step 4: Set Up Automation

```yaml
# .github/workflows/opentofu-docs.yml
name: OpenTofu Documentation

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  docs:
    runs-on: ubuntu-latest
    env:
      TF_INPUT: "false"
      TF_IN_AUTOMATION: "true"
      TERRAFORM_DOCS_VERSION: "0.22.0"

    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.11.0"
          tofu_wrapper: false

      - name: Install terraform-docs
        run: |
          curl -sSLo terraform-docs.tar.gz "https://terraform-docs.io/dl/v${TERRAFORM_DOCS_VERSION}/terraform-docs-v${TERRAFORM_DOCS_VERSION}-linux-amd64.tar.gz"
          tar -xzf terraform-docs.tar.gz
          chmod +x terraform-docs
          sudo mv terraform-docs /usr/local/bin/terraform-docs

      - name: OpenTofu Init
        run: tofu init -backend=false

      - name: OpenTofu Validate
        run: tofu validate

      - name: Check terraform-docs Output
        run: terraform-docs markdown table --output-file README.md --output-mode inject --output-check .
```

## Step 5: Monitor and Verify

```bash
# Check formatting
tofu fmt -check

# Validate the module
tofu init -backend=false
tofu validate

# Verify generated documentation is current
terraform-docs markdown table --output-file README.md --output-mode inject --output-check .

# Check that README.md has no uncommitted generated changes
git diff --exit-code README.md
```

## Step 6: Implement Best Practices

```yaml
# .terraform-docs.yml
formatter: "markdown table"
version: ">= 0.22.0, < 1.0.0"

recursive:
  enabled: false
  path: modules

output:
  file: README.md
  mode: inject
  template: |-
    <!-- BEGIN_TF_DOCS -->
    {{ .Content }}
    <!-- END_TF_DOCS -->

sort:
  enabled: true
  by: name

settings:
  hide-empty: true
  lockfile: true
  read-comments: true
  required: true
  type: true
```

## Troubleshooting

If you encounter issues:

1. Regenerate stale documentation: `terraform-docs markdown table --output-file README.md --output-mode inject .`
2. Check README markers: Verify `<!-- BEGIN_TF_DOCS -->` and `<!-- END_TF_DOCS -->` exist
3. Review missing sections: Add descriptions to variables and outputs, and keep module interface files in `.tf`
4. Debug OpenTofu validation: Run `tofu init -backend=false`, then `tofu validate`, and enable logging with `export TF_LOG=DEBUG` if needed

## Conclusion

You have successfully implemented terraform-docs documentation for OpenTofu. This approach provides a repeatable, auditable, and collaborative documentation workflow. Combine with code review processes, automated checks, and clear module interfaces for a production-ready setup.
