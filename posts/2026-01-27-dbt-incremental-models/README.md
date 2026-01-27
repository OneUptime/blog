# How to Configure dbt Incremental Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: dbt, Data Engineering, SQL, Analytics, ETL, Data Warehouse, Incremental Processing, BigQuery, Snowflake, Redshift

Description: A comprehensive guide to configuring dbt incremental models for efficient data transformations that process only new or changed records instead of rebuilding entire tables.

---

> Incremental models are the key to scaling your dbt project - they transform hours of processing into minutes by focusing only on what has changed.

Data transformation at scale demands efficiency. Running full table refreshes on billions of rows every time your pipeline executes is not just slow - it is expensive and wasteful. dbt incremental models solve this by processing only new or modified data, dramatically reducing compute costs and pipeline duration.

This guide covers everything you need to know about configuring incremental models in dbt, from basic setup to advanced strategies for handling edge cases.

---

## What is an Incremental Strategy?

An incremental strategy defines how dbt identifies and processes new data. Instead of dropping and recreating tables on every run, incremental models append or merge only the records that have changed since the last execution.

The core concept is simple: track what data already exists, identify what is new, and process only the delta.

```sql
-- Basic incremental model structure
{{
    config(
        materialized='incremental'
    )
}}

select
    id,
    user_id,
    event_type,
    created_at,
    properties
from {{ source('raw', 'events') }}

-- This filter only applies during incremental runs
{% if is_incremental() %}
where created_at > (select max(created_at) from {{ this }})
{% endif %}
```

The model above processes all data on the first run, then only new events on subsequent runs.

---

## The is_incremental() Macro

The `is_incremental()` macro is the cornerstone of incremental logic in dbt. It returns `true` when all of the following conditions are met:

1. The model is configured with `materialized='incremental'`
2. The target table already exists in the database
3. The `--full-refresh` flag is NOT being used

```sql
{{
    config(
        materialized='incremental'
    )
}}

select
    order_id,
    customer_id,
    order_total,
    order_status,
    updated_at,
    created_at
from {{ source('ecommerce', 'orders') }}

{% if is_incremental() %}
    -- Only process orders created or updated since last run
    -- Uses the max timestamp from the existing target table
    where updated_at > (select max(updated_at) from {{ this }})
{% endif %}
```

The `{{ this }}` reference points to the current model's target table, allowing you to query the existing data to determine what is new.

### Common is_incremental() Patterns

```sql
-- Pattern 1: Simple timestamp filter
{% if is_incremental() %}
where created_at > (select max(created_at) from {{ this }})
{% endif %}

-- Pattern 2: Multiple timestamp columns for upserts
{% if is_incremental() %}
where created_at > (select max(created_at) from {{ this }})
   or updated_at > (select max(updated_at) from {{ this }})
{% endif %}

-- Pattern 3: Date partition filter for cost optimization
{% if is_incremental() %}
where date_column >= (select max(date_column) from {{ this }})
{% endif %}

-- Pattern 4: Lookback window for late-arriving data
{% if is_incremental() %}
where created_at > (
    select dateadd(hour, -3, max(created_at))
    from {{ this }}
)
{% endif %}
```

---

## The unique_key Configuration

The `unique_key` configuration tells dbt which column (or columns) uniquely identify a row. This is essential for update scenarios where you want to replace existing records rather than create duplicates.

```sql
{{
    config(
        materialized='incremental',
        unique_key='order_id'
    )
}}

select
    order_id,
    customer_id,
    order_total,
    order_status,
    updated_at
from {{ source('ecommerce', 'orders') }}

{% if is_incremental() %}
where updated_at > (select max(updated_at) from {{ this }})
{% endif %}
```

When `unique_key` is set, dbt uses it to determine whether to insert new rows or update existing ones.

### Composite Unique Keys

For tables without a single unique identifier, use a composite key:

```sql
{{
    config(
        materialized='incremental',
        unique_key=['user_id', 'event_date', 'event_type']
    )
}}

-- Daily aggregated metrics per user and event type
select
    user_id,
    event_date,
    event_type,
    count(*) as event_count,
    sum(event_value) as total_value
from {{ source('analytics', 'events') }}

{% if is_incremental() %}
where event_date >= (select max(event_date) from {{ this }})
{% endif %}

group by user_id, event_date, event_type
```

---

## Merge Strategy

The merge strategy (default for most warehouses) uses SQL MERGE to handle both inserts and updates in a single operation. This is ideal when records can be both created and modified.

```sql
{{
    config(
        materialized='incremental',
        unique_key='customer_id',
        incremental_strategy='merge'
    )
}}

-- Customer dimension table that tracks latest state
select
    customer_id,
    email,
    first_name,
    last_name,
    subscription_tier,
    last_login_at,
    updated_at,
    created_at
from {{ source('crm', 'customers') }}

{% if is_incremental() %}
    -- Capture both new customers and updates to existing ones
    where updated_at > (select max(updated_at) from {{ this }})
{% endif %}
```

The merge strategy generates SQL similar to:

```sql
-- Simplified representation of what dbt generates
MERGE INTO target_table AS target
USING source_data AS source
ON target.customer_id = source.customer_id
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT ...
```

### Merge with Update Columns

Control which columns get updated during a merge:

```sql
{{
    config(
        materialized='incremental',
        unique_key='product_id',
        incremental_strategy='merge',
        merge_update_columns=['price', 'inventory_count', 'updated_at']
    )
}}

-- Only update specific columns, preserve others
select
    product_id,
    product_name,
    category,
    price,
    inventory_count,
    updated_at
from {{ source('inventory', 'products') }}

{% if is_incremental() %}
where updated_at > (select max(updated_at) from {{ this }})
{% endif %}
```

---

## Delete+Insert Strategy

The delete+insert strategy first removes matching records from the target table, then inserts the new data. This is useful when merge operations are expensive or unavailable.

```sql
{{
    config(
        materialized='incremental',
        unique_key='session_id',
        incremental_strategy='delete+insert'
    )
}}

-- Session data where entire records should be replaced
select
    session_id,
    user_id,
    session_start,
    session_end,
    page_views,
    total_duration_seconds,
    conversion_flag
from {{ source('web', 'sessions') }}

{% if is_incremental() %}
where session_start >= (
    select dateadd(day, -1, max(session_start))
    from {{ this }}
)
{% endif %}
```

The delete+insert strategy is particularly effective for:

- Warehouses where MERGE is expensive (some Redshift configurations)
- Scenarios where you want complete record replacement
- Partitioned tables where you can delete entire partitions

### Partition-Based Delete+Insert

For partitioned tables, combine delete+insert with partition predicates:

```sql
{{
    config(
        materialized='incremental',
        unique_key='event_id',
        incremental_strategy='delete+insert',
        partition_by={
            'field': 'event_date',
            'data_type': 'date',
            'granularity': 'day'
        }
    )
}}

select
    event_id,
    user_id,
    event_type,
    event_properties,
    event_date,
    event_timestamp
from {{ source('analytics', 'raw_events') }}

{% if is_incremental() %}
    -- Process last 2 days of partitions
    where event_date >= date_sub(current_date(), interval 2 day)
{% endif %}
```

---

## Append Strategy

The append strategy simply inserts new records without checking for duplicates. This is the fastest approach but requires careful filtering to avoid duplicates.

```sql
{{
    config(
        materialized='incremental',
        incremental_strategy='append'
    )
}}

-- Immutable event log - events are never updated
select
    event_id,
    user_id,
    event_name,
    event_properties,
    device_info,
    ip_address,
    received_at
from {{ source('tracking', 'events') }}

{% if is_incremental() %}
    -- Only append truly new events
    where received_at > (select max(received_at) from {{ this }})
      and event_id not in (select event_id from {{ this }})
{% endif %}
```

The append strategy works best for:

- Immutable event logs where records are never updated
- High-volume insert-only workloads
- Scenarios where you have reliable deduplication logic

### Append with Deduplication

Add explicit deduplication when source data might contain duplicates:

```sql
{{
    config(
        materialized='incremental',
        incremental_strategy='append'
    )
}}

with new_events as (
    select
        event_id,
        user_id,
        event_name,
        event_timestamp,
        -- Rank to handle potential duplicates in source
        row_number() over (
            partition by event_id
            order by event_timestamp desc
        ) as row_num
    from {{ source('tracking', 'raw_events') }}

    {% if is_incremental() %}
    where event_timestamp > (select max(event_timestamp) from {{ this }})
    {% endif %}
)

select
    event_id,
    user_id,
    event_name,
    event_timestamp
from new_events
where row_num = 1
  {% if is_incremental() %}
  -- Additional check against existing data
  and event_id not in (select event_id from {{ this }})
  {% endif %}
```

---

## Full Refresh Handling

Sometimes you need to rebuild the entire table from scratch. dbt provides the `--full-refresh` flag for this purpose.

```bash
# Run a full refresh on a specific model
dbt run --select my_incremental_model --full-refresh

# Run full refresh on all models
dbt run --full-refresh
```

### Conditional Logic for Full Refresh

Handle full refresh scenarios explicitly in your models:

```sql
{{
    config(
        materialized='incremental',
        unique_key='metric_id',
        incremental_strategy='merge'
    )
}}

{% set lookback_days = 90 if flags.FULL_REFRESH else 3 %}

select
    {{ dbt_utils.generate_surrogate_key(['date', 'metric_name', 'dimension']) }} as metric_id,
    date,
    metric_name,
    dimension,
    metric_value,
    current_timestamp() as loaded_at
from {{ source('metrics', 'raw_metrics') }}

where date >= dateadd(day, -{{ lookback_days }}, current_date())

{% if is_incremental() %}
    and date >= (select max(date) from {{ this }})
{% endif %}
```

### Scheduled Full Refresh

Implement periodic full refreshes to catch any data drift:

```sql
{{
    config(
        materialized='incremental',
        unique_key='order_id',
        incremental_strategy='merge'
    )
}}

-- Force full refresh on first day of month
{% set force_full_refresh = modules.datetime.datetime.now().day == 1 %}

select
    order_id,
    customer_id,
    order_total,
    order_status,
    updated_at
from {{ source('ecommerce', 'orders') }}

{% if is_incremental() and not force_full_refresh %}
where updated_at > (select max(updated_at) from {{ this }})
{% endif %}
```

---

## Handling Late-Arriving Data

Late-arriving data is one of the most common challenges with incremental models. Records may arrive hours or even days after their event timestamp.

### Lookback Window Approach

```sql
{{
    config(
        materialized='incremental',
        unique_key='event_id',
        incremental_strategy='merge'
    )
}}

select
    event_id,
    user_id,
    event_type,
    event_timestamp,
    processed_at
from {{ source('streaming', 'events') }}

{% if is_incremental() %}
    -- Look back 6 hours to catch late arrivals
    where event_timestamp > (
        select dateadd(hour, -6, max(event_timestamp))
        from {{ this }}
    )
{% endif %}
```

### Using Ingestion Timestamp

Track when data was ingested, not just when the event occurred:

```sql
{{
    config(
        materialized='incremental',
        unique_key='transaction_id',
        incremental_strategy='merge'
    )
}}

select
    transaction_id,
    account_id,
    transaction_amount,
    transaction_type,
    transaction_date,        -- When the transaction happened
    _ingested_at            -- When we received the data
from {{ source('banking', 'transactions') }}

{% if is_incremental() %}
    -- Filter on ingestion time, not transaction time
    where _ingested_at > (select max(_ingested_at) from {{ this }})
{% endif %}
```

### Hybrid Approach for Maximum Coverage

Combine multiple strategies for comprehensive late data handling:

```sql
{{
    config(
        materialized='incremental',
        unique_key='record_id',
        incremental_strategy='merge'
    )
}}

with source_data as (
    select
        record_id,
        business_date,
        record_data,
        created_at,
        updated_at,
        _loaded_at
    from {{ source('operational', 'records') }}

    {% if is_incremental() %}
    where
        -- Catch updates to existing records
        updated_at > (select max(updated_at) from {{ this }})
        -- Catch late-arriving new records (3-day lookback)
        or (
            created_at > dateadd(day, -3, current_timestamp())
            and created_at > (select max(created_at) from {{ this }})
        )
        -- Catch any records from recent loads
        or _loaded_at > (select max(_loaded_at) from {{ this }})
    {% endif %}
)

select * from source_data
```

---

## Best Practices Summary

1. **Choose the right strategy**: Use `merge` for upserts, `delete+insert` for partition replacement, and `append` for immutable logs.

2. **Always set unique_key**: Without it, you risk duplicate records. Use composite keys when a single column is insufficient.

3. **Handle late-arriving data**: Implement lookback windows appropriate for your data source latency patterns.

4. **Use ingestion timestamps**: When available, filter on when data arrived rather than when events occurred.

5. **Test with full refresh**: Periodically run full refreshes to validate that your incremental logic produces consistent results.

6. **Monitor for drift**: Compare row counts and aggregates between incremental and full refresh runs.

7. **Partition large tables**: Combine incremental strategies with partitioning for optimal performance on large datasets.

8. **Document your assumptions**: Clearly state the expected data arrival patterns and refresh frequency in model documentation.

9. **Keep lookback windows minimal**: Larger windows mean more data processed. Tune based on actual late data patterns.

10. **Use on_schema_change**: Configure how dbt handles schema changes to prevent pipeline failures.

```sql
{{
    config(
        materialized='incremental',
        unique_key='id',
        incremental_strategy='merge',
        on_schema_change='sync_all_columns'
    )
}}
```

---

## Conclusion

dbt incremental models are essential for building efficient, scalable data pipelines. By understanding the different strategies and when to apply them, you can dramatically reduce processing time and compute costs while maintaining data accuracy.

Start simple with basic timestamp filtering, then evolve your approach as you learn your data's patterns. The key is matching your incremental strategy to your specific use case - there is no one-size-fits-all solution.

For monitoring your dbt pipelines and tracking model performance, check out [OneUptime](https://oneuptime.com) - our open-source observability platform that helps you monitor data pipelines, track job durations, and alert on failures before they impact downstream systems.
