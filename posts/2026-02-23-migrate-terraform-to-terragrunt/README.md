# How to Migrate from Plain Terraform to Terragrunt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Migration, Infrastructure as Code, DevOps

Description: A step-by-step guide to migrating existing Terraform projects to Terragrunt, covering state migration, directory restructuring, backend generation, and incremental adoption strategies.

---

Migrating from plain Terraform to Terragrunt doesn't have to be a big-bang change. You can adopt Terragrunt incrementally, starting with one module or one environment, and expand from there. The key is understanding what Terragrunt changes (the wrapper configuration) and what stays the same (your actual Terraform code). This guide walks through the migration process step by step.

## Before You Start

Take stock of your current setup:

```bash
# What does your current structure look like?
tree -L 3 infrastructure/

# How many modules do you have?
find . -name "*.tf" -exec dirname {} \; | sort -u | wc -l

# What backend are you using?
grep -r "backend" --include="*.tf" .
```

A typical pre-migration Terraform project might look like this:

```
infrastructure/
  dev/
    main.tf              # Resource definitions
    variables.tf         # Variable declarations
    outputs.tf           # Output declarations
    backend.tf           # Backend configuration
    provider.tf          # Provider configuration
    terraform.tfvars     # Variable values
  staging/
    main.tf              # Copied and modified from dev
    variables.tf
    outputs.tf
    backend.tf           # Different state key
    provider.tf          # Different region/account
    terraform.tfvars
  prod/
    main.tf              # Copied and modified from dev
    ...
  modules/
    vpc/
    ecs/
    rds/
```

The problems this creates: duplicated code across environments, backend blocks that are almost identical, and provider configurations that differ only by account or region.

## Step 1: Install Terragrunt

```bash
# macOS
brew install terragrunt

# Or download directly
curl -sL https://github.com/gruntwork-io/terragrunt/releases/download/v0.55.0/terragrunt_linux_amd64 \
  -o /usr/local/bin/terragrunt
chmod +x /usr/local/bin/terragrunt

# Verify
terragrunt --version
```

## Step 2: Extract Shared Modules

If your environments have duplicated Terraform code (not just different variable values), extract the shared parts into modules:

```
# Before: Code duplicated across environments
dev/main.tf     -> Contains VPC, ECS, and RDS resources
staging/main.tf -> Same resources, slightly different values
prod/main.tf    -> Same again

# After: Shared modules with environment-specific calls
modules/
  vpc/
    main.tf          # VPC resources
    variables.tf     # Input variables
    outputs.tf       # Output values
  ecs/
    main.tf
    variables.tf
    outputs.tf
```

This step is pure Terraform refactoring - no Terragrunt involved yet.

## Step 3: Create the Root Terragrunt Configuration

Create a root `terragrunt.hcl` at the top of your infrastructure directory:

```hcl
# infrastructure/terragrunt.hcl

# Generate backend configuration for all modules
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "my-company-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Generate provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "us-east-1"
}
EOF
}
```

Note the use of `if_exists = "overwrite_terragrunt"` during migration. This tells Terragrunt to only overwrite files that it created, leaving your existing `backend.tf` and `provider.tf` untouched until you're ready to remove them.

## Step 4: Create Child Terragrunt Configurations

For each environment, create a `terragrunt.hcl` that references the shared module:

```hcl
# infrastructure/dev/vpc/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/vpc"
}

inputs = {
  vpc_cidr    = "10.0.0.0/16"
  environment = "dev"
  enable_nat  = true
}
```

## Step 5: Migrate State

This is the critical step. Your Terraform state files need to be accessible from the new Terragrunt configuration. There are two approaches:

### Approach A: Keep Existing State (Recommended)

If your state is already in S3/GCS/Azure Blob and the key paths haven't changed, you just need the Terragrunt `remote_state` configuration to point to the same location:

```hcl
# Make sure the key matches where the state currently lives
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket = "my-company-terraform-state"
    # This must match the existing state key
    key    = "dev/vpc/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "terraform-locks"
  }
}
```

Test with a plan to verify Terragrunt can read the existing state:

```bash
cd infrastructure/dev/vpc
terragrunt plan
# Should show no changes if migration is correct
```

### Approach B: Move State to New Paths

If you want to reorganize your state files to match Terragrunt's `path_relative_to_include()` pattern, use `terraform state` commands:

```bash
# Copy state from old location to new location
aws s3 cp \
  s3://my-company-terraform-state/dev-vpc.tfstate \
  s3://my-company-terraform-state/dev/vpc/terraform.tfstate

# Verify the plan shows no changes
cd infrastructure/dev/vpc
terragrunt plan
```

## Step 6: Remove Duplicate Files

Once Terragrunt is generating your backend and provider configurations, remove the hand-written versions from your module directories:

```bash
# Remove backend.tf and provider.tf from environment directories
# (Terragrunt generates these now)
rm infrastructure/dev/vpc/backend.tf
rm infrastructure/dev/vpc/provider.tf

# Remove terraform.tfvars (inputs are now in terragrunt.hcl)
rm infrastructure/dev/vpc/terraform.tfvars
```

Switch `if_exists` from `overwrite_terragrunt` to `overwrite`:

```hcl
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"    # Changed from overwrite_terragrunt
  contents  = <<EOF
provider "aws" {
  region = "us-east-1"
}
EOF
}
```

## Step 7: Add Environment Configuration Files

Create configuration files at each level of the directory hierarchy:

```hcl
# infrastructure/dev/env.hcl
locals {
  environment = "dev"
  account_id  = "111111111111"
}
```

```hcl
# infrastructure/prod/env.hcl
locals {
  environment = "prod"
  account_id  = "222222222222"
}
```

Update the root configuration to use these:

```hcl
# infrastructure/terragrunt.hcl

locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_vars.locals.environment
  account_id  = local.env_vars.locals.account_id
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "aws" {
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::${local.account_id}:role/TerraformRole"
  }
  default_tags {
    tags = {
      Environment = "${local.environment}"
      ManagedBy   = "terragrunt"
    }
  }
}
EOF
}
```

## Incremental Migration Strategy

You don't have to migrate everything at once. Here's a phased approach:

### Phase 1: One Module, One Environment
Pick the simplest, lowest-risk module in dev. Migrate it to Terragrunt. Verify it works.

### Phase 2: All Modules in Dev
Migrate the remaining dev modules. Build confidence with the Terragrunt workflow.

### Phase 3: Staging
Apply the same patterns to staging. This validates that the multi-environment setup works.

### Phase 4: Production
Migrate production modules last, with extra planning and review.

### Phase 5: Cleanup
Remove old directory structures, update CI/CD pipelines, and update documentation.

## Updating CI/CD Pipelines

Replace Terraform commands with Terragrunt equivalents:

```yaml
# Before (Terraform)
script:
  - cd infrastructure/dev/vpc
  - terraform init
  - terraform plan
  - terraform apply -auto-approve

# After (Terragrunt)
script:
  - cd infrastructure/dev/vpc
  - terragrunt plan
  - terragrunt apply --terragrunt-non-interactive -auto-approve
```

For bulk operations:

```yaml
script:
  - cd infrastructure/dev
  - terragrunt run-all plan --terragrunt-non-interactive
```

## Common Migration Pitfalls

**State file mismatch**: The most common issue is Terragrunt looking for state in a different location than where it actually is. Always run `terragrunt plan` after migration and verify it shows no unexpected changes.

**Provider conflicts**: If your module has a `provider.tf` and Terragrunt generates one too, you'll get duplicate provider errors. Remove the module's provider file or use `if_exists = "skip"` during transition.

**Variable name mismatches**: Terragrunt `inputs` map directly to Terraform variables. Make sure the key names match exactly.

**Backend initialization**: When changing backend configuration, Terraform asks to migrate state. In non-interactive mode, this can cause failures. Run `terragrunt init` interactively the first time.

## Validating the Migration

After migrating each module, run this checklist:

```bash
# 1. Plan should show no changes
terragrunt plan
# Expected: "No changes. Your infrastructure matches the configuration."

# 2. State should be accessible
terragrunt state list
# Should show all expected resources

# 3. Outputs should be intact
terragrunt output
# Should show the same outputs as before migration
```

## Summary

Migrating to Terragrunt is about restructuring how you call Terraform, not rewriting your Terraform code. The modules stay the same. The state stays the same. What changes is the configuration layer on top - how backends are configured, how providers are injected, and how inputs flow through environments. Take it one module at a time, verify each step with `terragrunt plan`, and you'll have a cleaner, more maintainable infrastructure codebase. For more on structuring your Terragrunt project, see our [multi-account AWS guide](https://oneuptime.com/blog/post/2026-02-02-terragrunt-multi-account/view).
