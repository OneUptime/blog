# How to Use Backend Partial Configuration in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Backend Configuration, Security, Infrastructure as Code

Description: Learn how to use Terraform's backend partial configuration to keep sensitive credentials out of code while maintaining flexible, reusable backend setups across environments.

---

Terraform backend configuration has a frustrating constraint: it does not support variables or expressions. You cannot use `var.bucket_name` or `local.region` in a backend block. This is because the backend needs to be resolved before Terraform evaluates the rest of the configuration. Partial configuration is the solution. It lets you define part of the backend in code and supply the rest at initialization time.

## The Problem

Consider this backend configuration:

```hcl
# This does NOT work - variables are not allowed in backend blocks
terraform {
  backend "s3" {
    bucket = var.state_bucket      # ERROR
    key    = var.state_key         # ERROR
    region = var.aws_region        # ERROR
  }
}
```

Terraform will throw an error: "Variables may not be used here." This leaves you with two bad options: hardcode everything (including sensitive values) or leave the backend block empty and pass everything at init time. Partial configuration gives you a third, better option.

## How Partial Configuration Works

With partial configuration, you put the non-sensitive, non-variable parts in your backend block and provide the rest through one of three mechanisms:

1. Command-line flags (`-backend-config`)
2. Configuration files
3. Environment variables (for some backends)

Terraform merges the values from all sources during `terraform init`.

## Method 1: Command-Line Flags

The most direct approach is passing values with `-backend-config` flags:

```hcl
# backend.tf - partial configuration
terraform {
  backend "s3" {
    # These values are safe to commit to version control
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"

    # bucket, dynamodb_table, and credentials are provided at init time
  }
}
```

```bash
# Supply the remaining values at init time
terraform init \
  -backend-config="bucket=my-terraform-state-bucket" \
  -backend-config="dynamodb_table=terraform-locks" \
  -backend-config="encrypt=true"
```

Each `-backend-config` flag sets one key-value pair. You can pass as many as needed.

## Method 2: Configuration Files

For more complex configurations, use a separate file:

```hcl
# backend.tf - the partial configuration in your main code
terraform {
  backend "s3" {
    key = "prod/networking/terraform.tfstate"
  }
}
```

```hcl
# config/prod.hcl - backend configuration file
bucket         = "prod-terraform-state"
region         = "us-east-1"
dynamodb_table = "prod-terraform-locks"
encrypt        = true
```

```hcl
# config/staging.hcl - different environment configuration
bucket         = "staging-terraform-state"
region         = "us-east-1"
dynamodb_table = "staging-terraform-locks"
encrypt        = true
```

```bash
# Initialize with a specific config file
terraform init -backend-config=config/prod.hcl

# Or switch to staging
terraform init -backend-config=config/staging.hcl
```

This is particularly useful when you need to use the same Terraform code across multiple environments.

## Method 3: Environment Variables

Some backends read configuration from environment variables. For example, the S3 backend reads AWS credentials from the standard AWS environment variables:

```bash
# AWS credentials are picked up automatically
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

The Azure backend reads from `ARM_` prefixed variables:

```bash
export ARM_ACCESS_KEY="your-storage-account-key"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
```

The PostgreSQL backend reads from `PG_CONN_STR`:

```bash
export PG_CONN_STR="postgres://user:pass@host/db"
```

Environment variables are the cleanest approach for credentials since they leave no trace in files or command history.

## Combining Multiple Methods

You can combine all three methods. Terraform merges them in this order of precedence (highest to lowest):

1. Command-line `-backend-config` flags
2. Backend configuration file (via `-backend-config=file.hcl`)
3. Values in the `backend` block in Terraform code
4. Environment variables

```hcl
# backend.tf - base configuration
terraform {
  backend "s3" {
    region = "us-east-1"
    key    = "terraform.tfstate"
  }
}
```

```hcl
# backend-prod.hcl - environment-specific file
bucket         = "prod-state-bucket"
dynamodb_table = "prod-locks"
```

```bash
# Combine file and command-line flag
# The encrypt flag overrides anything in the file
terraform init \
  -backend-config=backend-prod.hcl \
  -backend-config="encrypt=true"
```

## Completely Empty Backend Block

You can leave the backend block completely empty and supply everything at init time:

```hcl
# backend.tf
terraform {
  backend "s3" {}
}
```

```bash
# Supply all configuration via command line
terraform init \
  -backend-config="bucket=my-state-bucket" \
  -backend-config="key=project/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="dynamodb_table=terraform-locks"
```

This gives you maximum flexibility but means you cannot run `terraform init` without providing all the values.

## Practical Patterns

### Pattern 1: Per-Environment Config Files

This is the most common pattern for teams managing multiple environments:

```
project/
  main.tf
  backend.tf
  config/
    dev.backend.hcl
    staging.backend.hcl
    prod.backend.hcl
```

```hcl
# backend.tf
terraform {
  backend "s3" {
    key = "myproject/terraform.tfstate"
  }
}
```

```hcl
# config/dev.backend.hcl
bucket         = "dev-terraform-state"
region         = "us-east-1"
dynamodb_table = "dev-terraform-locks"
encrypt        = true
```

```bash
# Initialize for the target environment
terraform init -backend-config=config/dev.backend.hcl
```

### Pattern 2: CI/CD Pipeline

In CI/CD, combine config files with environment-based credentials:

```yaml
# .github/workflows/terraform.yml
jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Init
        run: |
          terraform init \
            -backend-config="bucket=${{ vars.STATE_BUCKET }}" \
            -backend-config="region=${{ vars.AWS_REGION }}" \
            -backend-config="dynamodb_table=${{ vars.LOCK_TABLE }}"
```

### Pattern 3: Wrapper Script

Create a wrapper that selects the right configuration:

```bash
#!/bin/bash
# scripts/init.sh
# Initialize Terraform with the correct backend configuration

ENV=${1:?"Usage: $0 <environment>"}

# Validate environment
if [ ! -f "config/${ENV}.backend.hcl" ]; then
  echo "Error: No backend config found for environment '${ENV}'"
  echo "Available: $(ls config/*.backend.hcl | sed 's/config\///;s/.backend.hcl//' | tr '\n' ' ')"
  exit 1
fi

echo "Initializing Terraform for environment: ${ENV}"

# Reconfigure forces reinitialization with new backend settings
terraform init -reconfigure -backend-config="config/${ENV}.backend.hcl"
```

```bash
# Usage
./scripts/init.sh prod
./scripts/init.sh staging
```

### Pattern 4: Terragrunt Integration

If you use Terragrunt, it handles partial configuration automatically:

```hcl
# terragrunt.hcl
remote_state {
  backend = "s3"
  config = {
    bucket         = "terraform-state-${get_aws_account_id()}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

## Reconfiguring the Backend

When you change backend configuration values, you need to reinitialize. Use the `-reconfigure` flag to tell Terraform you want to change the backend settings:

```bash
# Switch from dev to prod backend
terraform init -reconfigure -backend-config=config/prod.backend.hcl
```

If you want to migrate state to the new backend:

```bash
# Migrate state to the new backend configuration
terraform init -migrate-state -backend-config=config/prod.backend.hcl
```

## Common Mistakes

**Forgetting to reinitialize after changing config files.** Terraform caches backend configuration in `.terraform/`. If you change your config file, you need to run `terraform init -reconfigure`.

**Mixing up environments.** Without clear naming conventions, it is easy to initialize with the wrong config file and accidentally modify the wrong environment's state. Use the wrapper script pattern to add safety checks.

**Not gitignoring config files with secrets.** If your backend config files contain sensitive values, add them to `.gitignore`:

```gitignore
# Backend config files with credentials
config/*.backend.hcl
!config/*.backend.hcl.example
```

Provide example files instead:

```hcl
# config/prod.backend.hcl.example
bucket         = "your-state-bucket-name"
region         = "us-east-1"
dynamodb_table = "your-lock-table-name"
encrypt        = true
```

## Summary

Backend partial configuration solves the problem of needing dynamic or sensitive values in your Terraform backend block. Whether you use command-line flags for quick overrides, configuration files for environment management, or environment variables for credentials, partial configuration keeps your code clean and secure. The key is picking the right combination for your workflow and being disciplined about never committing sensitive values to version control. For more on initializing backends, see our guide on [initializing Terraform backend with -backend-config](https://oneuptime.com/blog/post/2026-02-23-terraform-initialize-backend-config/view).
