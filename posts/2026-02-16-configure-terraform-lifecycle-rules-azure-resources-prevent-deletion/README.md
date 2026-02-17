# How to Configure Terraform Lifecycle Rules for Azure Resources to Prevent Accidental Deletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Lifecycle Rules, Safety, Infrastructure as Code, DevOps, Best Practices

Description: Configure Terraform lifecycle rules to prevent accidental deletion of critical Azure resources and manage safe infrastructure changes.

---

One of the scariest things about infrastructure as code is that a single misplaced line can destroy production resources. Someone changes a resource name and Terraform decides the fix is to delete the old one and create a new one. For a database with years of data or a storage account holding customer files, that is catastrophic. Terraform lifecycle rules are your safety net against these scenarios.

This post covers how to use lifecycle rules effectively for Azure resources, with practical examples for the most common protection scenarios.

## Understanding Lifecycle Rules

Terraform provides three lifecycle meta-arguments that control how resources are managed. `prevent_destroy` blocks any plan that would destroy the resource. `create_before_destroy` creates the replacement before destroying the original. `ignore_changes` tells Terraform to ignore modifications to specific attributes. Each serves a different purpose, and using them correctly can save you from disaster.

## prevent_destroy: Protecting Critical Resources

The `prevent_destroy` rule is the simplest and most powerful. When set to `true`, Terraform refuses to create any plan that would result in the resource being destroyed.

```hcl
# Protect a production SQL database from accidental deletion
resource "azurerm_mssql_database" "production" {
  name      = "db-application-prod"
  server_id = azurerm_mssql_server.main.id
  sku_name  = "S2"

  lifecycle {
    # Terraform will error if any change would destroy this database
    prevent_destroy = true
  }
}
```

When you try to run a plan that would destroy this resource, Terraform exits with an error.

```
Error: Instance cannot be destroyed

  on main.tf line 15:
  15: resource "azurerm_mssql_database" "production" {

Resource azurerm_mssql_database.production has lifecycle.prevent_destroy
set, but the plan calls for this resource to be destroyed.
```

Apply this to every resource where data loss is unacceptable.

```hcl
# Storage accounts with customer data
resource "azurerm_storage_account" "customer_data" {
  name                     = "stcustomerdata001"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  lifecycle {
    prevent_destroy = true
  }
}

# Key Vaults with secrets and certificates
resource "azurerm_key_vault" "production" {
  name                = "kv-production-secrets"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  lifecycle {
    prevent_destroy = true
  }
}

# Cosmos DB accounts with production data
resource "azurerm_cosmosdb_account" "main" {
  name                = "cosmos-app-prod"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = "eastus"
    failover_priority = 0
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Azure Cache for Redis with session data
resource "azurerm_redis_cache" "sessions" {
  name                = "redis-sessions-prod"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 2
  family              = "P"
  sku_name            = "Premium"

  lifecycle {
    prevent_destroy = true
  }
}
```

## create_before_destroy: Zero-Downtime Replacements

Some changes force Terraform to replace a resource (destroy and recreate). The `create_before_destroy` rule ensures the new resource is created before the old one is removed, reducing downtime.

```hcl
# Public IP with create_before_destroy for seamless replacement
resource "azurerm_public_ip" "frontend" {
  name                = "pip-frontend-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"

  lifecycle {
    # Create the new IP before destroying the old one
    create_before_destroy = true
  }
}

# App Service Plan with zero-downtime replacement
resource "azurerm_service_plan" "main" {
  name                = "asp-app-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "P1v3"

  lifecycle {
    create_before_destroy = true
  }
}
```

There is a catch with `create_before_destroy` - the new resource needs a different name than the old one if Azure does not allow duplicate names. For globally unique resources like storage accounts, you need to handle the naming carefully, often by including a random suffix or timestamp.

## ignore_changes: Handling External Modifications

Some Azure resources get modified outside of Terraform. Auto-scaling changes VM counts, platform updates modify configuration, or another team updates tags through the portal. The `ignore_changes` rule tells Terraform not to revert these changes.

```hcl
# AKS cluster - ignore node count changes from auto-scaler
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-production"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "aks-prod"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D4s_v5"

    enable_auto_scaling = true
    min_count           = 2
    max_count           = 10
  }

  identity {
    type = "SystemAssigned"
  }

  lifecycle {
    # The auto-scaler changes node_count outside of Terraform
    # Do not revert these changes on the next apply
    ignore_changes = [
      default_node_pool[0].node_count,
    ]
  }
}

# VM Scale Set - ignore instance count changes from auto-scaling
resource "azurerm_linux_virtual_machine_scale_set" "web" {
  name                = "vmss-web-prod"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard_D2s_v5"
  instances           = 3

  admin_username = "adminuser"

  admin_ssh_key {
    username   = "adminuser"
    public_key = var.ssh_public_key
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  network_interface {
    name    = "nic"
    primary = true
    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = azurerm_subnet.web.id
    }
  }

  lifecycle {
    # Auto-scaler modifies instance count
    ignore_changes = [
      instances,
    ]
  }
}
```

Another common pattern is ignoring tags that are applied by Azure Policy or other governance tools.

```hcl
# Ignore tags that Azure Policy adds automatically
resource "azurerm_resource_group" "app" {
  name     = "rg-application"
  location = "eastus"

  tags = {
    environment = "production"
    team        = "backend"
  }

  lifecycle {
    # Azure Policy adds compliance and cost-center tags
    # Do not fight with the policy engine
    ignore_changes = [
      tags["compliance-status"],
      tags["cost-center"],
      tags["last-audit-date"],
    ]
  }
}
```

## Combining Lifecycle Rules

You can combine multiple lifecycle rules on the same resource for comprehensive protection.

```hcl
# Production database with full lifecycle protection
resource "azurerm_mssql_database" "main" {
  name      = "db-production"
  server_id = azurerm_mssql_server.main.id
  sku_name  = "P1"

  lifecycle {
    # Never allow Terraform to destroy this database
    prevent_destroy = true

    # If replacement is somehow needed, create new before destroying old
    create_before_destroy = true

    # Ignore changes made by Azure platform or DBA team
    ignore_changes = [
      tags,
      long_term_retention_policy,
      threat_detection_policy,
    ]
  }
}
```

## Using precondition and postcondition

Terraform 1.2 introduced `precondition` and `postcondition` blocks that add validation to lifecycle management.

```hcl
# Validate that critical settings are correct before applying
resource "azurerm_storage_account" "important" {
  name                     = "stimportantdata001"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = var.replication_type

  lifecycle {
    prevent_destroy = true

    # Ensure geo-redundant replication for production
    precondition {
      condition     = contains(["GRS", "RAGRS", "GZRS", "RAGZRS"], var.replication_type)
      error_message = "Production storage accounts must use geo-redundant replication."
    }

    # Verify the storage account was created with HTTPS enforcement
    postcondition {
      condition     = self.enable_https_traffic_only == true
      error_message = "Storage account must enforce HTTPS-only traffic."
    }
  }
}
```

## Module-Level Protection

When building reusable modules, include lifecycle rules as a standard practice.

```hcl
# modules/azure-database/main.tf
# A database module with built-in safety

variable "protect_from_deletion" {
  description = "Whether to enable prevent_destroy lifecycle rule"
  type        = bool
  default     = true
}

resource "azurerm_mssql_database" "main" {
  name      = var.database_name
  server_id = var.server_id
  sku_name  = var.sku_name

  # Dynamic lifecycle based on environment
  # Note: prevent_destroy must be a literal, not a variable
  # This pattern uses count for conditional protection
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      tags,
    ]
  }
}
```

Note that `prevent_destroy` must be a literal boolean value, not a variable or expression. This is a Terraform limitation. If you need conditional protection, you would need separate resource blocks or use a wrapper approach.

## A Practical Strategy

Here is a strategy that works well for most Azure environments.

Apply `prevent_destroy` to any resource that holds state or data: databases, storage accounts, Key Vaults, Redis caches, Cosmos DB accounts. Apply `ignore_changes` to attributes that auto-scaling or platform services modify: node counts, instance counts, platform-managed tags. Apply `create_before_destroy` to resources that need zero-downtime replacement: public IPs, DNS records, certificates.

Review your lifecycle rules during code reviews. They are just as important as the resource configuration itself.

## Summary

Terraform lifecycle rules are essential guardrails for managing Azure infrastructure safely. `prevent_destroy` protects data-bearing resources from accidental deletion. `create_before_destroy` enables zero-downtime replacements. `ignore_changes` prevents Terraform from fighting with auto-scalers and platform policies. Used together, they give you confidence that running `terraform apply` will not cause an outage or data loss, even when someone makes a mistake in the configuration.
