# How to Build Azure Data Factory Pipelines and Linked Services with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, Data Factory, Data Engineering, ETL, Infrastructure as Code, Data Pipelines

Description: Build Azure Data Factory pipelines and linked services with Terraform for version-controlled, repeatable data integration infrastructure.

---

Azure Data Factory (ADF) is Microsoft's cloud ETL service for orchestrating data movement and transformation. It connects to dozens of data sources, handles scheduling, monitoring, and retry logic, and scales automatically. The challenge is that ADF configurations created through the portal are hard to replicate across environments. Terraform solves this by letting you define your entire data pipeline infrastructure as code.

This post walks through building an ADF setup with Terraform, including the factory itself, linked services for connecting to data sources, datasets, and pipeline definitions.

## Creating the Data Factory

Start with the Data Factory instance and its supporting resources.

```hcl
# main.tf
# Creates an Azure Data Factory with managed identity and git integration

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "data" {
  name     = "rg-data-factory"
  location = "eastus"
}

# The Data Factory instance
resource "azurerm_data_factory" "main" {
  name                = "adf-etl-production"
  location            = azurerm_resource_group.data.location
  resource_group_name = azurerm_resource_group.data.name

  # Enable system-assigned managed identity for secure connections
  identity {
    type = "SystemAssigned"
  }

  # Optional: connect to a git repository for ADF pipeline development
  github_configuration {
    account_name    = "your-org"
    repository_name = "adf-pipelines"
    branch_name     = "main"
    root_folder     = "/adf"
    git_url         = "https://github.com"
  }

  # Enable managed virtual network for secure data movement
  managed_virtual_network_enabled = true

  tags = {
    environment = "production"
    team        = "data-engineering"
  }
}
```

The managed identity is important because it lets ADF authenticate to Azure services without storing credentials. The managed virtual network isolates data movement traffic for security.

## Linked Services

Linked services define the connections to your data sources and sinks. Think of them as connection strings managed by ADF.

```hcl
# linked-services.tf
# Defines connections to various data sources

# Azure Blob Storage linked service using managed identity
resource "azurerm_data_factory_linked_service_azure_blob_storage" "raw_data" {
  name              = "ls-blob-raw-data"
  data_factory_id   = azurerm_data_factory.main.id

  # Use managed identity instead of connection strings
  use_managed_identity = true
  service_endpoint     = azurerm_storage_account.raw_data.primary_blob_endpoint
}

# Azure SQL Database linked service
resource "azurerm_data_factory_linked_service_azure_sql_database" "warehouse" {
  name            = "ls-sql-warehouse"
  data_factory_id = azurerm_data_factory.main.id

  # Connection string with managed identity authentication
  connection_string = join(";", [
    "Server=tcp:${azurerm_mssql_server.warehouse.fully_qualified_domain_name},1433",
    "Database=${azurerm_mssql_database.warehouse.name}",
    "Authentication=Active Directory Managed Identity",
    "Encrypt=yes",
    "TrustServerCertificate=no",
    "Connection Timeout=30"
  ])
}

# Azure Data Lake Storage Gen2 linked service
resource "azurerm_data_factory_linked_service_data_lake_storage_gen2" "datalake" {
  name                = "ls-adls-datalake"
  data_factory_id     = azurerm_data_factory.main.id

  # Use managed identity for authentication
  use_managed_identity = true
  url                  = "https://${azurerm_storage_account.datalake.name}.dfs.core.windows.net"
}

# Key Vault linked service for retrieving secrets
resource "azurerm_data_factory_linked_service_key_vault" "secrets" {
  name            = "ls-keyvault-secrets"
  data_factory_id = azurerm_data_factory.main.id
  key_vault_id    = azurerm_key_vault.data.id
}

# Linked service for external data sources using Key Vault secrets
resource "azurerm_data_factory_linked_service_azure_sql_database" "external_db" {
  name            = "ls-sql-external"
  data_factory_id = azurerm_data_factory.main.id

  # Reference connection string from Key Vault
  key_vault_connection_string {
    linked_service_name = azurerm_data_factory_linked_service_key_vault.secrets.name
    secret_name         = "external-db-connection-string"
  }
}
```

Using Key Vault for connection strings means no secrets are stored in your Terraform state or ADF configuration. The managed identity handles authentication to Key Vault automatically.

## Datasets

Datasets describe the structure of your data within linked services.

```hcl
# datasets.tf
# Defines the structure of data sources and sinks

# CSV dataset in blob storage for raw input files
resource "azurerm_data_factory_dataset_delimited_text" "raw_csv" {
  name                = "ds-raw-csv-input"
  data_factory_id     = azurerm_data_factory.main.id
  linked_service_name = azurerm_data_factory_linked_service_azure_blob_storage.raw_data.name

  azure_blob_storage_location {
    container = "raw-data"
    # Dynamic path using parameters
    dynamic_path_enabled = true
    path                 = "@dataset().folderPath"
    dynamic_filename_enabled = true
    filename             = "@dataset().fileName"
  }

  column_delimiter    = ","
  row_delimiter       = "\n"
  first_row_as_header = true
  encoding            = "UTF-8"

  # Dataset parameters for dynamic paths
  schema_column {
    name = "id"
    type = "String"
  }
  schema_column {
    name = "timestamp"
    type = "String"
  }
  schema_column {
    name = "value"
    type = "String"
  }
}

# Parquet dataset in Data Lake for processed data
resource "azurerm_data_factory_dataset_parquet" "processed" {
  name                = "ds-parquet-processed"
  data_factory_id     = azurerm_data_factory.main.id
  linked_service_name = azurerm_data_factory_linked_service_data_lake_storage_gen2.datalake.name

  azure_blob_storage_location {
    container = "processed"
    path      = "data/processed"
  }

  compression_codec = "snappy"
}

# SQL table dataset for the warehouse
resource "azurerm_data_factory_dataset_azure_blob" "warehouse_table" {
  name                = "ds-sql-warehouse-table"
  data_factory_id     = azurerm_data_factory.main.id
  linked_service_name = azurerm_data_factory_linked_service_azure_sql_database.warehouse.name

  additional_properties = {
    "typeProperties" = jsonencode({
      schema    = "dbo"
      tableName = "orders"
    })
  }
}
```

## Pipeline Definitions

Pipelines orchestrate the data flow. You can define them in Terraform using the pipeline resource with JSON activity definitions.

```hcl
# pipelines.tf
# Defines ETL pipelines as Terraform resources

# Main ETL pipeline: copy raw CSV to Data Lake as Parquet, then load to SQL
resource "azurerm_data_factory_pipeline" "etl_main" {
  name            = "pl-etl-main"
  data_factory_id = azurerm_data_factory.main.id
  description     = "Main ETL pipeline: raw CSV to processed Parquet to SQL warehouse"

  # Pipeline parameters
  parameters = {
    sourceFolder = ""
    sourceFile   = ""
    targetTable  = ""
  }

  # Pipeline activities defined as JSON
  activities_json = jsonencode([
    {
      name = "Copy Raw to Data Lake"
      type = "Copy"
      dependsOn = []
      policy = {
        timeout = "0.02:00:00"
        retry   = 3
        retryIntervalInSeconds = 30
      }
      typeProperties = {
        source = {
          type = "DelimitedTextSource"
          storeSettings = {
            type = "AzureBlobStorageReadSettings"
            recursive = false
          }
        }
        sink = {
          type = "ParquetSink"
          storeSettings = {
            type = "AzureBlobFSWriteSettings"
          }
        }
        enableStaging = false
      }
      inputs = [{
        referenceName = azurerm_data_factory_dataset_delimited_text.raw_csv.name
        type          = "DatasetReference"
        parameters = {
          folderPath = "@pipeline().parameters.sourceFolder"
          fileName   = "@pipeline().parameters.sourceFile"
        }
      }]
      outputs = [{
        referenceName = azurerm_data_factory_dataset_parquet.processed.name
        type          = "DatasetReference"
      }]
    },
    {
      name = "Load to Warehouse"
      type = "Copy"
      dependsOn = [{
        activity = "Copy Raw to Data Lake"
        dependencyConditions = ["Succeeded"]
      }]
      policy = {
        timeout = "0.01:00:00"
        retry   = 2
        retryIntervalInSeconds = 60
      }
      typeProperties = {
        source = {
          type = "ParquetSource"
        }
        sink = {
          type = "AzureSqlSink"
          writeBehavior = "upsert"
          sqlWriterUseTableLock = false
        }
      }
      inputs = [{
        referenceName = azurerm_data_factory_dataset_parquet.processed.name
        type          = "DatasetReference"
      }]
      outputs = [{
        referenceName = azurerm_data_factory_dataset_azure_blob.warehouse_table.name
        type          = "DatasetReference"
      }]
    }
  ])
}
```

## Triggers

Triggers define when pipelines run. You can create schedule triggers, tumbling window triggers, or event-based triggers.

```hcl
# triggers.tf
# Defines when pipelines execute

# Schedule trigger - runs the ETL pipeline every day at 2 AM
resource "azurerm_data_factory_trigger_schedule" "daily_etl" {
  name            = "tr-daily-etl"
  data_factory_id = azurerm_data_factory.main.id

  # Run every day at 2:00 AM UTC
  frequency = "Day"
  interval  = 1
  start_time = "2026-02-16T02:00:00Z"
  time_zone  = "UTC"

  # Activate the trigger after creation
  activated = true

  pipeline {
    name = azurerm_data_factory_pipeline.etl_main.name
    parameters = {
      sourceFolder = "daily-uploads"
      sourceFile   = "orders.csv"
      targetTable  = "dbo.orders"
    }
  }
}

# Blob event trigger - runs when new files arrive
resource "azurerm_data_factory_trigger_blob_event" "new_file" {
  name            = "tr-blob-new-file"
  data_factory_id = azurerm_data_factory.main.id

  storage_account_id = azurerm_storage_account.raw_data.id
  events             = ["Microsoft.Storage.BlobCreated"]

  blob_path_begins_with = "/raw-data/incoming/"
  blob_path_ends_with   = ".csv"
  ignore_empty_blobs    = true

  activated = true

  pipeline {
    name = azurerm_data_factory_pipeline.etl_main.name
    parameters = {
      sourceFolder = "@triggerBody().folderPath"
      sourceFile   = "@triggerBody().fileName"
      targetTable  = "dbo.orders"
    }
  }
}
```

## Granting Data Factory Access

Since we are using managed identity, the Data Factory needs RBAC roles on the data sources.

```hcl
# iam.tf
# Grant the Data Factory managed identity access to data sources

# Blob storage access
resource "azurerm_role_assignment" "adf_blob_reader" {
  scope                = azurerm_storage_account.raw_data.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_data_factory.main.identity[0].principal_id
}

# Data Lake access
resource "azurerm_role_assignment" "adf_datalake" {
  scope                = azurerm_storage_account.datalake.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_data_factory.main.identity[0].principal_id
}

# Key Vault access for secrets
resource "azurerm_role_assignment" "adf_keyvault" {
  scope                = azurerm_key_vault.data.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_data_factory.main.identity[0].principal_id
}
```

## Summary

Terraform brings structure and repeatability to Azure Data Factory deployments. You define your linked services, datasets, pipelines, and triggers as code, making it straightforward to replicate across environments and track changes over time. The combination of managed identity authentication and Key Vault for secrets means your pipeline infrastructure is both secure and maintainable. Start with the factory and linked services, add datasets for your data shapes, build pipelines to orchestrate the flow, and wire up triggers to automate execution.
