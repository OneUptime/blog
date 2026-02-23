# How to Handle Terraform CI/CD with Multi-Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Multi-Cloud, AWS, Azure, GCP, DevOps

Description: Set up Terraform CI/CD pipelines that manage infrastructure across AWS, Azure, and GCP with separate authentication, state management, and deployment strategies.

---

Managing infrastructure across multiple cloud providers with Terraform adds layers of complexity to your CI/CD pipeline. You need authentication for each provider, separate state files, coordinated deployments, and a structure that keeps things manageable as the codebase grows.

This post walks through practical patterns for multi-cloud Terraform CI/CD.

## Repository Structure

The first decision is how to organize your multi-cloud Terraform code. The cleanest approach separates by provider:

```
infrastructure/
  aws/
    networking/
      main.tf
      backend.tf
    compute/
      main.tf
      backend.tf
  azure/
    networking/
      main.tf
      backend.tf
    aks/
      main.tf
      backend.tf
  gcp/
    networking/
      main.tf
      backend.tf
    gke/
      main.tf
      backend.tf
  shared/
    dns/          # Multi-cloud DNS
      main.tf
    monitoring/   # Cross-cloud monitoring
      main.tf
```

Each provider directory has its own backend configuration pointing to a different state file:

```hcl
# infrastructure/aws/networking/backend.tf
terraform {
  backend "s3" {
    bucket = "terraform-state-aws"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# infrastructure/azure/networking/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state"
    storage_account_name = "tfstateazure"
    container_name       = "tfstate"
    key                  = "networking/terraform.tfstate"
  }
}

# infrastructure/gcp/networking/backend.tf
terraform {
  backend "gcs" {
    bucket = "terraform-state-gcp"
    prefix = "networking"
  }
}
```

## Multi-Cloud Authentication Pipeline

Each cloud needs its own authentication step. OIDC works with all three:

```yaml
# .github/workflows/terraform-multi-cloud.yml
name: Multi-Cloud Terraform
on:
  pull_request:
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  # Detect which cloud directories changed
  detect:
    runs-on: ubuntu-latest
    outputs:
      aws: ${{ steps.changes.outputs.aws }}
      azure: ${{ steps.changes.outputs.azure }}
      gcp: ${{ steps.changes.outputs.gcp }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect Changes
        id: changes
        run: |
          CHANGED=$(git diff --name-only origin/main...HEAD)

          echo "aws=$(echo "$CHANGED" | grep -q '^infrastructure/aws/' && echo true || echo false)" >> "$GITHUB_OUTPUT"
          echo "azure=$(echo "$CHANGED" | grep -q '^infrastructure/azure/' && echo true || echo false)" >> "$GITHUB_OUTPUT"
          echo "gcp=$(echo "$CHANGED" | grep -q '^infrastructure/gcp/' && echo true || echo false)" >> "$GITHUB_OUTPUT"

  # AWS pipeline
  aws:
    needs: detect
    if: needs.detect.outputs.aws == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        dir: [networking, compute]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      # AWS OIDC authentication
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Plan (AWS)
        working-directory: infrastructure/aws/${{ matrix.dir }}
        run: |
          terraform init
          terraform plan -out=tfplan -no-color 2>&1 | tee plan.txt

  # Azure pipeline
  azure:
    needs: detect
    if: needs.detect.outputs.azure == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        dir: [networking, aks]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      # Azure OIDC authentication
      - name: Configure Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Terraform Plan (Azure)
        working-directory: infrastructure/azure/${{ matrix.dir }}
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_USE_OIDC: "true"
        run: |
          terraform init
          terraform plan -out=tfplan -no-color 2>&1 | tee plan.txt

  # GCP pipeline
  gcp:
    needs: detect
    if: needs.detect.outputs.gcp == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        dir: [networking, gke]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      # GCP Workload Identity Federation
      - name: Configure GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Terraform Plan (GCP)
        working-directory: infrastructure/gcp/${{ matrix.dir }}
        run: |
          terraform init
          terraform plan -out=tfplan -no-color 2>&1 | tee plan.txt
```

## Cross-Cloud Data Sharing

When resources in one cloud need to reference resources in another, use data sources with remote state:

```hcl
# infrastructure/azure/aks/data.tf
# Read AWS networking outputs for VPN peering
data "terraform_remote_state" "aws_networking" {
  backend = "s3"
  config = {
    bucket = "terraform-state-aws"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use AWS VPC CIDR for Azure VNet peering
resource "azurerm_virtual_network" "main" {
  name                = "aks-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.1.0.0/16"]
}

# VPN connection referencing AWS networking details
resource "azurerm_virtual_network_gateway_connection" "aws" {
  name                = "aws-vpn"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  virtual_network_gateway_id = azurerm_virtual_network_gateway.main.id
  type                       = "IPsec"

  # AWS VPN endpoint from remote state
  peer_virtual_network_gateway_id = null
  local_network_gateway_id        = azurerm_local_network_gateway.aws.id

  shared_key = var.vpn_shared_key
}
```

## Deployment Ordering

Some cross-cloud deployments have dependencies. Networking must exist before compute, and AWS resources might need to exist before Azure resources that reference them:

```yaml
# Apply job with ordering
apply:
  if: github.event_name == 'push'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: hashicorp/setup-terraform@v3

    # Step 1: Networking across all clouds (can be parallel)
    - name: Apply AWS Networking
      working-directory: infrastructure/aws/networking
      run: terraform init && terraform apply -auto-approve

    - name: Apply Azure Networking
      working-directory: infrastructure/azure/networking
      run: terraform init && terraform apply -auto-approve

    - name: Apply GCP Networking
      working-directory: infrastructure/gcp/networking
      run: terraform init && terraform apply -auto-approve

    # Step 2: Cross-cloud connectivity (depends on networking)
    - name: Apply VPN Connections
      working-directory: infrastructure/shared/vpn
      run: terraform init && terraform apply -auto-approve

    # Step 3: Compute (depends on networking and connectivity)
    - name: Apply AWS Compute
      working-directory: infrastructure/aws/compute
      run: terraform init && terraform apply -auto-approve

    - name: Apply Azure AKS
      working-directory: infrastructure/azure/aks
      run: terraform init && terraform apply -auto-approve
```

## Shared Modules Across Clouds

Create modules that abstract cloud-specific details:

```hcl
# modules/kubernetes-cluster/variables.tf
variable "provider" {
  type        = string
  description = "Cloud provider: aws, azure, or gcp"
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.provider)
    error_message = "Provider must be aws, azure, or gcp."
  }
}

variable "cluster_name" {
  type = string
}

variable "node_count" {
  type    = number
  default = 3
}

# modules/kubernetes-cluster/main.tf
# Each provider has its own implementation file
# that gets included based on the provider variable
```

## Multi-Cloud State Locking

Each cloud's state uses its own locking mechanism:

```hcl
# AWS uses DynamoDB for locking
terraform {
  backend "s3" {
    bucket         = "terraform-state-aws"
    key            = "networking/terraform.tfstate"
    dynamodb_table = "terraform-locks"
  }
}

# Azure uses blob lease locking (built into azurerm backend)
terraform {
  backend "azurerm" {
    storage_account_name = "tfstateazure"
    container_name       = "tfstate"
    key                  = "networking/terraform.tfstate"
    # Locking is automatic with Azure blob leases
  }
}

# GCP uses Cloud Storage object versioning
terraform {
  backend "gcs" {
    bucket = "terraform-state-gcp"
    prefix = "networking"
    # Locking is automatic with GCS backend
  }
}
```

## Consolidated PR Comments

Post a unified cost and plan summary across all clouds:

```yaml
- name: Post Multi-Cloud Summary
  uses: actions/github-script@v7
  with:
    script: |
      const body = `## Multi-Cloud Terraform Plan Summary

      | Cloud | Directory | Changes | Status |
      |-------|-----------|---------|--------|
      | AWS | networking | 3 to add | Passed |
      | AWS | compute | 1 to change | Passed |
      | Azure | aks | 2 to add | Passed |
      | GCP | gke | No changes | Passed |

      **Estimated Total Cost Impact:** +$342/month

      See individual job logs for detailed plans.`;

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: body
      });
```

## Summary

Multi-cloud Terraform CI/CD requires:

1. Separate directory structure per cloud provider
2. Independent authentication (OIDC) for each provider
3. Cloud-native state backends with proper locking
4. Change detection to only plan/apply affected clouds
5. Dependency ordering for cross-cloud resources
6. Consolidated reporting for visibility across clouds

The key principle is isolation - each cloud's pipeline should be able to run independently while sharing data through remote state when needed. Start with one cloud in your pipeline and add others incrementally. For authentication details per provider, see [Terraform provider authentication in CI/CD](https://oneuptime.com/blog/post/2026-02-23-terraform-provider-authentication-cicd/view).
