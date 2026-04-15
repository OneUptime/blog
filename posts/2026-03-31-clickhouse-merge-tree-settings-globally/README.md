# How to Configure ClickHouse Merge Tree Settings Globally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Configuration, Storage, Performance

Description: Learn how to set MergeTree engine defaults globally in ClickHouse config to control merge behavior, part sizes, and storage policies across all tables.

---

ClickHouse's MergeTree family of table engines is the foundation of most production deployments. Rather than configuring each table individually, you can set global defaults in the server configuration file. This approach ensures consistent behavior and simplifies table creation.

## Understanding Global MergeTree Configuration

The `merge_tree` section in `config.xml` (or a file in `config.d/`) applies default values to all MergeTree-based tables. Individual table settings in `CREATE TABLE` statements can still override these defaults.

```xml
<clickhouse>
  <merge_tree>
    <max_suspicious_broken_parts>5</max_suspicious_broken_parts>
    <parts_to_delay_insert>150</parts_to_delay_insert>
    <parts_to_throw_insert>300</parts_to_throw_insert>
    <max_delay_to_insert>1</max_delay_to_insert>
    <merge_max_block_size>8192</merge_max_block_size>
  </merge_tree>
</clickhouse>
```

## Key Global Settings

**Insert throttling:** The `parts_to_delay_insert` and `parts_to_throw_insert` settings control how ClickHouse responds when too many parts accumulate in a partition. When the number of active parts exceeds `parts_to_delay_insert`, inserts slow down. When it exceeds `parts_to_throw_insert`, inserts fail with an error.

**Merge behavior:** `merge_max_block_size` controls how many rows are processed at once during merges. The default of 8192 is appropriate for most workloads.

**Broken parts:** `max_suspicious_broken_parts` sets the threshold at which ClickHouse denies automatic deletion of broken parts in a single partition, preventing silent data loss.

## Setting Storage Policy Globally

```xml
<clickhouse>
  <merge_tree>
    <storage_policy>default</storage_policy>
    <min_bytes_for_wide_part>10485760</min_bytes_for_wide_part>
    <min_rows_for_wide_part>0</min_rows_for_wide_part>
  </merge_tree>
</clickhouse>
```

The `min_bytes_for_wide_part` setting determines when ClickHouse stores columns in separate files (wide format) versus a single compact file. For large parts, wide format enables better compression and query performance.

## Controlling Background Merges

```xml
<clickhouse>
  <merge_tree>
    <number_of_free_entries_in_pool_to_execute_mutation>20</number_of_free_entries_in_pool_to_execute_mutation>
    <max_bytes_to_merge_at_max_space_in_pool>161061273600</max_bytes_to_merge_at_max_space_in_pool>
    <max_bytes_to_merge_at_min_space_in_pool>1048576</max_bytes_to_merge_at_min_space_in_pool>
  </merge_tree>
</clickhouse>
```

`max_bytes_to_merge_at_max_space_in_pool` (default ~150 GB) caps the size of parts that the background merge scheduler will attempt to merge. Increasing this allows larger merges but requires more disk space and memory.

## Verifying Applied Settings

After applying configuration changes, verify that settings took effect:

```sql
SELECT name, value, description
FROM system.merge_tree_settings
WHERE changed = 1;
```

You can also check per-table settings by inspecting the table definition:

```sql
SHOW CREATE TABLE your_database.your_table;
```

## Using config.d for Isolated Changes

Rather than editing `config.xml` directly, place MergeTree overrides in a dedicated file:

```bash
cat /etc/clickhouse-server/config.d/merge_tree.xml
```

```xml
<clickhouse>
  <merge_tree>
    <parts_to_delay_insert>150</parts_to_delay_insert>
    <parts_to_throw_insert>300</parts_to_throw_insert>
  </merge_tree>
</clickhouse>
```

This approach keeps configuration changes auditable and easy to roll back.

## Summary

Configuring MergeTree settings globally in ClickHouse ensures consistent merge behavior, controlled insert rates, and predictable storage usage across all tables. Use the `merge_tree` block in `config.xml` or `config.d/` to set these defaults, and override them at the table level only when specific workloads require it.
