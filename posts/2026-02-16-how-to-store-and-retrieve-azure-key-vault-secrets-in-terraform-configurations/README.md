# How to Store and Retrieve Azure Key Vault Secrets in Terraform Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Key Vault, Secrets Management, Infrastructure as Code, Security, DevOps

Description: Learn how to securely store and retrieve secrets from Azure Key Vault in Terraform configurations without exposing sensitive values in state or code.

---

Secrets in Terraform are a constant headache. Database passwords, API keys, connection strings - they all need to go somewhere, and hardcoding them in your Terraform files is obviously a terrible idea. Azure Key Vault is the natural place to store secrets in an Azure environment, and Terraform integrates with it through both data sources (reading secrets) and resources (writing secrets). But getting this right without accidentally exposing secrets in your state file or logs takes some care.

In this post, I will cover the patterns I use for integrating Azure Key Vault with Terraform - from basic secret retrieval to more advanced patterns involving dynamic secrets and cross-module secret sharing.

## The Problem with Secrets in Terraform

Before getting into Key Vault specifics, it is worth understanding why secrets in Terraform are tricky. Terraform stores everything it knows about your resources in state. When you create a secret or read one, the value ends up in the state file in plain text. This means your state file is effectively a secrets store, which is why remote state with encryption and access controls is so important.

You cannot eliminate secrets from state entirely, but you can minimize exposure by keeping secrets in Key Vault and only referencing them when necessary.

## Setting Up Key Vault

First, create the Key Vault itself:

```hcl
# keyvault.tf - Create Azure Key Vault with proper access configuration

data "azurerm_client_config" "current" {}

# Create a Key Vault with RBAC-based access control
resource "azurerm_key_vault" "main" {
  name                       = "kv-myapp-${var.environment}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"

  # Use RBAC instead of access policies - recommended for new deployments
  enable_rbac_authorization  = true

  # Soft delete protects against accidental deletion
  soft_delete_retention_days = 30
  purge_protection_enabled   = true

  # Network restrictions - allow Azure services and specific IPs
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = var.allowed_ips  # Allow CI/CD runner IPs
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Grant the Terraform service principal permission to manage secrets
resource "azurerm_role_assignment" "terraform_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}
```

I strongly recommend using RBAC authorization (`enable_rbac_authorization = true`) instead of access policies. RBAC integrates with Azure AD and gives you finer-grained control. Access policies are the older model and harder to manage at scale.

## Writing Secrets to Key Vault

You can create secrets in Key Vault directly from Terraform. This is useful for generated values like random passwords:

```hcl
# secrets.tf - Generate and store secrets in Key Vault

# Generate a random password for the database
resource "random_password" "db_password" {
  length  = 32
  special = true
  # Exclude characters that cause issues in connection strings
  override_special = "!@#$%^&*()-_=+"
}

# Store the database password in Key Vault
resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-admin-password"
  value        = random_password.db_password.result
  key_vault_id = azurerm_key_vault.main.id

  # Set content type for documentation
  content_type = "password"

  # Set expiration - force rotation after 90 days
  expiration_date = timeadd(timestamp(), "2160h")  # 90 days

  tags = {
    purpose = "PostgreSQL admin password"
    rotated = timestamp()
  }

  # Prevent Terraform from detecting the expiration date as drift
  lifecycle {
    ignore_changes = [expiration_date, tags["rotated"]]
  }

  # Wait for RBAC assignment to propagate before creating secrets
  depends_on = [azurerm_role_assignment.terraform_secrets]
}

# Store an API key provided as a variable
resource "azurerm_key_vault_secret" "api_key" {
  name         = "external-api-key"
  value        = var.external_api_key  # Passed via TF_VAR or tfvars
  key_vault_id = azurerm_key_vault.main.id
  content_type = "api-key"

  depends_on = [azurerm_role_assignment.terraform_secrets]
}
```

## Reading Secrets from Key Vault

The more common pattern is reading existing secrets from Key Vault. This is useful when secrets are created outside of Terraform (by an admin, a rotation script, or another system):

```hcl
# data-secrets.tf - Read existing secrets from Key Vault

# Reference an existing Key Vault
data "azurerm_key_vault" "shared" {
  name                = "kv-shared-services"
  resource_group_name = "rg-shared-services"
}

# Read a specific secret by name
data "azurerm_key_vault_secret" "db_connection_string" {
  name         = "db-connection-string"
  key_vault_id = data.azurerm_key_vault.shared.id
}

# Use the secret in a resource configuration
resource "azurerm_app_service" "api" {
  name                = "app-api-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  app_service_plan_id = azurerm_app_service_plan.main.id

  site_config {
    always_on = true
  }

  app_settings = {
    # Reference the secret value from Key Vault
    "DATABASE_CONNECTION" = data.azurerm_key_vault_secret.db_connection_string.value
    "ENVIRONMENT"         = var.environment
  }
}
```

Important caveat: when you use `data.azurerm_key_vault_secret`, the secret value gets stored in the Terraform state file. This is unavoidable with the data source approach.

## Key Vault References (The Better Way)

For Azure App Service and Azure Functions, there is a cleaner approach that avoids putting secrets in Terraform state entirely. Key Vault references let the app read secrets directly from Key Vault at runtime:

```hcl
# keyvault-references.tf - Use Key Vault references to avoid secrets in state

# Create a managed identity for the app to access Key Vault
resource "azurerm_user_assigned_identity" "app" {
  name                = "id-app-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

# Grant the app's managed identity read access to Key Vault secrets
resource "azurerm_role_assignment" "app_secrets_reader" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Configure the app with Key Vault references instead of raw secret values
resource "azurerm_linux_web_app" "api" {
  name                = "app-api-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  # Set the Key Vault reference identity
  key_vault_reference_identity_id = azurerm_user_assigned_identity.app.id

  site_config {}

  app_settings = {
    # Key Vault reference syntax - the app resolves this at runtime
    # The secret value never appears in Terraform state
    "DATABASE_PASSWORD" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/db-admin-password/)"
    "API_KEY"           = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/external-api-key/)"
    "ENVIRONMENT"       = var.environment  # Non-sensitive values can be set directly
  }
}
```

This is the gold standard for secrets in Azure. The secret values never touch Terraform state, never appear in logs, and the app resolves them at startup using its managed identity. If someone reads the Terraform state, they see the Key Vault reference URL, not the actual secret.

## Cross-Module Secret Sharing

When your Terraform code is split across multiple modules, you often need to pass secrets between them. Here is a pattern for sharing secrets between a database module and an application module:

```hcl
# modules/database/main.tf - Database module that stores its secrets in Key Vault

variable "key_vault_id" {
  description = "ID of the Key Vault to store secrets in"
  type        = string
}

resource "random_password" "admin" {
  length  = 32
  special = true
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "psql-${var.name}"
  location            = var.location
  resource_group_name = var.resource_group_name

  administrator_login    = "dbadmin"
  administrator_password = random_password.admin.result

  # ... other configuration ...
}

# Store the connection string in Key Vault
resource "azurerm_key_vault_secret" "connection_string" {
  name         = "${var.name}-connection-string"
  value        = "postgresql://dbadmin:${random_password.admin.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${var.database_name}?sslmode=require"
  key_vault_id = var.key_vault_id
  content_type = "connection-string"
}

# Output the secret name (not the value) for other modules to reference
output "connection_string_secret_name" {
  value = azurerm_key_vault_secret.connection_string.name
}
```

Then the application module reads it using a Key Vault reference:

```hcl
# modules/application/main.tf - App module that consumes secrets via Key Vault references

variable "key_vault_uri" {
  description = "URI of the Key Vault"
  type        = string
}

variable "db_secret_name" {
  description = "Name of the database connection string secret in Key Vault"
  type        = string
}

resource "azurerm_linux_web_app" "this" {
  # ... configuration ...

  app_settings = {
    "DATABASE_URL" = "@Microsoft.KeyVault(SecretUri=${var.key_vault_uri}secrets/${var.db_secret_name}/)"
  }
}
```

The database module writes the secret, the application module reads it via Key Vault reference, and the actual secret value never flows through Terraform outputs.

## Handling Secret Rotation

Secrets need to be rotated periodically. Here is a pattern for triggering rotation:

```hcl
# rotation.tf - Password rotation using Terraform

# Use a time_rotating resource to trigger password changes
resource "time_rotating" "db_password" {
  rotation_days = 90
}

# The password regenerates when the rotation trigger fires
resource "random_password" "db_password" {
  length  = 32
  special = true

  # Keepers force recreation when the rotation timestamp changes
  keepers = {
    rotation = time_rotating.db_password.id
  }
}
```

## Security Best Practices

A few practices I follow religiously when working with Key Vault and Terraform:

Never output secret values. Terraform outputs are stored in state and displayed in the CLI. Output secret names or Key Vault URIs instead.

Always use remote state with encryption. If secrets end up in state (which they will for data sources), at least ensure the state backend encrypts at rest.

Use `sensitive = true` on variables and outputs that contain secrets. This prevents Terraform from displaying them in plan output.

```hcl
# Mark sensitive variables and outputs properly
variable "api_key" {
  type      = string
  sensitive = true  # Prevents display in plan output
}

output "key_vault_uri" {
  value     = azurerm_key_vault.main.vault_uri
  sensitive = false  # URIs are not sensitive
}
```

Enable Key Vault audit logging to track who accesses secrets and when. This is essential for compliance.

## Wrapping Up

Azure Key Vault and Terraform work well together when you follow the right patterns. Use Key Vault references for App Service and Functions to keep secrets out of state entirely. For other resources, accept that secrets will be in state and protect the state accordingly. Generate secrets with `random_password` and store them in Key Vault automatically. And always prefer RBAC authorization over access policies for simpler, more manageable permissions.
