# How to Migrate from Terraform Enterprise to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform Enterprise, Migration, Infrastructure as Code, HCP Terraform

Description: Learn how to migrate your infrastructure configurations and workflows from Terraform Enterprise to OpenTofu, including state migration, provider updates, and CI/CD changes.

## Introduction

With HashiCorp's license change from MPL to BSL, many teams are evaluating OpenTofu as an open-source alternative for Terraform CLI and language workflows while replacing Terraform Enterprise platform features separately. OpenTofu is a fork of Terraform that remains open-source and maintains compatibility with existing configurations.

## Pre-Migration Assessment

Before migrating, inventory your current usage:

```bash
# Check version constraints in code
grep -r "required_version" . --include="*.tf"

# List Terraform CLI workspaces in the current working directory
terraform workspace list

# List TFE/HCP Terraform workspaces in an organization
curl -H "Authorization: Bearer $TFE_TOKEN" \
  "https://${TFE_HOSTNAME:-app.terraform.io}/api/v2/organizations/my-org/workspaces"

# Check provider versions in use
grep -r "required_providers" . --include="*.tf"

# Check for tfe provider resources and data sources
grep -r "tfe_" . --include="*.tf"
```

Confirm the Terraform version used by each workspace before migrating, because newer Terraform language or state features may require a version-specific migration path.

## Installing OpenTofu

```bash
# macOS
brew install opentofu

# Linux (official standalone installer script)
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
chmod +x install-opentofu.sh
./install-opentofu.sh --install-method standalone
rm -f install-opentofu.sh

# Verify
tofu version
```

## Migrating State

### Option 1: Using Existing State Files

If you have access to state files, initialize OpenTofu with the same backend:

```bash
tofu init
tofu plan  # verify no unexpected changes
```

### Option 2: Migrating from TFE/HCP Terraform

Export state from Terraform Enterprise or HCP Terraform:

```bash
# Pull state from the currently configured cloud or remote backend
terraform state pull > terraform.tfstate

# Or fetch the current state through the API
WORKSPACE_ID=$(curl -sS -H "Authorization: Bearer $TFE_TOKEN" \
  "https://${TFE_HOSTNAME:-app.terraform.io}/api/v2/organizations/my-org/workspaces/my-workspace" \
  | jq -r '.data.id')
STATE_URL=$(curl -sS -H "Authorization: Bearer $TFE_TOKEN" \
  "https://${TFE_HOSTNAME:-app.terraform.io}/api/v2/workspaces/${WORKSPACE_ID}/current-state-version" \
  | jq -r '.data.attributes."hosted-state-download-url"')
curl -sS "$STATE_URL" -o terraform.tfstate
```

Configure a new backend (e.g., S3):

```hcl
terraform {
  backend "s3" {
    bucket = "my-tofu-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Initialize and migrate state to the new backend:

```bash
tofu init -migrate-state
```

If you need to upload the exported state file manually:

```bash
tofu state push terraform.tfstate
```

## Updating Provider Sources

OpenTofu uses the OpenTofu Registry by default, so ensure provider sources are explicit:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Replacing TFE-Specific Resources

If you used the `tfe` provider for workspace management, replace those resources with configuration in your new automation platform or manage them with the TFE/HCP Terraform API until decommissioned.

## Updating CI/CD Pipelines

Replace `terraform` commands with `tofu`:

```yaml
# Before
- run: terraform init && terraform apply -auto-approve

# After
- run: tofu init && tofu apply -auto-approve
```

## Validation

```bash
tofu init
tofu validate
tofu plan
```

Review the plan carefully - it should show no changes if migration was successful.

## Conclusion

Migrating Terraform configurations from Terraform Enterprise workflows to OpenTofu is straightforward for many configurations. The primary work involves state migration, updating CI/CD pipelines, and replacing any TFE provider resources or platform workflows. OpenTofu's compatibility with Terraform configurations means many migrations complete without code changes.
