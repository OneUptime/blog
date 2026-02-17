# How to Load Nested JSON Files into BigQuery and Preserve the Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, JSON, Nested Data, Data Loading

Description: Learn how to load nested JSON files into BigQuery while preserving the nested structure as STRUCT and ARRAY columns instead of flattening everything into strings.

---

Loading flat JSON into BigQuery is simple. But when your JSON has nested objects and arrays - which most real-world JSON does - things get more interesting. The good news is that BigQuery can natively preserve nested JSON structures as STRUCT and ARRAY columns, giving you a queryable schema that mirrors the original JSON hierarchy.

I deal with nested JSON from APIs, event streams, and data exports regularly. Getting the loading right the first time saves a lot of cleanup work later. Here is how to do it.

## Understanding the Challenge

Consider this JSON event record.

```json
{
  "event_id": "evt-001",
  "timestamp": "2026-02-17T10:30:00Z",
  "user": {
    "id": 12345,
    "name": "Alice",
    "preferences": {
      "theme": "dark",
      "language": "en"
    }
  },
  "items": [
    {"product_id": "P001", "name": "Widget", "quantity": 2, "price": 29.99},
    {"product_id": "P002", "name": "Gadget", "quantity": 1, "price": 49.99}
  ],
  "tags": ["sale", "electronics", "featured"]
}
```

When loaded correctly into BigQuery, this should create:
- `user` as a STRUCT with nested `preferences` STRUCT
- `items` as an ARRAY of STRUCTs
- `tags` as an ARRAY of STRINGs

## Loading with Auto-Detection

The simplest approach is to let BigQuery auto-detect the schema. It handles nested structures well for most cases.

```bash
# Load nested JSON with schema auto-detection
# BigQuery will infer STRUCTs for nested objects and ARRAYs for arrays
bq load \
  --autodetect \
  --source_format=NEWLINE_DELIMITED_JSON \
  my_project:my_dataset.events \
  gs://my-bucket/data/events.jsonl
```

Important: BigQuery expects newline-delimited JSON (NDJSON), where each line is a complete JSON object. If your file has a JSON array at the top level, you need to convert it first.

```bash
# Convert a JSON array file to newline-delimited JSON
# Input: [{"id":1},{"id":2},{"id":3}]
# Output: {"id":1}\n{"id":2}\n{"id":3}
cat events.json | jq -c '.[]' > events.jsonl

# Upload to Cloud Storage
gsutil cp events.jsonl gs://my-bucket/data/events.jsonl
```

## Loading with an Explicit Schema

For production pipelines, I prefer explicit schemas. They give you control over data types and ensure consistency.

```bash
# Load with an explicit schema that preserves nesting
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  my_project:my_dataset.events \
  gs://my-bucket/data/events.jsonl \
  schema.json
```

Here is the schema file.

```json
[
  {"name": "event_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {
    "name": "user",
    "type": "RECORD",
    "mode": "NULLABLE",
    "fields": [
      {"name": "id", "type": "INT64", "mode": "NULLABLE"},
      {"name": "name", "type": "STRING", "mode": "NULLABLE"},
      {
        "name": "preferences",
        "type": "RECORD",
        "mode": "NULLABLE",
        "fields": [
          {"name": "theme", "type": "STRING", "mode": "NULLABLE"},
          {"name": "language", "type": "STRING", "mode": "NULLABLE"}
        ]
      }
    ]
  },
  {
    "name": "items",
    "type": "RECORD",
    "mode": "REPEATED",
    "fields": [
      {"name": "product_id", "type": "STRING", "mode": "NULLABLE"},
      {"name": "name", "type": "STRING", "mode": "NULLABLE"},
      {"name": "quantity", "type": "INT64", "mode": "NULLABLE"},
      {"name": "price", "type": "NUMERIC", "mode": "NULLABLE"}
    ]
  },
  {
    "name": "tags",
    "type": "STRING",
    "mode": "REPEATED"
  }
]
```

Key points about the schema:
- Nested objects map to `type: "RECORD"` with `mode: "NULLABLE"` (or REQUIRED)
- Arrays of objects map to `type: "RECORD"` with `mode: "REPEATED"`
- Simple arrays map to their element type with `mode: "REPEATED"`

## Loading with SQL

You can also use the LOAD DATA statement.

```sql
-- Load nested JSON using SQL
LOAD DATA INTO `my_project.my_dataset.events` (
  event_id STRING,
  timestamp TIMESTAMP,
  user STRUCT<
    id INT64,
    name STRING,
    preferences STRUCT<
      theme STRING,
      language STRING
    >
  >,
  items ARRAY<STRUCT<
    product_id STRING,
    name STRING,
    quantity INT64,
    price NUMERIC
  >>,
  tags ARRAY<STRING>
)
FROM FILES (
  format = 'JSON',
  uris = ['gs://my-bucket/data/events.jsonl']
);
```

## Loading with Python

Here is the Python approach with an explicit schema.

```python
# load_nested_json.py - Load nested JSON preserving the schema
from google.cloud import bigquery

def load_nested_json(project, dataset, table, gcs_uri):
    """Load nested JSON into BigQuery with explicit schema."""
    client = bigquery.Client(project=project)
    table_ref = f"{project}.{dataset}.{table}"

    # Define the schema with nested fields
    schema = [
        bigquery.SchemaField("event_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
        bigquery.SchemaField("user", "RECORD", mode="NULLABLE", fields=[
            bigquery.SchemaField("id", "INTEGER"),
            bigquery.SchemaField("name", "STRING"),
            bigquery.SchemaField("preferences", "RECORD", fields=[
                bigquery.SchemaField("theme", "STRING"),
                bigquery.SchemaField("language", "STRING"),
            ]),
        ]),
        bigquery.SchemaField("items", "RECORD", mode="REPEATED", fields=[
            bigquery.SchemaField("product_id", "STRING"),
            bigquery.SchemaField("name", "STRING"),
            bigquery.SchemaField("quantity", "INTEGER"),
            bigquery.SchemaField("price", "NUMERIC"),
        ]),
        bigquery.SchemaField("tags", "STRING", mode="REPEATED"),
    ]

    # Configure the load job
    job_config = bigquery.LoadJobConfig()
    job_config.source_format = bigquery.SourceFormat.NEWLINE_DELIMITED_JSON
    job_config.schema = schema
    job_config.write_disposition = bigquery.WriteDisposition.WRITE_APPEND

    # Run the load job
    load_job = client.load_table_from_uri(gcs_uri, table_ref, job_config=job_config)
    result = load_job.result()

    print(f"Loaded {result.output_rows} rows into {table_ref}")
    return result


if __name__ == "__main__":
    load_nested_json(
        "my_project", "my_dataset", "events",
        "gs://my-bucket/data/events.jsonl"
    )
```

## Handling Inconsistent JSON Structures

Real-world JSON is messy. Some records might have a field, others might not. Some records might have an object where others have null.

BigQuery handles missing fields gracefully - they get NULL values. But type inconsistencies cause problems.

```python
# preprocess_json.py - Clean and normalize JSON before loading
import json
import sys

def normalize_record(record):
    """Normalize a JSON record to ensure consistent structure."""
    # Ensure user is always an object
    if 'user' not in record or record['user'] is None:
        record['user'] = {'id': None, 'name': None, 'preferences': None}

    # Ensure preferences is always an object
    if record['user'].get('preferences') is None:
        record['user']['preferences'] = {'theme': None, 'language': None}

    # Ensure items is always an array
    if 'items' not in record or record['items'] is None:
        record['items'] = []

    # Ensure tags is always an array
    if 'tags' not in record or record['tags'] is None:
        record['tags'] = []

    # Ensure numeric fields are correct types
    for item in record.get('items', []):
        if 'quantity' in item and item['quantity'] is not None:
            item['quantity'] = int(item['quantity'])
        if 'price' in item and item['price'] is not None:
            item['price'] = float(item['price'])

    return record


def process_file(input_path, output_path):
    """Read JSON file, normalize, and write out."""
    with open(input_path, 'r') as f_in, open(output_path, 'w') as f_out:
        for line in f_in:
            record = json.loads(line.strip())
            normalized = normalize_record(record)
            f_out.write(json.dumps(normalized) + '\n')


if __name__ == "__main__":
    process_file(sys.argv[1], sys.argv[2])
```

## Using External Tables to Preview the Schema

Before committing to a load, create an external table to preview how BigQuery interprets your JSON.

```sql
-- Create an external table to preview the auto-detected schema
CREATE EXTERNAL TABLE `my_project.my_dataset.events_preview`
OPTIONS (
  format = 'JSON',
  uris = ['gs://my-bucket/data/events_sample.jsonl']
);

-- Check the auto-detected schema
SELECT
  column_name,
  data_type,
  is_nullable
FROM `my_project.my_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'events_preview'
ORDER BY ordinal_position;

-- Preview the data
SELECT * FROM `my_project.my_dataset.events_preview` LIMIT 5;
```

## Handling Deeply Nested JSON

For JSON with many levels of nesting, you might need to decide which levels to preserve as STRUCT and which to store as JSON strings.

```json
{
  "event_id": "evt-001",
  "metadata": {
    "source": "web",
    "context": {
      "page": {
        "url": "https://example.com/products",
        "title": "Products",
        "referrer": "https://google.com"
      },
      "campaign": {
        "source": "google",
        "medium": "cpc",
        "content": {
          "variant": "A",
          "creative_id": "cr-123"
        }
      }
    }
  }
}
```

```sql
-- Schema that preserves top levels and stores deep nesting as JSON
CREATE TABLE `my_project.my_dataset.events_hybrid` (
  event_id STRING,
  metadata STRUCT<
    source STRING,
    -- Preserve one level of nesting
    context STRUCT<
      -- Store deep nesting as JSON string
      page JSON,
      campaign JSON
    >
  >
);
```

This gives you structured access to the fields you query most often while keeping flexibility for deeply nested data.

## Verifying the Loaded Schema

After loading, verify that the nested structure was preserved correctly.

```sql
-- Verify the schema was preserved
SELECT
  column_name,
  data_type,
  is_nullable
FROM `my_project.my_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- Test querying nested fields
SELECT
  event_id,
  user.name AS user_name,
  user.preferences.theme AS user_theme,
  ARRAY_LENGTH(items) AS item_count,
  (SELECT SUM(i.price * i.quantity) FROM UNNEST(items) AS i) AS order_total
FROM `my_project.my_dataset.events`
LIMIT 5;
```

## Loading from Cloud Storage with Partitioning

Combine nested JSON loading with partitioning for production use.

```bash
# Load nested JSON into a partitioned table
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --time_partitioning_field=event_date \
  --time_partitioning_type=DAY \
  --clustering_fields=user.id \
  my_project:my_dataset.events \
  gs://my-bucket/data/events_20260217.jsonl \
  schema.json
```

## Common Pitfalls

**Array of mixed types**: JSON allows arrays with mixed types (`[1, "two", true]`), but BigQuery does not. All elements in an array must be the same type. Preprocess your data to ensure type consistency.

**Top-level arrays**: BigQuery expects each line to be a JSON object, not an array. If your file is a JSON array, convert it to NDJSON first.

**Empty arrays vs null**: An empty array `[]` and `null` are handled differently. Empty arrays create the array column but with no elements. Null creates a NULL value for the column.

**Field name conflicts**: JSON field names are case-sensitive, but BigQuery column names are not. If your JSON has both "Name" and "name", they will collide.

## Wrapping Up

Loading nested JSON into BigQuery while preserving the schema gives you the best of both worlds - the flexibility of JSON with the query power of a structured data warehouse. Use auto-detection for exploration, explicit schemas for production, and always verify the result. For deeply nested or inconsistent JSON, consider a hybrid approach where you preserve top-level structure and store deep nesting as JSON columns.

For monitoring your data loading pipelines and ensuring data quality across your BigQuery environment, [OneUptime](https://oneuptime.com) provides the observability tools you need to keep your data infrastructure reliable.
