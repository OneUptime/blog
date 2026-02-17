# How to Implement Incremental Models in dbt for Efficient BigQuery Data Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, dbt, Incremental Models, Data Engineering

Description: Learn how to build incremental dbt models for BigQuery that process only new and changed data instead of rebuilding entire tables, saving both time and money.

---

When your dbt models grow beyond a few million rows, rebuilding the entire table on every run becomes expensive and slow. BigQuery charges by the data processed, and a full rebuild scans the entire source table every time. If your source table has 500 million rows and only 100,000 changed since the last run, you are doing 5,000 times more work than necessary.

Incremental models in dbt solve this by only processing new or modified data and appending (or merging) it into the existing table. This post covers the different incremental strategies available in dbt for BigQuery and when to use each one.

## How Incremental Models Work

An incremental model runs differently depending on whether the target table already exists:

- First run: dbt creates the table and processes all data (same as a regular table materialization)
- Subsequent runs: dbt processes only the new/changed data and merges it into the existing table

The key mechanism is the `is_incremental()` macro. When this evaluates to true (target table exists and it is not a full-refresh run), your SQL should include a filter that limits the source data to only what is new.

## Basic Incremental Model

Here is the simplest form of an incremental model:

```sql
-- models/marts/fct_events.sql
-- Incremental model: only processes events newer than the last run
{{
  config(
    materialized='incremental',
    unique_key='event_id',
    partition_by={
      "field": "event_date",
      "data_type": "date"
    }
  )
}}

SELECT
    event_id,
    user_id,
    event_type,
    event_properties,
    CAST(event_timestamp AS DATE) AS event_date,
    event_timestamp,
    created_at
FROM {{ ref('stg_events') }}

-- This block only runs on incremental runs (not the first run)
-- It filters to only process events newer than what we already have
{% if is_incremental() %}
WHERE event_timestamp > (
    SELECT MAX(event_timestamp) FROM {{ this }}
)
{% endif %}
```

The `{{ this }}` reference points to the current model's target table. On incremental runs, it queries the existing table to find the latest timestamp, then only processes source data newer than that.

## Incremental Strategies

dbt offers several strategies for how new data gets incorporated into the existing table. The strategy you choose depends on your data characteristics.

### Merge Strategy (Default)

The merge strategy uses a `MERGE` statement to insert new rows and update existing ones, based on the `unique_key`:

```sql
-- Merge strategy: inserts new rows and updates existing ones
-- Best when source data can contain updates to previously loaded rows
{{
  config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key='order_id',
    partition_by={
      "field": "order_date",
      "data_type": "date"
    },
    cluster_by=["customer_id"]
  )
}}

SELECT
    order_id,
    customer_id,
    order_date,
    status,              -- Status might change (pending -> shipped -> delivered)
    total_amount,
    updated_at
FROM {{ ref('stg_orders') }}

{% if is_incremental() %}
-- Only process orders that are new or have been updated since last run
WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

The merge strategy is the most versatile but also the most expensive in BigQuery because it scans the target table to find matching keys.

### Insert Overwrite Strategy

Insert overwrite replaces entire partitions rather than merging individual rows. It is much cheaper for partitioned tables:

```sql
-- Insert overwrite: replaces entire partitions with fresh data
-- Best for append-only data that does not get updated after initial load
{{
  config(
    materialized='incremental',
    incremental_strategy='insert_overwrite',
    partition_by={
      "field": "event_date",
      "data_type": "date",
      "granularity": "day"
    },
    cluster_by=["event_type"]
  )
}}

SELECT
    event_id,
    user_id,
    event_type,
    event_properties,
    CAST(event_timestamp AS DATE) AS event_date,
    event_timestamp
FROM {{ ref('stg_raw_events') }}

{% if is_incremental() %}
-- Process events from the last 3 days to handle late-arriving data
-- insert_overwrite will replace those day partitions entirely
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}
```

Insert overwrite is ideal when your data is partitioned by date and you can reprocess entire partitions. It avoids the expensive MERGE operation and is generally the recommended strategy for BigQuery.

### Append Strategy

The simplest strategy - just appends new rows without checking for duplicates:

```sql
-- Append strategy: inserts new rows without any deduplication
-- Best for immutable event streams where duplicates are impossible
{{
  config(
    materialized='incremental',
    incremental_strategy='append',
    partition_by={
      "field": "log_date",
      "data_type": "date"
    }
  )
}}

SELECT
    log_id,
    log_level,
    message,
    source_system,
    CAST(log_timestamp AS DATE) AS log_date,
    log_timestamp
FROM {{ ref('stg_application_logs') }}

{% if is_incremental() %}
WHERE log_timestamp > (SELECT MAX(log_timestamp) FROM {{ this }})
{% endif %}
```

Append is the cheapest strategy because it does not need to scan the target table at all. Use it when you are confident there are no duplicate or updated rows in the source.

## Handling Late-Arriving Data

Real-world data pipelines deal with late-arriving data - events that show up hours or days after they occurred. A simple `WHERE timestamp > MAX(timestamp)` filter would miss these events.

The solution is to use a lookback window:

```sql
-- Handle late-arriving data with a lookback window
{{
  config(
    materialized='incremental',
    incremental_strategy='insert_overwrite',
    partition_by={
      "field": "event_date",
      "data_type": "date"
    }
  )
}}

SELECT
    event_id,
    user_id,
    event_type,
    event_date,
    event_timestamp,
    ingestion_timestamp
FROM {{ ref('stg_events') }}

{% if is_incremental() %}
-- Reprocess the last 3 days to catch late-arriving events
-- With insert_overwrite, this replaces those partitions cleanly
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}
```

The 3-day lookback is a common choice, but adjust it based on how late your data typically arrives. Pair this with insert_overwrite so the reprocessed partitions replace the old ones cleanly.

## Compound Unique Keys

Sometimes a single column is not enough to uniquely identify a row. Use a list of columns as the unique key:

```sql
-- Compound unique key for merge strategy
-- Both user_id and event_date together identify a unique aggregated row
{{
  config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key=['user_id', 'event_date'],
    partition_by={
      "field": "event_date",
      "data_type": "date"
    }
  )
}}

SELECT
    user_id,
    CAST(event_timestamp AS DATE) AS event_date,
    COUNT(*) AS event_count,
    COUNT(DISTINCT event_type) AS unique_event_types,
    MAX(event_timestamp) AS last_event_at
FROM {{ ref('stg_events') }}

{% if is_incremental() %}
WHERE CAST(event_timestamp AS DATE) >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
{% endif %}

GROUP BY user_id, CAST(event_timestamp AS DATE)
```

## Full Refresh Override

Sometimes you need to rebuild the entire table from scratch, even though the model is incremental. dbt supports this with the `--full-refresh` flag:

```bash
# Force a full rebuild of all incremental models
dbt run --full-refresh

# Full refresh a specific model
dbt run --select fct_events --full-refresh
```

It is good practice to run a full refresh periodically (weekly or monthly) to correct any drift between your incremental model and the full source data.

## Incremental Predicates for Cost Optimization

For large tables using the merge strategy, you can add incremental predicates to limit the scan on the target table:

```sql
-- Use incremental_predicates to limit the target table scan during merge
{{
  config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key='event_id',
    partition_by={
      "field": "event_date",
      "data_type": "date"
    },
    incremental_predicates=[
      "DBT_INTERNAL_DEST.event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)"
    ]
  )
}}

SELECT
    event_id,
    event_type,
    user_id,
    event_date,
    event_timestamp
FROM {{ ref('stg_events') }}

{% if is_incremental() %}
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}
```

The `incremental_predicates` clause adds a filter to the target table in the MERGE statement, so BigQuery only scans recent partitions of the target instead of the entire table.

## Testing Incremental Models

Incremental models need extra testing to make sure the incremental logic is correct:

```yaml
# models/marts/schema.yml
models:
  - name: fct_events
    description: "Incrementally loaded event fact table"
    columns:
      - name: event_id
        tests:
          - unique        # Catch duplicates from bad incremental logic
          - not_null
      - name: event_date
        tests:
          - not_null
    tests:
      # Custom test: check for gaps in the date range
      - dbt_utils.recency:
          datepart: day
          field: event_date
          interval: 1
```

## Wrapping Up

Incremental models are essential for running dbt efficiently against BigQuery at scale. The insert_overwrite strategy is generally the best fit for BigQuery because it avoids expensive MERGE operations and works naturally with partitioned tables. Use merge when you need to handle updates to existing rows. Use append for immutable event streams. Always include a lookback window to handle late-arriving data, and run periodic full refreshes to keep things consistent. The initial setup takes a bit more thought than a simple table materialization, but the cost savings on large datasets make it well worth the effort.
