# How to Upgrade OpenTofu from 1.9 to 1.10

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Upgrade, Version Migration, Infrastructure as Code, DevOps

Description: A guide to upgrading OpenTofu from 1.9 to 1.10, with steps for validating the upgrade and taking advantage of new features.

## Introduction

OpenTofu 1.10 continues the project's evolution with new features, performance improvements, and enhanced tooling. This guide covers the upgrade path from 1.9 to 1.10.

## Pre-Upgrade Preparation

```bash
# Confirm current version

tofu version
# OpenTofu v1.9.x on linux_amd64

# Document installed providers
tofu providers

# Backup state
cp terraform.tfstate terraform.tfstate.backup-pre-1.10

# Run current plan to establish baseline
tofu plan -out=baseline-pre-1.10.tfplan
tofu show -json baseline-pre-1.10.tfplan > baseline-pre-1.10.json

# Tag your git repo
git tag -a "pre-tofu-1.10-upgrade" -m "State before OpenTofu 1.10 upgrade"
git push origin --tags
```

## Install OpenTofu 1.10

```bash
# Via tofuenv
tofuenv install latest:^1.10
tofuenv use 1.10.0

# Check
tofu version
# OpenTofu v1.10.0

# Via APT
sudo apt-get update
sudo apt-get install -y tofu

# Via binary
TOFU_VERSION="1.10.0"
curl -fsSL "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip" -o tofu.zip
unzip tofu.zip
sudo mv tofu /usr/local/bin/
```

## Update Version Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}
```

## Update the .opentofu-version File

```bash
# Update version pin
echo "1.10.0" > .opentofu-version

# Verify
cat .opentofu-version
```

## Post-Upgrade Validation

```bash
# Reinitialize working directory
tofu init -upgrade

# Validate configuration syntax
tofu validate

# Check formatting
tofu fmt -recursive -check

# Run a new plan and compare with baseline
tofu plan -out=post-upgrade.tfplan
tofu show -json post-upgrade.tfplan > post-upgrade.json

# Compare plans (should be identical for a clean upgrade)
diff baseline-pre-1.10.json post-upgrade.json
```

## Running Integration Tests

```bash
# Run any existing test files
tofu test

# Run tests with verbose output
tofu test -verbose
```

## Notify CI/CD Pipelines

```yaml
# .github/workflows/terraform.yml - Update OpenTofu version
name: Infrastructure CI

on: [push, pull_request]

jobs:
  tofu:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.10.0"  # Updated from 1.9.x

      - run: tofu init
      - run: tofu validate
      - run: tofu plan
```

## Rollback Procedure

```bash
# Roll back to 1.9 (replace with the specific 1.9.x version you had installed)
tofuenv use 1.9.1
echo "1.9.1" > .opentofu-version

# Revert state if needed
cp terraform.tfstate.backup-pre-1.10 terraform.tfstate

# Git revert version changes
git checkout -- versions.tf .opentofu-version
```

## Conclusion

Upgrading from OpenTofu 1.9 to 1.10 follows the same well-established pattern. With proper preparation - state backups, baseline plans, and version control tagging - the upgrade is low-risk and reversible. Keep CI/CD pipeline configurations updated to reflect the new version, and document the upgrade for team awareness.
