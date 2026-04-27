# How to Use Workspace-Specific Variable Values in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Workspaces

Description: Learn how to manage workspace-specific variable values in OpenTofu using lookup maps, variable files, and conditional expressions.

## Introduction

OpenTofu workspaces share configuration files but need different values per environment - different instance sizes, replica counts, domain names, or feature flags. Several patterns let you define workspace-specific values while keeping a single configuration.

## Pattern 1: Lookup Map with terraform.workspace

```hcl
locals {
  config = {
    development = {
      instance_type  = "t3.micro"
      min_capacity   = 1
      max_capacity   = 2
      domain         = "dev.acme-corp.com"
    }
    staging = {
      instance_type  = "t3.small"
      min_capacity   = 1
      max_capacity   = 3
      domain         = "staging.acme-corp.com"
    }
    production = {
      instance_type  = "t3.large"
      min_capacity   = 3
      max_capacity   = 10
      domain         = "acme-corp.com"
    }
  }[terraform.workspace]
}

resource "aws_launch_template" "app" {
  instance_type = local.config.instance_type
}
```

## Pattern 2: Separate Variable Files per Workspace

```hcl
# variables.tf

variable "instance_type"  { type = string }
variable "min_capacity"    { type = number }
variable "domain_name"     { type = string }
```

```hcl
# environments/development.tfvars
instance_type = "t3.micro"
min_capacity  = 1
domain_name   = "dev.acme-corp.com"
```

```hcl
# environments/production.tfvars
instance_type = "t3.large"
min_capacity  = 3
domain_name   = "acme-corp.com"
```

```bash
# Apply with the matching var file
tofu workspace select production
tofu apply -var-file="environments/$(tofu workspace show).tfvars"
```

## Pattern 3: TF_VAR_ Environment Variables

```bash
# Set workspace-specific values via environment
tofu workspace select staging

export TF_VAR_instance_type="t3.small"
export TF_VAR_min_capacity="1"
export TF_VAR_domain_name="staging.acme-corp.com"

tofu apply
```

## Pattern 4: Variable with Default Fallback

```hcl
variable "instance_type" {
  type    = string
  default = null  # Falls back to workspace lookup
}

locals {
  default_instance_types = {
    development = "t3.micro"
    staging     = "t3.small"
    production  = "t3.large"
  }

  instance_type = coalesce(var.instance_type, local.default_instance_types[terraform.workspace])
}
```

This allows overriding the default per-workspace value with an explicit variable.

## Pattern 5: Feature Flags per Workspace

```hcl
locals {
  features = {
    development = {
      enable_monitoring = false
      enable_cdn        = false
      enable_waf        = false
    }
    production = {
      enable_monitoring = true
      enable_cdn        = true
      enable_waf        = true
    }
  }[terraform.workspace]
}

resource "aws_cloudfront_distribution" "cdn" {
  count = local.features.enable_cdn ? 1 : 0
  # ...
}
```

## CI/CD Integration

```yaml
- name: Apply
  run: |
    WORKSPACE="${{ github.ref_name == 'main' && 'production' || 'staging' }}"
    tofu workspace select -or-create "$WORKSPACE"
    tofu apply -auto-approve \
      -var-file="environments/${WORKSPACE}.tfvars"
```

## Conclusion

The lookup map pattern is the most concise for workspace-specific values - define all configurations in a single `locals` block and index by `terraform.workspace`. For complex configurations with many variables, separate `.tfvars` files per workspace are more maintainable. Use `coalesce` to allow explicit overrides when needed. Always validate that `terraform.workspace` matches an expected value using a precondition to prevent misconfigurations.
