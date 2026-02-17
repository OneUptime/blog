# How to Search and Discover Data Assets Using Google Cloud Data Catalog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Data Catalog, Data Discovery, Data Governance, BigQuery

Description: Learn how to use Google Cloud Data Catalog to search, discover, and explore data assets across your GCP projects, making it easy to find the right tables and datasets.

---

Finding the right data in a large organization is surprisingly hard. You know the data exists somewhere - a table with customer purchase history, a dataset of server metrics, a view that joins orders with shipments. But which project is it in? What is the table called? Is it still being updated? Who can tell you what the columns mean?

Google Cloud Data Catalog is built to solve this problem. It automatically catalogs data assets across your GCP projects and provides a unified search interface to find them. Think of it as a search engine for your data. You type what you are looking for, and it returns matching tables, datasets, views, and other data assets with their metadata.

## What Data Catalog Discovers Automatically

Data Catalog automatically indexes metadata from several GCP services:

- **BigQuery**: Tables, views, datasets, routines
- **Pub/Sub**: Topics and subscriptions
- **Cloud Storage**: Buckets (with Dataplex integration)
- **Cloud Spanner**: Databases and tables
- **Cloud Bigtable**: Instances and tables

For BigQuery, the indexing includes table schemas (column names, types, descriptions), dataset metadata, and access policies. This happens automatically - you do not need to set up any crawlers or sync jobs.

## Searching with the Console

The simplest way to search is through the Google Cloud Console. Navigate to Data Catalog and use the search bar at the top. You can search by:

- Table or dataset name
- Column name
- Description text
- Tag values
- Project or dataset scope

For example, searching for "customer orders" returns all tables and views that contain those words in their name, description, or column names.

## Searching with the API

For programmatic search, use the Data Catalog API:

```python
# Search for data assets using the Data Catalog API
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

def search_data_assets(query, project_ids=None, organizations=None):
    """Search for data assets across projects."""
    scope = datacatalog_v1.SearchCatalogRequest.Scope()

    if project_ids:
        scope.include_project_ids.extend(project_ids)
    if organizations:
        scope.include_org_ids.extend(organizations)

    request = datacatalog_v1.SearchCatalogRequest(
        scope=scope,
        query=query,
        page_size=20,
    )

    results = client.search_catalog(request=request)

    for result in results:
        print(f"Name: {result.display_name}")
        print(f"Type: {result.search_result_type}")
        print(f"Resource: {result.linked_resource}")
        print(f"Description: {result.description[:100] if result.description else 'N/A'}")
        print("---")

# Search across all projects in the organization
search_data_assets(
    query="customer orders",
    project_ids=["project-a", "project-b", "analytics-prod"]
)
```

## Search Query Syntax

Data Catalog supports a rich query syntax that goes beyond simple keyword search:

### Basic Keyword Search

```python
# Find tables with "orders" in the name or description
search_data_assets(query="orders")
```

### Filter by Resource Type

```python
# Only search BigQuery tables
search_data_assets(query="type=TABLE orders")

# Only search BigQuery datasets
search_data_assets(query="type=DATASET analytics")

# Only search BigQuery views
search_data_assets(query="type=TABLE_VIEW customer_summary")
```

### Filter by Project or Dataset

```python
# Search within a specific project
search_data_assets(query="projectid:analytics-prod orders")

# Search within a specific dataset
search_data_assets(query="parent:projects/analytics-prod/datasets/warehouse orders")
```

### Search by Column Name

```python
# Find tables that have a column named "customer_id"
search_data_assets(query="column:customer_id")

# Find tables with columns matching a pattern
search_data_assets(query="column:email")
```

### Search by Tag Values

```python
# Find tables tagged with a specific sensitivity level
search_data_assets(query="tag:data_classification.sensitivity=RESTRICTED")

# Find tables owned by a specific team
search_data_assets(query='tag:data_classification.data_owner="analytics-team@company.com"')

# Find tables that contain PII
search_data_assets(query="tag:data_classification.contains_pii=true")
```

### Combining Queries

```python
# Find RESTRICTED BigQuery tables in the analytics project
search_data_assets(
    query="type=TABLE projectid:analytics-prod tag:data_classification.sensitivity=RESTRICTED"
)
```

## Looking Up a Specific Entry

If you know the exact resource, you can look it up directly:

```python
# Look up a specific BigQuery table in Data Catalog
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# Look up by linked resource name
entry = client.lookup_entry(
    request={
        "linked_resource": (
            "//bigquery.googleapis.com/projects/my-project"
            "/datasets/analytics/tables/orders"
        )
    }
)

print(f"Display name: {entry.display_name}")
print(f"Description: {entry.description}")
print(f"Type: {entry.type_}")
print(f"Create time: {entry.source_system_timestamps.create_time}")
print(f"Update time: {entry.source_system_timestamps.update_time}")

# Get the schema
if entry.schema and entry.schema.columns:
    print("\nColumns:")
    for col in entry.schema.columns:
        desc = f" - {col.description}" if col.description else ""
        print(f"  {col.column}: {col.type_}{desc}")
```

## Exploring Table Lineage

Data Catalog can show you where data comes from and where it goes. This is useful for impact analysis - if you change a source table, which downstream tables are affected?

```python
# Get lineage information for a table
from google.cloud import datacatalog_lineage_v1

client = datacatalog_lineage_v1.LineageClient()

# Search for lineage links related to a specific table
target_resource = (
    "//bigquery.googleapis.com/projects/my-project"
    "/datasets/analytics/tables/customer_summary"
)

# List processes that write to this table
request = datacatalog_lineage_v1.SearchLinksRequest(
    parent=f"projects/my-project/locations/us-central1",
    target=datacatalog_lineage_v1.EntityReference(
        fully_qualified_name=target_resource
    ),
)

results = client.search_links(request=request)

print("Data sources for customer_summary:")
for link in results:
    print(f"  Source: {link.source.fully_qualified_name}")
    print(f"  Process: {link.name}")
```

## Building a Data Discovery Dashboard

For teams that want a self-service data discovery experience, build a lightweight dashboard:

```python
# Simple data discovery API endpoint
from flask import Flask, request, jsonify
from google.cloud import datacatalog_v1

app = Flask(__name__)
client = datacatalog_v1.DataCatalogClient()

@app.route('/api/search', methods=['GET'])
def search():
    """Search data assets with optional filters."""
    query = request.args.get('q', '')
    project = request.args.get('project', '')
    data_type = request.args.get('type', '')
    sensitivity = request.args.get('sensitivity', '')

    # Build the search query
    search_query = query

    if data_type:
        search_query = f"type={data_type} {search_query}"
    if project:
        search_query = f"projectid:{project} {search_query}"
    if sensitivity:
        search_query = f"tag:data_classification.sensitivity={sensitivity} {search_query}"

    # Execute the search
    scope = datacatalog_v1.SearchCatalogRequest.Scope()
    scope.include_org_ids.append("my-org-id")

    results = client.search_catalog(
        request={
            "scope": scope,
            "query": search_query.strip(),
            "page_size": 50,
        }
    )

    # Format results
    assets = []
    for result in results:
        assets.append({
            'name': result.display_name,
            'type': str(result.search_result_type),
            'resource': result.linked_resource,
            'description': result.description or '',
        })

    return jsonify({'results': assets, 'query': search_query.strip()})

@app.route('/api/table/<project>/<dataset>/<table>', methods=['GET'])
def table_details(project, dataset, table):
    """Get detailed metadata for a specific table."""
    resource = (
        f"//bigquery.googleapis.com/projects/{project}"
        f"/datasets/{dataset}/tables/{table}"
    )

    entry = client.lookup_entry(request={"linked_resource": resource})

    # Get tags
    tags = list(client.list_tags(request={"parent": entry.name}))

    columns = []
    if entry.schema:
        for col in entry.schema.columns:
            columns.append({
                'name': col.column,
                'type': col.type_,
                'description': col.description or '',
            })

    tag_data = []
    for tag in tags:
        fields = {}
        for field_id, field in tag.fields.items():
            if field.string_value:
                fields[field_id] = field.string_value
            elif field.enum_value:
                fields[field_id] = field.enum_value.display_name
            elif field.bool_value is not None:
                fields[field_id] = field.bool_value
            elif field.double_value:
                fields[field_id] = field.double_value
        tag_data.append(fields)

    return jsonify({
        'name': entry.display_name,
        'description': entry.description or '',
        'columns': columns,
        'tags': tag_data,
    })
```

## Organizing Data Assets for Discovery

Good discovery starts with good organization. Here are patterns that make data easier to find:

### Use Descriptive Table and Column Names

```sql
-- Bad: Cryptic names that nobody can search for
CREATE TABLE `analytics.t_ord_cust_v3` (...);

-- Good: Descriptive names that show up in search
CREATE TABLE `analytics.customer_orders_daily_summary` (...);
```

### Add Descriptions to Tables and Columns

```sql
-- Add table-level descriptions
ALTER TABLE `analytics.customer_orders_daily_summary`
SET OPTIONS (
  description = 'Daily aggregated order metrics per customer, refreshed at 6 AM UTC. Source: orders and customers tables.'
);

-- Add column-level descriptions
ALTER TABLE `analytics.customer_orders_daily_summary`
ALTER COLUMN customer_id SET OPTIONS (description = 'Unique customer identifier from the auth system');

ALTER TABLE `analytics.customer_orders_daily_summary`
ALTER COLUMN total_revenue SET OPTIONS (description = 'Total order revenue in USD for the day');
```

### Use Consistent Dataset Organization

```
project-analytics/
  raw/           # Raw ingested data
  staging/       # Cleaned and validated data
  warehouse/     # Modeled dimensional data
  reporting/     # Aggregated views for dashboards
```

This structure makes it easy to search by layer: `projectid:project-analytics parent:raw` finds all raw tables.

## IAM for Data Catalog

Control who can search and view metadata:

```hcl
# Grant data analysts permission to search and view metadata
resource "google_project_iam_member" "catalog_viewer" {
  project = "my-project"
  role    = "roles/datacatalog.viewer"
  member  = "group:data-analysts@company.com"
}

# Grant the data governance team permission to manage tags
resource "google_project_iam_member" "catalog_admin" {
  project = "my-project"
  role    = "roles/datacatalog.tagEditor"
  member  = "group:data-governance@company.com"
}
```

Note that Data Catalog respects BigQuery IAM. Users can only see metadata for tables they have access to in BigQuery. This means a user who does not have BigQuery access to a sensitive table will not see it in Data Catalog search results.

## Wrapping Up

Data Catalog turns the chaos of scattered data assets into a searchable, well-documented catalog. The automatic discovery of BigQuery tables means you get value immediately without any setup. Adding tags with business metadata, keeping descriptions up to date, and using consistent naming conventions make discovery even more effective. Whether your team has 50 tables or 50,000, Data Catalog scales to help everyone find the data they need.
