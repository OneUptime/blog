# How to Register and Scan Data Sources in Microsoft Purview Data Map

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Purview, Data Map, Data Governance, Data Discovery, Azure Cloud, Data Catalog, Metadata Management

Description: Learn how to register data sources and configure automated scans in Microsoft Purview Data Map to build a comprehensive view of your data estate.

---

When your organization has data scattered across dozens of storage accounts, SQL databases, Synapse workspaces, and third-party systems, knowing what data exists and where it lives becomes a real challenge. Microsoft Purview Data Map solves this by providing a centralized metadata catalog that automatically discovers, classifies, and maps your entire data estate.

The foundation of Purview Data Map is the register-and-scan workflow: you register a data source (telling Purview where your data lives), then configure scans (telling Purview to go look at what is inside). In this post, we will walk through registering common Azure data sources, configuring scans, and understanding what Purview discovers.

## Prerequisites

Before you start registering data sources, make sure you have:

- A Microsoft Purview account (formerly Azure Purview)
- The Data Source Administrator role in your Purview account
- Appropriate permissions on the data sources you want to scan (typically Reader access)
- A self-hosted integration runtime if you need to scan on-premises data sources

## Understanding the Registration Process

Registering a data source in Purview does not actually read your data. It simply tells Purview that a data source exists and provides the connection information. The actual metadata discovery happens during scanning.

Think of registration as adding a entry to your address book, and scanning as actually visiting the address to see what is there.

## Registering an Azure SQL Database

Let us start with one of the most common data sources. Open the Microsoft Purview governance portal and follow these steps:

1. Navigate to Data Map > Sources
2. Click "Register" at the top of the page
3. Select "Azure SQL Database" from the list of supported sources
4. Fill in the registration details:
   - **Name**: A friendly name for this source (e.g., "Production Orders Database")
   - **Azure subscription**: Select the subscription containing the database
   - **Server name**: Select or enter the SQL Server name
   - **Collection**: Choose which collection to place this source in

You can also register data sources programmatically using the Purview REST API:

```python
import requests

# Register an Azure SQL Database source using the Purview REST API
# First, get an access token using your service principal
purview_account = "my-purview-account"
base_url = f"https://{purview_account}.purview.azure.com"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Define the data source registration payload
registration_payload = {
    "kind": "AzureSqlDatabase",
    "name": "production-orders-db",
    "properties": {
        "serverEndpoint": "myserver.database.windows.net",
        "resourceGroup": "my-resource-group",
        "subscriptionId": "your-subscription-id",
        "location": "eastus",
        "resourceName": "myserver/orders-db",
        "collection": {
            "type": "CollectionReference",
            "referenceName": "my-collection"
        }
    }
}

# Register the source
response = requests.put(
    f"{base_url}/scan/datasources/production-orders-db?api-version=2022-07-01-preview",
    headers=headers,
    json=registration_payload
)
print(f"Registration status: {response.status_code}")
```

## Registering an Azure Storage Account

For Azure Blob Storage or ADLS Gen2:

```python
# Register an Azure Storage account
storage_payload = {
    "kind": "AzureStorage",
    "name": "data-lake-raw",
    "properties": {
        "endpoint": "https://mydatalake.blob.core.windows.net",
        "resourceGroup": "my-resource-group",
        "subscriptionId": "your-subscription-id",
        "location": "eastus",
        "collection": {
            "type": "CollectionReference",
            "referenceName": "my-collection"
        }
    }
}

response = requests.put(
    f"{base_url}/scan/datasources/data-lake-raw?api-version=2022-07-01-preview",
    headers=headers,
    json=storage_payload
)
```

## Registering Azure Synapse Analytics

```python
# Register an Azure Synapse Analytics workspace
synapse_payload = {
    "kind": "AzureSynapseWorkspace",
    "name": "analytics-workspace",
    "properties": {
        "dedicatedSqlEndpoint": "my-synapse.sql.azuresynapse.net",
        "serverlessSqlEndpoint": "my-synapse-ondemand.sql.azuresynapse.net",
        "resourceGroup": "my-resource-group",
        "subscriptionId": "your-subscription-id",
        "location": "eastus",
        "collection": {
            "type": "CollectionReference",
            "referenceName": "my-collection"
        }
    }
}
```

## Configuring Authentication for Scans

Before scanning, you need to set up authentication so Purview can access your data sources. The recommended approach is using a Managed Identity.

### Managed Identity (Recommended)

Grant the Purview managed identity access to your data source:

```bash
# Grant Purview's managed identity Reader access to a SQL Database
# First, get the Purview managed identity object ID from the Azure portal

# For Azure SQL Database, add the Purview identity as a database user
# Connect to the SQL Database and run:
```

```sql
-- Create a user for the Purview managed identity in the SQL Database
-- Replace 'my-purview-account' with your actual Purview account name
CREATE USER [my-purview-account] FROM EXTERNAL PROVIDER;

-- Grant the db_datareader role so Purview can read schema and sample data
ALTER ROLE db_datareader ADD MEMBER [my-purview-account];
```

For Azure Storage, assign the Storage Blob Data Reader role:

```bash
# Assign Storage Blob Data Reader to the Purview managed identity
az role assignment create \
  --role "Storage Blob Data Reader" \
  --assignee-object-id "<purview-managed-identity-object-id>" \
  --scope "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/mydatalake"
```

## Configuring and Running Scans

With registration and authentication in place, configure a scan for each data source.

### Scan for Azure SQL Database

In the Purview portal:

1. Navigate to the registered SQL Database source
2. Click "New Scan"
3. Configure the scan settings:
   - **Name**: "weekly-full-scan"
   - **Credential**: Select the Purview managed identity
   - **Database selection**: Choose which databases to scan
   - **Select a scan rule set**: Use the system default or create a custom one

Here is the API approach:

```python
# Configure a scan for the registered SQL Database
scan_payload = {
    "kind": "AzureSqlDatabaseCredential",
    "name": "weekly-full-scan",
    "properties": {
        "credential": {
            "referenceName": "purview-managed-identity",
            "credentialType": "ManagedIdentity"
        },
        "serverEndpoint": "myserver.database.windows.net",
        "databaseName": "orders-db",
        "scanRulesetName": "AzureSqlDatabase",
        "scanRulesetType": "System",
        "collection": {
            "type": "CollectionReference",
            "referenceName": "my-collection"
        }
    }
}

# Create the scan
response = requests.put(
    f"{base_url}/scan/datasources/production-orders-db/scans/weekly-full-scan?api-version=2022-07-01-preview",
    headers=headers,
    json=scan_payload
)

# Create a scan trigger (schedule)
trigger_payload = {
    "properties": {
        "recurrence": {
            "frequency": "Week",
            "interval": 1,
            "startTime": "2026-02-16T06:00:00Z",
            "timezone": "UTC",
            "schedule": {
                "hours": [6],
                "minutes": [0],
                "weekDays": ["Sunday"]
            }
        },
        "scanLevel": "Full"
    }
}

response = requests.put(
    f"{base_url}/scan/datasources/production-orders-db/scans/weekly-full-scan/triggers/default?api-version=2022-07-01-preview",
    headers=headers,
    json=trigger_payload
)
```

### Scan for Azure Storage

Storage scans discover files, their formats, and apply classification rules to detect sensitive data:

```python
# Configure a scan for the Azure Storage account
storage_scan_payload = {
    "kind": "AzureStorageCredential",
    "name": "daily-incremental-scan",
    "properties": {
        "credential": {
            "referenceName": "purview-managed-identity",
            "credentialType": "ManagedIdentity"
        },
        "scanRulesetName": "AzureStorage",
        "scanRulesetType": "System",
        "collection": {
            "type": "CollectionReference",
            "referenceName": "my-collection"
        }
    }
}
```

## What Scans Discover

When a scan runs, Purview extracts several types of metadata:

**Schema information**: Table names, column names, data types, primary keys, and foreign keys for structured data sources. For files in storage, it identifies the format (CSV, Parquet, JSON, etc.) and infers the schema.

**Classifications**: Purview automatically classifies columns based on their content. It can detect sensitive data types like credit card numbers, social security numbers, email addresses, phone numbers, and more. These classifications use pattern matching and machine learning.

**Relationships**: For SQL databases, Purview discovers foreign key relationships between tables. For storage accounts, it identifies the hierarchical structure of containers and folders.

**Data sampling**: Purview samples a small amount of data from each source to power classification. It does not copy or store your actual data - only metadata and sample values.

## Organizing Sources with Collections

Collections provide a hierarchical way to organize your registered data sources. Think of them like folders:

```
Root Collection
  |-- Production
  |     |-- Databases
  |     |-- Data Lake
  |     |-- Synapse
  |-- Development
  |     |-- Test Databases
  |-- External
        |-- Third Party APIs
        |-- Partner Data
```

Collections also control access permissions. You can grant users access at the collection level, and they inherit access to all sources within that collection and its children.

## Monitoring Scan Status

Track scan progress and troubleshoot failures:

```python
# Check the status of a scan run
response = requests.get(
    f"{base_url}/scan/datasources/production-orders-db/scans/weekly-full-scan/runs?api-version=2022-07-01-preview",
    headers=headers
)

scan_runs = response.json()
for run in scan_runs.get("value", []):
    print(f"Run ID: {run['id']}")
    print(f"Status: {run['status']}")
    print(f"Start time: {run.get('startTime', 'N/A')}")
    print(f"End time: {run.get('endTime', 'N/A')}")
    print(f"Assets discovered: {run.get('lastUpdatedAssetsCount', 0)}")
    print("---")
```

## Summary

Registering and scanning data sources in Microsoft Purview Data Map is the foundation for data governance in your organization. The process is straightforward: register a source to tell Purview where your data lives, configure authentication so Purview can access it, then set up scans to discover what is inside. Start with your most critical data sources, set up weekly scans, and expand from there. The metadata that Purview discovers - schemas, classifications, and relationships - becomes the basis for data discovery, lineage tracking, and compliance reporting across your entire data estate.
