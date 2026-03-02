# How to Check Your Terraform Version and Upgrade Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Versioning, Upgrade

Description: Learn how to check your current Terraform version, understand version constraints, and upgrade Terraform safely without breaking your existing infrastructure configurations.

---

Terraform moves fast. New versions come out regularly with bug fixes, new features, and occasionally breaking changes. Knowing how to check your version, pin it for your projects, and upgrade safely is a fundamental part of managing Terraform at any scale.

This guide walks through the full version management lifecycle - from checking what you have to performing safe upgrades.

## Checking Your Current Version

The simplest check:

```bash
# Check the installed Terraform version
terraform version
```

Output:

```
Terraform v1.7.4
on darwin_arm64

Your version of Terraform is out of date! The latest version
is 1.8.0. You can update by downloading from https://www.terraform.io/downloads
```

Terraform also tells you if a newer version is available. If you just need the version number for a script:

```bash
# Get just the version string
terraform version -json | jq -r '.terraform_version'
# Output: 1.7.4

# Or parse the plain output
terraform version | head -1 | cut -d'v' -f2
# Output: 1.7.4
```

The `-json` flag gives you structured output that also includes provider versions:

```bash
terraform version -json
```

```json
{
  "terraform_version": "1.7.4",
  "platform": "darwin_arm64",
  "provider_selections": {
    "registry.terraform.io/hashicorp/aws": "5.35.0",
    "registry.terraform.io/hashicorp/random": "3.6.0"
  },
  "outdated": true
}
```

## Understanding Terraform Version Numbers

Terraform follows semantic versioning: MAJOR.MINOR.PATCH.

| Component | Meaning | Example |
|-----------|---------|---------|
| Major | Breaking changes | 1.x.x to 2.x.x |
| Minor | New features, backward compatible | 1.7.x to 1.8.x |
| Patch | Bug fixes only | 1.7.3 to 1.7.4 |

Patch upgrades are almost always safe. Minor upgrades are usually safe but worth testing. Major upgrades require careful planning and potentially configuration changes.

## Pinning Terraform Versions

Every Terraform project should specify which version it requires. Add this to your `terraform` block:

```hcl
# versions.tf - Pin Terraform and provider versions
terraform {
  # Require Terraform 1.7.x or later, but less than 2.0
  required_version = ">= 1.7.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.35"
    }
  }
}
```

The version constraint syntax supports several operators:

```hcl
# Exact version
required_version = "= 1.7.4"

# Minimum version
required_version = ">= 1.7.0"

# Pessimistic constraint - allows 1.7.x but not 1.8.0
required_version = "~> 1.7.0"

# Range
required_version = ">= 1.7.0, < 1.9.0"

# Multiple constraints
required_version = ">= 1.7.0, != 1.7.3, < 2.0.0"
```

The `~>` (pessimistic constraint) operator is particularly useful:

```hcl
# ~> 1.7.0 means >= 1.7.0 and < 1.8.0 (allows patch updates)
# ~> 1.7   means >= 1.7.0 and < 2.0.0 (allows minor updates)
```

When someone on your team has the wrong version, they get a clear error:

```
Error: Unsupported Terraform Core version

  on versions.tf line 3, in terraform:
   3:   required_version = ">= 1.7.0, < 2.0.0"

This configuration does not support Terraform version 1.5.7. To proceed,
either choose another supported version, or update this version constraint.
```

## Installing Specific Versions

### Using tfenv (Recommended)

`tfenv` is a version manager for Terraform, similar to nvm for Node.js or pyenv for Python:

```bash
# Install tfenv
# macOS
brew install tfenv

# Linux
git clone https://github.com/tfutils/tfenv.git ~/.tfenv
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bashrc

# List available versions
tfenv list-remote

# Install a specific version
tfenv install 1.7.4

# Install the latest version
tfenv install latest

# Switch to a specific version
tfenv use 1.7.4

# List installed versions
tfenv list
```

The best feature of tfenv is the `.terraform-version` file:

```bash
# Create a .terraform-version file in your project root
echo "1.7.4" > .terraform-version

# Now tfenv automatically uses this version when you are in this directory
terraform version
# Terraform v1.7.4
```

This ensures everyone on the team uses the same version for a given project.

### Using asdf

If you already use asdf for managing other tool versions:

```bash
# Add the Terraform plugin
asdf plugin add terraform

# Install a specific version
asdf install terraform 1.7.4

# Set it for the current directory
asdf local terraform 1.7.4

# Set it globally
asdf global terraform 1.7.4
```

### Manual Installation

```bash
# Download a specific version
VERSION="1.7.4"
OS="linux"    # or "darwin" for macOS
ARCH="amd64"  # or "arm64"

curl -LO "https://releases.hashicorp.com/terraform/${VERSION}/terraform_${VERSION}_${OS}_${ARCH}.zip"
unzip "terraform_${VERSION}_${OS}_${ARCH}.zip"
sudo mv terraform /usr/local/bin/
```

## Safe Upgrade Process

Here is a step-by-step process for upgrading Terraform safely.

### Step 1: Read the Changelog

Before upgrading, check what changed. Go to the Terraform releases page or use the CLI:

```bash
# Check the current version
terraform version

# View the changelog for the target version
# https://github.com/hashicorp/terraform/releases
```

Look specifically for:
- Breaking changes
- Deprecated features
- Changes to state file format
- Provider compatibility requirements

### Step 2: Back Up Your State

Always back up state before upgrading. For remote backends, most storage systems (S3, GCS, Azure Blob) have versioning built in. For local state:

```bash
# Back up local state
cp terraform.tfstate terraform.tfstate.backup-pre-upgrade
cp terraform.tfstate.backup terraform.tfstate.backup.backup-pre-upgrade
```

For remote state, you can pull a local copy:

```bash
# Pull remote state to a local file
terraform state pull > terraform.tfstate.backup-pre-upgrade
```

### Step 3: Upgrade in a Branch

Do not upgrade directly on main. Create a branch:

```bash
git checkout -b upgrade-terraform-1.8

# Update the version constraint in versions.tf
# required_version = ">= 1.8.0, < 2.0.0"
```

### Step 4: Install the New Version

```bash
# Using tfenv
tfenv install 1.8.0
tfenv use 1.8.0

# Verify
terraform version
```

### Step 5: Re-initialize

```bash
# Reinitialize with the new version
terraform init -upgrade
```

The `-upgrade` flag tells Terraform to update provider plugins and modules to the latest allowed versions as well.

### Step 6: Run Plan and Compare

```bash
# Run a plan and look for unexpected changes
terraform plan
```

Ideally, you should see "No changes." If the plan shows changes you did not expect, investigate before proceeding. The upgrade may have changed how certain resources are computed.

### Step 7: Test in Non-Production First

```bash
# Apply to dev environment first
terraform -chdir=environments/dev plan -out=tfplan
terraform -chdir=environments/dev apply tfplan

# Run your tests to verify everything works
./run-integration-tests.sh

# If all good, proceed to staging
terraform -chdir=environments/staging plan -out=tfplan
terraform -chdir=environments/staging apply tfplan

# Finally, production
terraform -chdir=environments/production plan -out=tfplan
terraform -chdir=environments/production apply tfplan
```

### Step 8: Update Lock Files and Commit

```bash
# Update the .terraform-version file
echo "1.8.0" > .terraform-version

# Commit everything
git add .terraform-version versions.tf .terraform.lock.hcl
git commit -m "Upgrade Terraform to 1.8.0"
```

## Handling State File Version Changes

Terraform state files have their own version number. When you upgrade Terraform, it may automatically upgrade the state file format. This is a one-way operation - you cannot downgrade the state format.

```bash
# Check the state format version
terraform state pull | jq '.version, .terraform_version'
```

If multiple team members work on the same project, everyone needs to upgrade to the new Terraform version before anyone applies changes. Otherwise, team members on the old version will get errors trying to read the upgraded state.

This is another reason why version pinning with `.terraform-version` and `required_version` is so important.

## Automating Version Checks in CI/CD

```bash
#!/bin/bash
# check-terraform-version.sh
# Verify that the correct Terraform version is installed

REQUIRED_VERSION=$(cat .terraform-version 2>/dev/null)

if [ -z "$REQUIRED_VERSION" ]; then
  echo "WARNING: No .terraform-version file found"
  exit 0
fi

CURRENT_VERSION=$(terraform version -json | jq -r '.terraform_version')

if [ "$CURRENT_VERSION" != "$REQUIRED_VERSION" ]; then
  echo "ERROR: Terraform version mismatch"
  echo "  Required: $REQUIRED_VERSION"
  echo "  Installed: $CURRENT_VERSION"
  echo ""
  echo "Run: tfenv install $REQUIRED_VERSION && tfenv use $REQUIRED_VERSION"
  exit 1
fi

echo "Terraform version OK: $CURRENT_VERSION"
```

## Rolling Back an Upgrade

If an upgrade causes problems:

1. Stop applying changes with the new version
2. Restore the state backup if the state format was upgraded
3. Switch back to the old version
4. Verify the old version can read the state

```bash
# Switch back to the old version
tfenv use 1.7.4

# If state was upgraded and you need to roll back
terraform state push terraform.tfstate.backup-pre-upgrade

# Verify
terraform plan
```

If the state format was already upgraded and you did not back it up, you may need to stay on the new version. This is why state backups before upgrades are non-negotiable.

## Summary

Version management is one of those things that seems boring until it saves you from a production incident. Pin your Terraform version with `required_version` and `.terraform-version`, use tfenv or asdf to manage multiple versions, and follow a structured upgrade process: read the changelog, back up state, upgrade in a branch, test in non-production first, then roll out. Your future self will thank you.
