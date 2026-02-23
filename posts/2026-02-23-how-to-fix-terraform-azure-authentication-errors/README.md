# How to Fix Terraform Azure Authentication Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Authentication, Troubleshooting, Infrastructure as Code

Description: Resolve Terraform Azure provider authentication errors including service principal issues, managed identity problems, and Azure CLI credential failures.

---

Authentication errors with the Azure provider in Terraform are some of the most common blockers for teams getting started with Azure infrastructure as code. Unlike AWS, Azure has multiple layers of identity management (Azure AD, subscriptions, tenants) which means there are more places where things can go wrong. This guide covers every common authentication failure and how to fix it.

## What the Errors Look Like

```
Error: building AzureRM Client: obtain subscription() from Azure CLI:
parsing json result from the Azure CLI: waiting for the Azure CLI:
exit status 1

Error: Error building AzureRM Client: Azure CLI Authorization Profile
was not found. Please ensure the Azure CLI is installed and then log-in
with `az login`.

Error: Error building AzureRM Client: Authenticating using the Azure CLI
is only supported as a User (not a Service Principal).

Error: obtaining Authorization Token from the Azure CLI:
Error parsing json result from the Azure CLI
```

## Authentication Methods for the Azure Provider

Terraform's Azure provider supports several authentication methods:

1. Azure CLI
2. Service Principal with client secret
3. Service Principal with client certificate
4. Managed Identity
5. OpenID Connect (OIDC)

Each has different requirements and failure modes. Let us go through them.

## Fix 1: Azure CLI Authentication

This is the simplest method for local development. Terraform uses the credentials from your `az login` session.

### Problem: Not Logged In

```bash
# Log in to Azure
az login

# Verify your login
az account show
```

### Problem: Wrong Subscription Selected

```bash
# List all subscriptions
az account list --output table

# Set the correct subscription
az account set --subscription "your-subscription-id"

# Verify
az account show --query "{Name:name, ID:id, Tenant:tenantId}"
```

### Problem: Azure CLI Not Installed

```bash
# Install Azure CLI on macOS
brew install azure-cli

# Install on Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify installation
az version
```

### Provider Configuration for CLI Auth

```hcl
provider "azurerm" {
  features {}
  # No additional configuration needed for CLI auth
  # Terraform automatically uses your az login session
}
```

## Fix 2: Service Principal Authentication

Service principals are the recommended authentication method for CI/CD pipelines and automated deployments.

### Creating a Service Principal

```bash
# Create a service principal with contributor role
az ad sp create-for-rbac \
  --name "terraform-sp" \
  --role contributor \
  --scopes /subscriptions/your-subscription-id

# Output:
# {
#   "appId": "client-id-here",
#   "displayName": "terraform-sp",
#   "password": "client-secret-here",
#   "tenant": "tenant-id-here"
# }
```

Save these values. You will need them for Terraform configuration.

### Provider Configuration for Service Principal

```hcl
provider "azurerm" {
  features {}

  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id
  subscription_id = var.subscription_id
}
```

Or use environment variables:

```bash
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_TENANT_ID="your-tenant-id"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
```

### Common Service Principal Issues

**Problem: Client secret expired.**

Service principal secrets have an expiration date. If the secret has expired, you need to create a new one:

```bash
# Create a new secret for an existing service principal
az ad sp credential reset --id "your-client-id"
```

**Problem: Service principal does not have the right role.**

```bash
# Check current role assignments
az role assignment list --assignee "your-client-id" --output table

# Add contributor role if missing
az role assignment create \
  --assignee "your-client-id" \
  --role "Contributor" \
  --scope "/subscriptions/your-subscription-id"
```

**Problem: Wrong tenant ID.**

```bash
# Find your tenant ID
az account show --query tenantId --output tsv
```

Make sure this matches the `tenant_id` in your provider configuration or `ARM_TENANT_ID` environment variable.

## Fix 3: Managed Identity Authentication

Managed identities work when Terraform runs on Azure infrastructure (VMs, Container Instances, Azure DevOps hosted agents):

```hcl
provider "azurerm" {
  features {}
  use_msi = true
  subscription_id = var.subscription_id
}
```

### Common Managed Identity Issues

**Problem: Managed identity not enabled on the VM.**

```bash
# Enable system-assigned managed identity
az vm identity assign --name my-vm --resource-group my-rg
```

**Problem: Missing role assignment.**

```bash
# Get the managed identity principal ID
PRINCIPAL_ID=$(az vm identity show --name my-vm --resource-group my-rg --query principalId --output tsv)

# Assign contributor role
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Contributor" \
  --scope "/subscriptions/your-subscription-id"
```

## Fix 4: OIDC Authentication (for GitHub Actions)

OIDC is the modern way to authenticate from GitHub Actions without storing secrets:

```hcl
provider "azurerm" {
  features {}
  use_oidc = true
}
```

### Setting Up OIDC for GitHub Actions

```bash
# Create federated credential for GitHub Actions
az ad app federated-credential create \
  --id "your-app-object-id" \
  --parameters '{
    "name": "github-actions",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:your-org/your-repo:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

GitHub Actions workflow:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

## Debugging Authentication Errors

### Enable Debug Logging

```bash
export TF_LOG=DEBUG
terraform plan 2>&1 | head -200
```

### Test Credentials Outside Terraform

```bash
# For service principal
az login --service-principal \
  --username "$ARM_CLIENT_ID" \
  --password "$ARM_CLIENT_SECRET" \
  --tenant "$ARM_TENANT_ID"

# For CLI auth
az account show
az account get-access-token
```

### Check Environment Variables

```bash
# Make sure all ARM_ variables are set correctly
env | grep ARM_
```

### Verify the Provider Version

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}
```

Older provider versions may not support newer authentication methods. Update if needed:

```bash
terraform init -upgrade
```

## Multiple Subscription Management

If you manage resources across multiple subscriptions:

```hcl
provider "azurerm" {
  features {}
  alias           = "production"
  subscription_id = var.prod_subscription_id
}

provider "azurerm" {
  features {}
  alias           = "staging"
  subscription_id = var.staging_subscription_id
}

resource "azurerm_resource_group" "prod" {
  provider = azurerm.production
  name     = "prod-rg"
  location = "East US"
}
```

## Monitoring Your Azure Infrastructure

After resolving authentication issues, set up monitoring with [OneUptime](https://oneuptime.com) to track your Azure resource health and get alerted when deployments fail. This ensures you catch authentication-related deployment failures early.

## Conclusion

Terraform Azure authentication errors typically come down to missing or incorrect credentials, expired secrets, or wrong subscription/tenant IDs. For local development, `az login` is the easiest method. For CI/CD, use service principals with environment variables or OIDC for GitHub Actions. Always verify your credentials work outside of Terraform first using `az login` or `az account show`, then configure the Terraform provider to match.
