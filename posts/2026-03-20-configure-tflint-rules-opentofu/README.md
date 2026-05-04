# How to Configure tflint Rules for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, TFLint, Rule, Configuration, Linting

Description: Learn how to configure tflint rules for OpenTofu projects, enabling and disabling specific rules, setting severity levels, and customizing naming conventions for your organization.

## Introduction

tflint's behavior is controlled by the `.tflint.hcl` configuration file. You can enable/disable individual rules, configure naming conventions, set rule severity levels, and load provider-specific plugins. This guide covers the most useful rule configurations for OpenTofu projects.

## Complete .tflint.hcl Configuration

```hcl
# .tflint.hcl

config {
  # Only lint local modules (not remote sources)
  call_module_type = "local"

  # Don't disable rules unless explicitly configured
  disabled_by_default = false

  # Output format: default, compact, json, checkstyle, junit, sarif
  format = "default"
}

# AWS provider rules
plugin "aws" {
  enabled = true
  version = "0.32.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# ===== Core Terraform Rules =====

rule "terraform_comment_syntax" {
  enabled = true
  # Enforce # comments (the idiomatic Terraform style) instead of // or /* */
}

rule "terraform_deprecated_index" {
  enabled = true
  # Disallow deprecated list indexing: aws_subnet.private.0.id
  # Prefer: aws_subnet.private[0].id
}

rule "terraform_deprecated_interpolation" {
  enabled = true
  # Disallow: "${var.foo}" when it can be: var.foo
}

rule "terraform_documented_outputs" {
  enabled = true
  # Require description on all output blocks
}

rule "terraform_documented_variables" {
  enabled = true
  # Require description on all variable blocks
}

rule "terraform_module_pinned_source" {
  enabled = true
  style   = "semver"  # Require semantic version tags (not "latest" or branch)
}

rule "terraform_module_version" {
  enabled = true
  exact   = false  # Allow ~> version constraints
}

rule "terraform_required_providers" {
  enabled = true
  # Require required_providers block in terraform {}
}

rule "terraform_required_version" {
  enabled = true
  # Require required_version in terraform {}
}

rule "terraform_typed_variables" {
  enabled = true
  # Require explicit type on all variables
}

rule "terraform_unused_declarations" {
  enabled = true
  # Warn on declared but unused variables and locals
}

rule "terraform_unused_required_providers" {
  enabled = true
  # Warn on providers listed in required_providers but not used
}

# ===== Naming Convention Rules =====

rule "terraform_naming_convention" {
  enabled = true

  # Resources: snake_case
  resource {
    format = "snake_case"
  }

  # Variables: snake_case
  variable {
    format = "snake_case"
  }

  # Outputs: snake_case
  output {
    format = "snake_case"
  }

  # Locals: snake_case
  locals {
    format = "snake_case"
  }

  # Modules: snake_case
  module {
    format = "snake_case"
  }

  # Data sources: snake_case
  data {
    format = "snake_case"
  }
}
```

## AWS-Specific Rules

```hcl
# Selectively enable/disable AWS rules
# List all available rules: tflint --format=json 2>&1 | jq '.rules[].name'

# These are enabled by the AWS plugin by default:
# aws_instance_previous_type (disallow previous-generation instance types like t1.micro)
# aws_db_instance_invalid_engine
# aws_db_instance_invalid_type
# aws_elasticache_cluster_invalid_type
# aws_lambda_function_deprecated_runtime
# aws_iam_policy_sid_invalid_characters

# Disable specific AWS rules if needed:
rule "aws_instance_previous_type" {
  enabled = false
  # Our organization still uses some t2 instances
}
```

## Environment-Specific Configurations

```hcl
# .tflint-modules.hcl - stricter rules for module development
config {
  call_module_type    = "local"
  disabled_by_default = false
}

plugin "aws" {
  enabled = true
  version = "0.32.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_naming_convention" {
  enabled  = true
  resource { format = "snake_case" }
  variable { format = "snake_case" }
  output   { format = "snake_case" }
}
```

```bash
# Use module-specific config when linting modules
tflint --config=.tflint-modules.hcl --chdir=modules/vpc
```

## Per-Directory Overrides

```bash
# Different .tflint.hcl per directory
infrastructure/
├── .tflint.hcl              # Root config (applies recursively)
├── modules/
│   └── .tflint.hcl          # Stricter config for modules
└── environments/
    └── .tflint.hcl          # Less strict for environment configs
```

## Running with Specific Rule Overrides

```bash
# Enable a rule that's disabled in config
tflint --enable-rule=terraform_documented_outputs

# Disable a rule for this run only
tflint --disable-rule=aws_instance_previous_type

# Only run specific rules
tflint --only=terraform_naming_convention,terraform_required_version
```

## Conclusion

tflint's rule configuration enables a graduated adoption approach: start with `disabled_by_default = false` to see all findings, then explicitly disable rules that don't apply to your project. The naming convention rule is high-value early on - enforcing snake_case from the start prevents the inconsistencies that accumulate when multiple engineers contribute without style guidance. Enable `terraform_documented_variables` and `terraform_documented_outputs` for module directories to ensure module interfaces are self-documenting.
