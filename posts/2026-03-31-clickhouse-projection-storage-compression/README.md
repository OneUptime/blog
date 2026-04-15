# How to Optimize Projection Storage with Compression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, Compression, Storage, MergeTree, Performance

Description: Learn how to reduce the storage footprint of ClickHouse projections by pairing them with efficient codecs and compression settings.

---

Projections in ClickHouse store a physically separate copy of your data, sorted and potentially aggregated differently from the primary table. Because each projection consumes real disk space, choosing the right compression codec is essential for keeping storage costs under control.

## How Projections Store Data

A projection is stored as a hidden sub-part inside the same MergeTree part directory. It carries its own column files, mark files, and primary index - meaning it is subject to the same codec settings you apply when defining the projection.

```sql
ALTER TABLE events
  ADD PROJECTION proj_by_user
  (SELECT user_id, event_type, count() GROUP BY user_id, event_type);
```

Without explicit codec annotations the projection inherits the codecs defined on the parent table's columns. To control the codec used inside a projection, set it on the corresponding column in the parent table definition.

## Specifying Codecs Inside Projections

Codecs are declared in the column list of the parent table. A projection that selects a subset of those columns automatically uses their codecs.

```sql
CREATE TABLE events
(
    event_time   DateTime CODEC(Delta, ZSTD(3)),
    user_id      UInt64   CODEC(ZSTD(1)),
    event_type   LowCardinality(String),
    value        Float64  CODEC(Gorilla, ZSTD(1)),
    PROJECTION proj_by_user
    (
        SELECT user_id, event_type, count() GROUP BY user_id, event_type
    )
)
ENGINE = MergeTree()
ORDER BY event_time;
```

Here `user_id` is stored with ZSTD(1) both in the main table and inside the projection.

## Checking Projection Disk Usage

Use the `system.parts` and `system.projection_parts` tables to measure how much space projections consume.

```sql
SELECT
    table,
    name,
    projections,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE table = 'events' AND active
ORDER BY bytes_on_disk DESC
LIMIT 10;
```

For per-projection detail:

```sql
SELECT
    parent_name,
    name,
    formatReadableSize(bytes_on_disk) AS proj_size
FROM system.projection_parts
WHERE table = 'events' AND active;
```

## Choosing the Right Codec

| Column type | Recommended codec |
|---|---|
| Monotonic timestamps | Delta + ZSTD |
| Low-cardinality strings | Use LowCardinality type + ZSTD codec |
| Counters / gauge floats | Gorilla + ZSTD |
| UUIDs / random IDs | ZSTD(3) |

Aggregate projections (with GROUP BY) generally store far fewer rows than the raw table, so the absolute size is already small. Codec savings matter most on high-cardinality projections that preserve individual rows.

## Rebuilding a Projection After Codec Change

Codecs cannot be altered on a live projection. The workflow is to drop and re-add the projection, then materialize it.

```sql
ALTER TABLE events DROP PROJECTION proj_by_user;

ALTER TABLE events ADD PROJECTION proj_by_user
  (SELECT user_id, event_type, count() GROUP BY user_id, event_type);

ALTER TABLE events MATERIALIZE PROJECTION proj_by_user
  IN PARTITION '202501';
```

Run `MATERIALIZE PROJECTION` per partition to spread the I/O load.

## Summary

Pairing ClickHouse projections with suitable compression codecs avoids the storage penalty that comes from maintaining multiple physical sort orders. Use `system.projection_parts` to measure current usage, select codecs that match the data distribution, and re-materialize projections partition by partition whenever you need to apply new compression settings.
