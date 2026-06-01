# How to Configure Linked Services and Datasets in Azure Data Factory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Data Factory, Linked Services, Datasets, Data Integration, Azure, ETL

Description: A detailed guide to configuring linked services and datasets in Azure Data Factory for connecting to various data stores and defining data structures.

---

Linked services and datasets are the building blocks of Azure Data Factory (ADF). Every pipeline you build depends on them. Linked services define the connections to your data stores and compute resources. Datasets define the structure and location of the data within those stores. Getting these right is essential for building reliable, maintainable data pipelines.

In this post, I will cover how to configure linked services and datasets for the most common data sources, explain best practices for managing them, and share some patterns that will save you time in production.

## Linked Services: Your Connection Definitions

A linked service in ADF is similar to a connection string in traditional applications. It tells ADF how to connect to an external resource. This includes the endpoint, authentication method, and any connection parameters.

ADF supports over 100 built-in connectors, covering:

- **Azure services** - Blob Storage, Data Lake Storage, SQL Database, Cosmos DB, Synapse, and more
- **Databases** - SQL Server, Oracle, MySQL, PostgreSQL, MongoDB
- **File stores** - SFTP, FTP, Amazon S3, Google Cloud Storage
- **SaaS applications** - Salesforce, SAP, Dynamics 365, ServiceNow
- **Big data** - Hadoop, Spark, Databricks, HDInsight

### Creating a Linked Service for Azure Blob Storage

Here is how to create a linked service for Azure Blob Storage using the ADF Studio UI and also via JSON definition.

In ADF Studio:
1. Go to **Manage** > **Linked services** > **New**
2. Select "Azure Blob Storage"
3. Fill in the configuration

The equivalent JSON definition looks like this.

```json
{
  "name": "ls_azure_blob",
  "properties": {
    "type": "AzureBlobStorage",
    "typeProperties": {
      "connectionString": "DefaultEndpointsProtocol=https;AccountName=mystorageacct;AccountKey=<key>;EndpointSuffix=core.windows.net"
    },
    "description": "Connection to the main data lake storage account"
  }
}
```

### Creating a Linked Service for Azure SQL Database

```json
{
  "name": "ls_azure_sql",
  "properties": {
    "type": "AzureSqlDatabase",
    "typeProperties": {
      "server": "myserver.database.windows.net",
      "database": "mydb",
      "encrypt": "mandatory",
      "trustServerCertificate": false,
      "authenticationType": "SQL",
      "userName": "myadmin",
      "password": {
        "type": "SecureString",
        "value": "<password>"
      }
    }
  }
}
```

### Creating a Linked Service for On-Premises SQL Server

Connecting to on-premises data requires a self-hosted integration runtime. The linked service references this runtime.

```json
{
  "name": "ls_onprem_sql",
  "properties": {
    "type": "SqlServer",
    "typeProperties": {
      "server": "MYSERVER",
      "database": "mydb",
      "encrypt": "mandatory",
      "trustServerCertificate": false,
      "authenticationType": "Windows",
      "userName": "DOMAIN\\myuser",
      "password": {
        "type": "SecureString",
        "value": "<password>"
      }
    },
    "connectVia": {
      "referenceName": "SelfHostedIR",
      "type": "IntegrationRuntimeReference"
    }
  }
}
```

### Authentication Options

Most linked services support multiple authentication methods. Here are the common ones:

| Method | Use Case |
|--------|----------|
| Account Key | Simple, good for development |
| Service Principal | Recommended for production |
| Managed Identity | Best option when available |
| SQL Authentication | Username/password for databases |
| Windows Authentication | On-premises with domain accounts |
| Key Vault Reference | Secrets stored in Azure Key Vault |

For production environments, I strongly recommend using Azure Key Vault to store secrets and referencing them in your linked services.

```json
{
  "name": "ls_secure_sql",
  "properties": {
    "type": "AzureSqlDatabase",
    "typeProperties": {
      "server": "myserver.database.windows.net",
      "database": "mydb",
      "encrypt": "mandatory",
      "trustServerCertificate": false,
      "authenticationType": "SQL",
      "userName": "myadmin",
      "password": {
        "type": "AzureKeyVaultSecret",
        "store": {
          "referenceName": "ls_key_vault",
          "type": "LinkedServiceReference"
        },
        "secretName": "sql-password"
      }
    }
  }
}
```

This means you first need a linked service to Azure Key Vault itself and you need to grant the data factory managed identity access to the vault secrets.

## Datasets: Defining Your Data

A dataset in ADF represents a named reference to the data you want to work with. It sits on top of a linked service and adds specifics like:

- Which table, file, or container the data is in
- The schema (column names and types)
- Format details (CSV delimiter, JSON structure, Parquet compression)

### CSV File Dataset

```json
{
  "name": "ds_csv_orders",
  "properties": {
    "type": "DelimitedText",
    "linkedServiceName": {
      "referenceName": "ls_azure_blob",
      "type": "LinkedServiceReference"
    },
    "typeProperties": {
      "location": {
        "type": "AzureBlobStorageLocation",
        "container": "raw-data",
        "folderPath": "orders",
        "fileName": "orders_2026.csv"
      },
      "columnDelimiter": ",",
      "rowDelimiter": "\n",
      "quoteChar": "\"",
      "escapeChar": "\\",
      "firstRowAsHeader": true,
      "encodingName": "UTF-8"
    },
    "schema": [
      { "name": "OrderId", "type": "String" },
      { "name": "CustomerId", "type": "String" },
      { "name": "Amount", "type": "Decimal" },
      { "name": "OrderDate", "type": "DateTime" }
    ]
  }
}
```

### Parquet File Dataset

Parquet is a popular columnar format for analytics workloads.

```json
{
  "name": "ds_parquet_sales",
  "properties": {
    "type": "Parquet",
    "linkedServiceName": {
      "referenceName": "ls_data_lake",
      "type": "LinkedServiceReference"
    },
    "typeProperties": {
      "location": {
        "type": "AzureBlobFSLocation",
        "fileSystem": "analytics",
        "folderPath": "silver/sales"
      },
      "compressionCodec": "snappy"
    }
  }
}
```

### SQL Table Dataset

```json
{
  "name": "ds_sql_customers",
  "properties": {
    "type": "AzureSqlTable",
    "linkedServiceName": {
      "referenceName": "ls_azure_sql",
      "type": "LinkedServiceReference"
    },
    "typeProperties": {
      "tableName": "dbo.Customers"
    },
    "schema": [
      { "name": "CustomerId", "type": "int" },
      { "name": "Name", "type": "nvarchar" },
      { "name": "Email", "type": "nvarchar" },
      { "name": "CreatedDate", "type": "datetime2" }
    ]
  }
}
```

## Parameterized Datasets

One of the most powerful features of datasets is parameterization. Instead of creating a separate dataset for each file or table, you can create one parameterized dataset that accepts variables at runtime.

```json
{
  "name": "ds_csv_parameterized",
  "properties": {
    "type": "DelimitedText",
    "linkedServiceName": {
      "referenceName": "ls_azure_blob",
      "type": "LinkedServiceReference"
    },
    "parameters": {
      "containerName": { "type": "String" },
      "folderPath": { "type": "String" },
      "fileName": { "type": "String" }
    },
    "typeProperties": {
      "location": {
        "type": "AzureBlobStorageLocation",
        "container": { "value": "@dataset().containerName", "type": "Expression" },
        "folderPath": { "value": "@dataset().folderPath", "type": "Expression" },
        "fileName": { "value": "@dataset().fileName", "type": "Expression" }
      },
      "columnDelimiter": ",",
      "firstRowAsHeader": true
    }
  }
}
```

When you use this dataset in a Copy activity, you pass the parameter values.

```json
{
  "name": "CopyOrders",
  "type": "Copy",
  "inputs": [
    {
      "referenceName": "ds_csv_parameterized",
      "type": "DatasetReference",
      "parameters": {
        "containerName": "raw-data",
        "folderPath": "orders/2026/02",
        "fileName": "daily_orders.csv"
      }
    }
  ],
  "outputs": [
    {
      "referenceName": "ds_sql_customers",
      "type": "DatasetReference"
    }
  ],
  "typeProperties": {
    "source": {
      "type": "DelimitedTextSource"
    },
    "sink": {
      "type": "AzureSqlSink"
    }
  }
}
```

This approach is far more maintainable than creating dozens of nearly identical datasets.

## Naming Conventions

A consistent naming convention prevents confusion as your data factory grows. Here is what I use:

- **Linked services**: `ls_<type>_<environment>` - e.g., `ls_blob_prod`, `ls_sql_staging`
- **Datasets**: `ds_<format>_<entity>` - e.g., `ds_csv_orders`, `ds_parquet_sales`, `ds_sql_customers`
- **Pipelines**: `pl_<action>_<source>_to_<sink>` - e.g., `pl_copy_blob_to_sql`

## Testing and Validation

Always test your linked services and datasets before using them in pipelines:

1. **Test connection** on every linked service - the "Test connection" button in ADF Studio verifies that credentials and network connectivity work.
2. **Preview data** on datasets - click "Preview data" to see a sample of the actual data. This catches issues with file paths, delimiters, and schema mismatches early.
3. **Import schema** where possible - let ADF auto-detect the schema to catch column type issues before pipeline runs.

## Common Pitfalls

A few things that trip people up:

- **Forgetting to publish** - changes in ADF Studio are not live until you publish them. If your pipeline fails with "dataset not found", you probably forgot to publish.
- **Hardcoded paths** - avoid hardcoding file paths and table names. Use parameters instead.
- **Stale schemas** - if the source schema changes, update your dataset schema or remove it to let ADF infer it dynamically.
- **Connection timeouts** - for on-premises data sources, make sure the self-hosted integration runtime machine has proper network access and firewall rules.

## Wrapping Up

Linked services and datasets are the foundation of every ADF pipeline. Linked services define where your data lives and how to authenticate. Datasets define what the data looks like and how it is formatted. By using parameterized datasets and Key Vault references for secrets, you can build a maintainable, secure data integration layer that scales with your organization. Take the time to set up proper naming conventions and test connections early - it saves significant debugging time down the road.
