# How to Use tofu version to Check Your Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu version to check which version of OpenTofu is installed and verify provider versions.

## Introduction

`tofu version` displays the installed OpenTofu version and the versions of all providers currently installed in the `.terraform` directory. It is useful for debugging, verifying installations, and ensuring version compatibility across team members and CI/CD environments.

## Basic Usage

```bash
tofu version

# Output:

# OpenTofu v1.6.2
# on darwin_arm64
# + provider registry.opentofu.org/hashicorp/aws v5.31.0
# + provider registry.opentofu.org/hashicorp/random v3.6.0
```

## JSON Output

```bash
tofu version -json

# Output:
# {
#   "terraform_version": "1.6.2",
#   "platform": "darwin_arm64",
#   "provider_selections": {
#     "registry.opentofu.org/hashicorp/aws": "5.31.0",
#     "registry.opentofu.org/hashicorp/random": "3.6.0"
#   },
#   "terraform_outdated": false
# }
```

## Extract Version in Scripts

```bash
# Get just the OpenTofu version number
TOFU_VERSION=$(tofu version -json | jq -r '.terraform_version')
echo "Using OpenTofu $TOFU_VERSION"

# Check if outdated
IS_OUTDATED=$(tofu version -json | jq -r '.terraform_outdated')
if [ "$IS_OUTDATED" = "true" ]; then
  echo "Warning: A newer version of OpenTofu is available"
fi
```

## Enforcing Minimum Version in Configuration

```hcl
# terraform.tf
terraform {
  required_version = ">= 1.6.0"
}
```

OpenTofu will error if the installed version doesn't meet this constraint:

```bash
tofu plan
# Error: Unsupported OpenTofu Core version
# This configuration does not support OpenTofu version 1.5.0.
# To proceed, either choose another supported OpenTofu version or
# update this configuration's version constraint.
```

## Version Constraint Operators

```hcl
terraform {
  required_version = "~> 1.6.0"   # 1.6.x only
  # or
  required_version = ">= 1.6, < 2.0"  # Explicit range
  # or
  required_version = "= 1.6.2"    # Exact version (pin strictly)
}
```

## CI/CD Version Verification

```bash
# Verify required version is installed in CI
REQUIRED="1.6.0"
INSTALLED=$(tofu version -json | jq -r '.terraform_version')

if [[ "$(printf '%s\n' "$REQUIRED" "$INSTALLED" | sort -V | head -1)" != "$REQUIRED" ]]; then
  echo "Error: OpenTofu $INSTALLED < required $REQUIRED"
  exit 1
fi
echo "Version check passed: $INSTALLED"
```

## Installing a Specific Version

```bash
# Using tofuenv (version manager)
tofuenv install 1.6.2
tofuenv use 1.6.2

# Verify
tofu version
# OpenTofu v1.6.2
```

## Version Without Providers (outside initialized directory)

```bash
# Run from any directory
tofu version
# OpenTofu v1.6.2
# on linux_amd64

# (No provider versions shown if not in an initialized project)
```

## Conclusion

`tofu version` provides essential version information for debugging and compatibility verification. Use `-json` output in scripts to extract version numbers and check for updates. Always declare `required_version` in your configuration to enforce compatibility and prevent accidental use of incompatible OpenTofu versions. In CI/CD, verify the version before running init or plan to catch environment mismatches early.
