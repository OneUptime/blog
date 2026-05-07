# How to Create Azure Data Factory with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Data Factory, ETL, Data Engineering, Infrastructure as Code, Azure Data

Description: Learn how to create Azure Data Factory instances and linked services using OpenTofu for managed ETL/ELT pipeline infrastructure with proper networking and identity configuration.

---

Azure Data Factory (ADF) is Microsoft's cloud-based ETL and data integration service. It orchestrates data movement and transformation across hundreds of data sources. With OpenTofu, you can provision the ADF instance, configure linked services, and set up the integration runtimes as reproducible infrastructure code.

## Creating a Data Factory Instance

```hcl
# main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "adf" {
  name     = "data-factory-${var.environment}-rg"
  location = var.location
}

# Create the Data Factory instance
resource "azurerm_data_factory" "main" {
  name                = "adf-${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.adf.location
  resource_group_name = azurerm_resource_group.adf.name

  # Enable managed virtual network for secure data movement
  managed_virtual_network_enabled = true

  # Enable system-assigned managed identity
  identity {
    type = "SystemAssigned"
  }

  # Enable Git integration for pipeline code management
  vsts_configuration {
    account_name    = var.azure_devops_org
    branch_name     = "main"
    project_name    = var.azure_devops_project
    repository_name = var.adf_repository_name
    root_folder     = "/adf"
    tenant_id       = var.tenant_id
  }

  tags = var.common_tags
}
```

## Configuring Linked Services

Linked services define connections to external data sources and sinks.

```hcl
# linked_services.tf
# Linked service for Azure SQL Database
resource "azurerm_data_factory_linked_service_azure_sql_database" "source_db" {
  name            = "SourceSQLDatabase"
  data_factory_id = azurerm_data_factory.main.id

  # The SQL server must have a Microsoft Entra admin, and the
  # Data Factory identity must exist as a contained database user.
  use_managed_identity = true
  connection_string    = "data source=${var.sql_server_fqdn};initial catalog=${var.sql_database_name};"
}

# Linked service for Azure Blob Storage
resource "azurerm_data_factory_linked_service_azure_blob_storage" "storage" {
  name            = "DataLakeBlobStorage"
  data_factory_id = azurerm_data_factory.main.id

  # Authenticate using managed identity
  use_managed_identity = true
  service_endpoint     = azurerm_storage_account.datalake.primary_blob_endpoint
  storage_kind         = "StorageV2"
}

# Linked service for Azure Key Vault used by other linked services
resource "azurerm_data_factory_linked_service_key_vault" "key_vault" {
  name            = "KeyVaultLinkedService"
  data_factory_id = azurerm_data_factory.main.id
  key_vault_id    = azurerm_key_vault.main.id
}

# Linked service for Snowflake V2 (custom linked service via JSON)
resource "azurerm_data_factory_linked_custom_service" "snowflake" {
  name            = "SnowflakeLinkedService"
  data_factory_id = azurerm_data_factory.main.id
  type            = "SnowflakeV2"

  type_properties_json = jsonencode({
    accountIdentifier = var.snowflake_account
    database          = var.snowflake_database
    warehouse         = var.snowflake_warehouse
    authenticationType = "Basic"
    user              = var.snowflake_user
    password = {
      type = "AzureKeyVaultSecret"
      store = {
        referenceName = azurerm_data_factory_linked_service_key_vault.key_vault.name
        type          = "LinkedServiceReference"
      }
      secretName = "snowflake-password"
    }
  })
}
```

## Setting Up Integration Runtimes

```hcl
# integration_runtime.tf
# Self-hosted integration runtime for on-premises connectivity
resource "azurerm_data_factory_integration_runtime_self_hosted" "onprem" {
  name            = "OnPremIntegrationRuntime"
  data_factory_id = azurerm_data_factory.main.id
  description     = "Self-hosted IR for on-premises SQL Server"
}

# Azure integration runtime for cloud-to-cloud data movement
resource "azurerm_data_factory_integration_runtime_azure" "cloud" {
  name            = "CloudIntegrationRuntime"
  data_factory_id = azurerm_data_factory.main.id
  location        = "AutoResolve"
  virtual_network_enabled = true
  description     = "Auto-resolve Azure IR for cloud data movement"
}
```

## Granting Data Factory Access to Storage

```hcl
# iam.tf
# Grant the Data Factory managed identity access to the data lake storage
resource "azurerm_role_assignment" "adf_storage_contributor" {
  scope                = azurerm_storage_account.datalake.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_data_factory.main.identity[0].principal_id
}

# Grant access to Key Vault for secret retrieval when the vault uses Azure RBAC
resource "azurerm_role_assignment" "adf_keyvault_access" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_data_factory.main.identity[0].principal_id
}
```

## Best Practices

- Use managed identity authentication for linked services rather than storing credentials in ADF - it eliminates credential rotation overhead.
- Enable the managed virtual network on Data Factory and provision Azure integration runtimes inside it to keep data movement within your Azure network perimeter.
- Use Git integration to version control your pipeline definitions alongside your OpenTofu infrastructure code.
- Monitor pipeline runs using ADF Monitor and set up alerts for pipeline failures.
- Use managed private endpoints for linked services that support them to prevent data exfiltration.
