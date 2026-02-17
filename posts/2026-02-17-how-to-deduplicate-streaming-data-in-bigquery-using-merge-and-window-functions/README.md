# How to Deduplicate Streaming Data in BigQuery Using MERGE and Window Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Deduplication, Streaming, SQL, Data Engineering

Description: Learn practical techniques for deduplicating streaming data in BigQuery using MERGE statements, window functions, and table design patterns to handle duplicate events reliably.

---

Streaming data into BigQuery is a common pattern for real-time analytics, but it comes with a well-known problem: duplicates. At-least-once delivery guarantees in systems like Pub/Sub and Dataflow mean that the same event can arrive multiple times. Network retries, consumer restarts, and reprocessed messages all contribute to duplicate data landing in your BigQuery tables.

You need a reliable way to deduplicate this data, either at query time, on a schedule, or as part of your ingestion pipeline. This post covers the most practical approaches using SQL that works directly in BigQuery.

## Why Duplicates Happen in Streaming Pipelines

Before jumping into solutions, it helps to understand why duplicates appear. In a typical streaming architecture:

1. A producer sends events to Pub/Sub
2. Pub/Sub delivers the message to a consumer (Dataflow, Cloud Functions, etc.)
3. The consumer processes the event and writes to BigQuery
4. The consumer acknowledges the message

If the consumer crashes after writing to BigQuery but before acknowledging, Pub/Sub redelivers the message. The consumer processes it again, and now BigQuery has two copies.

This is normal and expected behavior. The deduplication strategies below handle it gracefully.

## Deduplication at Query Time with Window Functions

The simplest approach is to deduplicate when you query the data. Use ROW_NUMBER() to pick one row per event:

```sql
-- Deduplicate at query time using ROW_NUMBER()
-- Picks the earliest occurrence of each event based on ingestion timestamp
WITH ranked_events AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY event_id         -- Group duplicates by their unique ID
            ORDER BY _PARTITIONTIME ASC   -- Keep the earliest arrival
        ) AS row_num
    FROM `my-project.events_dataset.raw_events`
    WHERE event_date >= '2026-02-01'
)
SELECT
    event_id,
    user_id,
    event_type,
    event_timestamp,
    event_properties
FROM ranked_events
WHERE row_num = 1                         -- Only keep the first occurrence
```

This works well for ad-hoc queries and dashboards. The duplicates stay in the table, but every query that needs deduplicated data uses this pattern.

To make it reusable, create a view:

```sql
-- Create a deduplicated view that downstream queries can reference
CREATE OR REPLACE VIEW `my-project.events_dataset.events_deduplicated` AS
SELECT
    event_id,
    user_id,
    event_type,
    event_timestamp,
    event_properties,
    event_date
FROM (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY event_id
            ORDER BY event_timestamp ASC
        ) AS rn
    FROM `my-project.events_dataset.raw_events`
)
WHERE rn = 1
```

## Deduplication with QUALIFY

BigQuery supports the QUALIFY clause, which simplifies the window function pattern:

```sql
-- Cleaner syntax using QUALIFY instead of a CTE
-- QUALIFY filters on window function results directly
SELECT
    event_id,
    user_id,
    event_type,
    event_timestamp,
    event_properties
FROM `my-project.events_dataset.raw_events`
WHERE event_date >= '2026-02-01'
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY event_id
    ORDER BY event_timestamp ASC
) = 1
```

QUALIFY is syntactic sugar - it produces the same execution plan as the CTE approach but is easier to read.

## Scheduled Deduplication with MERGE

For production pipelines, you often want to physically remove duplicates rather than filtering them at query time. The MERGE statement is the tool for this. It can insert new rows and skip (or update) existing ones atomically.

### Pattern 1: Staging Table Merge

Process new streaming data through a staging table, then merge into the final table:

```sql
-- Step 1: Create the deduplicated target table (one-time setup)
CREATE TABLE `my-project.events_dataset.events_clean` (
    event_id STRING NOT NULL,
    user_id STRING,
    event_type STRING,
    event_timestamp TIMESTAMP,
    event_properties JSON,
    event_date DATE
)
PARTITION BY event_date
CLUSTER BY event_type, user_id;

-- Step 2: Merge new events from the raw streaming table into the clean table
-- This runs on a schedule (e.g., every 5 minutes)
MERGE `my-project.events_dataset.events_clean` AS target
USING (
    -- Deduplicate within the batch first
    SELECT * FROM (
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY event_id
                ORDER BY event_timestamp ASC
            ) AS rn
        FROM `my-project.events_dataset.raw_events`
        -- Only process recent data to keep the merge efficient
        WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    )
    WHERE rn = 1
) AS source
ON target.event_id = source.event_id
    -- Add partition filter to limit the scan on the target table
    AND target.event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
WHEN NOT MATCHED THEN
    INSERT (event_id, user_id, event_type, event_timestamp, event_properties, event_date)
    VALUES (source.event_id, source.user_id, source.event_type, source.event_timestamp,
            source.event_properties, source.event_date);
```

The partition filter on the target table is important. Without it, BigQuery scans the entire target table to check for matches, which is expensive for large tables.

### Pattern 2: Merge with Updates

Sometimes duplicates carry updated information. You want to keep the latest version:

```sql
-- Merge with update logic: insert new records, update existing ones with newer data
MERGE `my-project.orders_dataset.orders` AS target
USING (
    SELECT * FROM (
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY order_id
                ORDER BY updated_at DESC   -- Keep the latest version
            ) AS rn
        FROM `my-project.orders_dataset.orders_staging`
        WHERE ingestion_date = CURRENT_DATE()
    )
    WHERE rn = 1
) AS source
ON target.order_id = source.order_id
WHEN MATCHED AND source.updated_at > target.updated_at THEN
    -- Only update if the incoming record is newer
    UPDATE SET
        status = source.status,
        total_amount = source.total_amount,
        updated_at = source.updated_at
WHEN NOT MATCHED THEN
    INSERT ROW;
```

## Deduplication Using SELECT DISTINCT

For simple cases where the entire row is duplicated (every column has the same value), SELECT DISTINCT works:

```sql
-- Simple full-row deduplication with SELECT DISTINCT
-- Only works when duplicates are exact copies
CREATE OR REPLACE TABLE `my-project.events_dataset.events_clean` AS
SELECT DISTINCT
    event_id,
    user_id,
    event_type,
    event_timestamp,
    event_properties,
    event_date
FROM `my-project.events_dataset.raw_events`;
```

However, this is rarely the case in practice. Duplicates often differ in metadata columns like ingestion timestamp, so window functions are usually necessary.

## Scheduled Deduplication Job

Automate deduplication by running it on a schedule. You can use BigQuery scheduled queries:

```sql
-- Scheduled query: runs every 15 minutes to deduplicate recent data
-- Configure this as a BigQuery scheduled query in the Console or via API

-- First, deduplicate within the recent window
CREATE TEMP TABLE recent_deduped AS
SELECT * FROM (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY event_id
            ORDER BY event_timestamp ASC
        ) AS rn
    FROM `my-project.events_dataset.raw_events`
    WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
)
WHERE rn = 1;

-- Then merge into the clean table
MERGE `my-project.events_dataset.events_clean` AS target
USING recent_deduped AS source
ON target.event_id = source.event_id
    AND target.event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
WHEN NOT MATCHED THEN
    INSERT ROW;
```

Set up the schedule:

```bash
# Create a scheduled query that runs every 15 minutes
bq query \
  --use_legacy_sql=false \
  --schedule='every 15 minutes' \
  --display_name='Deduplicate Events' \
  --destination_table='' \
  'MERGE `my-project.events_dataset.events_clean` AS target ...'
```

## Using BigQuery's Streaming Buffer Considerations

Data in BigQuery's streaming buffer (recently streamed data) cannot be modified by DML statements. MERGE operations against the streaming buffer will fail. Your deduplication schedule needs to account for the buffer flush time (which is typically a few minutes but can be longer):

```sql
-- Only deduplicate data that has left the streaming buffer
-- Data older than 30 minutes is safely past the buffer
MERGE `my-project.events_dataset.events_clean` AS target
USING (
    SELECT * FROM (
        SELECT
            *,
            ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY event_timestamp ASC) AS rn
        FROM `my-project.events_dataset.raw_events`
        WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
          -- Skip data still in the streaming buffer
          AND _PARTITIONTIME <= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 MINUTE)
    )
    WHERE rn = 1
) AS source
ON target.event_id = source.event_id
    AND target.event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
WHEN NOT MATCHED THEN
    INSERT ROW;
```

## Performance Tips

Always include a partition filter in both the source and target of your MERGE to minimize data scanned. Deduplicate within the source batch before merging to reduce the number of rows the MERGE needs to process. Cluster your target table on the columns used in the MERGE ON clause for faster matching. Run deduplication frequently with small batches rather than infrequently with large batches.

## Wrapping Up

Duplicates in streaming data are not a bug - they are a natural consequence of at-least-once delivery guarantees. The right deduplication strategy depends on your requirements. Query-time deduplication with window functions and QUALIFY is simple and works well for analytical queries. Scheduled MERGE operations physically remove duplicates and keep your tables clean for downstream consumers. Whichever approach you choose, make sure your deduplication key (usually an event ID or message ID) is reliable and present on every record, and always scope your deduplication operations to recent partitions to keep costs under control.
