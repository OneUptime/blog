# How to Migrate Terraform 0.12 to 1.x

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Migration, Upgrade, HCL, Infrastructure as Code

Description: Learn how to migrate your Terraform configurations from version 0.12 to 1.x with step-by-step upgrade paths covering syntax changes and state format updates.

---

Terraform 1.x brought stability guarantees, new features, and improved performance. If you are still running Terraform 0.12, migrating to 1.x requires stepping through intermediate versions because each version introduced changes to the configuration language and state format. This guide provides a complete upgrade path from 0.12 to the latest 1.x release.

## Why Upgrade from 0.12

Terraform 0.12 reached end of life and no longer receives security updates or bug fixes. Version 1.x offers significant improvements including import blocks, moved blocks, the check block, provider-defined functions, and the stability guarantee that 1.x configurations will work with all future 1.x releases. Additionally, many providers have dropped support for Terraform versions below 1.0.

## The Upgrade Path

You cannot jump directly from 0.12 to 1.x. Terraform requires a step-by-step upgrade through each minor version:

```text
0.12.x -> 0.13.x -> 0.14.x -> 0.15.x -> 1.0.x -> 1.x (latest)
```

Each step may require configuration changes. Here is how to handle each transition.

## Step 1: Upgrade 0.12 to 0.13

Terraform 0.13 introduced the `required_providers` block with source addresses. Before upgrading, run the 0.13 upgrade tool:

```bash
# First, ensure you are on the latest 0.12.x
terraform version  # Should be 0.12.31

# Download Terraform 0.13.x
# Then run the upgrade command
terraform 0.13upgrade .
```

This command updates your configuration to add the `required_providers` block:

```hcl
# Before (0.12)
provider "aws" {
  region = "us-east-1"
}

# After (0.13) - added required_providers
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

After updating the configuration:

```bash
terraform init
terraform plan  # Verify no unexpected changes
terraform apply # Apply to update state format
```

## Step 2: Upgrade 0.13 to 0.14

Terraform 0.14 introduced the dependency lock file (`.terraform.lock.hcl`) and made `sensitive` variables more strict:

```bash
# Install Terraform 0.14.x
terraform init  # Generates .terraform.lock.hcl
terraform plan  # Verify
```

Key changes in 0.14:

```hcl
# Sensitive variable outputs now require explicit marking
variable "db_password" {
  type      = string
  sensitive = true
}

output "db_connection" {
  value     = "host=${aws_db_instance.main.endpoint} password=${var.db_password}"
  sensitive = true  # Required in 0.14+ when output contains sensitive values
}
```

Commit the lock file to version control:

```bash
git add .terraform.lock.hcl
git commit -m "Add Terraform dependency lock file"
```

## Step 3: Upgrade 0.14 to 0.15

Terraform 0.15 made several breaking changes. The biggest is the removal of several deprecated features:

```bash
# Install Terraform 0.15.x
terraform init
terraform plan
```

Key changes in 0.15:

```hcl
# The "list" and "map" functions were removed
# Before (deprecated)
variable "cidrs" {
  default = list("10.0.0.0/16", "10.1.0.0/16")
}

# After (correct)
variable "cidrs" {
  type    = list(string)
  default = ["10.0.0.0/16", "10.1.0.0/16"]
}

# The "count" meta-argument on modules is now available
module "vpc" {
  count  = var.create_vpc ? 1 : 0
  source = "./modules/vpc"
}
```

## Step 4: Upgrade 0.15 to 1.0

Terraform 1.0 is a continuation of 0.15 with the stability guarantee. This upgrade should be the smoothest:

```bash
# Install Terraform 1.0.x
terraform init
terraform plan  # Should show no changes
```

## Step 5: Upgrade 1.0 to Latest 1.x

Within the 1.x line, upgrades are safe due to the compatibility guarantee:

```bash
# Install the latest 1.x version
terraform init -upgrade
terraform plan
```

New features available in 1.x:

```hcl
# Import blocks (1.5+)
import {
  to = aws_instance.web
  id = "i-0abc123"
}

# Moved blocks (1.1+)
moved {
  from = aws_instance.old_name
  to   = aws_instance.new_name
}

# Check blocks (1.5+)
check "health" {
  data "http" "api" {
    url = "https://api.example.com/health"
  }

  assert {
    condition     = data.http.api.status_code == 200
    error_message = "API is not healthy"
  }
}
```

## Handling Common Upgrade Issues

### Syntax Errors After Upgrade

Some 0.12 syntax patterns do not work in later versions:

```hcl
# 0.12 - interpolation-only expressions (deprecated)
resource "aws_instance" "web" {
  ami = "${var.ami_id}"
}

# 1.x - direct reference (correct)
resource "aws_instance" "web" {
  ami = var.ami_id
}
```

Use `terraform fmt` to clean up:

```bash
# Format and fix common syntax issues
terraform fmt -recursive
```

### State Format Upgrades

Each version may update the state format. Always back up before upgrading:

```bash
# Back up state before each version upgrade
cp terraform.tfstate terraform.tfstate.backup.0.12

# For remote state, pull and back up
terraform state pull > state-backup-0.12.json
```

### Provider Compatibility

Some provider versions require minimum Terraform versions:

```hcl
# Check if your providers support the target Terraform version
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"  # Requires Terraform >= 0.13
    }
  }
}
```

## Automation Script for Step-by-Step Upgrade

```bash
#!/bin/bash
# terraform-upgrade.sh
# Step-by-step Terraform version upgrade

set -e

TERRAFORM_VERSIONS=("0.13.7" "0.14.11" "0.15.5" "1.0.11" "1.9.8")

for version in "${TERRAFORM_VERSIONS[@]}"; do
  echo "=========================================="
  echo "Upgrading to Terraform $version"
  echo "=========================================="

  # Install specific version (using tfenv)
  tfenv install "$version"
  tfenv use "$version"

  # Back up state
  if [ -f terraform.tfstate ]; then
    cp terraform.tfstate "terraform.tfstate.backup.${version}"
  fi

  # Initialize and upgrade
  terraform init -upgrade

  # Run plan
  if terraform plan -detailed-exitcode; then
    echo "No changes detected - upgrade to $version successful"
  else
    echo "Changes detected after upgrading to $version"
    echo "Review the plan output before continuing"
    read -p "Continue? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
      echo "Aborting upgrade"
      exit 1
    fi
    terraform apply -auto-approve
  fi

  echo "Completed upgrade to $version"
  echo ""
done

echo "Upgrade complete! Now on Terraform $(terraform version -json | jq -r '.terraform_version')"
```

## Using tfenv for Version Management

The tfenv tool makes managing multiple Terraform versions easier:

```bash
# Install tfenv
brew install tfenv

# Install specific versions
tfenv install 0.13.7
tfenv install 0.14.11
tfenv install 0.15.5
tfenv install 1.0.11
tfenv install latest

# Switch between versions
tfenv use 0.13.7

# Use a .terraform-version file in your project
echo "1.9.8" > .terraform-version
```

## Testing the Upgrade

Before upgrading production, test thoroughly:

```bash
# Create a temporary copy of your configuration
cp -r production/ upgrade-test/
cd upgrade-test/

# Use a separate state file for testing
# Configure a different backend or use local state

# Run through the upgrade steps
terraform init
terraform plan

# Verify all resources are managed correctly
terraform state list
```

## Best Practices

Never skip version steps in the upgrade path. Back up state at every step. Use tfenv or similar tools to manage multiple Terraform versions. Test upgrades in isolation before applying to production. Update CI/CD pipelines after the upgrade to use the new version. Remove deprecated syntax proactively using `terraform fmt`. Read the changelog for each version you upgrade through.

## Conclusion

Migrating from Terraform 0.12 to 1.x requires stepping through each intermediate version, but the process is well-documented and largely automated. Each step brings new features and improvements. Once you reach 1.x, the stability guarantee means future upgrades will be much smoother. Take the time to upgrade properly, and you will benefit from years of Terraform improvements.

For related guides, see [How to Handle Breaking Changes During Terraform Upgrades](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-breaking-changes-during-terraform-upgrades/view) and [How to Migrate Between Terraform Provider Versions](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-between-terraform-provider-versions/view).
