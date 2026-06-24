# How to Enforce Naming Conventions with Policy as Code in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Policy as Code, Naming Convention, OPA, TFLint, Governance

Description: Learn how to enforce resource naming conventions in OpenTofu using tflint naming rules, OPA Rego policies, and custom validation functions - ensuring consistent, predictable resource names across...

## Introduction

Inconsistent resource naming causes operational pain: unclear ownership, failed automation scripts, and difficulty auditing. OpenTofu lets you enforce naming conventions at multiple layers - from linting during development to policy gates in CI/CD.

## Layer 1: tflint Naming Convention Rules

Configure tflint to enforce snake_case for all supported HCL block names:

```hcl
# .tflint.hcl

rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}
```

Run tflint before committing:

```bash
tflint --config .tflint.hcl
# Notice: resource name `WebServer` must match the following format: snake_case (terraform_naming_convention)
# Notice: variable name `dbPassword` must match the following format: snake_case (terraform_naming_convention)
```

## Layer 2: Variable Validation for Resource Name Format

Validate that resource name variables follow your naming scheme at plan time:

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "service_name" {
  type = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,30}[a-z0-9]$", var.service_name))
    error_message = "Service name must be lowercase alphanumeric with hyphens, 4-32 chars."
  }
}

# Construct names using locals to enforce the pattern
locals {
  name_prefix = "${var.environment}-${var.service_name}"
  # Results in: prod-payments, dev-auth-service
}
```

## Layer 3: OPA Policy for Cloud Resource Names

Use OPA/conftest to validate that planned cloud resource names follow your convention:

```rego
# policies/naming_conventions.rego
package main

import rego.v1

# Pattern: {env}-{service}-{resource_type}
# Example: prod-payments-sg, dev-auth-rds, prod-api-ec2
valid_name_pattern := `^(dev|staging|prod)-[a-z][a-z0-9-]{2,30}[a-z0-9]-[a-z0-9]+$`

# Check AWS security group names
deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group"
    resource.change.actions[_] in ["create", "update"]

    name := sprintf("%v", [object.get(resource.change.after, "name", "")])
    not regex.match(valid_name_pattern, name)

    msg := sprintf(
        "Security group '%s' has name '%s' that doesn't match pattern '%s'",
        [resource.address, name, valid_name_pattern]
    )
}

# Check EC2 instance Name tag
deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_instance"
    resource.change.actions[_] in ["create", "update"]

    tags := object.get(resource.change.after, "tags", {})
    name := sprintf("%v", [object.get(tags, "Name", "")])
    not regex.match(valid_name_pattern, name)

    msg := sprintf(
        "EC2 instance '%s' has Name tag '%s' that doesn't match naming convention",
        [resource.address, name]
    )
}
```

Run it in CI:

```bash
tofu plan -out=tfplan.binary
tofu show -json tfplan.binary > tfplan.json
conftest test --policy policies/ tfplan.json
```

## Layer 4: Custom Validation Module

Create a reusable module that validates names and generates them consistently:

```hcl
# modules/naming/main.tf
variable "environment"   { type = string }
variable "service"       { type = string }
variable "resource_type" { type = string }

locals {
  name = "${var.environment}-${var.service}-${var.resource_type}"
}

output "name" {
  value = local.name

  precondition {
    condition     = can(regex("^(dev|staging|prod)-[a-z][a-z0-9-]{2,30}[a-z0-9]-[a-z0-9]+$", local.name))
    error_message = "Generated name '${local.name}' doesn't match the required pattern."
  }
}
```

Usage:

```hcl
module "sg_name" {
  source        = "../modules/naming"
  environment   = var.environment
  service       = "payments"
  resource_type = "sg"
}

resource "aws_security_group" "payments" {
  name = module.sg_name.name   # prod-payments-sg
}
```

## Pre-Commit Hook Integration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.6
    hooks:
      - id: terraform_tflint
        args:
          - --args=--config=__GIT_WORKING_DIR__/.tflint.hcl

  - repo: https://github.com/open-policy-agent/conftest
    rev: v0.68.2
    hooks:
      - id: conftest-verify
        args: ["--policy", "policies/"]
```

## Conclusion

Enforcing naming conventions requires multiple layers: tflint catches HCL identifier violations during development, variable validation enforces name format patterns at plan time, OPA policies block non-compliant planned cloud resource names in CI, and a shared naming module generates consistent names automatically. The combination closes most naming-convention gaps before apply.
