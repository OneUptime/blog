# How to Integrate Microsoft Purview with Azure Data Factory for Automated Lineage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Purview, Azure Data Factory, Data Lineage, Data Governance, ETL Pipeline, Azure Cloud, Data Integration

Description: Step-by-step guide to connecting Azure Data Factory with Microsoft Purview to automatically capture data lineage from your ETL pipelines.

---

Azure Data Factory is where most organizations build their data pipelines, and Microsoft Purview is where they govern their data. When these two services are connected, supported pipeline activities in Data Factory automatically push lineage information to Purview. You get a picture of how data flows from supported source systems to supported destination tables, without writing any custom lineage code.

This integration is one of the quickest ways to get meaningful data lineage in Purview, because ADF pipelines already define the data movement explicitly. In this post, we will set up the integration, verify it works, understand what lineage gets captured, and troubleshoot common issues.

## Prerequisites

Before setting up the integration, make sure you have:

- A Microsoft Purview account in the same Azure tenant as your Data Factory
- An Azure Data Factory instance (V2)
- The Data Factory managed identity needs the "Purview Data Curator" role in Purview
- If your Purview account is protected by firewall rules, configure the required managed private endpoints so ADF can reach it

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

Using the Purview metadata policy API to assign the role requires fetching the collection metadata policy, adding the Data Factory managed identity object ID to the Data Curator role rule, and writing the updated policy back:

```python
import requests

purview_account = "my-purview-account"
base_url = f"https://{purview_account}.purview.azure.com"
collection_name = "my-purview-account"  # Use the collection name, not the display name
adf_object_id = "<adf-managed-identity-object-id>"
access_token = "<purview-access-token>"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Get the latest metadata policy for the collection
policy_response = requests.get(
    f"{base_url}/policystore/collections/{collection_name}/metadataPolicy?api-version=2021-07-01",
    headers=headers
)
policy_response.raise_for_status()
policy = policy_response.json()

# Add the ADF managed identity to the Data Curator role rule
role_rule_name = f"purviewmetadatarole_builtin_data-curator:{collection_name}"
for rule in policy["properties"]["attributeRules"]:
    if rule["name"] == role_rule_name:
        principals = rule["dnfCondition"][0][0]["attributeValueIncludedIn"]
        if adf_object_id not in principals:
            principals.append(adf_object_id)
        break

# Write the updated policy back by policy ID
response = requests.put(
    f"{base_url}/policystore/metadataPolicies/{policy['id']}?api-version=2021-07-01",
    headers=headers,
    json=policy
)
response.raise_for_status()
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
3. Under the integration capabilities, the "Data Lineage - Pipeline" status should be "Connected"

## What Lineage Gets Captured

Microsoft Purview captures runtime lineage for Copy Data, Data Flow, and Execute SSIS Package activities when the source and sink use supported data stores. Unsupported activities and unsupported source or destination systems do not produce lineage.

### Copy Activity

The Copy activity captures:
- Source dataset (table, file, or container)
- Destination dataset
- The pipeline name and run ID
- Timestamp of the copy

This gives you basic table-to-table lineage. For example, if you copy data from a SQL Database table to a Data Lake Parquet file, Purview shows that relationship.

### Data Flow Activity

Data Flows capture source-to-sink lineage for supported data stores:
- All source datasets
- All destination (sink) datasets
- Column-level lineage when the source and sink are not resource sets

This means if your Data Flow joins two supported tables and writes the result to a third supported table, Purview shows the source and sink assets connected through the Data Flow process. Purview does not currently show the detailed Data Flow transformation steps such as joins, aggregates, filters, or derived-column operations.

### Other Activities

- **Execute SSIS Package activity**: Captures lineage for supported SSIS package executions
- **Stored Procedure activity**: Not captured by the ADF-Purview lineage integration
- **Lookup activity**: Not captured by the ADF-Purview lineage integration
- **Execute Pipeline activity**: Does not generate lineage by itself; supported activities inside the invoked pipeline can still report their own lineage when they run

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

Data Flows can provide column-level lineage for supported sources and sinks that are not resource sets. Here is what a typical Data Flow looks like:

```text
Source: SQL customers table
  |-> Select: Pick relevant columns (customer_id, name, email, signup_date)
  |-> DerivedColumn: Create full_name from first_name + last_name
  |-> Aggregate: Count orders per customer
  |-> Join: Join with customer_segments on customer_id
  |-> Sink: Write to dim_customers table
```

Purview shows the supported source and sink assets involved in the Data Flow and can show column-level lineage between them. It does not currently show each transformation step inside the Data Flow lineage graph.

## Troubleshooting Common Issues

### Lineage Not Appearing

If lineage does not show up after a pipeline run:

1. **Check permissions**: Verify the ADF managed identity has the Data Curator role in Purview
2. **Check the connection**: In ADF Manage > Purview, verify the connection status is "Connected"
3. **Check the pipeline run**: Make sure the pipeline run actually succeeded
4. **Wait longer**: Lineage can take up to 15 minutes to appear
5. **Check network access**: If Purview is protected by a firewall, make sure the integration runtime used by the pipeline can reach the Purview account

### Partial Lineage

If only some activities show lineage:

- Copy activities with parameterized table names may not resolve to specific tables
- Query or stored procedure sources in Copy activities do not produce table-level lineage in Purview; lineage is limited to table and view sources
- Third-party linked services may not support lineage

### Duplicate Assets

If you see duplicate assets in the lineage view:

- Check that your datasets use consistent naming
- Verify that the same storage account is not registered twice in Purview with different names

## Monitoring Lineage Health

Set up a periodic check to ensure lineage is flowing correctly:

```python
# Check recent ADF copy activity assets in Purview
# updateTime uses Unix epoch time in milliseconds
search_payload = {
    "keywords": None,
    "limit": 10,
    "filter": {
        "and": [
            {"attributeName": "entityType", "operator": "eq", "attributeValue": "adf_copy_activity"},
            {"attributeName": "updateTime", "operator": "ge", "attributeValue": 1771200000000}
        ]
    },
    "orderby": [{"updateTime": "desc"}]
}

response = requests.post(
    f"{base_url}/datamap/api/search/query?api-version=2023-09-01",
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

**Name pipelines and activities descriptively**: ADF pipeline and activity names appear as process nodes in Purview lineage. Use clear, consistent naming so the lineage graph is readable.

**Tag critical pipelines**: Use ADF annotations and Purview classifications to mark your most important data pipelines for easy identification.

**Test lineage during development**: After building a new pipeline, run it in a test environment and check Purview lineage before promoting to production. It is much easier to fix lineage issues during development.

## Summary

Integrating Azure Data Factory with Microsoft Purview is one of the highest-value governance investments you can make with minimal effort. The setup takes about 15 minutes - grant the managed identity access, connect the services, and run your pipelines. From that point on, supported pipeline activities automatically push lineage to Purview. Use Data Flows where column-level detail is needed and supported, monitor that lineage is flowing correctly, and use the lineage graph in Purview for impact analysis and compliance documentation. This automated approach to lineage is far more sustainable than trying to manually document data flows.
