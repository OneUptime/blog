# How to Configure Terraform Backend Partial Configuration for Azure Team Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Backend Configuration, State Management, Team Workflows, Infrastructure as Code, DevOps

Description: Learn how to use Terraform partial backend configuration to manage Azure state storage across environments and teams without hardcoding sensitive details.

---

Terraform state files are the backbone of how Terraform tracks the resources it manages. For teams working on Azure, the state is typically stored in an Azure Storage Account blob. The challenge comes when you have multiple environments, multiple teams, or both. You do not want to hardcode the storage account name, container, or access keys in your Terraform files because those values change across environments and should not be in source control.

Terraform's partial backend configuration solves this by letting you specify some backend settings in the configuration file and the rest at init time. This post covers the patterns and practices for using partial backend configuration effectively in Azure team workflows.

## The Problem with Full Backend Configuration

Here is what a fully specified backend looks like in Terraform:

```hcl
# Do NOT do this in shared code
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstateprod001"
    container_name       = "tfstate"
    key                  = "networking/prod.tfstate"
    # Never store access keys here
  }
}
```

The problems with this approach:

1. The storage account name is hardcoded, so the same code cannot be used for dev, staging, and prod state
2. If you check this into Git, everyone sees your infrastructure details
3. Access keys would need to be in the file or passed via environment variables anyway
4. Changing the backend requires modifying the code

## Partial Backend Configuration Basics

With partial backend configuration, you specify only the backend type in your Terraform files and provide everything else at `terraform init` time.

```hcl
# versions.tf - Only specify the backend type
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }

  # Partial backend configuration - details provided at init time
  backend "azurerm" {}
}
```

Then provide the backend details through one of three methods.

## Method 1: Backend Config Files

Create a `.hcl` file for each environment with the backend settings. These files typically live outside the Terraform module directory or are listed in `.gitignore`.

```hcl
# backends/dev.hcl
resource_group_name  = "rg-terraform-state-dev"
storage_account_name = "sttfstatedev001"
container_name       = "tfstate"
key                  = "networking/terraform.tfstate"
use_oidc             = true
subscription_id      = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
tenant_id            = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
```

```hcl
# backends/prod.hcl
resource_group_name  = "rg-terraform-state-prod"
storage_account_name = "sttfstateprod001"
container_name       = "tfstate"
key                  = "networking/terraform.tfstate"
use_oidc             = true
subscription_id      = "cccccccc-cccc-cccc-cccc-cccccccccccc"
tenant_id            = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
```

Initialize Terraform with the appropriate backend config file.

```bash
# Initialize for the dev environment
terraform init -backend-config=backends/dev.hcl

# Initialize for production
terraform init -backend-config=backends/prod.hcl

# If switching between backends, force reinitialization
terraform init -backend-config=backends/prod.hcl -reconfigure
```

## Method 2: Command-Line Arguments

Pass individual backend settings as arguments. This is useful in CI/CD pipelines where values come from environment variables or pipeline variables.

```bash
# Initialize with command-line arguments
terraform init \
  -backend-config="resource_group_name=rg-terraform-state-prod" \
  -backend-config="storage_account_name=sttfstateprod001" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=networking/terraform.tfstate" \
  -backend-config="use_oidc=true"
```

## Method 3: Environment Variables

Some backend settings can be provided through environment variables. For the Azure backend, the access key can be set via `ARM_ACCESS_KEY`.

```bash
# Set the storage account access key via environment variable
export ARM_ACCESS_KEY="your-storage-account-access-key"

# Or use a SAS token
export ARM_SAS_TOKEN="your-sas-token"

# Then init with just the non-sensitive settings
terraform init \
  -backend-config="resource_group_name=rg-terraform-state-prod" \
  -backend-config="storage_account_name=sttfstateprod001" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=networking/terraform.tfstate"
```

## Recommended Project Structure

Here is a project structure that supports multiple environments with partial backend configuration.

```
infrastructure/
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
  environments/
    dev/
      main.tf           # Calls modules with dev-specific parameters
      variables.tf
      terraform.tfvars
      backend.hcl       # Dev backend configuration
    staging/
      main.tf
      variables.tf
      terraform.tfvars
      backend.hcl
    prod/
      main.tf
      variables.tf
      terraform.tfvars
      backend.hcl
  scripts/
    init.sh             # Helper script for initialization
```

The helper script simplifies switching between environments.

```bash
#!/bin/bash
# scripts/init.sh - Initialize Terraform for a specific environment

set -euo pipefail

ENVIRONMENT="${1:?Usage: init.sh <environment>}"
VALID_ENVS=("dev" "staging" "prod")

# Validate the environment name
if [[ ! " ${VALID_ENVS[*]} " =~ " ${ENVIRONMENT} " ]]; then
    echo "Error: Invalid environment '$ENVIRONMENT'"
    echo "Valid environments: ${VALID_ENVS[*]}"
    exit 1
fi

ENV_DIR="environments/${ENVIRONMENT}"
BACKEND_CONFIG="${ENV_DIR}/backend.hcl"

# Check that the backend config exists
if [ ! -f "$BACKEND_CONFIG" ]; then
    echo "Error: Backend config not found: $BACKEND_CONFIG"
    exit 1
fi

echo "Initializing Terraform for: $ENVIRONMENT"
echo "Backend config: $BACKEND_CONFIG"

# Initialize Terraform
cd "$ENV_DIR"
terraform init -backend-config="backend.hcl" -reconfigure

echo ""
echo "Terraform initialized for $ENVIRONMENT"
echo "Run 'cd $ENV_DIR && terraform plan' to see changes"
```

## CI/CD Pipeline Integration

In CI/CD pipelines, combine partial backend configuration with pipeline variables for maximum flexibility. Here is a GitHub Actions example.

```yaml
# .github/workflows/terraform.yml
name: Terraform Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  terraform:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    environment: ${{ matrix.environment }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Terraform Init
        working-directory: environments/${{ matrix.environment }}
        run: |
          terraform init \
            -backend-config="resource_group_name=${{ vars.TF_STATE_RG }}" \
            -backend-config="storage_account_name=${{ vars.TF_STATE_SA }}" \
            -backend-config="container_name=tfstate" \
            -backend-config="key=${{ matrix.environment }}/terraform.tfstate" \
            -backend-config="use_oidc=true" \
            -backend-config="subscription_id=${{ secrets.TF_STATE_SUBSCRIPTION_ID }}" \
            -backend-config="tenant_id=${{ secrets.AZURE_TENANT_ID }}"

      - name: Terraform Plan
        working-directory: environments/${{ matrix.environment }}
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        working-directory: environments/${{ matrix.environment }}
        run: terraform apply tfplan
```

The `vars.TF_STATE_RG` and `vars.TF_STATE_SA` values are set as GitHub environment variables, which can be different for each environment.

## State Isolation Patterns

There are two common patterns for organizing state files across environments and components.

**Pattern 1: Environment Directories (Recommended)**

Each environment has its own directory and its own state file. This is the approach shown in the project structure above.

```
State files:
  dev/terraform.tfstate       -> sttfstatedev001/tfstate/dev/terraform.tfstate
  staging/terraform.tfstate   -> sttfstatestg001/tfstate/staging/terraform.tfstate
  prod/terraform.tfstate      -> sttfstateprod001/tfstate/prod/terraform.tfstate
```

**Pattern 2: Workspace-Based**

Use Terraform workspaces with the same configuration directory. The workspace name is embedded in the state path.

```hcl
# backend.hcl for workspace-based approach
resource_group_name  = "rg-terraform-state"
storage_account_name = "sttfstate001"
container_name       = "tfstate"
key                  = "networking/terraform.tfstate"
# Terraform automatically adds the workspace name to the key path
```

```bash
# Create and switch workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Switch between them
terraform workspace select prod
terraform plan
```

## Locking and Concurrency

Azure Storage Account blobs support lease-based locking. Terraform uses this automatically to prevent two people or pipelines from modifying the same state simultaneously.

```hcl
# backend.hcl - Locking is enabled by default with Azure blobs
resource_group_name  = "rg-terraform-state-prod"
storage_account_name = "sttfstateprod001"
container_name       = "tfstate"
key                  = "networking/terraform.tfstate"
# No additional configuration needed for locking
```

If a lock gets stuck (for example, a CI/CD pipeline crashes mid-apply), you can manually break it.

```bash
# Force unlock a stuck state (use with caution)
terraform force-unlock <LOCK_ID>
```

## Wrapping Up

Partial backend configuration is essential for any team using Terraform with Azure. It keeps sensitive storage details out of your code, supports multiple environments from the same codebase, and integrates cleanly with CI/CD pipelines. The backend config file approach works best for most teams because the files are simple to manage and easy to version control (minus any secrets). Combined with a clear project structure and a helper script, it makes switching between environments straightforward and reduces the risk of accidentally modifying the wrong environment's state.
