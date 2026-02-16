# How to Use Terraform Data Sources to Reference Existing Azure Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Data Sources, Infrastructure as Code, Cloud, IaC, DevOps

Description: Learn how to use Terraform data sources to reference and query existing Azure resources without importing them into your state file.

---

When you start managing Azure infrastructure with Terraform, you quickly run into a common problem: not everything in your environment was created by Terraform. Maybe your networking team set up the VNet manually, or your security team created a Key Vault through the portal. You still need to reference those resources in your Terraform code, and that is exactly what data sources solve.

Data sources let you read information about existing resources without managing them. You get their attributes - IDs, names, properties - and use those values in your own resource definitions. No state file bloat, no risk of accidentally destroying something your team depends on.

## What Are Terraform Data Sources?

A data source in Terraform is a read-only query against a provider's API. When you declare a `data` block, Terraform calls the Azure Resource Manager API during the plan phase to fetch the current state of that resource. The result is available as an attribute you can reference elsewhere in your configuration.

The key difference between a `resource` block and a `data` block is ownership. A `resource` block means Terraform creates, updates, and destroys that resource. A `data` block means Terraform only reads it.

## Referencing an Existing Resource Group

The most common use case is referencing a resource group that already exists. Here is a simple example that looks up a resource group by name.

```hcl
# Look up an existing resource group by its name
data "azurerm_resource_group" "existing" {
  name = "rg-production-networking"
}

# Use the resource group's attributes in a new resource
resource "azurerm_storage_account" "logs" {
  name                     = "stlogsprod001"
  resource_group_name      = data.azurerm_resource_group.existing.name
  location                 = data.azurerm_resource_group.existing.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

Notice how we reference `data.azurerm_resource_group.existing.location` instead of hardcoding a region. If the resource group moves or if you want the storage account to always match the resource group's location, this keeps things consistent automatically.

## Looking Up Virtual Networks and Subnets

Networking resources are another frequent target for data sources. Your network team probably manages the VNet, and you just need a subnet ID to deploy your VMs or AKS clusters into.

```hcl
# Query the existing virtual network
data "azurerm_virtual_network" "hub" {
  name                = "vnet-hub-eastus"
  resource_group_name = "rg-networking"
}

# Query a specific subnet within that VNet
data "azurerm_subnet" "app_subnet" {
  name                 = "snet-applications"
  virtual_network_name = data.azurerm_virtual_network.hub.name
  resource_group_name  = "rg-networking"
}

# Deploy a NIC into the existing subnet
resource "azurerm_network_interface" "app_nic" {
  name                = "nic-app-server-01"
  location            = data.azurerm_virtual_network.hub.location
  resource_group_name = "rg-applications"

  ip_configuration {
    name                          = "internal"
    subnet_id                     = data.azurerm_subnet.app_subnet.id
    private_ip_address_allocation = "Dynamic"
  }
}
```

This pattern is especially useful in hub-and-spoke network architectures where the hub VNet is managed by a central team and spoke workloads just need to plug into it.

## Querying Azure Key Vault Secrets

Data sources also work for fetching secrets from Key Vault. This is handy when you need to pass a secret to a resource during deployment - like a database password for an App Service configuration.

```hcl
# Reference the existing Key Vault
data "azurerm_key_vault" "main" {
  name                = "kv-prod-secrets"
  resource_group_name = "rg-security"
}

# Fetch a specific secret from the vault
data "azurerm_key_vault_secret" "db_password" {
  name         = "database-admin-password"
  key_vault_id = data.azurerm_key_vault.main.id
}

# Use the secret value in an App Service configuration
resource "azurerm_linux_web_app" "api" {
  name                = "app-api-prod"
  resource_group_name = "rg-applications"
  location            = "eastus"
  service_plan_id     = azurerm_service_plan.main.id

  site_config {}

  app_settings = {
    "DB_PASSWORD" = data.azurerm_key_vault_secret.db_password.value
  }
}
```

One thing to watch out for: the secret value will appear in your Terraform state file in plain text. Make sure you encrypt your state backend and restrict access to it.

## Using Data Sources with Client Configuration

Sometimes you need information about the current Terraform execution context - like which Azure subscription you are deploying into, or what your service principal's object ID is. The `azurerm_client_config` data source provides this.

```hcl
# Get information about the current Azure session
data "azurerm_client_config" "current" {}

# Use the tenant and object IDs in a Key Vault access policy
resource "azurerm_key_vault" "app" {
  name                = "kv-app-prod"
  location            = "eastus"
  resource_group_name = "rg-applications"
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # Grant the deploying principal full access
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Purge"
    ]
  }
}
```

This is cleaner than hardcoding tenant IDs and object IDs, and it makes your code portable across different environments.

## Looking Up Azure Container Registry

If your team has a shared container registry, you can reference it with a data source to get the login server URL and other properties.

```hcl
# Look up the shared container registry
data "azurerm_container_registry" "shared" {
  name                = "crsharedprod"
  resource_group_name = "rg-shared-services"
}

# Output the login server for use in deployment scripts
output "acr_login_server" {
  value = data.azurerm_container_registry.shared.login_server
}
```

## Combining Multiple Data Sources

Real-world configurations often chain multiple data sources together. Here is an example that looks up a Log Analytics workspace and uses it to configure diagnostic settings on a new resource.

```hcl
# Find the central Log Analytics workspace
data "azurerm_log_analytics_workspace" "central" {
  name                = "law-central-monitoring"
  resource_group_name = "rg-monitoring"
}

# Find the existing storage account for long-term archival
data "azurerm_storage_account" "archive" {
  name                = "starchiveprod"
  resource_group_name = "rg-monitoring"
}

# Create a new Key Vault with diagnostics pointing to existing resources
resource "azurerm_key_vault" "app" {
  name                = "kv-myapp-prod"
  location            = "eastus"
  resource_group_name = "rg-applications"
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
}

resource "azurerm_monitor_diagnostic_setting" "kv_diagnostics" {
  name                       = "diag-kv-myapp"
  target_resource_id         = azurerm_key_vault.app.id
  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.central.id
  storage_account_id         = data.azurerm_storage_account.archive.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Data Sources with Filtering

Some Azure data sources support filtering, which is useful when you need to find resources by tag or other criteria. The `azurerm_resources` data source lets you search broadly.

```hcl
# Find all resources tagged with a specific environment
data "azurerm_resources" "prod_databases" {
  type = "Microsoft.Sql/servers"

  required_tags = {
    environment = "production"
  }
}

# Output the list of matching resource IDs
output "prod_sql_servers" {
  value = data.azurerm_resources.prod_databases.resources[*].id
}
```

## Common Pitfalls

There are a few things that catch people off guard with data sources.

First, data sources fail if the resource does not exist. Unlike a resource block where Terraform will create it, a data source expects the thing to already be there. If it is missing, you get an error during plan. You can work around this with `try()` or conditional logic, but it is better to make sure your dependencies are deployed first.

Second, data sources are evaluated during every plan. If the upstream resource changes between plans, your plan output will reflect those changes. This is usually what you want, but it can surprise you if someone modifies a shared resource unexpectedly.

Third, be careful with sensitive data. As mentioned earlier, secret values fetched through data sources end up in the state file. Use remote state encryption and access controls.

## When to Use Data Sources vs. Terraform Import

Data sources and imports serve different purposes. Use a data source when you want to read from a resource but not manage it. Use import when you want to bring a resource under Terraform management so you can modify and eventually destroy it through Terraform.

If you find yourself needing to update an existing resource's configuration, import is the right choice. If you just need an ID or a property value, stick with data sources.

## Wrapping Up

Terraform data sources are one of those features that seem simple but end up being essential in any real Azure deployment. They bridge the gap between manually created resources and your Terraform-managed infrastructure. By referencing existing VNets, Key Vaults, resource groups, and more, you can build configurations that play nicely with the rest of your organization's infrastructure without needing to import everything into your state.

Start with the common ones - resource groups, VNets, subnets, and Key Vault - and expand from there as your configuration grows. The Azure provider has data source equivalents for nearly every resource type, so whatever you need to reference, there is probably a data source for it.
