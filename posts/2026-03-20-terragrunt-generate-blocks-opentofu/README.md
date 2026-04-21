# How to Use Terragrunt generate Blocks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terragrunt, Generate, Configuration Generation, DRY

Description: Learn how to use Terragrunt generate blocks to automatically create provider, backend, and version configuration files for OpenTofu modules without repeating them in every directory.

## Introduction

Terragrunt `generate` blocks create files in the module directory before OpenTofu runs. This eliminates the need to copy provider, backend, and required_providers configuration into every module directory - one root `terragrunt.hcl` generates these files for all child modules.

## Generating provider.tf

```hcl
# Root terragrunt.hcl

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  assume_role {
    role_arn = "arn:aws:iam::${local.account_id}:role/opentofu-deployer"
  }

  default_tags {
    tags = {
      Environment  = "${local.environment}"
      ManagedBy    = "OpenTofu"
      TerragruntDir = "${path_relative_to_include()}"
    }
  }
}

provider "random" {}
provider "null" {}
EOF
}
```

## Generating versions.tf

```hcl
generate "versions" {
  path      = "versions.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}
EOF
}
```

## Conditional Provider Generation

Generate different providers based on environment:

```hcl
# In root terragrunt.hcl

locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_vars.locals.environment
  is_prod     = local.environment == "prod"
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = local.is_prod ? <<EOF
provider "aws" {
  region = "${local.env_vars.locals.aws_region}"
  assume_role {
    role_arn     = "arn:aws:iam::${local.env_vars.locals.account_id}:role/prod-deployer"
    session_name = "terragrunt-prod"
  }
}
EOF
  : <<EOF
provider "aws" {
  region = "${local.env_vars.locals.aws_region}"
  # Dev/staging uses instance profile or local credentials
}
EOF
}
```

## Generating Module-Specific Configuration

Use child-level `generate` blocks for module-specific files:

```hcl
# environments/prod/database/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/database"
}

# Generate a data.tf that reads secrets from AWS Secrets Manager
generate "data" {
  path      = "data.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/database/password"
}

locals {
  db_password = jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string).password
}
EOF
}
```

## Generating Terraform Configuration for Feature Flags

```hcl
# Generate a feature flags file based on environment
generate "feature_flags" {
  path      = "feature_flags.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
locals {
  feature_flags = {
    enable_waf          = ${local.environment == "prod"}
    enable_monitoring   = ${contains(["staging", "prod"], local.environment)}
    enable_read_replica = ${local.environment == "prod"}
  }
}
EOF
}
```

## Conclusion

Terragrunt `generate` blocks eliminate configuration duplication across modules. Use `if_exists = "overwrite_terragrunt"` (not just "overwrite") to only regenerate files created by Terragrunt, failing instead of overwriting any manually created files with the same name. The combination of root-level generates for providers and versions, plus child-level generates for module-specific data, covers the full range of boilerplate elimination.
