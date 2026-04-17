# How to Understand Delete Masks in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Delete Mask, Lightweight Delete, MergeTree, Internal, Data Storage

Description: Understand how ClickHouse delete masks work internally to make lightweight DELETEs instantly visible while deferring physical data removal to background merges.

---

When you execute a lightweight `DELETE` in ClickHouse, the rows are not removed from disk immediately. Instead, ClickHouse writes a small hidden file called a delete mask alongside the data part. This design makes deletes fast and immediately consistent for reads.

## What Is a Delete Mask?

A delete mask is a bitmap stored as a hidden file inside a data part directory. Each bit corresponds to a row in the part - a set bit (1) means the row still exists, and a cleared bit (0) means the row is logically deleted. ClickHouse applies this mask at read time to filter out deleted rows.

The file is named `_row_exists.bin` inside the part directory.

## Observing Delete Masks in Parts

```sql
SELECT
    database,
    table,
    name,
    rows,
    has_lightweight_delete
FROM system.parts
WHERE has_lightweight_delete = 1
  AND active = 1;
```

Any part with `has_lightweight_delete = 1` has one or more rows masked as deleted.

## How Reads Apply the Mask

When ClickHouse scans a part with a delete mask, it reads the `_row_exists` column alongside the actual data. Rows with a 0 bit are excluded from the result set before any other filtering occurs.

This happens transparently - you do not need to do anything in your queries.

## Performance Impact of Delete Masks

Delete masks add a small read overhead because ClickHouse must load and apply the bitmap for every part scan. For tables with many small deletes across many parts, this overhead accumulates.

To measure the impact, check elapsed time on queries before and after a large delete:

```sql
SELECT count(), sum(bytes_on_disk)
FROM system.parts
WHERE table = 'events' AND has_lightweight_delete = 1 AND active = 1;
```

## Physically Removing Masked Rows

Run `OPTIMIZE` to merge parts and physically eliminate deleted rows:

```sql
OPTIMIZE TABLE events FINAL;
```

After the merge, parts with all-deleted rows are dropped entirely, and parts with partial deletes are rewritten without the masked rows.

## Checking Part Sizes Before and After Cleanup

```sql
-- Before
SELECT formatReadableSize(sum(bytes_on_disk)) FROM system.parts
WHERE table = 'events' AND active = 1;

-- Run OPTIMIZE
OPTIMIZE TABLE events FINAL;

-- After
SELECT formatReadableSize(sum(bytes_on_disk)) FROM system.parts
WHERE table = 'events' AND active = 1;
```

## Delete Masks vs. Mutations

| Aspect | Delete Mask | Mutation |
|---|---|---|
| Visibility | Immediate | Asynchronous |
| Disk impact | Small mask file | Rewrites full part |
| Cleanup | On next merge | Part of mutation itself |

## Summary

Delete masks are the mechanism behind ClickHouse lightweight DELETEs. They provide instant read consistency with minimal write overhead, while actual physical cleanup happens during background merges. Understanding this helps you plan storage capacity and schedule `OPTIMIZE` runs appropriately.
