# How to Use Early Variable Evaluation Introduced in OpenTofu 1.8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Early Evaluation, Variable, OpenTofu 1.8, Infrastructure as Code

Description: Learn how to use early variable evaluation in OpenTofu 1.8 to reference input variables in provider and backend configurations.

## Introduction

OpenTofu 1.8 introduced early variable evaluation for configuration that must be resolved during `tofu init`, including backend configuration. Provider configurations could already use input variables, but 1.8 makes it possible to share the same root-module values with backend configuration as well. This makes configurations more dynamic and can reduce the need for partial backend configuration or wrapper scripts to inject values.

## Before OpenTofu 1.8

```hcl
# Previously, you couldn't do this:

variable "state_bucket" {
  type = string
}

terraform {
  backend "s3" {
    bucket = var.state_bucket  # ERROR in < 1.8: variables not allowed here
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Using Variables in Provider Configuration

Provider configuration can reference input variables, and in OpenTofu 1.8 the same root-module variables can now also be used in backend configuration during `tofu init`.

```hcl
variable "aws_region" {
  type        = string
  description = "AWS region to deploy to"
  default     = "us-east-1"
}

variable "aws_assume_role_arn" {
  type        = string
  description = "IAM role ARN to assume"
  default     = ""
}

provider "aws" {
  region = var.aws_region

  dynamic "assume_role" {
    for_each = var.aws_assume_role_arn != "" ? [1] : []
    content {
      role_arn = var.aws_assume_role_arn
    }
  }
}
```

## Using Variables in Backend Configuration

```hcl
variable "state_bucket" {
  type        = string
  description = "S3 bucket name for Terraform state"
}

variable "state_key_prefix" {
  type    = string
  default = "terraform"
}

variable "environment" {
  type = string
}

terraform {
  backend "s3" {
    bucket         = var.state_bucket       # Now works in 1.8+
    key            = "${var.state_key_prefix}/${var.environment}/terraform.tfstate"
    region         = var.aws_region
    encrypt        = true
    dynamodb_table = "${var.state_bucket}-locks"
  }
}
```

## Multi-Region Provider Configurations

Early evaluation helps keep multi-region configurations consistent by letting you share region values across backend and provider settings. Truly dynamic provider iteration requires provider `for_each` in OpenTofu 1.9.

```hcl
variable "regions" {
  type    = list(string)
  default = ["us-east-1", "eu-west-1", "ap-southeast-1"]
}

# Static provider aliases; provider for_each requires OpenTofu 1.9
provider "aws" {
  alias  = "us_east_1"
  region = var.regions[0]
}

provider "aws" {
  alias  = "eu_west_1"
  region = var.regions[1]
}

provider "aws" {
  alias  = "ap_southeast_1"
  region = var.regions[2]
}
```

## Backend Config with Variable Defaults

```hcl
# vars.tfvars
state_bucket     = "my-company-terraform-state"
state_key_prefix = "prod"
environment      = "production"
aws_region       = "us-east-1"
```

```bash
# Initialize with variable values
tofu init \
  -var-file="vars.tfvars"
```

## Constraints

Early evaluation has some constraints:
- Provider expressions must be known before planning or applying, and backend expressions must be resolvable during `tofu init`
- Backend configuration cannot reference resources, data sources, module outputs, or provider-defined functions
- Variables used in backend blocks must be provided to `tofu init` (via `-var`, `-var-file`, or env vars)

```bash
# Supply variables at init time for backend configuration
tofu init \
  -var="state_bucket=my-state-bucket" \
  -var="environment=prod"
```

## Summary

Early variable evaluation in OpenTofu 1.8 eliminates a major usability gap by allowing variables and locals in backend configuration and other settings resolved during `tofu init`. Combined with provider variables, this simplifies multi-environment setups, can reduce the need for backend configuration partials, and makes configurations more self-contained and dynamic.
