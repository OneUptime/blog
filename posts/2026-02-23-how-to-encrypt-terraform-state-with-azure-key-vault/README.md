# How to Encrypt Terraform State with Azure Key Vault

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Key Vault, Encryption, Security, State Management

Description: A step-by-step guide to encrypting Terraform state files using Azure Key Vault and Azure Storage, covering key vault setup, storage account encryption, access policies, and managed identity integration.

---

When you store Terraform state in Azure Blob Storage, encrypting it with Azure Key Vault gives you control over the encryption keys and the ability to audit who accesses them. Azure Storage encrypts data at rest by default, but using a customer-managed key through Key Vault adds an extra layer of control that many compliance frameworks require. This guide covers the complete setup.

## Default Encryption vs. Customer-Managed Keys

Azure Storage encrypts all data at rest using Microsoft-managed keys by default. This means your state files are encrypted even without any extra configuration. However, customer-managed keys (CMK) through Azure Key Vault offer several advantages:

- You control who can use the encryption keys
- You can rotate keys on your own schedule
- You get audit logs for key usage
- You can revoke access by disabling or deleting the key
- Many compliance standards require customer-managed keys

## Prerequisites

Before starting, you need:

- An Azure subscription
- Terraform installed (1.0+)
- Azure CLI installed and authenticated
- Appropriate permissions to create Key Vault, Storage Account, and managed identities

## Creating the Key Vault

Start by creating an Azure Key Vault with a key for state encryption:

```hcl
# providers.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

# Get current identity information
data "azurerm_client_config" "current" {}

# Resource group for state infrastructure
resource "azurerm_resource_group" "state" {
  name     = "rg-terraform-state"
  location = "East US"
}

# Key Vault for encryption keys
resource "azurerm_key_vault" "state" {
  name                        = "kv-tfstate-encrypt"
  location                    = azurerm_resource_group.state.location
  resource_group_name         = azurerm_resource_group.state.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  enabled_for_disk_encryption = false
  purge_protection_enabled    = true    # Required for CMK encryption
  soft_delete_retention_days  = 90

  # Network rules for additional security
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = ["YOUR_IP/32"]  # Your office or CI/CD IP
  }
}

# Access policy for the current user/service principal
resource "azurerm_key_vault_access_policy" "admin" {
  key_vault_id = azurerm_key_vault.state.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Get", "List", "Create", "Delete", "Update",
    "Recover", "Purge", "GetRotationPolicy", "SetRotationPolicy"
  ]
}
```

## Creating the Encryption Key

Create a key in Key Vault specifically for state encryption:

```hcl
# Encryption key for Terraform state
resource "azurerm_key_vault_key" "state" {
  name         = "terraform-state-key"
  key_vault_id = azurerm_key_vault.state.id
  key_type     = "RSA"
  key_size     = 2048

  key_opts = [
    "decrypt",
    "encrypt",
    "sign",
    "unwrapKey",
    "verify",
    "wrapKey"
  ]

  # Automatic key rotation
  rotation_policy {
    automatic {
      time_before_expiry = "P30D"  # Rotate 30 days before expiry
    }
    expire_after         = "P365D"  # Key expires after 1 year
    notify_before_expiry = "P30D"
  }

  depends_on = [azurerm_key_vault_access_policy.admin]
}
```

## Setting Up the Storage Account with CMK Encryption

Create the storage account and configure it to use your Key Vault key:

```hcl
# Managed identity for the storage account
resource "azurerm_user_assigned_identity" "state_storage" {
  name                = "id-tfstate-storage"
  location            = azurerm_resource_group.state.location
  resource_group_name = azurerm_resource_group.state.name
}

# Grant the managed identity access to Key Vault keys
resource "azurerm_key_vault_access_policy" "storage" {
  key_vault_id = azurerm_key_vault.state.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.state_storage.principal_id

  key_permissions = [
    "Get", "UnwrapKey", "WrapKey"
  ]
}

# Storage account for Terraform state
resource "azurerm_storage_account" "state" {
  name                     = "stterraformstate2026"
  resource_group_name      = azurerm_resource_group.state.name
  location                 = azurerm_resource_group.state.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant storage

  # Use the managed identity for CMK access
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.state_storage.id]
  }

  # Configure customer-managed key encryption
  customer_managed_key {
    key_vault_key_id          = azurerm_key_vault_key.state.id
    user_assigned_identity_id = azurerm_user_assigned_identity.state_storage.id
  }

  # Security settings
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  # Network rules
  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
    ip_rules       = ["YOUR_IP"]
  }

  depends_on = [azurerm_key_vault_access_policy.storage]
}

# Container for Terraform state files
resource "azurerm_storage_container" "state" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.state.name
  container_access_type = "private"
}
```

## Configuring the Terraform Backend

Now configure Terraform to use the encrypted storage account as its backend:

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate2026"
    container_name       = "tfstate"
    key                  = "production.tfstate"

    # Use Azure AD authentication instead of storage keys
    use_azuread_auth = true
  }
}
```

When using Azure AD authentication, the identity running Terraform needs the `Storage Blob Data Contributor` role:

```hcl
# Grant Terraform's identity access to the blob container
resource "azurerm_role_assignment" "terraform_state" {
  scope                = azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = "TERRAFORM_SERVICE_PRINCIPAL_OBJECT_ID"
}
```

## Using RBAC Instead of Key Vault Access Policies

Azure recommends RBAC for Key Vault access in newer deployments:

```hcl
resource "azurerm_key_vault" "state" {
  name                       = "kv-tfstate-encrypt"
  location                   = azurerm_resource_group.state.location
  resource_group_name        = azurerm_resource_group.state.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  purge_protection_enabled   = true
  enable_rbac_authorization  = true  # Use RBAC instead of access policies
}

# Grant key access via RBAC
resource "azurerm_role_assignment" "kv_crypto_officer" {
  scope                = azurerm_key_vault.state.id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "kv_crypto_storage" {
  scope                = azurerm_key_vault.state.id
  role_definition_name = "Key Vault Crypto Service Encryption User"
  principal_id         = azurerm_user_assigned_identity.state_storage.principal_id
}
```

## Auditing Key Usage

Enable diagnostic logging on Key Vault to track key usage:

```hcl
# Log Analytics workspace for audit logs
resource "azurerm_log_analytics_workspace" "security" {
  name                = "law-security-audit"
  location            = azurerm_resource_group.state.location
  resource_group_name = azurerm_resource_group.state.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

# Enable Key Vault diagnostic logging
resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "keyvault-audit-logs"
  target_resource_id         = azurerm_key_vault.state.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.security.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
  }
}
```

Query audit logs to see who accessed the encryption key:

```bash
# Query Key Vault audit logs using Azure CLI
az monitor log-analytics query \
  --workspace "LAW_WORKSPACE_ID" \
  --analytics-query "
    AzureDiagnostics
    | where ResourceProvider == 'MICROSOFT.KEYVAULT'
    | where OperationName in ('KeyEncrypt', 'KeyDecrypt', 'KeyWrapKey', 'KeyUnwrapKey')
    | project TimeGenerated, OperationName, CallerIPAddress, identity_claim_upn_s
    | order by TimeGenerated desc
    | take 50
  "
```

## Key Rotation

With the rotation policy configured earlier, keys rotate automatically. You can also trigger manual rotation:

```bash
# Manually rotate the key
az keyvault key rotate --vault-name kv-tfstate-encrypt --name terraform-state-key

# Check the current key version
az keyvault key show --vault-name kv-tfstate-encrypt --name terraform-state-key \
  --query '{name:name, version:key.kid}'
```

When a key rotates, Azure Storage automatically picks up the new key version. No Terraform configuration changes are needed.

## Disaster Recovery

Plan for key or storage loss:

```bash
# Key Vault has soft-delete enabled, so accidentally deleted keys can be recovered
az keyvault key recover --vault-name kv-tfstate-encrypt --name terraform-state-key

# If the Key Vault itself is deleted (with soft-delete)
az keyvault recover --name kv-tfstate-encrypt

# GRS replication means your state is replicated to a paired region
# In case of regional failure, you can fail over the storage account
az storage account failover --name stterraformstate2026
```

## CI/CD Integration

For Azure DevOps or GitHub Actions, use a service principal with minimal permissions:

```yaml
# GitHub Actions example
jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
      ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan
```

The service principal needs:
- `Storage Blob Data Contributor` on the storage account
- Key Vault key permissions (Get, WrapKey, UnwrapKey) if directly accessing KV

## Monitoring Your Infrastructure

Encryption protects your state at rest, but you also need to monitor the infrastructure it describes. [OneUptime](https://oneuptime.com) provides monitoring, alerting, and incident management for your Azure infrastructure, ensuring you catch issues early.

## Conclusion

Azure Key Vault provides robust customer-managed encryption for Terraform state stored in Azure Blob Storage. The combination of Key Vault's access controls, automatic key rotation, and comprehensive audit logging satisfies most compliance requirements while keeping the operational overhead low. Start with the basic setup, add RBAC-based access control, and enable diagnostic logging to maintain full visibility into who accesses your encryption keys.

For encryption on other clouds, see our guides on [AWS KMS encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-encrypt-terraform-state-with-aws-kms/view) and [GCP KMS encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-encrypt-terraform-state-with-gcp-kms/view).
