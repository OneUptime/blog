# How to Use Terragrunt with Remote State Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Remote State, Backend Configuration, AWS, Azure, GCP

Description: Learn how to configure and manage Terraform remote state through Terragrunt including automatic backend creation, state locking, and multi-environment state isolation.

---

Remote state management is one of the first problems Terragrunt solves. In plain Terraform, every module directory needs its own backend configuration block, and you end up copying the same settings everywhere with only the `key` changing. Terragrunt lets you define the remote state pattern once and have every module automatically get the right configuration.

## The Problem with Plain Terraform State

Without Terragrunt, each module needs a backend block:

```hcl
# dev/vpc/main.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "dev/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

```hcl
# dev/rds/main.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "dev/rds/terraform.tfstate"  # only this changes
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

With 50 modules across 3 environments, that is 150 nearly identical backend blocks. If you need to change the bucket name or add encryption, you have to update all of them.

## Terragrunt's remote_state Block

Terragrunt solves this with the `remote_state` block in your root configuration:

```hcl
# live/terragrunt.hcl (root)

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "my-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

Every child module that includes this root automatically gets a `backend.tf` file generated with the correct configuration. The `path_relative_to_include()` function ensures each module has a unique state key based on its directory path.

For `dev/vpc`, the key becomes `dev/vpc/terraform.tfstate`. For `prod/rds`, it becomes `prod/rds/terraform.tfstate`. No manual configuration needed.

## Automatic Backend Resource Creation

One of Terragrunt's most convenient features is automatic creation of the backend resources (S3 bucket, DynamoDB table). Just run any Terragrunt command and it creates them if they do not exist:

```hcl
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "my-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"

    # Terragrunt will create the S3 bucket and DynamoDB table
    # if they do not exist
  }
}
```

On the first run, Terragrunt:

1. Checks if the S3 bucket exists
2. Creates it if not, with encryption and versioning enabled
3. Checks if the DynamoDB table exists
4. Creates it if not, with the correct schema for state locking
5. Proceeds with the normal Terraform workflow

You can disable this auto-creation if you manage these resources separately:

```hcl
remote_state {
  backend = "s3"
  config = {
    bucket                 = "my-terraform-state"
    key                    = "${path_relative_to_include()}/terraform.tfstate"
    region                 = "us-east-1"
    encrypt                = true
    dynamodb_table         = "terraform-lock"
    skip_bucket_creation   = true   # do not auto-create bucket
    skip_bucket_versioning = true   # do not try to set versioning
  }
}
```

## AWS S3 Backend

The most common backend for AWS users. Here is a production-grade configuration:

```hcl
# live/terragrunt.hcl

locals {
  env_config = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  account_id = local.env_config.locals.account_id
  aws_region = "us-east-1"
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    # Account-specific bucket name to avoid global naming conflicts
    bucket = "terraform-state-${local.account_id}"

    # Unique key per module based on directory structure
    key = "${path_relative_to_include()}/terraform.tfstate"

    # Region for the state bucket
    region = local.aws_region

    # Enable encryption at rest
    encrypt = true

    # DynamoDB table for state locking
    dynamodb_table = "terraform-lock"

    # Enable S3 bucket versioning for state file history
    enable_lock_table_ssencryption = true
  }
}
```

### S3 Bucket Naming Strategy

Use the AWS account ID in the bucket name to avoid conflicts:

```hcl
# One bucket per account
bucket = "terraform-state-${local.account_id}"

# Or one bucket per account and region
bucket = "terraform-state-${local.account_id}-${local.aws_region}"
```

### Cross-Account State Access

If your CI/CD pipeline runs in a central account and assumes roles into target accounts, the state bucket might live in the target account:

```hcl
remote_state {
  backend = "s3"
  config = {
    bucket         = "terraform-state-${local.account_id}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = local.aws_region
    encrypt        = true
    dynamodb_table = "terraform-lock"

    # Assume role to access the state bucket in the target account
    role_arn = "arn:aws:iam::${local.account_id}:role/TerraformStateAccess"
  }
}
```

## Azure azurerm Backend

For Azure, the state goes into a Storage Account:

```hcl
# live/terragrunt.hcl

locals {
  sub_config      = read_terragrunt_config(find_in_parent_folders("subscription.hcl"))
  subscription_id = local.sub_config.locals.subscription_id
}

remote_state {
  backend = "azurerm"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    # Resource group for state storage (must exist)
    resource_group_name = "rg-terraform-state"

    # Storage account (must be globally unique, max 24 chars)
    storage_account_name = "tfstate${substr(replace(local.subscription_id, "-", ""), 0, 16)}"

    # Container in the storage account
    container_name = "tfstate"

    # Unique key per module
    key = "${path_relative_to_include()}/terraform.tfstate"

    # Subscription for the state storage
    subscription_id = local.subscription_id
  }
}
```

Note: Terragrunt's auto-creation support for Azure backends is more limited than S3. You may need to pre-create the storage account and container:

```bash
# Pre-create Azure state storage
az group create --name rg-terraform-state --location eastus
az storage account create --name tfstateXXXXXX --resource-group rg-terraform-state --sku Standard_LRS
az storage container create --name tfstate --account-name tfstateXXXXXX
```

## GCP GCS Backend

For Google Cloud:

```hcl
# live/terragrunt.hcl

locals {
  project_config = read_terragrunt_config(find_in_parent_folders("project.hcl"))
  project_id     = local.project_config.locals.project_id
}

remote_state {
  backend = "gcs"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    # GCS bucket for state
    bucket = "terraform-state-${local.project_id}"

    # Prefix based on module path
    prefix = path_relative_to_include()

    # Project that owns the bucket
    project = local.project_id

    # Location for the bucket
    location = "US"
  }
}
```

## State Isolation Strategies

### Per-Environment Buckets

The safest approach is separate state storage per environment:

```hcl
# Each environment gets its own bucket
remote_state {
  backend = "s3"
  config = {
    bucket = "terraform-state-${local.environment}-${local.account_id}"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = local.aws_region
  }
}
```

This way, an accidental misconfiguration in dev cannot corrupt production state.

### Single Bucket with Key Prefixes

A simpler approach uses one bucket with environment-prefixed keys:

```hcl
remote_state {
  backend = "s3"
  config = {
    bucket = "terraform-state-company"
    key    = "${local.environment}/${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

This is easier to manage but provides less isolation. A bad IAM policy could expose all environments.

### Per-Region Buckets

For multi-region deployments, use region-specific buckets to keep state close to the resources:

```hcl
remote_state {
  backend = "s3"
  config = {
    bucket = "terraform-state-${local.account_id}-${local.aws_region}"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = local.aws_region
  }
}
```

## State Locking

State locking prevents concurrent modifications. Different backends use different locking mechanisms:

### S3 + DynamoDB

```hcl
remote_state {
  backend = "s3"
  config = {
    bucket         = "terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"  # enables locking
  }
}
```

### Azure - Built-in Blob Leasing

Azure Blob Storage has built-in leasing for locking. No additional configuration needed.

### GCS - Built-in Locking

GCS also handles locking natively.

## Handling State Migration

When you need to move state (for example, changing the bucket name), Terragrunt can handle the migration:

```bash
# After updating the remote_state config in terragrunt.hcl
cd live/dev/vpc
terragrunt init -migrate-state
```

Terraform will prompt you to confirm the state migration from the old backend to the new one.

For bulk migration across many modules:

```bash
# Migrate all modules in dev
cd live/dev
terragrunt run-all init -migrate-state --terragrunt-non-interactive
```

## The generate Parameter

The `generate` parameter in `remote_state` tells Terragrunt to create a `backend.tf` file rather than modifying the Terraform configuration:

```hcl
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"        # file name to generate
    if_exists = "overwrite"         # overwrite if it already exists
  }
  config = {
    bucket = "my-state"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Without `generate`, Terragrunt modifies Terraform's initialization directly. With `generate`, it creates a visible file that you can inspect in `.terragrunt-cache`.

Using `generate` is the recommended approach because it is more transparent.

## Debugging State Issues

### Check the Generated Backend

```bash
cd live/dev/vpc
terragrunt init
cat .terragrunt-cache/*/backend.tf
```

### Show Current State Configuration

```bash
cd live/dev/vpc
terragrunt state pull | jq '.backend'
```

### Render the Full Configuration

```bash
cd live/dev/vpc
terragrunt render-json | jq '.remote_state'
```

## Best Practices

**Enable encryption**: Always encrypt state at rest. It contains sensitive information like database passwords and API keys.

**Enable versioning**: S3 bucket versioning lets you recover from corrupted state files.

**Use state locking**: Always enable locking to prevent concurrent modifications. Without it, two people running `apply` at the same time can corrupt state.

**Separate state per environment**: At minimum, use different state keys per environment. Ideally, use different buckets or storage accounts.

**Restrict access**: State files contain sensitive data. Use IAM policies (AWS), RBAC (Azure), or IAM (GCP) to limit who can read state.

**Do not check in state files**: Add `*.tfstate` and `.terraform/` to your `.gitignore`. State should only exist in the remote backend.

## Conclusion

Terragrunt's `remote_state` block eliminates one of the biggest pain points in multi-module Terraform projects - managing backend configuration. Define the pattern once in your root `terragrunt.hcl`, and every module automatically gets the correct backend with a unique state key.

The combination of `remote_state` with `path_relative_to_include()` is simple but powerful: your directory structure determines your state structure, and adding a new module requires zero state configuration.

For more on organizing your directory structure to work with remote state, see [How to Organize Terragrunt for Multi-Environment Projects](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-terragrunt-for-multi-environment-projects/view).
