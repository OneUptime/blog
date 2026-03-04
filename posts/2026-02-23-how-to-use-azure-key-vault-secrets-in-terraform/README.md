# How to Use Azure Key Vault Secrets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Key Vault, Secrets, Security, IaC

Description: Learn how to create, manage, and retrieve secrets from Azure Key Vault in Terraform, including access policies, managed identities, certificate management, and integration with Azure services.

---

Azure Key Vault is Microsoft's managed secrets, keys, and certificate management service. Using it with Terraform lets you centralize secret management for your Azure infrastructure while keeping sensitive values out of your Terraform configurations and state files (as much as possible). This guide covers creating Key Vaults, storing secrets, retrieving them in Terraform, and integrating with Azure services.

## Creating a Key Vault

Start by creating a Key Vault with proper access controls:

```hcl
# Get current identity
data "azurerm_client_config" "current" {}

# Resource group
resource "azurerm_resource_group" "main" {
  name     = "rg-myapp-production"
  location = "East US"
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                        = "kv-myapp-prod"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true

  # Enable RBAC authorization (recommended over access policies)
  enable_rbac_authorization = true

  # Network restrictions
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = var.allowed_ips
  }
}

# Grant the current user admin access via RBAC
resource "azurerm_role_assignment" "kv_admin" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}
```

## Storing Secrets

Create secrets in Key Vault using Terraform:

```hcl
# Store a database password
resource "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  value        = random_password.database.result
  key_vault_id = azurerm_key_vault.main.id

  content_type = "password"

  # Set an expiration date
  expiration_date = "2027-02-23T00:00:00Z"

  tags = {
    environment = "production"
    service     = "database"
  }

  depends_on = [azurerm_role_assignment.kv_admin]
}

# Store an API key
resource "azurerm_key_vault_secret" "api_key" {
  name         = "external-api-key"
  value        = var.external_api_key
  key_vault_id = azurerm_key_vault.main.id

  content_type = "api-key"

  depends_on = [azurerm_role_assignment.kv_admin]
}

# Store a JSON secret with multiple fields
resource "azurerm_key_vault_secret" "db_connection" {
  name         = "database-connection"
  key_vault_id = azurerm_key_vault.main.id

  value = jsonencode({
    server   = azurerm_postgresql_server.main.fqdn
    database = "myapp"
    username = "admin"
    password = random_password.database.result
    port     = 5432
    ssl      = true
  })

  content_type = "application/json"

  depends_on = [azurerm_role_assignment.kv_admin]
}

# Generate the random password
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}
```

## Retrieving Secrets

Read existing secrets using data sources:

```hcl
# Reference an existing Key Vault
data "azurerm_key_vault" "main" {
  name                = "kv-myapp-prod"
  resource_group_name = "rg-myapp-production"
}

# Read a specific secret
data "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  key_vault_id = data.azurerm_key_vault.main.id
}

# Use the secret in resources
resource "azurerm_postgresql_server" "main" {
  name                = "psql-myapp-prod"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  sku_name   = "GP_Gen5_2"
  version    = "11"
  storage_mb = 51200

  administrator_login          = "psqladmin"
  administrator_login_password = data.azurerm_key_vault_secret.db_password.value

  ssl_enforcement_enabled = true
}
```

## Using Managed Identities

For applications running on Azure, use managed identities to access Key Vault without storing credentials:

```hcl
# Create a user-assigned managed identity
resource "azurerm_user_assigned_identity" "app" {
  name                = "id-myapp-prod"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

# Grant the identity access to read Key Vault secrets
resource "azurerm_role_assignment" "app_secrets_reader" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Assign the identity to an App Service
resource "azurerm_linux_web_app" "main" {
  name                = "app-myapp-prod"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  site_config {}

  # Reference Key Vault secrets in app settings
  app_settings = {
    "DATABASE_PASSWORD" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_password.versionless_id})"
    "API_KEY"           = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.api_key.versionless_id})"
  }
}
```

The `@Microsoft.KeyVault()` reference syntax tells App Service to fetch the value from Key Vault at runtime, so the actual secret is never stored in the App Service configuration.

## Access Policies vs. RBAC

Azure Key Vault supports two access control models. RBAC is the newer and recommended approach:

### RBAC (Recommended)

```hcl
# RBAC roles for Key Vault
resource "azurerm_role_assignment" "secrets_reader" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"    # Read secrets
  principal_id         = var.app_principal_id
}

resource "azurerm_role_assignment" "secrets_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"  # Read and write secrets
  principal_id         = var.admin_principal_id
}

resource "azurerm_role_assignment" "crypto_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Crypto User"      # Use keys for crypto operations
  principal_id         = var.crypto_principal_id
}
```

### Access Policies (Legacy)

```hcl
# If your Key Vault uses access policies instead of RBAC
resource "azurerm_key_vault" "main" {
  # ... other config ...
  enable_rbac_authorization = false  # Use access policies
}

resource "azurerm_key_vault_access_policy" "app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.app.principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}
```

## Certificate Management

Key Vault can also manage TLS certificates:

```hcl
# Import an existing certificate
resource "azurerm_key_vault_certificate" "app" {
  name         = "app-tls-cert"
  key_vault_id = azurerm_key_vault.main.id

  certificate {
    contents = filebase64("certs/app.pfx")
    password = var.cert_password
  }

  depends_on = [azurerm_role_assignment.kv_admin]
}

# Generate a self-signed certificate (useful for development)
resource "azurerm_key_vault_certificate" "dev" {
  name         = "dev-tls-cert"
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
        "keyEncipherment"
      ]
    }
  }

  depends_on = [azurerm_role_assignment.kv_admin]
}
```

## Integrating with AKS

For applications running in Azure Kubernetes Service, use the Azure Key Vault Provider for Secrets Store CSI Driver:

```hcl
# Enable the Key Vault CSI driver on AKS
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-myapp-prod"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "myapp"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2_v2"
  }

  identity {
    type = "SystemAssigned"
  }

  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }
}

# Grant AKS identity access to Key Vault
resource "azurerm_role_assignment" "aks_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_kubernetes_cluster.main.key_vault_secrets_provider[0].secret_identity[0].object_id
}
```

## Diagnostic Logging

Monitor Key Vault access for security auditing:

```hcl
resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "kv-diagnostics"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Monitoring Your Infrastructure

While Key Vault handles your secrets, [OneUptime](https://oneuptime.com) monitors the infrastructure and applications that use those secrets. Comprehensive monitoring ensures your services stay healthy and performant.

## Conclusion

Azure Key Vault provides a robust foundation for secret management in Terraform. Use RBAC for access control, managed identities for application access, and the Key Vault reference syntax in App Service settings to keep secrets out of your application configuration entirely. Combined with diagnostic logging and network restrictions, Key Vault keeps your sensitive data secure throughout the infrastructure lifecycle.

For secret management on other clouds, see our guides on [AWS Secrets Manager](https://oneuptime.com/blog/post/2026-02-23-how-to-use-aws-secrets-manager-with-terraform/view) and [GCP Secret Manager](https://oneuptime.com/blog/post/2026-02-23-how-to-use-gcp-secret-manager-with-terraform/view).
