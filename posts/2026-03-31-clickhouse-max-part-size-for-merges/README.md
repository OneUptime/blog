# How to Configure ClickHouse Max Part Size for Merges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Merge, Part Size, Configuration, MergeTree, Storage

Description: Configure max_bytes_to_merge_at_max_space_in_pool and related settings to control the maximum data part size ClickHouse creates during background merges.

---

## What Is Max Part Size for Merges?

ClickHouse merges small data parts into larger ones in the background. The setting `max_bytes_to_merge_at_max_space_in_pool` controls the maximum total size (in bytes) of a part that ClickHouse will create during a background merge. Parts larger than this threshold are left as-is.

## The Default and Why It May Need Changing

The default value is about 150 GB. For most tables this is fine, but for:
- Tables with aggressive TTL policies (large parts expire slowly)
- Tables with very high insert rates
- Clusters with limited disk space

...you may want to tune this value down.

## Setting Max Part Size

```sql
-- Set per table
ALTER TABLE events MODIFY SETTING
    max_bytes_to_merge_at_max_space_in_pool = 10737418240;  -- 10 GB

-- Set globally in config.xml
```

```xml
<merge_tree>
    <max_bytes_to_merge_at_max_space_in_pool>10737418240</max_bytes_to_merge_at_max_space_in_pool>
</merge_tree>
```

## Min Space Threshold

When disk space is low, ClickHouse lowers the merge size cap to the `min_space` setting:

```sql
ALTER TABLE events MODIFY SETTING
    max_bytes_to_merge_at_min_space_in_pool = 1048576;  -- 1 MB minimum
```

This prevents large merges from filling the disk entirely.

## Effect on Part Count

Setting a lower max part size means more medium-sized parts on disk. If set too low, part count stays high and you risk "Too many parts" errors. Balance is key:

```text
Too small cap --> many medium parts --> high merge overhead
Too large cap --> giant parts --> long TTL expiry, slow re-merges
```

A practical value for event tables is 5-50 GB per part.

## Checking Current Part Sizes

```sql
SELECT
    table,
    name,
    formatReadableSize(bytes_on_disk) AS disk_size,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed_size,
    rows
FROM system.parts
WHERE active AND database = 'default' AND table = 'events'
ORDER BY data_uncompressed_bytes DESC
LIMIT 20;
```

## Wide vs Compact Parts

ClickHouse also controls when parts are stored in wide format (one file per column) vs compact format (all columns in one file):

```sql
ALTER TABLE events MODIFY SETTING
    min_bytes_for_wide_part  = 10485760,   -- 10 MB
    min_rows_for_wide_part   = 512000;
```

Small parts use compact format, which reduces file descriptor count and improves merge speed.

## Summary

Configure ClickHouse max part size for merges by setting `max_bytes_to_merge_at_max_space_in_pool` to a value that matches your disk capacity and TTL policies. Keep parts in the 5-50 GB range for typical event tables, monitor with `system.parts`, and set the min-space threshold to prevent disk exhaustion during merges.
