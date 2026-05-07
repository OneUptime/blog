# How to Create Azure Service Endpoints with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Service Endpoints, VNet, Storage, SQL, Network Security, Infrastructure as Code

Description: Learn how to configure Azure Service Endpoints with OpenTofu to extend VNet private address space to Azure services, restricting access to only your VNet without traffic leaving the Azure backbone.

## Introduction

Azure Service Endpoints extend VNet private IP address space to Azure PaaS services (Storage, SQL, Key Vault, Cosmos DB, etc.), enabling you to secure these services to only your VNets. Traffic from VNet to the service travels over the Azure backbone network rather than the public internet, and you can configure the service to reject all access except from specific VNets. Service Endpoints are simpler than Private Endpoints but don't provide private IP addresses for the services.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A Virtual Network with subnets

## Step 1: Enable Service Endpoints on Subnets

```hcl
resource "azurerm_subnet" "app" {
  name                 = "app-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet_name
  address_prefixes     = ["10.0.1.0/24"]

  # Enable service endpoints on the subnet
  service_endpoints = [
    "Microsoft.Storage",
    "Microsoft.Sql",
    "Microsoft.KeyVault",
    "Microsoft.ContainerRegistry",
    "Microsoft.ServiceBus",
    "Microsoft.EventHub",
    "Microsoft.Web"
  ]
}
```

## Step 2: Restrict Azure Storage to VNet

```hcl
resource "azurerm_storage_account" "secure" {
  name                     = "${var.project_name}secure"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  # Keep the public endpoint enabled, but restrict it to selected networks
  public_network_access_enabled   = true
  allow_nested_items_to_be_public = false

  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]  # Allow trusted Azure services

    # Allow from specific VNet subnets via Service Endpoints
    virtual_network_subnet_ids = [
      azurerm_subnet.app.id,
      var.additional_subnet_id
    ]

    # Allow from specific public IP ranges (optional)
    ip_rules = var.admin_cidr_ranges
  }

  tags = {
    Name = "${var.project_name}-secure-storage"
  }
}
```

## Step 3: Restrict Azure SQL to VNet

```hcl
resource "azurerm_mssql_server" "main" {
  name                         = "${var.project_name}-sql"
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_login
  administrator_login_password = var.sql_admin_password

  # Service endpoints secure the public endpoint to selected subnets
  public_network_access_enabled = true
}

# VNet rule restricts SQL to specified subnets

resource "azurerm_mssql_virtual_network_rule" "app_subnet" {
  name      = "allow-app-subnet"
  server_id = azurerm_mssql_server.main.id
  subnet_id = azurerm_subnet.app.id

  # Require the Microsoft.Sql service endpoint to already be enabled
  ignore_missing_vnet_service_endpoint = false
}
```

## Step 4: Restrict Key Vault to VNet

```hcl
resource "azurerm_key_vault" "secure" {
  name                        = "${var.project_name}-kv"
  location                    = var.location
  resource_group_name         = var.resource_group_name
  tenant_id                   = var.tenant_id
  sku_name                    = "standard"
  rbac_authorization_enabled  = true
  purge_protection_enabled    = true
  soft_delete_retention_days  = 90

  network_acls {
    default_action             = "Deny"
    bypass                     = "AzureServices"

    virtual_network_subnet_ids = [
      azurerm_subnet.app.id
    ]

    ip_rules = var.admin_ip_ranges
  }

  tags = {
    Name = "${var.project_name}-secure-key-vault"
  }
}
```

## Step 5: Service Endpoint Policy

```hcl
# Restrict which specific storage accounts are accessible via Service Endpoint
resource "azurerm_subnet_service_endpoint_storage_policy" "restrict" {
  name                = "${var.project_name}-storage-policy"
  resource_group_name = var.resource_group_name
  location            = var.location

  definition {
    name        = "allow-specific-storage"
    description = "Only allow access to approved storage accounts"

    service_resources = [
      azurerm_storage_account.secure.id
    ]
  }
}

resource "azurerm_subnet" "restricted_app" {
  name                 = "restricted-app-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet_name
  address_prefixes     = ["10.0.2.0/24"]

  service_endpoints = ["Microsoft.Storage"]

  # Apply Service Endpoint Policy to restrict which resources are reachable
  service_endpoint_policy_ids = [azurerm_subnet_service_endpoint_storage_policy.restrict.id]
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify service endpoints on subnet
az network vnet subnet show \
  --resource-group <rg> \
  --vnet-name <vnet-name> \
  --name <subnet-name> \
  --query "serviceEndpoints"

# Test storage access from VNet VM
az storage blob list \
  --account-name <account-name> \
  --container-name <container> \
  --auth-mode login
```

## Conclusion

Service Endpoints are simpler than Private Endpoints and have no additional cost, but they don't provide private IP addresses for the services-the service's public endpoint still resolves to a public IP (traffic just takes the Azure backbone path). For strict network isolation where services must be unreachable from the public internet entirely, use Private Endpoints instead. Service Endpoint Policies add another security layer by restricting which specific Azure resources are reachable via Service Endpoints, preventing data exfiltration to unauthorized storage accounts within the same service.
