# Versioning OpenTofu Modules with Git Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Git, Versioning

Description: Learn how to version your OpenTofu modules using Git tags for reproducible, pinned module references.

Git tags are the most common way to version OpenTofu modules when not using a formal registry. By tagging specific commits, you create stable, reproducible references that won't unexpectedly change when you push new commits.

## Creating Git Tags

```bash
# Create a lightweight tag

git tag v1.0.0

# Create an annotated tag (recommended - includes metadata)
git tag -a v1.0.0 -m "Initial stable release"

# Tag a specific commit
git tag -a v1.0.0 abc1234 -m "Initial stable release"

# Push tags to remote
git push origin v1.0.0

# Push all tags
git push origin --tags
```

## Referencing Tagged Modules in OpenTofu

```hcl
# Using a specific tag
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.1.0"

  cidr_block  = "10.0.0.0/16"
  environment = "production"
}

# Using an annotated tag
module "eks" {
  source = "git::ssh://git@github.com/myorg/terraform-modules.git//modules/eks?ref=v1.5.0"

  cluster_name    = "prod-cluster"
  k8s_version     = "1.29"
  vpc_id          = module.vpc.vpc_id
}
```

## Semantic Versioning Convention

Follow semantic versioning (semver) for your module tags:

```bash
# v{MAJOR}.{MINOR}.{PATCH}

# PATCH - backward-compatible bug fixes
git tag -a v1.0.1 -m "Fix subnet CIDR calculation"

# MINOR - new backward-compatible features
git tag -a v1.1.0 -m "Add support for IPv6"

# MAJOR - breaking changes
git tag -a v2.0.0 -m "Breaking: renamed vpc_id output to id"
```

```hcl
# Pin to exact version for production
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=v2.1.3"
}

# Using a branch reference (use only for development)
module "vpc_dev" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=feature/ipv6"
}
```

## Module Version Management Strategy

```hcl
# versions.tf - centralize version pinning
locals {
  # Update this when you want to upgrade modules
  modules_version = "v3.2.0"
  modules_source  = "git::https://github.com/myorg/tf-modules.git"
}

module "vpc" {
  source = "${local.modules_source}//networking/vpc?ref=${local.modules_version}"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}

module "eks" {
  source = "${local.modules_source}//compute/eks?ref=${local.modules_version}"

  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnet_ids
}
```

## Changelog and Release Notes

````markdown
# CHANGELOG.md

## [3.0.0] - 2026-03-15
### Breaking Changes
- Renamed `subnet_ids` output to `private_subnet_ids` and `public_subnet_ids`
- Removed `az_count` variable - use `availability_zones` list instead

### Migration Guide
```hcl
# Before v3.0.0
module "vpc" {
  source   = "...?ref=v2.x.x"
  az_count = 3
}
# output: module.vpc.subnet_ids

# After v3.0.0
module "vpc" {
  source             = "...?ref=v3.0.0"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
# output: module.vpc.private_subnet_ids
```

## [2.1.0] - 2026-02-01
### Added
- Support for IPv6 CIDR blocks
- VPC flow logs configuration option

## [2.0.1] - 2026-01-15
### Fixed
- Incorrect route table associations in multi-AZ deployments
````

## Automating Releases with GitHub Actions

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate module
        run: |
          tofu init
          tofu validate
          
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: Release ${{ github.ref_name }}
          draft: false
          prerelease: false
```

## Listing Available Tags

```bash
# List all tags
git tag --list

# List tags matching a pattern
git tag --list 'v2.*'

# Show tag details
git show v2.1.0

# List tags with dates
git log --tags --simplify-by-decoration --pretty="format:%d %ai"
```

## Conclusion

Git tags provide a lightweight but effective versioning system for OpenTofu modules. Use annotated tags with semantic versioning, maintain a changelog for breaking changes, and pin module references to specific tags in production configurations. This ensures your infrastructure deployments are reproducible and predictable across all environments.
