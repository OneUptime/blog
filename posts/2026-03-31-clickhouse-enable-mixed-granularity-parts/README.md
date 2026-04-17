# How to Use enable_mixed_granularity_parts in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Configuration, Performance, Database, SQL

Description: Learn what enable_mixed_granularity_parts does in ClickHouse, why it matters for adaptive index granularity, and how to configure it correctly for optimal storage and query performance.

---

`enable_mixed_granularity_parts` is a MergeTree setting that controls whether ClickHouse allows data parts with different granularity formats (fixed vs. adaptive) to coexist in the same table. Understanding it is key to safely enabling adaptive index granularity.

## Background: Fixed vs. Adaptive Granularity

ClickHouse MergeTree has two granularity modes:

**Fixed granularity (legacy):** Every granule contains exactly `index_granularity` rows. This was the only mode before ClickHouse 19.11.

**Adaptive granularity (modern):** Granule size is determined by byte size (`index_granularity_bytes`) rather than a fixed row count. Wide rows produce smaller granules; narrow rows produce larger granules. This improves index precision for variable-width data.

The challenge: tables may have parts written with the old format and new parts written with the new format. `enable_mixed_granularity_parts` controls whether this mixing is allowed.

## What Does enable_mixed_granularity_parts Do?

```sql
CREATE TABLE events
(
    ts      DateTime,
    user_id UInt64,
    payload String
)
ENGINE = MergeTree()
ORDER BY (ts, user_id)
SETTINGS
    index_granularity       = 8192,
    index_granularity_bytes = 10485760,
    enable_mixed_granularity_parts = 1;  -- default: 1
```

| Value | Behavior |
|---|---|
| `1` (default in modern ClickHouse) | New parts use adaptive granularity; old fixed-granularity parts remain valid. Both formats coexist. |
| `0` | All parts must use the same granularity format. Setting `index_granularity_bytes > 0` with this off will fail if old parts exist. |

## When This Setting Matters

This setting is most relevant when:

1. You are migrating an existing table from ClickHouse 19.x (fixed granularity) to a newer version (adaptive granularity).
2. You have a long-lived table where parts were written across multiple ClickHouse versions.
3. You are explicitly enabling adaptive granularity (`index_granularity_bytes > 0`) on an existing table.

## Checking Whether Parts Use Fixed or Adaptive Granularity

```sql
SELECT
    name             AS part_name,
    rows,
    marks,
    rows / marks     AS rows_per_mark,
    marks_bytes
FROM system.parts
WHERE active AND database = 'default' AND table = 'events'
ORDER BY min_time DESC
LIMIT 20;
```

If `rows_per_mark` varies across parts, you have adaptive granularity. If it is always the same (e.g., 8192), you have fixed granularity.

## Enabling Adaptive Granularity on an Existing Table

To switch an existing table from fixed to adaptive granularity:

```sql
-- Step 1: Enable mixed mode to allow old and new parts to coexist
ALTER TABLE events
MODIFY SETTING
    enable_mixed_granularity_parts = 1,
    index_granularity_bytes = 10485760;

-- Step 2: New parts will be written with adaptive granularity
-- Old parts remain fixed-granularity until they are merged away

-- Step 3: (Optional) Force a merge to convert old parts
OPTIMIZE TABLE events FINAL;
```

After all old parts are merged away (either by background merges or `OPTIMIZE FINAL`), all remaining parts will use adaptive granularity.

## Verifying the Transition

```sql
-- Count parts by their effective granularity type
-- (approximate: variable rows_per_mark indicates adaptive)
SELECT
    CASE
        WHEN marks = 0 THEN 'empty'
        WHEN abs((rows / marks) - 8192) < 10 THEN 'fixed-8192'
        ELSE 'adaptive'
    END AS granularity_type,
    count() AS part_count,
    sum(rows) AS total_rows
FROM system.parts
WHERE active AND database = 'default' AND table = 'events'
GROUP BY granularity_type;
```

## What Happens During Merges with Mixed Parts

When ClickHouse merges a fixed-granularity part with an adaptive-granularity part:
- The output part uses the format dictated by the current `index_granularity_bytes` setting.
- If `index_granularity_bytes > 0`, the merged output is adaptive.
- If `index_granularity_bytes = 0`, the merged output is fixed.

This means mixed tables gradually become homogeneous as merges progress.

## Full Example: Fresh Table with Optimal Settings

For new tables, set both settings explicitly:

```sql
CREATE TABLE http_logs
(
    ts             DateTime,
    host           LowCardinality(String),
    method         LowCardinality(String),
    path           String,
    status_code    UInt16,
    response_bytes UInt32,
    payload        String   -- variable-length, benefits from adaptive
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, host, status_code)
SETTINGS
    index_granularity              = 8192,
    index_granularity_bytes        = 10485760,
    enable_mixed_granularity_parts = 1;
```

This setup:
- Targets ~10 MB granules (adaptive).
- Falls back to 8192 rows maximum per granule.
- Allows any pre-existing fixed-granularity parts to coexist safely.

## Disabling Adaptive Granularity Entirely

If you want strictly fixed granularity (e.g., for exact reproducibility in benchmarks):

```sql
CREATE TABLE benchmark_table
(
    id    UInt64,
    value Float64
)
ENGINE = MergeTree()
ORDER BY id
SETTINGS
    index_granularity              = 8192,
    index_granularity_bytes        = 0,      -- disables adaptive
    enable_mixed_granularity_parts = 0;      -- enforce consistency
```

## Server-Level Default

You can set the default for all new tables in the server config:

```xml
<merge_tree>
    <index_granularity>8192</index_granularity>
    <index_granularity_bytes>10485760</index_granularity_bytes>
    <enable_mixed_granularity_parts>1</enable_mixed_granularity_parts>
</merge_tree>
```

## Summary

`enable_mixed_granularity_parts` is a migration safety valve that allows tables to have parts with different granularity formats coexisting during the transition from fixed to adaptive index granularity. Key points:

- Default value is `1` (enabled) in modern ClickHouse - safe to leave as-is.
- It is essential when migrating old tables to adaptive granularity.
- During background merges, mixed tables gradually become homogeneous.
- Set `index_granularity_bytes = 0` and `enable_mixed_granularity_parts = 0` only if you need strict fixed granularity for benchmarking or legacy compatibility.
- For new tables, pair with `index_granularity_bytes = 10485760` to get the best of both modes.
