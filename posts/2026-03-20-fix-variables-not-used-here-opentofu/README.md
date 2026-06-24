# How to Fix 'Error: Variables May Not Be Used Here' in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Variable, Error, Backend Configuration, Infrastructure as Code

Description: Learn why OpenTofu prohibits input variables in certain contexts like backend blocks and provider meta-arguments, and how to work around these restrictions.

## Introduction

OpenTofu only allows constant values inside the top-level `terraform` block, so settings like `required_version` and `required_providers` cannot reference input variables. By contrast, backend blocks and provider configuration can use variables in current OpenTofu, as long as the values are available when needed.

## Error Message

```hcl
terraform {
  required_version = var.tofu_version

  required_providers {
    aws = {
      source  = var.aws_provider_source
      version = var.aws_provider_version
    }
  }
}
```

These references fail because they appear inside the top-level `terraform` block, which only accepts constant values.

## Fix 1: Backend Block - Variables Are Allowed in OpenTofu

Backend configuration is a special case in OpenTofu: you may use variables and locals there, as long as all values can be resolved during `tofu init`:

```hcl
terraform {
  backend "s3" {
    bucket = var.state_bucket
    key    = "${var.environment}/tofu.tfstate"
  }
}
```

When the backend uses input variables, assign them during init:

```bash
# Option 1: pass root module variables to init
tofu init \
  -var="state_bucket=my-opentofu-state-prod" \
  -var="environment=prod"

# Option 2: use a tfvars file
cat > backend-prod.tfvars <<EOF
state_bucket = "my-opentofu-state-prod"
environment  = "prod"
EOF

tofu init -var-file=backend-prod.tfvars
```

`-backend-config` is still useful for partial backend configuration when you intentionally leave some backend arguments out of the block:

```hcl
terraform {
  backend "s3" {}
}
```

```bash
# Option 3: -backend-config flags
tofu init \
  -backend-config="bucket=my-opentofu-state-prod" \
  -backend-config="key=prod/app/tofu.tfstate" \
  -backend-config="region=us-east-1"

# Option 4: -backend-config file
cat > backend-prod.hcl <<EOF
bucket = "my-opentofu-state-prod"
key    = "prod/app/tofu.tfstate"
region = "us-east-1"
EOF

tofu init -backend-config=backend-prod.hcl
```

## Fix 2: required_version - Use a Literal

`required_version` in the `terraform` block must be a literal string:

```hcl
# WRONG
terraform {
  required_version = var.tofu_version   # Not allowed
}

# CORRECT - use a literal version constraint
terraform {
  required_version = ">= 1.8"
}
```

## Fix 3: required_providers - Use Literal Values

Provider source addresses and version constraints live inside the top-level `terraform` block, so they must be constant values:

```hcl
# WRONG
terraform {
  required_providers {
    aws = {
      source  = var.aws_provider_source   # Not allowed
      version = var.aws_provider_version
    }
  }
}

# CORRECT
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Fix 4: Provider Configuration - Input Variables Are Allowed

Provider configuration is not subject to the same restriction. Provider arguments can use expressions whose values are known before apply, including input variables:

```hcl
provider "google" {
  project = var.project_id
  region  = var.region
}
```

Environment variables are still useful for credentials or other provider settings that the provider explicitly supports, but they are not required just to avoid this error.

## Fix 5: Workspaces for Environment-Specific Config

Use `terraform.workspace` (a special built-in) for environment-specific values in normal configuration expressions:

```hcl
# terraform.workspace IS allowed in some contexts
locals {
  environment = terraform.workspace   # "default", "prod", "staging"
}
```

This can be useful in ordinary configuration, but it does not make settings inside the top-level `terraform` block dynamic.

## Conclusion

Variables are prohibited in top-level `terraform` block settings such as `required_version` and `required_providers` because that block only accepts constant values. Backend configuration is different in OpenTofu: it may use variables and locals if they can be resolved during `tofu init`. Provider configuration can also use input variables as long as those values are known before apply.
