# How to Configure Azure Provider with Service Principal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Service Principal, Authentication, AzureRM, CI/CD

Description: Step-by-step guide to creating an Azure service principal and configuring it with the Terraform AzureRM provider for automated deployments and CI/CD pipelines.

---

When you move from running Terraform on your laptop to running it in a CI/CD pipeline, you need a non-interactive authentication method. Azure service principals serve this purpose. A service principal is essentially an identity for your application or automation tool, with specific permissions scoped to what it needs. This post covers creating a service principal and wiring it into Terraform.

## What Is a Service Principal

A service principal is an identity in Azure Active Directory (now called Microsoft Entra ID) that represents an application rather than a user. It has:

- A **client ID** (also called application ID) that identifies it
- A **client secret** or **certificate** that acts as its password
- A **tenant ID** that identifies which Azure AD directory it belongs to
- **Role assignments** that determine what it can do

Think of it like a robot user account with tightly scoped permissions.

## Creating a Service Principal

You can create a service principal using the Azure CLI, PowerShell, or the Azure Portal. The CLI approach is the fastest.

### Using Azure CLI

```bash
# Create a service principal with Contributor role on the subscription
az ad sp create-for-rbac \
  --name "terraform-sp" \
  --role "Contributor" \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID"
```

The output looks like this:

```json
{
  "appId": "12345678-1234-1234-1234-123456789012",
  "displayName": "terraform-sp",
  "password": "your-generated-secret",
  "tenant": "87654321-4321-4321-4321-210987654321"
}
```

Save these values - you will need them for the Terraform configuration. The password is only shown once.

### Scoping Permissions

Granting Contributor on the entire subscription is convenient but broad. For production, scope it down:

```bash
# Contributor on a specific resource group
az ad sp create-for-rbac \
  --name "terraform-sp-project-x" \
  --role "Contributor" \
  --scopes "/subscriptions/SUB_ID/resourceGroups/project-x-rg"

# Multiple scopes
az ad sp create-for-rbac \
  --name "terraform-sp-multi" \
  --role "Contributor" \
  --scopes "/subscriptions/SUB_ID/resourceGroups/rg-1" \
           "/subscriptions/SUB_ID/resourceGroups/rg-2"

# Custom role with limited permissions
az role definition create --role-definition '{
  "Name": "Terraform Deployer",
  "Description": "Can manage resources but not role assignments",
  "Actions": [
    "Microsoft.Resources/*",
    "Microsoft.Compute/*",
    "Microsoft.Network/*",
    "Microsoft.Storage/*"
  ],
  "NotActions": [
    "Microsoft.Authorization/roleAssignments/*"
  ],
  "AssignableScopes": ["/subscriptions/SUB_ID"]
}'

az ad sp create-for-rbac \
  --name "terraform-sp-limited" \
  --role "Terraform Deployer" \
  --scopes "/subscriptions/SUB_ID"
```

## Configuring the Terraform Provider

There are three approaches to passing service principal credentials to Terraform, each with different security tradeoffs.

### Method 1 - Environment Variables (Recommended)

The cleanest approach. Set environment variables and keep your Terraform code credential-free:

```bash
# Export the credentials from the service principal creation output
export ARM_CLIENT_ID="12345678-1234-1234-1234-123456789012"
export ARM_CLIENT_SECRET="your-generated-secret"
export ARM_TENANT_ID="87654321-4321-4321-4321-210987654321"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
```

```hcl
# provider.tf - no credentials in code
provider "azurerm" {
  features {}
  # Provider automatically reads ARM_* environment variables
}
```

This is the recommended method because:
- No secrets in source code
- Easy to set up in CI/CD systems
- Works with secret managers and vault injection

### Method 2 - Provider Block Variables

Pass credentials through Terraform variables:

```hcl
# variables.tf
variable "azure_client_id" {
  description = "Azure service principal client ID"
  type        = string
  sensitive   = true
}

variable "azure_client_secret" {
  description = "Azure service principal client secret"
  type        = string
  sensitive   = true
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
}

variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

# provider.tf
provider "azurerm" {
  features {}

  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
  tenant_id       = var.azure_tenant_id
  subscription_id = var.azure_subscription_id
}
```

Then pass the values securely:

```bash
# Via environment variables
export TF_VAR_azure_client_id="12345678-..."
export TF_VAR_azure_client_secret="secret-value"
export TF_VAR_azure_tenant_id="87654321-..."
export TF_VAR_azure_subscription_id="sub-id-..."

terraform plan
```

### Method 3 - Certificate-Based Authentication

Instead of a client secret, use a certificate. This is more secure because certificates are harder to accidentally leak:

```bash
# Generate a self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout terraform-sp.key \
  -out terraform-sp.crt \
  -days 365 -nodes \
  -subj "/CN=terraform-sp"

# Create PFX file (Azure needs this format)
openssl pkcs12 -export \
  -out terraform-sp.pfx \
  -inkey terraform-sp.key \
  -in terraform-sp.crt \
  -passout pass:

# Create the service principal with the certificate
az ad sp create-for-rbac \
  --name "terraform-sp-cert" \
  --cert @terraform-sp.crt \
  --role "Contributor" \
  --scopes "/subscriptions/SUB_ID"
```

```hcl
# provider.tf
provider "azurerm" {
  features {}

  client_id                   = var.azure_client_id
  client_certificate_path     = var.certificate_path
  client_certificate_password = var.certificate_password
  tenant_id                   = var.azure_tenant_id
  subscription_id             = var.azure_subscription_id
}
```

## CI/CD Integration Examples

### GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
      ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
      ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply tfplan
```

### Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: terraform-credentials  # Variable group with the SP credentials

steps:
  - task: TerraformInstaller@1
    inputs:
      terraformVersion: 'latest'

  - script: |
      export ARM_CLIENT_ID=$(AZURE_CLIENT_ID)
      export ARM_CLIENT_SECRET=$(AZURE_CLIENT_SECRET)
      export ARM_TENANT_ID=$(AZURE_TENANT_ID)
      export ARM_SUBSCRIPTION_ID=$(AZURE_SUBSCRIPTION_ID)
      terraform init
      terraform plan -out=tfplan
    displayName: 'Terraform Plan'

  - script: |
      export ARM_CLIENT_ID=$(AZURE_CLIENT_ID)
      export ARM_CLIENT_SECRET=$(AZURE_CLIENT_SECRET)
      export ARM_TENANT_ID=$(AZURE_TENANT_ID)
      export ARM_SUBSCRIPTION_ID=$(AZURE_SUBSCRIPTION_ID)
      terraform apply tfplan
    displayName: 'Terraform Apply'
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
```

### GitLab CI

```yaml
# .gitlab-ci.yml
variables:
  TF_ROOT: ${CI_PROJECT_DIR}

stages:
  - plan
  - apply

plan:
  stage: plan
  image: hashicorp/terraform:latest
  script:
    - export ARM_CLIENT_ID=$AZURE_CLIENT_ID
    - export ARM_CLIENT_SECRET=$AZURE_CLIENT_SECRET
    - export ARM_TENANT_ID=$AZURE_TENANT_ID
    - export ARM_SUBSCRIPTION_ID=$AZURE_SUBSCRIPTION_ID
    - terraform init
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - tfplan
```

## Rotating Service Principal Secrets

Service principal secrets expire. Plan for rotation:

```bash
# Check current credentials
az ad sp credential list --id "12345678-1234-1234-1234-123456789012"

# Add a new secret (old one still works)
az ad sp credential reset \
  --id "12345678-1234-1234-1234-123456789012" \
  --append

# Update your CI/CD secrets with the new value
# Then remove the old credential
az ad sp credential delete \
  --id "12345678-1234-1234-1234-123456789012" \
  --key-id "old-key-id"
```

Set up reminders to rotate secrets before they expire. Most organizations rotate every 90 to 180 days.

## Troubleshooting

### "Insufficient privileges to complete the operation"

The service principal does not have the required role assignment. Check its permissions:

```bash
az role assignment list --assignee "12345678-1234-1234-1234-123456789012" --output table
```

### "The client with object ID does not have authorization"

This usually means the service principal has permissions at the wrong scope. Verify the scope matches where you are creating resources.

### "AADSTS7000215: Invalid client secret"

The secret has expired or was entered incorrectly. Reset it:

```bash
az ad sp credential reset --id "12345678-1234-1234-1234-123456789012"
```

## Summary

Service principals are the standard way to authenticate Terraform with Azure in automated environments. Create one with `az ad sp create-for-rbac`, scope its permissions to only what Terraform needs, and pass the credentials via environment variables. For production setups, consider certificate-based authentication and implement a secret rotation schedule. The goal is to have just enough permissions for Terraform to do its job, nothing more.
