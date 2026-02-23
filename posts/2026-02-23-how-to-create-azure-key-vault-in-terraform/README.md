# How to Create Azure Key Vault in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Key Vault, Security, Infrastructure as Code, Secrets Management

Description: Learn how to create and configure Azure Key Vault in Terraform with access policies, networking rules, diagnostic settings, and key management.

---

Azure Key Vault is where you store secrets, encryption keys, and certificates in Azure. It provides hardware security module (HSM) backed storage, fine-grained access control, and audit logging for everything that touches your sensitive data. Setting it up through Terraform ensures consistent security configuration across all your environments and keeps your access policies version-controlled.

This guide covers creating a Key Vault, configuring access policies and RBAC, adding network restrictions, storing keys and certificates, and setting up diagnostic logging.

## Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false  # Don't purge on destroy in production
      recover_soft_deleted_key_vaults = true
    }
  }
}
```

## Resource Group and Data Sources

```hcl
# main.tf
resource "azurerm_resource_group" "kv" {
  name     = "rg-keyvault-production"
  location = "East US"
}

# Get the current client configuration for access policies
data "azurerm_client_config" "current" {}
```

## Key Vault with Access Policies

The traditional approach uses access policies to control who can do what with secrets, keys, and certificates.

```hcl
# keyvault.tf
resource "azurerm_key_vault" "main" {
  name                = "kv-prod-2026"
  location            = azurerm_resource_group.kv.location
  resource_group_name = azurerm_resource_group.kv.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"  # "standard" or "premium" (HSM-backed)

  # Soft delete protects against accidental deletion
  soft_delete_retention_days = 90

  # Purge protection prevents permanent deletion during retention period
  purge_protection_enabled = true

  # Enable Azure RBAC instead of access policies (recommended for new vaults)
  enable_rbac_authorization = false  # Set to true for RBAC model

  # Enable access from Azure VMs for disk encryption
  enabled_for_disk_encryption = true

  # Enable access from Azure Resource Manager for template deployments
  enabled_for_template_deployment = true

  # Enable access from Azure Deployment Scripts
  enabled_for_deployment = true

  # Access policy for the Terraform service principal
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    # Full permissions for the admin
    key_permissions = [
      "Backup", "Create", "Decrypt", "Delete", "Encrypt", "Get",
      "Import", "List", "Purge", "Recover", "Restore", "Sign",
      "UnwrapKey", "Update", "Verify", "WrapKey",
    ]

    secret_permissions = [
      "Backup", "Delete", "Get", "List", "Purge",
      "Recover", "Restore", "Set",
    ]

    certificate_permissions = [
      "Backup", "Create", "Delete", "DeleteIssuers", "Get",
      "GetIssuers", "Import", "List", "ListIssuers", "ManageContacts",
      "ManageIssuers", "Purge", "Recover", "Restore", "SetIssuers",
      "Update",
    ]
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Adding Access Policies for Applications

Grant specific applications limited access to the vault.

```hcl
# access-policies.tf
# Access policy for a web application (read-only secrets)
resource "azurerm_key_vault_access_policy" "web_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.web_app_object_id

  # Web app only needs to read secrets
  secret_permissions = [
    "Get",
    "List",
  ]
}

# Access policy for a background service
resource "azurerm_key_vault_access_policy" "worker" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.worker_object_id

  secret_permissions = [
    "Get",
  ]

  # Worker needs to use encryption keys
  key_permissions = [
    "Get",
    "WrapKey",
    "UnwrapKey",
  ]
}

# Access policy for a DevOps pipeline
resource "azurerm_key_vault_access_policy" "pipeline" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.pipeline_object_id

  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete",
  ]
}
```

## Key Vault with RBAC Authorization

The newer RBAC model uses Azure role assignments instead of access policies. This approach is generally preferred for new deployments.

```hcl
# keyvault-rbac.tf
resource "azurerm_key_vault" "rbac" {
  name                     = "kv-rbac-prod-2026"
  location                 = azurerm_resource_group.kv.location
  resource_group_name      = azurerm_resource_group.kv.name
  tenant_id                = data.azurerm_client_config.current.tenant_id
  sku_name                 = "standard"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  # Use RBAC instead of access policies
  enable_rbac_authorization = true

  tags = {
    environment = "production"
  }
}

# Grant the admin the Key Vault Administrator role
resource "azurerm_role_assignment" "kv_admin" {
  scope                = azurerm_key_vault.rbac.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Grant a web app the Key Vault Secrets User role (read-only)
resource "azurerm_role_assignment" "kv_secrets_reader" {
  scope                = azurerm_key_vault.rbac.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.web_app_object_id
}
```

## Network Restrictions

Restrict access to the Key Vault from specific networks.

```hcl
# networking.tf
resource "azurerm_key_vault" "main" {
  # ... previous settings ...

  network_acls {
    default_action             = "Deny"  # Deny all by default
    bypass                     = "AzureServices"  # Allow trusted Azure services
    ip_rules                   = ["203.0.113.0/24"]  # Office IP range
    virtual_network_subnet_ids = [var.app_subnet_id]
  }
}
```

## Storing Keys

```hcl
# keys.tf
# RSA encryption key
resource "azurerm_key_vault_key" "encryption" {
  name         = "data-encryption-key"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "RSA"
  key_size     = 2048

  key_opts = [
    "decrypt",
    "encrypt",
    "wrapKey",
    "unwrapKey",
  ]

  # Rotation policy
  rotation_policy {
    automatic {
      time_before_expiry = "P30D"  # Rotate 30 days before expiry
    }

    expire_after         = "P365D"  # Key expires after 1 year
    notify_before_expiry = "P30D"
  }
}

# EC key for signing
resource "azurerm_key_vault_key" "signing" {
  name         = "token-signing-key"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "EC"
  curve        = "P-256"

  key_opts = [
    "sign",
    "verify",
  ]
}
```

## Storing Certificates

```hcl
# certificates.tf
# Self-signed certificate for development
resource "azurerm_key_vault_certificate" "dev" {
  name         = "dev-cert"
  key_vault_id = azurerm_key_vault.main.id

  certificate_policy {
    issuer_parameters {
      name = "Self"
    }

    key_properties {
      exportable = true
      key_size   = 2048
      key_type   = "RSA"
      reuse_key  = true
    }

    secret_properties {
      content_type = "application/x-pkcs12"
    }

    x509_certificate_properties {
      subject            = "CN=dev.example.com"
      validity_in_months = 12

      subject_alternative_names {
        dns_names = ["dev.example.com", "*.dev.example.com"]
      }

      key_usage = [
        "digitalSignature",
        "keyEncipherment",
      ]
    }

    lifetime_action {
      action {
        action_type = "AutoRenew"
      }
      trigger {
        days_before_expiry = 30
      }
    }
  }
}
```

## Diagnostic Logging

Monitor all access to your Key Vault.

```hcl
# diagnostics.tf
resource "azurerm_log_analytics_workspace" "kv" {
  name                = "law-keyvault"
  location            = azurerm_resource_group.kv.location
  resource_group_name = azurerm_resource_group.kv.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

resource "azurerm_monitor_diagnostic_setting" "kv" {
  name                       = "kv-diagnostics"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.kv.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Outputs

```hcl
# outputs.tf
output "key_vault_id" {
  value       = azurerm_key_vault.main.id
  description = "Resource ID of the Key Vault"
}

output "key_vault_uri" {
  value       = azurerm_key_vault.main.vault_uri
  description = "The URI of the Key Vault"
}

output "key_vault_name" {
  value       = azurerm_key_vault.main.name
  description = "The name of the Key Vault"
}
```

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Access Policies vs RBAC

**Access policies** are the legacy model. They are defined per-vault and offer granular permissions on keys, secrets, and certificates. Each vault supports up to 1024 access policies.

**RBAC authorization** is the newer model. It uses Azure role assignments at the vault, resource group, or subscription level. Built-in roles like Key Vault Secrets User and Key Vault Administrator simplify management and work consistently with the rest of Azure RBAC.

For new deployments, RBAC is the recommended approach. It centralizes access control and integrates with Privileged Identity Management (PIM) for just-in-time access.

Key Vault is a foundational piece of any secure Azure architecture. Getting it right in Terraform means your secrets management, encryption key storage, and certificate lifecycle are all reproducible and auditable from the start.
