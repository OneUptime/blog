# How to Handle Schema Evolution When Loading Data into BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Schema Evolution, Data Engineering, Data Loading

Description: Learn how to handle schema changes and evolution when loading data into BigQuery, including adding columns, changing types, and managing backward compatibility.

---

Data schemas change. New fields get added, old fields get deprecated, data types evolve. If you are loading data into BigQuery from external sources, you need a strategy for handling these changes without breaking your pipelines or losing data.

I have dealt with schema evolution across dozens of data sources, and the approach you take depends on how your source data changes and how much control you have over it. Let me share the patterns that work.

## Types of Schema Changes

Schema evolution comes in several flavors:

- **Adding new columns**: The most common change. A new field appears in the source data.
- **Removing columns**: A field disappears from the source. Less common but tricky.
- **Changing data types**: A field that was a string becomes an integer, or vice versa.
- **Renaming columns**: Same data, different name.
- **Changing nullability**: A required field becomes optional, or the reverse.

BigQuery handles some of these gracefully and others not at all. Let me go through each one.

## Adding New Columns

This is the easiest case. BigQuery supports adding columns to existing tables without any downtime.

**Automatic with auto-detect**: When loading with auto-detection and the `schema_update_options` flag, BigQuery automatically adds new columns.

```bash
# Load data and allow new columns to be added automatically
bq load \
  --autodetect \
  --source_format=PARQUET \
  --schema_update_option=ALLOW_FIELD_ADDITION \
  my_project:my_dataset.events \
  gs://my-bucket/data/events_v2/*.parquet
```

**Explicitly with ALTER TABLE**:

```sql
-- Add a new column to an existing table
ALTER TABLE `my_project.my_dataset.events`
ADD COLUMN IF NOT EXISTS new_field STRING;

-- Add multiple columns at once
ALTER TABLE `my_project.my_dataset.events`
ADD COLUMN IF NOT EXISTS user_agent STRING,
ADD COLUMN IF NOT EXISTS referrer_url STRING,
ADD COLUMN IF NOT EXISTS session_duration INT64;
```

**Using the schema_update_options in load jobs**:

```python
# Python: Load with automatic schema updates
from google.cloud import bigquery

client = bigquery.Client()

job_config = bigquery.LoadJobConfig()
job_config.source_format = bigquery.SourceFormat.PARQUET
job_config.schema_update_options = [
    bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION
]
job_config.write_disposition = bigquery.WriteDisposition.WRITE_APPEND

load_job = client.load_table_from_uri(
    "gs://my-bucket/data/events_v2/*.parquet",
    "my_project.my_dataset.events",
    job_config=job_config
)
load_job.result()
print(f"Schema updated. New column count: {len(client.get_table('my_project.my_dataset.events').schema)}")
```

When new columns are added, existing rows get NULL values for the new fields. This is usually fine for analytics.

## Relaxing Column Modes

BigQuery allows you to change a column from REQUIRED to NULLABLE, but not the other way around.

```bash
# Allow relaxing column modes from REQUIRED to NULLABLE
bq load \
  --source_format=PARQUET \
  --schema_update_option=ALLOW_FIELD_RELAXATION \
  my_project:my_dataset.events \
  gs://my-bucket/data/events_relaxed/*.parquet
```

```sql
-- Relax a column from REQUIRED to NULLABLE
ALTER TABLE `my_project.my_dataset.events`
ALTER COLUMN user_id DROP NOT NULL;
```

## Handling Type Changes

Changing a column's data type is the hardest schema evolution to handle. BigQuery does not support changing a column type directly with ALTER TABLE. Here are the workarounds.

**Approach 1: Create a new column and migrate data**

```sql
-- Step 1: Add the new column with the correct type
ALTER TABLE `my_project.my_dataset.events`
ADD COLUMN IF NOT EXISTS amount_numeric NUMERIC;

-- Step 2: Populate the new column from the old one
UPDATE `my_project.my_dataset.events`
SET amount_numeric = SAFE_CAST(amount_string AS NUMERIC)
WHERE amount_numeric IS NULL;

-- Step 3: Update your queries to use the new column
-- Step 4: Eventually drop the old column (or leave it)
ALTER TABLE `my_project.my_dataset.events`
DROP COLUMN amount_string;
```

**Approach 2: Recreate the table**

```sql
-- Create a new table with the corrected schema
CREATE TABLE `my_project.my_dataset.events_v2`
PARTITION BY event_date
AS
SELECT
  event_id,
  CAST(user_id AS INT64) AS user_id,  -- Was STRING, now INT64
  event_type,
  SAFE_CAST(amount AS NUMERIC) AS amount,  -- Was STRING, now NUMERIC
  event_date,
  event_timestamp
FROM `my_project.my_dataset.events`;
```

**Approach 3: Use a view for backward compatibility**

```sql
-- Create a view that presents the data with the new schema
-- while keeping the underlying table unchanged
CREATE OR REPLACE VIEW `my_project.my_dataset.events_current` AS
SELECT
  event_id,
  CAST(user_id AS INT64) AS user_id,
  event_type,
  SAFE_CAST(amount AS NUMERIC) AS amount,
  event_date,
  event_timestamp
FROM `my_project.my_dataset.events`;
```

## Handling Removed Columns

When a source stops sending a column, BigQuery handles it depending on your load approach.

**Loading with explicit schema**: If your schema includes the column but the source data does not have it, the column gets NULL values for the loaded rows.

**Loading with auto-detect**: New loads might not include the column, but existing data retains it. This is generally safe.

```sql
-- Check which columns have all NULLs (potentially removed from source)
SELECT
  column_name
FROM `my_project.my_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'events'
  AND column_name NOT IN (
    -- These columns have at least some non-null values in recent data
    SELECT column_name
    FROM (
      SELECT 'event_id' AS column_name WHERE EXISTS (SELECT 1 FROM `my_project.my_dataset.events` WHERE event_id IS NOT NULL AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
      UNION ALL
      SELECT 'user_id' WHERE EXISTS (SELECT 1 FROM `my_project.my_dataset.events` WHERE user_id IS NOT NULL AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
      -- Add more columns as needed
    )
  );
```

## Building a Schema Evolution Pipeline

For production systems, I use a pipeline that detects and handles schema changes automatically.

```python
# schema_evolution.py - Automated schema evolution handler
from google.cloud import bigquery
from google.cloud import storage
import json
import logging

logger = logging.getLogger(__name__)

class SchemaEvolutionHandler:
    """Handles schema changes when loading data into BigQuery."""

    def __init__(self, project, dataset, table):
        self.bq_client = bigquery.Client(project=project)
        self.table_ref = f"{project}.{dataset}.{table}"

    def get_current_schema(self):
        """Get the current BigQuery table schema."""
        table = self.bq_client.get_table(self.table_ref)
        return {field.name: field for field in table.schema}

    def detect_changes(self, new_schema_fields):
        """Compare new schema against existing table schema."""
        current = self.get_current_schema()
        changes = {
            'added': [],
            'removed': [],
            'type_changed': [],
            'mode_changed': []
        }

        # Check for new and changed fields
        for field in new_schema_fields:
            if field.name not in current:
                changes['added'].append(field)
            else:
                existing = current[field.name]
                if field.field_type != existing.field_type:
                    changes['type_changed'].append({
                        'name': field.name,
                        'old_type': existing.field_type,
                        'new_type': field.field_type
                    })
                if field.mode != existing.mode:
                    changes['mode_changed'].append({
                        'name': field.name,
                        'old_mode': existing.mode,
                        'new_mode': field.mode
                    })

        # Check for removed fields
        new_names = {f.name for f in new_schema_fields}
        for name in current:
            if name not in new_names:
                changes['removed'].append(name)

        return changes

    def apply_safe_changes(self, changes):
        """Apply schema changes that are safe (adding columns, relaxing modes)."""
        if changes['added']:
            logger.info(f"Adding {len(changes['added'])} new columns")
            # Use schema_update_options on next load
            return True

        if changes['type_changed']:
            logger.warning(
                f"Type changes detected: {changes['type_changed']}. "
                f"Manual intervention required."
            )
            return False

        return True
```

## Schema Registry Pattern

For teams with many data sources, consider maintaining a schema registry.

```sql
-- Schema registry table to track schema versions
CREATE TABLE IF NOT EXISTS `my_project.metadata.schema_registry` (
  source_name STRING,
  version INT64,
  schema_json STRING,
  registered_at TIMESTAMP,
  is_active BOOL
);

-- Register a new schema version
INSERT INTO `my_project.metadata.schema_registry`
VALUES (
  'events_source',
  3,
  '[{"name":"event_id","type":"STRING"},{"name":"user_id","type":"INT64"},{"name":"event_type","type":"STRING"},{"name":"new_field","type":"STRING"}]',
  CURRENT_TIMESTAMP(),
  TRUE
);
```

## Using JSON Columns for Flexible Schemas

When your source schema changes frequently and unpredictably, consider using a JSON column for the variable parts.

```sql
-- Table with a stable core schema and a flexible JSON column
CREATE TABLE `my_project.my_dataset.flexible_events` (
  event_id STRING NOT NULL,
  event_type STRING NOT NULL,
  event_date DATE NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,
  -- Stable fields above, flexible data below
  properties JSON
)
PARTITION BY event_date;
```

```sql
-- Query specific fields from the JSON column
SELECT
  event_id,
  event_type,
  JSON_VALUE(properties, '$.user_id') AS user_id,
  JSON_VALUE(properties, '$.new_field') AS new_field
FROM `my_project.my_dataset.flexible_events`
WHERE event_date = CURRENT_DATE();
```

This approach trades query performance for schema flexibility. JSON columns are slower to query than native typed columns, but they never break when the source schema changes.

## Best Practices

1. **Use Parquet or Avro**: Self-describing formats make schema evolution more predictable.
2. **Enable ALLOW_FIELD_ADDITION**: For append-mode loads, always enable this option.
3. **Never change column types in place**: Always create new columns and migrate data.
4. **Monitor schema changes**: Track when schemas change so you can update downstream queries.
5. **Use views as an abstraction layer**: Views can present a stable interface even when the underlying schema evolves.
6. **Test schema changes in a staging environment**: Load new data into a test table first to verify the schema works.

## Wrapping Up

Schema evolution is inevitable, and BigQuery handles the easy cases (adding columns, relaxing nullability) well. The harder cases (type changes, column renames) require explicit migration steps. Having a strategy in place before your schema changes saves you from scrambling when it happens. For highly dynamic schemas, consider using JSON columns for the variable parts of your data.

For monitoring your data pipelines and catching schema-related issues before they impact downstream analytics, [OneUptime](https://oneuptime.com) provides tools to track data quality and pipeline health.
