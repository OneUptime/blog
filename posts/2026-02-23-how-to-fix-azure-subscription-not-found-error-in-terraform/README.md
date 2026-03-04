# How to Fix Azure Subscription Not Found Error in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Subscriptions, Troubleshooting, Infrastructure as Code

Description: Resolve the subscription not found error in Terraform Azure provider caused by incorrect subscription IDs, permission issues, or multi-tenant configurations.

---

The "subscription not found" error in Terraform with Azure happens when the provider cannot locate or access the Azure subscription you specified. This blocks all operations because every Azure resource must belong to a subscription. The error can be caused by a wrong subscription ID, insufficient permissions, or a multi-tenant configuration issue.

## What the Error Looks Like

```text
Error: building AzureRM Client: obtain subscription() from Azure CLI:
subscription was not found

Error: Error building AzureRM Client: Error getting subscription:
SubscriptionNotFound: The subscription '00000000-0000-0000-0000-000000000000'
could not be found.

Error: Subscription not found: The subscription
'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' could not be found.
```

## Common Causes and Fixes

### 1. Wrong Subscription ID

The most common cause is a typo or incorrect subscription ID. Azure subscription IDs are UUIDs, and even one wrong character will cause this error:

```bash
# Find your correct subscription ID
az account list --output table

# Output shows:
# Name             CloudName    SubscriptionId                        TenantId
# ---------------  -----------  ------------------------------------  --------
# My Subscription  AzureCloud   12345678-1234-1234-1234-123456789012  tenant-id
```

Make sure the ID in your Terraform configuration matches exactly:

```hcl
provider "azurerm" {
  features {}
  subscription_id = "12345678-1234-1234-1234-123456789012"  # Must be exact
}
```

Or in environment variables:

```bash
# Make sure there are no extra spaces or newlines
export ARM_SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"
```

### 2. Not Logged Into the Right Account

If you are using Azure CLI authentication, you might be logged into a different account or tenant:

```bash
# Check your current login
az account show

# List all available subscriptions
az account list --output table

# If you do not see the subscription, log in again
az login

# Or log in to a specific tenant
az login --tenant "your-tenant-id"
```

### 3. Subscription Is in a Different Tenant

If your organization has multiple Azure AD tenants, the subscription might be in a different tenant than the one you are authenticated to:

```bash
# List subscriptions across all accessible tenants
az account list --all --output table

# Switch to the correct tenant
az login --tenant "correct-tenant-id"
az account set --subscription "your-subscription-id"
```

For service principals, make sure the tenant ID matches the tenant where the subscription lives:

```bash
export ARM_TENANT_ID="correct-tenant-id"  # Must match the subscription's tenant
```

### 4. Service Principal Does Not Have Access

The service principal might not have any role assignment on the subscription:

```bash
# Check role assignments for the service principal
az role assignment list \
  --assignee "$ARM_CLIENT_ID" \
  --scope "/subscriptions/$ARM_SUBSCRIPTION_ID" \
  --output table
```

If no results show up, grant access:

```bash
# Grant contributor role
az role assignment create \
  --assignee "$ARM_CLIENT_ID" \
  --role "Contributor" \
  --scope "/subscriptions/$ARM_SUBSCRIPTION_ID"
```

Note that the person running this command needs Owner or User Access Administrator permissions on the subscription.

### 5. Subscription Has Been Disabled or Deleted

Azure subscriptions can be disabled due to payment issues or administrative action:

```bash
# Check subscription state
az account show --subscription "your-subscription-id" --query "state"
```

Possible states:

- **Enabled** - Working normally
- **Warned** - Payment issue, but still accessible
- **PastDue** - Payment is past due
- **Disabled** - Subscription is disabled (pay issues or admin action)
- **Deleted** - Subscription has been deleted

If the subscription is disabled, contact your Azure billing administrator or check the Azure portal for payment issues.

### 6. Environment Variable Conflicts

Multiple sources of configuration can conflict. The Azure provider checks configuration in this order:

1. Provider block in `.tf` files
2. Environment variables (`ARM_SUBSCRIPTION_ID`)
3. Azure CLI session

```bash
# Check if environment variables are set
env | grep ARM_

# Check if provider block has subscription_id
grep -r "subscription_id" *.tf
```

If both are set, the provider block takes precedence. Make sure they are consistent:

```hcl
# Explicit subscription ID
provider "azurerm" {
  features {}
  subscription_id = "12345678-1234-1234-1234-123456789012"
}
```

Or rely on the environment variable:

```hcl
# Uses ARM_SUBSCRIPTION_ID environment variable
provider "azurerm" {
  features {}
}
```

### 7. Azure CLI Returns Wrong Subscription

The Azure CLI might have a different default subscription than what Terraform expects:

```bash
# Check the default subscription
az account show --query id --output tsv

# Set the correct default
az account set --subscription "12345678-1234-1234-1234-123456789012"

# Verify
az account show
```

## Step-by-Step Debugging

**Step 1: Verify the subscription exists and you can access it.**

```bash
az login
az account list --output table
```

Find your subscription in the list. Note the exact subscription ID.

**Step 2: Set the subscription as active.**

```bash
az account set --subscription "your-subscription-id"
az account show
```

**Step 3: Verify you can create resources.**

```bash
# Try a simple operation
az group list --output table
```

**Step 4: Check Terraform configuration.**

Make sure the subscription ID in your Terraform config matches:

```hcl
provider "azurerm" {
  features {}
  subscription_id = "the-exact-id-from-step-1"
}
```

**Step 5: Check environment variables.**

```bash
echo $ARM_SUBSCRIPTION_ID
echo $ARM_TENANT_ID
echo $ARM_CLIENT_ID
```

Make sure these are consistent with what you verified in steps 1-3.

## Working with Multiple Subscriptions

If you manage resources across multiple subscriptions, configure provider aliases:

```hcl
# Default subscription
provider "azurerm" {
  features {}
  subscription_id = var.dev_subscription_id
}

# Production subscription
provider "azurerm" {
  features {}
  alias           = "production"
  subscription_id = var.prod_subscription_id
}

# Use the default provider
resource "azurerm_resource_group" "dev" {
  name     = "dev-rg"
  location = "East US"
}

# Use the production provider
resource "azurerm_resource_group" "prod" {
  provider = azurerm.production
  name     = "prod-rg"
  location = "East US"
}
```

## Using Variables for Subscription ID

A good practice is to make the subscription ID a variable so it can be set per environment:

```hcl
variable "subscription_id" {
  type        = string
  description = "Azure subscription ID"
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

Then set it via:

```bash
# Environment variable
export TF_VAR_subscription_id="12345678-1234-1234-1234-123456789012"

# Or command line
terraform plan -var="subscription_id=12345678-1234-1234-1234-123456789012"

# Or terraform.tfvars file
# subscription_id = "12345678-1234-1234-1234-123456789012"
```

## Data Source for Subscription Validation

You can use a data source to validate the subscription at plan time:

```hcl
data "azurerm_subscription" "current" {}

output "subscription_name" {
  value = data.azurerm_subscription.current.display_name
}

output "subscription_id" {
  value = data.azurerm_subscription.current.subscription_id
}
```

This will fail during `terraform plan` if the subscription is not accessible, giving you an early warning.

## Monitoring Azure Subscriptions

Use [OneUptime](https://oneuptime.com) to monitor your Azure subscription health and resource usage. Getting alerts when subscriptions approach spending limits or have billing issues helps prevent unexpected Terraform failures.

## Conclusion

The "subscription not found" error comes down to either the wrong subscription ID, the wrong tenant, or insufficient permissions. Verify your subscription ID using `az account list`, make sure your credentials have access to that subscription, and ensure the tenant ID matches. For service principals, confirm the role assignment exists on the target subscription. Using explicit subscription IDs in your provider configuration (rather than relying on CLI defaults) makes your Terraform configurations more predictable and easier to debug.
