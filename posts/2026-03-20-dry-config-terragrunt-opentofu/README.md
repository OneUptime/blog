# How to Use DRY Configuration Patterns with Terragrunt and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, DRY, Infrastructure as Code, Best Practice, DevOps

Description: Learn how to eliminate configuration duplication across environments by using Terragrunt's DRY patterns - shared backends, common variables, and generated provider files - with OpenTofu.

## Introduction

One of Terragrunt's core value propositions is helping teams maintain DRY (Don't Repeat Yourself) infrastructure configurations. Without it, you end up copy-pasting backend configs and provider blocks across dozens of root modules. This guide shows the main DRY techniques.

## The Problem: Repeated Backend Configuration

Without Terragrunt, every root module requires its own backend block:

```hcl
# Repeated in every root module - hard to maintain

terraform {
  backend "s3" {
    bucket         = "my-state-bucket"
    key            = "dev/vpc/tofu.tfstate"
    region         = "us-east-1"
    dynamodb_table = "state-locks"
    encrypt        = true
  }
}
```

## Solution: Shared Remote State via a Root `root.hcl`

Define the backend once and have Terragrunt inject it into every unit:

```hcl
# Root root.hcl
terraform_binary = "tofu"

remote_state {
  backend = "s3"
  config = {
    bucket         = "my-opentofu-state-${local.account_id}"
    # path_relative_to_include() gives each unit a unique state key
    key            = "${path_relative_to_include()}/tofu.tfstate"
    region         = local.aws_region
    encrypt        = true
    dynamodb_table = "opentofu-locks"
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

locals {
  # Read shared and environment-specific variables from YAML files
  common_vars = yamldecode(file(find_in_parent_folders("common_vars.yaml")))
  env_vars    = yamldecode(file(find_in_parent_folders("env_vars.yaml")))
  aws_region  = local.common_vars.aws_region
  account_id  = local.common_vars.account_id
}
```

## Shared Variables with common_vars.yaml

```yaml
# common_vars.yaml - sits at the repo root
aws_region:  us-east-1
account_id:  "123456789012"
company:     acme
```

Each environment can override values in its own `env_vars.yaml`:

```yaml
# environments/prod/env_vars.yaml
environment: prod
instance_size: t3.large
```

## Merging Variables in Child Configs

```hcl
# environments/prod/eks/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}

# Read variables from multiple layers and merge them
locals {
  common_vars = yamldecode(file(find_in_parent_folders("common_vars.yaml")))
  env_vars    = yamldecode(file(find_in_parent_folders("env_vars.yaml")))
  # Merge common and env-specific vars; env_vars wins on conflicts
  all_vars    = merge(local.common_vars, local.env_vars)
}

terraform {
  source = "../../../modules/eks"
}

inputs = merge(local.all_vars, {
  cluster_name = "eks-${local.all_vars.environment}"
})
```

## Generated Provider Files

Instead of repeating provider configuration, generate it from the root config:

```hcl
# Root root.hcl - generate provider.tf in every unit
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  required_version = ">= 1.8"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${local.aws_region}"
  default_tags {
    tags = {
      ManagedBy   = "opentofu"
      Environment = "${local.env_vars.environment}"
      Company     = "${local.common_vars.company}"
    }
  }
}
EOF
}
```

## Directory Layout for DRY Configs

```text
infrastructure/
├── common_vars.yaml          # Shared across all environments
├── root.hcl                  # Root config: backend, provider generation
├── environments/
│   ├── dev/
│   │   ├── env_vars.yaml     # Dev-specific values
│   │   ├── vpc/
│   │   │   └── terragrunt.hcl
│   │   └── eks/
│   │       └── terragrunt.hcl
│   └── prod/
│       ├── env_vars.yaml
│       ├── vpc/
│       │   └── terragrunt.hcl
│       └── eks/
│           └── terragrunt.hcl
└── modules/
    ├── vpc/
    └── eks/
```

## Conclusion

Terragrunt's DRY patterns - shared backend config via `remote_state`, generated provider files via `generate`, and layered YAML variable files - dramatically reduce the amount of boilerplate in large OpenTofu projects. A change to the shared backend configuration propagates automatically to every unit the next time it is initialized.
