# How to Integrate Microsoft Purview with Azure Data Factory for Automated Lineage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Purview, Azure Data Factory, Data Lineage, Data Governance, ETL Pipeline, Azure Cloud, Data Integration

Description: Step-by-step guide to connecting Azure Data Factory with Microsoft Purview to automatically capture data lineage from your ETL pipelines.

---

Azure Data Factory is where most organizations build their data pipelines, and Microsoft Purview is where they govern their data. When these two services are connected, every pipeline run in Data Factory automatically pushes lineage information to Purview. You get a complete picture of how data flows from source systems through transformations to destination tables, without writing any custom lineage code.

This integration is one of the quickest ways to get meaningful data lineage in Purview, because ADF pipelines already define the data movement explicitly. In this post, we will set up the integration, verify it works, understand what lineage gets captured, and troubleshoot common issues.

## Prerequisites

Before setting up the integration, make sure you have:

- A Microsoft Purview account in the same Azure tenant as your Data Factory
- An Azure Data Factory instance (V2)
- The Data Factory managed identity needs the "Purview Data Curator" role in Purview
- Both services should be in the same region for best performance (though cross-region works)

## Setting Up the Connection

### Step 1: Grant ADF Access to Purview

The Data Factory managed identity needs permission to push lineage data to Purview. You can grant this through the Purview governance portal or programmatically.

In the Purview governance portal:

1. Navigate to Data Map > Collections
2. Select the root collection (or the collection where you want ADF lineage to appear)
3. Click "Role assignments"
4. Under "Data curators," add the Data Factory managed identity

Through Azure CLI:

```bash
# Get the Data Factory managed identity object ID
ADF_IDENTITY=$(az datafactory show \
  --resource-group my-resource-group \
  --name my-data-factory \
  --query identity.principalId \
  --output tsv)

echo "ADF Managed Identity: $ADF_IDENTITY"

# The Purview role assignment needs to be done through the Purview portal or API
# as Purview uses its own RBAC system separate from Azure RBAC
```

Using the Purview API to assign the role:

```python
import requests

purview_account = "my-purview-account"
base_url = f"https://{purview_account}.purview.azure.com"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Add the ADF managed identity as a Data Curator on the root collection
role_assignment = {
    "members": [
        {
            "objectId": "<adf-managed-identity-object-id>",
            "objectType": "ServicePrincipal"
        }
    ],
    "roleName": "data_curator"
}

# Apply the role assignment to the root collection
response = requests.post(
    f"{base_url}/policystore/collections/my-purview-account/metadataPolicy?api-version=2021-07-01",
    headers=headers,
    json=role_assignment
)
```

### Step 2: Connect Data Factory to Purview

In the Azure Data Factory portal:

1. Open your Data Factory instance
2. Navigate to Manage (the toolbox icon on the left)
3. Select "Microsoft Purview" under "Purview integration"
4. Click "Connect to a Purview account"
5. Select your Purview account from the dropdown
6. Click "Apply"

You can also set this up through an ARM template for infrastructure-as-code:

```json
{
    "type": "Microsoft.DataFactory/factories",
    "apiVersion": "2018-06-01",
    "name": "my-data-factory",
    "location": "eastus",
    "identity": {
        "type": "SystemAssigned"
    },
    "properties": {
        "purviewConfiguration": {
            "purviewResourceId": "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Purview/accounts/my-purview-account"
        }
    }
}
```

### Step 3: Verify the Connection

After connecting, verify the integration is working:

1. In ADF, go to Manage > Microsoft Purview
2. You should see the Purview account name and a "Connected" status
3. The "Lineage push" toggle should be enabled

## What Lineage Gets Captured

Different ADF activity types capture different levels of lineage detail.

### Copy Activity

The Copy activity captures:
- Source dataset (table, file, or container)
- Destination dataset
- The pipeline name and run ID
- Timestamp of the copy

This gives you basic table-to-table lineage. For example, if you copy data from a SQL Database table to a Data Lake Parquet file, Purview shows that relationship.

### Data Flow Activity

Data Flows capture the richest lineage because they include transformation logic:
- All source datasets
- All destination (sink) datasets
- Column-level mappings
- Transformation steps (joins, aggregations, filters, derived columns)

This means if your Data Flow joins two tables and writes the result to a third table, Purview shows all three tables connected through the Data Flow process, with column-level detail showing which input columns map to which output columns.

### Other Activities

- **Stored Procedure activity**: Captures the stored procedure as a process node
- **Lookup activity**: Captured as a data access
- **Execute Pipeline activity**: Child pipeline lineage is captured separately

Activities that do not interact with data (like If Condition, ForEach, Wait) do not generate lineage.

## Building a Sample Pipeline and Checking Lineage

Let us create a simple pipeline and verify lineage appears in Purview.

### Create the Pipeline

Here is a pipeline definition that copies data from a SQL table to a Data Lake and then transforms it:

```json
{
    "name": "customer-etl-pipeline",
    "properties": {
        "activities": [
            {
                "name": "CopyCustomerData",
                "type": "Copy",
                "inputs": [
                    {
                        "referenceName": "SqlCustomersSource",
                        "type": "DatasetReference"
                    }
                ],
                "outputs": [
                    {
                        "referenceName": "DataLakeCustomersRaw",
                        "type": "DatasetReference"
                    }
                ],
                "typeProperties": {
                    "source": {
                        "type": "AzureSqlSource",
                        "sqlReaderQuery": "SELECT * FROM dbo.customers WHERE updated_at > @{pipeline().parameters.lastRunDate}"
                    },
                    "sink": {
                        "type": "ParquetSink"
                    }
                }
            },
            {
                "name": "TransformCustomers",
                "type": "ExecuteDataFlow",
                "dependsOn": [
                    {
                        "activity": "CopyCustomerData",
                        "dependencyConditions": ["Succeeded"]
                    }
                ],
                "typeProperties": {
                    "dataflow": {
                        "referenceName": "CustomerTransformDataFlow",
                        "type": "DataFlowReference"
                    }
                }
            }
        ]
    }
}
```

### Run the Pipeline

Trigger the pipeline manually or wait for a scheduled run. Lineage is only captured when a pipeline actually executes - defining a pipeline alone does not create lineage.

```bash
# Trigger a pipeline run using Azure CLI
az datafactory pipeline create-run \
  --resource-group my-resource-group \
  --factory-name my-data-factory \
  --name customer-etl-pipeline \
  --parameters '{"lastRunDate": "2026-02-15"}'
```

### Check Lineage in Purview

After the pipeline run completes (usually within a few minutes):

1. Open the Purview governance portal
2. Search for one of the datasets involved (e.g., "customers")
3. Click on the asset and navigate to the Lineage tab
4. You should see the data flow from source to destination with the ADF pipeline as the process node

The lineage typically appears within 5-15 minutes of the pipeline run completing. If you do not see it immediately, wait and check again.

## Column-Level Lineage from Data Flows

Data Flows provide the most detailed lineage. Here is what a typical Data Flow looks like and what Purview captures:

```
Source: SQL customers table
  |-> Select: Pick relevant columns (customer_id, name, email, signup_date)
  |-> DerivedColumn: Create full_name from first_name + last_name
  |-> Aggregate: Count orders per customer
  |-> Join: Join with customer_segments on customer_id
  |-> Sink: Write to dim_customers table
```

Purview captures each of these steps and shows column-level lineage. You can click on any column in the sink table and trace it back to its source columns through the transformation steps.

## Troubleshooting Common Issues

### Lineage Not Appearing

If lineage does not show up after a pipeline run:

1. **Check permissions**: Verify the ADF managed identity has the Data Curator role in Purview
2. **Check the connection**: In ADF Manage > Purview, verify the connection status is "Connected"
3. **Check the pipeline run**: Make sure the pipeline run actually succeeded
4. **Wait longer**: Lineage can take up to 15 minutes to appear
5. **Check regions**: Cross-region setups sometimes have longer delays

### Partial Lineage

If only some activities show lineage:

- Copy activities with parameterized table names may not resolve to specific tables
- Dynamic SQL queries in Copy activities may not capture lineage correctly
- Third-party linked services may not support lineage

### Duplicate Assets

If you see duplicate assets in the lineage view:

- Check that your datasets use consistent naming
- Verify that the same storage account is not registered twice in Purview with different names

## Monitoring Lineage Health

Set up a periodic check to ensure lineage is flowing correctly:

```python
# Check recent lineage activity in Purview
# Search for recently updated assets with lineage
search_payload = {
    "keywords": "*",
    "limit": 10,
    "filter": {
        "and": [
            {"attributeName": "entityType", "operator": "eq", "attributeValue": "adf_copy_activity"},
            {"updateTime": {"operator": "ge", "value": "2026-02-16T00:00:00Z"}}
        ]
    },
    "orderby": [{"updateTime": "desc"}]
}

response = requests.post(
    f"{base_url}/catalog/api/search/query?api-version=2022-08-01-preview",
    headers=headers,
    json=search_payload
)

recent_activities = response.json()
print(f"Recent lineage activities: {recent_activities.get('@search.count', 0)}")
for item in recent_activities.get("value", []):
    print(f"  {item['name']} - {item.get('updateTime', 'N/A')}")
```

## Best Practices

**Use Data Flows for important transformations**: Copy activities only give you table-level lineage. If column-level lineage matters (and it usually does for critical pipelines), use Data Flows.

**Name datasets descriptively**: ADF dataset names become the asset names in Purview lineage. Use clear, consistent naming so the lineage graph is readable.

**Tag critical pipelines**: Use ADF annotations and Purview classifications to mark your most important data pipelines for easy identification.

**Test lineage during development**: After building a new pipeline, run it in a test environment and check Purview lineage before promoting to production. It is much easier to fix lineage issues during development.

## Summary

Integrating Azure Data Factory with Microsoft Purview is one of the highest-value governance investments you can make with minimal effort. The setup takes about 15 minutes - grant the managed identity access, connect the services, and run your pipelines. From that point on, every pipeline execution automatically pushes lineage to Purview. Use Data Flows for column-level detail, monitor that lineage is flowing correctly, and use the lineage graph in Purview for impact analysis and compliance documentation. This automated approach to lineage is far more sustainable than trying to manually document data flows.
