# How to Handle Schema Evolution in BigQuery When Source Schemas Change Frequently

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Schema Evolution, Data Engineering, ETL

Description: Learn strategies for handling schema changes in BigQuery when upstream sources add, rename, or remove columns, including automatic schema updates, migration patterns, and defensive SQL.

---

Source schemas change. New columns appear, types change, fields get renamed or dropped. If your data pipeline is not built to handle these changes gracefully, a single column addition in a source system can break your entire analytics stack. BigQuery has built-in support for some types of schema evolution, but you need to design your pipeline to take advantage of it.

This post covers practical strategies for handling schema changes in BigQuery, from the simplest automatic updates to more complex migration patterns.

## BigQuery's Built-In Schema Evolution

BigQuery supports several types of schema changes natively, depending on how you load data.

### Adding New Columns

BigQuery can automatically add new columns when they appear in your data. This works with load jobs and streaming inserts:

```bash
# Load data with automatic schema update
# --autodetect detects the schema from the data
# --schema_update_option=ALLOW_FIELD_ADDITION adds new columns automatically
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --autodetect \
  --schema_update_option=ALLOW_FIELD_ADDITION \
  my_dataset.my_table \
  gs://my-bucket/data/*.json
```

You can also set this in SQL using LOAD DATA:

```sql
-- Load data with schema auto-update using LOAD DATA statement
LOAD DATA INTO `my-project.my_dataset.events`
FROM FILES (
  format = 'JSON',
  uris = ['gs://my-bucket/events/*.json']
)
WITH SCHEMA MODIFICATIONS (
  ALLOW_FIELD_ADDITION
);
```

### Relaxing Column Modes

BigQuery allows you to change a column from REQUIRED to NULLABLE:

```bash
# Relax a column from REQUIRED to NULLABLE during a load
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --schema_update_option=ALLOW_FIELD_RELAXATION \
  my_dataset.my_table \
  gs://my-bucket/data/*.json
```

## Defensive SQL Patterns

Even with automatic schema updates, your downstream queries can break when columns change. Defensive SQL patterns protect against this.

### Using IFNULL and COALESCE for Missing Columns

When a column might not exist in older data:

```sql
-- Handle columns that may not exist in historical data
-- COALESCE provides a default when the value is NULL
SELECT
    event_id,
    user_id,
    event_type,
    -- This column was added recently, older rows have NULL
    COALESCE(session_id, 'unknown') AS session_id,
    -- This column was renamed from 'ts' to 'event_timestamp'
    COALESCE(event_timestamp, ts) AS event_timestamp,
    event_date
FROM `my-project.my_dataset.events`
```

### Safe Column Access with IF and STRUCT

For JSON or STRUCT columns where nested fields may or may not exist:

```sql
-- Safely access nested fields that might not be present
SELECT
    event_id,
    -- Safely extract from a JSON string column
    SAFE.STRING(JSON_QUERY(properties, '$.new_field')) AS new_field,
    -- Use IF to handle structural changes
    IF(
        JSON_QUERY(properties, '$.address.zip_code') IS NOT NULL,
        JSON_VALUE(properties, '$.address.zip_code'),
        JSON_VALUE(properties, '$.address.postal_code')  -- Old field name
    ) AS postal_code
FROM `my-project.my_dataset.events`
```

### Schema-Agnostic Loading with JSON

One of the most robust patterns is to load raw data into a JSON column and extract structured fields later:

```sql
-- Raw events table with a JSON catch-all column
CREATE TABLE `my-project.my_dataset.raw_events` (
    event_id STRING NOT NULL,
    event_type STRING,
    event_timestamp TIMESTAMP,
    -- Store the full payload as JSON so schema changes do not break ingestion
    raw_payload JSON
)
PARTITION BY DATE(event_timestamp)
CLUSTER BY event_type;

-- Extract structured fields from JSON in a downstream model
-- When the source schema changes, you only update this query
CREATE OR REPLACE VIEW `my-project.my_dataset.events_parsed` AS
SELECT
    event_id,
    event_type,
    event_timestamp,
    JSON_VALUE(raw_payload, '$.user_id') AS user_id,
    JSON_VALUE(raw_payload, '$.session_id') AS session_id,
    CAST(JSON_VALUE(raw_payload, '$.duration_ms') AS INT64) AS duration_ms,
    -- Easy to add new fields as they appear in the source
    JSON_VALUE(raw_payload, '$.device_type') AS device_type,
    raw_payload  -- Keep the full payload for ad-hoc analysis
FROM `my-project.my_dataset.raw_events`
```

This pattern means that source schema changes never break your ingestion pipeline. The raw data always lands successfully, and you update the extraction view when new fields become available.

## Handling Column Renames

Column renames are one of the trickier schema changes because BigQuery does not support renaming columns directly. Here are strategies for handling them.

### The COALESCE Pattern

```sql
-- Handle a column rename by checking both the old and new name
-- Works during the transition period while both names might appear
SELECT
    user_id,
    -- 'region' was renamed to 'geo_region' in the source
    COALESCE(geo_region, region) AS region,
    -- 'price' was renamed to 'unit_price'
    COALESCE(unit_price, price) AS unit_price,
    created_at
FROM `my-project.my_dataset.orders`
```

### Adding and Backfilling

```sql
-- Step 1: Add the new column
ALTER TABLE `my-project.my_dataset.orders` ADD COLUMN geo_region STRING;

-- Step 2: Backfill from the old column
UPDATE `my-project.my_dataset.orders`
SET geo_region = region
WHERE geo_region IS NULL AND region IS NOT NULL;

-- Step 3: Update downstream queries to use the new column name
-- Step 4: Eventually drop the old column (once all references are updated)
```

## Handling Column Type Changes

Type changes require careful handling. You cannot change a column's type in place in BigQuery.

### Create a New Column with the Correct Type

```sql
-- Source changed 'quantity' from STRING to INT64
-- Add a new column with the correct type and backfill

-- Step 1: Add the new typed column
ALTER TABLE `my-project.my_dataset.order_items`
ADD COLUMN quantity_int INT64;

-- Step 2: Backfill, handling potential conversion errors
UPDATE `my-project.my_dataset.order_items`
SET quantity_int = SAFE_CAST(quantity AS INT64)
WHERE quantity_int IS NULL;

-- Step 3: Use the new column in downstream queries
-- Step 4: Drop the old column when ready
```

### Use SAFE_CAST in Queries

```sql
-- Defensively cast columns that might have inconsistent types across partitions
SELECT
    order_id,
    SAFE_CAST(quantity AS INT64) AS quantity,
    SAFE_CAST(total_amount AS NUMERIC) AS total_amount,
    SAFE_CAST(order_date AS DATE) AS order_date
FROM `my-project.my_dataset.raw_orders`
```

SAFE_CAST returns NULL instead of an error when the cast fails, which prevents query failures on bad data.

## Schema Registry Pattern

For pipelines where you need to track and validate schema changes, implement a schema registry:

```sql
-- Schema registry table: tracks the expected schema for each source
CREATE TABLE `my-project.metadata.schema_registry` (
    source_name STRING NOT NULL,
    version INT64 NOT NULL,
    schema_json JSON NOT NULL,
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Register a schema version
INSERT INTO `my-project.metadata.schema_registry`
(source_name, version, schema_json, effective_from)
VALUES (
    'orders_api',
    3,
    JSON '{
        "columns": [
            {"name": "order_id", "type": "STRING", "required": true},
            {"name": "customer_id", "type": "STRING", "required": true},
            {"name": "geo_region", "type": "STRING", "required": false},
            {"name": "total_amount", "type": "NUMERIC", "required": true}
        ]
    }',
    CURRENT_TIMESTAMP()
);
```

## Automated Schema Drift Detection

Set up a scheduled query or Cloud Function that detects when the actual table schema differs from the expected schema:

```sql
-- Detect schema drift: compare actual columns vs. expected columns
WITH actual_schema AS (
    SELECT column_name, data_type, is_nullable
    FROM `my-project.my_dataset.INFORMATION_SCHEMA.COLUMNS`
    WHERE table_name = 'orders'
),
expected_schema AS (
    SELECT
        JSON_VALUE(col, '$.name') AS column_name,
        JSON_VALUE(col, '$.type') AS data_type
    FROM `my-project.metadata.schema_registry`,
    UNNEST(JSON_QUERY_ARRAY(schema_json, '$.columns')) AS col
    WHERE source_name = 'orders_api'
      AND effective_to IS NULL
)
-- Find columns in actual but not in expected (unexpected additions)
SELECT 'unexpected_column' AS drift_type, a.column_name, a.data_type
FROM actual_schema a
LEFT JOIN expected_schema e ON a.column_name = e.column_name
WHERE e.column_name IS NULL
UNION ALL
-- Find columns in expected but not in actual (missing columns)
SELECT 'missing_column' AS drift_type, e.column_name, e.data_type
FROM expected_schema e
LEFT JOIN actual_schema a ON e.column_name = a.column_name
WHERE a.column_name IS NULL
```

## dbt Approach to Schema Evolution

If you are using dbt, the model layer provides a natural place to handle schema changes:

```sql
-- models/staging/stg_orders.sql
-- This model normalizes the raw data, handling schema differences across time

SELECT
    order_id,
    customer_id,

    -- Handle the region column rename (old: region, new: geo_region)
    COALESCE(geo_region, region) AS region,

    -- Handle the type change on total_amount
    SAFE_CAST(total_amount AS NUMERIC) AS total_amount,

    -- New column with a sensible default for old data
    COALESCE(channel, 'web') AS channel,

    CAST(order_date AS DATE) AS order_date,
    created_at

FROM {{ source('raw', 'orders') }}
WHERE order_id IS NOT NULL
```

The staging layer absorbs all schema messiness so that downstream models always see a clean, consistent interface.

## Wrapping Up

Schema evolution is inevitable, and the key is building pipelines that handle it gracefully rather than breaking. Use JSON columns for raw data ingestion to decouple landing from parsing. Use SAFE_CAST and COALESCE in your SQL to handle type and naming inconsistencies. Use dbt's staging layer as the normalization boundary where all schema differences are resolved. And set up schema drift detection to alert you when unexpected changes happen so you can update your pipeline before it breaks.
