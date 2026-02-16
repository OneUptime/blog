# How to Trace End-to-End Data Lineage in Microsoft Purview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Purview, Data Lineage, Data Governance, Data Pipeline, Azure Data Factory, Azure Cloud, Metadata Management

Description: A practical guide to tracking data lineage across your entire data pipeline using Microsoft Purview for impact analysis and compliance.

---

When a business analyst asks "where does this number come from?" and you cannot answer confidently, you have a lineage problem. Data lineage traces the path of data from its origin through every transformation, join, filter, and aggregation until it reaches the final report or dashboard. Microsoft Purview provides automated lineage tracking that captures these data flows across Azure services, giving you a visual map of how data moves through your organization.

In this post, we will look at how Purview captures lineage from different sources, how to navigate the lineage view to trace data end-to-end, and how to fill gaps where automated lineage is not available.

## What Data Lineage Shows You

Purview's lineage view answers several critical questions:

- **Where did this data come from?** Trace a dashboard metric back through aggregations, transformations, and joins to the original source tables.
- **What will be affected if I change this table?** See every downstream pipeline, report, and dataset that depends on a given source.
- **How was this data transformed?** Understand the business logic applied at each step of the pipeline.
- **Who last modified this pipeline?** Track changes to data processing logic.

This information is essential for impact analysis (before making changes), root cause analysis (when something breaks), and regulatory compliance (proving data provenance).

## Sources of Automated Lineage

Purview captures lineage automatically from several Azure services. No custom code is needed for these integrations - just connect Purview to these services and lineage flows in.

### Azure Data Factory and Synapse Pipelines

This is the richest source of automated lineage. When ADF or Synapse pipelines run, they push lineage data to Purview, including:

- Source and destination datasets
- Copy activity data flows
- Data flow transformations (joins, aggregations, filters, derived columns)
- Column-level lineage for data flows

The connection happens through the ADF pipeline settings. Here is how to enable it:

```bash
# Link Azure Data Factory to Purview for automated lineage
# This is done in the ADF portal under Manage > Purview
# Or via ARM template:
az resource update \
  --resource-group my-resource-group \
  --name my-data-factory \
  --resource-type "Microsoft.DataFactory/factories" \
  --set properties.purviewConfiguration.purviewResourceId="/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Purview/accounts/my-purview-account"
```

### Azure SQL Database

Purview captures table-level dependencies within Azure SQL Database, including views, stored procedures, and functions that reference other tables.

### Azure Synapse Analytics

Both dedicated SQL pools and serverless SQL pools push lineage to Purview when queries create new tables or views from existing ones.

### Power BI

Purview can capture lineage from Power BI datasets, showing which data sources feed into which reports and dashboards.

## Navigating the Lineage View

Once lineage is captured, you can explore it in the Purview governance portal.

### Finding an Asset

Start by searching for the asset you want to trace:

1. Open the Purview governance portal
2. Use the search bar to find your table, dataset, or report
3. Click on the asset to open its detail page
4. Click the "Lineage" tab

### Reading the Lineage Graph

The lineage graph shows assets as nodes and data flows as edges. Here is what the different node types represent:

- **Rectangles**: Data assets (tables, files, datasets)
- **Rounded rectangles**: Processing activities (ADF Copy, Data Flow, SQL query)
- **Arrows**: Data flow direction (left to right by default)

You can trace upstream (where data comes from) or downstream (where data goes) by following the arrows.

### Column-Level Lineage

For ADF Data Flows, Purview captures column-level lineage. This means you can see not just which tables are connected, but which specific columns map to which output columns through transformations.

Click on any data asset in the lineage graph and expand the column view to see column-level mappings. This is incredibly valuable for impact analysis - if you rename or remove a column, you can see exactly which downstream processes depend on it.

## Querying Lineage Programmatically

For automated reporting or integration with other tools, use the Purview REST API to query lineage:

```python
import requests

purview_account = "my-purview-account"
base_url = f"https://{purview_account}.purview.azure.com"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Get the GUID of the asset you want to trace
# First, search for the asset
search_payload = {
    "keywords": "fact_orders",
    "limit": 10,
    "filter": {
        "and": [
            {"objectType": "Tables"}
        ]
    }
}

response = requests.post(
    f"{base_url}/catalog/api/search/query?api-version=2022-08-01-preview",
    headers=headers,
    json=search_payload
)

results = response.json()
asset_guid = results["value"][0]["id"]
print(f"Asset GUID: {asset_guid}")

# Now get the lineage for this asset
# Direction can be "INPUT" (upstream) or "OUTPUT" (downstream) or "BOTH"
lineage_response = requests.get(
    f"{base_url}/catalog/api/atlas/v2/lineage/{asset_guid}?direction=BOTH&depth=5&api-version=2022-08-01-preview",
    headers=headers
)

lineage = lineage_response.json()

# Print upstream sources
print("\nUpstream lineage:")
for relation in lineage.get("relations", []):
    print(f"  {relation['fromEntityId']} -> {relation['toEntityId']}")

# Print the entities involved
print("\nEntities in lineage:")
for guid, entity in lineage.get("guidEntityMap", {}).items():
    print(f"  {entity['attributes'].get('qualifiedName', 'Unknown')}: {entity['typeName']}")
```

## Setting Up Custom Lineage

Not all data movement is captured automatically. If you have custom Python scripts, Spark jobs, or third-party ETL tools moving data, you need to push lineage to Purview manually.

### Using the Apache Atlas API

Purview is built on Apache Atlas, and you can use the Atlas API to create custom lineage entries:

```python
# Create a custom lineage entry for a Python ETL script
# This tells Purview that a process reads from source_table and writes to target_table

# First, define the process entity
process_entity = {
    "entity": {
        "typeName": "Process",
        "attributes": {
            "name": "daily-customer-etl",
            "qualifiedName": "custom://daily-customer-etl",
            "description": "Python script that aggregates customer data daily"
        },
        "relationshipAttributes": {
            "inputs": [
                {
                    "typeName": "azure_sql_table",
                    "uniqueAttributes": {
                        "qualifiedName": "mssql://myserver.database.windows.net/mydb/dbo/raw_customers"
                    }
                }
            ],
            "outputs": [
                {
                    "typeName": "azure_sql_table",
                    "uniqueAttributes": {
                        "qualifiedName": "mssql://myserver.database.windows.net/mydb/dbo/dim_customers"
                    }
                }
            ]
        }
    }
}

response = requests.post(
    f"{base_url}/catalog/api/atlas/v2/entity",
    headers=headers,
    json=process_entity
)
print(f"Custom lineage created: {response.status_code}")
```

### Column-Level Custom Lineage

For detailed column-level tracking in custom processes:

```python
# Define column-level lineage for a custom transformation
column_lineage = {
    "entity": {
        "typeName": "Process",
        "attributes": {
            "name": "customer-aggregation",
            "qualifiedName": "custom://customer-aggregation",
            "columnMapping": "[{\"DatasetMapping\":{\"Source\":\"raw_customers\",\"Sink\":\"dim_customers\"},\"ColumnMapping\":[{\"Source\":\"first_name,last_name\",\"Sink\":\"full_name\"},{\"Source\":\"email\",\"Sink\":\"email_address\"},{\"Source\":\"order_count\",\"Sink\":\"total_orders\"}]}]"
        },
        "relationshipAttributes": {
            "inputs": [{"typeName": "azure_sql_table", "uniqueAttributes": {"qualifiedName": "mssql://myserver/mydb/dbo/raw_customers"}}],
            "outputs": [{"typeName": "azure_sql_table", "uniqueAttributes": {"qualifiedName": "mssql://myserver/mydb/dbo/dim_customers"}}]
        }
    }
}
```

## Practical Use Cases

### Impact Analysis Before Schema Changes

Before renaming a column in a source table, check what depends on it:

1. Search for the table in Purview
2. Open the lineage view
3. Click on the specific column
4. Trace downstream to see all pipelines, tables, and reports that use this column
5. Coordinate with the owners of those downstream assets before making the change

### Root Cause Analysis for Data Quality Issues

When a dashboard shows incorrect numbers:

1. Search for the dashboard dataset in Purview
2. Open the lineage view
3. Trace upstream through each transformation step
4. Check the lineage timestamps to identify when the pipeline last ran
5. Identify which specific transformation or source might be causing the issue

### Regulatory Compliance

For regulations like GDPR that require knowing where personal data flows:

1. Search for assets classified as containing personal data (PII)
2. For each asset, trace the lineage to see everywhere that personal data flows
3. Document the data flows for your compliance records
4. Identify any data movements that should be restricted

## Lineage Best Practices

**Connect all automated sources first**: Start by linking ADF, Synapse, and Power BI to Purview. This gives you the most lineage coverage with the least effort.

**Fill gaps with custom lineage**: Identify any data movements not covered by automated lineage (custom scripts, third-party tools) and add custom lineage entries for them.

**Review lineage regularly**: As pipelines change, lineage evolves. Schedule periodic reviews to ensure the lineage map still reflects reality.

**Use lineage depth wisely**: When querying lineage programmatically, start with a depth of 3-5 hops. Going deeper can return overwhelming amounts of data for complex pipelines.

**Tag critical data paths**: Use Purview glossary terms to tag the most important data paths so they are easy to find and monitor.

## Summary

End-to-end data lineage in Microsoft Purview gives you visibility into how data flows through your organization. Automated lineage from Azure Data Factory, Synapse, SQL Database, and Power BI covers the most common data movement patterns. For custom processes, the Atlas API lets you push lineage entries programmatically. Use lineage for impact analysis before making changes, root cause analysis when things go wrong, and compliance documentation to satisfy regulatory requirements. The investment in maintaining accurate lineage pays off every time someone asks "where does this data come from?" and you can answer with confidence.
