# How to Migrate from Terraform to OpenTofu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Migration, Infrastructure as Code, DevOps

Description: A complete guide to migrating your infrastructure from HashiCorp Terraform to OpenTofu, covering state migration, provider compatibility, CI/CD updates, and team transition planning.

---

When HashiCorp changed Terraform's license from MPL 2.0 to BSL 1.1 in August 2023, the community responded by forking the project into OpenTofu under the Linux Foundation. If you have decided to make the switch, the good news is that OpenTofu was designed to be a drop-in replacement for Terraform. The migration is straightforward for most projects, but there are some details you need to get right.

## Before You Start

Assess your current Terraform setup:

```bash
# Check your Terraform version
terraform version

# List all workspaces
terraform workspace list

# Check your backend configuration
grep -r "backend" *.tf

# List providers in use
terraform providers
```

OpenTofu 1.6.x is compatible with Terraform 1.6.x configurations. If you are running Terraform 1.5 or earlier, the compatibility is even better since OpenTofu forked at that point. If you are on a newer Terraform version, check the OpenTofu compatibility documentation for any gaps.

## Step 1: Install OpenTofu

Install OpenTofu alongside Terraform so you can test without removing your existing setup:

```bash
# macOS
brew install opentofu

# Linux (Debian/Ubuntu)
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh | sh -s -- --install-method standalone

# Verify
tofu --version
```

## Step 2: Back Up Everything

Before touching any state files, create backups:

```bash
# Backup local state
cp terraform.tfstate terraform.tfstate.pre-migration
cp terraform.tfstate.backup terraform.tfstate.backup.pre-migration

# For remote state, pull a local copy
terraform state pull > state-backup.json

# Backup your configuration files
tar -czf terraform-config-backup.tar.gz *.tf *.tfvars
```

If you use remote state with S3, make sure versioning is enabled on the bucket. If you use Terraform Cloud, export your state before migrating.

## Step 3: Update Configuration Files

The configuration syntax is identical between Terraform and OpenTofu for all standard features. The main changes are in the naming:

```hcl
# Before (Terraform)
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

# After (OpenTofu) - same syntax works!
# Optionally update the version constraint
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Note that OpenTofu still uses the `terraform {}` block name for backward compatibility. You do not need to rename it.

## Step 4: Initialize with OpenTofu

Run `tofu init` against your existing configuration:

```bash
# Initialize OpenTofu
tofu init

# This will:
# - Download providers from the OpenTofu registry
# - Configure the backend
# - Set up the working directory
```

OpenTofu has its own registry at registry.opentofu.org that mirrors most providers from the Terraform registry. For the majority of providers, this just works.

If you see provider download errors, you may need to configure the provider source explicitly:

```hcl
terraform {
  required_providers {
    # Most hashicorp/* providers work directly
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Community providers also work
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}
```

## Step 5: Validate with a Plan

Run a plan to verify that OpenTofu reads your state correctly and produces the same results as Terraform:

```bash
# Run a plan
tofu plan

# You should see "No changes" if your infrastructure is up to date
# If you see unexpected changes, investigate before proceeding
```

Compare the OpenTofu plan output with a Terraform plan:

```bash
# Generate plans from both tools
terraform plan -out=tf-plan.bin
terraform show -json tf-plan.bin > tf-plan.json

tofu plan -out=tofu-plan.bin
tofu show -json tofu-plan.bin > tofu-plan.json

# Compare the resource changes
diff <(jq '.resource_changes' tf-plan.json) <(jq '.resource_changes' tofu-plan.json)
```

## Step 6: Migrate from Terraform Cloud

If you are using Terraform Cloud (now HCP Terraform), migration requires more steps since Terraform Cloud is a proprietary service:

```bash
# Pull state from Terraform Cloud
terraform state pull > local-state.json

# Update your backend configuration to use a different remote backend
# For example, switch to S3:
```

```hcl
terraform {
  backend "s3" {
    bucket         = "my-opentofu-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opentofu-locks"
    encrypt        = true
  }
}
```

```bash
# Initialize OpenTofu with the new backend
tofu init

# When prompted, migrate the state to the new backend
# Type "yes" to confirm

# Verify the state was migrated
tofu state list
```

## Step 7: Update CI/CD Pipelines

Replace `terraform` with `tofu` in your CI/CD configuration:

```yaml
# GitHub Actions - Before
- name: Terraform Init
  run: terraform init
- name: Terraform Plan
  run: terraform plan
- name: Terraform Apply
  run: terraform apply -auto-approve

# GitHub Actions - After
- name: Install OpenTofu
  uses: opentofu/setup-opentofu@v1
  with:
    tofu_version: 1.8.0
- name: OpenTofu Init
  run: tofu init
- name: OpenTofu Plan
  run: tofu plan
- name: OpenTofu Apply
  run: tofu apply -auto-approve
```

For GitLab CI:

```yaml
# .gitlab-ci.yml
image: ghcr.io/opentofu/opentofu:1.8.0

stages:
  - plan
  - apply

plan:
  stage: plan
  script:
    - tofu init
    - tofu plan -out=planfile
  artifacts:
    paths:
      - planfile

apply:
  stage: apply
  script:
    - tofu init
    - tofu apply planfile
  when: manual
  dependencies:
    - plan
```

## Step 8: Update Wrapper Scripts and Aliases

If your team uses wrapper scripts or shell aliases:

```bash
# Update aliases in .bashrc or .zshrc
# Option 1: Create a terraform alias pointing to tofu
alias terraform='tofu'

# Option 2: Use tofu directly (recommended for clarity)
alias tf='tofu'

# Update any wrapper scripts
# Before:
# terraform -chdir="$ENVIRONMENT" plan
# After:
# tofu -chdir="$ENVIRONMENT" plan
```

## Step 9: Handle .terraform.lock.hcl

The dependency lock file works the same way in OpenTofu:

```bash
# The lock file is compatible between Terraform and OpenTofu
# You may need to update it if provider hashes differ
tofu init -upgrade

# Commit the updated lock file
git add .terraform.lock.hcl
git commit -m "Update lock file for OpenTofu migration"
```

## Step 10: Team Communication and Training

The technical migration is one part; the team transition is another. Here is a checklist:

- Update internal documentation to reference `tofu` commands instead of `terraform`
- Update runbooks and incident response procedures
- Notify the team about the switch with a timeline
- Run a test migration on a non-production environment first
- Keep Terraform installed for a transition period so people can compare outputs

## Potential Issues and Solutions

**Provider not found in OpenTofu registry**: Some providers may not be in the OpenTofu registry yet. You can configure direct downloads:

```hcl
provider_installation {
  direct {
    exclude = []
  }
}
```

**State file version mismatch**: If you upgraded Terraform past the version OpenTofu supports, the state file format may be incompatible. Downgrade Terraform first, run an apply, then migrate to OpenTofu.

**Module registry references**: Modules sourced from `registry.terraform.io` will automatically be resolved by OpenTofu. But if you have hardcoded references, update them:

```hcl
# Both of these work in OpenTofu
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"  # Works
  version = "5.1.0"
}
```

## Rollback Plan

If something goes wrong, rolling back is simple:

```bash
# Restore state backup
cp terraform.tfstate.pre-migration terraform.tfstate

# Re-initialize with Terraform
terraform init

# Verify
terraform plan
```

The migration from Terraform to OpenTofu is one of the easier infrastructure migrations you will do. The projects are compatible enough that for most teams, it is a matter of replacing the binary and updating CI/CD pipelines.

For more OpenTofu guides, check out [How to Understand OpenTofu vs Terraform Differences](https://oneuptime.com/blog/post/2026-02-23-understand-opentofu-vs-terraform-differences/view).
