# How to Version Pin Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module Versioning, Best Practice, Infrastructure as Code, Dependency Management

Description: Learn how to pin module versions in OpenTofu for registry modules and Git-sourced modules to ensure reproducible infrastructure deployments.

## Introduction

Module version pinning ensures that updating a shared module in one place does not accidentally break all configurations that use it. Pinning strategies differ between registry modules (use `version`) and Git-sourced modules (use `ref=`).

## Pinning Registry Modules

```hcl
# Use version constraint for registry modules

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"   # >= 5.0.0, < 6.0.0

  name = "prod-vpc"
  cidr = "10.0.0.0/16"
}

# Exact pin for maximum stability
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "= 20.8.4"   # Exactly this version

  cluster_name = "prod-eks"
}
```

## Pinning Git-Sourced Modules

For modules sourced from Git, use a tag or commit SHA for pinning:

```hcl
# Pin to a Git tag (recommended)
module "vpc" {
  source = "git::https://github.com/my-org/tf-modules.git//modules/vpc?ref=v2.1.0"
}

# Pin to a specific commit SHA (maximum stability - immune to tag overwrites)
module "vpc" {
  source = "git::https://github.com/my-org/tf-modules.git//modules/vpc?ref=abc123def456"
}

# AVOID - unpinned branch reference (changes on every push)
module "vpc" {
  source = "git::https://github.com/my-org/tf-modules.git//modules/vpc?ref=main"
}
```

## Pinning Local Modules

Local modules do not have version pinning - they are referenced by path. Use a monorepo tag or directory versioning pattern:

```hcl
# Local module - version managed by the monorepo tag
module "vpc" {
  source = "../../modules/vpc"  # No version - controlled by repo tag
}
```

## Semantic Versioning for Internal Modules

Follow semantic versioning when releasing internal modules:

```bash
# Major version: breaking change
git tag v3.0.0 -m "BREAKING: renamed subnet_ids to private_subnet_ids"

# Minor version: new feature, backward compatible
git tag v2.3.0 -m "feat: add IPv6 support"

# Patch version: bug fix
git tag v2.2.1 -m "fix: correct route table association"
```

## Updating Module Versions Safely

```bash
# Check what version a module is currently pinned to
grep -r "source\|version" environments/prod/main.tf

# Update to a new version
# 1. Update the version constraint in main.tf
# 2. Run init to download the new version
tofu init -upgrade

# 3. Run plan to see what changes
tofu plan

# 4. If changes are acceptable, apply
tofu apply
```

## Using Dependabot for Automated Module Updates

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: opentofu
    directory: "/environments/prod"
    schedule:
      interval: weekly
    # Creates PRs when registry module versions are updated
```

## Conclusion

Pin registry modules with `version = "~> X.Y"` (pessimistic constraint) and Git modules with `ref=v1.2.3` (tag-based). Avoid branch references for Git modules - they make infrastructure non-reproducible. Use Dependabot or a similar tool to receive automated PRs when pinned versions have updates, so modules stay current without manual tracking.
