# How to Create Azure Key Vault Secrets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Key Vault, Secret, Infrastructure as Code

Description: Learn how to create Azure Key Vault and manage secrets with OpenTofu for centralized secret storage with RBAC access control and soft-delete protection.

Azure Key Vault provides a secure, centralized store for secrets, keys, and certificates. Managing Key Vault and its secrets in OpenTofu ensures consistent access policies and configuration while keeping secret values outside of source control.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false  # Prevent accidental permanent deletion
      recover_soft_deleted_key_vaults = true
    }
  }
}
```

## Creating a Key Vault

```hcl
data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "secrets" {
  name     = "secrets-rg"
  location = "eastus"
}

resource "azurerm_key_vault" "main" {
  name                = "myapp-kv-prod"
  location            = azurerm_resource_group.secrets.location
  resource_group_name = azurerm_resource_group.secrets.name
  tenant_id           = data.azurerm_client_config.current.tenant_id

  sku_name = "standard"  # standard or premium (HSM)

  # RBAC authorization model (recommended over access policies)
  enable_rbac_authorization = true

  # Soft delete and purge protection
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  # Allow access from specific networks only
  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"

    ip_rules = var.allowed_ip_ranges

    virtual_network_subnet_ids = [
      azurerm_subnet.app.id
    ]
  }

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
```

## Creating Secrets

```hcl
resource "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.main.id

  content_type = "text/plain"

  expiration_date = "2026-12-31T00:00:00Z"  # Enforce rotation

  tags = {
    service = "database"
  }
}

resource "azurerm_key_vault_secret" "api_key" {
  name         = "stripe-api-key"
  value        = var.stripe_api_key
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"
}
```

## RBAC Access Control

```hcl
# Grant application managed identity the ability to read secrets

resource "azurerm_role_assignment" "app_secret_reader" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"  # Read-only
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Grant DevOps team the ability to manage secrets
resource "azurerm_role_assignment" "devops_secret_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"  # Read/Write
  principal_id         = var.devops_team_object_id
}

# Grant current operator full admin during provisioning
resource "azurerm_role_assignment" "admin" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}
```

## Multiple Secrets with for_each

```hcl
locals {
  secrets = {
    "database-host"     = azurerm_postgresql_flexible_server.main.fqdn
    "database-name"     = var.db_name
    "database-username" = var.db_username
    "redis-host"        = azurerm_redis_cache.main.hostname
    "redis-port"        = tostring(azurerm_redis_cache.main.ssl_port)
  }
}

resource "azurerm_key_vault_secret" "config" {
  for_each     = local.secrets
  name         = each.key
  value        = each.value
  key_vault_id = azurerm_key_vault.main.id
}
```

## Diagnostic Settings

```hcl
resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name               = "key-vault-diagnostics"
  target_resource_id = azurerm_key_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
```

## Conclusion

Azure Key Vault in OpenTofu provides secure, auditable secret management. Use RBAC authorization instead of legacy access policies, enable soft-delete with purge protection to prevent accidental permanent deletion, restrict network access to known subnets, and configure diagnostic settings to audit all secret access. Set expiration dates on secrets to enforce regular rotation.
