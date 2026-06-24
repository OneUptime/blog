# How to Upgrade OpenTofu from 1.8 to 1.9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Upgrade, Version Migration, Infrastructure as Code, DevOps

Description: A guide to upgrading OpenTofu from 1.8 to 1.9, covering new features, migration steps, and rollback procedures.

## Introduction

OpenTofu 1.9 builds on previous versions with additional quality-of-life improvements, enhanced provider support, and performance optimizations. This guide covers the upgrade process from 1.8 to 1.9.

## Pre-Upgrade Checklist

```bash
# Verify current version

tofu version
# OpenTofu v1.8.x

# Backup state files
cp terraform.tfstate terraform.tfstate.backup-pre-1.9

# Create a pre-upgrade plan snapshot
tofu plan -out=pre-1.9-snapshot.tfplan

# Commit current working state
git status && git add -A
git commit -m "Snapshot before upgrading to OpenTofu 1.9"
```

## Install OpenTofu 1.9

```bash
# Using tofuenv
tofuenv install 1.9.0
tofuenv use 1.9.0
tofu version

# Using package manager (APT)
sudo apt-get update && sudo apt-get upgrade tofu

# Using binary download
TOFU_VERSION="1.9.0"
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"
sudo mv tofu /usr/local/bin/tofu
```

## Update Version Constraints

```hcl
# versions.tf
terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}
```

## Post-Upgrade Steps

```bash
# Reinitialize to update providers if needed
tofu init -upgrade

# Validate all configurations
tofu validate

# Run a plan to ensure no unexpected changes
tofu plan

# Run fmt to fix any style changes
tofu fmt -recursive -check

# Apply formatting
tofu fmt -recursive
```

## Testing the Upgrade

```bash
# Run the test suite if you have tofu tests
tofu test

# Run in a test workspace first
tofu workspace new upgrade-test
tofu plan
tofu apply -auto-approve

# Verify expected outputs
tofu output

# Clean up test workspace
tofu workspace select default
tofu workspace delete upgrade-test
```

## Rollback if Needed

```bash
# Quick rollback using tofuenv
tofuenv use 1.8.x

# Restore state backup if state was modified
cp terraform.tfstate.backup-pre-1.9 terraform.tfstate

# Revert version constraint in code
git checkout -- versions.tf

# Re-initialize with old version
tofu init
```

## Updating .opentofu-version

```bash
# Update the project version file
echo "1.9.0" > .opentofu-version

# Commit the update
git add .opentofu-version
git commit -m "Update OpenTofu version pin to 1.9.0"
```

## Communicating the Upgrade to Your Team

````bash
# Create an upgrade guide for your team
cat > UPGRADE-1.9.md <<'EOF'
# Upgrading to OpenTofu 1.9.0

## Required Actions
1. Install OpenTofu 1.9.0:
   ```
   tofuenv install 1.9.0
   tofuenv use 1.9.0
   ```

2. Verify version:
   ```
   tofu version  # should show v1.9.0
   ```

3. Re-initialize your working directory:
   ```
   tofu init -upgrade
   ```

## No Breaking Changes
This upgrade has no breaking changes for existing configurations.
EOF
````

## Conclusion

Upgrading from OpenTofu 1.8 to 1.9 is a low-risk operation for most infrastructure projects. The version increments bring incremental improvements without significant breaking changes. Following the pre-upgrade checklist and maintaining state backups ensures a smooth transition. Always validate in non-production environments before upgrading production infrastructure tooling.
