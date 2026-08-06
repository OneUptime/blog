# Recover Auto Loader After a Source Column Rename Without Reingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Auto Loader, Structured Streaming, Schema Evolution, Delta Lake, Unity Catalog, Data Engineering

Description: Recover safely when an upstream column rename splits Auto Loader history across two fields, while preserving the checkpoint and existing Bronze data.

---

A source column rename looks simple to a producer but is not a rename to Databricks Auto Loader. Auto Loader sees the new name as a new column. The old column remains in the inferred schema and is `NULL` in newer records. The new column is `NULL` in older records.

That behavior is deliberate. Auto Loader cannot prove that `customer_id` and `account_id` represent the same business fact. Treating every missing field plus new field as a rename would silently combine unrelated data.

The safest recovery is therefore not to delete the checkpoint and ingest every source file again. Preserve the file-ingestion state, retain both physical fields in Bronze, and reconcile their meaning in a downstream model. Backfill that model from Bronze, where the data already exists.

## Understand the Two Pieces of State

An Auto Loader stream usually has two related paths:

- `cloudFiles.schemaLocation` stores inferred schemas over time in an `_schemas` directory.
- `checkpointLocation` stores Structured Streaming progress, commits, query metadata, and Auto Loader's file state.

Databricks permits the schema location and checkpoint location to be the same directory, although keeping the concepts distinct in configuration makes incident reviews easier. Auto Loader stores discovered-file metadata in RocksDB under the checkpoint. That state is what lets it resume and provide exactly-once ingestion into Delta Lake.

Deleting `_schemas` does not restore the old business meaning of a renamed field. Deleting the whole checkpoint is more dangerous: the next run is a new query and might process old files again. Neither action merges values already written under two different column names.

## What Happens During the Rename

Assume the source originally sends this record:

```json
{"event_id":"e-100","customer_id":"c-42","event_type":"checkout"}
```

It later sends:

```json
{"event_id":"e-101","account_id":"c-42","event_type":"checkout"}
```

With `cloudFiles.schemaEvolutionMode=addNewColumns`, Auto Loader detects `account_id`, appends it to the tracked schema, and stops with `UnknownFieldException`. The schema location is updated before the exception. A restart then reads the new schema and continues. The resulting Bronze shape is conceptually:

| event_id | customer_id | account_id |
| --- | --- | --- |
| e-100 | c-42 | NULL |
| e-101 | NULL | c-42 |

The old field is a soft deletion from the source's perspective. Auto Loader does not remove it from the tracked schema. Current Databricks schema-evolution guidance describes source renames exactly this way: the renamed field is treated as newly added and the old field becomes `NULL` for new rows.

If the stream uses `rescue` mode, the new field is stored inside `_rescued_data` instead of being added to the top-level schema. If the stream has an explicit schema, `addNewColumns` is not allowed; the default evolution mode is `none`. In that case, update the explicit schema intentionally or extract the renamed field from rescued data.

## First Contain the Producer Change

If you control the producer, ask it to dual-write both names for a short compatibility window:

```json
{
  "event_id":"e-102",
  "customer_id":"c-42",
  "account_id":"c-42",
  "source_schema_version":2,
  "event_type":"checkout"
}
```

Dual-writing is not the permanent model. It creates an observable interval in which consumers can verify that the two fields agree. A `source_schema_version` is better than guessing from ingestion time because files can arrive late and Auto Loader does not guarantee discovery order.

If the producer cannot dual-write, record an authoritative cutover boundary. Prefer a source schema version, producer release identifier, or event contract version. Use an event timestamp only when the producer guarantees it represents the schema version. Do not use file discovery order as the boundary.

## Preserve Raw Fidelity in Bronze

Bronze should retain both names and enough metadata to explain where each row came from. A representative stream is:

```python
from pyspark.sql import functions as F

source_path = "/Volumes/landing/raw/events"
schema_path = "/Volumes/ops/checkpoints/events_ingest/schema"
checkpoint_path = "/Volumes/ops/checkpoints/events_ingest/query"

raw = (
    spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", schema_path)
    .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
    .option("rescuedDataColumn", "_rescued_data")
    .load(source_path)
    .select(
        "*",
        F.col("_metadata.file_path").alias("source_file"),
        F.current_timestamp().alias("ingested_at")
    )
)

(
    raw.writeStream
    .option("checkpointLocation", checkpoint_path)
    .option("mergeSchema", "true")
    .trigger(availableNow=True)
    .toTable("prod_raw.events.bronze_events")
)
```

Use a unique checkpoint for every streaming query. Store checkpoints and schema state in a Unity Catalog volume or another governed cloud location that has no object lifecycle policy. A lifecycle rule that removes checkpoint files corrupts the query state.

The `mergeSchema` writer option allows the Delta target to accept the additional top-level field. It does not assert that the two names are semantically equivalent.

## Inspect Before Changing Anything

Capture evidence from the source, schema state, checkpoint, and Bronze table:

```sql
DESCRIBE HISTORY prod_raw.events.bronze_events;

SELECT
  min(ingested_at) AS first_seen,
  max(ingested_at) AS last_seen,
  count(*) AS rows,
  count_if(customer_id IS NOT NULL) AS old_name_rows,
  count_if(account_id IS NOT NULL) AS new_name_rows,
  count_if(customer_id IS NOT NULL AND account_id IS NOT NULL
           AND customer_id <> account_id) AS disagreements
FROM prod_raw.events.bronze_events;
```

For an Auto Loader stream on Databricks Runtime 16.4 or later, inspect discovered files without editing checkpoint internals:

```sql
SELECT path, size, discovery_time, commit_time, ingestion_state
FROM cloud_files_state('/Volumes/ops/checkpoints/events_ingest/query')
ORDER BY discovery_time DESC;
```

`cloud_files_state` is the supported interface for file-level state. Do not hand-edit RocksDB files or offset logs.
The `discovery_time`, `commit_time`, and `ingestion_state` columns require Databricks Runtime 16.4 or later. Whether `commit_time` and `ingestion_state` are populated also depends on the runtime that processed the files and whether `cloudFiles.cleanSource` was enabled.

Also check `_rescued_data`. A rename may have been rescued for some interval before the explicit or inferred schema was updated:

```sql
SELECT
  count(*) AS rescued_rows,
  count_if(try_variant_get(parse_json(_rescued_data), '$.account_id', 'string')
           IS NOT NULL) AS renamed_field_in_rescue
FROM prod_raw.events.bronze_events
WHERE _rescued_data IS NOT NULL;
```

The exact semi-structured extraction function available depends on the runtime and type of `_rescued_data`. A portable alternative is `from_json(_rescued_data, 'account_id STRING').account_id`.

## Build One Canonical Field Downstream

Do not rename the Bronze column in place. That loses provenance and does not teach Auto Loader how to interpret future source records. Produce a canonical field in Silver instead.

When a trustworthy schema version exists, use it explicitly. If inspection found `account_id` or `source_schema_version` in rescued data, use those values as fallbacks for the same source fields:

```sql
CREATE OR REPLACE TABLE prod_curated.events.silver_events AS
SELECT
  * EXCEPT (customer_id, account_id),
  CASE
    WHEN coalesce(
      try_cast(source_schema_version AS INT),
      try_cast(get_json_object(_rescued_data, '$.source_schema_version') AS INT)
    ) >= 2 THEN coalesce(
      account_id,
      from_json(_rescued_data, 'account_id STRING').account_id
    )
    ELSE customer_id
  END AS customer_id
FROM prod_raw.events.bronze_events;
```

If the producer dual-wrote fields, fail validation when both are present but disagree:

```sql
SELECT
  event_id,
  customer_id,
  coalesce(
    account_id,
    from_json(_rescued_data, 'account_id STRING').account_id
  ) AS account_id,
  source_file
FROM prod_raw.events.bronze_events
WHERE customer_id IS NOT NULL
  AND coalesce(
    account_id,
    from_json(_rescued_data, 'account_id STRING').account_id
  ) IS NOT NULL
  AND customer_id <> coalesce(
    account_id,
    from_json(_rescued_data, 'account_id STRING').account_id
  );
```

Only use `coalesce(account_id, customer_id)` when the contract guarantees that a legitimate record cannot populate both fields with different meanings. `coalesce` is a convenient compatibility expression, not evidence that the rename was correct.

For a large Silver table, use an idempotent `MERGE` instead of replacing it. Merge on a stable, unique event key, not ingestion time; multiple source rows that match the same target row can make the merge fail:

```sql
MERGE INTO prod_curated.events.silver_events AS target
USING (
  SELECT
    * EXCEPT (customer_id, account_id),
    CASE
      WHEN coalesce(
        try_cast(source_schema_version AS INT),
        try_cast(get_json_object(_rescued_data, '$.source_schema_version') AS INT)
      ) >= 2 THEN coalesce(
        account_id,
        from_json(_rescued_data, 'account_id STRING').account_id
      )
      ELSE customer_id
    END AS customer_id
  FROM prod_raw.events.bronze_events
) AS source
ON target.event_id = source.event_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

This backfill reads the already-ingested Bronze Delta table. It does not enumerate the original cloud files and does not reset Auto Loader.

## Why Delta Column Mapping Is Not This Fix

Delta column mapping can support metadata-only renames of a Delta table column. It solves a different problem: changing the logical name of a column inside a Delta table while preserving its physical identity.

An upstream JSON, CSV, Avro, or Parquet producer has already emitted a different source field. Auto Loader must still parse that field, and historical Bronze rows still contain the old logical name. Renaming the Delta target column can make the ingestion contract harder to reason about and can terminate streams that observe the metadata change. Use column mapping only as part of a separately planned Delta schema migration, not as a shortcut for source-contract reconciliation.

## Validation Gates Before Cutover

Validate the canonical model over three populations:

1. Rows before the source cutover must retain the old field's value.
2. Dual-written rows must have matching old and new values.
3. Rows after the cutover must populate the canonical value from the new field.

Useful gates include:

```sql
SELECT
  count(*) AS total_rows,
  count_if(customer_id IS NULL) AS canonical_nulls,
  count(DISTINCT event_id) AS distinct_event_ids
FROM prod_curated.events.silver_events;
```

Compare these results with the pre-change baseline and expected business null rate. Also confirm that the Auto Loader backlog returns to normal and that no unexpected source files are replayed.

## When Reingestion Is Actually Necessary

Reingest from the source only if the Bronze copy cannot reconstruct the intended value. Examples include:

- the old field was excluded before Bronze was written;
- rescued data was discarded;
- corrupt-record handling dropped affected records;
- Bronze retention or an erroneous overwrite removed the relevant rows;
- the rename accompanied a semantic transformation that cannot be derived from stored fields.

When reingestion is required, write to a new target with a new checkpoint, reconcile it against the existing table, and perform an explicit cutover. Do not point a fresh query at the production append sink and hope Delta will infer business-level duplicates.

## Official Documentation

- [Configure schema inference and evolution in Auto Loader](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/schema)
- [Schema evolution in Databricks](https://docs.databricks.com/aws/en/data-engineering/schema-evolution)
- [What is Auto Loader?](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/)
- [`cloud_files_state` table-valued function](https://docs.databricks.com/aws/en/sql/language-manual/functions/cloud_files_state)
- [Auto Loader best practices](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/best-practices)
- [Update table schemas with schema evolution](https://docs.databricks.com/aws/en/tables/update-schema)

## Conclusion

An Auto Loader rename incident is a contract migration, not a checkpoint repair. Keep the checkpoint, let Bronze preserve both physical fields, recover any interval stored in rescued data, and create one version-aware canonical field downstream. Backfilling Silver from Bronze fixes history without replaying the cloud-file source and without weakening Auto Loader's ingestion guarantees.
