# How to Fix Azure Resource Provider Not Registered Error

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Resource Providers, Troubleshooting, Infrastructure as Code

Description: Fix the MissingSubscriptionRegistration error in Terraform when Azure resource providers are not registered for your subscription.

---

When you try to create a resource in Azure through Terraform and get a "resource provider not registered" error, it means your Azure subscription has not been enabled for the type of resource you are trying to create. Azure requires you to explicitly register resource providers before using them. While some common providers are registered by default, many are not.

## What the Error Looks Like

```
Error: creating Virtual Network: (Name "my-vnet" / Resource Group "my-rg"):
network.VirtualNetworksClient#CreateOrUpdate: Failure sending request:
StatusCode=409 -- Original Error: Code="MissingSubscriptionRegistration"
Message="The subscription is not registered to use namespace
'Microsoft.Network'. See https://aka.ms/rps-not-found for how to
register subscriptions."

Error: creating Container Registry: Code="MissingSubscriptionRegistration"
Message="The subscription is not registered to use namespace
'Microsoft.ContainerRegistry'."
```

## What Are Resource Providers?

Resource providers are the Azure services that supply resources. Each Azure service has its own resource provider namespace:

- `Microsoft.Compute` - Virtual machines, disks, availability sets
- `Microsoft.Network` - Virtual networks, load balancers, DNS
- `Microsoft.Storage` - Storage accounts
- `Microsoft.ContainerRegistry` - Container registries
- `Microsoft.ContainerService` - AKS (Kubernetes)
- `Microsoft.Sql` - Azure SQL Database
- `Microsoft.Web` - App Service, Functions
- `Microsoft.KeyVault` - Key Vault
- `Microsoft.Monitor` - Azure Monitor
- `Microsoft.OperationalInsights` - Log Analytics

Before you can create resources from a provider, that provider must be registered in your subscription.

## Fix 1: Register the Provider Using Azure CLI

The fastest fix is to register the provider using the Azure CLI:

```bash
# Register a specific provider
az provider register --namespace Microsoft.Network

# Check registration status
az provider show --namespace Microsoft.Network --query "registrationState"

# Wait for registration to complete (can take a few minutes)
az provider register --namespace Microsoft.Network --wait
```

Registration can take a few minutes. You can check the status:

```bash
# List all registered providers
az provider list --query "[?registrationState=='Registered'].namespace" --output table

# List all unregistered providers
az provider list --query "[?registrationState!='Registered'].{Namespace:namespace,State:registrationState}" --output table
```

## Fix 2: Register Multiple Providers at Once

If you are setting up a new subscription, register all the providers you will need:

```bash
# Register commonly needed providers for infrastructure
providers=(
  "Microsoft.Compute"
  "Microsoft.Network"
  "Microsoft.Storage"
  "Microsoft.ContainerRegistry"
  "Microsoft.ContainerService"
  "Microsoft.Sql"
  "Microsoft.DBforMySQL"
  "Microsoft.DBforPostgreSQL"
  "Microsoft.Web"
  "Microsoft.KeyVault"
  "Microsoft.ManagedIdentity"
  "Microsoft.Authorization"
  "Microsoft.Monitor"
  "Microsoft.OperationalInsights"
  "Microsoft.Insights"
  "Microsoft.Cache"
  "Microsoft.CDN"
  "Microsoft.DocumentDB"
  "Microsoft.EventHub"
  "Microsoft.ServiceBus"
)

for provider in "${providers[@]}"; do
  echo "Registering $provider..."
  az provider register --namespace "$provider"
done

echo "Registration initiated. Check status with: az provider list --output table"
```

## Fix 3: Register Providers in Terraform

You can use the `azurerm_resource_provider_registration` resource to manage provider registrations through Terraform:

```hcl
resource "azurerm_resource_provider_registration" "network" {
  name = "Microsoft.Network"
}

resource "azurerm_resource_provider_registration" "compute" {
  name = "Microsoft.Compute"
}

resource "azurerm_resource_provider_registration" "storage" {
  name = "Microsoft.Storage"
}

# Resources that depend on these providers
resource "azurerm_virtual_network" "main" {
  depends_on = [azurerm_resource_provider_registration.network]

  name                = "my-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}
```

## Fix 4: Auto-Register Providers in the Azure Provider

The Azure provider for Terraform has a feature to automatically register resource providers when needed:

```hcl
provider "azurerm" {
  features {}

  # Automatically register resource providers
  resource_provider_registrations = "all"
}
```

Or for more control, you can specify which providers to register:

```hcl
provider "azurerm" {
  features {}

  resource_provider_registrations = "none"
}
```

Note that the auto-registration approach requires the service principal to have the `Microsoft.Resources/subscriptions/providers/register/action` permission.

## Permission Requirements

To register a resource provider, you need the appropriate permissions. The built-in `Contributor` role includes this permission, but custom roles might not:

```bash
# Check if you have permission to register providers
az role assignment list --assignee "your-service-principal-id" --output table
```

If your service principal does not have permission to register providers, you have two options:

**Option A: Grant the permission.**

```bash
# Create a custom role with registration permission
az role definition create --role-definition '{
  "Name": "Resource Provider Registrar",
  "Description": "Can register resource providers",
  "Actions": [
    "Microsoft.Resources/subscriptions/providers/register/action"
  ],
  "AssignableScopes": ["/subscriptions/your-subscription-id"]
}'

az role assignment create \
  --assignee "your-service-principal-id" \
  --role "Resource Provider Registrar" \
  --scope "/subscriptions/your-subscription-id"
```

**Option B: Pre-register providers** using a higher-privileged account before running Terraform.

## Checking Which Providers a Terraform Config Needs

Before running Terraform, you can check which providers your configuration requires:

```bash
# See what resource types are used
grep "resource \"azurerm_" *.tf | sed 's/.*"azurerm_//' | sed 's/".*//' | sort -u
```

Then map resource types to providers:

| Resource Prefix | Provider Namespace |
|---|---|
| azurerm_virtual_network | Microsoft.Network |
| azurerm_virtual_machine | Microsoft.Compute |
| azurerm_storage_account | Microsoft.Storage |
| azurerm_kubernetes_cluster | Microsoft.ContainerService |
| azurerm_container_registry | Microsoft.ContainerRegistry |
| azurerm_key_vault | Microsoft.KeyVault |
| azurerm_sql_server | Microsoft.Sql |
| azurerm_app_service | Microsoft.Web |
| azurerm_cosmosdb_account | Microsoft.DocumentDB |
| azurerm_redis_cache | Microsoft.Cache |

## Common Gotchas

### Registration Takes Time

Provider registration is not instant. It can take 1-5 minutes for a provider to finish registering:

```bash
# Wait for registration
while true; do
  STATE=$(az provider show --namespace Microsoft.ContainerService --query "registrationState" --output tsv)
  echo "Current state: $STATE"
  if [ "$STATE" == "Registered" ]; then
    echo "Registration complete"
    break
  fi
  sleep 10
done
```

### Some Providers Require Terms Acceptance

Certain providers (like marketplace offerings) require you to accept terms before registration:

```bash
# Accept marketplace terms if needed
az vm image terms accept --publisher canonical --offer 0001-com-ubuntu-server-focal --plan 20_04-lts
```

### Feature Registration

Some Azure features within a provider require separate feature registration:

```bash
# Example: Register a preview feature
az feature register --namespace Microsoft.ContainerService --name AKS-IngressApplicationGatewayAddon

# Check feature status
az feature show --namespace Microsoft.ContainerService --name AKS-IngressApplicationGatewayAddon

# After feature is registered, re-register the provider
az provider register --namespace Microsoft.ContainerService
```

## Setting Up Automation

For new subscriptions, create a setup script that registers all needed providers:

```bash
#!/bin/bash
# subscription-setup.sh

SUBSCRIPTION_ID=$1

if [ -z "$SUBSCRIPTION_ID" ]; then
  echo "Usage: ./subscription-setup.sh <subscription-id>"
  exit 1
fi

az account set --subscription "$SUBSCRIPTION_ID"

# Register all required providers
PROVIDERS=(
  "Microsoft.Compute"
  "Microsoft.Network"
  "Microsoft.Storage"
  "Microsoft.KeyVault"
  "Microsoft.ContainerService"
  "Microsoft.ContainerRegistry"
)

for PROVIDER in "${PROVIDERS[@]}"; do
  echo "Registering $PROVIDER..."
  az provider register --namespace "$PROVIDER" --wait
done

echo "All providers registered"
```

## Monitoring Provider Status

Use [OneUptime](https://oneuptime.com) to monitor your Azure subscription health and get alerted when resource provider registrations fail or when you hit subscription-level limits that could affect your Terraform deployments.

## Conclusion

The "resource provider not registered" error is straightforward to fix: register the required provider using `az provider register`. The main considerations are having the right permissions and allowing enough time for registration to complete. For new subscriptions, pre-register all providers you plan to use before running Terraform. For automated pipelines, consider using the provider's auto-registration feature or including registration in your setup scripts.
