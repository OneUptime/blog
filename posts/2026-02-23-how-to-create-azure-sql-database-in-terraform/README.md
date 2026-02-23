# How to Create Azure SQL Database in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, SQL Database, Infrastructure as Code, Database, Azure SQL

Description: Step-by-step guide to creating and configuring Azure SQL Database in Terraform including server setup, firewall rules, and security configuration.

---

Azure SQL Database is a fully managed relational database service that handles patching, backups, and high availability for you. When you pair it with Terraform, you get a repeatable way to provision databases across environments without clicking through the Azure portal or writing one-off scripts.

This post covers everything you need to create an Azure SQL Database with Terraform - from the logical server to firewall rules, auditing, and database-level configuration.

## Provider Setup

Make sure your provider is configured to work with Azure SQL resources.

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Resource Group

Group all database resources together.

```hcl
# main.tf
resource "azurerm_resource_group" "db" {
  name     = "rg-sql-production"
  location = "East US"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Generate a Secure Admin Password

Never hardcode passwords in Terraform files. Use the random provider to generate one and store it in Key Vault.

```hcl
# secrets.tf
# Generate a random password for the SQL admin
resource "random_password" "sql_admin" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*"
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
}

# Store the password in Key Vault (assumes Key Vault already exists)
resource "azurerm_key_vault_secret" "sql_admin_password" {
  name         = "sql-admin-password"
  value        = random_password.sql_admin.result
  key_vault_id = var.key_vault_id
}
```

## Azure SQL Server

The logical server is the management endpoint for your databases. It handles authentication, firewall rules, and server-level settings.

```hcl
# server.tf
# Create the Azure SQL logical server
resource "azurerm_mssql_server" "main" {
  name                         = "sql-server-prod-2026"
  resource_group_name          = azurerm_resource_group.db.name
  location                     = azurerm_resource_group.db.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = random_password.sql_admin.result

  # Enable Azure AD authentication alongside SQL auth
  azuread_administrator {
    login_username = "AzureAD Admin"
    object_id      = var.azure_ad_admin_object_id
  }

  # Set minimum TLS version for connections
  minimum_tls_version = "1.2"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Firewall Rules

By default, Azure SQL blocks all connections. You need to explicitly allow access.

```hcl
# firewall.tf
# Allow Azure services to access the SQL server
resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Allow a specific office IP range
resource "azurerm_mssql_firewall_rule" "office" {
  name             = "OfficeNetwork"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "203.0.113.0"
  end_ip_address   = "203.0.113.255"
}

# For production, use VNet service endpoints instead of IP rules
resource "azurerm_mssql_virtual_network_rule" "app_subnet" {
  name      = "app-subnet-rule"
  server_id = azurerm_mssql_server.main.id
  subnet_id = var.app_subnet_id
}
```

## The Database

Now create the actual database on the logical server.

```hcl
# database.tf
# Create the SQL database
resource "azurerm_mssql_database" "app" {
  name      = "db-application"
  server_id = azurerm_mssql_server.main.id

  # DTU-based pricing (simpler)
  # sku_name = "S1"

  # vCore-based pricing (more control)
  sku_name   = "GP_S_Gen5_2"  # General Purpose, Serverless, Gen5, 2 vCores
  max_size_gb = 32

  # Serverless auto-pause after 60 minutes of inactivity
  auto_pause_delay_in_minutes = 60
  min_capacity                = 0.5

  # Zone redundancy for high availability
  zone_redundant = false  # Set to true for Business Critical tier

  # Backup retention
  short_term_retention_policy {
    retention_days           = 7
    backup_interval_in_hours = 12
  }

  long_term_retention_policy {
    weekly_retention  = "P4W"   # Keep weekly backups for 4 weeks
    monthly_retention = "P12M"  # Keep monthly backups for 12 months
    yearly_retention  = "P5Y"   # Keep yearly backups for 5 years
    week_of_year      = 1       # Use the first week of the year
  }

  tags = {
    environment = "production"
    application = "main-app"
  }
}
```

## Auditing Configuration

Enable auditing to track database operations for compliance and security monitoring.

```hcl
# auditing.tf
# Storage account for audit logs
resource "azurerm_storage_account" "audit" {
  name                     = "stauditlogs2026"
  resource_group_name      = azurerm_resource_group.db.name
  location                 = azurerm_resource_group.db.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Enable server-level auditing
resource "azurerm_mssql_server_extended_auditing_policy" "main" {
  server_id                               = azurerm_mssql_server.main.id
  storage_endpoint                        = azurerm_storage_account.audit.primary_blob_endpoint
  storage_account_access_key              = azurerm_storage_account.audit.primary_access_key
  storage_account_access_key_is_secondary = false
  retention_in_days                       = 90
}
```

## Threat Detection

Azure SQL has built-in threat detection that catches SQL injection attempts, anomalous access patterns, and other suspicious activity.

```hcl
# security.tf
# Enable Advanced Threat Protection
resource "azurerm_mssql_server_security_alert_policy" "main" {
  resource_group_name = azurerm_resource_group.db.name
  server_name         = azurerm_mssql_server.main.name
  state               = "Enabled"

  # Email notifications for alerts
  email_addresses = ["security@company.com"]
}
```

## Outputs

Export connection details for use by application deployments.

```hcl
# outputs.tf
output "server_fqdn" {
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
  description = "The fully qualified domain name of the SQL server"
}

output "database_name" {
  value       = azurerm_mssql_database.app.name
  description = "The name of the database"
}

output "connection_string" {
  value       = "Server=tcp:${azurerm_mssql_server.main.fully_qualified_domain_name},1433;Database=${azurerm_mssql_database.app.name};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"
  description = "Base connection string (add authentication separately)"
  sensitive   = true
}
```

## Variables

```hcl
# variables.tf
variable "key_vault_id" {
  type        = string
  description = "Resource ID of the Key Vault for storing secrets"
}

variable "azure_ad_admin_object_id" {
  type        = string
  description = "Object ID of the Azure AD user or group for SQL admin"
}

variable "app_subnet_id" {
  type        = string
  description = "Subnet ID for the application VNet rule"
}
```

## Choosing the Right SKU

Azure SQL offers several pricing tiers. Here is a quick breakdown:

- **DTU-based** (S0, S1, S2, etc.): Simple, bundled compute and storage. Good for predictable workloads.
- **vCore General Purpose**: Separate compute and storage. More flexible. Supports serverless.
- **vCore Business Critical**: Local SSD storage, built-in read replica. For latency-sensitive workloads.
- **Hyperscale**: Up to 100 TB, fast scaling, near-instant backups. For large databases that need to grow.

For most applications starting out, `GP_S_Gen5_2` (General Purpose Serverless with 2 vCores) offers a good balance of cost and performance. Serverless auto-pauses the database when it is not in use, which can significantly reduce costs for development and staging environments.

## Deployment

```bash
# Initialize and apply
terraform init
terraform plan -var-file="production.tfvars" -out=tfplan
terraform apply tfplan
```

After deployment, connect using Azure Data Studio or sqlcmd:

```bash
sqlcmd -S sql-server-prod-2026.database.windows.net -d db-application -U sqladmin -P '<password>'
```

Azure SQL Database and Terraform work well together because database infrastructure changes less frequently than application code, but when it does change, you want those changes tracked and reviewed. The configuration in this post gives you a production-ready setup with proper security, monitoring, and backup policies.
