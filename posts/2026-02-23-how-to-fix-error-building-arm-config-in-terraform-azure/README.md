# How to Fix Error Building ARM Config in Terraform Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, ARM, Troubleshooting, Infrastructure as Code

Description: Resolve the Error Building ARM Config message in Terraform Azure provider, caused by missing environment variables, incorrect provider configuration, or Azure API issues.

---

The "Error building ARM config" message is a generic error from the Terraform Azure provider that indicates something went wrong during the Azure Resource Manager client initialization. It is a wrapper error that usually has a more specific sub-message telling you what actually failed. The trick is reading the full error message to find the real cause.

## What the Error Looks Like

The error can appear in several forms:

```
Error: building AzureRM Client: please ensure you have installed
Azure CLI version 2.0.79 or newer

Error: building AzureRM Client: obtain subscription() from Azure CLI:
parsing json result from the Azure CLI

Error: building AzureRM Client: Error building account:
getting authenticated object ID: Error listing Service Principals

Error: building AzureRM Client: Authenticating using a Service
Principal with a Client Secret: Error obtaining Authorization Token
from the Azure Active Directory: Error reading body
```

Each variant points to a different root cause.

## Common Causes and Fixes

### 1. Azure CLI Version Too Old

The Azure provider requires a minimum version of the Azure CLI:

```bash
# Check your current version
az version

# Update on macOS
brew update && brew upgrade azure-cli

# Update on Ubuntu/Debian
sudo apt-get update && sudo apt-get install --only-upgrade azure-cli

# Update on Windows
az upgrade
```

After updating, log in again:

```bash
az login
az account show
```

### 2. Azure CLI Session Expired

If your Azure CLI session has expired, the provider cannot retrieve credentials:

```bash
# Check if your session is valid
az account get-access-token

# If it fails, re-login
az login

# For service principals
az login --service-principal -u $ARM_CLIENT_ID -p $ARM_CLIENT_SECRET --tenant $ARM_TENANT_ID
```

### 3. Missing or Incorrect Environment Variables

When using service principal authentication, all four environment variables must be set correctly:

```bash
# All four are required
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_TENANT_ID="your-tenant-id"
export ARM_SUBSCRIPTION_ID="your-subscription-id"

# Verify they are set
echo "Client ID: $ARM_CLIENT_ID"
echo "Tenant ID: $ARM_TENANT_ID"
echo "Subscription ID: $ARM_SUBSCRIPTION_ID"
echo "Client Secret: ${ARM_CLIENT_SECRET:0:5}..."  # Only show first 5 chars
```

A common mistake is having extra whitespace or newlines in the values:

```bash
# WRONG - trailing newline from command substitution
export ARM_SUBSCRIPTION_ID=$(az account show --query id)
# This may include quotes: "your-sub-id"

# CORRECT - strip quotes and whitespace
export ARM_SUBSCRIPTION_ID=$(az account show --query id --output tsv)
```

### 4. Provider Version Mismatch

Different versions of the Azure provider have different requirements and features:

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.0"
}

provider "azurerm" {
  features {}
}
```

If you upgraded the provider and started seeing errors:

```bash
# Remove old provider and reinitialize
rm -rf .terraform
rm .terraform.lock.hcl
terraform init
```

### 5. Missing features Block

The Azure provider requires a `features` block, even if it is empty:

```hcl
# WRONG - missing features block
provider "azurerm" {
  subscription_id = var.subscription_id
}

# CORRECT
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

This is a requirement since version 2.0 of the Azure provider. Without it, you will get a configuration error.

### 6. Subscription Not Accessible

The subscription ID might be wrong, or the service principal might not have access to it:

```bash
# List accessible subscriptions
az account list --output table

# Verify subscription access with service principal
az login --service-principal -u $ARM_CLIENT_ID -p $ARM_CLIENT_SECRET --tenant $ARM_TENANT_ID
az account list --output table
```

If the subscription does not appear in the list, the service principal needs to be granted access:

```bash
az role assignment create \
  --assignee "$ARM_CLIENT_ID" \
  --role "Contributor" \
  --scope "/subscriptions/$ARM_SUBSCRIPTION_ID"
```

### 7. Network or Proxy Issues

If you are behind a corporate proxy, the provider might not be able to reach Azure APIs:

```bash
# Set proxy environment variables
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="http://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1,.company.com"
```

Also check if your firewall allows connections to Azure AD and management endpoints:

- `login.microsoftonline.com`
- `management.azure.com`
- `graph.microsoft.com`

### 8. Azure Active Directory Issues

Sometimes Azure AD itself is having issues, or the tenant configuration is unusual:

```bash
# Test Azure AD authentication directly
az account get-access-token --resource https://management.azure.com/
```

If this fails with a specific error, it points to an Azure AD issue rather than a Terraform issue.

### 9. Conflicting Provider Configurations

If you have multiple Azure provider configurations, conflicts can cause the error:

```hcl
# Make sure aliases are used correctly
provider "azurerm" {
  features {}
  subscription_id = var.primary_subscription
}

provider "azurerm" {
  features {}
  alias           = "secondary"
  subscription_id = var.secondary_subscription
}

# Resources must specify which provider to use
resource "azurerm_resource_group" "primary" {
  name     = "primary-rg"
  location = "East US"
}

resource "azurerm_resource_group" "secondary" {
  provider = azurerm.secondary
  name     = "secondary-rg"
  location = "West US"
}
```

## Step-by-Step Debugging

**Step 1: Enable debug logging.**

```bash
export TF_LOG=DEBUG
terraform plan 2>&1 | tee terraform-debug.log
```

Look at the first error in the output. The debug log shows the exact API call that failed and the response from Azure.

**Step 2: Test Azure connectivity.**

```bash
# Test basic connectivity
curl -s https://management.azure.com/
# Should return a JSON response about authentication

# Test Azure AD
curl -s https://login.microsoftonline.com/$ARM_TENANT_ID/.well-known/openid-configuration
# Should return JSON with Azure AD endpoints
```

**Step 3: Verify credentials independently.**

```bash
# Test with Azure CLI
az login --service-principal \
  -u "$ARM_CLIENT_ID" \
  -p "$ARM_CLIENT_SECRET" \
  --tenant "$ARM_TENANT_ID"

az account set --subscription "$ARM_SUBSCRIPTION_ID"
az group list --output table
```

If this works, your credentials are valid and the issue is in the Terraform configuration.

**Step 4: Simplify the provider.**

Start with the most basic configuration and add complexity:

```hcl
# Start with just CLI auth
provider "azurerm" {
  features {}
}
```

If this works, add subscription_id, then service principal credentials, one at a time.

## Complete Working Examples

### CLI Authentication (Development)

```hcl
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "example" {
  name     = "example-rg"
  location = "East US"
}
```

### Service Principal Authentication (CI/CD)

```hcl
provider "azurerm" {
  features {}
  # Credentials from ARM_ environment variables
}

resource "azurerm_resource_group" "example" {
  name     = "example-rg"
  location = "East US"
}
```

## Monitoring Azure Deployments

After resolving the configuration error, set up monitoring with [OneUptime](https://oneuptime.com) to track your Terraform deployments to Azure. Getting alerts for deployment failures helps you catch credential expiration and permission issues before they block your team.

## Conclusion

The "Error building ARM config" is a generic wrapper around more specific authentication and configuration errors. Always read the full error message, as the text after "Error building ARM config:" tells you the actual problem. The most common causes are expired credentials, missing environment variables, old Azure CLI versions, and missing `features {}` blocks. Debug by testing credentials with the Azure CLI first, then working through the Terraform configuration step by step.
