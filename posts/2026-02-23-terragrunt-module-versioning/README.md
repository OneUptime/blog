# How to Handle Terragrunt Module Versioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Module Versioning, Infrastructure as Code, DevOps

Description: Learn strategies for versioning Terraform modules used by Terragrunt, including git tags, monorepo patterns, version pinning, and safe upgrade workflows across environments.

---

Module versioning is how you prevent a change to a shared Terraform module from accidentally breaking production. Without versioning, updating a module in one place affects every environment that references it. With proper versioning, you can update dev to the latest module version while production stays on the stable, tested version. Terragrunt makes this straightforward through its `source` attribute.

## Git Tag Versioning

The most common pattern is tagging your Terraform module repository with semantic version tags:

```hcl
# dev/vpc/terragrunt.hcl
terraform {
  source = "git::https://github.com/org/terraform-modules.git//networking/vpc?ref=v2.3.0"
}

# prod/vpc/terragrunt.hcl
terraform {
  source = "git::https://github.com/org/terraform-modules.git//networking/vpc?ref=v2.2.1"
}
```

Dev runs a newer version while production stays on the last known-good release. When v2.3.0 is validated in dev and staging, you update production's ref.

### Creating Tags

```bash
# In your terraform-modules repository
git tag -a v2.3.0 -m "VPC module: add IPv6 support"
git push origin v2.3.0
```

## Branch-Based Versioning

For faster iteration during development, reference branches instead of tags:

```hcl
# For active development, point to a feature branch
terraform {
  source = "git::https://github.com/org/terraform-modules.git//networking/vpc?ref=feature/ipv6"
}
```

This is useful during development but should never be used in staging or production. Branches are mutable - someone could push breaking changes to the branch and your next plan would pick them up.

```hcl
# Good for development
terraform {
  source = "git::https://github.com/org/modules.git//vpc?ref=feature/new-subnets"
}

# Good for production - immutable reference
terraform {
  source = "git::https://github.com/org/modules.git//vpc?ref=v2.2.1"
}
```

## Commit SHA Versioning

For maximum precision, reference a specific commit:

```hcl
terraform {
  source = "git::https://github.com/org/terraform-modules.git//networking/vpc?ref=abc123def456"
}
```

Commit SHAs are immutable and give you a guaranteed reproducible build. The downside is readability - you can't tell at a glance what version you're running.

## Monorepo Module Versioning

If your Terraform modules live in the same repository as your Terragrunt configuration (a monorepo), versioning works differently. You can't use git tags to version individual modules because tags apply to the whole repository.

### Pattern 1: Use Local Paths

```hcl
# Reference modules by local path - they're versioned with the repo
terraform {
  source = "${get_repo_root()}/modules/vpc"
}
```

This means every change to the module affects all environments simultaneously. To add a safety layer, use the PR review process as your version gate.

### Pattern 2: Separate Module Repository

Extract shared modules into their own repository:

```text
# Two repositories:
terraform-modules/          # Shared modules with version tags
  networking/vpc/
  compute/ecs/
  database/rds/

infrastructure/             # Terragrunt configuration
  dev/
    vpc/terragrunt.hcl     # References terraform-modules at specific version
  prod/
    vpc/terragrunt.hcl
```

### Pattern 3: Directory-Based Versioning

Keep versioned copies of modules in directories:

```text
modules/
  vpc/
    v1/                    # Original version
      main.tf
      variables.tf
      outputs.tf
    v2/                    # New version with breaking changes
      main.tf
      variables.tf
      outputs.tf
```

```hcl
# dev uses v2
terraform {
  source = "${get_repo_root()}/modules/vpc/v2"
}

# prod stays on v1
terraform {
  source = "${get_repo_root()}/modules/vpc/v1"
}
```

This approach works but gets unwieldy with many modules. Git tags on a separate repository are generally cleaner.

## Centralized Version Management

Instead of specifying versions in every module, centralize them:

```hcl
# _versions.hcl - Single source of truth for module versions

locals {
  module_versions = {
    vpc          = "v2.3.0"
    ecs          = "v1.8.0"
    rds          = "v3.1.2"
    s3           = "v1.2.0"
    cloudfront   = "v2.0.1"
  }

  modules_repo = "git::https://github.com/org/terraform-modules.git"
}
```

```hcl
# dev/vpc/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

locals {
  versions = read_terragrunt_config("${get_repo_root()}/_versions.hcl")
  vpc_version = local.versions.locals.module_versions.vpc
  modules_repo = local.versions.locals.modules_repo
}

terraform {
  source = "${local.modules_repo}//networking/vpc?ref=${local.vpc_version}"
}
```

Now updating a module version is a single-line change in `_versions.hcl`.

## Per-Environment Version Overrides

Take the centralized approach further with per-environment version files:

```hcl
# _versions/dev.hcl
locals {
  module_versions = {
    vpc = "v2.4.0-rc1"    # Testing release candidate
    ecs = "v1.8.0"
    rds = "v3.1.2"
  }
}

# _versions/prod.hcl
locals {
  module_versions = {
    vpc = "v2.3.0"         # Stable release
    ecs = "v1.8.0"
    rds = "v3.1.2"
  }
}
```

```hcl
# dev/vpc/terragrunt.hcl
locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  env      = local.env_vars.locals.environment
  versions = read_terragrunt_config("${get_repo_root()}/_versions/${local.env}.hcl")
}

terraform {
  source = "git::https://github.com/org/modules.git//networking/vpc?ref=${local.versions.locals.module_versions.vpc}"
}
```

## Version Upgrade Workflow

A safe upgrade workflow looks like this:

### Step 1: Update Version in Dev

```hcl
# Change dev version from v2.3.0 to v2.4.0
# _versions/dev.hcl
locals {
  module_versions = {
    vpc = "v2.4.0"    # Updated
  }
}
```

### Step 2: Plan and Review in Dev

```bash
cd infrastructure/dev/vpc
terragrunt plan
# Review the plan output carefully
```

### Step 3: Apply to Dev

```bash
terragrunt apply
# Run smoke tests
```

### Step 4: Promote to Staging

```hcl
# _versions/staging.hcl
locals {
  module_versions = {
    vpc = "v2.4.0"    # Promoted from dev
  }
}
```

### Step 5: Apply to Staging, Test, Then Production

Repeat the plan-apply-test cycle for each environment.

## Locking Provider Versions Too

Don't forget that provider versions matter alongside module versions. Lock them with the `.terraform.lock.hcl` file:

```bash
# Regenerate lock file after changing module version
cd dev/vpc
terragrunt init -upgrade

# Commit the updated lock file
git add .terraform.lock.hcl
git commit -m "Update VPC module to v2.4.0 and refresh lock file"
```

## Detecting Version Drift

Create a script to check if all environments are using the expected module versions:

```bash
#!/bin/bash
# scripts/check-module-versions.sh

echo "Module versions by environment:"
echo "================================"

for env_dir in infrastructure/*/; do
  env=$(basename "$env_dir")
  echo ""
  echo "Environment: $env"
  grep -r "ref=" "$env_dir" | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    module=$(basename "$(dirname "$file")")
    version=$(echo "$line" | grep -oP 'ref=\K[^"]+')
    printf "  %-20s %s\n" "$module" "$version"
  done
done
```

## Summary

Module versioning boils down to using immutable references (git tags or commit SHAs) for anything beyond development, centralizing version definitions so updates are single-line changes, and promoting versions through environments rather than updating everything at once. The exact approach depends on your team size and risk tolerance - small teams might be fine with local paths in a monorepo, while larger organizations benefit from separate module repositories with semantic versioning. For related topics, see our guides on [Terragrunt with Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-terraform-modules/view) and [Terragrunt version management](https://oneuptime.com/blog/post/2026-02-23-terragrunt-version-management/view).
