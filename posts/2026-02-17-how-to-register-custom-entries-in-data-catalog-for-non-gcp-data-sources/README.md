# How to Register Custom Entries in Data Catalog for Non-GCP Data Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Data Catalog, Custom Entries, Data Governance, Metadata

Description: Learn how to register non-GCP data sources like on-premise databases, S3 buckets, and SaaS platforms in Google Cloud Data Catalog using custom entries and entry groups.

---

Data Catalog automatically discovers GCP-native resources like BigQuery tables and Pub/Sub topics. But most organizations have data spread across more than just GCP. You probably have databases on AWS, data in Snowflake, files on on-premise servers, or datasets in SaaS tools like Salesforce or HubSpot. If these data sources are not in your catalog, you only have a partial view of your data landscape.

Custom entries let you register any data source in Data Catalog, regardless of where it lives. You create an entry group, add entries with schema and metadata, and tag them with the same templates you use for GCP resources. The result is a unified catalog where people can search across all data assets in one place.

## How Custom Entries Work

The structure for custom entries is:

1. **Entry Group**: A container for related custom entries. Think of it as a namespace. You might have one entry group per data source system (e.g., "postgres-production", "salesforce", "s3-data-lake").

2. **Custom Entry**: An individual data asset within an entry group. This represents a table, file, dataset, or any other data resource.

3. **Schema**: Optional schema information attached to the entry (column names, types, descriptions).

4. **Tags**: The same tag templates used for GCP resources can be applied to custom entries.

## Creating an Entry Group

Start by creating an entry group for each external data source:

```bash
# Create an entry group for an on-premise PostgreSQL database
gcloud data-catalog entry-groups create postgres_production \
  --location=us-central1 \
  --display-name="PostgreSQL Production" \
  --description="Tables from the production PostgreSQL database (on-premise)"
```

In Python:

```python
# Create entry groups for different external data sources
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()
parent = "projects/my-project/locations/us-central1"

# Entry group for PostgreSQL
pg_group = datacatalog_v1.EntryGroup()
pg_group.display_name = "PostgreSQL Production"
pg_group.description = "Tables from the production PostgreSQL database"

client.create_entry_group(
    parent=parent,
    entry_group_id="postgres_production",
    entry_group=pg_group,
)

# Entry group for AWS S3
s3_group = datacatalog_v1.EntryGroup()
s3_group.display_name = "AWS S3 Data Lake"
s3_group.description = "Data files stored in AWS S3 buckets"

client.create_entry_group(
    parent=parent,
    entry_group_id="aws_s3_datalake",
    entry_group=s3_group,
)

# Entry group for Salesforce
sf_group = datacatalog_v1.EntryGroup()
sf_group.display_name = "Salesforce CRM"
sf_group.description = "Objects and reports from Salesforce"

client.create_entry_group(
    parent=parent,
    entry_group_id="salesforce_crm",
    entry_group=sf_group,
)

print("Created entry groups for external data sources")
```

In Terraform:

```hcl
# Entry group for PostgreSQL tables
resource "google_data_catalog_entry_group" "postgres" {
  entry_group_id = "postgres_production"
  display_name   = "PostgreSQL Production"
  description    = "Tables from the production PostgreSQL database"
  region         = "us-central1"
}

# Entry group for Snowflake
resource "google_data_catalog_entry_group" "snowflake" {
  entry_group_id = "snowflake_warehouse"
  display_name   = "Snowflake Data Warehouse"
  description    = "Tables and views from the Snowflake data warehouse"
  region         = "us-central1"
}
```

## Registering Custom Entries

Once you have an entry group, add entries for individual data assets:

```python
# Register PostgreSQL tables as custom entries in Data Catalog
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

def register_postgres_table(entry_group_path, table_name, columns, description=""):
    """Register a PostgreSQL table as a custom entry."""
    entry = datacatalog_v1.Entry()
    entry.display_name = table_name
    entry.description = description

    # Set the entry type and system
    entry.user_specified_type = "postgres_table"
    entry.user_specified_system = "PostgreSQL"

    # Add a link to the actual resource (for reference)
    entry.linked_resource = f"//postgresql/prod-db-01/public/{table_name}"

    # Define the schema
    schema = datacatalog_v1.Schema()
    for col in columns:
        column = datacatalog_v1.ColumnSchema()
        column.column = col['name']
        column.type_ = col['type']
        column.description = col.get('description', '')
        column.mode = col.get('mode', 'NULLABLE')
        schema.columns.append(column)

    entry.schema = schema

    # Create the entry
    created = client.create_entry(
        parent=entry_group_path,
        entry_id=table_name.replace('.', '_'),
        entry=entry,
    )
    print(f"Registered: {created.name}")
    return created

# Register some PostgreSQL tables
entry_group_path = "projects/my-project/locations/us-central1/entryGroups/postgres_production"

register_postgres_table(
    entry_group_path,
    "users",
    columns=[
        {"name": "id", "type": "integer", "mode": "REQUIRED", "description": "Primary key"},
        {"name": "email", "type": "varchar(255)", "description": "User email address"},
        {"name": "first_name", "type": "varchar(100)", "description": "First name"},
        {"name": "last_name", "type": "varchar(100)", "description": "Last name"},
        {"name": "created_at", "type": "timestamp", "description": "Account creation timestamp"},
        {"name": "plan_id", "type": "integer", "description": "Foreign key to plans table"},
    ],
    description="Core user accounts table with authentication and profile data",
)

register_postgres_table(
    entry_group_path,
    "orders",
    columns=[
        {"name": "id", "type": "integer", "mode": "REQUIRED", "description": "Primary key"},
        {"name": "user_id", "type": "integer", "description": "Foreign key to users"},
        {"name": "total_amount", "type": "decimal(10,2)", "description": "Order total in USD"},
        {"name": "status", "type": "varchar(50)", "description": "Order status (pending, paid, shipped, delivered)"},
        {"name": "created_at", "type": "timestamp", "description": "Order creation timestamp"},
    ],
    description="Customer orders with payment status and totals",
)
```

## Registering S3 Data Files

For file-based data sources like S3:

```python
# Register S3 datasets as custom entries
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()
entry_group_path = "projects/my-project/locations/us-central1/entryGroups/aws_s3_datalake"

def register_s3_dataset(name, bucket, prefix, file_format, columns, description=""):
    """Register an S3 dataset as a custom entry."""
    entry = datacatalog_v1.Entry()
    entry.display_name = name
    entry.description = description
    entry.user_specified_type = "s3_dataset"
    entry.user_specified_system = "AWS S3"
    entry.linked_resource = f"s3://{bucket}/{prefix}"

    # Add schema
    schema = datacatalog_v1.Schema()
    for col in columns:
        column = datacatalog_v1.ColumnSchema()
        column.column = col['name']
        column.type_ = col['type']
        column.description = col.get('description', '')
        schema.columns.append(column)

    entry.schema = schema

    created = client.create_entry(
        parent=entry_group_path,
        entry_id=name.replace('-', '_').replace(' ', '_').lower(),
        entry=entry,
    )
    return created

# Register clickstream data stored in S3
register_s3_dataset(
    name="Clickstream Events",
    bucket="company-datalake-prod",
    prefix="clickstream/events/",
    file_format="parquet",
    columns=[
        {"name": "event_id", "type": "string", "description": "Unique event identifier"},
        {"name": "user_id", "type": "string", "description": "Anonymized user ID"},
        {"name": "event_type", "type": "string", "description": "Click, pageview, scroll, etc."},
        {"name": "page_url", "type": "string", "description": "URL of the page"},
        {"name": "timestamp", "type": "timestamp", "description": "Event timestamp (UTC)"},
        {"name": "session_id", "type": "string", "description": "Browser session ID"},
    ],
    description="Raw clickstream events from the web application, partitioned by date",
)
```

## Automating Registration from Database Catalogs

For databases with many tables, automate the registration by reading the database catalog:

```python
# Automatically register all tables from a PostgreSQL database
import psycopg2
from google.cloud import datacatalog_v1

# Database connection
db_conn = psycopg2.connect(
    host="prod-db-01.internal",
    database="myapp",
    user="catalog_reader",
    password="readonly_password",
)

dc_client = datacatalog_v1.DataCatalogClient()
entry_group = "projects/my-project/locations/us-central1/entryGroups/postgres_production"

# Type mapping from PostgreSQL to readable types
PG_TYPE_MAP = {
    'integer': 'INT',
    'bigint': 'BIGINT',
    'character varying': 'VARCHAR',
    'text': 'TEXT',
    'boolean': 'BOOLEAN',
    'timestamp without time zone': 'TIMESTAMP',
    'timestamp with time zone': 'TIMESTAMPTZ',
    'date': 'DATE',
    'numeric': 'DECIMAL',
    'json': 'JSON',
    'jsonb': 'JSONB',
}

def discover_and_register():
    """Read all tables from PostgreSQL and register them in Data Catalog."""
    cursor = db_conn.cursor()

    # Get all tables in the public schema
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    tables = cursor.fetchall()

    for (table_name,) in tables:
        # Get column information
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        columns = cursor.fetchall()

        # Build the entry
        entry = datacatalog_v1.Entry()
        entry.display_name = table_name
        entry.user_specified_type = "postgres_table"
        entry.user_specified_system = "PostgreSQL"
        entry.linked_resource = f"//postgresql/prod-db-01/public/{table_name}"

        schema = datacatalog_v1.Schema()
        for col_name, data_type, is_nullable, default in columns:
            col = datacatalog_v1.ColumnSchema()
            col.column = col_name
            col.type_ = PG_TYPE_MAP.get(data_type, data_type)
            col.mode = "NULLABLE" if is_nullable == 'YES' else "REQUIRED"
            schema.columns.append(col)

        entry.schema = schema

        try:
            dc_client.create_entry(
                parent=entry_group,
                entry_id=table_name,
                entry=entry,
            )
            print(f"Registered: {table_name} ({len(columns)} columns)")
        except Exception as e:
            if "already exists" in str(e):
                # Update existing entry
                entry_name = f"{entry_group}/entries/{table_name}"
                dc_client.update_entry(entry=entry)
                print(f"Updated: {table_name}")
            else:
                print(f"Failed to register {table_name}: {e}")

    cursor.close()

discover_and_register()
db_conn.close()
```

## Tagging Custom Entries

Custom entries support the same tag templates as GCP-native entries:

```python
# Tag a custom PostgreSQL table entry with classification metadata
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# The entry path for the custom PostgreSQL table
entry_name = "projects/my-project/locations/us-central1/entryGroups/postgres_production/entries/users"

# Apply data classification tag
tag = datacatalog_v1.Tag()
tag.template = "projects/my-project/locations/us-central1/tagTemplates/data_classification"

tag.fields["sensitivity_level"] = datacatalog_v1.TagField(
    enum_value=datacatalog_v1.TagField.EnumValue(display_name="RESTRICTED")
)
tag.fields["contains_pii"] = datacatalog_v1.TagField(bool_value=True)
tag.fields["regulatory_scope"] = datacatalog_v1.TagField(
    enum_value=datacatalog_v1.TagField.EnumValue(display_name="GDPR")
)

client.create_tag(parent=entry_name, tag=tag)
print("Tagged PostgreSQL users table with data classification")
```

## Searching Across All Data Sources

Once custom entries are registered and tagged, they show up in the same search as GCP resources:

```python
# Search across all data sources including custom entries
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

results = client.search_catalog(
    request={
        "scope": {
            "include_project_ids": ["my-project"],
        },
        "query": "user orders",  # Finds both BigQuery and PostgreSQL tables
    }
)

for result in results:
    system = result.user_specified_system or "GCP"
    print(f"[{system}] {result.display_name} - {result.linked_resource}")
```

## Keeping Custom Entries Up to Date

Custom entries do not auto-sync. You need to update them when the source schema changes. Use a Cloud Function or scheduled job:

```python
# Cloud Function to sync PostgreSQL schema changes to Data Catalog
# Triggered on a schedule (e.g., daily via Cloud Scheduler)
def sync_postgres_catalog(event, context):
    """Sync PostgreSQL table schemas to Data Catalog."""
    import psycopg2
    from google.cloud import datacatalog_v1

    # Connect and discover tables
    conn = psycopg2.connect(host="...", database="...", user="...", password="...")
    dc_client = datacatalog_v1.DataCatalogClient()

    # ... discovery and update logic ...

    conn.close()
    print("Sync complete")
```

Schedule it with Cloud Scheduler:

```bash
# Run the sync daily at 6 AM UTC
gcloud scheduler jobs create http postgres-catalog-sync \
  --schedule="0 6 * * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/sync-postgres-catalog" \
  --http-method=POST
```

## IAM for Custom Entries

Control who can create and view custom entries:

```hcl
# Data engineers can create and update custom entries
resource "google_data_catalog_entry_group_iam_member" "engineer_editor" {
  entry_group = google_data_catalog_entry_group.postgres.name
  role        = "roles/datacatalog.entryGroupEditor"
  member      = "group:data-engineers@company.com"
}

# Everyone can view custom entries
resource "google_data_catalog_entry_group_iam_member" "all_viewers" {
  entry_group = google_data_catalog_entry_group.postgres.name
  role        = "roles/datacatalog.entryGroupViewer"
  member      = "domain:company.com"
}
```

## Wrapping Up

Custom entries extend Data Catalog beyond GCP, giving you a unified view of all your data assets regardless of where they live. Create entry groups for each data source system, register entries with schemas and descriptions, and apply the same tag templates you use for BigQuery tables. Automate the registration by reading source database catalogs, and schedule regular syncs to keep schemas up to date. The result is a single search interface where anyone can find data across PostgreSQL, S3, Snowflake, Salesforce, and every other system in your organization.
