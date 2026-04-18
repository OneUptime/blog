# How to Version Pin Providers in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provider Versioning, Best Practice, Infrastructure as Code, Dependency Management

Description: Learn how to pin provider versions in OpenTofu using version constraints and the dependency lock file to ensure reproducible, stable infrastructure deployments.

## Introduction

Provider version pinning ensures that everyone on your team - and every CI/CD pipeline - uses the same provider binary. Without pinning, `tofu init` can silently upgrade providers between runs, introducing breaking changes.

## Version Constraint Syntax

OpenTofu supports several constraint operators:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"    # >= 5.0.0, < 6.0.0 (recommended for most cases)
    }
    google = {
      source  = "hashicorp/google"
      version = ">= 5.20, < 6.0"  # Explicit range
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "= 3.98.0"   # Exact pin - maximum stability, less flexibility
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"     # >= 3.6.0, < 4.0.0
    }
  }
}
```

## Recommended Pinning Strategy

| Environment | Strategy | Example |
|---|---|---|
| Production | Pessimistic constraint operator | `~> 5.40.0` (allows 5.40.x only) |
| Staging | Minor version range | `~> 5.0` (allows 5.x.x) |
| Development | Loose range | `>= 5.0, < 6.0` |
| CI validation | Exact pin | `= 5.40.0` |

## The Dependency Lock File

After running `tofu init`, the lock file records the exact resolved version:

```hcl
# .terraform.lock.hcl - ALWAYS commit this file

provider "registry.opentofu.org/hashicorp/aws" {
  version     = "5.40.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abc123...",
    "zh:def456...",
  ]
}
```

The lock file guarantees exact version reproduction even when the constraint allows multiple versions.

## Upgrading Providers Deliberately

```bash
# Upgrade all providers to the latest version allowed by constraints
tofu init -upgrade

# Refresh lock entries for a specific provider (after changing its constraint)
tofu providers lock registry.opentofu.org/hashicorp/aws

# Check what changed in the lock file
git diff .terraform.lock.hcl
```

## Adding Lock File Checksums for All Platforms

In CI/CD, ensure the lock file has checksums for all target platforms:

```bash
# Add checksums for Linux (CI), macOS (dev), and Windows (dev)
tofu providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  -platform=darwin_amd64

git add .terraform.lock.hcl
git commit -m "chore: add multi-platform provider checksums"
```

## Enforcing Lock File in CI

```bash
# In CI, use -lockfile=readonly to fail if the lock file is out of sync
tofu init -lockfile=readonly

# This prevents CI from silently upgrading providers
```

## Checking Provider Versions

```bash
# Show all installed provider versions
tofu version

# Detailed provider info
tofu providers
```

## Conclusion

Version pin all providers using the pessimistic constraint operator (`~>`) for production configurations, always commit the `.terraform.lock.hcl` file, use `tofu init -upgrade` for deliberate version upgrades, and enforce `-lockfile=readonly` in CI to prevent accidental upgrades. Regular scheduled dependency updates (monthly) keep you on supported versions without accumulating too much technical debt.
